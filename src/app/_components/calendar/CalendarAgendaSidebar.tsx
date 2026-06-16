"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { api } from "~/trpc/react";
import { Card } from "../ui/card";

type EventTime = { date?: string; dateTime?: string };
type CalendarAttendee = { displayName?: string; email?: string };
type CalendarEvent = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: EventTime;
  end?: EventTime;
  attendees?: CalendarAttendee[];
};

function eventDate(time?: EventTime) {
  if (time?.dateTime) return new Date(time.dateTime);
  if (time?.date) {
    const [year, month, day] = time.date.split("-").map(Number);
    if (year && month && day) return new Date(year, month - 1, day);
  }
  return null;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function eventDateKey(event: CalendarEvent) {
  const date = eventDate(event.start);
  return date ? dateKey(date) : null;
}

function sameDay(left: Date, right: Date) {
  return dateKey(left) === dateKey(right);
}

function buildMonthDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function formatDay(time?: EventTime) {
  const date = eventDate(time);
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTimeRange(start?: EventTime, end?: EventTime) {
  if (start?.date && !start.dateTime) return "All day";
  const startDate = eventDate(start);
  const endDate = eventDate(end);
  if (!startDate) return "Time unavailable";
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return endDate
    ? `${formatter.format(startDate)} - ${formatter.format(endDate)}`
    : formatter.format(startDate);
}

export function CalendarAgendaSidebar({
  isConnected,
}: {
  isConnected: boolean;
}) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { data, isLoading, refetch } = api.calendar.list.useQuery(
    { maxResults: 50 },
    { enabled: isConnected },
  );
  const events = (data?.events ?? []) as CalendarEvent[];
  const isCalendarConnected = isConnected && !data?.notConnected;
  const monthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const eventDays = useMemo(
    () => new Set(events.map(eventDateKey).filter(Boolean)),
    [events],
  );
  const visibleEvents = selectedDate
    ? events.filter((event) => eventDateKey(event) === dateKey(selectedDate))
    : events;

  function changeMonth(offset: number) {
    setVisibleMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + offset, 1),
    );
  }

  return (
    <>
      <Card className="border-outline-variant bg-surface-container-lowest sticky top-6 hidden h-[calc(100vh-7rem)] min-h-[620px] overflow-hidden rounded-2xl border shadow-sm xl:col-span-3 xl:flex xl:flex-col">
        <div className="border-outline-variant flex items-center justify-between border-b px-4 py-3.5">
          <div>
            <p className="text-on-surface text-sm font-bold">Calendar</p>
            <p className="text-on-surface-variant text-3xs">Month and agenda</p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={!isCalendarConnected}
            aria-label="Refresh calendar events"
            title="Refresh calendar"
            className="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded-full p-2 transition disabled:opacity-40"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>

        <div className="border-outline-variant shrink-0 border-b p-3">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
              className="text-on-surface-variant hover:bg-surface-container-high rounded-full p-1.5 transition"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setVisibleMonth(
                  new Date(today.getFullYear(), today.getMonth(), 1),
                );
                setSelectedDate(today);
              }}
              className="text-on-surface hover:bg-surface-container-high rounded-lg px-2 py-1 text-xs font-bold transition"
            >
              {new Intl.DateTimeFormat(undefined, {
                month: "long",
                year: "numeric",
              }).format(visibleMonth)}
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="text-on-surface-variant hover:bg-surface-container-high rounded-full p-1.5 transition"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <span
                key={`${day}-${index}`}
                className="text-on-surface-variant py-1 text-[9px] font-bold"
              >
                {day}
              </span>
            ))}
            {monthDays.map((day) => {
              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
              const isToday = sameDay(day, new Date());
              const isSelected = selectedDate
                ? sameDay(day, selectedDate)
                : false;
              const hasEvents = eventDays.has(dateKey(day));

              return (
                <button
                  key={dateKey(day)}
                  type="button"
                  onClick={() => {
                    setSelectedDate(day);
                    if (!isCurrentMonth) {
                      setVisibleMonth(
                        new Date(day.getFullYear(), day.getMonth(), 1),
                      );
                    }
                  }}
                  aria-label={day.toLocaleDateString()}
                  className={`relative mx-auto grid size-8 place-items-center rounded-full text-[10px] font-semibold transition ${
                    isSelected
                      ? "bg-primary text-on-primary shadow-sm"
                      : isToday
                        ? "bg-primary/15 text-primary"
                        : isCurrentMonth
                          ? "text-on-surface hover:bg-surface-container-high"
                          : "text-on-surface-variant/35 hover:bg-surface-container-high"
                  }`}
                >
                  {day.getDate()}
                  {hasEvents && (
                    <span
                      className={`absolute bottom-0.5 size-1 rounded-full ${
                        isSelected ? "bg-on-primary" : "bg-primary"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <div>
              <p className="text-on-surface text-xs font-bold">
                {selectedDate
                  ? formatDay({ dateTime: selectedDate.toISOString() })
                  : "Upcoming"}
              </p>
              <p className="text-on-surface-variant text-[10px]">
                {visibleEvents.length} event
                {visibleEvents.length === 1 ? "" : "s"}
              </p>
            </div>
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-primary hover:bg-primary/5 rounded-lg px-2 py-1 text-[10px] font-semibold"
              >
                Upcoming
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {!isConnected || data?.notConnected ? (
              <div className="px-3 py-8 text-center">
                <CalendarDays className="text-on-surface-variant mx-auto mb-2 size-7 opacity-50" />
                <p className="text-on-surface text-xs font-semibold">
                  Calendar disconnected
                </p>
                <Link
                  href="/settings"
                  className="text-primary mt-2 inline-block text-xs font-semibold hover:underline"
                >
                  Connect Calendar
                </Link>
              </div>
            ) : isLoading ? (
              <div className="flex h-36 items-center justify-center">
                <div className="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent" />
              </div>
            ) : visibleEvents.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <CalendarDays className="text-on-surface-variant mx-auto mb-2 size-7 opacity-50" />
                <p className="text-on-surface text-xs font-semibold">
                  {selectedDate ? "No events this day" : "No upcoming events"}
                </p>
                <p className="text-on-surface-variant text-3xs mt-1">
                  Your schedule is clear.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleEvents.map((event, index) => {
                  const previousEvent = visibleEvents[index - 1];
                  const day = formatDay(event.start);
                  const showDay =
                    index === 0 || day !== formatDay(previousEvent?.start);

                  return (
                    <div key={event.id ?? `${day}-${index}`}>
                      {showDay && (
                        <p className="text-on-surface-variant mb-1.5 px-1 text-[10px] font-bold tracking-wide uppercase">
                          {day}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className="border-outline-variant bg-surface-container-low hover:border-primary/40 hover:bg-primary/5 w-full rounded-xl border p-3 text-left transition"
                      >
                        <span className="text-on-surface block truncate text-xs font-semibold">
                          {event.summary || "Untitled event"}
                        </span>
                        <span className="text-on-surface-variant mt-1 flex items-center gap-1 text-[10px]">
                          <Clock3 className="size-3" />
                          {formatTimeRange(event.start, event.end)}
                        </span>
                        {event.location && (
                          <span className="text-on-surface-variant mt-1 flex items-center gap-1 truncate text-[10px]">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="border-outline-variant bg-surface-container-lowest border-t p-3">
          <Link
            href="/calendar"
            className="text-primary hover:bg-primary/5 flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition"
          >
            Open full calendar <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </Card>

      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedEvent(null);
          }}
        >
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-event-title"
            className="border-outline-variant bg-surface-container relative w-full max-w-[28rem] space-y-5 rounded-3xl border p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              aria-label="Close event details"
              className="text-on-surface-variant hover:bg-surface-container-high absolute top-4 right-4 rounded-full p-1.5 transition"
            >
              <X className="size-4" />
            </button>

            <div className="pr-8">
              <p className="text-primary mb-1 text-[10px] font-bold tracking-wider uppercase">
                Calendar event
              </p>
              <h3
                id="calendar-event-title"
                className="text-on-surface font-serif text-xl font-bold"
              >
                {selectedEvent.summary || "Untitled event"}
              </h3>
            </div>

            <div className="text-on-surface-variant space-y-3 text-xs">
              <p className="flex items-start gap-2">
                <Clock3 className="text-primary mt-0.5 size-4 shrink-0" />
                <span>
                  {formatDay(selectedEvent.start)}
                  <br />
                  {formatTimeRange(selectedEvent.start, selectedEvent.end)}
                </span>
              </p>
              {selectedEvent.location && (
                <p className="flex items-start gap-2">
                  <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>{selectedEvent.location}</span>
                </p>
              )}
              {selectedEvent.attendees?.length ? (
                <p className="flex items-start gap-2">
                  <Users className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>{selectedEvent.attendees.length} attendee(s)</span>
                </p>
              ) : null}
            </div>

            {selectedEvent.description && (
              <div className="border-outline-variant border-t pt-4">
                <p className="text-on-surface-variant max-h-40 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap">
                  {selectedEvent.description}
                </p>
              </div>
            )}

            <div className="border-outline-variant flex justify-end border-t pt-4">
              <Link
                href="/calendar"
                className="bg-primary text-on-primary inline-flex h-9 items-center rounded-xl px-4 text-xs font-semibold"
              >
                View in Calendar
              </Link>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
