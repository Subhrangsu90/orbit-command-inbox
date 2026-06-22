import { corsair, ensureCorsairConfigured } from "~/server/corsair";
import { db } from "~/server/db";
import { emailPriorities } from "~/server/db/schema/priorities";
import { eq, inArray } from "drizzle-orm";
import { classifyAndStorePriority } from "~/server/lib/ai/priority";
import {
  fetchWithRetry,
  normalizeMessage,
  createMimeMessage,
  extractEmailAddress,
  getHeader,
  isNotConnectedError,
} from "./helpers";
import { executeLocalSearch } from "~/server/lib/search/localSearch";
import { emailThreadsService } from "./threadService";
import { emailLabelsService } from "./labelService";
import { emailDraftsService } from "./draftService";

export const emailsService = {
  // --- Profile ---
  async getConnectedProfile(tenantId: string) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    const usersApi = client.gmail.api as unknown as {
      users?: {
        getProfile?: (input: { userId: string }) => Promise<{
          emailAddress?: string;
          messagesTotal?: number;
          threadsTotal?: number;
          historyId?: string;
        }>;
      };
    };

    const profile = await usersApi.users?.getProfile?.({ userId: "me" });
    return {
      email: profile?.emailAddress?.trim() || undefined,
      messagesTotal: profile?.messagesTotal,
      threadsTotal: profile?.threadsTotal,
      historyId: profile?.historyId,
    };
  },

  // --- Messages ---
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

      const enrichedMessages = enrichedMessagesList(filteredMessages, prioritiesMap);

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
    input: { to: string; subject: string; body: string; htmlBody?: string; threadId?: string },
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

  async reply(tenantId: string, input: { id: string; body: string; htmlBody?: string }) {
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
          htmlBody: input.htmlBody,
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

  // --- Threads (Delegated) ---
  listThreads: emailThreadsService.listThreads,
  getThread: emailThreadsService.getThread,
  modifyThread: emailThreadsService.modifyThread,
  trashThread: emailThreadsService.trashThread,
  untrashThread: emailThreadsService.untrashThread,
  permanentlyDeleteThread: emailThreadsService.permanentlyDeleteThread,

  // --- Labels (Delegated) ---
  listLabels: emailLabelsService.listLabels,
  getLabel: emailLabelsService.getLabel,
  createLabel: emailLabelsService.createLabel,
  updateLabel: emailLabelsService.updateLabel,
  deleteLabel: emailLabelsService.deleteLabel,

  // --- Drafts (Delegated) ---
  createDraft: emailDraftsService.createDraft,
  listDrafts: emailDraftsService.listDrafts,
  getDraft: emailDraftsService.getDraft,
  updateDraft: emailDraftsService.updateDraft,
  deleteDraft: emailDraftsService.deleteDraft,
  sendDraft: emailDraftsService.sendDraft,

  // --- Local Search ---
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
    return executeLocalSearch(entityClient, input);
  },
};

function enrichedMessagesList(
  filteredMessages: any[],
  prioritiesMap: Record<string, { priority: "high" | "medium" | "low"; reason: string }>
) {
  return filteredMessages.map((m) => {
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
}
