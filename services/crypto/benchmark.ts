export type BenchmarkAlgorithm = "AES+ECC" | "AES+RSA";

export type BenchmarkResult = {
  id: string;
  algorithm: BenchmarkAlgorithm;

  iterations: number;

  averageEncryptionTimeMs: number;
  averageDecryptionTimeMs: number;
  averageTotalTimeMs: number;

  payloadSizeBytes: number;
  ciphertextSizeBytes: number;
  encryptedKeySizeBytes: number;

  createdAt: string;
};
