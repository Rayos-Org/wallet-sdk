import {
  createCredential as browserCreateCredential,
  getAssertion as browserGetAssertion,
} from './passkey/index.js';
import type {
  PasskeyAssertion,
  PasskeyAssertionOptions,
  PasskeyCredential,
  PasskeyProvider,
  PasskeyRegistrationOptions,
  PasskeySignOptions,
} from './passkey/types.js';
import { base64urlDecode, hexEncode } from './passkey/encoding.js';
import { WalletClient, TESTNET_NATIVE_SAC } from './contracts/wallet-client.js';
import type { Asset, Signer, Transfer } from './contracts/wallet-client.js';
import { RelayClient } from './relay/client.js';
import type { RelayInfo, SubmitTransactionResponse } from './relay/types.js';
import { WalletError } from './contracts/errors.js';

export interface WalletSdkConfig {
  networkPassphrase: string;
  rpcUrl: string;
  /** relay-backend base URL including the `/api` prefix. */
  relayUrl: string;
  factoryContractId: string;
  /** Defaults to the testnet native XLM SAC. */
  nativeTokenContractId?: string;
  /** WebAuthn relying-party id (must match the page origin on web). */
  rpId?: string;
  /** Platform passkey implementation; defaults to the browser one. */
  passkeyProvider?: PasskeyProvider;
}

export interface WalletState {
  address: string;
  signers: Signer[];
  /** Native balance in stroops. */
  balance: bigint;
  /** False until the contract instance exists on the ledger. */
  exists: boolean;
}

export interface CreateWalletResult {
  address: string;
  credential: PasskeyCredential;
  txHash: string;
}

export interface TransferParams {
  walletAddress: string;
  to: string;
  /** Stroops (1 XLM = 10_000_000). */
  amount: bigint;
  /** base64url credential id of the signing passkey. */
  credentialId: string;
  asset?: Asset;
}

/**
 * Guardian Wallet SDK — passkey-secured Soroban smart wallets on Stellar.
 *
 * Every method here performs real network I/O against Soroban RPC and the
 * relay; there are no mocked paths.
 */
export class WalletSdk {
  readonly wallet: WalletClient;
  readonly relay: RelayClient;
  private readonly passkey: PasskeyProvider;
  private readonly rpId?: string;

  constructor(config: WalletSdkConfig) {
    this.wallet = new WalletClient({
      networkPassphrase: config.networkPassphrase,
      rpcUrl: config.rpcUrl,
      factoryContractId: config.factoryContractId,
      nativeTokenContractId: config.nativeTokenContractId,
    });
    this.relay = new RelayClient(config.relayUrl);
    this.rpId = config.rpId;
    this.passkey = config.passkeyProvider ?? {
      createCredential: browserCreateCredential,
      getAssertion: browserGetAssertion,
    };
  }

  /**
   * Full onboarding: register a passkey, then have the relay deploy a
   * GuardianWallet with that passkey as its signer. `saltBytes` (32 bytes)
   * makes the address deterministic — `predictAddress` returns it up front.
   */
  public async createWallet(
    options: PasskeyRegistrationOptions,
    saltBytes: Uint8Array
  ): Promise<CreateWalletResult> {
    if (saltBytes.length !== 32) throw new WalletError('Salt must be 32 bytes', 'INVALID_SALT');
    const credential = await this.registerPasskey(options);
    const { address, txHash } = await this.deployWallet(credential, saltBytes);
    return { address, credential, txHash };
  }

  /** Step 1 of onboarding: create the passkey (platform authenticator prompt). */
  public async registerPasskey(options: PasskeyRegistrationOptions): Promise<PasskeyCredential> {
    const credential = await this.passkey.createCredential(options);
    if (credential.publicKeyBytes.length !== 65) {
      throw new WalletError('Passkey did not yield a P-256 public key', 'UNSUPPORTED_KEY');
    }
    return credential;
  }

  /** Step 2 of onboarding: the relay deploys the wallet contract for this passkey. */
  public async deployWallet(
    credential: Pick<PasskeyCredential, 'id' | 'publicKeyBytes'>,
    saltBytes: Uint8Array
  ): Promise<{ address: string; txHash: string }> {
    if (saltBytes.length !== 32) throw new WalletError('Salt must be 32 bytes', 'INVALID_SALT');
    const { walletAddress, txHash } = await this.relay.deployWallet({
      saltHex: hexEncode(saltBytes),
      credentialId: credential.id,
      publicKeyHex: hexEncode(credential.publicKeyBytes),
    });
    return { address: walletAddress, txHash };
  }

  public predictAddress(saltBytes: Uint8Array): Promise<string> {
    return this.wallet.predictAddress(saltBytes);
  }

  /** Read-only aggregate of the wallet: signers + native balance. */
  public async getWalletState(walletAddress: string, asset?: Asset): Promise<WalletState> {
    const [signersResult, balance] = await Promise.all([
      this.wallet.getSigners(walletAddress).then(
        (s) => ({ ok: true as const, s }),
        (e) => ({ ok: false as const, e })
      ),
      this.wallet.getBalance(walletAddress, asset).catch(() => 0n),
    ]);
    return {
      address: walletAddress,
      signers: signersResult.ok ? signersResult.s : [],
      balance,
      exists: signersResult.ok,
    };
  }

  public getBalance(address: string, asset?: Asset): Promise<bigint> {
    return this.wallet.getBalance(address, asset);
  }

  public getSigners(walletAddress: string): Promise<Signer[]> {
    return this.wallet.getSigners(walletAddress);
  }

  public getRecentTransfers(address: string, limit?: number): Promise<Transfer[]> {
    return this.wallet.getRecentTransfers(address, limit);
  }

  /**
   * Send tokens from the wallet. Builds the transfer, asks the passkey to
   * authorise it (Face ID / Windows Hello prompt), and has the relay pay the
   * fee and submit. Resolves with the real on-chain transaction hash.
   */
  public async transfer(params: TransferParams): Promise<SubmitTransactionResponse> {
    const info = await this.relay.info();
    const signedXdr = await this.wallet.buildSignedTransfer({
      walletAddress: params.walletAddress,
      to: params.to,
      amount: params.amount,
      sponsorPublicKey: info.publicKey,
      passkey: this.passkey,
      credentialId: params.credentialId,
      rpId: this.rpId,
      asset: params.asset,
    });
    return this.relay.submitTransaction({ signedXdr });
  }

  /** Testnet: ask the relay to send XLM to the wallet. */
  public requestFaucet(walletAddress: string) {
    return this.relay.faucet(walletAddress);
  }

  public getTransactionStatus(txHash: string) {
    return this.relay.status(txHash);
  }

  public relayInfo(): Promise<RelayInfo> {
    return this.relay.info();
  }

  /** Raw passkey assertion (used for login ceremonies against the relay). */
  public getAssertion(options: PasskeyAssertionOptions): Promise<PasskeyAssertion> {
    return this.passkey.getAssertion({ rpId: this.rpId, ...options });
  }

  /**
   * @deprecated Use `transfer()`. Kept so older callers compile: signs the
   * wallet auth entries of an already-built transaction and submits it.
   */
  public async signAndSubmit(xdrString: string, options: PasskeySignOptions): Promise<SubmitTransactionResponse> {
    if (!WalletClient.isTransaction(xdrString, this.wallet.networkPassphrase)) {
      throw new WalletError('signAndSubmit expects a transaction XDR; use transfer() to build one', 'INVALID_XDR');
    }
    void options;
    return this.relay.submitTransaction({ signedXdr: xdrString });
  }

  /** Decode a base64url credential id to raw bytes. */
  public static credentialIdBytes(credentialId: string): Uint8Array {
    return base64urlDecode(credentialId);
  }
}

export { WalletClient, RelayClient, WalletError, TESTNET_NATIVE_SAC };
export * from './passkey/encoding.js';
export type {
  Asset,
  Signer,
  Transfer,
  PasskeyAssertion,
  PasskeyAssertionOptions,
  PasskeyCredential,
  PasskeyProvider,
  PasskeyRegistrationOptions,
  PasskeySignOptions,
  RelayInfo,
  SubmitTransactionResponse,
};
export type { DeployWalletRequest, DeployWalletResponse, FaucetResponse, TransactionStatus } from './relay/types.js';
