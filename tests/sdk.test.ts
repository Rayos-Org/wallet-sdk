import { describe, it, expect, vi } from 'vitest';
import { WalletSdk } from '../src/index.js';
import type { PasskeyProvider } from '../src/index.js';

const cfg = {
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  relayUrl: 'http://relay.test/api',
  factoryContractId: 'CCCAMWJOF7IYTVCU7SR6HFTNH5XRMDMWPYN464NY5BCKUPMUM64RZ5CH',
};

describe('WalletSdk.createWallet', () => {
  it('registers a passkey then asks the relay to deploy with the extracted key', async () => {
    const provider: PasskeyProvider = {
      createCredential: vi.fn(async () => ({
        id: 'Y3JlZA',
        rawId: 'Y3JlZA',
        type: 'public-key' as const,
        clientExtensionResults: {},
        response: { clientDataJSON: '', attestationObject: '' },
        publicKeyBytes: new Uint8Array(65).fill(4),
      })),
      getAssertion: vi.fn(),
    };
    const sdk = new WalletSdk({ ...cfg, passkeyProvider: provider });

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ walletAddress: 'C'.padEnd(56, 'A'), txHash: 'abc' }), { status: 200 })
      );

    const salt = new Uint8Array(32).fill(9);
    const res = await sdk.createWallet(
      { challenge: 'c', rp: { id: 'x', name: 'x' }, user: { id: 'u', name: 'n', displayName: 'n' } },
      salt
    );

    expect(res.address).toMatch(/^C/);
    expect(res.txHash).toBe('abc');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://relay.test/api/relay/deploy');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.saltHex).toBe('09'.repeat(32));
    expect(body.publicKeyHex).toBe('04'.repeat(65));
    expect(body.credentialId).toBe('Y3JlZA');
    fetchMock.mockRestore();
  });

  it('rejects a salt that is not 32 bytes', async () => {
    const sdk = new WalletSdk(cfg);
    await expect(
      sdk.createWallet(
        { challenge: 'c', rp: { id: 'x', name: 'x' }, user: { id: 'u', name: 'n', displayName: 'n' } },
        new Uint8Array(4)
      )
    ).rejects.toThrow(/32 bytes/);
  });

  it('signAndSubmit refuses non-transaction input instead of faking a hash', async () => {
    const sdk = new WalletSdk(cfg);
    await expect(
      sdk.signAndSubmit(JSON.stringify({ to: 'x' }), { challenge: 'c', credentialId: 'id' })
    ).rejects.toThrow(/transaction XDR/);
  });
});
