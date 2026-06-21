import { corsair, ensureCorsairConfigured } from "~/server/corsair";
import { fetchWithRetry, normalizeMessage } from "./helpers";

export const emailThreadsService = {
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
};
