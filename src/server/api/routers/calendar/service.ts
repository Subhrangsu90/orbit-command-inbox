import { corsair, ensureCorsairConfigured } from "~/server/corsair";

export const calendarService = {
  async list(
    tenantId: string,
    input: {
      timeMin?: string;
      maxResults?: number;
      q?: string;
      calendarIds?: string[];
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      const timeMin = input.timeMin ?? new Date().toISOString();
      const calendarIds =
        input.calendarIds && input.calendarIds.length > 0
          ? input.calendarIds
          : ["primary"];

      const fetchPromises = calendarIds.map(async (calendarId) => {
        try {
          const eventsRes = await client.googlecalendar.api.events.getMany({
            calendarId,
            timeMin,
            maxResults: input.maxResults ?? 50,
            singleEvents: true,
            orderBy: "startTime",
            q: input.q,
          });
          return (eventsRes.items ?? []).map((ev: any) => ({
            ...ev,
            calendarId,
          }));
        } catch (err: any) {
          console.error(
            `Error fetching events for calendar ${calendarId}:`,
            err,
          );
          return [];
        }
      });

      const allEventsLists = await Promise.all(fetchPromises);
      const mergedEvents = allEventsLists.flat();

      // Sort merged events by start time
      mergedEvents.sort((a: any, b: any) => {
        const aTime = new Date(
          a.start?.dateTime || a.start?.date || 0,
        ).getTime();
        const bTime = new Date(
          b.start?.dateTime || b.start?.date || 0,
        ).getTime();
        return aTime - bTime;
      });

      return {
        events: mergedEvents,
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

      // Fallback: serve cached events from the local Corsair sync DB
      console.warn("[Calendar] API failed — falling back to local DB cache.");
      try {
        const localRows = await client.googlecalendar.db.events.search({
          limit: input.maxResults ?? 50,
          offset: 0,
        } as any);

        if (!localRows || localRows.length === 0) {
          return { events: [], fromCache: true };
        }

        const timeMin = input.timeMin ? new Date(input.timeMin).getTime() : 0;
        const events = localRows
          .map((row) => row.data as any)
          .filter((ev) => {
            const start = ev?.start?.dateTime || ev?.start?.date;
            if (!start) return false;
            return new Date(start).getTime() >= timeMin;
          })
          .sort((a: any, b: any) => {
            const aTime = new Date(
              a.start?.dateTime || a.start?.date || 0,
            ).getTime();
            const bTime = new Date(
              b.start?.dateTime || b.start?.date || 0,
            ).getTime();
            return aTime - bTime;
          })
          .slice(0, input.maxResults ?? 50);

        return { events, fromCache: true };
      } catch (dbError) {
        console.error("[Calendar] Local DB fallback also failed:", dbError);
        return { events: [], fromCache: true };
      }
    }
  },

  async listCalendars(tenantId: string) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);

    // Custom OAuth helper to resolve token
    const [s, c, d] = await Promise.all([
      client.googlecalendar.keys.get_access_token(),
      client.googlecalendar.keys.get_expires_at(),
      client.googlecalendar.keys.get_refresh_token(),
    ]);
    if (!d) throw new Error("No refresh token");
    const creds =
      await client.googlecalendar.keys.get_integration_credentials();

    const now = Math.floor(Date.now() / 1000);
    let token = s;
    if (!s || !c || Number(c) <= now + 300) {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: creds.client_id!,
          client_secret: creds.client_secret!,
          refresh_token: d,
          grant_type: "refresh_token",
        }),
      });
      if (!res.ok) {
        throw new Error(`Failed to refresh token: ${await res.text()}`);
      }
      const data = (await res.json()) as {
        access_token: string;
        expires_in: number;
      };
      await Promise.all([
        client.googlecalendar.keys.set_access_token(data.access_token),
        client.googlecalendar.keys.set_expires_at(
          String(now + data.expires_in),
        ),
      ]);
      token = data.access_token;
    }

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!res.ok) {
      const text = await res.text();
      if (
        text.includes("Account not found") ||
        text.includes("credentials") ||
        text.includes("token")
      ) {
        return {
          calendars: [],
          notConnected: true,
        };
      }
      throw new Error(`Failed to fetch Google Calendars list: ${text}`);
    }

    const data = (await res.json()) as { items?: any[] };
    return {
      calendars: data.items ?? [],
    };
  },

  async create(
    tenantId: string,
    input: {
      calendarId?: string;
      summary: string;
      description?: string;
      location?: string;
      startTime: string;
      endTime: string;
      attendees?: string[];
      colorId?: string;
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      const attendees = input.attendees?.map((email) => ({ email })) ?? [];
      const res = await client.googlecalendar.api.events.create({
        calendarId: input.calendarId ?? "primary",
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
          colorId: input.colorId,
        },
        sendUpdates: attendees.length > 0 ? "all" : "none",
      });

      return {
        id: res.id ?? "",
        htmlLink: res.htmlLink,
        hangoutLink: res.hangoutLink,
        success: true,
      };
    } catch (error) {
      console.error("Error creating calendar event:", error);
      handleCalendarError(error, "Failed to create calendar event.");
    }
  },

  async update(
    tenantId: string,
    input: {
      calendarId?: string;
      id: string;
      summary?: string;
      description?: string;
      location?: string;
      startTime?: string;
      endTime?: string;
      attendees?: string[];
      colorId?: string;
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      const calendarId = input.calendarId ?? "primary";
      const existing = await client.googlecalendar.api.events.get({
        calendarId,
        id: input.id,
      });
      const attendees = input.attendees?.map((email) => ({ email })) ?? [];
      const res = await client.googlecalendar.api.events.update({
        calendarId,
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
          colorId: input.colorId ?? existing.colorId,
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
      handleCalendarError(error, "Failed to update calendar event.");
    }
  },

  async delete(tenantId: string, input: { id: string; calendarId?: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      await client.googlecalendar.api.events.delete({
        calendarId: input.calendarId ?? "primary",
        id: input.id,
        sendUpdates: "all",
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      handleCalendarError(error, "Failed to delete calendar event.");
    }
  },

  async get(
    tenantId: string,
    input: {
      id: string;
      calendarId?: string;
      timeZone?: string;
      maxAttendees?: number;
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      const res = await client.googlecalendar.api.events.get({
        calendarId: input.calendarId ?? "primary",
        id: input.id,
        timeZone: input.timeZone,
        maxAttendees: input.maxAttendees,
      });
      return res;
    } catch (error) {
      console.error("Error getting calendar event:", error);
      handleCalendarError(error, "Failed to get calendar event.");
    }
  },

  async getAvailability(
    tenantId: string,
    input: {
      timeMin: string;
      timeMax: string;
      timeZone?: string;
      groupExpansionMax?: number;
      calendarExpansionMax?: number;
      items?: { id: string }[];
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      const res = await client.googlecalendar.api.calendar.getAvailability({
        timeMin: input.timeMin,
        timeMax: input.timeMax,
        timeZone: input.timeZone,
        groupExpansionMax: input.groupExpansionMax,
        calendarExpansionMax: input.calendarExpansionMax,
        items: input.items,
      });
      return res;
    } catch (error) {
      console.error("Error getting calendar availability:", error);
      handleCalendarError(error, "Failed to get calendar availability.");
    }
  },

  async searchLocal(
    tenantId: string,
    input: {
      entity: "calendars" | "events";
      filters: Array<{
        field: string;
        operator: string;
        value: string | number | string[] | number[];
      }>;
      limit: number;
      offset: number;
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    const entityClient = client.googlecalendar.db[input.entity];
    const entityFilters: Record<string, unknown> = {};
    const dataFilters: Record<string, unknown> = {};

    for (const filter of input.filters) {
      const target = filter.field === "entity_id" ? entityFilters : dataFilters;
      const field = filter.field === "entity_id" ? "entity_id" : filter.field;
      target[field] = toLocalSearchValue(filter.operator, filter.value);
    }

    const rows = await entityClient.search({
      ...entityFilters,
      data: dataFilters,
      limit: input.limit,
      offset: input.offset,
    } as never);

    return {
      rows: rows.map(serializeLocalEntity),
      source: "corsair-local-db" as const,
    };
  },
};

function toLocalSearchValue(
  operator: string,
  value: string | number | string[] | number[],
) {
  if (operator === "equals") return value;
  if (operator === "before" || operator === "after") {
    return { [operator]: new Date(String(value)) };
  }
  if (operator === "between" && Array.isArray(value)) {
    return { between: value.map((item) => new Date(String(item))) };
  }
  return { [operator]: value };
}

function serializeLocalEntity(row: {
  id: string;
  entity_id: string;
  data: unknown;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}) {
  return {
    id: row.id,
    entityId: row.entity_id,
    data: (row.data ?? {}) as Record<string, unknown>,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

function handleCalendarError(error: any, fallbackMessage: string): never {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes("Account not found") ||
    msg.includes("credentials") ||
    msg.includes("token")
  ) {
    throw new Error(
      "Google Calendar account is not connected. Please connect your Google Calendar in Settings first."
    );
  }
  throw new Error(fallbackMessage);
}
