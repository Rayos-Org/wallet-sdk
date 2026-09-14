import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Networks,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  hash,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { WalletError } from './errors.js';
import type { PasskeyProvider } from '../passkey/types.js';
import { base64urlDecode, base64urlEncode, derSignatureToRaw, hexEncode } from '../passkey/encoding.js';

export interface Signer {
  /** base64url credential id (the wallet's signer key). */
  credentialId: string;
  /** Uncompressed P-256 public key (65 bytes). */
  publicKeyBytes: Uint8Array;
  /** All passkey signers are equal weight in GuardianWallet. */
  weight: number;
}

export interface Asset {
  contractId: string;
}

export interface Transfer {
  /** Ledger close time (ISO). */
  at: string;
  ledger: number;
  txHash: string;
  from: string;
  to: string;
  /** Stroops. */
  amount: bigint;
  direction: 'in' | 'out';
}

/** Native XLM Stellar Asset Contract on testnet. */
export const TESTNET_NATIVE_SAC = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

/** Read-only simulations need *a* source account; this one never has to exist. */
const SIMULATION_SOURCE = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

export interface WalletClientConfig {
  networkPassphrase: string;
  rpcUrl: string;
  factoryContractId: string;
  nativeTokenContractId?: string;
}

/**
 * Talks to the GuardianWallet / Factory contracts and the native token SAC
 * directly over Soroban RPC. Everything here is real network I/O.
 */
export class WalletClient {
  readonly server: rpc.Server;
  readonly networkPassphrase: string;
  readonly factoryContractId: string;
  readonly nativeTokenContractId: string;

  constructor(config: WalletClientConfig) {
    this.networkPassphrase = config.networkPassphrase;
    this.factoryContractId = config.factoryContractId;
    this.nativeTokenContractId = config.nativeTokenContractId ?? TESTNET_NATIVE_SAC;
    this.server = new rpc.Server(config.rpcUrl, { allowHttp: config.rpcUrl.startsWith('http://') });
  }

  /* ── reads ─────────────────────────────────────────────────────── */

  private async simulateRaw(contractId: string, method: string, ...args: xdr.ScVal[]): Promise<xdr.ScVal> {
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(new Account(SIMULATION_SOURCE, '0'), {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new WalletError(`Simulation of ${method} failed: ${sim.error}`, 'SIMULATION_FAILED');
    }
    if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
      throw new WalletError(`Simulation of ${method} returned no result`, 'SIMULATION_FAILED');
    }
    return sim.result.retval;
  }

  private async simulateRead<T>(contractId: string, method: string, ...args: xdr.ScVal[]): Promise<T> {
    return scValToNative(await this.simulateRaw(contractId, method, ...args)) as T;
  }

  /** Deterministic wallet address for a 32-byte salt (factory.predict_address). */
  public async predictAddress(saltBytes: Uint8Array): Promise<string> {
    if (saltBytes.length !== 32) throw new WalletError('Salt must be 32 bytes', 'INVALID_SALT');
    return this.simulateRead<string>(this.factoryContractId, 'predict_address', xdr.ScVal.scvBytes(saltBytes));
  }

  /** Signers registered in the wallet contract (get_signers): Map<credential_id bytes, public_key bytes>. */
  public async getSigners(walletAddress: string): Promise<Signer[]> {
    const retval = await this.simulateRaw(walletAddress, 'get_signers');
    if (retval.type !== 'scvMap') throw new WalletError('get_signers returned a non-map value', 'UNEXPECTED_RESULT');
    return (retval.map ?? []).map((entry) => {
      if (entry.key.type !== 'scvBytes' || entry.val.type !== 'scvBytes') {
        throw new WalletError('get_signers entry is not bytes → bytes', 'UNEXPECTED_RESULT');
      }
      return {
        credentialId: base64urlEncode(new Uint8Array(entry.key.bytes.toBytes())),
        publicKeyBytes: new Uint8Array(entry.val.bytes.toBytes()),
        weight: 1,
      };
    });
  }

  /** Token balance in stroops (SAC `balance`). Works for C… and G… addresses. */
  public async getBalance(address: string, asset?: Asset): Promise<bigint> {
    const token = asset?.contractId ?? this.nativeTokenContractId;
    const bal = await this.simulateRead<bigint | number>(token, 'balance', new Address(address).toScVal());
    return BigInt(bal);
  }

  /** True once the wallet contract instance exists on the ledger. */
  public async walletExists(walletAddress: string): Promise<boolean> {
    try {
      await this.getSigners(walletAddress);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Recent native-token transfers touching `address`, from Soroban RPC events
   * (RPC retains roughly a week of history on testnet).
   */
  public async getRecentTransfers(address: string, limit = 25): Promise<Transfer[]> {
    const latest = await this.server.getLatestLedger();
    // Look back ~24h; RPC scans a bounded window per call, so page with the cursor.
    const startLedger = Math.max(1, latest.sequence - 17_280);
    const addrScVal = new Address(address).toScVal().toXdr('base64');
    const transferTopic = xdr.ScVal.scvSymbol('transfer').toXdr('base64');

    const collect = async (position: 'from' | 'to') => {
      const topics = position === 'from' ? [transferTopic, addrScVal, '*', '*'] : [transferTopic, '*', addrScVal, '*'];
      const filters = [{ type: 'contract' as const, contractIds: [this.nativeTokenContractId], topics: [topics] }];
      const events: rpc.Api.EventResponse[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < 60; page++) {
        try {
          const res = cursor
            ? await this.server.getEvents({ cursor, filters, limit: 100 })
            : await this.server.getEvents({ startLedger, filters, limit: 100 });
          events.push(...(res.events ?? []));
          if (!res.cursor || events.length >= limit * 4) break;
          // cursor = "<toid>-<eventIndex>", toid = ledger << 32 | ...; stop at the chain head.
          const cursorLedger = Number(BigInt(res.cursor.split('-')[0]) >> 32n);
          if (cursorLedger >= latest.sequence) break;
          cursor = res.cursor;
        } catch {
          break;
        }
      }
      return events;
    };

    const [outgoing, incoming] = await Promise.all([collect('from'), collect('to')]);
    const seen = new Set<string>();
    const transfers: Transfer[] = [];
    for (const ev of [...outgoing, ...incoming]) {
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      const topic = ev.topic.map((t) => scValToNative(t));
      const from = String(topic[1]);
      const to = String(topic[2]);
      const value = scValToNative(ev.value);
      const amount = BigInt(typeof value === 'object' && value !== null && 'amount' in value ? (value as any).amount : value);
      transfers.push({
        at: ev.ledgerClosedAt,
        ledger: ev.ledger,
        txHash: ev.txHash,
        from,
        to,
        amount,
        direction: from === address ? 'out' : 'in',
      });
    }
    return transfers.sort((a, b) => b.ledger - a.ledger).slice(0, limit);
  }

  /* ── writes ────────────────────────────────────────────────────── */

  /**
   * Builds an unsigned native-token `transfer(from=wallet, to, amount)` with
   * the sponsor as the transaction source, and signs the wallet's Soroban
   * authorisation entry with the passkey. Returns the transaction XDR ready
   * for the sponsor (relay) to sign the envelope and submit.
   */
  public async buildSignedTransfer(params: {
    walletAddress: string;
    to: string;
    amount: bigint;
    sponsorPublicKey: string;
    passkey: PasskeyProvider;
    credentialId: string;
    rpId?: string;
    asset?: Asset;
  }): Promise<string> {
    const { walletAddress, to, amount, sponsorPublicKey, passkey, credentialId, rpId, asset } = params;
    if (!StrKey.isValidContract(walletAddress)) throw new WalletError('Invalid wallet address', 'INVALID_ADDRESS');
    if (!StrKey.isValidEd25519PublicKey(to) && !StrKey.isValidContract(to)) {
      throw new WalletError('Recipient must be a G… account or C… contract address', 'INVALID_ADDRESS');
    }
    if (amount <= 0n) throw new WalletError('Amount must be positive', 'INVALID_AMOUNT');

    const token = new Contract(asset?.contractId ?? this.nativeTokenContractId);
    const source = await this.server.getAccount(sponsorPublicKey);

    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: this.networkPassphrase })
      .addOperation(
        token.call(
          'transfer',
          new Address(walletAddress).toScVal(),
          new Address(to).toScVal(),
          nativeToScVal(amount, { type: 'i128' })
        )
      )
      .setTimeout(120)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new WalletError(`Transfer simulation failed: ${sim.error}`, 'SIMULATION_FAILED');
    }
    if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
      throw new WalletError('Transfer simulation returned no result', 'SIMULATION_FAILED');
    }

    const latest = await this.server.getLatestLedger();
    const validUntilLedger = latest.sequence + 60; // ≈ 5 minutes

    const signedAuth = await Promise.all(
      sim.result.auth.map((entry) => this.signAuthEntry(entry, walletAddress, validUntilLedger, passkey, credentialId, rpId))
    );

    // Re-attach signed auth and re-simulate so the footprint/fees include __check_auth.
    const op = tx.operations[0] as { func: xdr.HostFunction };
    const rebuilt = new TransactionBuilder(await this.server.getAccount(sponsorPublicKey), {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.invokeHostFunction({ func: op.func, auth: signedAuth }))
      .setTimeout(120)
      .build();

    const sim2 = await this.server.simulateTransaction(rebuilt);
    if (rpc.Api.isSimulationError(sim2)) {
      throw new WalletError(`Passkey authorisation rejected by the wallet contract: ${sim2.error}`, 'AUTH_REJECTED');
    }
    const assembled = rpc.assembleTransaction(rebuilt, sim2).build();
    return assembled.toXDR();
  }

  /** Sign one SorobanAuthorizationEntry addressed to the wallet with a passkey assertion. */
  private async signAuthEntry(
    entry: xdr.SorobanAuthorizationEntry,
    walletAddress: string,
    validUntilLedger: number,
    passkey: PasskeyProvider,
    credentialId: string,
    rpId?: string
  ): Promise<xdr.SorobanAuthorizationEntry> {
    const creds = entry.credentials;
    // Protocol 25+ issues AddressV2 credentials whose payload also commits to the address.
    const isV1 = creds.type === 'sorobanCredentialsAddress';
    const isV2 = creds.type === 'sorobanCredentialsAddressV2';
    if (!isV1 && !isV2) {
      return entry; // source-account credentials are covered by the sponsor's envelope signature
    }
    const addrCreds = isV1 ? creds.address : creds.addressV2;
    const entryAddress = Address.fromScAddress(addrCreds.address).toString();
    if (entryAddress !== walletAddress) return entry;

    const preimage = isV2
      ? xdr.HashIdPreimage.envelopeTypeSorobanAuthorizationWithAddress(
          new xdr.HashIdPreimageSorobanAuthorizationWithAddress({
            networkId: hash(this.networkPassphrase),
            nonce: addrCreds.nonce,
            signatureExpirationLedger: validUntilLedger,
            address: addrCreds.address,
            invocation: entry.rootInvocation,
          })
        )
      : xdr.HashIdPreimage.envelopeTypeSorobanAuthorization(
          new xdr.HashIdPreimageSorobanAuthorization({
            networkId: hash(this.networkPassphrase),
            nonce: addrCreds.nonce,
            signatureExpirationLedger: validUntilLedger,
            invocation: entry.rootInvocation,
          })
        );
    const payload = hash(preimage.toXdr());

    // The passkey signs clientDataJSON whose challenge == base64url(payload).
    const assertion = await passkey.getAssertion({
      challenge: base64urlEncode(payload),
      credentialId,
      rpId,
      userVerification: 'required',
    });

    const rawSig = derSignatureToRaw(base64urlDecode(assertion.response.signature));
    const entryOf = (key: string, bytes: Uint8Array) =>
      new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(key), val: xdr.ScVal.scvBytes(bytes) });
    // Keys must be sorted for a valid ScMap.
    const signature = xdr.ScVal.scvMap([
      entryOf('authenticator_data', base64urlDecode(assertion.response.authenticatorData)),
      entryOf('client_data_json', base64urlDecode(assertion.response.clientDataJSON)),
      entryOf('credential_id', base64urlDecode(assertion.rawId || credentialId)),
      entryOf('signature', rawSig),
    ]);

    const signedCreds = new xdr.SorobanAddressCredentials({
      address: addrCreds.address,
      nonce: addrCreds.nonce,
      signatureExpirationLedger: validUntilLedger,
      signature,
    });
    return new xdr.SorobanAuthorizationEntry({
      credentials: isV2
        ? xdr.SorobanCredentials.sorobanCredentialsAddressV2(signedCreds)
        : xdr.SorobanCredentials.sorobanCredentialsAddress(signedCreds),
      rootInvocation: entry.rootInvocation,
    });
  }

  /** Helpers exposed for the relay/deploy path. */
  public static encodeDeployArgs(saltBytes: Uint8Array, credentialId: string, publicKeyBytes: Uint8Array) {
    return {
      saltHex: hexEncode(saltBytes),
      credentialIdHex: hexEncode(base64urlDecode(credentialId)),
      publicKeyHex: hexEncode(publicKeyBytes),
    };
  }

  public static get testnetPassphrase(): string {
    return Networks.TESTNET;
  }

  public static isTransaction(xdrString: string, networkPassphrase: string): boolean {
    try {
      return TransactionBuilder.fromXDR(xdrString, networkPassphrase) instanceof Transaction;
    } catch {
      return false;
    }
  }
}
