import React from "react";
import { Clock } from "lucide-react";
import { sameDay, CALENDAR_COLORS } from "../utils";

interface WeekViewProps {
  currentDate: Date;
  weekGridDays: Date[];
  getAllDayEvents: (date: Date) => any[];
  getTimedEventsWithLayout: (date: Date) => any[];
  allCalendars: any[];
  setSelectedEventId: (id: string | null) => void;
  onAnchorSelect?: (rect: { top: number; left: number; width: number; height: number }) => void;
  handleTimeSlotClick: (date: Date, hour: number) => void;
  formatTimeRange: (start: any, end: any) => string;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  weekGridDays,
  getAllDayEvents,
  getTimedEventsWithLayout,
  allCalendars,
  setSelectedEventId,
  onAnchorSelect,
  handleTimeSlotClick,
  formatTimeRange,
  scrollContainerRef,
}) => {
  return (
    <div className="w-full overflow-x-auto scrollbar-thin rounded-2xl border border-outline-variant/60 shadow-sm bg-surface-container-lowest">
      <div className="min-w-[700px] md:min-w-0">
        {/* Header Row */}
        <div className="grid grid-cols-[64px_repeat(7,_1fr)] border-b border-outline-variant/60 bg-surface-container-low">
          <div className="border-r border-outline-variant/60"></div>
          {weekGridDays.map((day) => {
            const isToday = sameDay(day, new Date());
            const allDayEvents = getAllDayEvents(day);

            return (
              <div
                key={day.toISOString()}
                className="p-3 text-center border-r border-outline-variant/60 flex flex-col items-center justify-between min-h-[64px]"
              >
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span
                  className={`text-sm font-bold flex items-center justify-center rounded-full size-7 mt-1 ${
                    isToday ? "bg-primary text-on-primary" : "text-on-surface"
                  }`}
                >
                  {day.getDate()}
                </span>

                {/* All-Day Items */}
                {allDayEvents.length > 0 && (
                  <div className="w-full mt-2 space-y-1">
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
                          className={`w-full px-1.5 py-0.5 text-[9px] rounded font-bold truncate cursor-pointer hover:opacity-90 border ${colorClasses.pill}`}
                          title={ev.summary}
                        >
                          {ev.summary || "(All Day)"}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Timeline Grid (Scrollable) */}
        <div
          ref={scrollContainerRef}
          className="max-h-[600px] overflow-y-auto grid grid-cols-[64px_repeat(7,_1fr)] relative"
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

          {/* Day Columns */}
          {weekGridDays.map((day) => {
            const timedEvents = getTimedEventsWithLayout(day);

            return (
              <div
                key={day.toISOString()}
                className="relative border-r border-outline-variant/60 h-[1536px]" // 24 hours * 64px
              >
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
                      handleTimeSlotClick(day, hour);
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
                      className={`absolute p-1.5 rounded-lg border text-left overflow-hidden cursor-pointer transition-all shadow-sm z-10 hover:z-20 ${colorClasses.block}`}
                      style={{
                        top: `${startHour * 64}px`,
                        height: `${duration * 64}px`,
                        left: `${(colIdx / totalCols) * 100}%`,
                        width: `${(1 / totalCols) * 98}%`,
                      }}
                    >
                      <p className="text-[10px] font-bold text-on-surface truncate">
                        {event.summary || "(No Title)"}
                      </p>
                      <p className="text-[8px] text-on-surface-variant font-medium mt-0.5 flex items-center gap-0.5">
                        <Clock className="size-2" />
                        {formatTimeRange(event.start, event.end)}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
