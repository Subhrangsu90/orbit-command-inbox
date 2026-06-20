import type { FunctionTool } from "openai/resources/responses/responses";

export const tools: FunctionTool[] = [
  {
    type: "function",
    name: "send_email",
    description:
      "Sends a new email immediately. Use only after the user confirms a draft or exact final content that was already shown in the conversation.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "The email address of the recipient.",
        },
        subject: {
          type: "string",
          description: "The subject line of the email.",
        },
        body: {
          type: "string",
          description: "The plain text body content of the email.",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    type: "function",
    name: "create_email_draft",
    description:
      "Creates a Gmail draft without sending it. Always use this before any new outbound email so the user can review before sending.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "The recipient email address for the draft.",
        },
        subject: {
          type: "string",
          description: "The draft subject line.",
        },
        body: {
          type: "string",
          description: "The plain text draft body.",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
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
  {
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
          description: "Optional replacement list of attendee email addresses.",
        },
      },
      required: ["id"],
    },
  },
  {
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
  {
    type: "function",
    name: "search_emails",
    description:
      "Queries or searches emails. Allows searching by keyword, label, or query string.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        q: {
          type: "string",
          description:
            "Search query or keywords (e.g., 'from:iamsubhrangsubera@gmail.com', 'meeting', 'project update').",
        },
        mailbox: {
          type: "string",
          enum: ["inbox", "starred", "sent", "drafts"],
          description: "The mailbox/folder to search in.",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return (default 10).",
        },
      },
    },
  },
  {
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
        q: { type: "string", description: "Query string to filter events." },
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
  {
    type: "function",
    name: "reply_to_email",
    description: "Replies to an existing email by message ID.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The ID of the email message to reply to.",
        },
        body: { type: "string", description: "The reply message body." },
      },
      required: ["id", "body"],
    },
  },
];
