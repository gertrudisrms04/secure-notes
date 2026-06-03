import type { EncryptedNoteRow, Note } from "../../types/note";
import { bytesToUtf8, utf8ToBytes } from "../../utils/encoding";
import { getRandomBytes } from "../../utils/random";
import { getSessionMasterKey } from "../secureStore/keyStore";
import { decryptBytesWithAesGcm, encryptBytesWithAesGcm } from "./aes";
import { resetLocalDatabase } from "../db/database";
import { deleteMasterKey } from "../secureStore/keyStore";
import { resetEccKeyPair } from "./eccKeyService";
import { addRealUsageBenchmarkMetric } from "../benchmark/realUsageBenchmarkStore";
import { base64SizeBytes, utf8SizeBytes } from "../../utils/size";
import { nowMs } from "../../utils/performance";

export async function resetLocalVault(): Promise<void> {
  await resetLocalDatabase();
  await deleteMasterKey();
  await resetEccKeyPair();
}

type PlainNotePayload = {
  title: string;
  body: string;
};

export async function encryptNoteContent(
  title: string,
  body: string,
  noteId = "unknown",
) {
  const start = nowMs();

  const masterKey = getSessionMasterKey();
  const noteAesKey = await getRandomBytes(32);

  const payload = {
    title,
    body,
  };

  const payloadString = JSON.stringify(payload);
  const payloadBytes = utf8ToBytes(payloadString);

  const encryptedNote = await encryptBytesWithAesGcm(payloadBytes, noteAesKey);
  const encryptedNoteKey = await encryptBytesWithAesGcm(noteAesKey, masterKey);

  const end = nowMs();

  addRealUsageBenchmarkMetric({
    noteId,
    operation: "encrypt",
    algorithm: "MASTER_KEY_AES_GCM",
    durationMs: end - start,
    payloadChars: payloadString.length,
    payloadSizeBytes: payloadBytes.length,
    ciphertextSizeBytes: base64SizeBytes(encryptedNote.ciphertext),
    encryptedKeySizeBytes: base64SizeBytes(encryptedNoteKey.ciphertext),
  });

  return {
    encryptedTitle: encryptedNote.ciphertext,
    encryptedBody: "",
    titleIv: encryptedNote.iv,
    bodyIv: null,
    titleAuthTag: null,
    bodyAuthTag: null,
    keyIv: encryptedNoteKey.iv,
    encryptedNoteKey: encryptedNoteKey.ciphertext,
    ephemeralPublicKey: null,
    cryptoAlgorithm: "MASTER_KEY_AES_GCM",
  };
}

export async function decryptNoteRow(row: EncryptedNoteRow): Promise<Note> {
  const start = nowMs();

  const masterKey = getSessionMasterKey();

  if (!row.titleIv || !row.keyIv || !row.encryptedNoteKey) {
    throw new Error(
      "Metadata enkripsi note tidak lengkap. Note ini kemungkinan dibuat sebelum mode MasterKey+AES aktif. Reset vault/database lalu buat note baru.",
    );
  }

  const noteAesKey = decryptBytesWithAesGcm(
    {
      ciphertext: row.encryptedNoteKey,
      iv: row.keyIv,
    },
    masterKey,
  );

  const payloadBytes = decryptBytesWithAesGcm(
    {
      ciphertext: row.encryptedTitle,
      iv: row.titleIv,
    },
    noteAesKey,
  );

  const payloadText = bytesToUtf8(payloadBytes);
  const payload = JSON.parse(payloadText) as PlainNotePayload;

  const end = nowMs();

  addRealUsageBenchmarkMetric({
    noteId: row.id,
    operation: "decrypt",
    algorithm: "MASTER_KEY_AES_GCM",
    durationMs: end - start,
    payloadChars: payloadText.length,
    payloadSizeBytes: payloadBytes.length,
    ciphertextSizeBytes: base64SizeBytes(row.encryptedTitle),
    encryptedKeySizeBytes: base64SizeBytes(row.encryptedNoteKey),
  });

  return {
    id: row.id,
    title: payload.title,
    body: payload.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    pinned: row.pinned === 1,
  };
}
