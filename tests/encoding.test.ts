import { describe, it, expect } from 'vitest';
import {
  base64urlDecode,
  base64urlEncode,
  derSignatureToRaw,
  hexDecode,
  hexEncode,
  normaliseLowS,
  publicKeyFromAttestationObject,
  cborDecode,
} from '../src/passkey/encoding.js';

describe('base64url', () => {
  it('round-trips arbitrary bytes without padding', () => {
    for (const len of [0, 1, 2, 3, 31, 32, 33, 64]) {
      const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 37 + 11) & 0xff);
      const enc = base64urlEncode(bytes);
      expect(enc).not.toMatch(/[+/=]/);
      expect(base64urlDecode(enc)).toEqual(bytes);
    }
  });
  it('matches the contract: a 32-byte hash encodes to 43 chars', () => {
    expect(base64urlEncode(new Uint8Array(32).fill(7))).toHaveLength(43);
  });
  it('accepts standard base64 with padding too', () => {
    expect(base64urlDecode('AQID')).toEqual(Uint8Array.from([1, 2, 3]));
    expect(base64urlDecode('AQI=')).toEqual(Uint8Array.from([1, 2]));
  });
});

describe('hex', () => {
  it('round-trips', () => {
    const b = Uint8Array.from([0, 15, 255, 128]);
    expect(hexEncode(b)).toBe('000fff80');
    expect(hexDecode('0x000fff80')).toEqual(b);
  });
});

describe('DER to raw signature', () => {
  it('parses a DER ECDSA signature into r||s and enforces low-S', () => {
    const r = new Uint8Array(32).fill(0x11);
    // n - 1 (high S); must be normalised to n - (n-1) = 1
    const highS = hexDecode('FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632550');
    const der = Uint8Array.from([
      0x30, 0x46,
      0x02, 0x20, ...r,
      0x02, 0x21, 0x00, ...highS, // leading 0x00 because MSB set
    ]);
    const raw = derSignatureToRaw(der);
    expect(raw).toHaveLength(64);
    expect(raw.slice(0, 32)).toEqual(r);
    expect(hexEncode(raw.slice(32))).toBe('0000000000000000000000000000000000000000000000000000000000000001');
  });
  it('leaves an already-low raw signature untouched', () => {
    const raw = new Uint8Array(64).fill(1);
    expect(normaliseLowS(raw)).toEqual(raw);
  });
});

describe('attestationObject to P-256 public key', () => {
  it('extracts 0x04||x||y from a minimal packed attestation', () => {
    const x = new Uint8Array(32).fill(0xaa);
    const y = new Uint8Array(32).fill(0xbb);
    const cose = Uint8Array.from([
      0xa5, // map(5)
      0x01, 0x02, // kty: EC2
      0x03, 0x26, // alg: -7 (ES256)
      0x20, 0x01, // crv: P-256
      0x21, 0x58, 0x20, ...x, // x
      0x22, 0x58, 0x20, ...y, // y
    ]);
    // rpIdHash(32) flags(AT|UP) counter(4) aaguid(16) credIdLen(2) credId(2) COSE
    const authData = Uint8Array.from([
      ...new Uint8Array(32), 0x41, 0, 0, 0, 1, ...new Uint8Array(16), 0x00, 0x02, 0xde, 0xad, ...cose,
    ]);
    const str = (s: string) => Uint8Array.from([0x60 + s.length, ...new TextEncoder().encode(s)]);
    const att = Uint8Array.from([
      0xa3,
      ...str('fmt'), ...str('none'),
      ...str('attStmt'), 0xa0,
      ...str('authData'), 0x58, authData.length, ...authData,
    ]);
    expect(cborDecode(att)).toBeInstanceOf(Map);
    const pk = publicKeyFromAttestationObject(base64urlEncode(att));
    expect(pk).toHaveLength(65);
    expect(pk[0]).toBe(0x04);
    expect(pk.slice(1, 33)).toEqual(x);
    expect(pk.slice(33)).toEqual(y);
  });
});
