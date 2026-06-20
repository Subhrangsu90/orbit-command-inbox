import React, { useState } from "react";
import {
  X,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  Share2,
  Check,
} from "lucide-react";
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
  const inviteLink = selectedEvent.htmlLink || selectedEvent.calendarLink;
  const [isInviteLinkCopied, setIsInviteLinkCopied] = useState(false);

  async function handleCopyInviteLink() {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsInviteLinkCopied(true);
      window.setTimeout(() => setIsInviteLinkCopied(false), 1800);
    } catch {
      window.open(inviteLink, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <Card className="animate-in fade-in zoom-in border-outline bg-surface-container-lowest relative my-auto w-full max-w-[28rem] space-y-6 rounded-2xl border p-4 text-left shadow-2xl duration-200 sm:p-6">
        <button
          onClick={() => setSelectedEventId(null)}
          className="border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container absolute top-4 right-4 rounded-lg border p-1.5"
        >
          <X className="size-4" />
        </button>

        <div className="space-y-1 text-left">
          <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
            Event Detail
          </span>
          <h3 className="text-on-surface mt-2 font-serif text-xl font-bold tracking-tight">
            {selectedEvent.summary || "(No Title)"}
          </h3>
          <p className="text-2xs text-on-surface-variant/80 mt-1 flex items-center gap-1.5">
            <Clock className="text-primary size-3.5" />
            {formatTimeRange(selectedEvent.start, selectedEvent.end)}
          </p>
          {inviteLink && (
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="border-outline-variant text-primary hover:bg-primary/10 hover:border-primary/30 mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition"
            >
              {isInviteLinkCopied ? (
                <Check className="size-4" />
              ) : (
                <Share2 className="size-4" />
              )}
              {isInviteLinkCopied ? "Link copied" : "Invite via link"}
            </button>
          )}
        </div>

        {selectedEvent.description && (
          <div className="border-outline-variant/60 border-t pt-4 text-left">
            <h5 className="text-on-surface-variant/60 mb-1 text-[10px] font-bold tracking-wider uppercase">
              Description
            </h5>
            <p className="text-on-surface-variant text-xs leading-relaxed whitespace-pre-line">
              {selectedEvent.description
                .replace(/\[Calendar:\s*[^\]]+\]/g, "")
                .trim()}
            </p>
          </div>
        )}

        {selectedEvent.location && (
          <div className="border-outline-variant/60 border-t pt-4 text-left">
            <h5 className="text-on-surface-variant/60 mb-1 text-[10px] font-bold tracking-wider uppercase">
              Location
            </h5>
            <p className="text-on-surface-variant flex items-center gap-1.5 text-xs">
              <MapPin className="text-on-surface-variant/70 size-4" />
              {selectedEvent.location}
            </p>
          </div>
        )}

        {/* Attendees */}
        {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
          <div className="border-outline-variant/60 border-t pt-4 text-left">
            <h5 className="text-on-surface-variant/60 mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
              <Users className="size-3.5" /> Attendees (
              {selectedEvent.attendees.length})
            </h5>
            <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
              {selectedEvent.attendees.map((attendee: any, i: number) => (
                <div
                  key={i}
                  className="border-outline-variant/40 bg-surface-container-low flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border p-2"
                >
                  <span
                    className="text-on-surface max-w-full min-w-0 text-xs font-medium break-all sm:max-w-[220px] sm:truncate"
                    title={attendee.email}
                  >
                    {attendee.displayName || attendee.email}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${getResponseBadgeClass(attendee.responseStatus)}`}
                  >
                    {attendee.responseStatus || "needsAction"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-outline-variant/60 flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditModal(selectedEvent)}
            className="border-outline-variant text-on-surface hover:bg-surface-container flex h-9 items-center gap-1 rounded-xl border px-4 text-xs font-semibold"
          >
            <Edit className="size-4" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              selectedEvent.id &&
              handleDelete(
                selectedEvent.id,
                selectedEvent.calendarId || "primary",
              )
            }
            className="border-outline-variant flex h-9 items-center gap-1 rounded-xl border px-4 text-xs font-semibold text-rose-500 hover:border-rose-500/20 hover:bg-rose-500/5"
          >
            <Trash2 className="size-4" /> Delete
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => setSelectedEventId(null)}
            className="bg-primary text-on-primary hover:bg-primary-container h-9 rounded-xl px-4 text-xs font-semibold shadow-sm"
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
};
