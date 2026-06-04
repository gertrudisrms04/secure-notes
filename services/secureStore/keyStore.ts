import * as Crypto from "expo-crypto";
import { deleteSecureItem, getSecureItem, setSecureItem } from "./storage";
import { utf8ToBytes } from "../../utils/encoding";

const MASTER_KEY_CHECK_STORAGE_KEY = "secure_notes_master_key_check_v1";

let sessionMasterKey: Uint8Array | null = null;

async function deriveKeyFromInput(input: string): Promise<Uint8Array> {
  const digestHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
  );

  return utf8ToBytes(digestHex).slice(0, 32);
}

export async function unlockMasterKey(input: string): Promise<void> {
  const trimmedInput = input.trim();

  if (!trimmedInput || trimmedInput.length < 8) {
    throw new Error("Master key minimal 8 karakter.");
  }

  const savedCheck = await getSecureItem(MASTER_KEY_CHECK_STORAGE_KEY);

  const inputCheck = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `secure-notes-check:${trimmedInput}`,
  );

  if (!savedCheck) {
    await setSecureItem(MASTER_KEY_CHECK_STORAGE_KEY, inputCheck);

    sessionMasterKey = await deriveKeyFromInput(trimmedInput);

    console.log("Vault created and unlocked");
    return;
  }

  if (inputCheck !== savedCheck) {
    throw new Error("Master key salah.");
  }

  sessionMasterKey = await deriveKeyFromInput(trimmedInput);

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
  const savedCheck = await getSecureItem(MASTER_KEY_CHECK_STORAGE_KEY);

  return Boolean(savedCheck);
}

export function lockVault(): void {
  sessionMasterKey = null;
}

export async function deleteMasterKey(): Promise<void> {
  sessionMasterKey = null;

  await deleteSecureItem(MASTER_KEY_CHECK_STORAGE_KEY);
}
