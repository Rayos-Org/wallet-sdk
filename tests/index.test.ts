import { describe, it, expect, vi } from 'vitest';
import { WalletSdk } from '../src/index.js';
import * as webauthn from '@simplewebauthn/browser';

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
}));

describe('WalletSdk (Public API)', () => {
  it('should construct properly', () => {
    const sdk = new WalletSdk({
      networkPassphrase: 'TEST',
      rpcUrl: 'http://localhost',
      relayUrl: 'http://localhost/relay'
    });
    expect(sdk).toBeDefined();
  });

  it('createWallet flow works', async () => {
    const sdk = new WalletSdk({
      networkPassphrase: 'TEST',
      rpcUrl: 'http://localhost',
      relayUrl: 'http://localhost/relay'
    });

    vi.mocked(webauthn.startRegistration).mockResolvedValueOnce({ id: 'cred', rawId: 'raw', response: {}, type: 'public-key' } as any);

    const result = await sdk.createWallet({
      challenge: 'chal',
      rp: { id: 'rp', name: 'rp' },
      user: { id: 'u', name: 'u', displayName: 'u' }
    }, new Uint8Array());

    expect(result.address).toBe('C_PREDICTED_ADDRESS_PLACEHOLDER');
    expect(result.credential.id).toBe('cred');
  });
});
