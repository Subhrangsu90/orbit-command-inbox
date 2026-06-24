"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  AlertCircle,
  Database,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { useWorkspacePreferences } from "~/app/_components/workspacePreferencesContext";
import { api } from "~/trpc/react";
import { toast } from "sonner";

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
import { Sidebar } from "./_components/Sidebar";

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <WorkspaceLayout wide={true}>
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="text-primary size-8 animate-spin" />
              <p className="text-on-surface-variant animate-pulse text-xs font-semibold">
                Initializing calendar...
              </p>
            </div>
          </div>
        </WorkspaceLayout>
      }
    >
      <CalendarContainer />
    </Suspense>
  );
}

function CalendarContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedEventId = searchParams.get("eventId");
  const { preferences } = useWorkspacePreferences();
  const { data: connections, isLoading: isLoadingConnections } =
    api.corsair.getConnections.useQuery();
  const isConnected = !!connections?.googlecalendar;

  // Mobile sidebar drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // View settings
  const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "year">(
    "month",
  );
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState("");

  // Checked calendars filtering
  const [checkedCalendars, setCheckedCalendars] = useState<
    Record<string, boolean>
  >({});

  // Mini calendar state
  const [miniCalendarMonth, setMiniCalendarMonth] = useState<Date>(
    () => new Date(),
  );

  // Search people query
  const [searchPeopleQuery, setSearchPeopleQuery] = useState("");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [availabilityResult, setAvailabilityResult] = useState<{
    busy: { start?: string; end?: string }[];
  } | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  );

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
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    linkedEventId,
  );
  const [anchorPosition, setAnchorPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const handleSetSelectedEventId = (id: string | null) => {
    setSelectedEventId(id);
    if (!id) {
      setAnchorPosition(null);
    }
  };

  useEffect(() => {
    if (linkedEventId) setSelectedEventId(linkedEventId);
  }, [linkedEventId]);

  // Fetch calendar resources list
  const { data: calendarListData, isLoading: isLoadingCalendars } =
    api.calendar.listCalendars.useQuery(undefined, { enabled: isConnected });

  // Group and assign colors to retrieved calendars dynamically
  const { myCalendars, otherCalendars, allCalendars } = useMemo(() => {
    if (!calendarListData?.calendars) {
      return { myCalendars: [], otherCalendars: [], allCalendars: [] };
    }

    const COLOR_KEYS = [
      "blue",
      "green",
      "forest",
      "indigo",
      "teal",
      "sky",
      "rose",
      "orange",
    ] as const;

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



  // Calendar query
  const {
    data: calendarData,
    isLoading: isLoadingEvents,
    refetch,
  } = api.calendar.list.useQuery(
    {
      q: searchQuery || undefined,
      maxResults: 100,
      timeMin: searchQuery ? undefined : viewRangeTimeMin,
      calendarIds: activeCalendarIds.length > 0 ? activeCalendarIds : undefined,
    },
    { enabled: isConnected && activeCalendarIds.length > 0 },
  );

  const isLoading =
    isLoadingCalendars ||
    (isConnected && activeCalendarIds.length > 0 && isLoadingEvents);

  const isCalConnected = isConnected && !calendarData?.notConnected;
  const events = calendarData?.events ?? [];

  // 1. Fetch event details via api.calendar.get
  const { data: eventDetails } = api.calendar.get.useQuery(
    { id: selectedEventId ?? "" },
    { enabled: !!selectedEventId },
  );

  // 2. Fetch local synced database events via api.calendar.searchLocal
  const { data: localSearchResults, isLoading: isLoadingLocalSearch } =
    api.calendar.searchLocal.useQuery(
      {
        entity: "events",
        filters: localSearchQuery
          ? [
              {
                field: "summary",
                operator: "contains",
                value: localSearchQuery,
              },
            ]
          : [],
        limit: 5,
      },
      { enabled: localSearchQuery.length >= 2 },
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
      const errMsg = err.message || "Failed to fetch availability.";
      setAvailabilityError(errMsg);
      toast.error(errMsg);
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


  const deleteMutation = api.calendar.delete.useMutation({
    onSuccess: () => {
      setSelectedEventId(null);
      void refetch();
      toast.success("Calendar event deleted successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete calendar event");
    },
  });



  const handleDelete = (id: string, calendarId: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteMutation.mutate({ id, calendarId });
    }
  };

  // Autofocus scrolling to 7 AM on view mode change
  useEffect(() => {
    if (
      scrollContainerRef.current &&
      (viewMode === "week" || viewMode === "day")
    ) {
      scrollContainerRef.current.scrollTop = 7 * 64; // 64px per hour slot
    }
  }, [viewMode]);

  // Listen for the custom "calendar_event_changed" event dispatched by global NotificationProvider
  useEffect(() => {
    function handleCalendarEventChanged() {
      console.info("[Event] Realtime calendar event notification received via global provider");
      void refetch();
    }

    window.addEventListener("calendar_event_changed", handleCalendarEventChanged);
    return () => {
      window.removeEventListener("calendar_event_changed", handleCalendarEventChanged);
    };
  }, [refetch]);

  // Keyboard navigation: J/K for navigating range, C for create, R for refresh, T for today
  useEffect(() => {
    if (!isCalConnected) return;

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
        const dateStr = dateKey(currentDate);
        router.push(`/calendar/create?date=${dateStr}`);
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
    viewMode,
    currentDate,
    preferences.shortcutCalendarPrev,
    preferences.shortcutCalendarNext,
    preferences.shortcutCalendarCreate,
    preferences.shortcutCalendarRefresh,
    preferences.shortcutCalendarToday,
    router,
  ]);

  const selectedEvent =
    events.find((ev) => ev.id === selectedEventId) ?? eventDetails;

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
    const dateStr = dateKey(date);
    router.push(`/calendar/create?date=${dateStr}`);
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setCurrentDate(date);
    const dateStr = dateKey(date);
    router.push(`/calendar/create?date=${dateStr}`);
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

    const columns: (typeof dayEvents)[] = [];

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
          <div className="border-outline-variant flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Title + Nav Controls + Range Label */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary border-primary/20 flex size-10 items-center justify-center rounded-xl border shadow-sm">
                  <CalendarRange className="text-primary size-5" />
                </div>
                <h2 className="text-on-surface font-serif text-lg md:text-xl font-bold tracking-tight">
                  Calendar
                </h2>
              </div>

              {isCalConnected && (
                <div className="flex items-center gap-2 md:border-l md:border-outline-variant/60 md:pl-4">
                  {/* Navigation Controls */}
                  <div className="bg-surface-container border-outline-variant flex items-center overflow-hidden rounded-lg border">
                    <button
                      onClick={handlePrev}
                      className="hover:bg-surface-container-high border-outline-variant text-on-surface-variant hover:text-on-surface border-r p-1.5 transition"
                      title="Previous range"
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <button
                      onClick={handleToday}
                      className="text-3xs hover:bg-surface-container-high text-on-surface px-2.5 py-1 font-bold transition"
                    >
                      Today
                    </button>
                    <button
                      onClick={handleNext}
                      className="hover:bg-surface-container-high border-outline-variant text-on-surface-variant hover:text-on-surface border-l p-1.5 transition"
                      title="Next range"
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>

                  {/* View Range Label */}
                  <h3 className="text-on-surface min-w-0 truncate text-xs md:text-sm font-semibold tracking-tight">
                    {formatRangeLabel(currentDate, viewMode)}
                  </h3>

                  {searchQuery && (
                    <span className="bg-primary/10 text-primary border-primary/20 shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium hidden sm:inline-block">
                      Search matches
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: Search + View Selector + Filter Toggle */}
            {isCalConnected && (
              <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-start sm:gap-3 w-full lg:w-auto">
                {/* Search Box */}
                <div className="relative w-full sm:w-44">
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-outline-variant bg-surface-container text-2xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-primary h-8 w-full rounded-lg border pr-3 pl-8 focus:ring-1 focus:outline-none"
                  />
                  <Search className="text-on-surface-variant/60 absolute top-2.5 left-2.5 size-3.5" />
                </div>

                {/* View Selector & Filters */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                  {/* View Selector Pills */}
                  <div className="border-outline-variant bg-surface-container flex overflow-x-auto rounded-lg border p-0.5 shrink-0">
                    {(["day", "week", "month", "year"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`text-[10px] rounded-md px-2 md:px-2.5 py-1 font-semibold capitalize transition-all ${
                          viewMode === mode
                            ? "bg-primary text-on-primary scale-100 shadow-sm"
                            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  {/* Filters Toggle Button (Mobile/Tablet only) */}
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden flex items-center gap-1.5 h-8 px-2.5 bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface rounded-lg text-[10px] font-bold transition shadow-xs shrink-0"
                    title="Toggle calendar filters"
                  >
                    <SlidersHorizontal className="size-3.5 text-primary" />
                    <span className="hidden sm:inline">Filters</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Main Calendar Content */}
          {isLoadingConnections ? (
            <div className="border-outline-variant bg-surface-container-lowest flex h-96 items-center justify-center rounded-2xl border">
              <div className="flex flex-col items-center gap-2">
                <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
                <p className="text-on-surface-variant text-xs">
                  Checking calendar connection...
                </p>
              </div>
            </div>
          ) : !isCalConnected ? (
            <div className="border-outline-variant bg-surface-container-lowest mx-auto mt-12 flex max-w-[32rem] flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
              <div className="relative mb-4">
                <CalendarRange className="text-on-surface-variant size-12 opacity-60" />
                <span className="bg-surface-container-lowest absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full">
                  <AlertCircle className="text-warning size-4" />
                </span>
              </div>
              <p className="text-on-surface text-sm font-semibold">
                Google Calendar Disconnected
              </p>
              <p className="text-on-surface-variant mt-1 max-w-[24rem] text-xs">
                Connect your Google Calendar in settings to view, schedule, and
                sync invites seamlessly.
              </p>
              <Link
                href="/settings"
                className="bg-primary text-on-primary hover:bg-primary-container mt-4 inline-flex rounded-xl px-5 py-2.5 text-xs font-semibold shadow-sm transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Go to Settings
              </Link>
            </div>
          ) : isLoading ? (
            <div className="bg-surface-container-lowest border-outline-variant flex h-96 items-center justify-center rounded-2xl border">
              <div className="flex flex-col items-center gap-2">
                <div className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent" />
                <p className="text-on-surface-variant text-xs">
                  Loading schedule...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 transition-all duration-200">
              {calendarData?.fromCache && (
                <div className="animate-fade-in flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <Database className="size-3.5 shrink-0" />
                  <span>
                    <strong>Showing cached data.</strong> Google API is
                    currently unreachable — displaying your last synced events.
                    Changes may not reflect.
                  </span>
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="ml-auto flex shrink-0 items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-300"
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
                  setSelectedEventId={handleSetSelectedEventId}
                  onAnchorSelect={setAnchorPosition}
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
                  setSelectedEventId={handleSetSelectedEventId}
                  onAnchorSelect={setAnchorPosition}
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
                  setSelectedEventId={handleSetSelectedEventId}
                  onAnchorSelect={setAnchorPosition}
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

        {/* Desktop Sidebar (inline, hidden on mobile/tablet) */}
        {isCalConnected && (
          <div className="hidden lg:block">
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
              setSelectedEventId={handleSetSelectedEventId}
              onAnchorSelect={setAnchorPosition}
              primaryCalendar={primaryCalendar}
              allCalendars={allCalendars}
            />
          </div>
        )}

        {/* Mobile/Tablet Sidebar Drawer overlay */}
        {isCalConnected && isSidebarOpen && (
          <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
              onClick={() => setIsSidebarOpen(false)}
            />
            {/* Drawer Content */}
            <div className="relative w-80 max-w-full bg-surface-container border-l border-outline-variant h-full p-6 shadow-2xl flex flex-col gap-6 animate-in slide-in-from-right duration-300 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 shrink-0">
                <h3 className="text-on-surface text-sm font-bold">Calendar Filters</h3>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
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
                setSelectedEventId={handleSetSelectedEventId}
                onAnchorSelect={setAnchorPosition}
                primaryCalendar={primaryCalendar}
                allCalendars={allCalendars}
              />
            </div>
          </div>
        )}
      </div>

      {/* Event Detail Dialog Modal */}
      {selectedEvent && (
        <EventDetailModal
          selectedEvent={selectedEvent}
          setSelectedEventId={handleSetSelectedEventId}
          anchorPosition={anchorPosition}
          formatTimeRange={formatTimeRange}
          getResponseBadgeClass={getResponseBadgeClass}
          openEditModal={(event) => {
            const calendarId = event.calendarId || "primary";
            router.push(`/calendar/edit?id=${event.id}&calendarId=${calendarId}`);
          }}
          handleDelete={handleDelete}
        />
      )}

      {/* Floating Create Event Button */}
      {/* {isCalConnected && (
        <button
          onClick={() => {
            setIsCreateOpen(true);
          }}
          className="bg-primary text-on-primary hover:bg-primary-container border-primary/20 fixed right-4 bottom-24 z-50 flex h-14 w-14 items-center justify-center rounded-full border shadow-lg transition-all hover:scale-105 active:scale-95 md:right-6 md:bottom-6"
          title="New Event"
        >
          <Plus className="size-6" />
        </button>
      )} */}
    </WorkspaceLayout>
  );
}
