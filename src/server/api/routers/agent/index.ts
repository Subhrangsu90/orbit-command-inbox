import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { roomsService } from "./roomsService";
import { agentService } from "./service";

const TAGS = ["Agent"];

import {
  messageSchema,
  actionUnion,
  chatMessageOutputSchema,
} from "./model";

export const agentRouter = createTRPCRouter({
  // Legacy stateless chat endpoint (kept for API compatibility if needed)
  chat: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/agent/chat",
        tags: TAGS,
        summary: "Chat with Tacta Agent (Stateless)",
        description:
          "Sends message thread to Tacta Agent to trigger actions on email or calendar.",
      },
    })
    .input(
      z.object({
        messages: z.array(messageSchema),
        timezone: z.string().optional(),
      }),
    )
    .output(
      z.object({
        response: z.string(),
        actions: z.array(actionUnion),
        messages: z.array(messageSchema),
      }),
    )
    .mutation(({ ctx, input }) => {
      return agentService.chat(ctx.session.user.id, input);
    }),

  listRooms: protectedProcedure.query(({ ctx }) => {
    return roomsService.listRooms(ctx.session.user.id);
  }),

  getRoomHistory: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(({ ctx, input }) => {
      return roomsService.getRoomHistory(input.roomId, ctx.session.user.id);
    }),

  createRoom: protectedProcedure
    .input(z.object({ title: z.string().optional() }))
    .mutation(({ ctx, input }) => {
      return roomsService.createRoom(ctx.session.user.id, input.title);
    }),

  deleteRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(({ ctx, input }) => {
      return roomsService.deleteRoom(input.roomId, ctx.session.user.id);
    }),

  renameRoom: protectedProcedure
    .input(z.object({ roomId: z.string(), title: z.string() }))
    .mutation(({ ctx, input }) => {
      return roomsService.renameRoom(
        input.roomId,
        ctx.session.user.id,
        input.title,
      );
    }),

  chatInRoom: protectedProcedure
    .input(z.object({ roomId: z.string(), content: z.string(), timezone: z.string().optional() }))
    .output(
      z.object({
        response: z.string(),
        actions: z.array(actionUnion),
        messages: z.array(chatMessageOutputSchema),
      }),
    )
    .mutation(({ ctx, input }) => {
      return roomsService.chatInRoom(
        input.roomId,
        ctx.session.user.id,
        input.content,
        input.timezone,
      );
    }),
});
