// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { Keypair, TransactionBuilder, rpc } from '@stellar/stellar-sdk';
import { WalletClient, base64urlDecode, base64urlEncode, utf8Encode } from '../src/index.js';
import type { PasskeyProvider } from '../src/index.js';

/**
 * Full on-chain flow on testnet, no browser involved:
 *
 *   1. emulate a platform authenticator with a WebCrypto P-256 key
 *   2. deploy a GuardianWallet for that key through the factory (sponsor pays)
 *   3. fund the wallet from the sponsor
 *   4. build a transfer, sign the wallet's auth entry with the "passkey",
 *      sponsor signs the envelope, submit -> real tx hash, SUCCESS status
 *
 * Needs a funded testnet secret in SPONSOR_SECRET (e.g. `stellar keys show deployer`).
 */
const SPONSOR_SECRET = process.env.SPONSOR_SECRET;
const run = SPONSOR_SECRET ? describe : describe.skip;

const NETWORK = 'Test SDF Network ; September 2015';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const FACTORY = 'CCCAMWJOF7IYTVCU7SR6HFTNH5XRMDMWPYN464NY5BCKUPMUM64RZ5CH';

/** A software authenticator that behaves exactly like Windows Hello / Face ID would. */
async function softwareAuthenticator(credentialId: Uint8Array) {
  const key = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const raw = new Uint8Array(await webcrypto.subtle.exportKey('raw', key.publicKey)); // 0x04||x||y
  expect(raw).toHaveLength(65);

  const rpIdHash = new Uint8Array(await webcrypto.subtle.digest('SHA-256', utf8Encode('localhost')));
  const provider: PasskeyProvider = {
    createCredential: async () => {
      throw new Error('not used');
    },
    getAssertion: async (opts) => {
      const clientDataJSON = utf8Encode(
        JSON.stringify({ type: 'webauthn.get', challenge: opts.challenge, origin: 'http://localhost:3000', crossOrigin: false })
      );
      // authenticatorData = rpIdHash(32) | flags(UP|UV = 0x05) | signCount(4)
      const authenticatorData = new Uint8Array(37);
      authenticatorData.set(rpIdHash, 0);
      authenticatorData[32] = 0x05;
      const cdjHash = new Uint8Array(await webcrypto.subtle.digest('SHA-256', clientDataJSON));
      const message = new Uint8Array([...authenticatorData, ...cdjHash]);
      // WebCrypto returns raw r||s (64 bytes); browsers return DER — the SDK accepts both.
      const sig = new Uint8Array(await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key.privateKey, message));
      return {
        id: base64urlEncode(credentialId),
        rawId: base64urlEncode(credentialId),
        type: 'public-key',
        clientExtensionResults: {},
        response: {
          authenticatorData: base64urlEncode(authenticatorData),
          clientDataJSON: base64urlEncode(clientDataJSON),
          signature: base64urlEncode(sig),
        },
      };
    },
  };
  return { provider, publicKey: raw };
}

async function submit(server: rpc.Server, xdrBase64: string, sponsor: Keypair): Promise<string> {
  const tx = TransactionBuilder.fromXDR(xdrBase64, NETWORK);
  tx.sign(sponsor);
  const sent = await server.sendTransaction(tx);
  expect(sent.status, `send failed: ${JSON.stringify(sent)}`).not.toBe('ERROR');
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await server.getTransaction(sent.hash);
    if (res.status === 'SUCCESS') return sent.hash;
    if (res.status === 'FAILED') throw new Error(`tx ${sent.hash} FAILED: ${JSON.stringify(res)}`);
  }
  throw new Error(`tx ${sent.hash} did not settle in time`);
}

run('testnet e2e: passkey-signed transfer', () => {
  it('deploys, funds and sends XLM with a WebAuthn signature verified on-chain', async () => {
    const sponsor = Keypair.fromSecret(SPONSOR_SECRET!);
    const client = new WalletClient({ networkPassphrase: NETWORK, rpcUrl: RPC_URL, factoryContractId: FACTORY });
    const server = client.server;
    const { Contract, Address, nativeToScVal, BASE_FEE, Operation } = await import('@stellar/stellar-sdk');

    // 1. authenticator
    const credentialId = webcrypto.getRandomValues(new Uint8Array(16));
    const { provider, publicKey } = await softwareAuthenticator(credentialId);

    // 2. deploy through the factory (what the relay's /relay/deploy does)
    const salt = webcrypto.getRandomValues(new Uint8Array(32));
    const predicted = await client.predictAddress(salt);
    const factory = new Contract(FACTORY);
    const deployTx = new TransactionBuilder(await server.getAccount(sponsor.publicKey()), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK,
    })
      .addOperation(
        factory.call(
          'deploy_wallet',
          nativeToScVal(salt),
          nativeToScVal(credentialId),
          nativeToScVal(publicKey)
        )
      )
      .setTimeout(120)
      .build();
    const deploySim = await server.simulateTransaction(deployTx);
    expect(rpc.Api.isSimulationSuccess(deploySim)).toBe(true);
    const deployHash = await submit(server, rpc.assembleTransaction(deployTx, deploySim).build().toXDR(), sponsor);
    console.log('deployed wallet', predicted, 'tx', deployHash);

    const signers = await client.getSigners(predicted);
    expect(signers).toHaveLength(1);
    expect(signers[0].credentialId).toBe(base64urlEncode(credentialId));
    expect(signers[0].publicKeyBytes).toEqual(publicKey);

    // 3. fund: sponsor -> wallet, 25 XLM (what /relay/faucet does)
    const sac = new Contract(client.nativeTokenContractId);
    const fundTx = new TransactionBuilder(await server.getAccount(sponsor.publicKey()), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK,
    })
      .addOperation(
        sac.call(
          'transfer',
          new Address(sponsor.publicKey()).toScVal(),
          new Address(predicted).toScVal(),
          nativeToScVal(250_000_000n, { type: 'i128' })
        )
      )
      .setTimeout(120)
      .build();
    const fundSim = await server.simulateTransaction(fundTx);
    expect(rpc.Api.isSimulationSuccess(fundSim)).toBe(true);
    await submit(server, rpc.assembleTransaction(fundTx, fundSim).build().toXDR(), sponsor);
    expect(await client.getBalance(predicted)).toBe(250_000_000n);

    // 4. passkey-authorised transfer: wallet -> sponsor, 3 XLM
    const signedXdr = await client.buildSignedTransfer({
      walletAddress: predicted,
      to: sponsor.publicKey(),
      amount: 30_000_000n,
      sponsorPublicKey: sponsor.publicKey(),
      passkey: provider,
      credentialId: base64urlEncode(credentialId),
      rpId: 'localhost',
    });
    const transferHash = await submit(server, signedXdr, sponsor);
    console.log('passkey transfer tx', transferHash, `https://stellar.expert/explorer/testnet/tx/${transferHash}`);

    expect(await client.getBalance(predicted)).toBe(220_000_000n);
    const transfers = await client.getRecentTransfers(predicted);
    expect(transfers.some((t) => t.txHash === transferHash && t.direction === 'out' && t.amount === 30_000_000n)).toBe(true);
    void Operation;
    void base64urlDecode;
  }, 240_000);
});
