import * as Crypto from "expo-crypto";
import * as forge from "node-forge";
import { p256 } from "@noble/curves/nist.js";

import { createId } from "../../utils/id";
import { nowIso } from "../../utils/date";
import { getRandomBytes } from "../../utils/random";
import { getBenchmarkSampleText } from "../../utils/textSamples";
import { nowMs } from "../../utils/performance";
import {
  base64ToBytes,
  binaryToBytes,
  bytesToBase64,
  bytesToBinary,
  utf8ToBytes,
} from "../../utils/encoding";
import type { BenchmarkResult } from "../../services/crypto/benchmark";
import { decryptBytesWithAesGcm, encryptBytesWithAesGcm } from "./aes";

const BENCHMARK_ITERATIONS = 5;

function base64SizeBytes(value: string): number {
  return base64ToBytes(value).length;
}

async function generateP256KeyPair(): Promise<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}> {
  const curve = p256 as any;

  if (typeof curve.keygen === "function") {
    const keyPair = curve.keygen();

    return {
      privateKey: keyPair.secretKey ?? keyPair.privateKey,
      publicKey: keyPair.publicKey,
    };
  }

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

  throw new Error("Gagal generate P-256 key pair.");
}

async function deriveWrappingKeyFromEcdh(
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

export async function runAesEccBenchmark(): Promise<BenchmarkResult> {
  const sampleText = getBenchmarkSampleText();
  const sampleBytes = utf8ToBytes(sampleText);

  const payloadSizeBytes = sampleBytes.length;

  let totalEncryptionTimeMs = 0;
  let totalDecryptionTimeMs = 0;

  let ciphertextSizeBytes = 0;
  let encryptedKeySizeBytes = 0;

  for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
    const receiverKeyPair = await generateP256KeyPair();
    const ephemeralKeyPair = await generateP256KeyPair();

    const noteAesKey = await getRandomBytes(32);

    const encryptionStart = nowMs();

    const encryptedPayload = await encryptBytesWithAesGcm(
      sampleBytes,
      noteAesKey,
    );

    const wrappingKey = await deriveWrappingKeyFromEcdh(
      ephemeralKeyPair.privateKey,
      receiverKeyPair.publicKey,
    );

    const encryptedNoteKey = await encryptBytesWithAesGcm(
      noteAesKey,
      wrappingKey,
    );

    const encryptionEnd = nowMs();

    totalEncryptionTimeMs += encryptionEnd - encryptionStart;

    ciphertextSizeBytes = base64SizeBytes(encryptedPayload.ciphertext);
    encryptedKeySizeBytes = base64SizeBytes(encryptedNoteKey.ciphertext);

    const decryptionStart = nowMs();

    const unwrapKey = await deriveWrappingKeyFromEcdh(
      receiverKeyPair.privateKey,
      ephemeralKeyPair.publicKey,
    );

    const decryptedNoteAesKey = decryptBytesWithAesGcm(
      {
        ciphertext: encryptedNoteKey.ciphertext,
        iv: encryptedNoteKey.iv,
      },
      unwrapKey,
    );

    decryptBytesWithAesGcm(
      {
        ciphertext: encryptedPayload.ciphertext,
        iv: encryptedPayload.iv,
      },
      decryptedNoteAesKey,
    );

    const decryptionEnd = nowMs();

    totalDecryptionTimeMs += decryptionEnd - decryptionStart;
  }

  const averageEncryptionTimeMs = totalEncryptionTimeMs / BENCHMARK_ITERATIONS;

  const averageDecryptionTimeMs = totalDecryptionTimeMs / BENCHMARK_ITERATIONS;

  return {
    id: createId(),
    algorithm: "AES+ECC",
    iterations: BENCHMARK_ITERATIONS,
    averageEncryptionTimeMs,
    averageDecryptionTimeMs,
    averageTotalTimeMs: averageEncryptionTimeMs + averageDecryptionTimeMs,
    payloadSizeBytes,
    ciphertextSizeBytes,
    encryptedKeySizeBytes,
    createdAt: nowIso(),
  };
}

function generateRsaKeyPair() {
  return forge.pki.rsa.generateKeyPair({
    bits: 2048,
    workers: -1,
  });
}

function rsaEncryptAesKey(
  aesKey: Uint8Array,
  publicKey: forge.pki.rsa.PublicKey,
): string {
  const encryptedBinary = publicKey.encrypt(bytesToBinary(aesKey), "RSA-OAEP", {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha256.create(),
    },
  });

  return bytesToBase64(binaryToBytes(encryptedBinary));
}

function rsaDecryptAesKey(
  encryptedAesKeyBase64: string,
  privateKey: forge.pki.rsa.PrivateKey,
): Uint8Array {
  const encryptedBinary = bytesToBinary(base64ToBytes(encryptedAesKeyBase64));

  const decryptedBinary = privateKey.decrypt(encryptedBinary, "RSA-OAEP", {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha256.create(),
    },
  });

  return binaryToBytes(decryptedBinary);
}

export async function runAesRsaBenchmark(): Promise<BenchmarkResult> {
  const sampleText = getBenchmarkSampleText();
  const sampleBytes = utf8ToBytes(sampleText);

  const payloadSizeBytes = sampleBytes.length;
  const rsaKeyPair = generateRsaKeyPair();

  let totalEncryptionTimeMs = 0;
  let totalDecryptionTimeMs = 0;

  let ciphertextSizeBytes = 0;
  let encryptedKeySizeBytes = 0;

  for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
    const noteAesKey = await getRandomBytes(32);

    const encryptionStart = nowMs();

    const encryptedPayload = await encryptBytesWithAesGcm(
      sampleBytes,
      noteAesKey,
    );

    const encryptedNoteKey = rsaEncryptAesKey(noteAesKey, rsaKeyPair.publicKey);

    const encryptionEnd = nowMs();

    totalEncryptionTimeMs += encryptionEnd - encryptionStart;

    ciphertextSizeBytes = base64SizeBytes(encryptedPayload.ciphertext);
    encryptedKeySizeBytes = base64SizeBytes(encryptedNoteKey);

    const decryptionStart = nowMs();

    const decryptedNoteAesKey = rsaDecryptAesKey(
      encryptedNoteKey,
      rsaKeyPair.privateKey,
    );

    decryptBytesWithAesGcm(
      {
        ciphertext: encryptedPayload.ciphertext,
        iv: encryptedPayload.iv,
      },
      decryptedNoteAesKey,
    );

    const decryptionEnd = nowMs();

    totalDecryptionTimeMs += decryptionEnd - decryptionStart;
  }

  const averageEncryptionTimeMs = totalEncryptionTimeMs / BENCHMARK_ITERATIONS;

  const averageDecryptionTimeMs = totalDecryptionTimeMs / BENCHMARK_ITERATIONS;

  return {
    id: createId(),
    algorithm: "AES+RSA",
    iterations: BENCHMARK_ITERATIONS,
    averageEncryptionTimeMs,
    averageDecryptionTimeMs,
    averageTotalTimeMs: averageEncryptionTimeMs + averageDecryptionTimeMs,
    payloadSizeBytes,
    ciphertextSizeBytes,
    encryptedKeySizeBytes,
    createdAt: nowIso(),
  };
}
