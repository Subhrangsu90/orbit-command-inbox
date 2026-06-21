import type {
  ExecutedAction,
  CalendarActionEvent,
} from "~/server/integrations/types";

export type { ExecutedAction, CalendarActionEvent };

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  actions?: ExecutedAction[];
};
