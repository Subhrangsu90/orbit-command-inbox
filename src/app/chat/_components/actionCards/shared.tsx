import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function formatActionDateTime(value?: string) {
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

export function formatEventTimeLine(event: { startTime?: string; endTime?: string }) {
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

export function extractUrls(...values: Array<string | undefined>) {
  const found = values
    .flatMap((value) => value?.match(/https?:\/\/[^\s)]+/g) ?? [])
    .map((url) => url.replace(/[.,;]+$/, ""));

  return Array.from(new Set(found));
}

export function ActionStatus({ success }: { success: boolean }) {
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

export function DetailRow({
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
