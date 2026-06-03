import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NoteCard } from "../components/NoteCard";
import { initDatabase } from "../services/db/database";
import { createEmptyNote, getAllNotes } from "../services/db/notesRepository";
import { hasSessionMasterKey } from "../services/secureStore/keyStore";
import type { Note } from "../types/note";

export default function HomeScreen() {
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);

  async function loadNotes() {
    try {
      setLoading(true);

      await initDatabase();

      const unlocked = hasSessionMasterKey();
      setVaultUnlocked(unlocked);

      if (!unlocked) {
        console.log("Vault locked. Notes not decrypted.");
        setNotes([]);
        return;
      }

      const result = await getAllNotes();
      setNotes(result);
    } catch (error) {
      console.error("HOME LOAD ERROR:", error);
      Alert.alert("Load Failed", String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateNote() {
    try {
      await initDatabase();

      if (!hasSessionMasterKey()) {
        router.push("/unlock");
        return;
      }

      const note = await createEmptyNote();
      router.push(`/note/${note.id}`);
    } catch (error) {
      console.error("CREATE NOTE ERROR:", error);
      Alert.alert("Create Note Failed", String(error));
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, []),
  );

  function renderContent() {
    if (!vaultUnlocked) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Vault Locked</Text>
          <Text style={styles.emptyText}>
            Masukkan master key untuk membuka dan decrypt notes.
          </Text>

          <Pressable
            style={styles.unlockButton}
            onPress={() => router.push("/unlock")}
          >
            <Text style={styles.unlockButtonText}>Unlock Vault</Text>
          </Pressable>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      );
    }

    if (notes.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No Notes Yet</Text>
          <Text style={styles.emptyText}>Tap + to create your first note.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={() => router.push(`/note/${item.id}`)}
          />
        )}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Secure Notes</Text>

        <Pressable style={styles.addButton} onPress={handleCreateNote}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.menuRow}>
        <Pressable onPress={() => router.push("/benchmark")}>
          <Text style={styles.menuLink}>Benchmark</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/settings")}>
          <Text style={styles.menuLink}>Settings</Text>
        </Pressable>
      </View>

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  header: {
    marginTop: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFD60A",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 30,
    fontWeight: "600",
    color: "#111",
    marginTop: -2,
  },
  menuRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  menuLink: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
    marginRight: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#999",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 15,
    color: "#777",
    textAlign: "center",
    marginBottom: 16,
  },
  unlockButton: {
    backgroundColor: "#111",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  unlockButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
