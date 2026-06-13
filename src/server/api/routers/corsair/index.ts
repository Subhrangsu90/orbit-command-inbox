import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { corsairService } from "./service";
import {
  getConnectionsOutputModel,
  disconnectInputModel,
  disconnectOutputModel,
} from "./model";

const TAGS = ["Corsair"];

export const corsairRouter = createTRPCRouter({
  getConnections: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/corsair/connections",
        tags: TAGS,
        summary: "Get Corsair integrations connections status",
        description: "Returns which integrations are currently connected for the user.",
      },
    })
    .output(getConnectionsOutputModel)
    .query(async ({ ctx }) => {
      return corsairService.getConnections(ctx.db, ctx.session.user.id);
    }),

  disconnect: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/corsair/disconnect",
        tags: TAGS,
        summary: "Disconnect an integration",
        description: "Disconnects and removes the user's connection to Gmail or Google Calendar.",
      },
    })
    .input(disconnectInputModel)
    .output(disconnectOutputModel)
    .mutation(async ({ ctx, input }) => {
      return corsairService.disconnect(ctx.db, ctx.session.user.id, input);
    }),
});
