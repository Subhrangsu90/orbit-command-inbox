import React, { useState, useEffect, useRef } from "react";
import { X, Sparkles, Edit } from "lucide-react";
import { Card } from "~/app/_components/ui/card";
import { Button } from "~/app/_components/ui/button";
import { dateKey } from "../utils";

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  anchorPosition?: { top: number; left: number; width: number; height: number } | null;
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
  anchorPosition,
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

  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (!anchorPosition || isMobile) return;

    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.tagName === "BUTTON" ||
      target.closest("button")
    ) {
      return;
    }

    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragOffsetRef.current = { ...dragOffset };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.x;
      const dy = moveEvent.clientY - dragStartRef.current.y;
      setDragOffset({
        x: dragOffsetRef.current.x + dx,
        y: dragOffsetRef.current.y + dy,
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    if (isOpen) {
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isOpen, anchorPosition]);

  useEffect(() => {
    if (!isOpen) return;
    if (!anchorPosition || isMobile) {
      setStyle({});
      return;
    }

    const updatePosition = () => {
      const cardEl = cardRef.current;
      if (!cardEl) return;

      const popoverWidth = cardEl.offsetWidth || 512;
      const popoverHeight = cardEl.offsetHeight || 500;

      const gap = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = anchorPosition.left + anchorPosition.width / 2 - popoverWidth / 2;
      let top = anchorPosition.top + anchorPosition.height + gap;

      if (left < 16) {
        left = 16;
      } else if (left + popoverWidth > viewportWidth - 16) {
        left = viewportWidth - popoverWidth - 16;
      }

      if (top + popoverHeight > viewportHeight - 16) {
        top = anchorPosition.top - popoverHeight - gap;
      }

      if (top < 16) {
        top = 16;
      }

      setStyle({
        position: "fixed",
        top: `${top + dragOffset.y}px`,
        left: `${left + dragOffset.x}px`,
        margin: 0,
        zIndex: 50,
      });
    };

    updatePosition();
    const frameId = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, { capture: true });

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, { capture: true });
    };
  }, [isOpen, anchorPosition, dragOffset, isMobile]);

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
  const isPopover = !!anchorPosition && !isMobile;
  const isPositioned = !isPopover || style.top !== undefined;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto sm:overflow-visible">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          isPopover ? "bg-transparent" : "bg-black/60 backdrop-blur-sm"
        }`}
      />

      {/* Popover / Modal Wrapper */}
      <div
        ref={cardRef}
        onClick={(e) => {
          if (!isPopover && e.target === e.currentTarget) {
            onClose();
          }
        }}
        className={`z-50 w-full ${
          isPopover
            ? "shadow-2xl max-w-[32rem]"
            : "fixed inset-0 flex items-center justify-center p-3 sm:p-4"
        }`}
        style={{
          ...style,
          opacity: isPositioned ? 1 : 0,
          transform: isPopover ? (isPositioned ? "scale(1)" : "scale(0.95)") : undefined,
          transition: isPopover ? "opacity 150ms ease-out, transform 150ms ease-out" : undefined,
          pointerEvents: isPositioned ? "auto" : "none",
        }}
      >
        <Card className="border-outline bg-surface-container-lowest relative w-full max-w-[32rem] space-y-4 rounded-2xl border p-4 text-left shadow-2xl duration-200 sm:p-6">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          >
            <X className="size-4" />
          </button>
          <h3
            onMouseDown={handleMouseDown}
            className="font-serif text-xl font-bold text-on-surface flex items-center gap-2 cursor-move select-none"
          >
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
    </div>
  );
};
