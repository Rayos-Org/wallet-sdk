import { startRegistration } from '@simplewebauthn/browser';
import { PasskeyCredential, PasskeyRegistrationOptions } from './types.js';
import { publicKeyFromAttestationObject } from './encoding.js';

/** Browser passkey registration. Prefers the platform authenticator (Windows Hello / Touch ID / Android). */
export async function createCredential(options: PasskeyRegistrationOptions): Promise<PasskeyCredential> {
  let credential;
  try {
    credential = await startRegistration({
      optionsJSON: {
        challenge: options.challenge,
        rp: options.rp,
        user: options.user,
        pubKeyCredParams: options.pubKeyCredParams || [{ alg: -7, type: 'public-key' }],
        timeout: options.timeout || 60000,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          userVerification: 'required',
          ...options.authenticatorSelection,
        },
        attestation: options.attestation || 'none',
      } as any,
    });
  } catch (error) {
    throw new Error(`Failed to create passkey credential: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    id: credential.id,
    rawId: credential.rawId,
    type: 'public-key',
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.clientExtensionResults ?? {},
    response: {
      clientDataJSON: credential.response.clientDataJSON,
      attestationObject: credential.response.attestationObject,
    },
    publicKeyBytes: publicKeyFromAttestationObject(credential.response.attestationObject),
  };
}
