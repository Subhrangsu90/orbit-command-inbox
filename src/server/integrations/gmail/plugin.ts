import { gmail } from "@corsair-dev/gmail";
import { eventBus, EVENTS } from "~/server/eventBus";
import type { env as Env } from "~/env";

export const gmailPlugin = gmail({
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
              const [
                { emailsService },
                { classifyAndStorePriority },
                { generateAndStoreEmbedding },
              ] = await Promise.all([
                import("~/server/api/routers/emails/service"),
                import("~/server/api/routers/emails/priority"),
                import("~/server/api/routers/emails/vectorSearch"),
              ]);

              const email = await emailsService.get(tenantId, {
                id: messageId,
              });
              await classifyAndStorePriority(
                email.id,
                email.subject,
                email.snippet,
              );
              await generateAndStoreEmbedding(tenantId, email.id);
              // Trigger another event so the client knows priority is updated!
              eventBus.emit(EVENTS.EMAIL_RECEIVED, {
                tenantId,
                messageId,
                type: "priority_updated",
              });
            } catch (err) {
              console.error(
                "[priority classification/embedding background task failed]",
                err,
              );
            }
          });
        }
      },
    },
  },
});

export function gmailCredentials(env: typeof Env) {
  return {
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    ...(env.GMAIL_TOPIC_ID ? { topic_id: env.GMAIL_TOPIC_ID } : {}),
  };
}
