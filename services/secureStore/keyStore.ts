import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { utf8ToBytes } from "../../utils/encoding";

const MASTER_KEY_CHECK_STORAGE_KEY = "secure_notes_master_key_check_v1";

let sessionMasterKey: Uint8Array | null = null;

async function deriveKeyFromInput(input: string): Promise<Uint8Array> {
  const digestHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
  );

  // SHA-256 hex panjangnya 64 char.
  // Kita pakai bytes dari string hex sebagai demo key material.
  return utf8ToBytes(digestHex).slice(0, 32);
}

export async function unlockMasterKey(input: string): Promise<void> {
  if (!input || input.length < 8) {
    throw new Error("Master key minimal 8 karakter.");
  }

  const savedCheck = await SecureStore.getItemAsync(
    MASTER_KEY_CHECK_STORAGE_KEY,
  );

  const inputCheck = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `secure-notes-check:${input}`,
  );

  // Pertama kali: master key dibuat dari input user.
  if (!savedCheck) {
    await SecureStore.setItemAsync(MASTER_KEY_CHECK_STORAGE_KEY, inputCheck);
    sessionMasterKey = await deriveKeyFromInput(input);
    console.log("Vault created and unlocked");
    return;
  }

  // Berikutnya: input user harus cocok dengan check hash.
  if (inputCheck !== savedCheck) {
    throw new Error("Master key salah.");
  }

  sessionMasterKey = await deriveKeyFromInput(input);
  console.log("Vault unlocked");
}

export function getSessionMasterKey(): Uint8Array {
  if (!sessionMasterKey) {
    throw new Error("Vault belum dibuka. Masukkan master key terlebih dahulu.");
  }

  return sessionMasterKey;
}

export function hasSessionMasterKey(): boolean {
  return sessionMasterKey !== null;
}

export async function hasMasterKeySetup(): Promise<boolean> {
  const savedCheck = await SecureStore.getItemAsync(
    MASTER_KEY_CHECK_STORAGE_KEY,
  );

  return Boolean(savedCheck);
}

export function lockVault(): void {
  sessionMasterKey = null;
}

export async function deleteMasterKey(): Promise<void> {
  sessionMasterKey = null;
  await SecureStore.deleteItemAsync(MASTER_KEY_CHECK_STORAGE_KEY);
}
