import type { MessagePart } from "@corsair-dev/gmail";
import { corsair, ensureCorsairConfigured } from "~/server/corsair";

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

      const messages = await Promise.all(
        (listResult.messages ?? []).map(async (message) => {
          if (!message.id) return null;
          try {
            const detail = await client.gmail.api.messages.get({
              id: message.id,
              format: "full",
            });
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

      return {
        messages: messages.filter(
          (message): message is NonNullable<typeof message> => message !== null,
        ),
        nextPageToken: listResult.nextPageToken,
      };
    } catch (error) {
      console.error("Error listing Gmail messages:", error);
      if (isNotConnectedError(error))
        return { messages: [], notConnected: true };
      throw new Error("Failed to fetch Gmail messages.");
    }
  },

  async get(tenantId: string, input: { id: string }) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);

    try {
      const detail = await client.gmail.api.messages.get({
        id: input.id,
        format: "full",
      });
      return normalizeMessage(detail, input.id);
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
    return client.gmail.api.threads.get(input);
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
    const result = await client.gmail.api.labels.list({});
    return { labels: result.labels ?? [] };
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
    return { id: result.id ?? "", success: true };
  },

  async listDrafts(
    tenantId: string,
    input: { q?: string; maxResults?: number; pageToken?: string },
  ) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    const result = await client.gmail.api.drafts.list(input);
    const drafts = await Promise.all(
      (result.drafts ?? []).map(async (draft) => {
        if (!draft.id) return null;
        const detail = await client.gmail.api.drafts.get({
          id: draft.id,
          format: "full",
        });
        if (!detail.message) return null;
        return {
          ...normalizeMessage(detail.message, detail.message.id),
          draftId: detail.id ?? draft.id,
        };
      }),
    );

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
    const draft = await client.gmail.api.drafts.get({
      id: input.id,
      format: "full",
    });
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
