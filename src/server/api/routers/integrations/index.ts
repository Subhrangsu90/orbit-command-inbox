import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { integrationsService } from "./service";
import {
  getStatusOutputModel,
  getConnectUrlInputModel,
  getConnectUrlOutputModel,
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
        description: "Checks whether Gmail and Google Calendar are connected.",
      },
    })
    .output(getStatusOutputModel)
    .query(async ({ ctx }) => {
      return integrationsService.getStatus(ctx.session.user.id);
    }),

  getGmailConnectUrl: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/integrations/gmail/connect-url",
        tags: TAGS,
        summary: "Get Gmail connection URL",
        description: "Generates the OAuth URL to connect Gmail.",
      },
    })
    .input(getConnectUrlInputModel)
    .output(getConnectUrlOutputModel)
    .mutation(async ({ ctx, input }) => {
      return integrationsService.getGmailConnectUrl(ctx.session.user.id, input.redirectTo);
    }),

  getCalendarConnectUrl: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/integrations/calendar/connect-url",
        tags: TAGS,
        summary: "Get Google Calendar connection URL",
        description: "Generates the OAuth URL to connect Google Calendar.",
      },
    })
    .input(getConnectUrlInputModel)
    .output(getConnectUrlOutputModel)
    .mutation(async ({ ctx, input }) => {
      return integrationsService.getCalendarConnectUrl(ctx.session.user.id, input.redirectTo);
    }),

  disconnectGmail: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/integrations/gmail/disconnect",
        tags: TAGS,
        summary: "Disconnect Gmail",
        description: "Disconnects Gmail from the tenant.",
      },
    })
    .output(disconnectOutputModel)
    .mutation(async ({ ctx }) => {
      return integrationsService.disconnectGmail(ctx.session.user.id);
    }),

  disconnectCalendar: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/integrations/calendar/disconnect",
        tags: TAGS,
        summary: "Disconnect Google Calendar",
        description: "Disconnects Google Calendar from the tenant.",
      },
    })
    .output(disconnectOutputModel)
    .mutation(async ({ ctx }) => {
      return integrationsService.disconnectCalendar(ctx.session.user.id);
    }),
});
export * from "./model";
export * from "./service";
