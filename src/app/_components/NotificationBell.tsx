"use client";

import { useState, useEffect, useRef } from "react";
import { useNotifications } from "./notificationContext";
import { Bell, Mail, Calendar, Trash2, Check, BellOff, X } from "lucide-react";

export function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotifications();
  console.log("[NotificationBell] Rendered notifications list:", notifications, "unreadCount:", unreadCount);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function formatRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Icon Trigger */}
      <button
        aria-label="Open notifications"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative text-on-surface-variant hover:bg-surface-container-high hover:text-primary grid size-10 place-items-center rounded-full transition-colors cursor-pointer"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-on-primary animate-scale-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Notification List */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-outline-variant/30 bg-surface shadow-xl text-on-surface animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/20 px-4 py-3 bg-surface-container/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/80">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={() => markAllAsRead()}
                    title="Mark all as read"
                    type="button"
                    className="flex size-7 items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    onClick={() => clearAll()}
                    title="Clear all"
                    type="button"
                    className="flex size-7 items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={() => setIsOpen(false)}
                type="button"
                className="flex size-7 items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer md:hidden"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* List Area */}
          <div className="max-h-[350px] overflow-y-auto divide-y divide-outline-variant/10 scrollbar-thin scrollbar-thumb-outline-variant">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="rounded-full bg-outline-variant/10 p-3 text-on-surface-variant/40 mb-3">
                  <BellOff className="size-6" />
                </div>
                <p className="text-sm font-semibold text-on-surface">No notifications</p>
                <p className="text-xs text-on-surface-variant mt-1 max-w-[200px]">
                  Real-time events from connected accounts will show up here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const isEmail = notification.type === "email";
                const isCalendar = notification.type === "calendar";

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 p-4 transition-all duration-200 ${
                      notification.unread
                        ? "bg-primary/5 hover:bg-primary/10 border-l-2 border-primary"
                        : "hover:bg-surface-container/20 border-l-2 border-transparent"
                    }`}
                  >
                    {/* Icon Container */}
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-xl border ${
                        isEmail
                          ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                          : isCalendar
                          ? "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400"
                          : "bg-surface-container border-outline-variant text-on-surface-variant"
                      }`}
                    >
                      {isEmail ? (
                        <Mail className="size-4" />
                      ) : isCalendar ? (
                        <Calendar className="size-4" />
                      ) : (
                        <Bell className="size-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-on-surface leading-tight">
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-on-surface-variant shrink-0 leading-none mt-0.5">
                          {formatRelativeTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1 leading-normal break-words">
                        {notification.description}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-outline-variant/20 px-4 py-2 bg-surface-container/10 flex justify-center">
              <span className="text-[10px] text-on-surface-variant/60 font-medium">
                Showing last 25 realtime updates
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
