import type { ReactNode } from "react";
import type { ExecutedAction } from "../../types";
import {
  SendEmailCard,
  CreateEmailDraftCard,
  ReplyToEmailCard,
} from "./GmailActionCards";
import {
  CreateCalendarEventCard,
  UpdateCalendarEventCard,
  DeleteCalendarEventCard,
} from "./CalendarActionCards";

export const actionCardRegistry: Record<
  ExecutedAction["type"],
  (action: any) => ReactNode
> = {
  send_email: (action) => <SendEmailCard action={action} />,
  create_email_draft: (action) => <CreateEmailDraftCard action={action} />,
  reply_to_email: (action) => <ReplyToEmailCard action={action} />,
  search_emails: () => null,
  create_calendar_event: (action) => <CreateCalendarEventCard action={action} />,
  update_calendar_event: (action) => <UpdateCalendarEventCard action={action} />,
  delete_calendar_event: (action) => <DeleteCalendarEventCard action={action} />,
  list_events: () => null,
};
