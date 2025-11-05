import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { FileSearchOperator, GoogleDoc, addNotesToFile, searchForFileByTitle } from "./google_fns";
import { RAYCAST_SUFFIX, getOriginalNoteName } from "./util";
import { createDocumentWithName } from "./screens/create_new_file";
import { ListDocs } from "./screens/list_notes";
import { authorize } from "./auth";
import { ManageTemplates } from "./screens/manage-templates";
import {
  NoteTemplate,
  initializeTemplates,
  getTemplates,
  substituteTemplateVariables,
  MeetingContext,
} from "./template-service";
import { getCurrentMeeting, eventToMeetingContext, CalendarEvent } from "./calendar-service";

interface Values {
  textfield: string;
  noteContent: string;
  checkbox: boolean;
  dropdown: string;
}

const DEFAULT_NOTE_TITLE = "My Raycast Notes";
const CONTENT_ERROR_STRING = "Note can not be empty!";

export default function Command() {
  const [defaultDoc, setDefaultDoc] = useCachedState<GoogleDoc>("default-doc");
  const [currentDoc, setCurrentDoc] = useState<GoogleDoc | undefined>(defaultDoc);
  const [raycastFiles, setRaycastFiles] = useCachedState<Array<GoogleDoc>>("raycast-notes-files", []);
  const [, setIsAuthorized] = useState<boolean>(false);
  const [contentError, setContentError] = useState<string | undefined>();
  const noteContentRef = useRef<Form.TextArea>(null);
  const [submissionInProgress, setSubmissionInProgress] = useState<boolean>(false);
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [noteContent, setNoteContent] = useState<string>("");
  const [currentMeeting, setCurrentMeeting] = useState<CalendarEvent | null>(null);
  const [meetingContext, setMeetingContext] = useState<MeetingContext | undefined>(undefined);

  function handleDefaultDocChange(doc: GoogleDoc) {
    setDefaultDoc(doc);
  }

  function dropContentError() {
    if (contentError && contentError.length > 0) {
      setContentError(undefined);
    }
  }

  async function loadTemplates() {
    const allTemplates = await getTemplates();
    setTemplates(allTemplates);
  }

  async function checkCurrentMeeting() {
    try {
      const meeting = await getCurrentMeeting();
      setCurrentMeeting(meeting);
      if (meeting) {
        setMeetingContext(eventToMeetingContext(meeting));
      } else {
        setMeetingContext(undefined);
      }
    } catch (error) {
      console.error("Error checking for current meeting:", error);
      setCurrentMeeting(null);
      setMeetingContext(undefined);
    }
  }

  function handleTemplateSelect(template: NoteTemplate) {
    const substituted = substituteTemplateVariables(template.content, meetingContext);
    setNoteContent(substituted);
    // Force focus back to the form
    noteContentRef.current?.focus();
  }

  function handleUseMeetingTemplate() {
    const meetingTemplate = templates.find((t) => t.id === "meeting-notes");
    if (meetingTemplate && meetingContext) {
      const substituted = substituteTemplateVariables(meetingTemplate.content, meetingContext);
      setNoteContent(substituted);
    }
  }

  function CurrentNoteSelectionAction() {
    return (
      <ActionPanel.Section title="Change location for this note:">
        {raycastFiles?.map(
          (file) =>
            file && (
              <Action
                icon={file.name === currentDoc?.name ? Icon.CheckCircle : Icon.Circle}
                title={`${getOriginalNoteName(file.name)}${file.name === currentDoc?.name ? " (Current)" : ""}`}
                key={file.id}
                onAction={() => {
                  setCurrentDoc(file);
                }}
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
        title="All Docs"
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        target={
          <ListDocs
            key={raycastFiles.length}
            docs={raycastFiles}
            onDefaultDocChange={handleDefaultDocChange}
            defaultDoc={defaultDoc!}
            onNewFileCreation={(file) => {
              setRaycastFiles([file, ...raycastFiles]);
            }}
          />
        }
      />
    );
  }

  function UseTemplateAction() {
    return (
      <ActionPanel.Section title="Templates">
        {currentMeeting && meetingContext && (
          <Action
            icon={Icon.Calendar}
            title="Use Meeting Template"
            onAction={handleUseMeetingTemplate}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        )}
        {templates.slice(0, 5).map((template: NoteTemplate) => (
          <Action
            key={template.id}
            icon={template.isBuiltIn ? Icon.Star : Icon.Document}
            title={`Use: ${template.name}`}
            onAction={() => handleTemplateSelect(template)}
          />
        ))}
        <Action.Push
          icon={Icon.AppWindowGrid3x3}
          title="Manage Templates"
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          target={<ManageTemplates onTemplateSelect={handleTemplateSelect} />}
        />
      </ActionPanel.Section>
    );
  }

  async function handleSubmit(values: Values) {
    setSubmissionInProgress(true);
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
              await showToast({ style: Toast.Style.Success, title: "Posted!" });
              setNoteContent("");
              noteContentRef.current?.reset();
              popToRoot();
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
    setSubmissionInProgress(false);
  }

  useEffect(() => {
    (async () => {
      try {
        // Initialize templates on first launch
        await initializeTemplates();
        await loadTemplates();

        await authorize();
        setIsAuthorized(true);

        // Check for current meeting
        await checkCurrentMeeting();

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
              setDefaultDoc(files[0]);
              setCurrentDoc(files[0]);
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

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={Icon.ArrowRightCircle} title="Send" onSubmit={handleSubmit} />
            <ShowMyNotesAction></ShowMyNotesAction>
            <UseTemplateAction></UseTemplateAction>
            <CurrentNoteSelectionAction></CurrentNoteSelectionAction>
          </ActionPanel>
        }
        isLoading={currentDoc === undefined || submissionInProgress}
      >
        <Form.TextArea
          error={contentError}
          value={noteContent}
          onChange={(newValue: string) => {
            setNoteContent(newValue);
            dropContentError();
          }}
          onBlur={(event: { target: { value?: string } }) => {
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
        {currentMeeting && meetingContext && (
          <>
            <Form.Separator />
            <Form.Description
              title="📅 Active Meeting Detected"
              text={`${meetingContext.title} (${meetingContext.startTime} - ${meetingContext.endTime})`}
            />
            <Form.Description
              text={`Attendees: ${meetingContext.attendees.length > 0 ? meetingContext.attendees.join(", ") : "No attendees"}`}
            />
          </>
        )}
        <Form.Separator />
        {currentDoc && (
          <Form.Description
            key={`current: ${currentDoc.id}`}
            text={`Send This Note To: ${currentDoc ? getOriginalNoteName(currentDoc?.name) : "UNKNOWN"}`}
          />
        )}
        {defaultDoc && (
          <Form.Description
            key={`default: ${defaultDoc.id}`}
            text={`Default Notes Location: ${defaultDoc ? getOriginalNoteName(defaultDoc?.name) : "UNKNOWN"}`}
          />
        )}
      </Form>
    </>
  );
}
