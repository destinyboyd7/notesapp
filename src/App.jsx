import { useState, useEffect } from "react";
import {
  Authenticator,
  Button,
  Text,
  TextField,
  Heading,
  Flex,
  View,
  Grid,
  Divider,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import { generateClient } from "aws-amplify/data";
import { uploadData, getUrl } from "aws-amplify/storage";
import outputs from "../amplify_outputs.json";

/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */
Amplify.configure(outputs);

const client = generateClient({ authMode: "userPool" });

export default function App() {
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [imageFile, setImageFile] = useState(null);

  // Fetch notes on load
  useEffect(() => {
    fetchNotes();
  }, []);

  // Fetch all notes
  async function fetchNotes() {
    try {
      const { data, errors } = await client.models.Notes.list();
      if (errors) {
        console.error("Fetch errors:", errors);
        return;
      }

      // If a note has an image, get its signed URL
      const notesWithUrls = await Promise.all(
        data.map(async (note) => {
          if (note.image) {
            const urlResult = await getUrl({ path: note.image });
            return { ...note, imageUrl: urlResult.url.toString() };
          }
          return note;
        })
      );

      setNotes(notesWithUrls);
    } catch (err) {
      console.error("Error fetching notes:", err);
    }
  }

  // Create a new note
  async function createNote(e) {
    e.preventDefault();
    if (!noteText) return;

    let imagePath = null;

    // Upload image if provided
    if (imageFile) {
      imagePath = `images/${Date.now()}-${imageFile.name}`;
      await uploadData({
        path: imagePath,
        data: imageFile,
      }).result;
    }

    try {
      await client.models.Notes.create({
        content: noteText,
        image: imagePath,
      });
      setNoteText("");
      setImageFile(null);
      fetchNotes();
    } catch (err) {
      console.error("Error creating note:", err);
    }
  }

  // Delete a note
  async function deleteNote(id) {
    try {
      await client.models.Notes.delete({ id });
      fetchNotes();
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <View className="App" padding="2rem">
          <Flex justifyContent="space-between" alignItems="center" marginBottom="1rem">
            <Heading level={3}>My Notes</Heading>
            <Button onClick={signOut}>Sign out</Button>
          </Flex>

          <form onSubmit={createNote}>
            <Flex direction="row" gap="0.5rem" marginBottom="1rem">
              <TextField
                placeholder="Write a note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
              />
              <Button type="submit" variation="primary">
                Add Note
              </Button>
            </Flex>
          </form>

          <Divider marginBottom="1rem" />

          <Grid templateColumns="repeat(auto-fill, minmax(250px, 1fr))" gap="1rem">
            {notes.map((note) => (
              <Flex
                key={note.id}
                direction="column"
                padding="1rem"
                border="1px solid #ccc"
                borderRadius="8px"
              >
                <Text>{note.content}</Text>
                {note.imageUrl && (
                  <img
                    src={note.imageUrl}
                    alt="note"
                    style={{ marginTop: "0.5rem", maxHeight: "150px", objectFit: "cover" }}
                  />
                )}
                <Button
                  size="small"
                  variation="destructive"
                  marginTop="0.5rem"
                  onClick={() => deleteNote(note.id)}
                >
                  Delete
                </Button>
              </Flex>
            ))}
          </Grid>
        </View>
      )}
    </Authenticator>
  );
}
