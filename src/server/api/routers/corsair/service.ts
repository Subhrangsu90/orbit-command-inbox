import { eq, and } from "drizzle-orm";
import {
  corsairAccounts,
  corsairIntegrations,
} from "~/server/db/schema/corsair";
import { integrationsService } from "~/server/api/routers/integrations/service";

export const corsairService = {
  async getConnections(_db: any, tenantId: string) {
    const status = await integrationsService.getStatus(tenantId);

    return {
      gmail: status.gmail,
      googlecalendar: status.calendar,
    };
  },

  async disconnect(
    db: any,
    tenantId: string,
    input: { plugin: "gmail" | "googlecalendar" },
  ) {
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
