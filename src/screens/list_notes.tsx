import { ActionPanel, Action, List } from "@raycast/api";
// import { useCachedState } from "@raycast/utils";
import { GoogleDoc } from "../google_fns";
import { getOriginalNoteName } from "../util";
import { useState } from "react";

export function ListNotes(props: {currentDoc: GoogleDoc, defaultDoc: GoogleDoc, notes: Array<GoogleDoc>, onDefaultDocChange: (doc: GoogleDoc) => void, onCurrentDocChange: (doc: GoogleDoc) => void }) {
  const [myNotes] = useState<Array<GoogleDoc>>(props.notes);
  const [defaultDoc, setDefaultDoc] = useState<GoogleDoc>(props.defaultDoc);
  const [currentDoc, setCurrentDoc] = useState<GoogleDoc>(props.currentDoc);

  const { onDefaultDocChange, onCurrentDocChange } = props;
  
  function NoteListItemActions(props: { file: GoogleDoc }) {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Set as">
          <Action
            title="Set as Current"
            onAction={() => {
              onCurrentDocChange(props.file);
              setCurrentDoc(props.file);
            }}
          />
          <Action
            title="Set as Default"
            onAction={() => {
              onDefaultDocChange(props.file);
              setDefaultDoc(props.file);
            }}
          />
        </ActionPanel.Section>
        <Action.OpenInBrowser
          url={"https://docs.google.com/document/d/" + props.file.id}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <Action.CopyToClipboard
          title="Copy URL"
          content={props.file.name}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
      </ActionPanel>
    );
  }

  function getListItemTitle(file: GoogleDoc) {
    return (
      getOriginalNoteName(file.name) +
      (file.name === currentDoc?.name ? " (Current)" : "") +
      (file.name === defaultDoc?.name ? " (Default)" : "")
    );
  }

  return (
    <List>
      {myNotes?.map((file) => (
        <List.Item
          key={file.id}
          title={getListItemTitle(file)}
          actions={<NoteListItemActions file={file} />}
          accessories={[{ text: `Last modified: ${file.modifiedTime}` }]}
        />
      ))}
    </List>
  );
}
