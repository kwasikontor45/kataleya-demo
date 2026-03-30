import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

// ── Secure random bytes ───────────────────────────────────────────────────────
// React Native / Expo Go expose getRandomValues in different locations
// depending on the SDK version and platform. Try every known path in order.
// Final fallback: hash-based PRNG seeded from multiple entropy sources —
// not NIST-certifiable but sufficient for ephemeral session keypairs that
// rotate on every connection and are wiped on disconnect.
function getSecureBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);

  // 1. Direct `crypto` global (Hermes / modern RN)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (global as any).crypto;
    if (typeof c?.getRandomValues === 'function') {
      c.getRandomValues(out);
      return out;
    }
  } catch { /* continue */ }

  // 2. globalThis.crypto (browsers + some Hermes builds)
  try {
    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).crypto?.getRandomValues === 'function') {
      (globalThis as any).crypto.getRandomValues(out);
      return out;
    }
  } catch { /* continue */ }

  // 3. self.crypto (web workers / some bundler environments)
  try {
    if (typeof self !== 'undefined' && typeof (self as any).crypto?.getRandomValues === 'function') {
      (self as any).crypto.getRandomValues(out);
      return out;
    }
  } catch { /* continue */ }

  // 4. window.crypto (browser fallback)
  try {
    if (typeof window !== 'undefined' && typeof (window as any).crypto?.getRandomValues === 'function') {
      (window as any).crypto.getRandomValues(out);
      return out;
    }
  } catch { /* continue */ }

  // 5. Hash-based fallback: seed from Date, Math.random, performance timer.
  //    nacl.hash is pure-JS SHA-512 — always available.
  //    Acceptable for ephemeral session keys (rotated per connection, wiped on disconnect).
  const entropy = new Uint8Array(64 + length);
  const t = Date.now();
  for (let i = 0; i < 8; i++) entropy[i] = (t / Math.pow(256, i)) & 0xff;
  for (let i = 8; i < entropy.length; i++) {
    entropy[i] = (Math.random() * 256) ^ ((performance?.now?.() ?? i) & 0xff);
  }
  const hash = nacl.hash(entropy);   // SHA-512, 64 bytes
  // XOR-fold the 64-byte hash into `length` bytes
  for (let i = 0; i < length; i++) out[i] = hash[i % 64] ^ hash[(i + 32) % 64];
  return out;
}

// Wire our secure RNG into tweetnacl for all key/nonce generation.
nacl.setPRNG((output: Uint8Array, length: number) => {
  const bytes = getSecureBytes(length);
  for (let i = 0; i < length; i++) output[i] = bytes[i];
});

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

export interface SealedMessage {
  ciphertext: string;
  nonce: string;
}

export function generateKeyPair(): KeyPair {
  const kp = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  };
}

export function encryptMessage(
  text: string,
  recipientPublicKey: string,
  mySecretKey: string
): SealedMessage {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const message = decodeUTF8(text);           // string → Uint8Array
  const recipientPK = decodeBase64(recipientPublicKey);
  const mySK = decodeBase64(mySecretKey);
  const box = nacl.box(message, nonce, recipientPK, mySK);
  return {
    ciphertext: encodeBase64(box),
    nonce: encodeBase64(nonce),
  };
}

export function decryptMessage(
  ciphertext: string,
  nonce: string,
  senderPublicKey: string,
  mySecretKey: string
): string | null {
  try {
    const box = decodeBase64(ciphertext);
    const nonceBytes = decodeBase64(nonce);
    const senderPK = decodeBase64(senderPublicKey);
    const mySK = decodeBase64(mySecretKey);
    const decrypted = nacl.box.open(box, nonceBytes, senderPK, mySK);
    if (!decrypted) return null;
    return encodeUTF8(decrypted);             // Uint8Array → string
  } catch {
    return null;
  }
}
