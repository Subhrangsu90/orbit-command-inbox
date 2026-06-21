"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { authClient } from "~/server/better-auth/client";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "email" | "calendar" | "system";
  unread: boolean;
}

interface NotificationContextProps {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllAsRead: () => void;
  clearAll: () => void;
  addNotification: (item: Omit<NotificationItem, "id" | "timestamp" | "unread">) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();
  const isConnected = !!session.data?.user;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("orbit_notifications");
    if (saved) {
      try {
        setNotifications(JSON.parse(saved) as NotificationItem[]);
      } catch (e) {
        console.error("Failed to parse notifications from storage:", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when state changes, only after initial load is complete
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("orbit_notifications", JSON.stringify(notifications));
    }
  }, [notifications, isLoaded]);

  // Connect to SSE stream
  useEffect(() => {
    if (!isConnected) return;

    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;

    function connect() {
      eventSource = new EventSource("/api/sse", { withCredentials: true });

      eventSource.onmessage = (event) => {
        if (event.data === "connected") {
          console.info("[SSE] Notification stream established.");
        }
      };

      eventSource.addEventListener("email_received", (e: MessageEvent) => {
        try {
          console.log("[NotificationContext] Received email_received SSE event raw data:", e.data);
          const data = JSON.parse(e.data) as { type: string; messageId: string };
          let title = "New Email Received";
          let description = "A new message is available in your inbox.";

          if (data.type === "priority_updated") {
            title = "Email Classified";
            description = "A new email has been evaluated for priority.";
          }

          // Emit browser custom event for pages to refetch
          window.dispatchEvent(new CustomEvent("email_received", { detail: data }));

          // Add to notification list (avoid duplicates for identical updates within 1s)
          addNotificationItem({
            title,
            description,
            type: "email",
          });
        } catch (err) {
          console.error("Failed to process email_received SSE event:", err);
        }
      });

      eventSource.addEventListener("calendar_event_changed", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as { type: string; calendarId: string; eventId?: string };
          let title = "Calendar Updated";
          let description = "Your calendar events were modified.";

          if (data.type === "eventCreated") {
            title = "Meeting Created";
            description = "A new meeting has been added to your calendar.";
          } else if (data.type === "eventUpdated") {
            title = "Meeting Modified";
            description = "A calendar event description or time was updated.";
          } else if (data.type === "eventDeleted") {
            title = "Meeting Cancelled";
            description = "An event has been removed from your calendar.";
          }

          // Emit browser custom event for pages to refetch
          window.dispatchEvent(new CustomEvent("calendar_event_changed", { detail: data }));

          // Add to notification list
          addNotificationItem({
            title,
            description,
            type: "calendar",
          });
        } catch (err) {
          console.error("Failed to process calendar_event_changed SSE event:", err);
        }
      });

      eventSource.onerror = (err) => {
        console.error("[SSE] Connection error/closed:", err);
        eventSource?.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      if (eventSource) eventSource.close();
      clearTimeout(retryTimeout);
    };
  }, [isConnected]);

  function addNotificationItem(item: Omit<NotificationItem, "id" | "timestamp" | "unread">) {
    console.log("[NotificationContext] addNotificationItem triggered:", item);
    const newItem: NotificationItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      unread: true,
      ...item,
    };
    setNotifications((prev) => {
      const updated = [newItem, ...prev];
      console.log("[NotificationContext] Updated notifications array:", updated);
      return updated.slice(0, 25);
    });
  }

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  function clearAll() {
    setNotifications([]);
  }

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllAsRead,
        clearAll,
        addNotification: addNotificationItem,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
