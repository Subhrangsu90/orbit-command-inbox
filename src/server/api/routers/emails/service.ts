import type { MessagePart } from "@corsair-dev/gmail";
import { corsair, ensureCorsairConfigured } from "~/server/corsair";
import { db } from "~/server/db";
import { emailPriorities } from "~/server/db/schema/priorities";
import { eq, inArray } from "drizzle-orm";
import { classifyAndStorePriority } from "./priority";

type GmailHeader = { name?: string; value?: string };

function getHeader(headers: GmailHeader[] | undefined, name: string) {
  return (
    headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? ""
  );
}

function decodeMimeHeader(value: string) {
  return value.replace(
    /=\?([^?]+)\?([bq])\?([^?]*)\?=/gi,
    (_match, charset: string, encoding: string, content: string) => {
      try {
        if (encoding.toLowerCase() === "b") {
          return Buffer.from(content, "base64").toString(
            charset.toLowerCase() === "iso-8859-1" ? "latin1" : "utf8",
          );
        }

        const quotedPrintable = content
          .replace(/_/g, " ")
          .replace(/=([0-9a-f]{2})/gi, "%$1");
        return decodeURIComponent(quotedPrintable);
      } catch {
        return content;
      }
    },
  );
}

function parseMailbox(value: string) {
  const decoded = decodeMimeHeader(value).trim();
  const email = extractEmailAddress(decoded);
  const name = decoded
    .replace(/<[^>]+>/g, "")
    .replace(/^['"]|['"]$/g, "")
    .trim();

  return {
    value: decoded,
    name: name || email || "Unknown sender",
    email,
  };
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function sanitizeEmailHtml(value: string) {
  return value
    .replace(
      /<\s*(script|iframe|object|embed|form|base|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(/<\s*(script|iframe|object|embed|form|base|meta)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"');
}

function looksLikeMarkdown(value: string) {
  return /(^|\n)(#{1,3}\s|[-*]\s|>\s|```)|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\//.test(
    value,
  );
}

function findBody(
  part: MessagePart | undefined,
  mimeType: "text/plain" | "text/html",
): string {
  if (!part) return "";
  if (part.mimeType === mimeType && part.body?.data)
    return decodeBase64Url(part.body.data);

  for (const child of part.parts ?? []) {
    const body = findBody(child, mimeType);
    if (body) return body;
  }

  return "";
}

function getMessageContent(payload: MessagePart | undefined) {
  const text = findBody(payload, "text/plain");
  if (text) {
    const content = text.trim();
    return {
      body: content,
      contentType: looksLikeMarkdown(content)
        ? ("markdown" as const)
        : ("text" as const),
    };
  }

  const html = findBody(payload, "text/html");
  if (html)
    return { body: sanitizeEmailHtml(html), contentType: "html" as const };

  return { body: "", contentType: "text" as const };
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function encodeSubject(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function singleLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function formatInternalDate(value: string | number | Date | null | undefined) {
  if (!value) return "";
  const normalized =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function extractEmailAddress(value: string) {
  const angleAddress = value.match(/<([^<>\s]+@[^<>\s]+)>/i)?.[1];
  if (angleAddress) return angleAddress;
  return (
    value.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ??
    ""
  );
}

function createMimeMessage(input: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}) {
  const headers = [
    `To: ${singleLine(input.to)}`,
    `Subject: ${encodeSubject(singleLine(input.subject))}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];

  if (input.inReplyTo)
    headers.push(`In-Reply-To: ${singleLine(input.inReplyTo)}`);
  if (input.references)
    headers.push(`References: ${singleLine(input.references)}`);

  return toBase64Url([...headers, "", input.body].join("\r\n"));
}

function isNotConnectedError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return [
    "account not found",
    "auth-missing",
    "credentials",
    "refresh token",
    "token",
  ].some((value) => message.includes(value));
}

function isRateLimitError(error: unknown) {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : undefined;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const value = String(error).toLowerCase();

  return (
    status === 429 ||
    status === 403 ||
    message.includes("too many requests") ||
    message.includes("quota exceeded") ||
    message.includes("rate limit") ||
    value.includes("too many requests") ||
    value.includes("quota exceeded") ||
    value.includes("rate limit")
  );
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && isRateLimitError(error)) {
      console.warn(
        `[Gmail API] Rate limit or quota hit. Retrying in ${delayMs}ms... (Retries left: ${retries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return fetchWithRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

const FALLBACK_GMAIL_LABELS = [
  { id: "INBOX", name: "Inbox", type: "system" as const },
  { id: "STARRED", name: "Starred", type: "system" as const },
  { id: "SENT", name: "Sent", type: "system" as const },
  { id: "DRAFT", name: "Drafts", type: "system" as const },
  { id: "TRASH", name: "Trash", type: "system" as const },
  { id: "UNREAD", name: "Unread", type: "system" as const },
];

type GmailMessage = Awaited<
  ReturnType<
    ReturnType<typeof corsair.withTenant>["gmail"]["api"]["messages"]["get"]
  >
>;

function normalizeMessage(detail: GmailMessage, fallbackId = "") {
  const headers = detail.payload?.headers;
  const sender = parseMailbox(getHeader(headers, "From"));
  const recipient = parseMailbox(getHeader(headers, "To"));
  const content = getMessageContent(detail.payload);

  return {
    id: detail.id ?? fallbackId,
    threadId: detail.threadId ?? "",
    snippet: detail.snippet ?? "",
    labelIds: detail.labelIds ?? [],
    internalDate: formatInternalDate(detail.internalDate),
    subject: decodeMimeHeader(getHeader(headers, "Subject")) || "(No subject)",
    from: sender.value,
    senderName: sender.name,
    senderEmail: sender.email,
    to: recipient.value,
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    date: getHeader(headers, "Date"),
    messageId: getHeader(headers, "Message-ID"),
    replyTo: getHeader(headers, "Reply-To"),
    body: content.body || detail.snippet || "",
    contentType: content.body ? content.contentType : ("text" as const),
    isUnread: detail.labelIds?.includes("UNREAD") ?? false,
  };
}

function toLocalSearchValue(
  operator: string,
  value: string | number | string[] | number[],
) {
  if (operator === "equals") return value;
  if (operator === "before" || operator === "after") {
    return { [operator]: new Date(String(value)) };
  }
  if (operator === "between" && Array.isArray(value)) {
    return { between: value.map((item) => new Date(String(item))) };
  }
  return { [operator]: value };
}

function serializeLocalEntity(row: {
  id: string;
  entity_id: string;
  data: unknown;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}) {
  return {
    id: row.id,
    entityId: row.entity_id,
    data: (row.data ?? {}) as Record<string, unknown>,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

export const emailsService = {
  async list(
    tenantId: string,
    input: {
      q?: string;
      maxResults?: number;
      pageToken?: string;
      category?: "primary" | "promotions" | "social" | "updates" | "forums";
      mailbox?: "inbox" | "starred" | "sent" | "drafts";
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);

    try {
      const categoryQuery = {
        primary: "category:primary",
        promotions: "category:promotions",
        social: "category:social",
        updates: "category:updates",
        forums: "category:forums",
      } as const;
      const mailboxQuery = {
        inbox: "in:inbox",
        starred: "is:starred",
        sent: "in:sent",
        drafts: "in:drafts",
      } as const;
      const mailbox = input.mailbox ?? "inbox";
      const queryParts: string[] = [mailboxQuery[mailbox]];
      if (mailbox === "inbox" && input.category) {
        queryParts.push(categoryQuery[input.category]);
      }
      if (input.q?.trim()) queryParts.push(input.q.trim());

      const listResult = await client.gmail.api.messages.list({
        q: queryParts.join(" "),
        maxResults: input.maxResults ?? 20,
        pageToken: input.pageToken,
      });

      const messages: any[] = [];
      const batchSize = 4;
      const msgList = listResult.messages ?? [];
      for (let i = 0; i < msgList.length; i += batchSize) {
        const batch = msgList.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (message) => {
            if (!message.id) return null;
            try {
              const detail = await fetchWithRetry(() =>
                client.gmail.api.messages.get({
                  id: message.id!,
                  format: "full",
                }),
              );
              const normalized = normalizeMessage(detail, message.id);
              const {
                messageId: _messageId,
                replyTo: _replyTo,
                body: _body,
                contentType: _contentType,
                ...summary
              } = normalized;
              return summary;
            } catch (error) {
              console.error(
                `Error fetching Gmail metadata for ${message.id}:`,
                error,
              );
              return null;
            }
          }),
        );
        messages.push(...batchResults);
        if (i + batchSize < msgList.length) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      const filteredMessages = messages.filter(
        (message): message is NonNullable<typeof message> => message !== null,
      );

      const messageIds = filteredMessages.map((m) => m.id);
      const prioritiesMap: Record<
        string,
        { priority: "high" | "medium" | "low"; reason: string }
      > = {};

      if (messageIds.length > 0) {
        const priorities = await db
          .select()
          .from(emailPriorities)
          .where(inArray(emailPriorities.emailId, messageIds));

        for (const p of priorities) {
          prioritiesMap[p.emailId] = {
            priority: p.priority as "high" | "medium" | "low",
            reason: p.reason ?? "",
          };
        }
      }

      const enrichedMessages = filteredMessages.map((m) => {
        const cached = prioritiesMap[m.id];
        if (!cached) {
          void classifyAndStorePriority(m.id, m.subject, m.snippet);
        }
        return {
          ...m,
          priority: cached?.priority ?? "medium",
          priorityReason: cached?.reason ?? "Pending classification...",
        };
      });

      return {
        messages: enrichedMessages,
        nextPageToken: listResult.nextPageToken,
      };
    } catch (error) {
      console.error("Error listing Gmail messages:", error);
      if (isNotConnectedError(error))
        return { messages: [], notConnected: true };

      // Fallback: serve cached messages from the local Corsair sync DB
      console.warn("[Gmail] API failed — falling back to local DB cache.");
      try {
        const localRows = await client.gmail.db.messages.search({
          limit: input.maxResults ?? 20,
          offset: 0,
        } as any);

        if (!localRows || localRows.length === 0) {
          return { messages: [], fromCache: true };
        }

        const mailboxLabelMap: Record<string, string> = {
          inbox: "INBOX",
          starred: "STARRED",
          sent: "SENT",
          drafts: "DRAFT",
        };
        const targetLabel = mailboxLabelMap[input.mailbox ?? "inbox"];

        const filtered = localRows
          .filter((row) => {
            const data = row.data as any;
            const labels: string[] = data?.labelIds ?? [];
            return labels.includes(targetLabel ?? "INBOX");
          })
          .slice(0, input.maxResults ?? 20);

        const messages = filtered.map((row) => {
          const data = row.data as any;
          const normalized = normalizeMessage(data, row.entity_id);
          const {
            messageId: _m,
            replyTo: _r,
            body: _b,
            contentType: _ct,
            ...summary
          } = normalized;
          return {
            ...summary,
            priority: "medium" as const,
            priorityReason: "Cached (offline mode)",
          };
        });

        return { messages, fromCache: true };
      } catch (dbError) {
        console.error("[Gmail] Local DB fallback also failed:", dbError);
        return { messages: [], fromCache: true };
      }
    }
  },

  async get(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);

    // Try local DB lookup first to avoid hitting rate limits or connection resets
    try {
      const localRows = await client.gmail.db.messages.search({
        entity_id: input.id,
        limit: 1,
      } as any);

      if (localRows && localRows.length > 0 && localRows[0]?.data) {
        const detail = localRows[0].data as any;
        const normalized = normalizeMessage(detail, input.id);

        const [priorityRow] = await db
          .select()
          .from(emailPriorities)
          .where(eq(emailPriorities.emailId, input.id))
          .limit(1);

        const priority = priorityRow?.priority;
        const reason = priorityRow?.reason;

        if (!priorityRow) {
          void classifyAndStorePriority(
            normalized.id,
            normalized.subject,
            normalized.snippet,
          );
        }

        return {
          ...normalized,
          priority: (priority ?? "medium") as "high" | "medium" | "low",
          priorityReason: reason ?? "Pending classification...",
        };
      }
    } catch (dbError) {
      console.warn(
        "Failed to retrieve message from local sync DB, falling back to live API:",
        dbError,
      );
    }

    try {
      const detail = await fetchWithRetry(() =>
        client.gmail.api.messages.get({
          id: input.id,
          format: "full",
        }),
      );
      const normalized = normalizeMessage(detail, input.id);

      const [priorityRow] = await db
        .select()
        .from(emailPriorities)
        .where(eq(emailPriorities.emailId, input.id))
        .limit(1);

      let priority = priorityRow?.priority;
      let reason = priorityRow?.reason;

      if (!priorityRow) {
        void classifyAndStorePriority(
          normalized.id,
          normalized.subject,
          normalized.snippet,
        );
      }

      return {
        ...normalized,
        priority: (priority ?? "medium") as "high" | "medium" | "low",
        priorityReason: reason ?? "Pending classification...",
      };
    } catch (error) {
      console.error("Error fetching Gmail message:", error);
      throw new Error("Failed to fetch the email.");
    }
  },

  async send(
    tenantId: string,
    input: { to: string; subject: string; body: string; threadId?: string },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);

    try {
      const result = await client.gmail.api.messages.send({
        raw: createMimeMessage(input),
        threadId: input.threadId,
      });
      return {
        id: result.id ?? "",
        threadId: result.threadId ?? "",
        success: true,
      };
    } catch (error) {
      console.error("Error sending Gmail message:", error);
      throw new Error("Failed to send email.");
    }
  },

  async reply(tenantId: string, input: { id: string; body: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);

    try {
      const original = await client.gmail.api.messages.get({
        id: input.id,
        format: "full",
      });
      const headers = original.payload?.headers;
      const recipient = extractEmailAddress(
        getHeader(headers, "Reply-To") || getHeader(headers, "From"),
      );
      if (!recipient)
        throw new Error(
          "The original message does not contain a reply address.",
        );

      const originalSubject = getHeader(headers, "Subject") || "(No subject)";
      const subject = /^re:/i.test(originalSubject)
        ? originalSubject
        : `Re: ${originalSubject}`;
      const messageId = getHeader(headers, "Message-ID");
      const references = [getHeader(headers, "References"), messageId]
        .filter(Boolean)
        .join(" ");
      const result = await client.gmail.api.messages.send({
        raw: createMimeMessage({
          to: recipient,
          subject,
          body: input.body,
          inReplyTo: messageId || undefined,
          references: references || undefined,
        }),
        threadId: original.threadId,
      });

      return {
        id: result.id ?? "",
        threadId: result.threadId ?? original.threadId ?? "",
        success: true,
      };
    } catch (error) {
      console.error("Error replying to Gmail message:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to send reply.",
      );
    }
  },

  async trash(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    await client.gmail.api.messages.trash({ id: input.id });
    return { success: true };
  },

  async modifyLabels(
    tenantId: string,
    input: { id: string; addLabelIds?: string[]; removeLabelIds?: string[] },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    await client.gmail.api.messages.modify(input);
    return { success: true };
  },

  async batchModifyMessages(
    tenantId: string,
    input: { ids: string[]; addLabelIds?: string[]; removeLabelIds?: string[] },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    await client.gmail.api.messages.batchModify(input);
    return { success: true };
  },

  async permanentlyDeleteMessage(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    await client.gmail.api.messages.delete({ id: input.id });
    return { success: true };
  },

  async untrashMessage(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    await client.gmail.api.messages.untrash({ id: input.id });
    return { success: true };
  },

  async listThreads(
    tenantId: string,
    input: {
      q?: string;
      maxResults?: number;
      pageToken?: string;
      includeSpamTrash?: boolean;
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    const result = await client.gmail.api.threads.list(input);
    return {
      threads: result.threads ?? [],
      nextPageToken: result.nextPageToken,
      resultSizeEstimate: result.resultSizeEstimate,
    };
  },

  async getThread(
    tenantId: string,
    input: {
      id: string;
      format?: "minimal" | "full" | "metadata";
      metadataHeaders?: string[];
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);

    try {
      const thread = await fetchWithRetry(() =>
        client.gmail.api.threads.get(input),
      );

      // Deduplicate messages by id to avoid React duplicate-key warnings
      const seen = new Set<string>();
      const messages = (thread.messages ?? []).filter((m) => {
        if (!m.id || seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

      return { ...thread, messages };
    } catch (error) {
      console.error(
        "[Gmail] getThread live API failed, trying local DB:",
        error,
      );

      // Fallback: reconstruct thread from the local Corsair sync DB
      try {
        const localRows = await client.gmail.db.messages.search({
          limit: 50,
          offset: 0,
        } as any);

        const threadMessages = (localRows ?? [])
          .filter((row) => {
            const data = row.data as any;
            return data?.threadId === input.id;
          })
          .map((row) => row.data as any);

        // Deduplicate by id
        const seen = new Set<string>();
        const messages = threadMessages.filter((m: any) => {
          if (!m.id || seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });

        return { id: input.id, messages };
      } catch (dbError) {
        console.error(
          "[Gmail] getThread local DB fallback also failed:",
          dbError,
        );
        throw error; // re-throw original so tRPC can surface it
      }
    }
  },

  async modifyThread(
    tenantId: string,
    input: { id: string; addLabelIds?: string[]; removeLabelIds?: string[] },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    return client.gmail.api.threads.modify(input);
  },

  async trashThread(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    return client.gmail.api.threads.trash({ id: input.id });
  },

  async untrashThread(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    return client.gmail.api.threads.untrash({ id: input.id });
  },

  async permanentlyDeleteThread(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    await client.gmail.api.threads.delete({ id: input.id });
    return { success: true };
  },

  async listLabels(tenantId: string) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);

    try {
      const result = await fetchWithRetry(
        () => client.gmail.api.labels.list({}),
        2,
        750,
      );
      return { labels: result.labels ?? [] };
    } catch (error) {
      console.error("Error listing Gmail labels:", error);
      if (isNotConnectedError(error)) return { labels: [] };

      try {
        const localRows = await client.gmail.db.labels.search({
          limit: 100,
          offset: 0,
        } as any);

        const labels = (localRows ?? [])
          .map((row) => row.data as Record<string, unknown>)
          .filter((label) => typeof label.id === "string");

        if (labels.length > 0) return { labels };
      } catch (dbError) {
        console.warn("[Gmail] Local label cache fallback failed:", dbError);
      }

      if (isRateLimitError(error)) {
        return { labels: FALLBACK_GMAIL_LABELS };
      }

      throw error;
    }
  },

  async getLabel(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    return client.gmail.api.labels.get({ id: input.id });
  },

  async createLabel(
    tenantId: string,
    input: {
      name: string;
      messageListVisibility?: "show" | "hide";
      labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
      color?: { textColor?: string; backgroundColor?: string };
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    return client.gmail.api.labels.create({ label: input });
  },

  async updateLabel(
    tenantId: string,
    input: {
      id: string;
      name?: string;
      messageListVisibility?: "show" | "hide";
      labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
      color?: { textColor?: string; backgroundColor?: string };
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    const { id, ...label } = input;
    return client.gmail.api.labels.update({ id, label });
  },

  async deleteLabel(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    await client.gmail.api.labels.delete({ id: input.id });
    return { success: true };
  },

  async createDraft(
    tenantId: string,
    input: { to: string; subject: string; body: string; threadId?: string },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    const result = await client.gmail.api.drafts.create({
      draft: {
        message: {
          raw: createMimeMessage(input),
          threadId: input.threadId,
        },
      },
    });
    let messageId = result.message?.id;
    if (!messageId && result.id) {
      try {
        const detail = await fetchWithRetry(() =>
          client.gmail.api.drafts.get({
            id: result.id!,
            format: "metadata",
          }),
        );
        messageId = detail.message?.id;
      } catch (error) {
        console.error("Error fetching created Gmail draft metadata:", error);
      }
    }

    return { id: result.id ?? "", messageId, success: true };
  },

  async listDrafts(
    tenantId: string,
    input: { q?: string; maxResults?: number; pageToken?: string },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    const result = await client.gmail.api.drafts.list(input);
    const drafts: any[] = [];
    const batchSize = 4;
    const draftList = result.drafts ?? [];
    for (let i = 0; i < draftList.length; i += batchSize) {
      const batch = draftList.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (draft) => {
          if (!draft.id) return null;
          try {
            const detail = await fetchWithRetry(() =>
              client.gmail.api.drafts.get({
                id: draft.id!,
                format: "full",
              }),
            );
            if (!detail.message) return null;
            return {
              ...normalizeMessage(detail.message, detail.message.id),
              draftId: detail.id ?? draft.id,
            };
          } catch (error) {
            console.error(`Error fetching Gmail draft ${draft.id}:`, error);
            return null;
          }
        }),
      );
      drafts.push(...batchResults);
      if (i + batchSize < draftList.length) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    return {
      drafts: drafts.filter(
        (draft): draft is NonNullable<typeof draft> => draft !== null,
      ),
      nextPageToken: result.nextPageToken,
      resultSizeEstimate: result.resultSizeEstimate,
    };
  },

  async getDraft(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    const draft = await fetchWithRetry(() =>
      client.gmail.api.drafts.get({
        id: input.id,
        format: "full",
      }),
    );
    if (!draft.message) throw new Error("Draft message not found.");
    return {
      ...normalizeMessage(draft.message, draft.message.id),
      draftId: draft.id ?? input.id,
    };
  },

  async updateDraft(
    tenantId: string,
    input: {
      id: string;
      to: string;
      subject: string;
      body: string;
      threadId?: string;
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    const result = await client.gmail.api.drafts.update({
      id: input.id,
      draft: {
        message: {
          raw: createMimeMessage(input),
          threadId: input.threadId,
        },
      },
    });
    return { id: result.id ?? input.id, success: true };
  },

  async deleteDraft(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    await client.gmail.api.drafts.delete({ id: input.id });
    return { id: input.id, success: true };
  },

  async sendDraft(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    const result = await client.gmail.api.drafts.send({ id: input.id });
    return {
      id: result.id,
      threadId: result.threadId,
      success: true,
    };
  },

  async searchLocal(
    tenantId: string,
    input: {
      entity: "messages" | "drafts" | "labels" | "threads";
      filters: Array<{
        field: string;
        operator: string;
        value: string | number | string[] | number[];
      }>;
      limit: number;
      offset: number;
    },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    const entityClient = client.gmail.db[input.entity];
    const entityFilters: Record<string, unknown> = {};
    const dataFilters: Record<string, unknown> = {};

    for (const filter of input.filters) {
      const target = filter.field === "entity_id" ? entityFilters : dataFilters;
      const field = filter.field === "entity_id" ? "entity_id" : filter.field;
      target[field] = toLocalSearchValue(filter.operator, filter.value);
    }

    const rows = await entityClient.search({
      ...entityFilters,
      data: dataFilters,
      limit: input.limit,
      offset: input.offset,
    } as never);

    return {
      rows: rows.map(serializeLocalEntity),
      source: "corsair-local-db" as const,
    };
  },
};
