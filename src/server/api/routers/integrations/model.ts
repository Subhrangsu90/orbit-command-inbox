import { z } from "zod";

export const getStatusOutputModel = z.object({
  fullyConnected: z.boolean().describe("Whether all integrations are connected"),
}).catchall(z.any());

export const getConnectUrlInputModel = z.object({
  provider: z.string().describe("The integration provider name, e.g. 'gmail', 'calendar'"),
  redirectTo: z.string().default("/chat").describe("The URL to redirect to after successful auth"),
});

export const getConnectUrlOutputModel = z.object({
  url: z.string().describe("The generated OAuth connection URL"),
});

export const disconnectInputModel = z.object({
  provider: z.string().describe("The integration provider name, e.g. 'gmail', 'calendar'"),
});

export const disconnectOutputModel = z.object({
  success: z.boolean().describe("Indicates if the integration was disconnected successfully"),
});
