import { z } from "zod";

export const getStatusOutputModel = z.object({
  gmail: z.boolean().describe("Whether Gmail is connected"),
  calendar: z.boolean().describe("Whether Google Calendar is connected"),
  fullyConnected: z.boolean().describe("Whether both integrations are connected"),
});

export const getConnectUrlInputModel = z.object({
  redirectTo: z.string().default("/chat").describe("The URL to redirect to after successful auth"),
});

export const getConnectUrlOutputModel = z.object({
  url: z.string().describe("The generated OAuth connection URL"),
});

export const disconnectOutputModel = z.object({
  success: z.boolean().describe("Indicates if the integration was disconnected successfully"),
});
