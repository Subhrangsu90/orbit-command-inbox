import { z } from "zod";
import type { CalendarActionEvent, ExecutedAction } from "~/server/integrations/types";

export const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export type Message = z.infer<typeof messageSchema>;

export const calendarActionEventSchema = z.object({
  id: z.string().optional(),
  calendarId: z.string().optional(),
  summary: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  calendarLink: z.string().optional(),
  meetingLink: z.string().optional(),
}) satisfies z.ZodType<CalendarActionEvent>;

export const actionUnion = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("send_email"),
    to: z.string(),
    subject: z.string(),
    body: z.string().optional(),
    success: z.boolean(),
  }),
  z.object({
    type: z.literal("create_email_draft"),
    to: z.string(),
    subject: z.string(),
    body: z.string(),
    draftId: z.string(),
    messageId: z.string().optional(),
    mailLink: z.string().optional(),
    senderName: z.string().optional(),
    senderEmail: z.string().optional(),
    success: z.boolean(),
  }),
  z.object({
    type: z.literal("reply_to_email"),
    id: z.string(),
    success: z.boolean(),
  }),
  z.object({
    type: z.literal("create_calendar_event"),
    eventId: z.string().optional(),
    calendarLink: z.string().optional(),
    meetingLink: z.string().optional(),
    summary: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    attendees: z.array(z.string()).optional(),
    event: calendarActionEventSchema.optional(),
    warnings: z.array(z.string()).optional(),
    success: z.boolean(),
  }),
  z.object({
    type: z.literal("update_calendar_event"),
    eventId: z.string(),
    summary: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    attendees: z.array(z.string()).optional(),
    event: calendarActionEventSchema.optional(),
    warnings: z.array(z.string()).optional(),
    success: z.boolean(),
  }),
  z.object({
    type: z.literal("delete_calendar_event"),
    eventId: z.string(),
    summary: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    attendees: z.array(z.string()).optional(),
    calendarLink: z.string().optional(),
    meetingLink: z.string().optional(),
    event: calendarActionEventSchema.optional(),
    success: z.boolean(),
  }),
  z.object({
    type: z.literal("search_emails"),
    query: z.string(),
    count: z.number(),
  }),
  z.object({
    type: z.literal("list_events"),
    count: z.number(),
    events: z.array(calendarActionEventSchema).optional(),
  }),
]) satisfies z.ZodType<ExecutedAction>;

export const chatMessageOutputSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  actions: z.any().optional(),
  createdAt: z.date(),
});
