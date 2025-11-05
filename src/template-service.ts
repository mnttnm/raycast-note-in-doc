import { LocalStorage } from "@raycast/api";
import { getDateInLocaleFormat } from "./util";

export interface NoteTemplate {
  id: string;
  name: string;
  content: string;
  trigger?: string; // Optional shortcut like ";meeting"
  isBuiltIn: boolean; // Built-in templates cannot be deleted
  createdAt: string;
}

export interface MeetingContext {
  title: string;
  attendees: string[];
  startTime: string;
  endTime: string;
}

const TEMPLATES_STORAGE_KEY = "note-templates";

// Default templates that ship with the extension
const DEFAULT_TEMPLATES: NoteTemplate[] = [
  {
    id: "daily-log",
    name: "Daily Log",
    content: `# Daily Log - {{date}}

## Goals
-

## Completed
-

## Notes
`,
    trigger: ";daily",
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    content: `# Meeting: {{meeting_title}}

**Date:** {{datetime}}
**Attendees:** {{meeting_attendees}}

## Agenda
-

## Discussion Notes
-

## Action Items
- [ ]
`,
    trigger: ";meeting",
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "idea-capture",
    name: "Quick Idea",
    content: `💡 Idea - {{time}}

**Concept:**


**Next Steps:**
-
`,
    trigger: ";idea",
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "bug-report",
    name: "Bug Report",
    content: `🐛 Bug Report - {{date}}

**Summary:**


**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Environment:**
-
`,
    trigger: ";bug",
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Substitutes template variables with actual values
 */
export function substituteTemplateVariables(
  content: string,
  meetingContext?: MeetingContext,
): string {
  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const datetime = getDateInLocaleFormat();

  let result = content;

  // Basic date/time variables
  result = result.replace(/\{\{date\}\}/g, date);
  result = result.replace(/\{\{time\}\}/g, time);
  result = result.replace(/\{\{datetime\}\}/g, datetime);

  // Meeting-specific variables
  if (meetingContext) {
    result = result.replace(/\{\{meeting_title\}\}/g, meetingContext.title || "Untitled Meeting");
    result = result.replace(
      /\{\{meeting_attendees\}\}/g,
      meetingContext.attendees.length > 0 ? meetingContext.attendees.join(", ") : "No attendees",
    );
    result = result.replace(/\{\{meeting_start\}\}/g, meetingContext.startTime);
    result = result.replace(/\{\{meeting_end\}\}/g, meetingContext.endTime);
  } else {
    // Clear meeting variables if no context
    result = result.replace(/\{\{meeting_title\}\}/g, "");
    result = result.replace(/\{\{meeting_attendees\}\}/g, "");
    result = result.replace(/\{\{meeting_start\}\}/g, "");
    result = result.replace(/\{\{meeting_end\}\}/g, "");
  }

  return result;
}

/**
 * Initialize default templates on first launch
 */
export async function initializeTemplates(): Promise<void> {
  const existing = await getTemplates();
  if (existing.length === 0) {
    await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
  }
}

/**
 * Get all templates
 */
export async function getTemplates(): Promise<NoteTemplate[]> {
  const templatesJson = await LocalStorage.getItem<string>(TEMPLATES_STORAGE_KEY);
  if (!templatesJson) {
    return [];
  }
  return JSON.parse(templatesJson) as NoteTemplate[];
}

/**
 * Get a single template by ID
 */
export async function getTemplate(id: string): Promise<NoteTemplate | undefined> {
  const templates = await getTemplates();
  return templates.find((t) => t.id === id);
}

/**
 * Create a new template
 */
export async function createTemplate(
  template: Omit<NoteTemplate, "id" | "createdAt" | "isBuiltIn">,
): Promise<NoteTemplate> {
  const templates = await getTemplates();
  const newTemplate: NoteTemplate = {
    ...template,
    id: `custom-${Date.now()}`,
    isBuiltIn: false,
    createdAt: new Date().toISOString(),
  };
  templates.push(newTemplate);
  await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  return newTemplate;
}

/**
 * Update an existing template
 */
export async function updateTemplate(id: string, updates: Partial<NoteTemplate>): Promise<void> {
  const templates = await getTemplates();
  const index = templates.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error("Template not found");
  }

  // Don't allow modifying built-in status
  delete updates.isBuiltIn;
  delete updates.id;
  delete updates.createdAt;

  templates[index] = { ...templates[index], ...updates };
  await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

/**
 * Delete a template (only custom templates)
 */
export async function deleteTemplate(id: string): Promise<void> {
  const templates = await getTemplates();
  const template = templates.find((t) => t.id === id);

  if (!template) {
    throw new Error("Template not found");
  }

  if (template.isBuiltIn) {
    throw new Error("Cannot delete built-in templates");
  }

  const filtered = templates.filter((t) => t.id !== id);
  await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Reset templates to defaults (for troubleshooting)
 */
export async function resetToDefaults(): Promise<void> {
  await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
}
