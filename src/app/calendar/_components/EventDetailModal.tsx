import React, { useState, useEffect, useRef } from "react";
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
  anchorPosition?: { top: number; left: number; width: number; height: number } | null;
  formatTimeRange: (start: any, end: any) => string;
  getResponseBadgeClass: (status?: string) => string;
  openEditModal: (event: any) => void;
  handleDelete: (id: string, calendarId: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  selectedEvent,
  setSelectedEventId,
  anchorPosition,
  formatTimeRange,
  getResponseBadgeClass,
  openEditModal,
  handleDelete,
}) => {
  const inviteLink = selectedEvent.htmlLink || selectedEvent.calendarLink;
  const [isInviteLinkCopied, setIsInviteLinkCopied] = useState(false);

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
    setDragOffset({ x: 0, y: 0 });
  }, [anchorPosition]);

  useEffect(() => {
    if (!anchorPosition || isMobile) {
      setStyle({});
      return;
    }

    const updatePosition = () => {
      const cardEl = cardRef.current;
      if (!cardEl) return;

      const popoverWidth = cardEl.offsetWidth || 448;
      const popoverHeight = cardEl.offsetHeight || 300;

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
  }, [anchorPosition, dragOffset, isMobile]);

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

  const isPopover = !!anchorPosition && !isMobile;
  const isPositioned = !isPopover || style.top !== undefined;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto sm:overflow-visible">
      {/* Backdrop */}
      <div
        onClick={() => setSelectedEventId(null)}
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          isPopover ? "bg-transparent" : "bg-black/60 backdrop-blur-sm"
        }`}
      />

      {/* Popover / Modal Wrapper */}
      <div
        ref={cardRef}
        onClick={(e) => {
          if (!isPopover && e.target === e.currentTarget) {
            setSelectedEventId(null);
          }
        }}
        className={`z-50 w-full ${
          isPopover
            ? "shadow-2xl max-w-[28rem]"
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
        <Card className="border-outline bg-surface-container-lowest relative w-full max-w-[28rem] space-y-6 rounded-2xl border p-4 text-left shadow-2xl duration-200 sm:p-6">
          <button
            onClick={() => setSelectedEventId(null)}
            className="border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container absolute top-4 right-4 rounded-lg border p-1.5"
          >
            <X className="size-4" />
          </button>

          <div
            onMouseDown={handleMouseDown}
            className="space-y-1 text-left cursor-move select-none"
          >
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
    </div>
  );
};
