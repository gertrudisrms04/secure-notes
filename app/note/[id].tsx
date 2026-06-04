import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  hasSessionMasterKey,
  lockVault,
} from "../../services/secureStore/keyStore";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  getNoteById,
  updateNoteContent,
} from "../../services/db/notesRepository";

export default function NoteEditorScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const noteId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [masterKeyReady, setMasterKeyReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadNote() {
      const keyReady = hasSessionMasterKey();

      if (!keyReady) {
        router.replace("/unlock");
        return;
      }

      setMasterKeyReady(true);

      const note = await getNoteById(noteId);

      try {
        setLoading(true);

        const keyReady = hasSessionMasterKey();

        if (!keyReady) {
          router.replace("/unlock");
          return;
        }

        setMasterKeyReady(true);

        const note = await getNoteById(noteId);

        if (note) {
          setTitle(note.title);
          setBody(note.body);
        }

        hasLoadedRef.current = true;
      } catch (error) {
        console.error("Failed to load note:", error);
        Alert.alert("Load Failed", String(error));
      } finally {
        setLoading(false);
      }
    }

    loadNote();

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }

      lockVault();
    };
  }, [noteId]);

  function scheduleSave(nextTitle: string, nextBody: string) {
    if (!masterKeyReady) {
      console.log("Master key not ready, cannot save");
      return;
    }

    if (!masterKeyReady) {
      console.log("Master key not ready, cannot save");
      return;
    }

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(async () => {
      try {
        setSaving(true);

        await updateNoteContent(noteId, nextTitle, nextBody);

        console.log("Note saved successfully");
      } catch (error) {
        console.error("Failed to save note:", error);
        Alert.alert("Save Failed", String(error));
      } finally {
        setSaving(false);
      }
    }, 500);
  }

  function handleChangeTitle(value: string) {
    setTitle(value);
    scheduleSave(value, body);
  }

  function handleChangeBody(value: string) {
    setBody(value);
    scheduleSave(title, value);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Preparing vault...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.label}>Note ID: {noteId}</Text>
        <Text style={styles.status}>
          {saving
            ? "Saving..."
            : masterKeyReady
              ? "Vault Ready"
              : "Preparing Vault..."}
        </Text>
      </View>

      <TextInput
        placeholder="Title"
        value={title}
        onChangeText={handleChangeTitle}
        editable={masterKeyReady}
        style={[styles.titleInput, !masterKeyReady && styles.inputDisabled]}
      />

      <TextInput
        placeholder="Write something..."
        value={body}
        onChangeText={handleChangeBody}
        editable={masterKeyReady}
        style={[styles.bodyInput, !masterKeyReady && styles.inputDisabled]}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#999",
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: "#999",
  },
  status: {
    fontSize: 12,
    color: "#999",
  },
  titleInput: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
  },
  bodyInput: {
    flex: 1,
    fontSize: 17,
    lineHeight: 24,
  },
  inputDisabled: {
    opacity: 0.5,
  },
});
