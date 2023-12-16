import { Form, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useRef } from "react";
import { GoogleDoc, createDocument } from "../google_fns";
import { getUniqueNameForDoc } from "../util";

const FILE_NAME_ERROR = "Please enter the file name!";

interface CreateFileForm {
  fileName: string;
}

export async function createDocumentWithName(fileName: string) {
  try {
    const newDoc = await createDocument(getUniqueNameForDoc(fileName));
    showToast({ style: Toast.Style.Success, title: String("Doc creation successful!") });
    return newDoc;
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: String(error) });
  }
}

export function CreateNewFileForm() {
  const [noFileNameError, setNoFileNameError] = useState<string | undefined>();
  const fileNameTextFieldRef = useRef<Form.TextArea>(null);
  const [raycastFiles, setRaycastFiles] = useCachedState<Array<GoogleDoc>>("raycast-notes-files", []);

  function dropFileNameError() {
    if (noFileNameError && noFileNameError.length > 0) {
      setNoFileNameError(undefined);
    }
  }

  async function onFileCreate(createFileValues: CreateFileForm) {
    try {
      if (createFileValues.fileName.trim().length === 0) {
        setNoFileNameError(FILE_NAME_ERROR);
      } else {
        const newDoc = await createDocumentWithName(createFileValues.fileName.trim());
        if (newDoc) {
          fileNameTextFieldRef.current?.reset();
          setRaycastFiles([...(raycastFiles ?? []), newDoc]);
          showToast({ style: Toast.Style.Success, title: "File creation successful!" });
        } else {
          showToast({ style: Toast.Style.Failure, title: String("File creation failed!") });
        }
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: String(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={onFileCreate} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="fileName"
        onBlur={(event) => {
          if (event.target.value?.trim().length === 0) {
            setNoFileNameError(FILE_NAME_ERROR);
          } else {
            dropFileNameError();
          }
        }}
        error={noFileNameError}
        onChange={dropFileNameError}
        title="File name"
        placeholder="Enter file name"
        ref={fileNameTextFieldRef}
      />
    </Form>
  );
}
