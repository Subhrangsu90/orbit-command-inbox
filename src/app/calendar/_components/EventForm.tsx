import React, { useState, useEffect } from "react";
import { Sparkles, Edit } from "lucide-react";

import { Button } from "~/app/_components/ui/button";
import { dateKey } from "../utils";

interface EventFormProps {
  title: string;
  submitLabel: string;
  isPending: boolean;
  myCalendars: any[];
  otherCalendars: any[];
  defaultDate: Date;
  initialEvent?: any; // If editing
  onSubmit: (data: {
    summary: string;
    description: string;
    location: string;
    startDate: string;
    startTimeInput: string;
    endDate: string;
    endTimeInput: string;
    attendeesInput: string;
    eventCalendarId: string;
  }) => void;
  onCancel: () => void;
}

export const EventForm: React.FC<EventFormProps> = ({
  title,
  submitLabel,
  isPending,
  myCalendars,
  otherCalendars,
  defaultDate,
  initialEvent,
  onSubmit,
  onCancel,
}) => {
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTimeInput, setStartTimeInput] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTimeInput, setEndTimeInput] = useState("");
  const [attendeesInput, setAttendeesInput] = useState("");
  const [eventCalendarId, setEventCalendarId] = useState("primary");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialEvent) {
      // Pre-fill for Edit
      setSummary(initialEvent.summary ?? "");
      const cleanDesc = (initialEvent.description ?? "").replace(/\[Calendar:\s*[^\]]+\]/g, "").trim();
      setDescription(cleanDesc);
      setLocation(initialEvent.location ?? "");
      setEventCalendarId(initialEvent.calendarId || "primary");

      // Parse start date & time
      if (initialEvent.start?.dateTime) {
        const dt = new Date(initialEvent.start.dateTime);
        setStartDate(dt.toISOString().split("T")[0] ?? "");
        setStartTimeInput(dt.toTimeString().split(" ")[0]?.substring(0, 5) ?? "");
      } else if (initialEvent.start?.date) {
        setStartDate(initialEvent.start.date);
        setStartTimeInput("09:00");
      }

      // Parse end date & time
      if (initialEvent.end?.dateTime) {
        const dt = new Date(initialEvent.end.dateTime);
        setEndDate(dt.toISOString().split("T")[0] ?? "");
        setEndTimeInput(dt.toTimeString().split(" ")[0]?.substring(0, 5) ?? "");
      } else if (initialEvent.end?.date) {
        setEndDate(initialEvent.end.date);
        setEndTimeInput("10:00");
      }

      const atts = initialEvent.attendees?.map((a: any) => a.email).join(", ") ?? "";
      setAttendeesInput(atts);
    } else {
      // Pre-fill for Create
      setSummary("");
      setDescription("");
      setLocation("");
      const dateStr = dateKey(defaultDate);
      setStartDate(dateStr);
      setEndDate(dateStr);
      setStartTimeInput("09:00");
      setEndTimeInput("10:00");
      setAttendeesInput("");
      
      const primaryCal = myCalendars.find((c) => c.primary) || myCalendars[0];
      setEventCalendarId(primaryCal?.id || "primary");
    }
  }, [initialEvent, defaultDate, myCalendars]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!summary || !startDate || !startTimeInput || !endDate || !endTimeInput) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    // Validate start date/time vs end date/time
    const start = new Date(`${startDate}T${startTimeInput}:00`);
    const end = new Date(`${endDate}T${endTimeInput}:00`);

    if (end <= start) {
      setErrorMsg("End date/time must be after start date/time.");
      return;
    }

    onSubmit({
      summary,
      description,
      location,
      startDate,
      startTimeInput,
      endDate,
      endTimeInput,
      attendeesInput,
      eventCalendarId,
    });
  };

  const isEdit = !!initialEvent;

  return (
    <div className="relative w-full mx-auto space-y-6 text-left">


      {errorMsg && (
        <div className="bg-error/10 border border-error/20 text-error rounded-xl px-4 py-2.5 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Title *</label>
          <input
            type="text"
            required
            placeholder="Sync meeting, Project kickoff..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            disabled={isPending}
            className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Calendar Category</label>
          <select
            value={eventCalendarId}
            onChange={(e) => setEventCalendarId(e.target.value)}
            disabled={isPending}
            className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
          >
            {myCalendars.length > 0 && (
              <optgroup label="My Calendars">
                {myCalendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </optgroup>
            )}
            {otherCalendars.length > 0 && (
              <optgroup label="Other Calendars">
                {otherCalendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Start Date *</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isPending}
              className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Start Time *</label>
            <input
              type="time"
              required
              value={startTimeInput}
              onChange={(e) => setStartTimeInput(e.target.value)}
              disabled={isPending}
              className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">End Date *</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isPending}
              className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">End Time *</label>
            <input
              type="time"
              required
              value={endTimeInput}
              onChange={(e) => setEndTimeInput(e.target.value)}
              disabled={isPending}
              className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
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
            disabled={isPending}
            className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Attendees (Emails comma separated)</label>
          <input
            type="text"
            placeholder="teammate@company.com, client@partner.com"
            value={attendeesInput}
            onChange={(e) => setAttendeesInput(e.target.value)}
            disabled={isPending}
            className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Description</label>
          <textarea
            placeholder="Agenda, notes, details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            disabled={isPending}
            className="w-full p-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none disabled:opacity-50"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/30">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl border border-outline-variant text-xs h-9 px-4 font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            className="rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs h-9 px-4 font-semibold shadow-sm flex items-center gap-1.5"
          >
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
};
