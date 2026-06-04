import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import { p256 } from "@noble/curves/nist.js";
import {
  base64ToBytes,
  bytesToBase64,
  utf8ToBytes,
} from "../../utils/encoding";
import { getRandomBytes } from "../../utils/random";
import {
  getSessionMasterKey,
  hasSessionMasterKey,
} from "../secureStore/keyStore";
import {
  deleteSecureItem,
  getSecureItem,
  setSecureItem,
} from "../secureStore/storage";
import { decryptBytesWithAesGcm, encryptBytesWithAesGcm } from "./aes";

const ECC_PUBLIC_KEY_STORAGE_KEY = "secure_notes_ecc_public_key_v1";

const ECC_PRIVATE_KEY_CIPHERTEXT_STORAGE_KEY =
  "secure_notes_ecc_private_key_ciphertext_v1";

const ECC_PRIVATE_KEY_IV_STORAGE_KEY = "secure_notes_ecc_private_key_iv_v1";

export type StoredEccPublicKey = {
  publicKey: string;
};

export type EccKeyPairBytes = {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
};

export async function createEccKeyPairBytes(): Promise<EccKeyPairBytes> {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const privateKey = await getRandomBytes(32);
      const publicKey = p256.getPublicKey(privateKey);

      return {
        privateKey,
        publicKey,
      };
    } catch {
      // retry kalau random private key tidak valid untuk P-256
    }
  }

  throw new Error("Gagal generate ECC P-256 key pair.");
}

export async function deriveEccWrappingKey(
  privateKey: Uint8Array,
  publicKey: Uint8Array,
): Promise<Uint8Array> {
  const sharedSecret = p256.getSharedSecret(privateKey, publicKey);
  const sharedSecretBase64 = bytesToBase64(sharedSecret);

  const digestHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    sharedSecretBase64,
  );

  return utf8ToBytes(digestHex).slice(0, 32);
}

export async function generateEccKeyPair(): Promise<StoredEccPublicKey> {
  if (!hasSessionMasterKey()) {
    throw new Error("Vault belum dibuka. Masukkan master key terlebih dahulu.");
  }

  const masterKey = getSessionMasterKey();

  const { privateKey, publicKey } = await createEccKeyPairBytes();

  const encryptedPrivateKey = await encryptBytesWithAesGcm(
    privateKey,
    masterKey,
  );

  const publicKeyBase64 = bytesToBase64(publicKey);

  await setSecureItem(
    ECC_PRIVATE_KEY_CIPHERTEXT_STORAGE_KEY,
    encryptedPrivateKey.ciphertext,
  );

  await setSecureItem(ECC_PRIVATE_KEY_IV_STORAGE_KEY, encryptedPrivateKey.iv);

  await setSecureItem(ECC_PUBLIC_KEY_STORAGE_KEY, publicKeyBase64);

  return {
    publicKey: publicKeyBase64,
  };
}

export async function getOrCreateEccKeyPair(): Promise<StoredEccPublicKey> {
  const publicKey = await getSecureItem(ECC_PUBLIC_KEY_STORAGE_KEY);

  const privateKeyCiphertext = await getSecureItem(
    ECC_PRIVATE_KEY_CIPHERTEXT_STORAGE_KEY,
  );

  const privateKeyIv = await getSecureItem(ECC_PRIVATE_KEY_IV_STORAGE_KEY);

  if (publicKey && privateKeyCiphertext && privateKeyIv) {
    return {
      publicKey,
    };
  }

  return generateEccKeyPair();
}

export async function getUnlockedEccPrivateKey(): Promise<Uint8Array> {
  const masterKey = getSessionMasterKey();

  const privateKeyCiphertext = await getSecureItem(
    ECC_PRIVATE_KEY_CIPHERTEXT_STORAGE_KEY,
  );

  const privateKeyIv = await getSecureItem(ECC_PRIVATE_KEY_IV_STORAGE_KEY);

  if (!privateKeyCiphertext || !privateKeyIv) {
    throw new Error("ECC private key belum ada. Generate ECC key pair dulu.");
  }

  return decryptBytesWithAesGcm(
    {
      ciphertext: privateKeyCiphertext,
      iv: privateKeyIv,
    },
    masterKey,
  );
}

export async function getEccPublicKey(): Promise<string | null> {
  return getSecureItem(ECC_PUBLIC_KEY_STORAGE_KEY);
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
  await deleteSecureItem(ECC_PUBLIC_KEY_STORAGE_KEY);
  await deleteSecureItem(ECC_PRIVATE_KEY_CIPHERTEXT_STORAGE_KEY);
  await deleteSecureItem(ECC_PRIVATE_KEY_IV_STORAGE_KEY);
}

export function publicKeyBase64ToBytes(publicKey: string): Uint8Array {
  return base64ToBytes(publicKey);
}
