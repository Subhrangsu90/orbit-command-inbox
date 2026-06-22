import React from "react";
import { Plus } from "lucide-react";
import { sameDay } from "../utils";
import { CALENDAR_COLORS } from "../utils";

interface MonthViewProps {
  currentDate: Date;
  monthGridDays: Date[];
  getEventsForDate: (date: Date) => any[];
  allCalendars: any[];
  setSelectedEventId: (id: string | null) => void;
  onAnchorSelect?: (rect: { top: number; left: number; width: number; height: number }) => void;
  handleCellClick: (date: Date) => void;
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: "day" | "week" | "month" | "year") => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  monthGridDays,
  getEventsForDate,
  allCalendars,
  setSelectedEventId,
  onAnchorSelect,
  handleCellClick,
  setCurrentDate,
  setViewMode,
}) => {
  return (
    <div className="w-full overflow-x-auto scrollbar-thin rounded-t-2xl">
      <div className="grid grid-cols-7 border-t border-l border-outline-variant/60 rounded-t-2xl overflow-hidden shadow-sm min-w-[700px] md:min-w-0">
        {/* Day of Week Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-3 text-center text-2xs font-bold text-on-surface-variant bg-surface-container-low border-r border-b border-outline-variant/60"
          >
            {day}
          </div>
        ))}

        {/* Day Cells */}
        {monthGridDays.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = sameDay(day, new Date());
          const dayEvents = getEventsForDate(day);

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[110px] p-2 bg-surface-container-lowest border-r border-b border-outline-variant/60 flex flex-col justify-between group transition hover:bg-surface-container-lowest/70 relative ${
                !isCurrentMonth ? "bg-surface-container-low/20" : ""
              }`}
            >
              {/* Day Number and Cell Actions */}
              <div className="flex justify-between items-center mb-1">
                <span
                  className={`text-2xs font-bold flex items-center justify-center rounded-full size-6 ${
                    isToday
                      ? "bg-primary text-on-primary"
                      : isCurrentMonth
                      ? "text-on-surface"
                      : "text-on-surface-variant/40"
                  }`}
                >
                  {day.getDate()}
                </span>
                <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onAnchorSelect?.({
                      top: rect.top,
                      left: rect.left,
                      width: rect.width,
                      height: rect.height,
                    });
                    handleCellClick(day);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-primary hover:bg-primary/5 border border-outline-variant/40 transition"
                  title="Schedule event"
                >
                  <Plus className="size-3" />
                </button>
              </div>

              {/* Day Event Pills */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px] pr-0.5 custom-scrollbar">
                {dayEvents.slice(0, 3).map((ev) => {
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
                      className={`px-1.5 py-0.5 text-[10px] rounded font-medium truncate cursor-pointer transition border ${colorClasses.pill}`}
                      title={ev.summary || "(No Title)"}
                    >
                      {ev.summary || "(No Title)"}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div
                    onClick={() => {
                      setCurrentDate(day);
                      setViewMode("day");
                    }}
                    className="text-[10px] text-primary font-bold cursor-pointer hover:underline pl-1"
                  >
                    + {dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
