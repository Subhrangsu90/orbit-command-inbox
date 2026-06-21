import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { emailsService } from "./service";
import {
  listEmailsInputModel,
  listEmailsOutputModel,
  getEmailInputModel,
  getEmailOutputModel,
  sendEmailInputModel,
  sendEmailOutputModel,
  replyEmailInputModel,
  trashEmailInputModel,
  trashEmailOutputModel,
  modifyLabelsInputModel,
  modifyLabelsOutputModel,
  batchModifyMessagesInputModel,
  messageActionOutputModel,
  listThreadsInputModel,
  listThreadsOutputModel,
  getThreadInputModel,
  gmailThreadModel,
  modifyThreadInputModel,
  listLabelsOutputModel,
  getLabelInputModel,
  gmailLabelModel,
  labelPayloadModel,
  updateLabelInputModel,
  deleteLabelOutputModel,
  createDraftInputModel,
  createDraftOutputModel,
  listDraftsInputModel,
  listDraftsOutputModel,
  getDraftInputModel,
  draftDetailsModel,
  updateDraftInputModel,
  draftActionOutputModel,
  localSearchInputModel,
  localSearchOutputModel,
} from "./model";

const TAGS = ["Emails"];

export const emailsRouter = createTRPCRouter({
  list: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/emails/list",
        tags: TAGS,
        summary: "List emails in mailbox",
        description:
          "Retrieves a detailed list of emails from the user's Gmail mailbox.",
      },
    })
    .input(listEmailsInputModel)
    .output(listEmailsOutputModel)
    .query(async ({ ctx, input }) => {
      return emailsService.list(ctx.session.user.id, input);
    }),

  get: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/emails/{id}",
        tags: TAGS,
        summary: "Get an email",
        description:
          "Retrieves the full decoded body and headers for a Gmail message.",
      },
    })
    .input(getEmailInputModel)
    .output(getEmailOutputModel)
    .query(({ ctx, input }) => emailsService.get(ctx.session.user.id, input)),

  send: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/emails/send",
        tags: TAGS,
        summary: "Send an email",
        description: "Sends a new email message using the Gmail API.",
      },
    })
    .input(sendEmailInputModel)
    .output(sendEmailOutputModel)
    .mutation(async ({ ctx, input }) => {
      return emailsService.send(ctx.session.user.id, input);
    }),

  reply: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/emails/reply",
        tags: TAGS,
        summary: "Reply to an email",
        description:
          "Replies in the original Gmail thread using RFC 2822 reply headers.",
      },
    })
    .input(replyEmailInputModel)
    .output(sendEmailOutputModel)
    .mutation(({ ctx, input }) =>
      emailsService.reply(ctx.session.user.id, input),
    ),

  trash: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/emails/trash",
        tags: TAGS,
        summary: "Trash an email",
        description: "Moves the specified email message to the Gmail trash.",
      },
    })
    .input(trashEmailInputModel)
    .output(trashEmailOutputModel)
    .mutation(async ({ ctx, input }) => {
      return emailsService.trash(ctx.session.user.id, input);
    }),

  modifyLabels: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/emails/labels/modify",
        tags: TAGS,
        summary: "Modify labels on email",
        description: "Adds or removes labels (e.g. read/unread) from an email.",
      },
    })
    .input(modifyLabelsInputModel)
    .output(modifyLabelsOutputModel)
    .mutation(async ({ ctx, input }) => {
      return emailsService.modifyLabels(ctx.session.user.id, input);
    }),

  batchModifyMessages: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/emails/messages/batch-modify",
        tags: TAGS,
        summary: "Bulk modify Gmail messages",
        description: "Adds or removes labels from multiple Gmail messages.",
      },
    })
    .input(batchModifyMessagesInputModel)
    .output(messageActionOutputModel)
    .mutation(({ ctx, input }) =>
      emailsService.batchModifyMessages(ctx.session.user.id, input),
    ),

  permanentlyDeleteMessage: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/emails/messages/{id}/permanent",
        tags: TAGS,
        summary: "Permanently delete a Gmail message",
        description:
          "Irreversibly deletes a Gmail message. This cannot be undone.",
      },
    })
    .input(getEmailInputModel)
    .output(messageActionOutputModel)
    .mutation(({ ctx, input }) =>
      emailsService.permanentlyDeleteMessage(ctx.session.user.id, input),
    ),

  untrashMessage: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/emails/messages/{id}/untrash",
        tags: TAGS,
        summary: "Restore a Gmail message",
        description: "Restores a Gmail message from trash.",
      },
    })
    .input(getEmailInputModel)
    .output(messageActionOutputModel)
    .mutation(({ ctx, input }) =>
      emailsService.untrashMessage(ctx.session.user.id, input),
    ),

  listThreads: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/emails/threads",
        tags: TAGS,
        summary: "List Gmail threads",
        description: "Lists conversation threads in the Gmail mailbox.",
      },
    })
    .input(listThreadsInputModel)
    .output(listThreadsOutputModel)
    .query(({ ctx, input }) =>
      emailsService.listThreads(ctx.session.user.id, input),
    ),

  getThread: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/emails/threads/{id}",
        tags: TAGS,
        summary: "Get a Gmail thread",
        description: "Gets a Gmail conversation thread and its messages.",
      },
    })
    .input(getThreadInputModel)
    .output(gmailThreadModel)
    .query(({ ctx, input }) =>
      emailsService.getThread(ctx.session.user.id, input),
    ),

  modifyThread: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/emails/threads/{id}/labels",
        tags: TAGS,
        summary: "Modify Gmail thread labels",
        description:
          "Adds or removes labels from every message in a Gmail thread.",
      },
    })
    .input(modifyThreadInputModel)
    .output(gmailThreadModel)
    .mutation(({ ctx, input }) =>
      emailsService.modifyThread(ctx.session.user.id, input),
    ),

  trashThread: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/emails/threads/{id}/trash",
        tags: TAGS,
        summary: "Trash a Gmail thread",
        description: "Moves an entire Gmail conversation thread to trash.",
      },
    })
    .input(getEmailInputModel)
    .output(gmailThreadModel)
    .mutation(({ ctx, input }) =>
      emailsService.trashThread(ctx.session.user.id, input),
    ),

  untrashThread: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/emails/threads/{id}/untrash",
        tags: TAGS,
        summary: "Restore a Gmail thread",
        description: "Restores an entire Gmail conversation thread from trash.",
      },
    })
    .input(getEmailInputModel)
    .output(gmailThreadModel)
    .mutation(({ ctx, input }) =>
      emailsService.untrashThread(ctx.session.user.id, input),
    ),

  permanentlyDeleteThread: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/emails/threads/{id}/permanent",
        tags: TAGS,
        summary: "Permanently delete a Gmail thread",
        description:
          "Irreversibly deletes a Gmail thread. This cannot be undone.",
      },
    })
    .input(getEmailInputModel)
    .output(messageActionOutputModel)
    .mutation(({ ctx, input }) =>
      emailsService.permanentlyDeleteThread(ctx.session.user.id, input),
    ),

  listLabels: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/emails/labels",
        tags: TAGS,
        summary: "List Gmail labels",
        description: "Lists all system and user labels in the Gmail mailbox.",
      },
    })
    .output(listLabelsOutputModel)
    .query(({ ctx }) => emailsService.listLabels(ctx.session.user.id)),

  getLabel: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/emails/labels/{id}",
        tags: TAGS,
        summary: "Get a Gmail label",
        description: "Gets a specific Gmail label by ID.",
      },
    })
    .input(getLabelInputModel)
    .output(gmailLabelModel)
    .query(({ ctx, input }) =>
      emailsService.getLabel(ctx.session.user.id, input),
    ),

  createLabel: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/emails/labels",
        tags: TAGS,
        summary: "Create a Gmail label",
        description: "Creates a user label in the Gmail mailbox.",
      },
    })
    .input(labelPayloadModel)
    .output(gmailLabelModel)
    .mutation(({ ctx, input }) =>
      emailsService.createLabel(ctx.session.user.id, input),
    ),

  updateLabel: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/emails/labels/{id}",
        tags: TAGS,
        summary: "Update a Gmail label",
        description: "Updates an existing Gmail user label.",
      },
    })
    .input(updateLabelInputModel)
    .output(gmailLabelModel)
    .mutation(({ ctx, input }) =>
      emailsService.updateLabel(ctx.session.user.id, input),
    ),

  deleteLabel: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/emails/labels/{id}",
        tags: TAGS,
        summary: "Delete a Gmail label",
        description: "Permanently deletes a Gmail user label.",
      },
    })
    .input(getLabelInputModel)
    .output(deleteLabelOutputModel)
    .mutation(({ ctx, input }) =>
      emailsService.deleteLabel(ctx.session.user.id, input),
    ),

  createDraft: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/emails/draft/create",
        tags: TAGS,
        summary: "Create a draft email",
        description: "Creates a new draft email in the user's Gmail account.",
      },
    })
    .input(createDraftInputModel)
    .output(createDraftOutputModel)
    .mutation(async ({ ctx, input }) => {
      return emailsService.createDraft(ctx.session.user.id, input);
    }),

  listDrafts: protectedProcedure
    .input(listDraftsInputModel)
    .output(listDraftsOutputModel)
    .query(({ ctx, input }) =>
      emailsService.listDrafts(ctx.session.user.id, input),
    ),

  getDraft: protectedProcedure
    .input(getDraftInputModel)
    .output(draftDetailsModel)
    .query(({ ctx, input }) =>
      emailsService.getDraft(ctx.session.user.id, input),
    ),

  updateDraft: protectedProcedure
    .input(updateDraftInputModel)
    .output(createDraftOutputModel)
    .mutation(({ ctx, input }) =>
      emailsService.updateDraft(ctx.session.user.id, input),
    ),

  deleteDraft: protectedProcedure
    .input(getDraftInputModel)
    .output(draftActionOutputModel)
    .mutation(({ ctx, input }) =>
      emailsService.deleteDraft(ctx.session.user.id, input),
    ),

  sendDraft: protectedProcedure
    .input(getDraftInputModel)
    .output(draftActionOutputModel)
    .mutation(({ ctx, input }) =>
      emailsService.sendDraft(ctx.session.user.id, input),
    ),

  searchLocal: protectedProcedure
    .input(localSearchInputModel)
    .output(localSearchOutputModel)
    .query(({ ctx, input }) =>
      emailsService.searchLocal(ctx.session.user.id, input),
    ),

  searchSemantic: protectedProcedure
    .input(
      z.object({
        q: z.string().min(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .output(listEmailsOutputModel)
    .query(async ({ ctx, input }) => {
      const { searchSemantic } = await import("~/server/lib/ai/embeddings");
      return searchSemantic(ctx.session.user.id, input.q, input.limit);
    }),

  getSummary: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const email = await emailsService.get(ctx.session.user.id, { id: input.id });
      const { getEmailSummary } = await import("~/server/lib/ai/emailAgent");
      const summary = await getEmailSummary(
        input.id,
        email.subject,
        email.body || email.snippet || "",
      );
      return { summary };
    }),

  generateAiReply: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tone: z.enum(["agree", "decline", "info", "custom"]),
        prompt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = await emailsService.get(ctx.session.user.id, { id: input.id });
      const { generateEmailReply } = await import("~/server/lib/ai/emailAgent");
      const reply = await generateEmailReply(
        email.subject,
        email.senderName || email.from,
        email.senderEmail || email.from,
        email.body || email.snippet || "",
        input.tone,
        input.prompt,
      );
      return { reply };
    }),

});

export * from "./model";
export * from "./service";
