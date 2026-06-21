import { corsair, ensureCorsairConfigured } from "~/server/corsair";
import { emailsService } from "../emails/service";

class CalendarConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarConflictError";
  }
}

function getEventTimeValue(
  value: { dateTime?: string; date?: string } | undefined,
) {
  return value?.dateTime ?? value?.date ?? "";
}

function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA;
}

function describeEventConflict(event: {
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}) {
  const title = event.summary?.trim() || "an existing event";
  const start = getEventTimeValue(event.start);
  const end = getEventTimeValue(event.end);
  if (start && end) {
    return `"${title}" (${new Date(start).toLocaleString()} - ${new Date(end).toLocaleString()})`;
  }
  return `"${title}"`;
}

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

    // Corsair exposes no calendar-list API endpoint. For now we surface just the
    // connected account's primary calendar, using getMany("primary") to confirm
    // the calendar is reachable. TODO: make this dynamic (enumerate all
    // calendars) once a Corsair-native source for the full list is available.
    try {
      await client.googlecalendar.api.events.getMany({
        calendarId: "primary",
        maxResults: 1,
        singleEvents: true,
        orderBy: "startTime",
      });
    } catch (error) {
      console.error("Error reaching primary calendar:", error);
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes("Account not found") ||
        msg.includes("credentials") ||
        msg.includes("token")
      ) {
        return {
          calendars: [],
          notConnected: true,
        };
      }
      return {
        calendars: [],
      };
    }

    // Label the primary calendar with the connected account email when we can.
    let connectedEmail: string | undefined;
    try {
      connectedEmail = (
        await emailsService.getConnectedProfile(tenantId)
      ).email?.trim();
    } catch {
      connectedEmail = undefined;
    }

    return {
      calendars: [
        {
          id: "primary",
          summary: connectedEmail ?? "My Calendar",
          primary: true,
          accessRole: "owner",
        },
      ],
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
      const calendarId = input.calendarId ?? "primary";
      const requestedStart = new Date(input.startTime);
      const requestedEnd = new Date(input.endTime);

      if (
        Number.isNaN(requestedStart.getTime()) ||
        Number.isNaN(requestedEnd.getTime()) ||
        requestedEnd <= requestedStart
      ) {
        throw new Error("Event end time must be after a valid start time.");
      }

      const overlappingEvents = await client.googlecalendar.api.events.getMany({
        calendarId,
        timeMin: requestedStart.toISOString(),
        timeMax: requestedEnd.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 10,
      });

      const duplicate = (overlappingEvents.items ?? []).find((event: any) => {
        const eventStart = getEventTimeValue(event.start);
        const eventEnd = getEventTimeValue(event.end);
        return (
          eventStart &&
          eventEnd &&
          new Date(eventStart).getTime() === requestedStart.getTime() &&
          new Date(eventEnd).getTime() === requestedEnd.getTime() &&
          String(event.summary ?? "")
            .trim()
            .toLowerCase() === input.summary.trim().toLowerCase()
        );
      });

      if (duplicate) {
        throw new CalendarConflictError(
          `An event named "${input.summary}" already exists in that exact slot. I did not create a duplicate event.`,
        );
      }

      // Overlaps with other events are allowed, but surfaced as a warning so
      // the user can decide whether the double-booking was intentional.
      const warnings: string[] = [];
      const conflict = (overlappingEvents.items ?? []).find((event: any) => {
        if (event.status === "cancelled") return false;
        const eventStartValue = getEventTimeValue(event.start);
        const eventEndValue = getEventTimeValue(event.end);
        if (!eventStartValue || !eventEndValue) return false;

        return intervalsOverlap(
          requestedStart,
          requestedEnd,
          new Date(eventStartValue),
          new Date(eventEndValue),
        );
      });

      if (conflict) {
        warnings.push(
          `This event overlaps with ${describeEventConflict(conflict)}.`,
        );
      }

      const attendees = input.attendees?.map((email) => ({ email })) ?? [];
      const res = await client.googlecalendar.api.events.create({
        calendarId,
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
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      console.error("Error creating calendar event:", error);
      if (error instanceof CalendarConflictError) {
        throw error;
      }
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
      const warnings: string[] = [];
      const existing = await client.googlecalendar.api.events.get({
        calendarId,
        id: input.id,
      });
      if (input.startTime || input.endTime) {
        const nextStartValue =
          input.startTime ?? getEventTimeValue(existing.start);
        const nextEndValue = input.endTime ?? getEventTimeValue(existing.end);
        const nextStart = new Date(nextStartValue);
        const nextEnd = new Date(nextEndValue);

        if (
          Number.isNaN(nextStart.getTime()) ||
          Number.isNaN(nextEnd.getTime()) ||
          nextEnd <= nextStart
        ) {
          throw new Error("Event end time must be after a valid start time.");
        }

        const overlappingEvents =
          await client.googlecalendar.api.events.getMany({
            calendarId,
            timeMin: nextStart.toISOString(),
            timeMax: nextEnd.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
            maxResults: 10,
          });
        const duplicate = (overlappingEvents.items ?? []).find((event: any) => {
          if (event.id === input.id || event.status === "cancelled")
            return false;
          const eventStart = getEventTimeValue(event.start);
          const eventEnd = getEventTimeValue(event.end);
          return (
            eventStart &&
            eventEnd &&
            new Date(eventStart).getTime() === nextStart.getTime() &&
            new Date(eventEnd).getTime() === nextEnd.getTime() &&
            String(event.summary ?? "")
              .trim()
              .toLowerCase() ===
              String(input.summary ?? existing.summary ?? "")
                .trim()
                .toLowerCase()
          );
        });

        if (duplicate) {
          throw new CalendarConflictError(
            `An event named "${input.summary ?? existing.summary}" already exists in that exact slot. I did not create a duplicate event.`,
          );
        }

        // Overlaps are allowed on update too — warn instead of blocking.
        const conflict = (overlappingEvents.items ?? []).find((event: any) => {
          if (event.id === input.id || event.status === "cancelled")
            return false;
          const eventStartValue = getEventTimeValue(event.start);
          const eventEndValue = getEventTimeValue(event.end);
          if (!eventStartValue || !eventEndValue) return false;

          return intervalsOverlap(
            nextStart,
            nextEnd,
            new Date(eventStartValue),
            new Date(eventEndValue),
          );
        });

        if (conflict) {
          warnings.push(
            `This event overlaps with ${describeEventConflict(conflict)}.`,
          );
        }
      }

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
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      console.error("Error updating calendar event:", error);
      if (error instanceof CalendarConflictError) {
        throw error;
      }
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
      "Google Calendar account is not connected. Please connect your Google Calendar in Settings first.",
    );
  }
  throw new Error(fallbackMessage);
}
