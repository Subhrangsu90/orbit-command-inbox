import { EventEmitter } from "events";

export const eventBus = new EventEmitter();
eventBus.setMaxListeners(0);

export const EVENTS = {
  EMAIL_RECEIVED: "email_received",
} as const;
