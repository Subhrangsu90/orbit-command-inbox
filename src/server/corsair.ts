import "dotenv/config";
import { createCorsair, setupCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { conn } from "./db";
import { env } from "~/env";

import { eventBus, EVENTS } from "./eventBus";
import { emailsService } from "./api/routers/emails/service";
import { classifyAndStorePriority } from "./api/routers/emails/priority";
import { generateAndStoreEmbedding } from "./api/routers/emails/vectorSearch";

const gmailPlugin = gmail({
  webhookHooks: {
    messageChanged: {
      after(ctx, response) {
        if (!response.success || !response.data) return;
        console.info("[gmail.messageChanged]", {
          tenantId: ctx.tenantId,
          type: response.data.type,
          messageId: response.data.message?.id,
          historyId: response.data.historyId,
        });

        const tenantId = ctx.tenantId;
        const messageId = response.data.message?.id;
        const type = response.data.type;

        if (!tenantId || !messageId || !type) return;

        eventBus.emit(EVENTS.EMAIL_RECEIVED, {
          tenantId,
          messageId,
          type,
        });

        if (type === "messageReceived") {
          Promise.resolve().then(async () => {
            try {
              const email = await emailsService.get(tenantId, { id: messageId });
              await classifyAndStorePriority(email.id, email.subject, email.snippet);
              await generateAndStoreEmbedding(tenantId, email.id);
              // Trigger another event so the client knows priority is updated!
              eventBus.emit(EVENTS.EMAIL_RECEIVED, {
                tenantId,
                messageId,
                type: "priority_updated",
              });
            } catch (err) {
              console.error("[priority classification/embedding background task failed]", err);
            }
          });
        }
      },
    },
  },
});

const googleCalendarPlugin = googlecalendar({
  webhookHooks: {
    onEventChanged: {
      after(ctx, response) {
        if (!response.success || !response.data) return;
        console.info("[googlecalendar.onEventChanged]", {
          tenantId: ctx.tenantId,
          type: response.data.type,
          calendarId: response.data.calendarId,
          eventId: response.data.type === "eventDeleted" ? response.data.eventId : response.data.event?.id,
        });

        const tenantId = ctx.tenantId;
        const type = response.data.type;

        if (!tenantId || !type) return;

        eventBus.emit(EVENTS.CALENDAR_EVENT_CHANGED, {
          tenantId,
          type,
          calendarId: response.data.calendarId,
          eventId: response.data.type === "eventDeleted" ? response.data.eventId : response.data.event?.id,
        });
      },
    },
  },
});

export const corsair = createCorsair({
  plugins: [gmailPlugin, googleCalendarPlugin],
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
