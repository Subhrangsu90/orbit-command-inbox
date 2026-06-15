"use client";

import { useState, useEffect } from "react";
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
  CheckCircle2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { api } from "~/trpc/react";
import { Card } from "~/app/_components/ui/card";
import { Button } from "~/app/_components/ui/button";

export default function CalendarPage() {
  const { data: connections, isLoading: isLoadingConnections } = api.corsair.getConnections.useQuery();
  const isConnected = !!connections?.googlecalendar;

  // Calendar query
  const [searchQuery, setSearchQuery] = useState("");
  const { data: calendarData, isLoading: isLoadingEvents, refetch } = api.calendar.list.useQuery(
    {
      q: searchQuery || undefined,
      maxResults: 50,
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

  // Keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  // Keyboard Navigation: J/K to traverse, Enter to select/read, Backspace or Delete to remove
  useEffect(() => {
    if (!isCalConnected || isCreateOpen || isEditOpen) return;

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

      switch (e.key.toLowerCase()) {
        case "j":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, events.length - 1));
          break;
        case "k":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "enter":
          e.preventDefault();
          if (events[selectedIndex]) {
            const ev = events[selectedIndex];
            setSelectedEventId((prev) => (prev === ev.id ? null : ev.id ?? null));
          }
          break;
        case "d":
        case "delete":
        case "backspace":
          if (events[selectedIndex]?.id) {
            e.preventDefault();
            handleDelete(events[selectedIndex].id);
          }
          break;
        case "c":
          e.preventDefault();
          resetForm();
          setIsCreateOpen(true);
          break;
        case "r":
          e.preventDefault();
          void refetch();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCalConnected, isCreateOpen, isEditOpen, events, selectedIndex]);

  // Sync selected index when selection changes
  useEffect(() => {
    if (selectedEventId) {
      const idx = events.findIndex((ev) => ev.id === selectedEventId);
      if (idx !== -1) {
        setSelectedIndex(idx);
      }
    }
  }, [selectedEventId, events]);

  const selectedEvent = events.find((ev) => ev.id === selectedEventId);

  // Formatter helpers
  const formatTimeRange = (start: any, end: any) => {
    if (!start) return "";
    const sDate = start.dateTime ? new Date(start.dateTime) : new Date(start.date);
    const eDate = end ? (end.dateTime ? new Date(end.dateTime) : new Date(end.date)) : null;

    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };

    if (eDate) {
      return `${sDate.toLocaleDateString("en-US", options)} – ${eDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    }
    return sDate.toLocaleDateString("en-US", options);
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

  return (
    <WorkspaceLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-4">
          <div className="space-y-1">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-on-surface flex items-center gap-2">
              <Calendar className="size-8 text-primary" /> Command Calendar
            </h2>
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
              Navigate with <kbd className="px-1 bg-surface-container rounded border border-outline-variant text-[10px]">J</kbd> / <kbd className="px-1 bg-surface-container rounded border border-outline-variant text-[10px]">K</kbd>, <kbd className="px-1 bg-surface-container rounded border border-outline-variant text-[10px]">Enter</kbd> to view, <kbd className="px-1 bg-surface-container rounded border border-outline-variant text-[10px]">Backspace</kbd> to delete, <kbd className="px-1 bg-surface-container rounded border border-outline-variant text-[10px]">C</kbd> to create.
            </p>
          </div>

          {isCalConnected && (
            <div className="flex items-center gap-2">
              {/* Search Box */}
              <div className="relative w-48 md:w-64">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
                <Clock className="absolute left-2.5 top-2.5 size-4 text-on-surface-variant/60" />
              </div>

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
                  setIsCreateOpen(true);
                }}
                className="h-9 px-3 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-sm flex items-center gap-1.5"
              >
                <Plus className="size-4" /> New Event
              </Button>
            </div>
          )}
        </div>

        {/* main calendar content */}
        {isLoadingConnections ? (
          <div className="flex h-96 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-lowest">
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-on-surface-variant">Checking calendar connection...</p>
            </div>
          </div>
        ) : !isCalConnected ? (
          <div className="p-12 border border-dashed border-outline-variant bg-surface-container-lowest rounded-2xl flex flex-col items-center justify-center text-center max-w-lg mx-auto mt-12">
            <div className="relative mb-4">
              <CalendarDays className="size-12 text-on-surface-variant opacity-60" />
              <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-surface-container-lowest">
                <AlertCircle className="size-4 text-warning" />
              </span>
            </div>
            <p className="font-semibold text-sm text-on-surface">Google Calendar Disconnected</p>
            <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
              Connect your Google Calendar in settings to view, schedule, and sync invites seamlessly.
            </p>
            <Link
              href="/settings"
              className="mt-4 inline-flex bg-primary text-on-primary hover:bg-primary-container px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Settings
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Events List */}
            <div className={`space-y-3 lg:col-span-7 transition-all`}>
              <div className="flex items-center justify-between text-xs text-on-surface-variant/70 font-semibold px-1">
                <span>Upcoming Events ({events.length})</span>
                {events.length > 0 && <span>J/K to scroll</span>}
              </div>

              {isLoadingEvents ? (
                <div className="flex h-64 items-center justify-center bg-surface-container-lowest border border-outline-variant rounded-2xl">
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-xs text-on-surface-variant">Loading schedule...</p>
                  </div>
                </div>
              ) : events.length === 0 ? (
                <div className="p-12 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl">
                  <Calendar className="size-8 mx-auto text-on-surface-variant opacity-50 mb-2" />
                  <p className="font-semibold text-xs text-on-surface">No upcoming events</p>
                  <p className="text-2xs text-on-surface-variant/80 mt-0.5">Your schedule is clear or no matching events were found.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {events.map((ev, idx) => {
                    const isSelected = selectedEventId === ev.id;
                    const isActiveNav = selectedIndex === idx;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEventId(ev.id ?? null)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? "bg-primary/5 border-primary/40 shadow-sm"
                            : isActiveNav
                            ? "bg-surface-container-high border-outline"
                            : "bg-surface-container-lowest border-outline-variant hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-sm text-on-surface tracking-tight">
                              {ev.summary || "(No Title)"}
                            </h4>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-on-surface-variant/80">
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {formatTimeRange(ev.start, ev.end)}
                              </span>
                              {ev.location && (
                                <span className="flex items-center gap-1 max-w-[200px] truncate">
                                  <MapPin className="size-3" />
                                  {ev.location}
                                </span>
                              )}
                            </div>
                          </div>
                          {ev.status === "cancelled" && (
                            <span className="bg-rose-500/10 text-rose-500 text-[10px] px-1.5 py-0.5 rounded font-medium border border-rose-500/20">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Event Detail Panel */}
            <div className="lg:col-span-5">
              {selectedEvent ? (
                <Card className="p-6 border border-outline-variant bg-surface-container-lowest/50 backdrop-blur-md shadow-md rounded-2xl space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 text-left">
                      <h3 className="font-serif text-lg font-bold text-on-surface tracking-tight">
                        {selectedEvent.summary || "(No Title)"}
                      </h3>
                      <p className="text-2xs text-on-surface-variant/80 flex items-center gap-1">
                        <Clock className="size-3.5 text-primary" />
                        {formatTimeRange(selectedEvent.start, selectedEvent.end)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(selectedEvent)}
                        className="h-8 w-8 !p-0 rounded-lg border-outline-variant text-on-surface-variant hover:text-on-surface"
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedEvent.id && handleDelete(selectedEvent.id)}
                        className="h-8 w-8 !p-0 rounded-lg border-outline-variant text-rose-500 hover:bg-rose-500/5 hover:border-rose-500/20"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEventId(null)}
                        className="h-8 w-8 !p-0 rounded-lg border-outline-variant text-on-surface-variant hover:text-on-surface"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {selectedEvent.description && (
                    <div className="border-t border-outline-variant pt-4 text-left">
                      <h5 className="text-2xs font-bold text-on-surface-variant/60 uppercase tracking-wider mb-1">
                        Description
                      </h5>
                      <p className="text-xs text-on-surface-variant whitespace-pre-line leading-relaxed">
                        {selectedEvent.description}
                      </p>
                    </div>
                  )}

                  {selectedEvent.location && (
                    <div className="border-t border-outline-variant pt-4 text-left">
                      <h5 className="text-2xs font-bold text-on-surface-variant/60 uppercase tracking-wider mb-1">
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
                    <div className="border-t border-outline-variant pt-4 text-left">
                      <h5 className="text-2xs font-bold text-on-surface-variant/60 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Users className="size-3.5" /> Attendees ({selectedEvent.attendees.length})
                      </h5>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {selectedEvent.attendees.map((attendee: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/60"
                          >
                            <span className="text-xs text-on-surface font-medium truncate max-w-[200px]" title={attendee.email}>
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
                </Card>
              ) : (
                <div className="hidden lg:block border border-dashed border-outline-variant rounded-2xl p-12 text-center bg-surface-container-lowest/20">
                  <CalendarDays className="size-10 mx-auto text-on-surface-variant opacity-40 mb-3" />
                  <p className="text-xs font-medium text-on-surface-variant/80">Select an event or use keyboard controls</p>
                  <p className="text-2xs text-on-surface-variant/60 mt-0.5">Select an event to view detailed attendees list, descriptions, and execute management options.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Create Event Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 bg-surface-container-lowest border border-outline shadow-2xl rounded-2xl space-y-4 text-left relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            >
              <X className="size-4" />
            </button>
            <h3 className="font-serif text-xl font-bold text-on-surface flex items-center gap-2">
              <Sparkles className="size-5 text-primary" /> Create Event
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
          <Card className="w-full max-w-lg p-6 bg-surface-container-lowest border border-outline shadow-2xl rounded-2xl space-y-4 text-left relative animate-in fade-in zoom-in duration-200">
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
