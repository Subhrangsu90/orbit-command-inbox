import { createOpenAIChatClient } from "~/server/api/llm";
import type { ResponseFunctionToolCall } from "openai/resources/responses/responses";
import { emailsService } from "../emails/service";
import { calendarService } from "../calendar/service";
import { tools } from "./tools";
import { db } from "~/server/db";
import { user } from "~/server/db/schema/auth";
import { eq } from "drizzle-orm";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
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

type CalendarActionEvent = {
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

type ResponseInputItem = {
  role: "user" | "assistant";
  content: string;
};

type SenderIdentity = {
  name?: string;
  email?: string;
};

async function getSenderIdentity(userId: string): Promise<SenderIdentity> {
  let accountUser: SenderIdentity = {};

  try {
    accountUser = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .then((rows) => ({
        name: rows[0]?.name?.trim() || undefined,
        email: rows[0]?.email?.trim() || undefined,
      }));
  } catch (error) {
    console.error("Failed to load agent account identity:", error);
  }

  try {
    const connectedProfile = await emailsService.getConnectedProfile(userId);
    return {
      name: accountUser.name,
      email: connectedProfile.email ?? accountUser.email,
    };
  } catch (error) {
    console.error("Failed to load connected Gmail identity:", error);
    return accountUser;
  }
}

function formatSenderIdentity(identity: SenderIdentity) {
  if (identity.name && identity.email) {
    return `${identity.name} <${identity.email}>`;
  }

  return identity.name ?? identity.email ?? "the connected Gmail account";
}

function summarizeCalendarEvent(
  event: any,
  fallbackCalendarId?: string,
): CalendarActionEvent {
  return {
    id: event?.id,
    calendarId: event?.calendarId ?? fallbackCalendarId,
    summary: event?.summary,
    startTime: event?.start?.dateTime ?? event?.start?.date,
    endTime: event?.end?.dateTime ?? event?.end?.date,
    description: event?.description,
    location: event?.location,
    attendees: Array.isArray(event?.attendees)
      ? event.attendees
          .map((attendee: any) => attendee?.email)
          .filter(
            (email: unknown): email is string => typeof email === "string",
          )
      : undefined,
    calendarLink: event?.htmlLink,
    meetingLink: event?.hangoutLink,
  };
}

function summarizeModelError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { message: String(error) };
  }

  const maybeError = error as {
    code?: unknown;
    status?: unknown;
    type?: unknown;
    requestID?: unknown;
    message?: unknown;
  };

  return {
    code: typeof maybeError.code === "string" ? maybeError.code : undefined,
    status:
      typeof maybeError.status === "number" ? maybeError.status : undefined,
    type: typeof maybeError.type === "string" ? maybeError.type : undefined,
    requestID:
      typeof maybeError.requestID === "string"
        ? maybeError.requestID
        : undefined,
    message:
      typeof maybeError.message === "string"
        ? maybeError.message
        : "Unknown model error",
  };
}

export const agentService = {
  async chat(
    tenantId: string,
    input: { messages: Message[] },
  ): Promise<{
    response: string;
    actions: ExecutedAction[];
    messages: Message[];
  }> {
    const llm = createOpenAIChatClient();
    if (!llm) {
      return {
        response:
          "OpenAI agent config is missing. Please add `OPENAI_API_KEY` and `OPENAI_CHAT_MODEL` to your `.env` file.",
        actions: [],
        messages: input.messages,
      };
    }
    const now = new Date();
    const senderIdentity = await getSenderIdentity(tenantId);
    const senderLabel = formatSenderIdentity(senderIdentity);
    const systemPrompt = `You are Tacta Assistant, a smart, warm, and proactive email and calendar copilot inside Tacta Workspace.

Current date/time:
- Date: ${now.toDateString()}
- Local time: ${now.toLocaleTimeString()}
- Time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

Connected sender identity:
- Drafts and sent emails use the user's connected Gmail account.
- Use this sender for email sign-offs: ${senderLabel}
- Do not invent a different sender name, email address, or signature.

Conversation style:
- Be friendly, concise, and proactive. Use a warm, professional tone — never robotic or overly formal.
- When the user greets you casually (e.g. "hi", "hello", "hey", "good morning"), respond warmly${senderIdentity.name ? ` using their name (${senderIdentity.name.split(" ")[0]})` : ""} and proactively offer to help with specific things you can do. For example: check their upcoming events, summarize recent emails, draft a message, or schedule a meeting. Don't just say "How can I assist you?" — be specific and useful.
- When no tools are needed, give helpful, conversational responses. Share relevant context like "You have 3 events today" or "Your inbox has new messages" when appropriate.
- Keep responses concise but not terse. Add personality — you're a helpful assistant, not a command processor.

Core behavior:
- Understand the user's intent, break multi-step requests into individual tasks, and complete the useful parts with tools.
- Be concise, clear, and action-oriented. Do not over-explain internal reasoning.
- If a required detail is missing for an irreversible action, ask one short follow-up question.
- Use ISO-8601 times for calendar tools. Resolve relative dates from the current local date/time above.

Email rules:
- Always use create_email_draft before any new outbound email, even when the user says "send". The user must see the draft before it is sent.
- Use send_email only after the user clearly confirms a draft or exact final content that was already shown in the conversation.
- Use reply_to_email only when a concrete message id is available or was found via search_emails.
- Email bodies should be polished plain text with greeting, concise body, and sign-off when appropriate.
- For sign-offs, prefer "Best regards," followed by the connected sender name when available; if no name is available, use the connected sender email or omit the name.

Calendar and invitation rules:
- Before scheduling a meeting or event, check the requested time slot with list_events when the user gives a concrete date/time.
- Before updating or deleting a calendar event, use list_events to find the exact event id unless the id is already available in the conversation.
- Overlapping events are allowed, but creating or updating an event that overlaps an existing one returns a warning. When a tool result includes "warnings", tell the user about the overlap (what it conflicts with) so they can confirm the double-booking was intentional.
- Exact duplicates (same title in the same exact start/end slot) are blocked. If that happens, tell the user the event already exists instead of retrying.
- Use create_calendar_event for meetings, reminders, calls, interviews, invites, or scheduling.
- Use update_calendar_event for rescheduling or changing a known event. Use delete_calendar_event only when the user clearly asks to cancel/delete a known event.
- If attendees are included, create_calendar_event sends Google Calendar invitation updates automatically.
- If the user asks for an invitation email too, create the calendar event first, then create_email_draft mentioning the meeting details and that a calendar invite was sent. Do not send the email until the user confirms the shown draft.
- Do not invent a meeting link unless the user provides one; put provided video/meeting links in the event location or description and in the email body.

After tools:
- Summarize exactly what happened: drafted, sent, scheduled, searched, or listed.
- When an event is scheduled, include the title, start/end time, attendees, location/link, and event id when available.
- When an email draft is created, tell the user it is ready for review and ask for confirmation before sending.`;

    const conversationInput: ResponseInputItem[] = input.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      }));

    // Map tool names to execution functions
    const actionsTaken: ExecutedAction[] = [];
    let responseId: string | null = null;
    let nextInput: unknown = conversationInput;

    // Let's run a loop for up to 5 tool-calling iterations to prevent infinite loops
    let runIteration = 0;
    while (runIteration < 5) {
      runIteration++;

      let response;
      try {
        response = await llm.client.responses.create({
          model: llm.model,
          input: nextInput as any,
          instructions: systemPrompt,
          previous_response_id: responseId,
          tools,
          tool_choice: "auto",
        });
      } catch (error) {
        const modelError = summarizeModelError(error);
        console.error(
          `Error calling OpenAI agent model (${llm.model}):`,
          modelError,
        );

        const modelAccessHint =
          modelError.code === "model_not_found"
            ? ` The OpenAI project for this API key does not have access to \`${llm.model}\`; set \`OPENAI_CHAT_MODEL\` to a model available in that same project.`
            : "";

        return {
          response: `I could not reach the configured OpenAI model (${llm.model}).${modelAccessHint}`,
          actions: actionsTaken,
          messages: input.messages,
        };
      }

      responseId = response.id;
      const functionCalls = response.output.filter(
        (item): item is ResponseFunctionToolCall =>
          item.type === "function_call",
      );

      if (functionCalls.length === 0) {
        // No more tool calls, return final response
        const responseText = response.output_text ?? "";
        return {
          response: responseText,
          actions: actionsTaken,
          messages: [
            ...input.messages,
            { role: "assistant", content: responseText },
          ],
        };
      }

      // Process tool calls
      const toolOutputs = [];
      for (const toolCall of functionCalls) {
        const functionName = toolCall.name;
        const functionArgs = JSON.parse(toolCall.arguments || "{}");
        let toolOutput = "";

        try {
          if (functionName === "send_email") {
            const res = await emailsService.send(tenantId, {
              to: functionArgs.to,
              subject: functionArgs.subject,
              body: functionArgs.body,
            });
            actionsTaken.push({
              type: "send_email",
              to: functionArgs.to,
              subject: functionArgs.subject,
              body: functionArgs.body,
              success: res.success,
            });
            toolOutput = JSON.stringify({ success: true, messageId: res.id });
          } else if (functionName === "create_email_draft") {
            const res = await emailsService.createDraft(tenantId, {
              to: functionArgs.to,
              subject: functionArgs.subject,
              body: functionArgs.body,
            });
            actionsTaken.push({
              type: "create_email_draft",
              to: functionArgs.to,
              subject: functionArgs.subject,
              body: functionArgs.body,
              draftId: res.id,
              messageId: res.messageId,
              mailLink: res.messageId
                ? `/mail/${encodeURIComponent(res.messageId)}?mailbox=drafts&draftId=${encodeURIComponent(res.id)}`
                : "/mail?mailbox=drafts",
              senderName: senderIdentity.name,
              senderEmail: senderIdentity.email,
              success: res.success,
            });
            toolOutput = JSON.stringify({
              success: true,
              draftId: res.id,
              messageId: res.messageId,
              mailLink: res.messageId
                ? `/mail/${encodeURIComponent(res.messageId)}?mailbox=drafts&draftId=${encodeURIComponent(res.id)}`
                : "/mail?mailbox=drafts",
            });
          } else if (functionName === "reply_to_email") {
            const res = await emailsService.reply(tenantId, {
              id: functionArgs.id,
              body: functionArgs.body,
            });
            actionsTaken.push({
              type: "reply_to_email",
              id: functionArgs.id,
              success: res.success,
            });
            toolOutput = JSON.stringify({
              success: true,
              threadId: res.threadId,
            });
          } else if (functionName === "create_calendar_event") {
            const res = await calendarService.create(tenantId, {
              summary: functionArgs.summary,
              description: functionArgs.description,
              location: functionArgs.location,
              startTime: functionArgs.startTime,
              endTime: functionArgs.endTime,
              attendees: functionArgs.attendees,
            });
            const event = {
              id: res.id,
              summary: functionArgs.summary,
              startTime: functionArgs.startTime,
              endTime: functionArgs.endTime,
              description: functionArgs.description,
              location: functionArgs.location,
              attendees: functionArgs.attendees,
              calendarLink: res.htmlLink,
              meetingLink: res.hangoutLink,
            } satisfies CalendarActionEvent;
            actionsTaken.push({
              type: "create_calendar_event",
              eventId: res.id,
              calendarLink: res.htmlLink,
              meetingLink: res.hangoutLink,
              summary: functionArgs.summary,
              startTime: functionArgs.startTime,
              endTime: functionArgs.endTime,
              description: functionArgs.description,
              location: functionArgs.location,
              attendees: functionArgs.attendees,
              event,
              warnings: res.warnings,
              success: res.success,
            });
            toolOutput = JSON.stringify({
              success: true,
              eventId: res.id,
              calendarLink: res.htmlLink,
              meetingLink: res.hangoutLink,
              summary: functionArgs.summary,
              startTime: functionArgs.startTime,
              endTime: functionArgs.endTime,
              description: functionArgs.description,
              location: functionArgs.location,
              attendees: functionArgs.attendees,
              warnings: res.warnings,
            });
          } else if (functionName === "update_calendar_event") {
            const res = await calendarService.update(tenantId, {
              id: functionArgs.id,
              calendarId: functionArgs.calendarId,
              summary: functionArgs.summary,
              description: functionArgs.description,
              location: functionArgs.location,
              startTime: functionArgs.startTime,
              endTime: functionArgs.endTime,
              attendees: functionArgs.attendees,
            });
            const updatedEvent = summarizeCalendarEvent(
              await calendarService.get(tenantId, {
                id: res.id,
                calendarId: functionArgs.calendarId,
              }),
            );
            actionsTaken.push({
              type: "update_calendar_event",
              eventId: res.id,
              summary: updatedEvent.summary ?? functionArgs.summary,
              startTime: updatedEvent.startTime ?? functionArgs.startTime,
              endTime: updatedEvent.endTime ?? functionArgs.endTime,
              description: updatedEvent.description ?? functionArgs.description,
              location: updatedEvent.location ?? functionArgs.location,
              attendees: updatedEvent.attendees ?? functionArgs.attendees,
              event: updatedEvent,
              warnings: res.warnings,
              success: res.success,
            });
            toolOutput = JSON.stringify({
              success: true,
              eventId: res.id,
              summary: functionArgs.summary,
              startTime: functionArgs.startTime,
              endTime: functionArgs.endTime,
              description: functionArgs.description,
              location: functionArgs.location,
              attendees: functionArgs.attendees,
              warnings: res.warnings,
            });
          } else if (functionName === "delete_calendar_event") {
            const deletedEvent = summarizeCalendarEvent(
              await calendarService.get(tenantId, {
                id: functionArgs.id,
                calendarId: functionArgs.calendarId,
              }),
              functionArgs.calendarId,
            );
            const res = await calendarService.delete(tenantId, {
              id: functionArgs.id,
              calendarId: functionArgs.calendarId,
            });
            actionsTaken.push({
              type: "delete_calendar_event",
              eventId: functionArgs.id,
              summary: deletedEvent.summary,
              startTime: deletedEvent.startTime,
              endTime: deletedEvent.endTime,
              description: deletedEvent.description,
              location: deletedEvent.location,
              attendees: deletedEvent.attendees,
              calendarLink: deletedEvent.calendarLink,
              meetingLink: deletedEvent.meetingLink,
              event: deletedEvent,
              success: res.success,
            });
            toolOutput = JSON.stringify({
              success: true,
              eventId: functionArgs.id,
              event: deletedEvent,
            });
          } else if (functionName === "search_emails") {
            const res = await emailsService.list(tenantId, {
              q: functionArgs.q,
              mailbox: functionArgs.mailbox || "inbox",
              maxResults: functionArgs.maxResults || 10,
            });
            actionsTaken.push({
              type: "search_emails",
              query: functionArgs.q || "",
              count: res.messages.length,
            });
            // Send summarized info of messages back to model
            const simplifiedMessages = res.messages.map((m) => ({
              id: m.id,
              subject: m.subject,
              from: m.from,
              date: m.date,
              snippet: m.snippet,
            }));
            toolOutput = JSON.stringify({ messages: simplifiedMessages });
          } else if (functionName === "list_events") {
            const res = await calendarService.list(tenantId, {
              timeMin: functionArgs.timeMin,
              q: functionArgs.q,
              maxResults: functionArgs.maxResults || 10,
              calendarIds: functionArgs.calendarIds,
            });
            const events = res.events.map((event) =>
              summarizeCalendarEvent(event),
            );
            actionsTaken.push({
              type: "list_events",
              count: res.events.length,
              events,
            });
            const simplifiedEvents = events.map((e) => ({
              id: e.id,
              summary: e.summary,
              startTime: e.startTime,
              endTime: e.endTime,
              description: e.description,
              location: e.location,
              attendees: e.attendees,
            }));
            toolOutput = JSON.stringify({ events: simplifiedEvents });
          } else {
            toolOutput = JSON.stringify({
              error: `Unknown tool: ${functionName}`,
            });
          }
        } catch (error: any) {
          console.error(`Error executing tool ${functionName}:`, error);
          toolOutput = JSON.stringify({
            error: error?.message || "Internal execution error",
          });
        }

        toolOutputs.push({
          type: "function_call_output",
          call_id: toolCall.call_id,
          output: toolOutput,
        });
      }

      nextInput = toolOutputs;
    }

    return {
      response:
        "I processed your request but exceeded my tool execution limit.",
      actions: actionsTaken,
      messages: input.messages,
    };
  },
};
