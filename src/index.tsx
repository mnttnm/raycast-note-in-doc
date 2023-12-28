import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { FileSearchOperator, GoogleDoc, addNotesToFile, searchForFileByTitle } from "./google_fns";
import { RAYCAST_SUFFIX, getOriginalNoteName } from "./util";
import { createDocumentWithName } from "./screens/create_new_file";
import { ListNotes } from "./screens/list_notes";
import { ConfigureForm } from "./screens/configure_form";
import { authorize } from "./auth";

interface Values {
  textfield: string;
  noteContent: string;
  checkbox: boolean;
  dropdown: string;
}

const DEFAULT_NOTE_TITLE = "My Raycast Notes";
const CONTENT_ERROR_STRING = "Note can not be empty!";

export default function Command() {
  const [currentDoc, setCurrentDoc] = useCachedState<GoogleDoc>("current-doc");
  const [defaultDoc, setDefaultDoc] = useCachedState<GoogleDoc>("default-doc");
  const [raycastFiles, setRaycastFiles] = useCachedState<Array<GoogleDoc>>("raycast-notes-files", []);
  const [, setIsAuthorized] = useState<boolean>(false);
  const [contentError, setContentError] = useState<string | undefined>();
  const noteContentRef = useRef<Form.TextArea>(null);

  function handleCurrentDocChange(doc: GoogleDoc) {
    console.log("setting current doc");
    setCurrentDoc(doc);
  }

  function handleDefaultDocChange(doc: GoogleDoc) {
    console.log("setting default doc");
    setDefaultDoc(doc);
  }

  function dropContentError() {
    if (contentError && contentError.length > 0) {
      setContentError(undefined);
    }
  }

  function CurrentNoteSelectionAction() {
    return (
      <ActionPanel.Section title="Current File">
        {raycastFiles?.map(
          (file) =>
            file && (
              <Action
                title={`${getOriginalNoteName(file.name)}${file.name === currentDoc?.name ? " (Current)" : ""}`}
                key={file.id}
                onAction={() => setCurrentDoc(file)}
              />
            ),
        )}
      </ActionPanel.Section>
    );
  }

  function ShowMyNotesAction() {
    return (
      <Action.Push
        icon={Icon.List}
        title="My Docs"
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        target={
          <ListNotes
            notes={raycastFiles}
            onCurrentDocChange={handleCurrentDocChange}
            onDefaultDocChange={handleDefaultDocChange}
            currentDoc={currentDoc!}
            defaultDoc={defaultDoc!}
          />
        }
      />
    );
  }

  function ConfigurationAction() {
    return (
      <Action.Push
        icon={Icon.Bookmark}
        title="Change Default Doc"
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        target={<ConfigureForm />}
      />
    );
  }

  async function handleSubmit(values: Values) {
    try {
      if (values.noteContent.trim().length === 0) {
        setContentError(CONTENT_ERROR_STRING);
      } else {
        if (currentDoc) {
          // Check if the doc exist
          const files = await searchForFileByTitle(currentDoc.name, FileSearchOperator.equals);
          if (files.length > 0) {
            const { documentId } = await addNotesToFile(values.noteContent, currentDoc.id);
            if (documentId) {
              showToast({ style: Toast.Style.Success, title: "Posted!" });
              noteContentRef.current?.reset();
            } else {
              showToast({ style: Toast.Style.Failure, title: String("Failed!") });
            }
          } else {
            showToast({ style: Toast.Style.Failure, title: String("Failed to locate the file, Retry!") });
          }
        }
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: String(error) });
    }
  }

  useEffect(() => {
    console.log("currentDoc changed");
    if (currentDoc) {
      setCurrentDoc(currentDoc);
    }
  }, [currentDoc]);

  useEffect(() => {
    (async () => {
      try {
        await authorize();
        setIsAuthorized(true);

        try {
          // get all files
          const files = await searchForFileByTitle(RAYCAST_SUFFIX, FileSearchOperator.contains);
          if (files.length > 0) {
            // search for default doc, if present, make it current doc
            // if not, make first doc as default and current doc
            if (defaultDoc) {
              const defaultDocIndex = files.findIndex((file) => file.id === defaultDoc.id);
              if (defaultDocIndex > -1) {
                setDefaultDoc(files[defaultDocIndex]);
                setCurrentDoc(files[defaultDocIndex]);
              }
            } else {
              console.log("Setting default doc");
              setDefaultDoc(files[0]);
              setCurrentDoc(files[0]);
            }
            if (currentDoc) {
              const currentDocIndex = files.findIndex((file) => file.id === currentDoc.id);
              if (currentDocIndex > -1) {
                setCurrentDoc(files[currentDocIndex]);
              }
            } else {
              console.log("Setting Current doc");
              setCurrentDoc(defaultDoc);
            }
            setRaycastFiles(files);
          } else {
            const newDoc = await createDocumentWithName(DEFAULT_NOTE_TITLE);
            if (newDoc) {
              setCurrentDoc(newDoc);
              setDefaultDoc(newDoc);
              setRaycastFiles([newDoc]);
            }
          }
        } catch (error) {
          showToast({ style: Toast.Style.Failure, title: String(error) });
        }
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: String(error) });
        setIsAuthorized(false);
      }
    })();
  }, []);

  // const { isLoading } = usePromise(
  //   async () => {
  //     try {
  //       // get all files
  //       const files = await searchForFileByTitle(RAYCAST_SUFFIX, FileSearchOperator.contains);
  //       if (files.length > 0) {
  //         // search for default doc, if present, make it current doc
  //         // if not, make first doc as default and current doc
  //         if (defaultDoc) {
  //           const defaultDocIndex = files.findIndex((file) => file.id === defaultDoc.id);
  //           if (defaultDocIndex > -1) {
  //             setDefaultDoc(files[defaultDocIndex]);
  //             setCurrentDoc(files[defaultDocIndex]);
  //           }
  //         } else {
  //           console.log("Setting default doc")
  //           setDefaultDoc(files[0]);
  //           setCurrentDoc(files[0]);
  //         }
  //         setRaycastFiles(files);
  //       } else {
  //         const newDoc = await createDocumentWithName(DEFAULT_NOTE_TITLE);
  //         if (newDoc) {
  //           setCurrentDoc(newDoc);
  //           setDefaultDoc(newDoc);
  //           setRaycastFiles([newDoc]);
  //         }
  //       }
  //     } catch (error) {
  //       showToast({ style: Toast.Style.Failure, title: String(error) });
  //     }
  //   },
  //   [],
  //   {
  //     execute: isAuthorized,
  //   },
  // );

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={Icon.ArrowRightCircle} title="Send" onSubmit={handleSubmit} />
            <ConfigurationAction></ConfigurationAction>
            <ShowMyNotesAction></ShowMyNotesAction>
            <CurrentNoteSelectionAction></CurrentNoteSelectionAction>
          </ActionPanel>
        }
        isLoading={currentDoc === undefined}
      >
        <Form.TextArea
          error={contentError}
          onChange={dropContentError}
          onBlur={(event) => {
            if (event.target.value?.trim().length === 0) {
              setContentError(CONTENT_ERROR_STRING);
            } else {
              dropContentError();
            }
          }}
          ref={noteContentRef}
          id="noteContent"
          title="Note"
          placeholder="Your Text"
        />
        {defaultDoc && (
          <Form.Description
            text={`Your notes will be sent to default: ${
              defaultDoc ? getOriginalNoteName(defaultDoc?.name) : "UNKNOWN"
            }`}
          />
        )}
        {currentDoc && (
          <Form.Description
            text={`Your notes will be sent to current: ${
              currentDoc ? getOriginalNoteName(currentDoc?.name) : "UNKNOWN"
            }`}
          />
        )}
      </Form>
    </>
  );
}
