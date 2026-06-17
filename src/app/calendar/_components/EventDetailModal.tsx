import React from "react";
import { X, Clock, MapPin, Users, Edit, Trash2 } from "lucide-react";
import { Card } from "~/app/_components/ui/card";
import { Button } from "~/app/_components/ui/button";

interface EventDetailModalProps {
  selectedEvent: any;
  setSelectedEventId: (id: string | null) => void;
  formatTimeRange: (start: any, end: any) => string;
  getResponseBadgeClass: (status?: string) => string;
  openEditModal: (event: any) => void;
  handleDelete: (id: string, calendarId: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  selectedEvent,
  setSelectedEventId,
  formatTimeRange,
  getResponseBadgeClass,
  openEditModal,
  handleDelete,
}) => {
  return (
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
              {selectedEvent.description.replace(/\[Calendar:\s*[^\]]+\]/g, "").trim()}
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
            onClick={() => selectedEvent.id && handleDelete(selectedEvent.id, selectedEvent.calendarId || "primary")}
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
  );
};
