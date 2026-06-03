import { encryptNote, decryptNote } from "./crypto";

export type BenchmarkResult = {
  method: "AES-GCM";
  noteSize: number;

  encryptTimeMs: number;
  decryptTimeMs: number;
  totalTimeMs: number;

  encryptedPayloadSizeBytes: number;
  ciphertextSizeBytes: number;
  encryptedNoteKeySizeBytes: number;

  memoryBeforeMB: number | null;
  memoryAfterEncryptMB: number | null;
  memoryAfterDecryptMB: number | null;
  memoryDeltaEncryptMB: number | null;
  memoryDeltaTotalMB: number | null;
};

function generateNoteBody(size: number): string {
  return "A".repeat(size);
}

function now(): number {
  return performance.now();
}

function getObjectSizeBytes(obj: unknown): number {
  return new TextEncoder().encode(JSON.stringify(obj)).length;
}

function getBase64SizeBytes(base64: string): number {
  return Math.ceil((base64.length * 3) / 4);
}

function getMemoryMB(): number | null {
  const performanceWithMemory = performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
    };
  };

  if (!performanceWithMemory.memory) {
    return null;
  }

  return Number(
    (performanceWithMemory.memory.usedJSHeapSize / 1024 / 1024).toFixed(4),
  );
}

function countMemoryDelta(
  before: number | null,
  after: number | null,
): number | null {
  if (before === null || after === null) {
    return null;
  }

  return Number((after - before).toFixed(4));
}

async function benchmarkAESGCM(noteSize: number): Promise<BenchmarkResult> {
  const title = `AES-GCM-${noteSize}`;
  const body = generateNoteBody(noteSize);

  const memoryBefore = getMemoryMB();

  const encryptStart = now();
  const encrypted = await encryptNote(title, body);
  const encryptEnd = now();

  const memoryAfterEncrypt = getMemoryMB();

  const decryptStart = now();
  await decryptNote(encrypted);
  const decryptEnd = now();

  const memoryAfterDecrypt = getMemoryMB();

  return {
    method: "AES-GCM",
    noteSize,

    encryptTimeMs: Number((encryptEnd - encryptStart).toFixed(3)),
    decryptTimeMs: Number((decryptEnd - decryptStart).toFixed(3)),
    totalTimeMs: Number((decryptEnd - encryptStart).toFixed(3)),

    encryptedPayloadSizeBytes: getObjectSizeBytes(encrypted),
    ciphertextSizeBytes: getBase64SizeBytes(encrypted.ciphertext),
    encryptedNoteKeySizeBytes: 0,

    memoryBeforeMB: memoryBefore,
    memoryAfterEncryptMB: memoryAfterEncrypt,
    memoryAfterDecryptMB: memoryAfterDecrypt,
    memoryDeltaEncryptMB: countMemoryDelta(memoryBefore, memoryAfterEncrypt),
    memoryDeltaTotalMB: countMemoryDelta(memoryBefore, memoryAfterDecrypt),
  };
}

export async function runCryptoBenchmark(): Promise<BenchmarkResult[]> {
  const noteSizes = [100, 1000, 10000];
  const results: BenchmarkResult[] = [];

  for (const size of noteSizes) {
    results.push(await benchmarkAESGCM(size));
  }

  console.table(results);
  return results;
}
