import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { corsairAccounts, corsairIntegrations } from "~/server/db/schema/corsair";

export const corsairRouter = createTRPCRouter({
  getConnections: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.session.user.id;

    // Find all accounts for the tenant and join with integrations to get the names
    const accounts = await ctx.db
      .select({
        id: corsairAccounts.id,
        integrationName: corsairIntegrations.name,
      })
      .from(corsairAccounts)
      .innerJoin(corsairIntegrations, eq(corsairAccounts.integrationId, corsairIntegrations.id))
      .where(eq(corsairAccounts.tenantId, tenantId));

    return {
      gmail: accounts.some((acc) => acc.integrationName === "gmail"),
      googlecalendar: accounts.some((acc) => acc.integrationName === "googlecalendar"),
    };
  }),

  disconnect: protectedProcedure
    .input(z.object({ plugin: z.enum(["gmail", "googlecalendar"]) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.user.id;

      // Find the integration first
      const [integration] = await ctx.db
        .select()
        .from(corsairIntegrations)
        .where(eq(corsairIntegrations.name, input.plugin));

      if (!integration) {
        throw new Error(`Integration ${input.plugin} not found`);
      }

      // Delete the tenant account for this integration
      await ctx.db
        .delete(corsairAccounts)
        .where(
          and(
            eq(corsairAccounts.tenantId, tenantId),
            eq(corsairAccounts.integrationId, integration.id),
          ),
        );

      return { success: true };
    }),
});
