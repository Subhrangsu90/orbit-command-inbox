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

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  actions?: ExecutedAction[];
};
