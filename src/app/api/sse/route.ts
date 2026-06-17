import { auth } from "~/server/better-auth";
import { eventBus, EVENTS } from "~/server/eventBus";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tenantId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirm
      controller.enqueue(encoder.encode("data: connected\n\n"));

      // Keep connection alive with 30s heartbeats
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          // Stream might be closed
          cleanup();
        }
      }, 30000);

      const onEmailReceived = (data: { tenantId: string; messageId: string; type: string }) => {
        if (data.tenantId === tenantId) {
          try {
            controller.enqueue(
              encoder.encode(`event: email_received\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            cleanup();
          }
        }
      };

      const onCalendarEventChanged = (data: { tenantId: string; type: string; calendarId: string; eventId?: string }) => {
        if (data.tenantId === tenantId) {
          try {
            controller.enqueue(
              encoder.encode(`event: calendar_event_changed\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            cleanup();
          }
        }
      };

      eventBus.on(EVENTS.EMAIL_RECEIVED, onEmailReceived);
      eventBus.on(EVENTS.CALENDAR_EVENT_CHANGED, onCalendarEventChanged);

      const cleanup = () => {
        clearInterval(keepAliveInterval);
        eventBus.off(EVENTS.EMAIL_RECEIVED, onEmailReceived);
        eventBus.off(EVENTS.CALENDAR_EVENT_CHANGED, onCalendarEventChanged);
        try {
          controller.close();
        } catch {}
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
