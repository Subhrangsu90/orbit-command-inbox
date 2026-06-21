"use client";

import type { ReactNode } from "react";
import {
  Send,
  Mail,
  Calendar,
  Search,
  Reply,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  FileText,
} from "lucide-react";
import type { CalendarActionEvent, ExecutedAction } from "../types";

function formatActionDateTime(value?: string) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatEventTimeLine(event: CalendarActionEvent) {
  const start = event.startTime ? new Date(event.startTime) : null;
  const end = event.endTime ? new Date(event.endTime) : null;

  if (!start || Number.isNaN(start.getTime())) return undefined;

  const datePart = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(start);
  const startPart = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(start);

  if (!end || Number.isNaN(end.getTime())) return `${datePart} • ${startPart}`;

  const endPart = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(end);

  return `${datePart} • ${startPart} - ${endPart}`;
}

function extractUrls(...values: Array<string | undefined>) {
  const found = values
    .flatMap((value) => value?.match(/https?:\/\/[^\s)]+/g) ?? [])
    .map((url) => url.replace(/[.,;]+$/, ""));

  return Array.from(new Set(found));
}

function ActionStatus({ success }: { success: boolean }) {
  return success ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-500 font-sans">
      <CheckCircle2 className="size-3.5" />
      Done
    </span>
  ) : (
    <span className="text-error inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold font-sans">
      <AlertCircle className="size-3.5" />
      Failed
    </span>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: ReactNode;
}) {
  if (!value) return null;

  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="text-on-surface-variant mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-on-surface-variant text-[10px] font-bold tracking-wider uppercase font-sans">
          {label}
        </p>
        <div className="text-body-sm text-on-surface min-w-0 break-words font-sans">
          {value}
        </div>
      </div>
    </div>
  );
}

function CalendarLinks({ event }: { event: CalendarActionEvent }) {
  const links = extractUrls(
    event.meetingLink,
    event.location,
    event.description,
  );

  if (!event.id && !event.calendarLink && links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {event.id && (
        <a
          href={`/calendar?eventId=${encodeURIComponent(event.id)}${event.calendarId ? `&calendarId=${encodeURIComponent(event.calendarId)}` : ""}`}
          className="bg-primary text-on-primary hover:bg-primary/90 inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition font-sans"
        >
          <span className="truncate">Open in Tacta Calendar</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      )}
      {event.calendarLink && (
        <a
          href={event.calendarLink}
          target="_blank"
          rel="noreferrer"
          className="border-outline-variant text-primary hover:bg-primary/10 inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition font-sans"
        >
          <span className="truncate">Open in Google Calendar</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      )}
      {links.map((link) => (
        <a
          key={link}
          href={link}
          target="_blank"
          rel="noreferrer"
          className="border-outline-variant text-primary hover:bg-primary/10 inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition font-sans"
        >
          <span className="truncate">
            {link === event.meetingLink ? "Open meeting" : "Open link"}
          </span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      ))}
    </div>
  );
}

export function CalendarActionCard({
  event,
  title,
  subtitle,
  success,
  tone = "violet",
  showLinks = true,
  warnings,
}: {
  event: CalendarActionEvent;
  title: string;
  subtitle?: string;
  success: boolean;
  tone?: "violet" | "blue" | "red" | "amber";
  showLinks?: boolean;
  warnings?: string[];
}) {
  const toneClass = {
    violet: "bg-violet-500/10 text-violet-500",
    blue: "bg-blue-500/10 text-blue-500",
    red: "bg-red-500/10 text-red-500",
    amber: "bg-amber-500/10 text-amber-500",
  }[tone];
  const timeLine = formatEventTimeLine(event);
  const hasDetails =
    event.location ||
    (event.attendees && event.attendees.length > 0) ||
    event.description ||
    (showLinks &&
      (event.id ||
        event.calendarLink ||
        extractUrls(event.meetingLink, event.location, event.description)
          .length > 0));

  return (
    <div className="border-outline-variant/60 bg-surface-container-highest overflow-hidden rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <div className={`shrink-0 rounded-xl p-2 ${toneClass}`}>
          <Calendar className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-label-lg text-on-surface truncate font-semibold font-sans">
            {event.summary || title}
          </h4>
          {timeLine && (
            <p className="text-body-sm text-on-surface-variant mt-0.5 flex items-center gap-1.5 font-sans">
              <Clock className="size-3.5 shrink-0" />
              <span>{timeLine}</span>
            </p>
          )}
          {subtitle && (
            <p className="text-body-sm text-on-surface-variant mt-0.5 font-sans">
              {subtitle}
            </p>
          )}
        </div>
        <ActionStatus success={success} />
      </div>

      {warnings && warnings.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-500/10 p-3">
          {warnings.map((warning, index) => (
            <p
              key={index}
              className="text-body-sm flex items-start gap-1.5 text-amber-600 font-sans dark:text-amber-500"
            >
              <span aria-hidden>⚠️</span>
              <span>{warning}</span>
            </p>
          ))}
        </div>
      )}

      {hasDetails && (
        <div className="mt-3 space-y-3">
          {(event.location ||
            (event.attendees && event.attendees.length > 0)) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow
                icon={<MapPin className="size-4" />}
                label="Location"
                value={event.location}
              />
              <DetailRow
                icon={<Users className="size-4" />}
                label="Invitees"
                value={event.attendees?.join(", ")}
              />
            </div>
          )}
          {event.description && (
            <div>
              <p className="text-on-surface-variant mb-1 text-[10px] font-bold tracking-wider uppercase font-sans">
                Description
              </p>
              <p className="text-body-sm text-on-surface whitespace-pre-wrap font-sans">
                {event.description}
              </p>
            </div>
          )}
          {showLinks && <CalendarLinks event={event} />}
        </div>
      )}
    </div>
  );
}

export function CalendarListCard({
  count,
  events,
}: {
  count: number;
  events?: CalendarActionEvent[];
}) {
  const hasEvents = events && events.length > 0;

  return (
    <div className="border-outline-variant/60 bg-surface-container-highest overflow-hidden rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-xl bg-amber-500/10 p-2 text-amber-500">
          <Calendar className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-label-lg text-on-surface font-semibold font-sans">
            Listed Events
          </h4>
          <p className="text-body-sm text-on-surface-variant font-sans">
            Found {count} upcoming {count === 1 ? "event" : "events"}
          </p>
        </div>
        <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
      </div>

      {hasEvents && (
        <div className="border-outline-variant/30 mt-4 divide-y divide-outline-variant/30 overflow-hidden rounded-xl border">
          {events.slice(0, 5).map((event, index) => (
            <div
              key={event.id ?? `${event.summary}-${index}`}
              className="space-y-2 px-3 py-3"
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-label-md text-on-surface truncate font-semibold font-sans">
                    {event.summary || "Untitled event"}
                  </p>
                  {formatEventTimeLine(event) && (
                    <p className="text-body-sm text-on-surface-variant mt-0.5 flex items-center gap-1.5 font-sans">
                      <Clock className="size-3.5 shrink-0" />
                      <span>{formatEventTimeLine(event)}</span>
                    </p>
                  )}
                </div>
              </div>
              {(event.description || event.attendees?.length) && (
                <div className="text-on-surface-variant grid gap-1 text-xs font-sans">
                  {event.description && (
                    <p className="line-clamp-2">{event.description}</p>
                  )}
                  {event.attendees && event.attendees.length > 0 && (
                    <p>Invitees: {event.attendees.join(", ")}</p>
                  )}
                </div>
              )}
              <CalendarLinks event={event} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActionCard({ action }: { action: ExecutedAction }) {
  switch (action.type) {
    case "send_email": {
      const hasBody = !!action.body;
      return (
        <div className="border-outline-variant/60 bg-surface-container-highest overflow-hidden rounded-2xl border p-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-xl bg-blue-500/10 p-2 text-blue-500">
              <Send className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-label-lg text-on-surface font-semibold font-sans">
                Email sent
              </h4>
              <p className="text-body-sm text-on-surface-variant mt-0.5 truncate font-sans">
                To: {action.to} • {action.subject}
              </p>
            </div>
            <ActionStatus success={action.success} />
          </div>

          {hasBody && (
            <div className="mt-3 space-y-3">
              <div className="grid gap-2">
                <DetailRow
                  icon={<Mail className="size-4" />}
                  label="To"
                  value={action.to}
                />
                <DetailRow
                  icon={<FileText className="size-4" />}
                  label="Subject"
                  value={action.subject}
                />
              </div>
              <p className="text-body-sm text-on-surface whitespace-pre-wrap font-sans">
                {action.body}
              </p>
            </div>
          )}
        </div>
      );
    }

    case "create_email_draft": {
      return (
        <div className="border-primary/30 bg-surface-container-highest overflow-hidden rounded-2xl border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary shrink-0 rounded-xl p-2">
              <Mail className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-label-lg text-on-surface font-semibold font-sans">
                Email draft ready
              </h4>
              <p className="text-body-sm text-on-surface-variant mt-0.5 truncate font-sans">
                To: {action.to} • {action.subject}
              </p>
            </div>
            <ActionStatus success={action.success} />
          </div>

          <div className="mt-3 space-y-3">
            <div className="grid gap-2">
              <DetailRow
                icon={<Mail className="size-4" />}
                label="From"
                value={
                  action.senderName && action.senderEmail
                    ? `${action.senderName} <${action.senderEmail}>`
                    : (action.senderEmail ??
                      action.senderName ??
                      "Connected Gmail account")
                }
              />
              <DetailRow
                icon={<Mail className="size-4" />}
                label="To"
                value={action.to}
              />
              <DetailRow
                icon={<FileText className="size-4" />}
                label="Subject"
                value={action.subject}
              />
            </div>
            <p className="text-body-sm text-on-surface whitespace-pre-wrap font-sans">
              {action.body}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-on-surface-variant text-[11px] font-sans">
                Draft ID: {action.draftId}
              </span>
              <a
                href={action.mailLink ?? "/mail?mailbox=drafts"}
                className="text-primary hover:bg-primary/10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition font-sans"
              >
                {action.messageId ? "Open draft" : "Open drafts"}
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      );
    }

    case "reply_to_email":
      return (
        <div className="border-outline-variant/60 bg-surface-container-highest flex items-center gap-3 overflow-hidden rounded-2xl border p-4">
          <div className="shrink-0 rounded-xl bg-indigo-500/10 p-2 text-indigo-500">
            <Reply className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-label-lg text-on-surface font-semibold font-sans">
              Sent Reply
            </h4>
            <p className="text-body-sm text-on-surface-variant truncate font-sans">
              Thread ID: {action.id}
            </p>
          </div>
          <ActionStatus success={action.success} />
        </div>
      );

    case "create_calendar_event": {
      const event = action.event ?? {
        id: action.eventId,
        summary: action.summary,
        startTime: action.startTime,
        endTime: action.endTime,
        description: action.description,
        location: action.location,
        attendees: action.attendees,
        calendarLink: action.calendarLink,
        meetingLink: action.meetingLink,
      };

      return (
        <CalendarActionCard
          event={event}
          title="Calendar event"
          subtitle=""
          success={action.success}
          tone="violet"
          warnings={action.warnings}
        />
      );
    }
    case "update_calendar_event": {
      const event = action.event ?? {
        id: action.eventId,
        summary: action.summary,
        startTime: action.startTime,
        endTime: action.endTime,
        description: action.description,
        location: action.location,
        attendees: action.attendees,
      };

      return (
        <CalendarActionCard
          event={event}
          title="Updated event"
          subtitle="Calendar event updated"
          success={action.success}
          tone="blue"
          warnings={action.warnings}
        />
      );
    }
    case "delete_calendar_event": {
      const event = action.event ?? {
        id: action.eventId,
        summary: action.summary,
        startTime: action.startTime,
        endTime: action.endTime,
        description: action.description,
        location: action.location,
        attendees: action.attendees,
        calendarLink: action.calendarLink,
        meetingLink: action.meetingLink,
      };
      return (
        <CalendarActionCard
          event={event}
          title="Deleted event"
          success={action.success}
          tone="red"
        />
      );
    }
    case "search_emails":
      return (
        <div className="border-outline-variant/60 bg-surface-container-highest flex items-center gap-3 overflow-hidden rounded-2xl border p-4">
          <div className="shrink-0 rounded-xl bg-teal-500/10 p-2 text-teal-500">
            <Search className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-label-lg text-on-surface font-semibold font-sans">
              Queried Emails
            </h4>
            <p className="text-body-sm text-on-surface-variant truncate font-sans">
              {action.query ? `Query: "${action.query}"` : "All Inbox"} • Found {action.count} results
            </p>
          </div>
          <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
        </div>
      );

    case "list_events":
      return <CalendarListCard count={action.count} events={action.events} />;
    default:
      return null;
  }
}
