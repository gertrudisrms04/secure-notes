import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { resetLocalVault } from "../services/crypto/cryptoService";
import {
  exportEccPublicKeyToClipboard,
  generateEccKeyPair,
  getEccPublicKey,
} from "../services/crypto/eccKeyService";
import { hasSessionMasterKey } from "../services/secureStore/keyStore";

export default function SettingsScreen() {
  const router = useRouter();

  const [eccPublicKey, setEccPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadEccPublicKey() {
    const publicKey = await getEccPublicKey();
    setEccPublicKey(publicKey);
  }

  useEffect(() => {
    loadEccPublicKey();
  }, []);

  async function handleGenerateEccKeyPair() {
    try {
      if (!hasSessionMasterKey()) {
        Alert.alert(
          "Vault Locked",
          "Masukkan master key terlebih dahulu sebelum generate ECC key pair.",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Unlock",
              onPress: () => router.push("/unlock"),
            },
          ],
        );
        return;
      }

      setLoading(true);

      const result = await generateEccKeyPair();

      setEccPublicKey(result.publicKey);

      Alert.alert("Success", "ECC key pair berhasil dibuat.");
    } catch (error) {
      console.error("Generate ECC failed:", error);
      Alert.alert("Generate ECC Failed", String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPublicKey() {
    try {
      const publicKey = await exportEccPublicKeyToClipboard();

      Alert.alert(
        "Public Key Copied",
        `ECC public key berhasil dicopy ke clipboard.\n\n${publicKey.slice(
          0,
          32,
        )}...`,
      );
    } catch (error) {
      console.error("Export public key failed:", error);
      Alert.alert("Export Failed", String(error));
    }
  }

  async function handleResetVault() {
    Alert.alert(
      "Reset Local Vault",
      "Semua notes lokal, master key check, dan ECC key pair akan dihapus. Lanjutkan?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await resetLocalVault();

              setEccPublicKey(null);

              Alert.alert("Success", "Local vault berhasil direset.");
              router.replace("/");
            } catch (error) {
              console.error("Failed to reset vault:", error);
              Alert.alert("Reset Failed", String(error));
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Crypto Keys</Text>

        <Pressable
          style={styles.item}
          onPress={handleGenerateEccKeyPair}
          disabled={loading}
        >
          <Text style={styles.itemText}>Generate ECC Key Pair</Text>
          <Text style={styles.itemHint}>
            {eccPublicKey
              ? "ECC public key already generated"
              : "Requires unlocked vault"}
          </Text>
        </Pressable>

        <Pressable style={styles.item} onPress={handleExportPublicKey}>
          <Text style={styles.itemText}>Export Public Key</Text>
          <Text style={styles.itemHint}>
            {eccPublicKey
              ? `${eccPublicKey.slice(0, 28)}...`
              : "Generate ECC key pair first"}
          </Text>
        </Pressable>

        <Pressable style={styles.item}>
          <Text style={styles.itemText}>Generate RSA Key Pair</Text>
          <Text style={styles.itemHint}>Benchmark only</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>

        <Pressable style={styles.dangerButton} onPress={handleResetVault}>
          <Text style={styles.dangerButtonText}>Reset Local Vault</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    color: "#999",
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  item: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  itemText: {
    fontSize: 17,
    fontWeight: "600",
  },
  itemHint: {
    marginTop: 4,
    fontSize: 13,
    color: "#999",
  },
  dangerButton: {
    marginTop: 8,
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  dangerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
