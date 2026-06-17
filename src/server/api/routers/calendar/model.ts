import { z } from "zod";

export const listEventsInputModel = z.object({
  timeMin: z.string().optional(),
  maxResults: z.number().min(1).max(100).default(20),
  q: z.string().optional(),
  calendarIds: z.array(z.string()).optional(),
});

export const listEventsOutputModel = z.object({
  events: z.array(z.any()),
  notConnected: z.boolean().optional(),
  fromCache: z.boolean().optional(),
});

export const listCalendarsOutputModel = z.object({
  calendars: z.array(z.any()),
  notConnected: z.boolean().optional(),
});

export const createEventInputModel = z.object({
  calendarId: z.string().optional(),
  summary: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string(), // ISO string
  endTime: z.string(), // ISO string
  attendees: z.array(z.string().email()).optional(),
  colorId: z.string().optional(),
});

export const createEventOutputModel = z.object({
  id: z.string(),
  success: z.boolean(),
});

export const updateEventInputModel = z.object({
  calendarId: z.string().optional(),
  id: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  colorId: z.string().optional(),
});

export const updateEventOutputModel = z.object({
  id: z.string(),
  success: z.boolean(),
});

export const deleteEventInputModel = z.object({
  calendarId: z.string().optional(),
  id: z.string(),
});

export const deleteEventOutputModel = z.object({
  success: z.boolean(),
});

export const getEventInputModel = z.object({
  id: z.string(),
  calendarId: z.string().optional().default("primary"),
  timeZone: z.string().optional(),
  maxAttendees: z.number().optional(),
});

export const getEventOutputModel = z.any();

export const getAvailabilityInputModel = z.object({
  timeMin: z.string(),
  timeMax: z.string(),
  timeZone: z.string().optional(),
  groupExpansionMax: z.number().optional(),
  calendarExpansionMax: z.number().optional(),
  items: z.array(z.object({ id: z.string() })).optional(),
});

export const getAvailabilityOutputModel = z.object({
  kind: z.string().optional(),
  calendars: z.record(
    z.string(),
    z.object({
      busy: z.array(
        z.object({
          start: z.string().optional(),
          end: z.string().optional(),
        })
      ).optional(),
      errors: z.array(
        z.object({
          domain: z.string().optional(),
          reason: z.string().optional(),
        })
      ).optional(),
    })
  ).optional(),
  groups: z.record(
    z.string(),
    z.object({
      calendars: z.array(z.string()).optional(),
      errors: z.array(
        z.object({
          domain: z.string().optional(),
          reason: z.string().optional(),
        })
      ).optional(),
    })
  ).optional(),
});

export const localCalendarSearchOperatorModel = z.enum([
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "in",
  "gt",
  "gte",
  "lt",
  "lte",
  "before",
  "after",
  "between",
]);

export const localCalendarSearchFilterModel = z.object({
  field: z.string().min(1),
  operator: localCalendarSearchOperatorModel,
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
});

export const localCalendarSearchInputModel = z.object({
  entity: z.enum(["calendars", "events"]),
  filters: z.array(localCalendarSearchFilterModel).default([]),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const localCalendarEntityModel = z.object({
  id: z.string(),
  entityId: z.string(),
  data: z.record(z.string(), z.unknown()),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const localCalendarSearchOutputModel = z.object({
  rows: z.array(localCalendarEntityModel),
  source: z.literal("corsair-local-db"),
});


