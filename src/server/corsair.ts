import "dotenv/config";
import { createCorsair, setupCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { conn } from "./db";
import { env } from "~/env";

const gmailPlugin = gmail({
  webhookHooks: {
    messageChanged: {
      after(ctx, response) {
        if (!response.success || !response.data) return;
        console.info("[gmail.messageChanged]", {
          tenantId: ctx.tenantId,
          type: response.data.type,
          messageId: response.data.message.id,
          historyId: response.data.historyId,
        });
      },
    },
  },
});

export const corsair = createCorsair({
  plugins: [gmailPlugin, googlecalendar()],
  database: conn,
  kek: env.CORSAIR_KEK,
  multiTenancy: true,
});

let setupPromise: Promise<void> | undefined;

export function ensureCorsairConfigured() {
  setupPromise ??= setupCorsair(corsair, {
    credentials: {
      gmail: {
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        ...(env.GMAIL_TOPIC_ID ? { topic_id: env.GMAIL_TOPIC_ID } : {}),
      },
      googlecalendar: {
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
      },
    },
  }).then(() => undefined);

  return setupPromise;
}
