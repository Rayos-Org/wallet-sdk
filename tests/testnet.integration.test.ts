// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { WalletClient } from '../src/index.js';

/**
 * Live reads against Stellar testnet, exercising the real contracts deployed
 * by wallet-contracts/scripts/deploy_testnet.sh. Set SKIP_TESTNET=1 to skip
 * when offline.
 */
const FACTORY = 'CCCAMWJOF7IYTVCU7SR6HFTNH5XRMDMWPYN464NY5BCKUPMUM64RZ5CH';
// Deployed from the factory with salt 0x00..aa and credential_id 0x6162 ("ab").
const KNOWN_WALLET = 'CBRZQC5YY2ZZIMTX6OQ47AUK5HAXKZ32GLYC5DDQKAGJCORWVPJUC4R3';

const run = process.env.SKIP_TESTNET ? describe.skip : describe;

run('testnet (live)', () => {
  const client = new WalletClient({
    networkPassphrase: 'Test SDF Network ; September 2015',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    factoryContractId: FACTORY,
  });

  it('predict_address is deterministic and matches the deployed wallet', async () => {
    const salt = new Uint8Array(32);
    salt[31] = 0xaa;
    expect(await client.predictAddress(salt)).toBe(KNOWN_WALLET);
  }, 30_000);

  it('get_signers returns the registered passkey signer', async () => {
    const signers = await client.getSigners(KNOWN_WALLET);
    expect(signers).toHaveLength(1);
    expect(signers[0].credentialId).toBe('YWI'); // base64url("ab")
    expect(signers[0].publicKeyBytes).toHaveLength(65);
    expect(signers[0].publicKeyBytes[0]).toBe(0x04);
  }, 30_000);

  it('native balance reads as a bigint', async () => {
    const bal = await client.getBalance(KNOWN_WALLET);
    expect(typeof bal).toBe('bigint');
    expect(bal >= 0n).toBe(true);
  }, 30_000);

  it('walletExists distinguishes deployed vs random contract ids', async () => {
    expect(await client.walletExists(KNOWN_WALLET)).toBe(true);
    expect(await client.walletExists('CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(false);
  }, 30_000);
});
