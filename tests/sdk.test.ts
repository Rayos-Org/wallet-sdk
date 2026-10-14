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

  it('throws CONFIG_ERROR when policy method is called without policyContractId', async () => {
    const sdk = new WalletSdk(cfg);
    await expect(
      sdk.setSpendLimit({
        walletAddress: 'C'.padEnd(56, 'A'),
        tokenAddress: 'C'.padEnd(56, 'B'),
        amount: 1000n,
        windowSecs: 3600n,
        credentialId: 'Y3JlZA',
      })
    ).rejects.toThrow(/Policy contract ID not configured/);

    await expect(
      sdk.getSpendLimit('C'.padEnd(56, 'A'), 'C'.padEnd(56, 'B'))
    ).rejects.toThrow(/Policy contract ID not configured/);
  });

  it('delegates invokeWithPasskey through wallet.buildSignedInvocation and relay.submitTransaction', async () => {
    const validContract1 = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
    const validContract2 = 'CCCAMWJOF7IYTVCU7SR6HFTNH5XRMDMWPYN464NY5BCKUPMUM64RZ5CH';
    const validPolicy = 'CBIVUPL6T6GF4UFOVFOUVVORTQC5QB3LPXF27FHZWPLSMTZXLWHB7HZP';

    const sdk = new WalletSdk({ ...cfg, policyContractId: validPolicy });
    vi.spyOn(sdk.relay, 'info').mockResolvedValue({
      publicKey: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ',
      supportedAssets: [],
      maxFeePerTx: '1000',
    });
    vi.spyOn(sdk.wallet, 'buildSignedInvocation').mockResolvedValue('AAAA_MOCK_XDR');
    vi.spyOn(sdk.relay, 'submitTransaction').mockResolvedValue({
      status: 'SUCCESS',
      txHash: 'test_tx_hash',
      ledger: 1234,
      createdAt: '2026-10-14T00:00:00Z',
    });

    const res = await sdk.setSpendLimit({
      walletAddress: validContract1,
      tokenAddress: validContract2,
      amount: 5000000n,
      windowSecs: 86400n,
      credentialId: 'Y3JlZA',
    });

    expect(res.txHash).toBe('test_tx_hash');
    expect(sdk.wallet.buildSignedInvocation).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddress: validContract1,
        contractId: validPolicy,
        method: 'set_spend_limit',
      })
    );
  });
});
