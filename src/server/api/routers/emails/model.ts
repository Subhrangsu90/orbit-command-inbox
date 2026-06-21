import { z } from "zod";

export const listEmailsInputModel = z.object({
  q: z.string().optional(),
  maxResults: z.number().min(1).max(50).default(20),
  pageToken: z.string().optional(),
  category: z
    .enum(["primary", "promotions", "social", "updates", "forums"])
    .optional(),
  mailbox: z.enum(["inbox", "starred", "sent", "drafts"]).default("inbox"),
});

export const emailDetailsModel = z.object({
  id: z.string(),
  threadId: z.string(),
  snippet: z.string(),
  labelIds: z.array(z.string()),
  internalDate: z.string(),
  subject: z.string(),
  from: z.string(),
  senderName: z.string(),
  senderEmail: z.string(),
  to: z.string(),
  recipientName: z.string(),
  recipientEmail: z.string(),
  date: z.string(),
  isUnread: z.boolean(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  priorityReason: z.string().optional(),
});

export const getEmailInputModel = z.object({
  id: z.string().min(1),
});

export const getEmailOutputModel = emailDetailsModel.extend({
  messageId: z.string(),
  replyTo: z.string(),
  body: z.string(),
  contentType: z.enum(["html", "markdown", "text"]),
});

export const listEmailsOutputModel = z.object({
  messages: z.array(emailDetailsModel),
  nextPageToken: z.string().optional(),
  notConnected: z.boolean().optional(),
  fromCache: z.boolean().optional(),
});

export const sendEmailInputModel = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  threadId: z.string().optional(),
});

export const sendEmailOutputModel = z.object({
  id: z.string(),
  threadId: z.string(),
  success: z.boolean(),
});

export const replyEmailInputModel = z.object({
  id: z.string().min(1),
  body: z.string().min(1),
});

export const trashEmailInputModel = z.object({
  id: z.string(),
});

export const trashEmailOutputModel = z.object({
  success: z.boolean(),
});

export const modifyLabelsInputModel = z.object({
  id: z.string(),
  addLabelIds: z.array(z.string()).optional(),
  removeLabelIds: z.array(z.string()).optional(),
});

export const modifyLabelsOutputModel = z.object({
  success: z.boolean(),
});

export const batchModifyMessagesInputModel = z.object({
  ids: z.array(z.string().min(1)).min(1),
  addLabelIds: z.array(z.string()).optional(),
  removeLabelIds: z.array(z.string()).optional(),
});

export const messageActionOutputModel = z.object({
  success: z.boolean(),
});

export const listThreadsInputModel = z.object({
  q: z.string().optional(),
  maxResults: z.number().min(1).max(100).default(20),
  pageToken: z.string().optional(),
  includeSpamTrash: z.boolean().optional(),
});

export const gmailMessageModel = z.object({
  id: z.string().optional(),
  threadId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  snippet: z.string().optional(),
  historyId: z.string().optional(),
  internalDate: z
    .union([z.string(), z.number(), z.date()])
    .nullable()
    .optional(),
  sizeEstimate: z.number().optional(),
  payload: z.any().optional(),
  raw: z.string().optional(),
});

export const gmailThreadModel = z.object({
  id: z.string().optional(),
  snippet: z.string().optional(),
  historyId: z.string().optional(),
  messages: z.array(gmailMessageModel).optional(),
});

export const listThreadsOutputModel = z.object({
  threads: z.array(gmailThreadModel),
  nextPageToken: z.string().optional(),
  resultSizeEstimate: z.number().optional(),
});

export const getThreadInputModel = z.object({
  id: z.string().min(1),
  format: z.enum(["minimal", "full", "metadata"]).optional(),
  metadataHeaders: z.array(z.string()).optional(),
});

export const modifyThreadInputModel = z.object({
  id: z.string().min(1),
  addLabelIds: z.array(z.string()).optional(),
  removeLabelIds: z.array(z.string()).optional(),
});

export const gmailLabelModel = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  messageListVisibility: z.enum(["show", "hide"]).optional(),
  labelListVisibility: z
    .enum(["labelShow", "labelShowIfUnread", "labelHide"])
    .optional(),
  type: z.enum(["system", "user"]).optional(),
  messagesTotal: z.number().optional(),
  messagesUnread: z.number().optional(),
  threadsTotal: z.number().optional(),
  threadsUnread: z.number().optional(),
  color: z
    .object({
      textColor: z.string().optional(),
      backgroundColor: z.string().optional(),
    })
    .optional(),
});

export const listLabelsOutputModel = z.object({
  labels: z.array(gmailLabelModel),
});

export const getLabelInputModel = z.object({
  id: z.string().min(1),
});

export const labelPayloadModel = z.object({
  name: z.string().min(1),
  messageListVisibility: z.enum(["show", "hide"]).optional(),
  labelListVisibility: z
    .enum(["labelShow", "labelShowIfUnread", "labelHide"])
    .optional(),
  color: z
    .object({
      textColor: z.string().optional(),
      backgroundColor: z.string().optional(),
    })
    .optional(),
});

export const updateLabelInputModel = labelPayloadModel.partial().extend({
  id: z.string().min(1),
});

export const deleteLabelOutputModel = z.object({
  success: z.boolean(),
});

export const createDraftInputModel = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  threadId: z.string().optional(),
});

export const createDraftOutputModel = z.object({
  id: z.string(),
  messageId: z.string().optional(),
  success: z.boolean(),
});

export const draftDetailsModel = getEmailOutputModel.extend({
  draftId: z.string(),
});

export const listDraftsInputModel = z.object({
  q: z.string().optional(),
  maxResults: z.number().min(1).max(50).default(20),
  pageToken: z.string().optional(),
});

export const listDraftsOutputModel = z.object({
  drafts: z.array(draftDetailsModel),
  nextPageToken: z.string().optional(),
  resultSizeEstimate: z.number().optional(),
});

export const getDraftInputModel = z.object({
  id: z.string().min(1),
});

export const updateDraftInputModel = createDraftInputModel.extend({
  id: z.string().min(1),
});

export const draftActionOutputModel = z.object({
  id: z.string().optional(),
  threadId: z.string().optional(),
  success: z.boolean(),
});

import {
  localSearchOperatorSchema,
  localSearchFilterSchema,
  localEntitySchema,
  localSearchOutputSchema,
} from "~/server/lib/search/localSearch";

export const localSearchOperatorModel = localSearchOperatorSchema;
export const localSearchFilterModel = localSearchFilterSchema;

export const localSearchInputModel = z.object({
  entity: z.enum(["messages", "drafts", "labels", "threads"]),
  filters: z.array(localSearchFilterSchema).default([]),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const localEntityModel = localEntitySchema;
export const localSearchOutputModel = localSearchOutputSchema;

