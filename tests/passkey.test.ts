import { describe, it, expect, vi } from 'vitest';
import { createCredential, signTransaction } from '../src/passkey/index.js';
import * as webauthn from '@simplewebauthn/browser';

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));

describe('Passkey Module', () => {
  it('createCredential should call startRegistration', async () => {
    const mockCred = { id: 'test-id', rawId: 'test-raw', response: {}, type: 'public-key' };
    vi.mocked(webauthn.startRegistration).mockResolvedValueOnce(mockCred as any);

    const result = await createCredential({
      challenge: 'test-challenge',
      rp: { id: 'rp', name: 'rp' },
      user: { id: 'user', name: 'user', displayName: 'user' },
    });

    expect(webauthn.startRegistration).toHaveBeenCalled();
    expect(result.id).toBe('test-id');
    expect(result.publicKeyBytes).toBeDefined();
  });

  it('signTransaction should call startAuthentication', async () => {
    const mockAssertion = { id: 'test-id', rawId: 'test-raw', response: {}, type: 'public-key' };
    vi.mocked(webauthn.startAuthentication).mockResolvedValueOnce(mockAssertion as any);

    const result = await signTransaction('xdr-string', {
      challenge: 'test-challenge',
      credentialId: 'test-id'
    });

    expect(webauthn.startAuthentication).toHaveBeenCalled();
    expect(result.id).toBe('test-id');
    expect(result.signedXdr).toBe('xdr-string');
  });
});
