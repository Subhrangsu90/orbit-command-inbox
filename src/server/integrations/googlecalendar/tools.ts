import type { AgentTool, CalendarActionEvent } from "../types";
import { calendarService } from "~/server/api/routers/calendar/service";

// ─── Helpers ────────────────────────────────────────────────────────────────

function summarizeCalendarEvent(
  event: any,
  fallbackCalendarId?: string,
): CalendarActionEvent {
  return {
    id: event?.id,
    calendarId: event?.calendarId ?? fallbackCalendarId,
    summary: event?.summary,
    startTime: event?.start?.dateTime ?? event?.start?.date,
    endTime: event?.end?.dateTime ?? event?.end?.date,
    description: event?.description,
    location: event?.location,
    attendees: Array.isArray(event?.attendees)
      ? event.attendees
          .map((attendee: any) => attendee?.email)
          .filter(
            (email: unknown): email is string => typeof email === "string",
          )
      : undefined,
    calendarLink: event?.htmlLink,
    meetingLink: event?.hangoutLink,
  };
}

// ─── Tool Definitions ───────────────────────────────────────────────────────

export const calendarTools: AgentTool[] = [
  {
    definition: {
      type: "function",
      name: "create_calendar_event",
      description:
        "Creates a Google Calendar event. When attendees are provided, Google Calendar sends invitation updates to those attendees.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Title/summary of the calendar event.",
          },
          description: {
            type: "string",
            description: "Optional description of the event.",
          },
          location: {
            type: "string",
            description: "Optional physical or virtual location.",
          },
          startTime: {
            type: "string",
            description:
              "Start time in ISO-8601 format (e.g. '2026-06-25T09:00:00Z').",
          },
          endTime: {
            type: "string",
            description:
              "End time in ISO-8601 format (e.g. '2026-06-25T10:00:00Z').",
          },
          attendees: {
            type: "array",
            items: { type: "string" },
            description: "List of attendee email addresses.",
          },
        },
        required: ["summary", "startTime", "endTime"],
      },
    },
    async execute(ctx) {
      const { tenantId, args } = ctx;
      const res = await calendarService.create(tenantId, {
        summary: args.summary as string,
        description: args.description as string | undefined,
        location: args.location as string | undefined,
        startTime: args.startTime as string,
        endTime: args.endTime as string,
        attendees: args.attendees as string[] | undefined,
      });
      const event: CalendarActionEvent = {
        id: res.id,
        summary: args.summary as string,
        startTime: args.startTime as string,
        endTime: args.endTime as string,
        description: args.description as string | undefined,
        location: args.location as string | undefined,
        attendees: args.attendees as string[] | undefined,
        calendarLink: res.htmlLink,
        meetingLink: res.hangoutLink,
      };
      return {
        output: JSON.stringify({
          success: true,
          eventId: res.id,
          calendarLink: res.htmlLink,
          meetingLink: res.hangoutLink,
          summary: args.summary,
          startTime: args.startTime,
          endTime: args.endTime,
          description: args.description,
          location: args.location,
          attendees: args.attendees,
          warnings: (res as any).warnings,
        }),
        action: {
          type: "create_calendar_event",
          eventId: res.id,
          calendarLink: res.htmlLink,
          meetingLink: res.hangoutLink,
          summary: args.summary as string,
          startTime: args.startTime as string,
          endTime: args.endTime as string,
          description: args.description as string | undefined,
          location: args.location as string | undefined,
          attendees: args.attendees as string[] | undefined,
          event,
          warnings: (res as any).warnings,
          success: res.success,
        },
      };
    },
  },

  {
    definition: {
      type: "function",
      name: "update_calendar_event",
      description:
        "Updates an existing Google Calendar event by event ID. Use only after the exact event ID is known from list_events or prior context.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The Google Calendar event ID to update.",
          },
          calendarId: {
            type: "string",
            description:
              "Optional calendar ID from list_events. Use it when available, especially for non-primary calendars.",
          },
          summary: {
            type: "string",
            description: "Optional updated event title/summary.",
          },
          description: {
            type: "string",
            description: "Optional updated event description.",
          },
          location: {
            type: "string",
            description: "Optional updated physical or virtual location.",
          },
          startTime: {
            type: "string",
            description:
              "Optional updated start time in ISO-8601 format. Provide with endTime when moving/rescheduling.",
          },
          endTime: {
            type: "string",
            description:
              "Optional updated end time in ISO-8601 format. Provide with startTime when moving/rescheduling.",
          },
          attendees: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional replacement list of attendee email addresses.",
          },
        },
        required: ["id"],
      },
    },
    async execute(ctx) {
      const { tenantId, args } = ctx;
      const res = await calendarService.update(tenantId, {
        id: args.id as string,
        calendarId: args.calendarId as string | undefined,
        summary: args.summary as string | undefined,
        description: args.description as string | undefined,
        location: args.location as string | undefined,
        startTime: args.startTime as string | undefined,
        endTime: args.endTime as string | undefined,
        attendees: args.attendees as string[] | undefined,
      });
      const updatedEvent = summarizeCalendarEvent(
        await calendarService.get(tenantId, {
          id: res.id,
          calendarId: args.calendarId as string | undefined,
        }),
      );
      return {
        output: JSON.stringify({
          success: true,
          eventId: res.id,
          summary: args.summary,
          startTime: args.startTime,
          endTime: args.endTime,
          description: args.description,
          location: args.location,
          attendees: args.attendees,
          warnings: (res as any).warnings,
        }),
        action: {
          type: "update_calendar_event",
          eventId: res.id,
          summary:
            updatedEvent.summary ?? (args.summary as string | undefined),
          startTime:
            updatedEvent.startTime ?? (args.startTime as string | undefined),
          endTime:
            updatedEvent.endTime ?? (args.endTime as string | undefined),
          description:
            updatedEvent.description ??
            (args.description as string | undefined),
          location:
            updatedEvent.location ?? (args.location as string | undefined),
          attendees:
            updatedEvent.attendees ??
            (args.attendees as string[] | undefined),
          event: updatedEvent,
          warnings: (res as any).warnings,
          success: res.success,
        },
      };
    },
  },

  {
    definition: {
      type: "function",
      name: "delete_calendar_event",
      description:
        "Deletes an existing Google Calendar event by event ID. Use only after the exact event ID is known from list_events or prior context.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The Google Calendar event ID to delete.",
          },
          calendarId: {
            type: "string",
            description:
              "Optional calendar ID from list_events. Use it when available, especially for non-primary calendars.",
          },
        },
        required: ["id"],
      },
    },
    async execute(ctx) {
      const { tenantId, args } = ctx;
      const deletedEvent = summarizeCalendarEvent(
        await calendarService.get(tenantId, {
          id: args.id as string,
          calendarId: args.calendarId as string | undefined,
        }),
        args.calendarId as string | undefined,
      );
      const res = await calendarService.delete(tenantId, {
        id: args.id as string,
        calendarId: args.calendarId as string | undefined,
      });
      return {
        output: JSON.stringify({
          success: true,
          eventId: args.id,
          event: deletedEvent,
        }),
        action: {
          type: "delete_calendar_event",
          eventId: args.id as string,
          summary: deletedEvent.summary,
          startTime: deletedEvent.startTime,
          endTime: deletedEvent.endTime,
          description: deletedEvent.description,
          location: deletedEvent.location,
          attendees: deletedEvent.attendees,
          calendarLink: deletedEvent.calendarLink,
          meetingLink: deletedEvent.meetingLink,
          event: deletedEvent,
          success: res.success,
        },
      };
    },
  },

  {
    definition: {
      type: "function",
      name: "list_events",
      description: "Lists calendar events starting from a specific time.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          timeMin: {
            type: "string",
            description:
              "The minimum start time to search events from (ISO-8601 string).",
          },
          q: {
            type: "string",
            description: "Query string to filter events.",
          },
          calendarIds: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional calendar IDs to search. Use IDs returned by prior calendar results when available.",
          },
          maxResults: {
            type: "number",
            description: "Maximum number of events to return (default 10).",
          },
        },
      },
    },
    async execute(ctx) {
      const { tenantId, args } = ctx;
      const res = await calendarService.list(tenantId, {
        timeMin: args.timeMin as string | undefined,
        q: args.q as string | undefined,
        maxResults: (args.maxResults as number) || 10,
        calendarIds: args.calendarIds as string[] | undefined,
      });
      const events = res.events.map((event: any) => summarizeCalendarEvent(event));
      const simplifiedEvents = events.map((e: CalendarActionEvent) => ({
        id: e.id,
        summary: e.summary,
        startTime: e.startTime,
        endTime: e.endTime,
        description: e.description,
        location: e.location,
        attendees: e.attendees,
      }));
      return {
        output: JSON.stringify({ events: simplifiedEvents }),
        action: {
          type: "list_events",
          count: res.events.length,
          events,
        },
      };
    },
  },
];

// ─── System Prompt Section ──────────────────────────────────────────────────

export const calendarSystemPrompt = `Calendar and invitation rules:
- Before scheduling a meeting or event, check the requested time slot with list_events when the user gives a concrete date/time.
- Before updating or deleting a calendar event, use list_events to find the exact event id unless the id is already available in the conversation.
- Overlapping events are allowed, but creating or updating an event that overlaps an existing one returns a warning. When a tool result includes "warnings", tell the user about the overlap (what it conflicts with) so they can confirm the double-booking was intentional.
- Exact duplicates (same title in the same exact start/end slot) are blocked. If that happens, tell the user the event already exists instead of retrying.
- Use create_calendar_event for meetings, reminders, calls, interviews, invites, or scheduling.
- Use update_calendar_event for rescheduling or changing a known event. Use delete_calendar_event only when the user clearly asks to cancel/delete a known event.
- If attendees are included, create_calendar_event sends Google Calendar invitation updates automatically.
- If the user asks for an invitation email too, create the calendar event first, then create_email_draft mentioning the meeting details and that a calendar invite was sent. Do not send the email until the user confirms the shown draft.
- Do not invent a meeting link unless the user provides one; put provided video/meeting links in the event location or description and in the email body.`;
