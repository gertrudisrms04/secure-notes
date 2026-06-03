import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as ExpoCrypto from "expo-crypto";

import { gcm } from "@noble/ciphers/aes.js";
import { utf8ToBytes, bytesToUtf8 } from "@noble/ciphers/utils.js";
import { p256 } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

import type { EncryptedNoteRow, Note } from "../../types/note";

const MASTER_KEY_STORAGE_KEY = "secure_notes_master_key";

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  return ExpoCrypto.getRandomValues(bytes);
}

type EncryptedNoteContent = {
  encryptedTitle: string;
  encryptedBody: string;
  titleIv: string;
  bodyIv: string;
  titleAuthTag: string;
  bodyAuthTag: string;
};

function splitCiphertextAndTag(encrypted: Uint8Array) {
  const tagLength = 16;

  return {
    ciphertext: encrypted.slice(0, encrypted.length - tagLength),
    authTag: encrypted.slice(encrypted.length - tagLength),
  };
}

function combineCiphertextAndTag(ciphertext: Uint8Array, authTag: Uint8Array) {
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);
  return combined;
}

async function encryptTextField(text: string) {
  const masterKey = await getOrCreateMasterKey();
  const iv = randomBytes(12);

  const encrypted = gcm(masterKey, iv).encrypt(utf8ToBytes(text));
  const { ciphertext, authTag } = splitCiphertextAndTag(encrypted);

  return {
    ciphertext: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
    authTag: bytesToBase64(authTag),
  };
}

async function decryptTextField(
  ciphertextBase64: string | null,
  ivBase64: string | null,
  authTagBase64: string | null,
) {
  if (ciphertextBase64 == null || ivBase64 == null || authTagBase64 == null) {
    throw new Error("Missing encrypted note fields");
  }

  const masterKey = await getOrCreateMasterKey();

  const ciphertext = base64ToBytes(ciphertextBase64);
  const iv = base64ToBytes(ivBase64);
  const authTag = base64ToBytes(authTagBase64);

  const encrypted = combineCiphertextAndTag(ciphertext, authTag);
  const plaintextBytes = gcm(masterKey, iv).decrypt(encrypted);

  return bytesToUtf8(plaintextBytes);
}

export async function encryptNoteContent(
  title: string,
  body: string,
): Promise<EncryptedNoteContent> {
  const encryptedTitle = await encryptTextField(title);
  const encryptedBody = await encryptTextField(body);

  return {
    encryptedTitle: encryptedTitle.ciphertext,
    encryptedBody: encryptedBody.ciphertext,
    titleIv: encryptedTitle.iv,
    bodyIv: encryptedBody.iv,
    titleAuthTag: encryptedTitle.authTag,
    bodyAuthTag: encryptedBody.authTag,
  };
}

export async function decryptNoteRow(row: EncryptedNoteRow): Promise<Note> {
  const title = await decryptTextField(
    row.encryptedTitle,
    row.titleIv,
    row.titleAuthTag,
  );

  const body = await decryptTextField(
    row.encryptedBody,
    row.bodyIv,
    row.bodyAuthTag,
  );

  return {
    id: row.id,
    title,
    body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    pinned: Boolean(row.pinned),
  };
}

export type EncryptedNote = {
  iv: string;
  ciphertext: string;
};

export type DecryptedNote = {
  title: string;
  body: string;
  encryptedAt?: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function saveKey(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(MASTER_KEY_STORAGE_KEY, key);
    return;
  }

  await SecureStore.setItemAsync(MASTER_KEY_STORAGE_KEY, key);
}

async function loadKey(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(MASTER_KEY_STORAGE_KEY);
  }

  return SecureStore.getItemAsync(MASTER_KEY_STORAGE_KEY);
}

async function getOrCreateMasterKey(): Promise<Uint8Array> {
  const existingKey = await loadKey();

  if (existingKey) {
    return base64ToBytes(existingKey);
  }

  // 32 byte = AES-256
  const newKey = randomBytes(32);
  const encodedKey = bytesToBase64(newKey);

  await saveKey(encodedKey);

  return newKey;
}

export async function initVault(): Promise<void> {
  await getOrCreateMasterKey();
}

export async function encryptNote(
  title: string,
  body: string,
): Promise<EncryptedNote> {
  const masterKey = await getOrCreateMasterKey();

  // 12 byte nonce direkomendasikan untuk AES-GCM
  const iv = randomBytes(12);

  const notePayload = JSON.stringify({
    title,
    body,
    encryptedAt: new Date().toISOString(),
  });

  const plaintextBytes = utf8ToBytes(notePayload);

  const aes = gcm(masterKey, iv);
  const ciphertext = aes.encrypt(plaintextBytes);

  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
  };
}

export async function decryptNote(
  encryptedNote: EncryptedNote,
): Promise<DecryptedNote> {
  const masterKey = await getOrCreateMasterKey();

  const iv = base64ToBytes(encryptedNote.iv);
  const ciphertext = base64ToBytes(encryptedNote.ciphertext);

  const aes = gcm(masterKey, iv);
  const plaintextBytes = aes.decrypt(ciphertext);

  const plaintext = bytesToUtf8(plaintextBytes);

  return JSON.parse(plaintext);
}

export function generateECCKeyPair() {
  const { secretKey, publicKey } = p256.keygen();

  return {
    privateKey: bytesToBase64(secretKey),
    publicKey: bytesToBase64(publicKey),
  };
}

export function deriveSharedSecret(
  privateKeyBase64: string,
  publicKeyBase64: string,
): string {
  const privateKey = base64ToBytes(privateKeyBase64);
  const publicKey = base64ToBytes(publicKeyBase64);

  const sharedSecret = p256.getSharedSecret(privateKey, publicKey);

  const derivedKey = hkdf(
    sha256,
    sharedSecret,
    undefined,
    utf8ToBytes("secure-notes-ecc-shared-secret"),
    32,
  );

  return bytesToBase64(derivedKey);
}
