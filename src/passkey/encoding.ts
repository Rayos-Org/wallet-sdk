/**
 * Encoding helpers shared by the browser and native passkey paths.
 * Pure TypeScript — no Node/Buffer-only APIs so they run in React Native too.
 */

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function base64urlEncode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64URL[(n >> 18) & 63] + B64URL[(n >> 12) & 63] + B64URL[(n >> 6) & 63] + B64URL[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += B64URL[(n >> 18) & 63] + B64URL[(n >> 12) & 63];
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64URL[(n >> 18) & 63] + B64URL[(n >> 12) & 63] + B64URL[(n >> 6) & 63];
  }
  return out;
}

export function base64urlDecode(input: string): Uint8Array {
  const s = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  const lookup = new Map<string, number>();
  const std = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < std.length; i++) lookup.set(std[i], i);
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of s) {
    const v = lookup.get(ch);
    if (v === undefined) throw new Error(`Invalid base64url character: ${ch}`);
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

export function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexDecode(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error('Invalid hex length');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function utf8Decode(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────────
   Minimal CBOR decoder — enough for WebAuthn attestationObject / COSE keys
   (maps, arrays, byte strings, text strings, unsigned/negative ints).
───────────────────────────────────────────────────────────────── */
type Cbor = number | string | Uint8Array | Cbor[] | Map<Cbor, Cbor> | boolean | null;

export function cborDecode(bytes: Uint8Array): Cbor {
  let pos = 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  function readLen(info: number): number {
    if (info < 24) return info;
    if (info === 24) return bytes[pos++];
    if (info === 25) {
      const v = view.getUint16(pos);
      pos += 2;
      return v;
    }
    if (info === 26) {
      const v = view.getUint32(pos);
      pos += 4;
      return v;
    }
    throw new Error('CBOR: unsupported length encoding');
  }

  function item(): Cbor {
    const initial = bytes[pos++];
    const major = initial >> 5;
    const info = initial & 0x1f;
    switch (major) {
      case 0:
        return readLen(info);
      case 1:
        return -1 - readLen(info);
      case 2: {
        const len = readLen(info);
        const v = bytes.slice(pos, pos + len);
        pos += len;
        return v;
      }
      case 3: {
        const len = readLen(info);
        const v = utf8Decode(bytes.slice(pos, pos + len));
        pos += len;
        return v;
      }
      case 4: {
        const len = readLen(info);
        const arr: Cbor[] = [];
        for (let i = 0; i < len; i++) arr.push(item());
        return arr;
      }
      case 5: {
        const len = readLen(info);
        const m = new Map<Cbor, Cbor>();
        for (let i = 0; i < len; i++) {
          const k = item();
          m.set(k, item());
        }
        return m;
      }
      case 7:
        if (info === 20) return false;
        if (info === 21) return true;
        if (info === 22) return null;
        throw new Error('CBOR: unsupported simple value');
      default:
        throw new Error(`CBOR: unsupported major type ${major}`);
    }
  }

  return item();
}

/**
 * Extract the uncompressed P-256 public key (0x04 || X || Y, 65 bytes) from a
 * WebAuthn registration `attestationObject` (base64url).
 *
 * attestationObject = CBOR { fmt, attStmt, authData }
 * authData = rpIdHash(32) | flags(1) | signCount(4) | aaguid(16) |
 *            credIdLen(2) | credId | COSE_Key(CBOR)
 */
export function publicKeyFromAttestationObject(attestationObjectB64url: string): Uint8Array {
  const att = cborDecode(base64urlDecode(attestationObjectB64url));
  if (!(att instanceof Map)) throw new Error('attestationObject is not a CBOR map');
  const authData = att.get('authData');
  if (!(authData instanceof Uint8Array)) throw new Error('attestationObject.authData missing');

  const flags = authData[32];
  if (!(flags & 0x40)) throw new Error('authenticator data has no attested credential (AT flag unset)');
  const credIdLen = (authData[53] << 8) | authData[54];
  const coseStart = 55 + credIdLen;
  const cose = cborDecode(authData.slice(coseStart));
  if (!(cose instanceof Map)) throw new Error('COSE key is not a CBOR map');

  const kty = cose.get(1);
  const alg = cose.get(3);
  if (kty !== 2) throw new Error(`Unsupported COSE key type ${String(kty)} (need EC2 / P-256)`);
  if (alg !== -7) throw new Error(`Unsupported COSE algorithm ${String(alg)} (need ES256)`);
  const x = cose.get(-2);
  const y = cose.get(-3);
  if (!(x instanceof Uint8Array) || !(y instanceof Uint8Array) || x.length !== 32 || y.length !== 32) {
    throw new Error('COSE key missing 32-byte x/y coordinates');
  }
  return concatBytes(Uint8Array.of(0x04), x, y);
}

/* ─────────────────────────────────────────────────────────────────
   ECDSA signature: DER → raw r||s (64 bytes) with low-S normalisation,
   which Soroban's secp256r1_verify requires.
───────────────────────────────────────────────────────────────── */
const P256_N = BigInt('0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551');
const P256_HALF_N = P256_N >> 1n;

function bytesToBigInt(b: Uint8Array): bigint {
  let n = 0n;
  for (const byte of b) n = (n << 8n) | BigInt(byte);
  return n;
}

function bigIntTo32(n: bigint): Uint8Array {
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

export function derSignatureToRaw(der: Uint8Array): Uint8Array {
  if (der.length === 64) return normaliseLowS(der);
  if (der[0] !== 0x30) throw new Error('Signature is not DER-encoded');
  let pos = 2;
  if (der[1] & 0x80) pos += der[1] & 0x7f; // long-form length
  if (der[pos++] !== 0x02) throw new Error('DER: expected INTEGER for r');
  const rLen = der[pos++];
  const r = der.slice(pos, pos + rLen);
  pos += rLen;
  if (der[pos++] !== 0x02) throw new Error('DER: expected INTEGER for s');
  const sLen = der[pos++];
  const s = der.slice(pos, pos + sLen);
  return normaliseLowS(concatBytes(bigIntTo32(bytesToBigInt(r)), bigIntTo32(bytesToBigInt(s))));
}

export function normaliseLowS(raw: Uint8Array): Uint8Array {
  const r = raw.slice(0, 32);
  let s = bytesToBigInt(raw.slice(32, 64));
  if (s > P256_HALF_N) s = P256_N - s;
  return concatBytes(r, bigIntTo32(s));
}
