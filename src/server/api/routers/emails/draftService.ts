import { corsair, ensureCorsairConfigured } from "~/server/corsair";
import {
  fetchWithRetry,
  normalizeMessage,
  createMimeMessage,
} from "./helpers";

export const emailDraftsService = {
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
};
