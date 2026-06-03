import { getDatabase } from "./database";
import { createId } from "../../utils/id";
import { nowIso } from "../../utils/date";
import type { EncryptedNoteRow, Note } from "../../types/note";
import { decryptNoteRow, encryptNoteContent } from "../crypto/cryptoService";
import { getSessionMasterKey } from "../secureStore/keyStore";

export async function getAllNotes(): Promise<Note[]> {
  // Wajib sudah unlock.
  getSessionMasterKey();

  const db = await getDatabase();

  const rows = await db.getAllAsync<EncryptedNoteRow>(`
    SELECT *
    FROM notes
    ORDER BY pinned DESC, updatedAt DESC;
  `);

  const notes: Note[] = [];

  for (const row of rows) {
    try {
      const note = await decryptNoteRow(row);
      notes.push(note);
    } catch (error) {
      console.error("Failed to decrypt note:", row.id, error);
    }
  }

  return notes;
}

export async function getNoteById(id: string): Promise<Note | null> {
  getSessionMasterKey();

  const db = await getDatabase();

  const row = await db.getFirstAsync<EncryptedNoteRow>(
    `
    SELECT *
    FROM notes
    WHERE id = ?;
    `,
    [id],
  );

  if (!row) return null;

  return decryptNoteRow(row);
}

export async function createEmptyNote(): Promise<Note> {
  getSessionMasterKey();

  const db = await getDatabase();

  const id = createId();
  const createdAt = nowIso();

  const encrypted = await encryptNoteContent("", "", id);
  await db.runAsync(
    `
    INSERT INTO notes (
      id,
      encryptedTitle,
      encryptedBody,
      titleIv,
      bodyIv,
      titleAuthTag,
      bodyAuthTag,
      keyIv,
      encryptedNoteKey,
      ephemeralPublicKey,
      cryptoAlgorithm,
      createdAt,
      updatedAt,
      pinned
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      encrypted.encryptedTitle,
      encrypted.encryptedBody,
      encrypted.titleIv,
      encrypted.bodyIv,
      encrypted.titleAuthTag,
      encrypted.bodyAuthTag,
      encrypted.keyIv,
      encrypted.encryptedNoteKey,
      encrypted.ephemeralPublicKey,
      encrypted.cryptoAlgorithm,
      createdAt,
      createdAt,
      0,
    ],
  );

  return {
    id,
    title: "",
    body: "",
    createdAt,
    updatedAt: createdAt,
    pinned: false,
  };
}

export async function updateNoteContent(
  id: string,
  title: string,
  body: string,
): Promise<void> {
  getSessionMasterKey();

  const db = await getDatabase();

  const encrypted = await encryptNoteContent(title, body, id);
  const updatedAt = nowIso();

  const result = await db.runAsync(
    `
    UPDATE notes
    SET encryptedTitle = ?,
        encryptedBody = ?,
        titleIv = ?,
        bodyIv = ?,
        titleAuthTag = ?,
        bodyAuthTag = ?,
        keyIv = ?,
        encryptedNoteKey = ?,
        ephemeralPublicKey = ?,
        cryptoAlgorithm = ?,
        updatedAt = ?
    WHERE id = ?;
    `,
    [
      encrypted.encryptedTitle,
      encrypted.encryptedBody,
      encrypted.titleIv,
      encrypted.bodyIv,
      encrypted.titleAuthTag,
      encrypted.bodyAuthTag,
      encrypted.keyIv,
      encrypted.encryptedNoteKey,
      encrypted.ephemeralPublicKey,
      encrypted.cryptoAlgorithm,
      updatedAt,
      id,
    ],
  );

  console.log("UPDATE note changes:", result.changes);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    DELETE FROM notes
    WHERE id = ?;
    `,
    [id],
  );
}

export async function togglePinned(id: string, pinned: boolean): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE notes
    SET pinned = ?,
        updatedAt = ?
    WHERE id = ?;
    `,
    [pinned ? 1 : 0, nowIso(), id],
  );
}
