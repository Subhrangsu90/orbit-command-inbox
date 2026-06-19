"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  AlertCircle,
  Database,
  RefreshCw,
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { useWorkspacePreferences } from "~/app/_components/workspacePreferencesContext";
import { api } from "~/trpc/react";

import {
  dateKey,
  sameDay,
  parseEvent,
  formatRangeLabel,
  formatTimeRange,
  getResponseBadgeClass,
} from "./utils";

import { MonthView } from "./_components/MonthView";
import { WeekView } from "./_components/WeekView";
import { DayView } from "./_components/DayView";
import { YearView } from "./_components/YearView";
import { EventDetailModal } from "./_components/EventDetailModal";
import { EventFormModal } from "./_components/EventFormModal";
import { Sidebar } from "./_components/Sidebar";

export default function CalendarPage() {
  const { preferences } = useWorkspacePreferences();
  const { data: connections, isLoading: isLoadingConnections } = api.corsair.getConnections.useQuery();
  const isConnected = !!connections?.googlecalendar;

  // View settings
  const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "year">("month");
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState("");

  // Checked calendars filtering
  const [checkedCalendars, setCheckedCalendars] = useState<Record<string, boolean>>({});

  // Mini calendar state
  const [miniCalendarMonth, setMiniCalendarMonth] = useState<Date>(() => new Date());

  // Search people query
  const [searchPeopleQuery, setSearchPeopleQuery] = useState("");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [availabilityResult, setAvailabilityResult] = useState<{ busy: { start?: string; end?: string }[] } | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Event category for Form Create/Edit
  const [eventCalendarId, setEventCalendarId] = useState("primary");

  // Keep mini calendar month in sync with main view date
  useEffect(() => {
    setMiniCalendarMonth(currentDate);
  }, [currentDate]);

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

  // Selection & Form states
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetch calendar resources list
  const { data: calendarListData, isLoading: isLoadingCalendars } = api.calendar.listCalendars.useQuery(
    undefined,
    { enabled: isConnected }
  );

  // Group and assign colors to retrieved calendars dynamically
  const { myCalendars, otherCalendars, allCalendars } = useMemo(() => {
    if (!calendarListData?.calendars) {
      return { myCalendars: [], otherCalendars: [], allCalendars: [] };
    }

    const COLOR_KEYS = ["blue", "green", "forest", "indigo", "teal", "sky", "rose", "orange"] as const;

    const mapped = calendarListData.calendars.map((cal, idx) => {
      const color = COLOR_KEYS[idx % COLOR_KEYS.length]!;
      return {
        id: cal.id as string,
        name: cal.summaryOverride || cal.summary || "Unnamed Calendar",
        color,
        primary: !!cal.primary,
        accessRole: cal.accessRole as string,
      };
    });

    const my: typeof mapped = [];
    const other: typeof mapped = [];

    mapped.forEach((cal) => {
      const isMy =
        cal.primary ||
        cal.accessRole === "owner" ||
        cal.accessRole === "writer" ||
        cal.id === "addressbook#contacts@group.v.calendar.google.com" ||
        cal.id.includes("tasks") ||
        cal.id.includes("contacts");

      if (isMy) {
        my.push(cal);
      } else {
        other.push(cal);
      }
    });

    return { myCalendars: my, otherCalendars: other, allCalendars: mapped };
  }, [calendarListData]);

  // Synchronize dynamic checkboxes state when calendars load
  useEffect(() => {
    if (calendarListData?.calendars) {
      setCheckedCalendars((prev) => {
        const next = { ...prev };
        let changed = false;
        calendarListData.calendars.forEach((cal) => {
          if (cal.id && next[cal.id] === undefined) {
            next[cal.id] = cal.selected === true || cal.primary === true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [calendarListData]);

  // Determine active calendar IDs for event fetching
  const activeCalendarIds = useMemo(() => {
    return allCalendars
      .filter((cal) => checkedCalendars[cal.id] !== false)
      .map((cal) => cal.id);
  }, [allCalendars, checkedCalendars]);

  // Default eventCalendarId to the primary calendar when calendars are fetched
  const primaryCalendar = useMemo(() => {
    return myCalendars.find((cal) => cal.primary) || myCalendars[0];
  }, [myCalendars]);

  useEffect(() => {
    if (primaryCalendar?.id && (eventCalendarId === "primary" || eventCalendarId === "subhrangsu-bera")) {
      setEventCalendarId(primaryCalendar.id);
    }
  }, [primaryCalendar, eventCalendarId]);

  // Calendar query
  const { data: calendarData, isLoading: isLoadingEvents, refetch } = api.calendar.list.useQuery(
    {
      q: searchQuery || undefined,
      maxResults: 100,
      timeMin: searchQuery ? undefined : viewRangeTimeMin,
      calendarIds: activeCalendarIds.length > 0 ? activeCalendarIds : undefined,
    },
    { enabled: isConnected && activeCalendarIds.length > 0 }
  );

  const isLoading = isLoadingCalendars || (isConnected && activeCalendarIds.length > 0 && isLoadingEvents);

  const isCalConnected = isConnected && !calendarData?.notConnected;
  const events = calendarData?.events ?? [];

  // 1. Fetch event details via api.calendar.get
  const { data: eventDetails } = api.calendar.get.useQuery(
    { id: selectedEventId ?? "" },
    { enabled: !!selectedEventId }
  );

  // 2. Fetch local synced database events via api.calendar.searchLocal
  const { data: localSearchResults, isLoading: isLoadingLocalSearch } = api.calendar.searchLocal.useQuery(
    {
      entity: "events",
      filters: localSearchQuery ? [{ field: "summary", operator: "contains", value: localSearchQuery }] : [],
      limit: 5,
    },
    { enabled: localSearchQuery.length >= 2 }
  );

  // 3. Get availability mutation via api.calendar.getAvailability
  const getAvailabilityMutation = api.calendar.getAvailability.useMutation({
    onSuccess: (data) => {
      setIsCheckingAvailability(false);
      const calData = data?.calendars?.[searchPeopleQuery];
      if (calData) {
        setAvailabilityResult({ busy: calData.busy ?? [] });
      } else {
        setAvailabilityResult({ busy: [] });
      }
    },
    onError: (err) => {
      setIsCheckingAvailability(false);
      setAvailabilityError(err.message || "Failed to fetch availability.");
    },
  });

  const handleCheckAvailability = () => {
    if (!searchPeopleQuery || !searchPeopleQuery.includes("@")) return;
    setIsCheckingAvailability(true);
    setAvailabilityError(null);
    setAvailabilityResult(null);

    const timeMin = new Date(currentDate);
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(currentDate);
    timeMax.setHours(23, 59, 59, 999);

    getAvailabilityMutation.mutate({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: searchPeopleQuery }],
    });
  };

  // Mutations
  const createMutation = api.calendar.create.useMutation({
    onSuccess: () => {
      setIsCreateOpen(false);
      void refetch();
    },
  });

  const updateMutation = api.calendar.update.useMutation({
    onSuccess: () => {
      setIsEditOpen(false);
      void refetch();
    },
  });

  const deleteMutation = api.calendar.delete.useMutation({
    onSuccess: () => {
      setSelectedEventId(null);
      void refetch();
    },
  });

  const handleCreateSubmit = (data: {
    summary: string;
    description: string;
    location: string;
    startDate: string;
    startTimeInput: string;
    endDate: string;
    endTimeInput: string;
    attendeesInput: string;
    eventCalendarId: string;
  }) => {
    const startISO = new Date(`${data.startDate}T${data.startTimeInput}:00`).toISOString();
    const endISO = new Date(`${data.endDate}T${data.endTimeInput}:00`).toISOString();
    const attendees = data.attendeesInput
      ? data.attendeesInput.split(",").map((email) => email.trim()).filter(Boolean)
      : [];

    const selectedCal = allCalendars.find((c) => c.id === data.eventCalendarId);
    const taggedDescription = selectedCal
      ? `${data.description ? data.description + "\n\n" : ""}[Calendar: ${selectedCal.name}]`
      : data.description;
    
    const calIdx = allCalendars.findIndex((c) => c.id === data.eventCalendarId);
    const colorId = calIdx >= 0 ? String((calIdx % 8) + 1) : "1";

    createMutation.mutate({
      calendarId: data.eventCalendarId,
      summary: data.summary,
      description: taggedDescription,
      location: data.location || undefined,
      startTime: startISO,
      endTime: endISO,
      attendees: attendees.length > 0 ? attendees : undefined,
      colorId,
    });
  };

  const handleUpdateSubmit = (data: {
    summary: string;
    description: string;
    location: string;
    startDate: string;
    startTimeInput: string;
    endDate: string;
    endTimeInput: string;
    attendeesInput: string;
    eventCalendarId: string;
  }) => {
    if (!selectedEventId) return;

    const startISO = new Date(`${data.startDate}T${data.startTimeInput}:00`).toISOString();
    const endISO = new Date(`${data.endDate}T${data.endTimeInput}:00`).toISOString();
    const attendees = data.attendeesInput
      ? data.attendeesInput.split(",").map((email) => email.trim()).filter(Boolean)
      : [];

    const selectedCal = allCalendars.find((c) => c.id === data.eventCalendarId);
    let cleanDescription = data.description;
    cleanDescription = cleanDescription.replace(/\[Calendar:\s*[^\]]+\]/g, "").trim();
    const taggedDescription = selectedCal
      ? `${cleanDescription ? cleanDescription + "\n\n" : ""}[Calendar: ${selectedCal.name}]`
      : cleanDescription;

    const calIdx = allCalendars.findIndex((c) => c.id === data.eventCalendarId);
    const colorId = calIdx >= 0 ? String((calIdx % 8) + 1) : "1";

    updateMutation.mutate({
      calendarId: data.eventCalendarId,
      id: selectedEventId,
      summary: data.summary,
      description: taggedDescription,
      location: data.location || undefined,
      startTime: startISO,
      endTime: endISO,
      attendees: attendees.length > 0 ? attendees : undefined,
      colorId,
    });
  };

  const handleDelete = (id: string, calendarId: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteMutation.mutate({ id, calendarId });
    }
  };

  // Autofocus scrolling to 7 AM on view mode change
  useEffect(() => {
    if (scrollContainerRef.current && (viewMode === "week" || viewMode === "day")) {
      scrollContainerRef.current.scrollTop = 7 * 64; // 64px per hour slot
    }
  }, [viewMode]);

  // Realtime notification sync via SSE
  useEffect(() => {
    if (!isCalConnected) return;

    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;

    function connect() {
      eventSource = new EventSource("/api/sse");

      eventSource.onmessage = (event) => {
        if (event.data === "connected") {
          console.log("[SSE] Connected to notifications stream.");
        }
      };

      eventSource.addEventListener("calendar_event_changed", () => {
        console.info("[SSE] Realtime calendar event notification received");
        void refetch();
      });

      eventSource.onerror = (err) => {
        console.warn("[SSE] Connection lost, retrying in 5s...", err);
        eventSource?.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(retryTimeout);
    };
  }, [isCalConnected, refetch]);

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
        // Fill form with current date
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
    setCurrentDate(date);
    setIsCreateOpen(true);
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setCurrentDate(date);
    setIsCreateOpen(true);
  };

  // Event list computations for rendering views
  const parsedEvents = useMemo(() => {
    return events
      .map((ev) => ({
        ...ev,
        parsed: parseEvent(ev),
        calendarId: ev.calendarId || "primary",
      }))
      .filter((ev) => checkedCalendars[ev.calendarId] !== false);
  }, [events, checkedCalendars]);

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

  // Generate days for mini calendar monthly grid
  const miniCalendarDays = useMemo(() => {
    const yr = miniCalendarMonth.getFullYear();
    const mo = miniCalendarMonth.getMonth();
    const firstDay = new Date(yr, mo, 1);
    const startOffset = firstDay.getDay();
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [miniCalendarMonth]);

  return (
    <WorkspaceLayout wide={true}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        {/* Main Calendar Content (Left side, flex-1) */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Calendar Header Section (Compact Google Calendar Style) */}
          <div className="flex flex-col justify-between gap-4 border-b border-outline-variant pb-4 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl border border-primary/20 shadow-sm">
                <CalendarRange className="size-5 text-primary" />
              </div>
              <h2 className="font-serif text-xl font-bold tracking-tight text-on-surface">
                Calendar
              </h2>
            </div>
   
            {isCalConnected && (
              <div className="flex min-w-0 flex-wrap items-center gap-2 border-outline-variant/60 md:gap-3 md:border-l md:pl-2">
                {/* Navigation Controls */}
                <div className="flex items-center bg-surface-container rounded-lg border border-outline-variant overflow-hidden">
                  <button
                    onClick={handlePrev}
                    className="p-1.5 hover:bg-surface-container-high border-r border-outline-variant text-on-surface-variant hover:text-on-surface transition"
                    title="Previous range"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    onClick={handleToday}
                    className="px-2.5 py-1 text-3xs font-bold hover:bg-surface-container-high text-on-surface transition"
                  >
                    Today
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-1.5 hover:bg-surface-container-high border-l border-outline-variant text-on-surface-variant hover:text-on-surface transition"
                    title="Next range"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
   
                {/* View Range Label */}
                <h3 className="min-w-0 truncate text-sm font-semibold tracking-tight text-on-surface">
                  {formatRangeLabel(currentDate, viewMode)}
                </h3>
   
                {searchQuery && (
                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-medium shrink-0">
                    Search matches
                  </span>
                )}
              </div>
            )}

            {isCalConnected && (
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                {/* Search Box */}
                <div className="relative min-w-0 flex-1 sm:flex-none">
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-full min-w-36 rounded-lg border border-outline-variant bg-surface-container pr-3 pl-8 text-2xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:w-48"
                  />
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-on-surface-variant/60" />
                </div>
   
                {/* View Selector Pills */}
                <div className="flex overflow-x-auto rounded-lg border border-outline-variant bg-surface-container p-0.5">
                  {(["day", "week", "month", "year"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-2.5 py-1 text-3xs font-semibold rounded-md capitalize transition-all ${
                        viewMode === mode
                          ? "bg-primary text-on-primary shadow-sm scale-100"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

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
                <CalendarRange className="size-12 text-on-surface-variant opacity-60" />
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
          ) : isLoading ? (
            <div className="flex h-96 items-center justify-center bg-surface-container-lowest border border-outline-variant rounded-2xl">
              <div className="flex flex-col items-center gap-2">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-xs text-on-surface-variant">Loading schedule...</p>
              </div>
            </div>
          ) : (
            <div className="transition-all duration-200 space-y-4">
              {calendarData?.fromCache && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium animate-fade-in">
                  <Database className="size-3.5 shrink-0" />
                  <span>
                    <strong>Showing cached data.</strong> Google API is currently unreachable — displaying your last synced events. Changes may not reflect.
                  </span>
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="ml-auto shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-semibold transition-colors text-[11px]"
                  >
                    <RefreshCw className="size-3" />
                    Retry
                  </button>
                </div>
              )}
              {viewMode === "month" && (
                <MonthView
                  currentDate={currentDate}
                  monthGridDays={monthGridDays}
                  getEventsForDate={getEventsForDate}
                  allCalendars={allCalendars}
                  setSelectedEventId={setSelectedEventId}
                  handleCellClick={handleCellClick}
                  setCurrentDate={setCurrentDate}
                  setViewMode={setViewMode}
                />
              )}

              {viewMode === "week" && (
                <WeekView
                  currentDate={currentDate}
                  weekGridDays={weekGridDays}
                  getAllDayEvents={getAllDayEvents}
                  getTimedEventsWithLayout={getTimedEventsWithLayout}
                  allCalendars={allCalendars}
                  setSelectedEventId={setSelectedEventId}
                  handleTimeSlotClick={handleTimeSlotClick}
                  formatTimeRange={formatTimeRange}
                  scrollContainerRef={scrollContainerRef}
                />
              )}

              {viewMode === "day" && (
                <DayView
                  currentDate={currentDate}
                  getAllDayEvents={getAllDayEvents}
                  getTimedEventsWithLayout={getTimedEventsWithLayout}
                  allCalendars={allCalendars}
                  setSelectedEventId={setSelectedEventId}
                  handleTimeSlotClick={handleTimeSlotClick}
                  formatTimeRange={formatTimeRange}
                  scrollContainerRef={scrollContainerRef}
                />
              )}

              {viewMode === "year" && (
                <YearView
                  currentDate={currentDate}
                  getEventsForDate={getEventsForDate}
                  setCurrentDate={setCurrentDate}
                  setViewMode={setViewMode}
                />
              )}
            </div>
          )}
        </div>

        {/* Sidebar Column (Right side, w-64) */}
        {isCalConnected && (
          <Sidebar
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            myCalendars={myCalendars}
            otherCalendars={otherCalendars}
            checkedCalendars={checkedCalendars}
            setCheckedCalendars={setCheckedCalendars}
            miniCalendarMonth={miniCalendarMonth}
            setMiniCalendarMonth={setMiniCalendarMonth}
            miniCalendarDays={miniCalendarDays}
            searchPeopleQuery={searchPeopleQuery}
            setSearchPeopleQuery={setSearchPeopleQuery}
            handleCheckAvailability={handleCheckAvailability}
            isCheckingAvailability={isCheckingAvailability}
            availabilityError={availabilityError}
            availabilityResult={availabilityResult}
            localSearchQuery={localSearchQuery}
            setLocalSearchQuery={setLocalSearchQuery}
            isLoadingLocalSearch={isLoadingLocalSearch}
            localSearchResults={localSearchResults}
            setSelectedEventId={setSelectedEventId}
            setIsCreateOpen={setIsCreateOpen}
            setEventCalendarId={setEventCalendarId}
            primaryCalendar={primaryCalendar}
            allCalendars={allCalendars}
          />
        )}
      </div>

      {/* Event Detail Dialog Modal */}
      {selectedEvent && (
        <EventDetailModal
          selectedEvent={selectedEvent}
          setSelectedEventId={setSelectedEventId}
          formatTimeRange={formatTimeRange}
          getResponseBadgeClass={getResponseBadgeClass}
          openEditModal={setIsEditOpen}
          handleDelete={handleDelete}
        />
      )}

      {/* Floating Create Event Modal */}
      <EventFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Event"
        submitLabel="Create Event"
        isPending={createMutation.isPending}
        myCalendars={myCalendars}
        otherCalendars={otherCalendars}
        defaultDate={currentDate}
        onSubmit={handleCreateSubmit}
      />

      {/* Floating Edit Event Modal */}
      {selectedEvent && (
        <EventFormModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Event"
          submitLabel="Save Changes"
          isPending={updateMutation.isPending}
          myCalendars={myCalendars}
          otherCalendars={otherCalendars}
          defaultDate={currentDate}
          initialEvent={selectedEvent}
          onSubmit={handleUpdateSubmit}
        />
      )}

      {/* Floating Create Event Button */}
      {isCalConnected && (
        <button
          onClick={() => {
            setIsCreateOpen(true);
          }}
          className="bg-primary text-on-primary hover:bg-primary-container border-primary/20 fixed right-4 bottom-24 z-50 flex h-14 w-14 items-center justify-center rounded-full border shadow-lg transition-all hover:scale-105 active:scale-95 md:right-6 md:bottom-6"
          title="New Event"
        >
          <Plus className="size-6" />
        </button>
      )}
    </WorkspaceLayout>
  );
}
