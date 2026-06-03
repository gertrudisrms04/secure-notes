import { gcm } from "@noble/ciphers/aes.js";
import { base64ToBytes, bytesToBase64 } from "../../utils/encoding";
import { getRandomBytes } from "../../utils/random";

export type AesEncryptedBytes = {
  ciphertext: string;
  iv: string;
};

function validateAesKey(key: Uint8Array): void {
  if (key.length !== 32) {
    throw new Error("AES key harus 32 bytes untuk AES-256-GCM.");
  }
}

export async function encryptBytesWithAesGcm(
  plaintextBytes: Uint8Array,
  key: Uint8Array,
): Promise<AesEncryptedBytes> {
  validateAesKey(key);

  const iv = await getRandomBytes(12);
  const aes = gcm(key, iv);

  // @noble/ciphers menghasilkan ciphertext + authTag dalam satu sealed bytes.
  const sealed = aes.encrypt(plaintextBytes);

  return {
    ciphertext: bytesToBase64(sealed),
    iv: bytesToBase64(iv),
  };
}

export function decryptBytesWithAesGcm(
  encrypted: AesEncryptedBytes,
  key: Uint8Array,
): Uint8Array {
  validateAesKey(key);

  const ciphertextBytes = base64ToBytes(encrypted.ciphertext);
  const ivBytes = base64ToBytes(encrypted.iv);

  const aes = gcm(key, ivBytes);
  return aes.decrypt(ciphertextBytes);
}
