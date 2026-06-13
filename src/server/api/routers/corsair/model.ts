import { z } from "zod";

export const getConnectionsOutputModel = z.object({
  gmail: z.boolean().describe("Whether the Gmail integration is connected"),
  googlecalendar: z.boolean().describe("Whether the Google Calendar integration is connected"),
});

export const disconnectInputModel = z.object({
  plugin: z.enum(["gmail", "googlecalendar"]).describe("The name of the integration plugin to disconnect"),
});

export const disconnectOutputModel = z.object({
  success: z.boolean().describe("Indicates if the integration was disconnected successfully"),
});
