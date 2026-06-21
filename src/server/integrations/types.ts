import type { FunctionTool } from "openai/resources/responses/responses";

// ─── Integration Lifecycle ──────────────────────────────────────────────────
// Every integration (Gmail, Calendar, Zoom, etc.) exposes these hooks so the
// integrations router can generically handle status / connect / disconnect.

export interface IntegrationStatus {
  connected: boolean;
  accountEmail?: string | null;
  accountName?: string | null;
}

export interface IntegrationDefinition {
  /** Unique identifier, e.g. "gmail", "googlecalendar", "zoom" */
  id: string;
  /** Human-readable label shown in Settings UI */
  label: string;

  /** Check whether the integration is connected for the given tenant. */
  getStatus(tenantId: string): Promise<IntegrationStatus>;
  /** Generate an OAuth / connect URL for the given tenant. */
  getConnectUrl(tenantId: string, redirectTo: string): Promise<{ url: string }>;
  /** Revoke / disconnect the integration for the given tenant. */
  disconnect(tenantId: string): Promise<{ success: boolean }>;
}

// ─── Agent Tools ────────────────────────────────────────────────────────────
// Each integration can expose zero or more tools that the LLM agent can call.

export interface AgentTool {
  /** OpenAI function-tool schema sent to the model. */
  definition: FunctionTool;
  /** Execute this tool. Called when the model invokes it. */
  execute(ctx: AgentToolContext): Promise<AgentToolResult>;
}

export type AgentToolContext = {
  tenantId: string;
  args: Record<string, unknown>;
  senderIdentity: { name?: string; email?: string };
};

export type AgentToolResult = {
  /** JSON string fed back to the model as the tool output. */
  output: string;
  /** Structured action surfaced in the chat UI (action cards). */
  action: ExecutedAction;
};

// ─── Executed Actions (shared by server + client) ───────────────────────────
// This is the single source of truth — frontend re-exports these via
// `import type` so no server code leaks into the client bundle.

export type CalendarActionEvent = {
  id?: string;
  calendarId?: string;
  summary?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  location?: string;
  attendees?: string[];
  calendarLink?: string;
  meetingLink?: string;
};

export type ExecutedAction =
  | {
      type: "send_email";
      to: string;
      subject: string;
      body?: string;
      success: boolean;
    }
  | {
      type: "create_email_draft";
      to: string;
      subject: string;
      body: string;
      draftId: string;
      messageId?: string;
      mailLink?: string;
      senderName?: string;
      senderEmail?: string;
      success: boolean;
    }
  | { type: "reply_to_email"; id: string; success: boolean }
  | {
      type: "create_calendar_event";
      eventId?: string;
      calendarLink?: string;
      meetingLink?: string;
      summary: string;
      startTime: string;
      endTime: string;
      description?: string;
      location?: string;
      attendees?: string[];
      event?: CalendarActionEvent;
      warnings?: string[];
      success: boolean;
    }
  | {
      type: "update_calendar_event";
      eventId: string;
      summary?: string;
      startTime?: string;
      endTime?: string;
      description?: string;
      location?: string;
      attendees?: string[];
      event?: CalendarActionEvent;
      warnings?: string[];
      success: boolean;
    }
  | {
      type: "delete_calendar_event";
      eventId: string;
      summary?: string;
      startTime?: string;
      endTime?: string;
      description?: string;
      location?: string;
      attendees?: string[];
      calendarLink?: string;
      meetingLink?: string;
      event?: CalendarActionEvent;
      success: boolean;
    }
  | { type: "search_emails"; query: string; count: number }
  | { type: "list_events"; count: number; events?: CalendarActionEvent[] };
