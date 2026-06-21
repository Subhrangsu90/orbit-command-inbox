import { googlecalendar } from "@corsair-dev/googlecalendar";
import { eventBus, EVENTS } from "~/server/eventBus";
import type { env as Env } from "~/env";

export const calendarPlugin = googlecalendar({
  webhookHooks: {
    onEventChanged: {
      after(ctx, response) {
        if (!response.success || !response.data) return;
        console.info("[googlecalendar.onEventChanged]", {
          tenantId: ctx.tenantId,
          type: response.data.type,
          calendarId: response.data.calendarId,
          eventId:
            response.data.type === "eventDeleted"
              ? response.data.eventId
              : response.data.event?.id,
        });

        const tenantId = ctx.tenantId;
        const type = response.data.type;

        if (!tenantId || !type) return;

        eventBus.emit(EVENTS.CALENDAR_EVENT_CHANGED, {
          tenantId,
          type,
          calendarId: response.data.calendarId,
          eventId:
            response.data.type === "eventDeleted"
              ? response.data.eventId
              : response.data.event?.id,
        });
      },
    },
  },
});

export function calendarCredentials(env: typeof Env) {
  return {
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
  };
}
