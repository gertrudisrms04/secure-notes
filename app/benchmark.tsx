import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BenchmarkResult } from "../services/crypto/benchmark";
import {
  runAesEccBenchmark,
  runAesRsaBenchmark,
} from "../services/crypto/benchmarkCryptoService";

export default function BenchmarkScreen() {
  const [running, setRunning] = useState(false);
  const [aesEccResult, setAesEccResult] = useState<BenchmarkResult | null>(
    null,
  );
  const [aesRsaResult, setAesRsaResult] = useState<BenchmarkResult | null>(
    null,
  );

  async function handleRunBenchmark() {
    try {
      setRunning(true);

      const eccResult = await runAesEccBenchmark();
      const rsaResult = await runAesRsaBenchmark();

      setAesEccResult(eccResult);
      setAesRsaResult(rsaResult);
    } catch (error) {
      console.error("Benchmark failed:", error);
      Alert.alert("Benchmark Failed", String(error));
    } finally {
      setRunning(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Crypto Benchmark</Text>

      <Text style={styles.subtitle}>
        Pengukuran performa encrypt dan decrypt pada AES-ECC dan AES-RSA.
      </Text>

      <Pressable
        style={[styles.runButton, running && styles.disabledButton]}
        onPress={handleRunBenchmark}
        disabled={running}
      >
        {running ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.runButtonText}>Run Benchmark</Text>
        )}
      </Pressable>

      {aesEccResult ? (
        <BenchmarkTable title="AES-ECC Performance" result={aesEccResult} />
      ) : (
        <EmptyTable title="AES-ECC Performance" />
      )}

      {aesRsaResult ? (
        <BenchmarkTable title="AES-RSA Performance" result={aesRsaResult} />
      ) : (
        <EmptyTable title="AES-RSA Performance" />
      )}
    </ScrollView>
  );
}

function BenchmarkTable({
  title,
  result,
}: {
  title: string;
  result: BenchmarkResult;
}) {
  return (
    <View style={styles.tableCard}>
      <Text style={styles.tableTitle}>{title}</Text>

      <TableRow
        label="Avg Encrypt"
        value={`${result.averageEncryptionTimeMs.toFixed(3)} ms`}
      />

      <TableRow
        label="Avg Decrypt"
        value={`${result.averageDecryptionTimeMs.toFixed(3)} ms`}
      />

      <TableRow
        label="Avg Total"
        value={`${result.averageTotalTimeMs.toFixed(3)} ms`}
      />

      <TableRow
        label="Payload Size"
        value={`${result.payloadSizeBytes} bytes`}
      />

      <TableRow
        label="Ciphertext"
        value={`${result.ciphertextSizeBytes} bytes`}
      />

      <TableRow
        label="Encrypted Key"
        value={`${result.encryptedKeySizeBytes} bytes`}
      />

      <TableRow label="Runs" value={`${result.iterations}x`} />
    </View>
  );
}

function EmptyTable({ title }: { title: string }) {
  return (
    <View style={styles.tableCard}>
      <Text style={styles.tableTitle}>{title}</Text>
      <Text style={styles.emptyText}>
        Belum ada hasil. Tekan Run Benchmark untuk mengukur performa.
      </Text>
    </View>
  );
}

function TableRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tableRow}>
      <Text style={styles.tableLabel}>{label}</Text>
      <Text style={styles.tableValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#111",
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  runButton: {
    backgroundColor: "#FFD60A",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 22,
  },
  disabledButton: {
    opacity: 0.6,
  },
  runButtonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "900",
  },
  tableCard: {
    backgroundColor: "#252525",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tableTitle: {
    color: "#FFD60A",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 14,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.14)",
  },
  tableLabel: {
    color: "#ddd",
    fontSize: 15,
    fontWeight: "600",
  },
  tableValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "right",
  },
  emptyText: {
    color: "#aaa",
    fontSize: 14,
    lineHeight: 20,
  },
});
