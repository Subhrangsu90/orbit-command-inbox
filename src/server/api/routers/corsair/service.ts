import { eq, and } from "drizzle-orm";
import { corsairAccounts, corsairIntegrations } from "~/server/db/schema/corsair";

export const corsairService = {
  async getConnections(db: any, tenantId: string) {
    // Find all accounts for the tenant and join with integrations to get the names
    const accounts = await db
      .select({
        id: corsairAccounts.id,
        integrationName: corsairIntegrations.name,
      })
      .from(corsairAccounts)
      .innerJoin(corsairIntegrations, eq(corsairAccounts.integrationId, corsairIntegrations.id))
      .where(eq(corsairAccounts.tenantId, tenantId));

    return {
      gmail: accounts.some((acc: any) => acc.integrationName === "gmail"),
      googlecalendar: accounts.some((acc: any) => acc.integrationName === "googlecalendar"),
    };
  },

  async disconnect(db: any, tenantId: string, input: { plugin: "gmail" | "googlecalendar" }) {
    // Find the integration first
    const [integration] = await db
      .select()
      .from(corsairIntegrations)
      .where(eq(corsairIntegrations.name, input.plugin));

    if (!integration) {
      throw new Error(`Integration ${input.plugin} not found`);
    }

    // Delete the tenant account for this integration
    await db
      .delete(corsairAccounts)
      .where(
        and(
          eq(corsairAccounts.tenantId, tenantId),
          eq(corsairAccounts.integrationId, integration.id),
        ),
      );

    return { success: true };
  },
};
