import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { calendarService } from "./service";
import {
  listEventsInputModel,
  listEventsOutputModel,
  createEventInputModel,
  createEventOutputModel,
  updateEventInputModel,
  updateEventOutputModel,
  deleteEventInputModel,
  deleteEventOutputModel,
} from "./model";

const TAGS = ["Calendar"];

export const calendarRouter = createTRPCRouter({
  list: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/calendar/list",
        tags: TAGS,
        summary: "List calendar events",
        description: "Retrieves upcoming events from the user's Google Calendar.",
      },
    })
    .input(listEventsInputModel)
    .output(listEventsOutputModel)
    .query(async ({ ctx, input }) => {
      return calendarService.list(ctx.session.user.id, input);
    }),

  create: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/calendar/create",
        tags: TAGS,
        summary: "Create a calendar event",
        description: "Creates a new event on the user's primary calendar.",
      },
    })
    .input(createEventInputModel)
    .output(createEventOutputModel)
    .mutation(async ({ ctx, input }) => {
      return calendarService.create(ctx.session.user.id, input);
    }),

  update: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/calendar/update",
        tags: TAGS,
        summary: "Update a calendar event",
        description: "Updates details of an existing calendar event.",
      },
    })
    .input(updateEventInputModel)
    .output(updateEventOutputModel)
    .mutation(async ({ ctx, input }) => {
      return calendarService.update(ctx.session.user.id, input);
    }),

  delete: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/calendar/delete",
        tags: TAGS,
        summary: "Delete a calendar event",
        description: "Removes an event from the user's primary calendar.",
      },
    })
    .input(deleteEventInputModel)
    .output(deleteEventOutputModel)
    .mutation(async ({ ctx, input }) => {
      return calendarService.delete(ctx.session.user.id, input);
    }),
});

export * from "./model";
export * from "./service";
