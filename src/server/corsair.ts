import "dotenv/config";
import { createCorsair, setupCorsair } from "corsair";
import { conn } from "./db";
import { env } from "~/env";
import { gmailPlugin, gmailCredentials } from "./integrations/gmail/plugin";
import { calendarPlugin, calendarCredentials } from "./integrations/googlecalendar/plugin";

export const corsair = createCorsair({
  plugins: [gmailPlugin, calendarPlugin] as const,
  database: conn,
  kek: env.CORSAIR_KEK,
  multiTenancy: true,
});

let setupPromise: Promise<void> | undefined;

export function ensureCorsairConfigured() {
  setupPromise ??= setupCorsair(corsair, {
    credentials: {
      gmail: gmailCredentials(env),
      googlecalendar: calendarCredentials(env),
    },
  }).then(() => undefined);

  return setupPromise;
}
