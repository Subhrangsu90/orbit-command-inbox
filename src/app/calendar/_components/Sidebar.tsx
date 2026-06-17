import React, { useState } from "react";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  Check,
} from "lucide-react";
import { Card } from "~/app/_components/ui/card";
import { sameDay, CALENDAR_COLORS } from "../utils";

interface SidebarProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  myCalendars: any[];
  otherCalendars: any[];
  checkedCalendars: Record<string, boolean>;
  setCheckedCalendars: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  miniCalendarMonth: Date;
  setMiniCalendarMonth: (date: Date) => void;
  miniCalendarDays: Date[];
  searchPeopleQuery: string;
  setSearchPeopleQuery: (query: string) => void;
  handleCheckAvailability: () => void;
  isCheckingAvailability: boolean;
  availabilityError: string | null;
  availabilityResult: any;
  localSearchQuery: string;
  setLocalSearchQuery: (query: string) => void;
  isLoadingLocalSearch: boolean;
  localSearchResults: any;
  setSelectedEventId: (id: string | null) => void;
  setIsCreateOpen: (open: boolean) => void;
  setEventCalendarId: (id: string) => void;
  primaryCalendar: any;
  allCalendars: any[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDate,
  setCurrentDate,
  myCalendars,
  otherCalendars,
  checkedCalendars,
  setCheckedCalendars,
  miniCalendarMonth,
  setMiniCalendarMonth,
  miniCalendarDays,
  searchPeopleQuery,
  setSearchPeopleQuery,
  handleCheckAvailability,
  isCheckingAvailability,
  availabilityError,
  availabilityResult,
  localSearchQuery,
  setLocalSearchQuery,
  isLoadingLocalSearch,
  localSearchResults,
  setSelectedEventId,
  setIsCreateOpen,
  setEventCalendarId,
  primaryCalendar,
  allCalendars,
}) => {
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);

  return (
    <div className="w-full lg:w-64 shrink-0 flex flex-col gap-6 lg:border-l lg:border-outline-variant/60 lg:pl-6 pb-6 pr-1 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto custom-scrollbar">
      {/* Create Button with Dropdown */}
      <div className="relative shrink-0">
        <button
          onClick={() => setCreateDropdownOpen(!createDropdownOpen)}
          className="flex items-center justify-between w-full px-5 py-3 bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface rounded-2xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] font-bold text-xs"
        >
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-primary" />
            <span>Create</span>
          </div>
          <ChevronDown className="size-3.5 text-on-surface-variant" />
        </button>

        {createDropdownOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setCreateDropdownOpen(false)} />
            <div className="absolute left-0 mt-2 w-full bg-surface-container-lowest border border-outline rounded-xl shadow-xl z-40 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => {
                  setCreateDropdownOpen(false);
                  setEventCalendarId(primaryCalendar?.id || "primary");
                  setIsCreateOpen(true);
                }}
                className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-surface-container text-on-surface flex items-center gap-2"
              >
                <Calendar className="size-3.5 text-primary" /> Event
              </button>
              <button
                onClick={() => {
                  setCreateDropdownOpen(false);
                  const tasksCal = allCalendars.find(
                    (c) => c.id.includes("tasks") || c.name.toLowerCase().includes("tasks")
                  );
                  setEventCalendarId(tasksCal?.id || primaryCalendar?.id || "primary");
                  setIsCreateOpen(true);
                }}
                className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-surface-container text-on-surface flex items-center gap-2"
              >
                <Check className="size-3.5 text-indigo-500" /> Task
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mini Calendar (Date Picker) */}
      <div className="border border-outline-variant/60 rounded-2xl p-3 bg-surface-container-lowest/50 shadow-sm shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-on-surface tracking-tight">
            {miniCalendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setMiniCalendarMonth(new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth() - 1, 1))}
              className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant transition"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              onClick={() => setMiniCalendarMonth(new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth() + 1, 1))}
              className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant transition"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-on-surface-variant/60 mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {miniCalendarDays.map((day, dIdx) => {
            const isCurrentMonth = day.getMonth() === miniCalendarMonth.getMonth();
            const isSelected = sameDay(day, currentDate);
            const isToday = sameDay(day, new Date());

            return (
              <button
                key={dIdx}
                onClick={() => {
                  setCurrentDate(day);
                  setMiniCalendarMonth(day);
                }}
                className={`size-6 text-[10px] font-semibold transition rounded-full flex items-center justify-center ${
                  isSelected
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : isToday
                    ? "text-primary border border-primary/30"
                    : isCurrentMonth
                    ? "text-on-surface hover:bg-surface-container-high"
                    : "text-on-surface-variant/30"
                }`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Box / Search for People */}
      <div className="shrink-0 flex flex-col gap-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for people"
            value={searchPeopleQuery}
            onChange={(e) => {
              setSearchPeopleQuery(e.target.value);
            }}
            className="w-full h-9 pl-8 pr-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-on-surface-variant/60" />
        </div>

        {/* Check availability status */}
        {searchPeopleQuery && searchPeopleQuery.includes("@") && (
          <div className="flex flex-col gap-2 p-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-on-surface-variant">Check Availability</span>
              <button
                onClick={handleCheckAvailability}
                disabled={isCheckingAvailability}
                className="text-[10px] bg-primary text-on-primary hover:bg-primary-container px-2 py-1 rounded-lg font-semibold disabled:opacity-50 transition"
              >
                {isCheckingAvailability ? "Checking..." : "Check"}
              </button>
            </div>

            {availabilityError && (
              <span className="text-[10px] text-rose-500 font-medium">{availabilityError}</span>
            )}

            {availabilityResult && (
              <div className="space-y-1.5 mt-1 border-t border-outline-variant/30 pt-1.5">
                <div className="flex items-center gap-1.5">
                  <div className={`size-2 rounded-full ${availabilityResult.busy.length === 0 ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="text-3xs font-bold text-on-surface uppercase tracking-wide">
                    {availabilityResult.busy.length === 0 ? "Available all day" : `${availabilityResult.busy.length} Busy Slot(s)`}
                  </span>
                </div>
                {availabilityResult.busy.length > 0 && (
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {availabilityResult.busy.map((slot: any, index: number) => {
                      const start = slot.start ? new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                      const end = slot.end ? new Date(slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                      return (
                        <div key={index} className="text-3xs text-on-surface-variant/95 bg-surface-container-high/40 px-2 py-1 rounded border border-outline-variant/30 font-semibold">
                          {start} - {end}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Local DB Search */}
      <div className="shrink-0 flex flex-col gap-2">
        <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider">Search Synced Database</span>
        <div className="relative">
          <input
            type="text"
            placeholder="Search local events (min 2 chars)"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-xs bg-surface-container border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-on-surface-variant/60" />
        </div>

        {isLoadingLocalSearch && (
          <span className="text-[10px] text-on-surface-variant/70 animate-pulse pl-1">Searching database...</span>
        )}

        {localSearchQuery.length >= 2 && localSearchResults && (
          <div className="space-y-1.5 mt-0.5 border border-outline-variant/40 rounded-xl p-2 bg-surface-container-low max-h-40 overflow-y-auto text-left">
            {localSearchResults.rows.length === 0 ? (
              <p className="text-3xs text-on-surface-variant/70 italic text-center p-1">No matching events found</p>
            ) : (
              localSearchResults.rows.map((row: any) => {
                const eventData = row.data || {};
                return (
                  <button
                    key={row.id}
                    onClick={() => setSelectedEventId(row.entityId)}
                    className="w-full text-left p-1.5 rounded hover:bg-surface-container-high transition border border-transparent hover:border-outline-variant/30 flex flex-col gap-0.5"
                  >
                    <span className="text-2xs font-semibold text-on-surface truncate">{eventData.summary || "(No Title)"}</span>
                    {eventData.start?.dateTime && (
                      <span className="text-3xs text-on-surface-variant/85">
                        {new Date(eventData.start.dateTime).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* My Calendars */}
      {myCalendars.length > 0 && (
        <div className="shrink-0 flex flex-col gap-2">
          <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider">My calendars</span>
          <div className="space-y-1.5 pl-1">
            {myCalendars.map((cal) => {
              const colorClasses = CALENDAR_COLORS[cal.color as keyof typeof CALENDAR_COLORS] || CALENDAR_COLORS.blue;
              return (
                <label key={cal.id} className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-on-surface select-none hover:text-on-surface-variant transition">
                  <input
                    type="checkbox"
                    checked={checkedCalendars[cal.id] !== false}
                    onChange={() => setCheckedCalendars(prev => ({ ...prev, [cal.id]: !prev[cal.id] }))}
                    className={`rounded size-3.5 border-outline-variant focus:ring-0 ${colorClasses.checkbox}`}
                  />
                  <span>{cal.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Calendars */}
      {otherCalendars.length > 0 && (
        <div className="shrink-0 flex flex-col gap-2">
          <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider">Other calendars</span>
          <div className="space-y-1.5 pl-1">
            {otherCalendars.map((cal) => {
              const colorClasses = CALENDAR_COLORS[cal.color as keyof typeof CALENDAR_COLORS] || CALENDAR_COLORS.blue;
              return (
                <label key={cal.id} className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-on-surface select-none hover:text-on-surface-variant transition">
                  <input
                    type="checkbox"
                    checked={checkedCalendars[cal.id] !== false}
                    onChange={() => setCheckedCalendars(prev => ({ ...prev, [cal.id]: !prev[cal.id] }))}
                    className={`rounded size-3.5 border-outline-variant focus:ring-0 ${colorClasses.checkbox}`}
                  />
                  <span>{cal.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
