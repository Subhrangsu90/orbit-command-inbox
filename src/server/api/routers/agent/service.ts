import { createOpenAIChatClient } from "~/server/api/llm";
import type { ResponseFunctionToolCall } from "openai/resources/responses/responses";
import { emailsService } from "../emails/service";
import { db } from "~/server/db";
import { corsair } from "~/server/corsair";
import { user } from "~/server/db/schema/auth";
import { eq } from "drizzle-orm";
import {
  allAgentTools,
  findAgentTool,
  allSystemPromptSections,
} from "~/server/integrations/registry";
import type {
  ExecutedAction,
  CalendarActionEvent,
} from "~/server/integrations/types";
import type { Message } from "./model";

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
    input: {
      messages: Message[];
      contextMessages?: Message[];
      timezone?: string;
    },
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

    let userTimeZone = input.timezone;
    if (!userTimeZone) {
      try {
        const client = corsair.withTenant(tenantId);
        const eventsRes = await client.googlecalendar.api.events.getMany({
          calendarId: "primary",
          maxResults: 1,
        });
        if (eventsRes.timeZone) {
          userTimeZone = eventsRes.timeZone;
        }
      } catch (error) {
        console.error("Failed to fetch user timezone from calendar:", error);
      }
    }
    userTimeZone ||= "UTC";

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      timeZone: userTimeZone,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-US", {
      timeZone: userTimeZone,
    });

    const senderIdentity = await getSenderIdentity(tenantId);
    const senderLabel = formatSenderIdentity(senderIdentity);

    let contextPrompt = "";
    if (input.contextMessages && input.contextMessages.length > 0) {
      contextPrompt = `\n\n**RELEVANT PAST CONVERSATIONS (MEMORY)**:
The following fragments are from your past conversations with this user. Use them to answer questions or remember details if relevant:
${input.contextMessages.map((m) => `- [${m.role === 'user' ? 'User' : 'Assistant'}]: ${m.content}`).join("\n")}
`;
    }

    const systemPrompt = `You are Tacta Assistant, a smart, warm, and proactive email and calendar copilot inside Tacta Workspace.

    **DOMAIN CONSTRAINT**: Your sole responsibility is managing emails and calendar events within Google Workspace.

**OUT-OF-DOMAIN HANDLING**:
- If the user asks anything unrelated to emails or calendar (e.g., coding help, weather, news, general knowledge), respond with: "I'm specialized in email and calendar management. I can help you draft emails, schedule meetings, search your inbox, or manage calendar events. What would you like to do?"
- Do NOT attempt to answer out-of-domain questions, even if you have general knowledge about them.
- Stay in role as a workspace assistant, not a general AI chatbot.

Current date/time:
- Date: ${dateStr}
- Local time: ${timeStr}
- Time zone: ${userTimeZone}

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

${allSystemPromptSections()}

After tools:
- Summarize exactly what happened: drafted, sent, scheduled, searched, or listed.
- When an event is scheduled, include the title, start/end time, attendees, location/link, and event id when available.
- When an email draft is created, tell the user it is ready for review and ask for confirmation before sending.${contextPrompt}`;

    const conversationInput: ResponseInputItem[] = input.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      }));

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
          tools: allAgentTools().map((t) => t.definition),
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
          const tool = findAgentTool(functionName);
          if (tool) {
            const result = await tool.execute({
              tenantId,
              args: functionArgs,
              senderIdentity: {
                name: senderIdentity.name,
                email: senderIdentity.email,
              },
            });
            actionsTaken.push(result.action);
            toolOutput = result.output;
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
