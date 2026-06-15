import { z } from "zod";

export const listEventsInputModel = z.object({
  timeMin: z.string().optional(),
  maxResults: z.number().min(1).max(100).default(20),
  q: z.string().optional(),
});

export const listEventsOutputModel = z.object({
  events: z.array(z.any()),
  notConnected: z.boolean().optional(),
});

export const createEventInputModel = z.object({
  summary: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string(), // ISO string
  endTime: z.string(), // ISO string
  attendees: z.array(z.string().email()).optional(),
});

export const createEventOutputModel = z.object({
  id: z.string(),
  success: z.boolean(),
});

export const updateEventInputModel = z.object({
  id: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
});

export const updateEventOutputModel = z.object({
  id: z.string(),
  success: z.boolean(),
});

export const deleteEventInputModel = z.object({
  id: z.string(),
});

export const deleteEventOutputModel = z.object({
  success: z.boolean(),
});
