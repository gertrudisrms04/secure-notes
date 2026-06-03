import * as Clipboard from "expo-clipboard";
import * as SecureStore from "expo-secure-store";
import { p256 } from "@noble/curves/nist.js";
import { bytesToBase64 } from "../../utils/encoding";
import {
  getSessionMasterKey,
  hasSessionMasterKey,
} from "../secureStore/keyStore";
import { encryptBytesWithAesGcm } from "./aes";
import { getRandomBytes } from "../../utils/random";

const ECC_PUBLIC_KEY_STORAGE_KEY = "secure_notes_ecc_public_key_v1";
const ECC_PRIVATE_KEY_CIPHERTEXT_STORAGE_KEY =
  "secure_notes_ecc_private_key_ciphertext_v1";
const ECC_PRIVATE_KEY_IV_STORAGE_KEY = "secure_notes_ecc_private_key_iv_v1";

export type StoredEccPublicKey = {
  publicKey: string;
};

export async function generateEccKeyPair(): Promise<StoredEccPublicKey> {
  if (!hasSessionMasterKey()) {
    throw new Error("Vault belum dibuka. Masukkan master key terlebih dahulu.");
  }

  const masterKey = getSessionMasterKey();

  const secretKey = await getRandomBytes(32);
  const publicKey = p256.getPublicKey(secretKey);

  const encryptedPrivateKey = await encryptBytesWithAesGcm(
    secretKey,
    masterKey,
  );

  const publicKeyBase64 = bytesToBase64(publicKey);

  await SecureStore.setItemAsync(
    ECC_PRIVATE_KEY_CIPHERTEXT_STORAGE_KEY,
    encryptedPrivateKey.ciphertext,
  );

  await SecureStore.setItemAsync(
    ECC_PRIVATE_KEY_IV_STORAGE_KEY,
    encryptedPrivateKey.iv,
  );

  await SecureStore.setItemAsync(ECC_PUBLIC_KEY_STORAGE_KEY, publicKeyBase64);

  return {
    publicKey: publicKeyBase64,
  };
}

export async function getEccPublicKey(): Promise<string | null> {
  return SecureStore.getItemAsync(ECC_PUBLIC_KEY_STORAGE_KEY);
}

export async function exportEccPublicKeyToClipboard(): Promise<string> {
  const publicKey = await getEccPublicKey();

  if (!publicKey) {
    throw new Error("ECC public key belum ada. Generate ECC key pair dulu.");
  }

  await Clipboard.setStringAsync(publicKey);

  return publicKey;
}

export async function resetEccKeyPair(): Promise<void> {
  await SecureStore.deleteItemAsync(ECC_PUBLIC_KEY_STORAGE_KEY);
  await SecureStore.deleteItemAsync(ECC_PRIVATE_KEY_CIPHERTEXT_STORAGE_KEY);
  await SecureStore.deleteItemAsync(ECC_PRIVATE_KEY_IV_STORAGE_KEY);
}
