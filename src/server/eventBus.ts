import { EventEmitter } from "events";

export const eventBus = new EventEmitter();
eventBus.setMaxListeners(0);

export const EVENTS = {
  EMAIL_RECEIVED: "email_received",
  CALENDAR_EVENT_CHANGED: "calendar_event_changed",
} as const;
