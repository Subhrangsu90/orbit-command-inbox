import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { roomsService } from "./roomsService";
import { agentService } from "./service";

const TAGS = ["Agent"];

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const actionUnion = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("send_email"),
    to: z.string(),
    subject: z.string(),
    body: z.string().optional(),
    success: z.boolean(),
  }),
  z.object({
    type: z.literal("create_email_draft"),
    to: z.string(),
    subject: z.string(),
    body: z.string(),
    draftId: z.string(),
    messageId: z.string().optional(),
    mailLink: z.string().optional(),
    success: z.boolean(),
  }),
  z.object({
    type: z.literal("reply_to_email"),
    id: z.string(),
    success: z.boolean(),
  }),
  z.object({
    type: z.literal("create_calendar_event"),
    eventId: z.string().optional(),
    calendarLink: z.string().optional(),
    meetingLink: z.string().optional(),
    summary: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    attendees: z.array(z.string()).optional(),
    success: z.boolean(),
  }),
  z.object({
    type: z.literal("search_emails"),
    query: z.string(),
    count: z.number(),
  }),
  z.object({ type: z.literal("list_events"), count: z.number() }),
]);

const chatMessageOutputSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  actions: z.any().optional(),
  createdAt: z.date(),
});

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
    .input(z.object({ roomId: z.string(), content: z.string() }))
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
      );
    }),
});
