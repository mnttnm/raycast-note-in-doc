import { client } from "./auth";
import fetch, { Response } from "node-fetch";
import { MeetingContext } from "./template-service";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
}

interface CalendarListResponse {
  items: CalendarEvent[];
}

/**
 * Fetch today's calendar events
 */
export async function getTodayEvents(): Promise<CalendarEvent[]> {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const params = new URLSearchParams();
    params.append("timeMin", startOfDay.toISOString());
    params.append("timeMax", endOfDay.toISOString());
    params.append("singleEvents", "true");
    params.append("orderBy", "startTime");
    params.append("maxResults", "50");

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      console.error("Calendar API error:", await response.text());
      return [];
    }

    const json = (await response.json()) as CalendarListResponse;
    return json.items || [];
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return [];
  }
}

/**
 * Get the current ongoing meeting (if any)
 */
export async function getCurrentMeeting(): Promise<CalendarEvent | null> {
  const events = await getTodayEvents();
  const now = new Date();

  for (const event of events) {
    // Skip all-day events
    if (!event.start.dateTime || !event.end.dateTime) {
      continue;
    }

    const startTime = new Date(event.start.dateTime);
    const endTime = new Date(event.end.dateTime);

    // Check if current time is within the event window
    if (now >= startTime && now <= endTime) {
      return event;
    }
  }

  return null;
}

/**
 * Get upcoming meeting within the next hour
 */
export async function getUpcomingMeeting(): Promise<CalendarEvent | null> {
  const events = await getTodayEvents();
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  for (const event of events) {
    if (!event.start.dateTime) {
      continue;
    }

    const startTime = new Date(event.start.dateTime);

    // Check if event starts within the next hour
    if (startTime > now && startTime <= oneHourLater) {
      return event;
    }
  }

  return null;
}

/**
 * Convert a CalendarEvent to MeetingContext for template substitution
 */
export function eventToMeetingContext(event: CalendarEvent): MeetingContext {
  const attendeeNames: string[] = [];

  if (event.attendees) {
    for (const attendee of event.attendees) {
      // Skip the current user
      if (attendee.self) {
        continue;
      }

      const name = attendee.displayName || attendee.email.split("@")[0];
      attendeeNames.push(name);
    }
  }

  // Add organizer if not already in attendees
  if (event.organizer && !event.organizer.email.includes("calendar.google.com")) {
    const organizerName = event.organizer.displayName || event.organizer.email.split("@")[0];
    if (!attendeeNames.includes(organizerName)) {
      attendeeNames.unshift(`${organizerName} (Organizer)`);
    }
  }

  return {
    title: event.summary || "Untitled Meeting",
    attendees: attendeeNames,
    startTime: event.start.dateTime
      ? new Date(event.start.dateTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    endTime: event.end.dateTime
      ? new Date(event.end.dateTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
  };
}
