import { allDefinitions, findDefinition } from "~/server/integrations/registry";

export const integrationsService = {
  async getStatus(tenantId: string) {
    const statuses: Record<string, boolean> = {};
    const details: Record<
      string,
      { accountEmail?: string | null; accountName?: string | null }
    > = {};
    for (const def of allDefinitions()) {
      const res = await def.getStatus(tenantId);
      statuses[def.id] = res.connected;
      if (res.connected) {
        details[`${def.id}Details`] = {
          accountEmail: res.accountEmail,
          accountName: res.accountName,
        };
      }
    }
    return {
      ...statuses,
      ...details,
      fullyConnected: Object.values(statuses).every(Boolean),
    } as any;
  },

  async getConnectUrl(tenantId: string, provider: string, redirectTo: string) {
    const def = findDefinition(provider);
    if (!def) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    return def.getConnectUrl(tenantId, redirectTo);
  },

  async disconnect(tenantId: string, provider: string) {
    const def = findDefinition(provider);
    if (!def) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    return def.disconnect(tenantId);
  },
};
