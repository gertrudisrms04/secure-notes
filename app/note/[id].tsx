import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import {
  getNoteById,
  updateNoteContent,
} from "../../services/db/notesRepository";

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    async function loadNote() {
      if (!id) return;

      const note = await getNoteById(id);

      if (note) {
        setTitle(note.title);
        setBody(note.body);
      }
    }

    loadNote();
  }, [id]);

  async function handleChangeTitle(text: string) {
    setTitle(text);

    if (!id) return;
    await updateNoteContent(id, text, body);
  }

  async function handleChangeBody(text: string) {
    setBody(text);

    if (!id) return;
    await updateNoteContent(id, title, text);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Note ID: {id}</Text>

      <TextInput
        placeholder="Title"
        value={title}
        onChangeText={handleChangeTitle}
        style={styles.titleInput}
      />

      <TextInput
        placeholder="Write something..."
        value={body}
        onChangeText={handleChangeBody}
        style={styles.bodyInput}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 12,
    color: "#999",
    marginBottom: 12,
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
});
