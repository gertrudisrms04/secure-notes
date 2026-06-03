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
import {
  createEmptyNote,
  deleteNote,
  getAllNotes,
} from "../services/db/notesRepository";
import type { Note } from "../types/note";

export default function HomeScreen() {
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotes() {
    try {
      setLoading(true);
      await initDatabase();

      const notes = await getAllNotes();
      setNotes(notes);
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateNote() {
    try {
      const note = await createEmptyNote();

      setNotes((currentNotes) => [note, ...currentNotes]);

      router.push({
        pathname: "/note/[id]",
        params: { id: note.id },
      });
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  }

  function handleDeleteNote(id: string) {
    Alert.alert("Hapus note?", "Note ini akan dihapus permanen.", [
      {
        text: "Batal",
        style: "cancel",
      },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNote(id);

            setNotes((currentNotes) =>
              currentNotes.filter((note) => note.id !== id),
            );
          } catch (error) {
            console.error("Failed to delete note:", error);
          }
        },
      },
    ]);
  }

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
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

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notes.length === 0 ? styles.empty : undefined}
        ListEmptyComponent={
          <View>
            <Text style={styles.emptyTitle}>Belum ada note</Text>
            <Text style={styles.emptyText}>
              Tekan tombol + untuk membuat note.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.noteRow}>
            <Pressable
              style={styles.noteCardButton}
              onPress={() =>
                router.push({
                  pathname: "/note/[id]",
                  params: { id: item.id },
                })
              }
            >
              <NoteCard note={item} />
            </Pressable>

            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDeleteNote(item.id)}
            >
              <Text style={styles.deleteButtonText}>Hapus</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#121212",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121212",
  },
  header: {
    marginTop: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#FFFFFF",
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
    fontSize: 24,
    color: "#121212",
    fontWeight: "700",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  noteCardButton: {
    flex: 1,
  },
  noteContent: {
    flex: 1,
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#3A1F1F",
  },
  deleteButtonText: {
    color: "#FF6B6B",
    fontWeight: "700",
  },
  empty: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
    color: "#FFFFFF",
  },
  emptyText: {
    fontSize: 15,
    color: "#777",
  },
});
