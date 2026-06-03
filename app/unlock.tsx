import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  hasMasterKeySetup,
  unlockMasterKey,
} from "../services/secureStore/keyStore";

export default function UnlockScreen() {
  const router = useRouter();

  const [masterKey, setMasterKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSetup, setIsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkSetup() {
      const setup = await hasMasterKeySetup();
      setIsSetup(setup);
    }

    checkSetup();
  }, []);

  async function handleUnlock() {
    try {
      setLoading(true);

      await unlockMasterKey(masterKey);

      router.replace("/");
    } catch (error) {
      Alert.alert("Vault Error", String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isSetup ? "Unlock Vault" : "Create Master Key"}
      </Text>

      <Text style={styles.subtitle}>
        {isSetup
          ? "Masukkan master key untuk membuka notes."
          : "Buat master key pertama untuk mengenkripsi notes lokal."}
      </Text>

      <TextInput
        placeholder="Master key"
        value={masterKey}
        onChangeText={setMasterKey}
        secureTextEntry
        autoCapitalize="none"
        style={styles.input}
      />

      <Pressable
        style={styles.button}
        onPress={handleUnlock}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Processing..." : isSetup ? "Unlock" : "Create Vault"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#111",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});
