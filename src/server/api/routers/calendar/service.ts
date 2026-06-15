import { corsair, ensureCorsairConfigured } from "~/server/corsair";

export const calendarService = {
  async list(
    tenantId: string,
    input: { timeMin?: string; maxResults?: number; q?: string },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      const timeMin = input.timeMin ?? new Date().toISOString();
      const eventsRes = await client.googlecalendar.api.events.getMany({
        timeMin,
        maxResults: input.maxResults ?? 20,
        singleEvents: true,
        orderBy: "startTime",
        q: input.q,
      });

      return {
        events: eventsRes.items ?? [],
      };
    } catch (error: any) {
      console.error("Error listing calendar events:", error);
      const msg = error?.message || "";
      if (
        msg.includes("Account not found") ||
        msg.includes("credentials") ||
        msg.includes("token")
      ) {
        return {
          events: [],
          notConnected: true,
        };
      }
      throw new Error("Failed to fetch calendar events.");
    }
  },

  async create(
    tenantId: string,
    input: {
      summary: string;
      description?: string;
      location?: string;
      startTime: string;
      endTime: string;
      attendees?: string[];
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      const attendees = input.attendees?.map((email) => ({ email })) ?? [];
      const res = await client.googlecalendar.api.events.create({
        calendarId: "primary",
        event: {
          summary: input.summary,
          description: input.description,
          location: input.location,
          start: {
            dateTime: input.startTime,
          },
          end: {
            dateTime: input.endTime,
          },
          attendees,
        },
        sendUpdates: attendees.length > 0 ? "all" : "none",
      });

      return {
        id: res.id ?? "",
        success: true,
      };
    } catch (error) {
      console.error("Error creating calendar event:", error);
      throw new Error("Failed to create calendar event.");
    }
  },

  async update(
    tenantId: string,
    input: {
      id: string;
      summary?: string;
      description?: string;
      location?: string;
      startTime?: string;
      endTime?: string;
      attendees?: string[];
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      const existing = await client.googlecalendar.api.events.get({
        calendarId: "primary",
        id: input.id,
      });
      const attendees = input.attendees?.map((email) => ({ email })) ?? [];
      const res = await client.googlecalendar.api.events.update({
        calendarId: "primary",
        id: input.id,
        event: {
          summary: input.summary ?? existing.summary,
          description: input.description ?? existing.description,
          location: input.location ?? existing.location,
          start: input.startTime
            ? { dateTime: input.startTime }
            : existing.start,
          end: input.endTime ? { dateTime: input.endTime } : existing.end,
          attendees: input.attendees ? attendees : existing.attendees,
          recurrence: existing.recurrence,
          colorId: existing.colorId,
          transparency: existing.transparency,
          visibility: existing.visibility,
          eventType: existing.eventType,
          status: existing.status,
          reminders: existing.reminders,
          guestsCanModify: existing.guestsCanModify,
          guestsCanInviteOthers: existing.guestsCanInviteOthers,
          guestsCanSeeOtherGuests: existing.guestsCanSeeOtherGuests,
          anyoneCanAddSelf: existing.anyoneCanAddSelf,
          sequence: existing.sequence,
          originalStartTime: existing.originalStartTime,
          recurringEventId: existing.recurringEventId,
        },
        sendUpdates: input.attendees ? "all" : "none",
      });

      return {
        id: res.id ?? "",
        success: true,
      };
    } catch (error) {
      console.error("Error updating calendar event:", error);
      throw new Error("Failed to update calendar event.");
    }
  },

  async delete(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      await client.googlecalendar.api.events.delete({
        calendarId: "primary",
        id: input.id,
        sendUpdates: "all",
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      throw new Error("Failed to delete calendar event.");
    }
  },
};
