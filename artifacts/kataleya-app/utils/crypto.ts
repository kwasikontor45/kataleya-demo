import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import * as ExpoCrypto from 'expo-crypto';

// Wire expo-crypto's secure RNG into tweetnacl.
// Required in React Native — 'self.crypto' doesn't exist, so tweetnacl's
// built-in detection fails without this polyfill.
nacl.setPRNG((output: Uint8Array, length: number) => {
  const bytes = ExpoCrypto.getRandomBytes(length);
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
