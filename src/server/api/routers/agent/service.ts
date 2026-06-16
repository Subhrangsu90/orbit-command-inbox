import { createOpenAIChatClient } from "~/server/api/llm";
import type { ResponseFunctionToolCall } from "openai/resources/responses/responses";
import { emailsService } from "../emails/service";
import { calendarService } from "../calendar/service";
import { tools } from "./tools";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ExecutedAction =
  | { type: "send_email"; to: string; subject: string; success: boolean }
  | { type: "reply_to_email"; id: string; success: boolean }
  | { type: "create_calendar_event"; summary: string; startTime: string; success: boolean }
  | { type: "search_emails"; query: string; count: number }
  | { type: "list_events"; count: number };

type ResponseInputItem = {
  role: "user" | "assistant";
  content: string;
};

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
    status: typeof maybeError.status === "number" ? maybeError.status : undefined,
    type: typeof maybeError.type === "string" ? maybeError.type : undefined,
    requestID: typeof maybeError.requestID === "string" ? maybeError.requestID : undefined,
    message:
      typeof maybeError.message === "string"
        ? maybeError.message
        : "Unknown model error",
  };
}

export const agentService = {
  async chat(
    tenantId: string,
    input: { messages: Message[] }
  ): Promise<{ response: string; actions: ExecutedAction[]; messages: Message[] }> {
    const llm = createOpenAIChatClient();
    if (!llm) {
      return {
        response: "OpenAI agent config is missing. Please add `OPENAI_API_KEY` and `OPENAI_CHAT_MODEL` to your `.env` file.",
        actions: [],
        messages: input.messages,
      };
    }
    const systemPrompt = `You are Orbit Assistant, a premium AI copilot built into the Orbit Command Inbox.
You help the user manage their email and calendar using natural language.
Today's date is ${new Date().toDateString()}. The current local time is ${new Date().toLocaleTimeString()}.
Use the provided tools to send emails, search/list emails, reply to emails, create calendar events, and list events.
When you call a tool, briefly and professionally summarize the action you took.
Always be concise, precise, and professional.`;

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
        console.error(`Error calling OpenAI agent model (${llm.model}):`, modelError);

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
        (item): item is ResponseFunctionToolCall => item.type === "function_call",
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
              success: res.success,
            });
            toolOutput = JSON.stringify({ success: true, messageId: res.id });
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
            toolOutput = JSON.stringify({ success: true, threadId: res.threadId });
          } else if (functionName === "create_calendar_event") {
            const res = await calendarService.create(tenantId, {
              summary: functionArgs.summary,
              description: functionArgs.description,
              location: functionArgs.location,
              startTime: functionArgs.startTime,
              endTime: functionArgs.endTime,
              attendees: functionArgs.attendees,
            });
            actionsTaken.push({
              type: "create_calendar_event",
              summary: functionArgs.summary,
              startTime: functionArgs.startTime,
              success: res.success,
            });
            toolOutput = JSON.stringify({ success: true, eventId: res.id });
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
            });
            actionsTaken.push({
              type: "list_events",
              count: res.events.length,
            });
            const simplifiedEvents = res.events.map((e: any) => ({
              id: e.id,
              summary: e.summary,
              start: e.start,
              end: e.end,
              description: e.description,
            }));
            toolOutput = JSON.stringify({ events: simplifiedEvents });
          } else {
            toolOutput = JSON.stringify({ error: `Unknown tool: ${functionName}` });
          }
        } catch (error: any) {
          console.error(`Error executing tool ${functionName}:`, error);
          toolOutput = JSON.stringify({ error: error?.message || "Internal execution error" });
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
      response: "I processed your request but exceeded my tool execution limit.",
      actions: actionsTaken,
      messages: input.messages,
    };
  },
};
