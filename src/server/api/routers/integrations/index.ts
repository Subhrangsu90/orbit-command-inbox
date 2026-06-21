import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { integrationsService } from "./service";
import {
  getStatusOutputModel,
  getConnectUrlInputModel,
  getConnectUrlOutputModel,
  disconnectInputModel,
  disconnectOutputModel,
} from "./model";

const TAGS = ["Integrations"];

export const integrationsRouter = createTRPCRouter({
  getStatus: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/integrations/status",
        tags: TAGS,
        summary: "Get connection status for integrations",
        description: "Checks connection status for all registered integrations.",
      },
    })
    .output(getStatusOutputModel)
    .query(async ({ ctx }) => {
      return integrationsService.getStatus(ctx.session.user.id);
    }),

  getConnectUrl: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/integrations/connect-url",
        tags: TAGS,
        summary: "Get integration connection URL",
        description: "Generates the OAuth URL to connect an integration provider.",
      },
    })
    .input(getConnectUrlInputModel)
    .output(getConnectUrlOutputModel)
    .mutation(async ({ ctx, input }) => {
      return integrationsService.getConnectUrl(
        ctx.session.user.id,
        input.provider,
        input.redirectTo,
      );
    }),

  disconnect: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/integrations/disconnect",
        tags: TAGS,
        summary: "Disconnect an integration provider",
        description: "Disconnects the specified integration from the tenant.",
      },
    })
    .input(disconnectInputModel)
    .output(disconnectOutputModel)
    .mutation(async ({ ctx, input }) => {
      return integrationsService.disconnect(ctx.session.user.id, input.provider);
    }),
});

export * from "./model";
export * from "./service";
