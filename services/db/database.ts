import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("secure_notes.db");
  }

  return dbPromise;
}

async function addColumnIfNotExists(
  tableName: string,
  columnName: string,
  columnType: string,
): Promise<void> {
  const db = await getDatabase();

  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName});`,
  );

  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    await db.execAsync(`
      ALTER TABLE ${tableName}
      ADD COLUMN ${columnName} ${columnType};
    `);
  }
}

async function runInitDatabase(): Promise<void> {
  console.log("DB 1: opening database");
  const db = await getDatabase();

  console.log("DB 2: creating table");
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      encryptedTitle TEXT NOT NULL,
      encryptedBody TEXT NOT NULL,
      titleIv TEXT,
      bodyIv TEXT,
      titleAuthTag TEXT,
      bodyAuthTag TEXT,
      keyIv TEXT,
      encryptedNoteKey TEXT,
      ephemeralPublicKey TEXT,
      cryptoAlgorithm TEXT DEFAULT 'DEV_SAFE_MODE',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0
    );
  `);

  console.log("DB 3: checking migrations");
  await addColumnIfNotExists("notes", "keyIv", "TEXT");
  await addColumnIfNotExists("notes", "encryptedNoteKey", "TEXT");
  await addColumnIfNotExists("notes", "ephemeralPublicKey", "TEXT");
  await addColumnIfNotExists(
    "notes",
    "cryptoAlgorithm",
    "TEXT DEFAULT 'DEV_SAFE_MODE'",
  );

  console.log("DB 4: init done");
}

export async function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = runInitDatabase();
  }

  return initPromise;
}

export async function resetLocalDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    DROP TABLE IF EXISTS notes;
  `);

  initPromise = null;
  await initDatabase();
}
