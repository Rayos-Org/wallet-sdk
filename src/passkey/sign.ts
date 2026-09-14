import { startAuthentication } from '@simplewebauthn/browser';
import { PasskeyAssertion, PasskeyAssertionOptions } from './types.js';

/** Browser passkey assertion over an arbitrary (base64url) challenge. */
export async function getAssertion(options: PasskeyAssertionOptions): Promise<PasskeyAssertion> {
  try {
    const assertion = await startAuthentication({
      optionsJSON: {
        challenge: options.challenge,
        allowCredentials: options.credentialId ? [{ id: options.credentialId, type: 'public-key' }] : [],
        timeout: options.timeout || 60000,
        userVerification: options.userVerification || 'required',
        rpId: options.rpId,
      } as any,
    });
    return {
      id: assertion.id,
      rawId: assertion.rawId,
      type: 'public-key',
      clientExtensionResults: assertion.clientExtensionResults ?? {},
      response: {
        authenticatorData: assertion.response.authenticatorData,
        clientDataJSON: assertion.response.clientDataJSON,
        signature: assertion.response.signature,
        userHandle: assertion.response.userHandle,
      },
    };
  } catch (error) {
    throw new Error(`Failed to sign with passkey: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
