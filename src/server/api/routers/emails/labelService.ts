import { corsair, ensureCorsairConfigured } from "~/server/corsair";
import {
  fetchWithRetry,
  isNotConnectedError,
  isRateLimitError,
  FALLBACK_GMAIL_LABELS,
} from "./helpers";

export const emailLabelsService = {
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
};
