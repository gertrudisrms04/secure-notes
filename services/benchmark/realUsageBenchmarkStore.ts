import { createId } from "../../utils/id";
import { nowIso } from "../../utils/date";

export type RealUsageBenchmarkMetric = {
  id: string;
  noteId: string;
  operation: "encrypt" | "decrypt";
  algorithm: "MASTER_KEY_AES_GCM";
  durationMs: number;
  payloadChars: number;
  payloadSizeBytes: number;
  ciphertextSizeBytes?: number;
  encryptedKeySizeBytes?: number;
  createdAt: string;
};

let metrics: RealUsageBenchmarkMetric[] = [];

export function addRealUsageBenchmarkMetric(
  metric: Omit<RealUsageBenchmarkMetric, "id" | "createdAt">,
): void {
  metrics = [
    {
      id: createId(),
      createdAt: nowIso(),
      ...metric,
    },
    ...metrics,
  ].slice(0, 50);
}

export function getRealUsageBenchmarkMetrics(): RealUsageBenchmarkMetric[] {
  return metrics;
}

export function clearRealUsageBenchmarkMetrics(): void {
  metrics = [];
}
