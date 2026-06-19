import React, { useState, useEffect } from "react";
import { X, Sparkles, Edit } from "lucide-react";
import { Card } from "~/app/_components/ui/card";
import { Button } from "~/app/_components/ui/button";
import { dateKey } from "../utils";

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
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
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  title,
  submitLabel,
  isPending,
  myCalendars,
  otherCalendars,
  defaultDate,
  initialEvent,
  onSubmit,
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

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen, initialEvent, defaultDate, myCalendars]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary || !startDate || !startTimeInput || !endDate || !endTimeInput) return;
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

  if (!isOpen) return null;

  const isEdit = !!initialEvent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <Card className="animate-in fade-in zoom-in relative my-auto w-full max-w-[32rem] space-y-4 rounded-2xl border border-outline bg-surface-container-lowest p-4 text-left shadow-2xl duration-200 sm:p-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
        >
          <X className="size-4" />
        </button>
        <h3 className="font-serif text-xl font-bold text-on-surface flex items-center gap-2">
          {isEdit ? (
            <Edit className="size-5 text-primary" />
          ) : (
            <Sparkles className="size-5 text-primary animate-bounce" />
          )}
          {title}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-1">
            <label className="text-2xs font-bold text-on-surface-variant/80 uppercase">Calendar Category</label>
            <select
              value={eventCalendarId}
              onChange={(e) => setEventCalendarId(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              onClick={onClose}
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
      </Card>
    </div>
  );
};
