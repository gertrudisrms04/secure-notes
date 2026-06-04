import { Platform } from "react-native";

type DatabaseRunResult = {
  changes: number;
};

type DatabaseLike = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, params?: unknown[]) => Promise<DatabaseRunResult>;
  getAllAsync: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
  getFirstAsync: <T>(sql: string, params?: unknown[]) => Promise<T | null>;
};

let dbPromise: Promise<DatabaseLike> | null = null;
let initPromise: Promise<void> | null = null;

const webRows: Record<string, unknown>[] = [];

function createWebDatabase(): DatabaseLike {
  return {
    async execAsync() {
      return;
    },

    async runAsync(sql: string, params: unknown[] = []) {
      const normalizedSql = sql.trim().toUpperCase();

      if (normalizedSql.startsWith("INSERT INTO NOTES")) {
        webRows.push({
          id: params[0],
          encryptedTitle: params[1],
          encryptedBody: params[2],
          titleIv: params[3],
          bodyIv: params[4],
          titleAuthTag: params[5],
          bodyAuthTag: params[6],
          keyIv: params[7],
          encryptedNoteKey: params[8],
          ephemeralPublicKey: params[9],
          cryptoAlgorithm: params[10],
          createdAt: params[11],
          updatedAt: params[12],
          pinned: params[13],
        });

        return { changes: 1 };
      }

      if (normalizedSql.startsWith("UPDATE NOTES")) {
        const id = params[11];
        const row = webRows.find((item) => item.id === id);

        if (!row) return { changes: 0 };

        row.encryptedTitle = params[0];
        row.encryptedBody = params[1];
        row.titleIv = params[2];
        row.bodyIv = params[3];
        row.titleAuthTag = params[4];
        row.bodyAuthTag = params[5];
        row.keyIv = params[6];
        row.encryptedNoteKey = params[7];
        row.ephemeralPublicKey = params[8];
        row.cryptoAlgorithm = params[9];
        row.updatedAt = params[10];

        return { changes: 1 };
      }

      if (normalizedSql.startsWith("DELETE FROM NOTES")) {
        const id = params[0];
        const index = webRows.findIndex((item) => item.id === id);

        if (index >= 0) {
          webRows.splice(index, 1);
          return { changes: 1 };
        }

        return { changes: 0 };
      }

      return { changes: 0 };
    },

    async getAllAsync<T>() {
      return [...webRows].sort((a, b) => {
        const pinnedA = Number(a.pinned ?? 0);
        const pinnedB = Number(b.pinned ?? 0);

        if (pinnedB !== pinnedA) {
          return pinnedB - pinnedA;
        }

        return String(b.updatedAt ?? "").localeCompare(
          String(a.updatedAt ?? ""),
        );
      }) as T[];
    },

    async getFirstAsync<T>(_sql: string, params: unknown[] = []) {
      const id = params[0];

      return (webRows.find((item) => item.id === id) ?? null) as T | null;
    },
  };
}

export async function getDatabase(): Promise<DatabaseLike> {
  if (!dbPromise) {
    if (Platform.OS === "web") {
      dbPromise = Promise.resolve(createWebDatabase());
    } else {
      dbPromise = import("expo-sqlite").then(async (SQLite) => {
        const nativeDb = await SQLite.openDatabaseAsync("secure_notes.db");

        return nativeDb as unknown as DatabaseLike;
      });
    }
  }

  return dbPromise;
}

async function runInitDatabase(): Promise<void> {
  const db = await getDatabase();

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
      cryptoAlgorithm TEXT DEFAULT 'AES+ECC',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export async function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = runInitDatabase();
  }

  return initPromise;
}

export async function resetLocalDatabase(): Promise<void> {
  if (Platform.OS === "web") {
    webRows.splice(0, webRows.length);

    initPromise = null;
    await initDatabase();

    return;
  }

  const db = await getDatabase();

  await db.execAsync(`
    DROP TABLE IF EXISTS notes;
  `);

  initPromise = null;
  await initDatabase();
}
