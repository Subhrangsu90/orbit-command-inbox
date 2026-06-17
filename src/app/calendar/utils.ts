// --- Calendar Categories & Colors ---
export const CALENDAR_COLORS = {
  blue: {
    pill: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    block: "border-l-4 border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 border border-outline-variant/30 text-blue-700 dark:text-blue-300",
    border: "border-blue-500",
    checkbox: "text-blue-500 focus:ring-blue-500 border-blue-500",
    dot: "bg-blue-500",
  },
  green: {
    pill: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    block: "border-l-4 border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 border border-outline-variant/30 text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500",
    checkbox: "text-emerald-500 focus:ring-emerald-500 border-emerald-500",
    dot: "bg-emerald-500",
  },
  forest: {
    pill: "bg-green-600/10 hover:bg-green-600/20 text-green-700 dark:text-green-400 border border-green-600/20",
    block: "border-l-4 border-green-600 bg-green-600/5 hover:bg-green-600/10 border border-outline-variant/30 text-green-800 dark:text-green-300",
    border: "border-green-600",
    checkbox: "text-green-600 focus:ring-green-600 border-green-600",
    dot: "bg-green-600",
  },
  indigo: {
    pill: "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    block: "border-l-4 border-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 border border-outline-variant/30 text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-500",
    checkbox: "text-indigo-500 focus:ring-indigo-500 border-indigo-500",
    dot: "bg-indigo-500",
  },
  teal: {
    pill: "bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/20",
    block: "border-l-4 border-teal-500 bg-teal-500/5 hover:bg-teal-500/10 border border-outline-variant/30 text-teal-700 dark:text-teal-300",
    border: "border-teal-500",
    checkbox: "text-teal-500 focus:ring-teal-500 border-teal-500",
    dot: "bg-teal-500",
  },
  sky: {
    pill: "bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20",
    block: "border-l-4 border-sky-500 bg-sky-500/5 hover:bg-sky-500/10 border border-outline-variant/30 text-sky-700 dark:text-sky-300",
    border: "border-sky-500",
    checkbox: "text-sky-500 focus:ring-sky-500 border-sky-500",
    dot: "bg-sky-500",
  },
  rose: {
    pill: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    block: "border-l-4 border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border border-outline-variant/30 text-rose-700 dark:text-rose-300",
    border: "border-rose-500",
    checkbox: "text-rose-500 focus:ring-rose-500 border-rose-500",
    dot: "bg-rose-500",
  },
  orange: {
    pill: "bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20",
    block: "border-l-4 border-orange-500 bg-orange-500/5 hover:bg-orange-500/10 border border-outline-variant/30 text-orange-700 dark:text-orange-300",
    border: "border-orange-500",
    checkbox: "text-orange-500 focus:ring-orange-500 border-orange-500",
    dot: "bg-orange-500",
  },
} as const;

// --- Date Utilities ---
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const sameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

export const eventDate = (time?: { date?: string; dateTime?: string }) => {
  if (time?.dateTime) return new Date(time.dateTime);
  if (time?.date) {
    const [y, m, d] = time.date.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  return null;
};

export function parseEvent(ev: any) {
  const start = eventDate(ev.start);
  let end = eventDate(ev.end);
  const isAllDay = !!(ev.start?.date && !ev.start?.dateTime);
  if (start && end && isAllDay) {
    // subtract 1 sec to make exclusive end date inclusive for date comparisons
    end = new Date(end.getTime() - 1000);
  }
  return { start, end, isAllDay };
}

export const formatRangeLabel = (currentDate: Date, viewMode: "day" | "week" | "month" | "year") => {
  const opt: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };
  if (viewMode === "month") return currentDate.toLocaleDateString("en-US", opt);
  if (viewMode === "year") return currentDate.getFullYear().toString();
  if (viewMode === "week") {
    const sun = new Date(currentDate);
    sun.setDate(currentDate.getDate() - currentDate.getDay());
    const sat = new Date(sun);
    sat.setDate(sun.getDate() + 6);
    if (sun.getMonth() === sat.getMonth()) {
      return `${sun.toLocaleDateString("en-US", { month: "short" })} ${sun.getDate()} – ${sat.getDate()}, ${sat.getFullYear()}`;
    } else {
      return `${sun.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sat.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${sat.getFullYear()}`;
    }
  }
  return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
};

export const formatTimeRange = (start: any, end: any) => {
  if (!start) return "";
  const sDate = start.dateTime ? new Date(start.dateTime) : new Date(start.date);
  const eDate = end ? (end.dateTime ? new Date(end.dateTime) : new Date(end.date)) : null;

  const isAllDay = start.date && !start.dateTime;
  if (isAllDay) return "All day";

  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  if (eDate) {
    if (sameDay(sDate, eDate)) {
      return `${sDate.toLocaleTimeString("en-US", options)} – ${eDate.toLocaleTimeString("en-US", options)}`;
    } else {
      return `${sDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${sDate.toLocaleTimeString("en-US", options)} – ${eDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${eDate.toLocaleTimeString("en-US", options)}`;
    }
  }
  return sDate.toLocaleTimeString("en-US", options);
};

export const getResponseBadgeClass = (status?: string) => {
  switch (status) {
    case "accepted":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
    case "declined":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
    case "tentative":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20";
  }
};
