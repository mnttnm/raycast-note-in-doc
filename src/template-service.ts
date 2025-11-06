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
    // Remove entire lines containing meeting variables if no context
    // This prevents awkward blank labels like "**Attendees:**" with no value
    result = result.replace(/^.*\{\{meeting_title\}\}.*$/gm, "");
    result = result.replace(/^.*\{\{meeting_attendees\}\}.*$/gm, "");
    result = result.replace(/^.*\{\{meeting_start\}\}.*$/gm, "");
    result = result.replace(/^.*\{\{meeting_end\}\}.*$/gm, "");

    // Collapse consecutive blank lines (replace 3+ newlines with 2)
    result = result.replace(/\n{3,}/g, "\n\n");
  }

  // Trim final result to remove leading/trailing whitespace
  return result.trim();
}

/**
 * Initialize default templates on first launch
 */
export async function initializeTemplates(): Promise<void> {
  try {
    const existing = await getTemplates();
    if (existing.length === 0) {
      try {
        await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Failed to initialize default templates:", message);
        throw new Error(`Failed to initialize default templates: ${message}`);
      }
    }
  } catch (error) {
    // If getTemplates fails, it's already handling errors internally
    // But we should still log and potentially rethrow if it's not a parsing error
    if (error instanceof Error && !error.message.includes("Failed to parse templates")) {
      console.error("Error during template initialization:", error.message);
      throw error;
    }
    // If it's a parsing error, getTemplates has already handled it by returning []
    // So we can try to initialize defaults
    try {
      await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
    } catch (storageError) {
      const message = storageError instanceof Error ? storageError.message : String(storageError);
      console.error("Failed to initialize default templates after parsing error:", message);
      throw new Error(`Failed to initialize default templates: ${message}`);
    }
  }
}

/**
 * Get all templates
 */
export async function getTemplates(): Promise<NoteTemplate[]> {
  try {
    const templatesJson = await LocalStorage.getItem<string>(TEMPLATES_STORAGE_KEY);
    if (!templatesJson) {
      return [];
    }

    try {
      return JSON.parse(templatesJson) as NoteTemplate[];
    } catch (parseError) {
      // Handle corrupted JSON data
      const message = parseError instanceof Error ? parseError.message : String(parseError);
      console.error("Failed to parse templates from storage, clearing corrupted data:", message);

      // Clear corrupted storage to prevent repeated failures
      try {
        await LocalStorage.removeItem(TEMPLATES_STORAGE_KEY);
      } catch (removeError) {
        console.error("Failed to clear corrupted templates:", removeError);
      }

      // Return empty array as safe fallback
      return [];
    }
  } catch (error) {
    // Handle LocalStorage errors
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to retrieve templates from storage:", message);
    return [];
  }
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

  try {
    await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to persist new template:", message);
    throw new Error(`Failed to create template: ${message}`);
  }

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

  // Create a shallow copy to avoid mutating the input object
  const safeUpdates = { ...updates };

  // Don't allow modifying built-in status or metadata
  delete safeUpdates.isBuiltIn;
  delete safeUpdates.id;
  delete safeUpdates.createdAt;

  templates[index] = { ...templates[index], ...safeUpdates };

  try {
    await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to persist template update:", message);
    throw new Error(`Failed to update template: ${message}`);
  }
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

  try {
    await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to persist templates after delete:", message);
    throw new Error(`Failed to delete template: ${message}`);
  }
}

/**
 * Reset templates to defaults (for troubleshooting)
 */
export async function resetToDefaults(): Promise<void> {
  try {
    await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to reset templates to defaults:", message);
    throw new Error(`Failed to reset templates: ${message}`);
  }
}
