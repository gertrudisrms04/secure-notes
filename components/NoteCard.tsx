import { StyleSheet, Text, View } from "react-native";
import type { Note } from "../types/note";

type NoteCardProps = {
  note: Note;
};

export function NoteCard({ note }: NoteCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{note.title.trim() || "Untitled"}</Text>

      <Text style={styles.body} numberOfLines={2}>
        {note.body.trim() || "No description"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#1E1E1E",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: "#AAAAAA",
  },

  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
    gap: 10,
  },
  noteCardButton: {
    flex: 1,
  },
  deleteButton: {
    minWidth: 72,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#B91C1C",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
