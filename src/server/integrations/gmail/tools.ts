import type { AgentTool } from "../types";
import { emailsService } from "~/server/api/routers/emails/service";

// ─── Tool Definitions ───────────────────────────────────────────────────────

export const gmailTools: AgentTool[] = [
  {
    definition: {
      type: "function",
      name: "send_email",
      description:
        "Sends a new email immediately. Use only after the user confirms a draft or exact final content that was already shown in the conversation.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "The email address of the recipient.",
          },
          subject: {
            type: "string",
            description: "The subject line of the email.",
          },
          body: {
            type: "string",
            description: "The plain text body content of the email.",
          },
        },
        required: ["to", "subject", "body"],
      },
    },
    async execute(ctx) {
      const { tenantId, args } = ctx;
      const res = await emailsService.send(tenantId, {
        to: args.to as string,
        subject: args.subject as string,
        body: args.body as string,
      });
      return {
        output: JSON.stringify({ success: true, messageId: res.id }),
        action: {
          type: "send_email",
          to: args.to as string,
          subject: args.subject as string,
          body: args.body as string | undefined,
          success: res.success,
        },
      };
    },
  },

  {
    definition: {
      type: "function",
      name: "create_email_draft",
      description:
        "Creates a Gmail draft without sending it. Always use this before any new outbound email so the user can review before sending.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "The recipient email address for the draft.",
          },
          subject: {
            type: "string",
            description: "The draft subject line.",
          },
          body: {
            type: "string",
            description: "The plain text draft body.",
          },
        },
        required: ["to", "subject", "body"],
      },
    },
    async execute(ctx) {
      const { tenantId, args, senderIdentity } = ctx;
      const res = await emailsService.createDraft(tenantId, {
        to: args.to as string,
        subject: args.subject as string,
        body: args.body as string,
      });
      const mailLink = res.messageId
        ? `/mail/${encodeURIComponent(res.messageId)}?mailbox=drafts&draftId=${encodeURIComponent(res.id)}`
        : "/mail?mailbox=drafts";
      return {
        output: JSON.stringify({
          success: true,
          draftId: res.id,
          messageId: res.messageId,
          mailLink,
        }),
        action: {
          type: "create_email_draft",
          to: args.to as string,
          subject: args.subject as string,
          body: args.body as string,
          draftId: res.id,
          messageId: res.messageId,
          mailLink,
          senderName: senderIdentity.name,
          senderEmail: senderIdentity.email,
          success: res.success,
        },
      };
    },
  },

  {
    definition: {
      type: "function",
      name: "reply_to_email",
      description: "Replies to an existing email by message ID.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The ID of the email message to reply to.",
          },
          body: { type: "string", description: "The reply message body." },
        },
        required: ["id", "body"],
      },
    },
    async execute(ctx) {
      const { tenantId, args } = ctx;
      const res = await emailsService.reply(tenantId, {
        id: args.id as string,
        body: args.body as string,
      });
      return {
        output: JSON.stringify({
          success: true,
          threadId: res.threadId,
        }),
        action: {
          type: "reply_to_email",
          id: args.id as string,
          success: res.success,
        },
      };
    },
  },

  {
    definition: {
      type: "function",
      name: "search_emails",
      description:
        "Queries or searches emails. Allows searching by keyword, label, or query string.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          q: {
            type: "string",
            description:
              "Search query or keywords (e.g., 'from:iamsubhrangsubera@gmail.com', 'meeting', 'project update').",
          },
          mailbox: {
            type: "string",
            enum: ["inbox", "starred", "sent", "drafts"],
            description: "The mailbox/folder to search in.",
          },
          maxResults: {
            type: "number",
            description: "Maximum number of results to return (default 10).",
          },
        },
      },
    },
    async execute(ctx) {
      const { tenantId, args } = ctx;
      const res = await emailsService.list(tenantId, {
        q: args.q as string | undefined,
        mailbox:
          (args.mailbox as "inbox" | "starred" | "sent" | "drafts") || "inbox",
        maxResults: (args.maxResults as number) || 10,
      });
      // Send summarized info of messages back to model
      const simplifiedMessages = res.messages.map((m) => ({
        id: m.id,
        subject: m.subject,
        from: m.from,
        date: m.date,
        snippet: m.snippet,
      }));
      return {
        output: JSON.stringify({ messages: simplifiedMessages }),
        action: {
          type: "search_emails",
          query: (args.q as string) || "",
          count: res.messages.length,
        },
      };
    },
  },
];

// ─── System Prompt Section ──────────────────────────────────────────────────

export const gmailSystemPrompt = `Email rules:
- Always use create_email_draft before any new outbound email, even when the user says "send". The user must see the draft before it is sent.
- Use send_email only after the user clearly confirms a draft or exact final content that was already shown in the conversation.
- Use reply_to_email only when a concrete message id is available or was found via search_emails.
- Email bodies should be polished plain text with greeting, concise body, and sign-off when appropriate.
- For sign-offs, prefer "Best regards," followed by the connected sender name when available; if no name is available, use the connected sender email or omit the name.`;
