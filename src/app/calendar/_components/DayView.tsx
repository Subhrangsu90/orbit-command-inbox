import React from "react";
import { Clock, MapPin } from "lucide-react";
import { CALENDAR_COLORS } from "../utils";

interface DayViewProps {
  currentDate: Date;
  getAllDayEvents: (date: Date) => any[];
  getTimedEventsWithLayout: (date: Date) => any[];
  allCalendars: any[];
  setSelectedEventId: (id: string | null) => void;
  onAnchorSelect?: (rect: { top: number; left: number; width: number; height: number }) => void;
  handleTimeSlotClick: (date: Date, hour: number) => void;
  formatTimeRange: (start: any, end: any) => string;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  getAllDayEvents,
  getTimedEventsWithLayout,
  allCalendars,
  setSelectedEventId,
  onAnchorSelect,
  handleTimeSlotClick,
  formatTimeRange,
  scrollContainerRef,
}) => {
  const allDayEvents = getAllDayEvents(currentDate);
  const timedEvents = getTimedEventsWithLayout(currentDate);

  return (
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
          {allDayEvents.length > 0 && (
            <div className="flex flex-wrap gap-2 max-w-[50%]">
              {allDayEvents.map((ev) => {
                const cal = allCalendars.find((c) => c.id === ev.calendarId);
                const colorClasses = cal
                  ? CALENDAR_COLORS[cal.color as keyof typeof CALENDAR_COLORS] || CALENDAR_COLORS.blue
                  : CALENDAR_COLORS.blue;
                return (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onAnchorSelect?.({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                      });
                      setSelectedEventId(ev.id ?? null);
                    }}
                    className={`px-2.5 py-1 text-[10px] rounded-full font-bold cursor-pointer hover:opacity-90 shadow-sm border ${colorClasses.pill}`}
                  >
                    All-Day: {ev.summary || "(No Title)"}
                  </div>
                );
              })}
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
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onAnchorSelect?.({
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                });
                handleTimeSlotClick(currentDate, hour);
              }}
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

            const cal = allCalendars.find((c) => c.id === event.calendarId);
            const colorClasses = cal
              ? CALENDAR_COLORS[cal.color as keyof typeof CALENDAR_COLORS] || CALENDAR_COLORS.blue
              : CALENDAR_COLORS.blue;
            return (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onAnchorSelect?.({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                  });
                  setSelectedEventId(event.id ?? null);
                }}
                className={`absolute p-3 rounded-xl border text-left overflow-hidden cursor-pointer transition-all shadow-sm z-10 hover:z-20 ${colorClasses.block}`}
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
  );
};
