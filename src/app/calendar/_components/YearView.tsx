import React from "react";
import { Card } from "~/app/_components/ui/card";
import { sameDay } from "../utils";

interface YearViewProps {
  currentDate: Date;
  getEventsForDate: (date: Date) => any[];
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: "day" | "week" | "month" | "year") => void;
}

export const YearView: React.FC<YearViewProps> = ({
  currentDate,
  getEventsForDate,
  setCurrentDate,
  setViewMode,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 12 }).map((_, mIdx) => {
        const tempDate = new Date(currentDate.getFullYear(), mIdx, 1);
        const daysInMonth = new Date(currentDate.getFullYear(), mIdx + 1, 0).getDate();
        const startOffset = tempDate.getDay();

        return (
          <Card
            key={mIdx}
            className="p-4 border border-outline-variant/60 bg-surface-container-lowest/50 shadow-sm flex flex-col"
          >
            <h4 className="font-serif text-sm font-bold text-primary mb-2 text-left uppercase tracking-wider">
              {tempDate.toLocaleDateString("en-US", { month: "long" })}
            </h4>
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-on-surface-variant mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 flex-1">
              {/* Offset padding */}
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={i} />
              ))}

              {/* Days of Month */}
              {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                const activeDay = new Date(currentDate.getFullYear(), mIdx, dIdx + 1);
                const dayEvents = getEventsForDate(activeDay);
                const isToday = sameDay(activeDay, new Date());

                return (
                  <button
                    key={dIdx}
                    onClick={() => {
                      setCurrentDate(activeDay);
                      setViewMode("month");
                    }}
                    className={`relative py-1 rounded-full text-[10px] font-semibold transition hover:bg-surface-container-high ${
                      isToday
                        ? "bg-primary text-on-primary font-bold shadow-sm"
                        : "text-on-surface"
                    }`}
                  >
                    {dIdx + 1}
                    {dayEvents.length > 0 && (
                      <span
                        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full ${
                          isToday ? "bg-on-primary" : "bg-primary"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
