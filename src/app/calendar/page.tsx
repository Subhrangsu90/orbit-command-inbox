"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  Edit,
  X,
  RefreshCw,
  AlertCircle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  CalendarRange,
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { useWorkspacePreferences } from "~/app/_components/workspacePreferencesContext";
import { api } from "~/trpc/react";
import { Card } from "~/app/_components/ui/card";
import { Button } from "~/app/_components/ui/button";

// --- Date Utilities ---
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const sameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const eventDate = (time?: { date?: string; dateTime?: string }) => {
  if (time?.dateTime) return new Date(time.dateTime);
  if (time?.date) {
    const [y, m, d] = time.date.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  return null;
};

function parseEvent(ev: any) {
  const start = eventDate(ev.start);
  let end = eventDate(ev.end);
  const isAllDay = !!(ev.start?.date && !ev.start?.dateTime);
  if (start && end && isAllDay) {
    // subtract 1 sec to make exclusive end date inclusive for date comparisons
    end = new Date(end.getTime() - 1000);
  }
  return { start, end, isAllDay };
}

export default function CalendarPage() {
  const { preferences } = useWorkspacePreferences();
  const { data: connections, isLoading: isLoadingConnections } = api.corsair.getConnections.useQuery();
  const isConnected = !!connections?.googlecalendar;

  // View settings
  const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "year">("month");
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState("");

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic timeMin based on current date and view
  const viewRangeTimeMin = useMemo(() => {
    const date = new Date(currentDate);
    if (viewMode === "year") {
      return new Date(date.getFullYear(), 0, 1).toISOString();
    }
    if (viewMode === "month") {
      // Start of month minus 7 days buffer for week alignment
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      firstDay.setDate(firstDay.getDate() - 7);
      return firstDay.toISOString();
    }
    if (viewMode === "week") {
      const day = date.getDay();
      const sunday = new Date(date);
      sunday.setDate(date.getDate() - day);
      sunday.setHours(0, 0, 0, 0);
      return sunday.toISOString();
    }
    // Day view
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay.toISOString();
  }, [currentDate, viewMode]);

  // Calendar query
  const { data: calendarData, isLoading: isLoadingEvents, refetch } = api.calendar.list.useQuery(
    {
      q: searchQuery || undefined,
      maxResults: 100,
      timeMin: searchQuery ? undefined : viewRangeTimeMin,
    },
    { enabled: isConnected }
  );

  const isCalConnected = isConnected && !calendarData?.notConnected;
  const events = calendarData?.events ?? [];

  // Selection & Form states
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form inputs
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTimeInput, setStartTimeInput] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTimeInput, setEndTimeInput] = useState("");
  const [attendeesInput, setAttendeesInput] = useState(""); // comma separated emails

  // Mutations
  const createMutation = api.calendar.create.useMutation({
    onSuccess: () => {
      setIsCreateOpen(false);
      resetForm();
      void refetch();
    },
  });

  const updateMutation = api.calendar.update.useMutation({
    onSuccess: () => {
      setIsEditOpen(false);
      resetForm();
      void refetch();
    },
  });

  const deleteMutation = api.calendar.delete.useMutation({
    onSuccess: () => {
      setSelectedEventId(null);
      void refetch();
    },
  });

  // Helper: Reset form
  const resetForm = () => {
    setSummary("");
    setDescription("");
    setLocation("");
    setStartDate("");
    setStartTimeInput("");
    setEndDate("");
    setEndTimeInput("");
    setAttendeesInput("");
  };

  // Helper: Pre-fill form for Edit
  const openEditModal = (event: any) => {
    setSummary(event.summary ?? "");
    setDescription(event.description ?? "");
    setLocation(event.location ?? "");

    // Parse start date & time
    if (event.start?.dateTime) {
      const dt = new Date(event.start.dateTime);
      setStartDate(dt.toISOString().split("T")[0] ?? "");
      setStartTimeInput(dt.toTimeString().split(" ")[0]?.substring(0, 5) ?? "");
    } else if (event.start?.date) {
      setStartDate(event.start.date);
      setStartTimeInput("09:00");
    }

    // Parse end date & time
    if (event.end?.dateTime) {
      const dt = new Date(event.end.dateTime);
      setEndDate(dt.toISOString().split("T")[0] ?? "");
      setEndTimeInput(dt.toTimeString().split(" ")[0]?.substring(0, 5) ?? "");
    } else if (event.end?.date) {
      setEndDate(event.end.date);
      setEndTimeInput("10:00");
    }

    const atts = event.attendees?.map((a: any) => a.email).join(", ") ?? "";
    setAttendeesInput(atts);
    setIsEditOpen(true);
  };

  // Submit handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary || !startDate || !startTimeInput || !endDate || !endTimeInput) return;

    const startISO = new Date(`${startDate}T${startTimeInput}:00`).toISOString();
    const endISO = new Date(`${endDate}T${endTimeInput}:00`).toISOString();
    const attendees = attendeesInput
      ? attendeesInput.split(",").map((email) => email.trim()).filter(Boolean)
      : [];

    createMutation.mutate({
      summary,
      description: description || undefined,
      location: location || undefined,
      startTime: startISO,
      endTime: endISO,
      attendees: attendees.length > 0 ? attendees : undefined,
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !summary || !startDate || !startTimeInput || !endDate || !endTimeInput) return;

    const startISO = new Date(`${startDate}T${startTimeInput}:00`).toISOString();
    const endISO = new Date(`${endDate}T${endTimeInput}:00`).toISOString();
    const attendees = attendeesInput
      ? attendeesInput.split(",").map((email) => email.trim()).filter(Boolean)
      : [];

    updateMutation.mutate({
      id: selectedEventId,
      summary,
      description: description || undefined,
      location: location || undefined,
      startTime: startISO,
      endTime: endISO,
      attendees: attendees.length > 0 ? attendees : undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Autofocus scrolling to 7 AM on view mode change
  useEffect(() => {
    if (scrollContainerRef.current && (viewMode === "week" || viewMode === "day")) {
      scrollContainerRef.current.scrollTop = 7 * 64; // 64px per hour slot
    }
  }, [viewMode]);

  // Keyboard navigation: J/K for navigating range, C for create, R for refresh, T for today
  useEffect(() => {
    if (!isCalConnected || isCreateOpen || isEditOpen) return;

    function matchShortcut(e: KeyboardEvent, shortcutStr: string): boolean {
      if (!shortcutStr) return false;
      const parts = shortcutStr.toLowerCase().split("+");
      const hasCtrl = parts.includes("ctrl");
      const hasAlt = parts.includes("alt");
      const hasShift = parts.includes("shift");
      
      const mainKey = parts.find((p) => !["ctrl", "alt", "shift"].includes(p));
      if (!mainKey) return false;
      
      const eventCtrl = e.ctrlKey || e.metaKey;
      const eventAlt = e.altKey;
      const eventShift = e.shiftKey;
      
      if (eventCtrl !== hasCtrl) return false;
      if (eventAlt !== hasAlt) return false;
      if (eventShift !== hasShift) return false;
      
      const eventKey = e.key.toLowerCase();
      if (mainKey === "enter" && eventKey === "enter") return true;
      if (mainKey === "escape" && eventKey === "escape") return true;
      if (mainKey === "space" && eventKey === " ") return true;
      if (mainKey === "arrowdown" && eventKey === "arrowdown") return true;
      if (mainKey === "arrowup" && eventKey === "arrowup") return true;
      if (mainKey === "arrowleft" && eventKey === "arrowleft") return true;
      if (mainKey === "arrowright" && eventKey === "arrowright") return true;
      
      return eventKey === mainKey;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        if (e.key === "Escape") {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (matchShortcut(e, preferences.shortcutCalendarPrev || "j")) {
        e.preventDefault();
        handlePrev();
      } else if (matchShortcut(e, preferences.shortcutCalendarNext || "k")) {
        e.preventDefault();
        handleNext();
      } else if (matchShortcut(e, preferences.shortcutCalendarCreate || "c")) {
        e.preventDefault();
        resetForm();
        // Fill form with current date
        const dateStr = dateKey(currentDate);
        setStartDate(dateStr);
        setEndDate(dateStr);
        setStartTimeInput("09:00");
        setEndTimeInput("10:00");
        setIsCreateOpen(true);
      } else if (matchShortcut(e, preferences.shortcutCalendarRefresh || "r")) {
        e.preventDefault();
        void refetch();
      } else if (matchShortcut(e, preferences.shortcutCalendarToday || "t")) {
        e.preventDefault();
        handleToday();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isCalConnected,
    isCreateOpen,
    isEditOpen,
    viewMode,
    currentDate,
    preferences.shortcutCalendarPrev,
    preferences.shortcutCalendarNext,
    preferences.shortcutCalendarCreate,
    preferences.shortcutCalendarRefresh,
    preferences.shortcutCalendarToday,
  ]);

  const selectedEvent = events.find((ev) => ev.id === selectedEventId);

  // Range Navigation Helpers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const nd = new Date(prev);
      if (viewMode === "month") nd.setMonth(prev.getMonth() - 1);
      else if (viewMode === "week") nd.setDate(prev.getDate() - 7);
      else if (viewMode === "day") nd.setDate(prev.getDate() - 1);
      else if (viewMode === "year") nd.setFullYear(prev.getFullYear() - 1);
      return nd;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const nd = new Date(prev);
      if (viewMode === "month") nd.setMonth(prev.getMonth() + 1);
      else if (viewMode === "week") nd.setDate(prev.getDate() + 7);
      else if (viewMode === "day") nd.setDate(prev.getDate() + 1);
      else if (viewMode === "year") nd.setFullYear(prev.getFullYear() + 1);
      return nd;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Click handler for empty day cells or hour slots
  const handleCellClick = (date: Date) => {
    resetForm();
    const dateStr = dateKey(date);
    setStartDate(dateStr);
    setEndDate(dateStr);
    setStartTimeInput("09:00");
    setEndTimeInput("10:00");
    setIsCreateOpen(true);
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    resetForm();
    const dateStr = dateKey(date);
    setStartDate(dateStr);
    setEndDate(dateStr);
    setStartTimeInput(`${String(hour).padStart(2, "0")}:00`);
    setEndTimeInput(`${String((hour + 1) % 24).padStart(2, "0")}:00`);
    setIsCreateOpen(true);
  };

  // Formatter helpers
  const formatRangeLabel = () => {
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

  const formatTimeRange = (start: any, end: any) => {
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

  const getResponseBadgeClass = (status?: string) => {
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

  // Event list computations for rendering views
  const parsedEvents = useMemo(() => {
    return events.map((ev) => ({
      ...ev,
      parsed: parseEvent(ev),
    }));
  }, [events]);

  const monthGridDays = useMemo(() => {
    const yr = currentDate.getFullYear();
    const mo = currentDate.getMonth();
    const firstDay = new Date(yr, mo, 1);
    const startOffset = firstDay.getDay();
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const weekGridDays = useMemo(() => {
    const sun = new Date(currentDate);
    sun.setDate(currentDate.getDate() - currentDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sun);
      d.setDate(sun.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Event filters per date
  const getEventsForDate = (date: Date) => {
    return parsedEvents.filter((ev) => {
      const { start, end, isAllDay } = ev.parsed;
      if (!start) return false;
      if (isAllDay) {
        const targetStr = dateKey(date);
        const startStr = dateKey(start);
        if (end) {
          const endStr = dateKey(end);
          return targetStr >= startStr && targetStr <= endStr;
        }
        return targetStr === startStr;
      }
      return sameDay(start, date);
    });
  };

  // Helper to resolve overlapping absolute columns for Day/Week view
  const getTimedEventsWithLayout = (date: Date) => {
    const dayEvents = parsedEvents
      .filter((ev) => {
        const { start, isAllDay } = ev.parsed;
        return start && !isAllDay && sameDay(start, date);
      })
      .sort((a, b) => a.parsed.start!.getTime() - b.parsed.start!.getTime());

    const columns: typeof dayEvents[] = [];

    dayEvents.forEach((ev) => {
      const start = ev.parsed.start!.getTime();
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i]!;
        const lastEv = col[col.length - 1]!;
        const lastEnd = lastEv.parsed.end!.getTime();
        if (start >= lastEnd) {
          col.push(ev);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([ev]);
      }
    });

    const results: { event: any; colIdx: number; totalCols: number }[] = [];
    columns.forEach((col, colIdx) => {
      col.forEach((ev) => {
        results.push({
          event: ev,
          colIdx,
          totalCols: columns.length,
        });
      });
    });

    return results;
  };

  const getAllDayEvents = (date: Date) => {
    return parsedEvents.filter((ev) => {
      const { start, isAllDay } = ev.parsed;
      return start && isAllDay && sameDay(start, date);
    });
  };

  return (
    <WorkspaceLayout wide={true}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Calendar Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl border border-primary/20 shadow-sm">
              <CalendarRange className="size-6 text-primary" />
            </div>
            <div>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-on-surface">
                Command Calendar
              </h2>
              <p className="text-xs text-on-surface-variant/85">
                Organize schedules, meetings, and events seamlessly.
              </p>
            </div>
          </div>

          {isCalConnected && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 md:w-56 h-9 pl-8 pr-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
                <Search className="absolute left-2.5 top-2.5 size-4 text-on-surface-variant/60" />
              </div>

              {/* View Selector Pills */}
              <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant">
                {(["day", "week", "month", "year"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 text-2xs font-semibold rounded-lg capitalize transition-all ${
                      viewMode === mode
                        ? "bg-primary text-on-primary shadow-sm scale-100"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
                <button
                  onClick={handlePrev}
                  className="p-2 hover:bg-surface-container-high border-r border-outline-variant text-on-surface-variant hover:text-on-surface transition"
                  title="Previous range"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={handleToday}
                  className="px-3 py-2 text-2xs font-bold hover:bg-surface-container-high text-on-surface transition"
                >
                  Today
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 hover:bg-surface-container-high border-l border-outline-variant text-on-surface-variant hover:text-on-surface transition"
                  title="Next range"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                  className="h-9 px-3 rounded-xl border border-outline-variant hover:bg-surface-container"
                >
                  <RefreshCw className="size-4 mr-1.5" /> Refresh
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    // Fill form with current date
                    const dateStr = dateKey(currentDate);
                    setStartDate(dateStr);
                    setEndDate(dateStr);
                    setStartTimeInput("09:00");
                    setEndTimeInput("10:00");
                    setIsCreateOpen(true);
                  }}
                  className="h-9 px-3 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="size-4" /> New Event
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* View Range Label */}
        {isCalConnected && (
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-on-surface tracking-tight">
              {formatRangeLabel()}
            </h3>
            {searchQuery && (
              <span className="text-2xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-medium">
                Search matches
              </span>
            )}
          </div>
        )}

        {/* Main Calendar Content */}
        {isLoadingConnections ? (
          <div className="flex h-96 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-lowest">
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-on-surface-variant">Checking calendar connection...</p>
            </div>
          </div>
        ) : !isCalConnected ? (
          <div className="p-12 border border-dashed border-outline-variant bg-surface-container-lowest rounded-2xl flex flex-col items-center justify-center text-center max-w-[32rem] mx-auto mt-12">
            <div className="relative mb-4">
              <CalendarDays className="size-12 text-on-surface-variant opacity-60" />
              <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-surface-container-lowest">
                <AlertCircle className="size-4 text-warning" />
              </span>
            </div>
            <p className="font-semibold text-sm text-on-surface">Google Calendar Disconnected</p>
            <p className="text-xs text-on-surface-variant mt-1 max-w-[24rem]">
              Connect your Google Calendar in settings to view, schedule, and sync invites seamlessly.
            </p>
            <Link
              href="/settings"
              className="mt-4 inline-flex bg-primary text-on-primary hover:bg-primary-container px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Settings
            </Link>
          </div>
        ) : isLoadingEvents ? (
          <div className="flex h-96 items-center justify-center bg-surface-container-lowest border border-outline-variant rounded-2xl">
            <div className="flex flex-col items-center gap-2">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-on-surface-variant">Loading schedule...</p>
            </div>
          </div>
        ) : (
          <div className="transition-all duration-200">
            {/* MONTH VIEW */}
            {viewMode === "month" && (
              <div className="grid grid-cols-7 border-t border-l border-outline-variant/60 rounded-t-2xl overflow-hidden shadow-sm">
                {/* Day of Week Headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="p-3 text-center text-2xs font-bold text-on-surface-variant bg-surface-container-low border-r border-b border-outline-variant/60"
                  >
                    {day}
                  </div>
                ))}

                {/* Day Cells */}
                {monthGridDays.map((day, idx) => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = sameDay(day, new Date());
                  const dayEvents = getEventsForDate(day);
                  const isFirstRow = idx < 7;

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[110px] p-2 bg-surface-container-lowest border-r border-b border-outline-variant/60 flex flex-col justify-between group transition hover:bg-surface-container-lowest/70 relative ${
                        !isCurrentMonth ? "bg-surface-container-low/20" : ""
                      }`}
                    >
                      {/* Day Number and Cell Actions */}
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-2xs font-bold flex items-center justify-center rounded-full size-6 ${
                            isToday
                              ? "bg-primary text-on-primary"
                              : isCurrentMonth
                              ? "text-on-surface"
                              : "text-on-surface-variant/40"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        <button
                          onClick={() => handleCellClick(day)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-primary hover:bg-primary/5 border border-outline-variant/40 transition"
                          title="Schedule event"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      {/* Day Event Pills */}
                      <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px] pr-0.5 custom-scrollbar">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const isAllDay = ev.parsed.isAllDay;
                          return (
                            <div
                              key={ev.id}
                              onClick={() => setSelectedEventId(ev.id ?? null)}
                              className={`px-1.5 py-0.5 text-[10px] rounded font-medium truncate cursor-pointer transition border border-transparent ${
                                isAllDay
                                  ? "bg-primary-container/40 text-on-primary-container hover:bg-primary-container/60"
                                  : "bg-surface-container hover:border-primary/30 text-on-surface hover:bg-surface-container-high"
                              }`}
                              title={ev.summary || "(No Title)"}
                            >
                              {ev.summary || "(No Title)"}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div
                            onClick={() => {
                              setCurrentDate(day);
                              setViewMode("day");
                            }}
                            className="text-[10px] text-primary font-bold cursor-pointer hover:underline pl-1"
                          >
                            + {dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* WEEK VIEW */}
            {viewMode === "week" && (
              <div className="border border-outline-variant/60 rounded-2xl overflow-hidden shadow-sm bg-surface-container-lowest">
                {/* Header Row */}
                <div className="grid grid-cols-[64px_repeat(7,_1fr)] border-b border-outline-variant/60 bg-surface-container-low">
                  <div className="border-r border-outline-variant/60"></div>
                  {weekGridDays.map((day) => {
                    const isToday = sameDay(day, new Date());
                    const allDayEvents = getAllDayEvents(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className="p-3 text-center border-r border-outline-variant/60 flex flex-col items-center justify-between min-h-[64px]"
                      >
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                          {day.toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span
                          className={`text-sm font-bold flex items-center justify-center rounded-full size-7 mt-1 ${
                            isToday ? "bg-primary text-on-primary" : "text-on-surface"
                          }`}
                        >
                          {day.getDate()}
                        </span>

                        {/* All-Day Items */}
                        {allDayEvents.length > 0 && (
                          <div className="w-full mt-2 space-y-1">
                            {allDayEvents.map((ev) => (
                              <div
                                key={ev.id}
                                onClick={() => setSelectedEventId(ev.id ?? null)}
                                className="w-full px-1.5 py-0.5 text-[9px] rounded font-bold bg-primary-container text-on-primary-container truncate cursor-pointer hover:opacity-90"
                                title={ev.summary}
                              >
                                {ev.summary || "(All Day)"}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Timeline Grid (Scrollable) */}
                <div
                  ref={scrollContainerRef}
                  className="max-h-[600px] overflow-y-auto grid grid-cols-[64px_repeat(7,_1fr)] relative"
                >
                  {/* Hours Label Axis */}
                  <div className="bg-surface-container-low border-r border-outline-variant/60 select-none">
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={hour}
                        className="h-16 pr-2 text-right text-[10px] text-on-surface-variant/60 font-medium pt-1 border-b border-outline-variant/20"
                      >
                        {hour === 0 ? "" : hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {weekGridDays.map((day) => {
                    const timedEvents = getTimedEventsWithLayout(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className="relative border-r border-outline-variant/60 h-[1536px]" // 24 hours * 64px
                      >
                        {/* Hour slot background lines */}
                        {Array.from({ length: 24 }).map((_, hour) => (
                          <div
                            key={hour}
                            onClick={() => handleTimeSlotClick(day, hour)}
                            className="h-16 border-b border-outline-variant/20 hover:bg-surface-container/20 cursor-pointer transition-colors"
                          />
                        ))}

                        {/* Absolute positioned Events */}
                        {timedEvents.map(({ event, colIdx, totalCols }) => {
                          const { start, end } = event.parsed;
                          if (!start || !end) return null;

                          const startHour = start.getHours() + start.getMinutes() / 60;
                          const endHour = end.getHours() + end.getMinutes() / 60;
                          const duration = Math.max(0.5, endHour - startHour);

                          return (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEventId(event.id ?? null);
                              }}
                              className="absolute p-1.5 rounded-lg border-l-4 border-primary bg-primary/5 hover:bg-primary/10 border border-outline-variant/30 text-left overflow-hidden cursor-pointer transition-all shadow-sm z-10 hover:z-20"
                              style={{
                                top: `${startHour * 64}px`,
                                height: `${duration * 64}px`,
                                left: `${(colIdx / totalCols) * 100}%`,
                                width: `${(1 / totalCols) * 98}%`,
                              }}
                            >
                              <p className="text-[10px] font-bold text-on-surface truncate">
                                {event.summary || "(No Title)"}
                              </p>
                              <p className="text-[8px] text-on-surface-variant font-medium mt-0.5 flex items-center gap-0.5">
                                <Clock className="size-2" />
                                {formatTimeRange(event.start, event.end)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DAY VIEW */}
            {viewMode === "day" && (
              <div className="border border-outline-variant/60 rounded-2xl overflow-hidden shadow-sm bg-surface-container-lowest max-w-3xl mx-auto">
                {/* Header Row */}
                <div className="grid grid-cols-[64px_1fr] border-b border-outline-variant/60 bg-surface-container-low">
                  <div className="border-r border-outline-variant/60"></div>
                  <div className="p-4 flex items-center justify-between min-h-[64px]">
                    <div className="text-left">
                      <p className="text-2xs font-bold text-on-surface-variant uppercase tracking-wider">
                        {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
                      </p>
                      <h4 className="text-lg font-serif font-bold text-on-surface mt-0.5">
                        {currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </h4>
                    </div>

                    {/* All day items */}
                    {getAllDayEvents(currentDate).length > 0 && (
                      <div className="flex flex-wrap gap-2 max-w-[50%]">
                        {getAllDayEvents(currentDate).map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => setSelectedEventId(ev.id ?? null)}
                            className="px-2.5 py-1 text-[10px] rounded-full font-bold bg-primary-container text-on-primary-container cursor-pointer hover:opacity-90 shadow-sm"
                          >
                            All-Day: {ev.summary || "(No Title)"}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Grid (Scrollable) */}
                <div
                  ref={scrollContainerRef}
                  className="max-h-[600px] overflow-y-auto grid grid-cols-[64px_1fr] relative"
                >
                  {/* Hours Label Axis */}
                  <div className="bg-surface-container-low border-r border-outline-variant/60 select-none">
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={hour}
                        className="h-16 pr-2 text-right text-[10px] text-on-surface-variant/60 font-medium pt-1 border-b border-outline-variant/20"
                      >
                        {hour === 0 ? "" : hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </div>
                    ))}
                  </div>

                  {/* Day Column */}
                  <div className="relative h-[1536px]">
                    {/* Hour slot background lines */}
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={hour}
                        onClick={() => handleTimeSlotClick(currentDate, hour)}
                        className="h-16 border-b border-outline-variant/20 hover:bg-surface-container/20 cursor-pointer transition-colors"
                      />
                    ))}

                    {/* Absolute positioned Events */}
                    {getTimedEventsWithLayout(currentDate).map(({ event, colIdx, totalCols }) => {
                      const { start, end } = event.parsed;
                      if (!start || !end) return null;

                      const startHour = start.getHours() + start.getMinutes() / 60;
                      const endHour = end.getHours() + end.getMinutes() / 60;
                      const duration = Math.max(0.5, endHour - startHour);

                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventId(event.id ?? null);
                          }}
                          className="absolute p-3 rounded-xl border-l-4 border-primary bg-primary/5 hover:bg-primary/10 border border-outline-variant/30 text-left overflow-hidden cursor-pointer transition-all shadow-sm z-10 hover:z-20"
                          style={{
                            top: `${startHour * 64}px`,
                            height: `${duration * 64}px`,
                            left: `${(colIdx / totalCols) * 100}%`,
                            width: `${(1 / totalCols) * 98}%`,
                          }}
                        >
                          <p className="text-xs font-bold text-on-surface">
                            {event.summary || "(No Title)"}
                          </p>
                          <p className="text-[10px] text-on-surface-variant font-medium mt-1 flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatTimeRange(event.start, event.end)}
                          </p>
                          {event.location && (
                            <p className="text-[10px] text-on-surface-variant/80 mt-1 flex items-center gap-1 truncate">
                              <MapPin className="size-3" />
                              {event.location}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* YEAR VIEW */}
            {viewMode === "year" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 12 }).map((_, mIdx) => {
                  const tempDate = new Date(currentDate.getFullYear(), mIdx, 1);
                  const daysInMonth = new Date(currentDate.getFullYear(), mIdx + 1, 0).getDate();
                  const startOffset = tempDate.getDay();

                  return (
                    <Card
                      key={mIdx}
                      className="p-4 border border-outline-variant/60 bg-surface-container-lowest/50 shadow-sm flex flex-col"
                    >
                      <h4 className="font-serif text-sm font-bold text-primary mb-2 text-left uppercase tracking-wider">
                        {tempDate.toLocaleDateString("en-US", { month: "long" })}
                      </h4>
                      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-on-surface-variant mb-1">
                        {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                          <div key={d}>{d}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1 flex-1">
                        {/* Offset padding */}
                        {Array.from({ length: startOffset }).map((_, i) => (
                          <div key={i} />
                        ))}

                        {/* Days of Month */}
                        {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                          const activeDay = new Date(currentDate.getFullYear(), mIdx, dIdx + 1);
                          const dayEvents = getEventsForDate(activeDay);
                          const isToday = sameDay(activeDay, new Date());

                          return (
                            <button
                              key={dIdx}
                              onClick={() => {
                                setCurrentDate(activeDay);
                                setViewMode("month");
                              }}
                              className={`relative py-1 rounded-full text-[10px] font-semibold transition hover:bg-surface-container-high ${
                                isToday
                                  ? "bg-primary text-on-primary font-bold shadow-sm"
                                  : "text-on-surface"
                              }`}
                            >
                              {dIdx + 1}
                              {dayEvents.length > 0 && (
                                <span
                                  className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full ${
                                    isToday ? "bg-on-primary" : "bg-primary"
                                  }`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FIXED Event Detail Dialog Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-[28rem] p-6 bg-surface-container-lowest border border-outline shadow-2xl rounded-2xl space-y-6 text-left relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedEventId(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            >
              <X className="size-4" />
            </button>

            <div className="space-y-1 text-left">
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Event Detail
              </span>
              <h3 className="font-serif text-xl font-bold text-on-surface tracking-tight mt-2">
                {selectedEvent.summary || "(No Title)"}
              </h3>
              <p className="text-2xs text-on-surface-variant/80 flex items-center gap-1.5 mt-1">
                <Clock className="size-3.5 text-primary" />
                {formatTimeRange(selectedEvent.start, selectedEvent.end)}
              </p>
            </div>

            {selectedEvent.description && (
              <div className="border-t border-outline-variant/60 pt-4 text-left">
                <h5 className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider mb-1">
                  Description
                </h5>
                <p className="text-xs text-on-surface-variant whitespace-pre-line leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>
            )}

            {selectedEvent.location && (
              <div className="border-t border-outline-variant/60 pt-4 text-left">
                <h5 className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider mb-1">
                  Location
                </h5>
                <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                  <MapPin className="size-4 text-on-surface-variant/70" />
                  {selectedEvent.location}
                </p>
              </div>
            )}

            {/* Attendees */}
            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div className="border-t border-outline-variant/60 pt-4 text-left">
                <h5 className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="size-3.5" /> Attendees ({selectedEvent.attendees.length})
                </h5>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedEvent.attendees.map((attendee: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low border border-outline-variant/40"
                    >
                      <span className="text-xs text-on-surface font-medium truncate max-w-[220px]" title={attendee.email}>
                        {attendee.displayName || attendee.email}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${getResponseBadgeClass(attendee.responseStatus)}`}>
                        {attendee.responseStatus || "needsAction"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-outline-variant/60 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditModal(selectedEvent)}
                className="rounded-xl border border-outline-variant text-xs h-9 px-4 font-semibold text-on-surface hover:bg-surface-container flex items-center gap-1"
              >
                <Edit className="size-4" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedEvent.id && handleDelete(selectedEvent.id)}
                className="rounded-xl border border-outline-variant text-rose-500 hover:bg-rose-500/5 hover:border-rose-500/20 text-xs h-9 px-4 font-semibold flex items-center gap-1"
              >
                <Trash2 className="size-4" /> Delete
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setSelectedEventId(null)}
                className="rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs h-9 px-4 font-semibold shadow-sm"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Floating Create Event Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-[32rem] p-6 bg-surface-container-lowest border border-outline shadow-2xl rounded-2xl space-y-4 text-left relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            >
              <X className="size-4" />
            </button>
            <h3 className="font-serif text-xl font-bold text-on-surface flex items-center gap-2">
              <Sparkles className="size-5 text-primary animate-bounce" /> Create Event
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Sync meeting, Project kickoff..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTimeInput}
                    onChange={(e) => setStartTimeInput(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTimeInput}
                    onChange={(e) => setEndTimeInput(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Location</label>
                <input
                  type="text"
                  placeholder="Google Meet, Conference Room B, San Francisco..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Attendees (Emails comma separated)</label>
                <input
                  type="text"
                  placeholder="teammate@company.com, client@partner.com"
                  value={attendeesInput}
                  onChange={(e) => setAttendeesInput(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Description</label>
                <textarea
                  placeholder="Agenda, notes, details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-outline-variant text-xs h-9 px-4 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={createMutation.isPending}
                  className="rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs h-9 px-4 font-semibold shadow-sm flex items-center gap-1.5"
                >
                  {createMutation.isPending ? "Scheduling..." : "Create Event"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Floating Edit Event Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-[32rem] p-6 bg-surface-container-lowest border border-outline shadow-2xl rounded-2xl space-y-4 text-left relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            >
              <X className="size-4" />
            </button>
            <h3 className="font-serif text-xl font-bold text-on-surface flex items-center gap-2">
              <Edit className="size-5 text-primary" /> Edit Event
            </h3>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Meeting Title"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTimeInput}
                    onChange={(e) => setStartTimeInput(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTimeInput}
                    onChange={(e) => setEndTimeInput(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Location</label>
                <input
                  type="text"
                  placeholder="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Attendees (Emails comma separated)</label>
                <input
                  type="text"
                  placeholder="teammate@company.com"
                  value={attendeesInput}
                  onChange={(e) => setAttendeesInput(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Description</label>
                <textarea
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl border border-outline-variant text-xs h-9 px-4 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={updateMutation.isPending}
                  className="rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs h-9 px-4 font-semibold shadow-sm flex items-center gap-1.5"
                >
                  {updateMutation.isPending ? "Updating..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </WorkspaceLayout>
  );
}
