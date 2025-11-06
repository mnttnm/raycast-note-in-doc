import { ActionPanel, Action, List, Icon, confirmAlert, Alert, showToast, Toast, Form } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  NoteTemplate,
  getTemplates,
  deleteTemplate,
  createTemplate,
  updateTemplate,
} from "../template-service";

export function ManageTemplates(props: {
  onTemplateSelect?: (template: NoteTemplate) => void;
  onTemplatesChanged?: () => void | Promise<void>;
}) {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadTemplates() {
    setIsLoading(true);
    const allTemplates = await getTemplates();
    setTemplates(allTemplates);
    setIsLoading(false);
  }

  async function notifyParentOfChange() {
    if (props.onTemplatesChanged) {
      await props.onTemplatesChanged();
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  async function handleDelete(template: NoteTemplate) {
    if (template.isBuiltIn) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot delete built-in templates",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete Template",
      message: `Are you sure you want to delete "${template.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteTemplate(template.id);
        await showToast({ style: Toast.Style.Success, title: "Template deleted" });
        await loadTemplates();
        await notifyParentOfChange();
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: String(error) });
        // Still notify parent after error settles so UI can refresh
        await notifyParentOfChange();
      }
    }
  }

  async function handleNewTemplate(template: NoteTemplate) {
    setTemplates([template, ...templates]);
    await notifyParentOfChange();
  }

  async function handleTemplateUpdate() {
    await loadTemplates();
    await notifyParentOfChange();
  }

  function TemplateListItemActions(props: {
    template: NoteTemplate;
    onTemplateSelect?: (template: NoteTemplate) => void;
  }) {
    const { template } = props;

    return (
      <ActionPanel>
        <ActionPanel.Section>
          {props.onTemplateSelect && (
            <Action
              title="Use This Template"
              icon={Icon.Check}
              onAction={() => props.onTemplateSelect!(template)}
            />
          )}
          <Action.Push
            title="Edit Template"
            icon={Icon.Pencil}
            target={
              <EditTemplateForm
                template={template}
                onTemplateUpdate={handleTemplateUpdate}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.CopyToClipboard
            title="Copy Template Content"
            content={template.content}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.Push
            title="Create New Template"
            icon={Icon.Plus}
            target={<CreateTemplateForm onTemplateCreation={handleNewTemplate} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          {!template.isBuiltIn && (
            <Action
              title="Delete Template"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => handleDelete(template)}
              shortcut={{ modifiers: ["cmd"], key: "delete" }}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search templates...">
      {templates.map((template) => (
        <List.Item
          key={template.id}
          title={template.name}
          subtitle={template.trigger}
          icon={template.isBuiltIn ? Icon.Star : Icon.Document}
          accessories={[
            { text: template.isBuiltIn ? "Built-in" : "Custom" },
          ]}
          actions={<TemplateListItemActions template={template} onTemplateSelect={props.onTemplateSelect} />}
        />
      ))}
    </List>
  );
}

function CreateTemplateForm(props: { onTemplateCreation: (template: NoteTemplate) => void }) {
  const [nameError, setNameError] = useState<string | undefined>();
  const [contentError, setContentError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateName(value: string | undefined) {
    if (!value || value.trim().length === 0) {
      setNameError("Name is required");
      return false;
    }
    setNameError(undefined);
    return true;
  }

  function validateContent(value: string | undefined) {
    if (!value || value.trim().length === 0) {
      setContentError("Content is required");
      return false;
    }
    setContentError(undefined);
    return true;
  }

  async function handleSubmit(values: { name: string; content: string; trigger?: string }) {
    if (!validateName(values.name) || !validateContent(values.content)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const newTemplate = await createTemplate({
        name: values.name.trim(),
        content: values.content.trim(),
        trigger: values.trigger?.trim() || undefined,
      });
      await showToast({ style: Toast.Style.Success, title: "Template created" });
      props.onTemplateCreation(newTemplate);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: String(error) });
    }
    setIsSubmitting(false);
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Template" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Template Name"
        placeholder="e.g., Daily Standup"
        error={nameError}
        onChange={() => setNameError(undefined)}
        onBlur={(e) => validateName(e.target.value)}
      />
      <Form.TextField
        id="trigger"
        title="Shortcut (Optional)"
        placeholder="e.g., ;standup"
        info="Type this shortcut to quickly insert the template"
      />
      <Form.TextArea
        id="content"
        title="Template Content"
        placeholder="Enter your template content here. Use {{date}}, {{time}}, {{datetime}} for dynamic values."
        error={contentError}
        onChange={() => setContentError(undefined)}
        onBlur={(e) => validateContent(e.target.value)}
      />
      <Form.Description text="Available variables: {{date}}, {{time}}, {{datetime}}, {{meeting_title}}, {{meeting_attendees}}" />
    </Form>
  );
}

function EditTemplateForm(props: { template: NoteTemplate; onTemplateUpdate: () => void }) {
  const [nameError, setNameError] = useState<string | undefined>();
  const [contentError, setContentError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateName(value: string | undefined) {
    if (!value || value.trim().length === 0) {
      setNameError("Name is required");
      return false;
    }
    setNameError(undefined);
    return true;
  }

  function validateContent(value: string | undefined) {
    if (!value || value.trim().length === 0) {
      setContentError("Content is required");
      return false;
    }
    setContentError(undefined);
    return true;
  }

  async function handleSubmit(values: { name: string; content: string; trigger?: string }) {
    if (!validateName(values.name) || !validateContent(values.content)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateTemplate(props.template.id, {
        name: values.name.trim(),
        content: values.content.trim(),
        trigger: values.trigger?.trim() || undefined,
      });
      await showToast({ style: Toast.Style.Success, title: "Template updated" });
      props.onTemplateUpdate();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: String(error) });
    }
    setIsSubmitting(false);
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Template" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Template Name"
        defaultValue={props.template.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
        onBlur={(e) => validateName(e.target.value)}
      />
      <Form.TextField
        id="trigger"
        title="Shortcut (Optional)"
        defaultValue={props.template.trigger}
        info="Type this shortcut to quickly insert the template"
      />
      <Form.TextArea
        id="content"
        title="Template Content"
        defaultValue={props.template.content}
        error={contentError}
        onChange={() => setContentError(undefined)}
        onBlur={(e) => validateContent(e.target.value)}
      />
      <Form.Description text="Available variables: {{date}}, {{time}}, {{datetime}}, {{meeting_title}}, {{meeting_attendees}}" />
      {props.template.isBuiltIn && (
        <Form.Description text="⚠️ This is a built-in template. Changes will only apply to your local copy." />
      )}
    </Form>
  );
}
