"use client";

import { useState } from "react";
import { X, Send, Reply, Trash2, Save } from "lucide-react";
import { Card } from "~/app/_components/ui/card";
import { Button } from "~/app/_components/ui/button";
import { EmailBodyRenderer } from "./EmailBodyRenderer";
import { SenderAvatar } from "./SenderAvatar";

type EmailSummary = {
  id: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  internalDate: string;
  subject: string;
  from: string;
  senderName: string;
  senderEmail: string;
  to: string;
  recipientName: string;
  recipientEmail: string;
  date: string;
  isUnread: boolean;
};

type ThreadMessage = {
  id?: string;
  snippet?: string;
};

type EmailDetail = EmailSummary & {
  body: string;
  contentType: "html" | "markdown" | "text";
  messageId: string;
  replyTo: string;
};

type EmailDetailDialogProps = {
  email: EmailSummary;
  emailDetail?: EmailDetail | null;
  isLoadingDetail: boolean;
  threadMessages?: ThreadMessage[];
  mailbox: "inbox" | "starred" | "sent" | "drafts";
  onClose: () => void;
  onSelectMessage: (id: string) => void;
  onReply: (input: { id: string; body: string }) => void;
  isReplying: boolean;
  onTrash: (id: string) => void;
  onOpenDraftEditor: (email: EmailSummary) => void;
  onDeleteDraft: (draftId: string) => void;
  onSendDraft: (draftId: string) => void;
  isSendingDraft: boolean;
  getDraftId: (value: unknown) => string | null;
  getMessageBody: (value: unknown, fallback: string) => string;
};

export function EmailDetailDialog({
  email,
  emailDetail,
  isLoadingDetail,
  threadMessages,
  mailbox,
  onClose,
  onSelectMessage,
  onReply,
  isReplying,
  onTrash,
  onOpenDraftEditor,
  onDeleteDraft,
  onSendDraft,
  isSendingDraft,
  getDraftId,
  getMessageBody,
}: EmailDetailDialogProps) {
  const [replyBody, setReplyBody] = useState("");
  const displayedEmail = mailbox === "drafts" ? email : (emailDetail ?? email);
  const showRecipient = mailbox === "sent" || mailbox === "drafts";

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="bg-surface-container border-outline-variant relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border shadow-2xl">
        {/* Header */}
        <div className="border-outline-variant/60 flex items-start justify-between gap-4 border-b p-6 pb-4">
          <SenderAvatar
            name={showRecipient ? displayedEmail.recipientName : displayedEmail.senderName}
            email={showRecipient ? displayedEmail.recipientEmail : displayedEmail.senderEmail}
            size="md"
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <h3 className="text-on-surface font-serif text-lg font-bold">
              {displayedEmail.subject}
            </h3>
            <div className="text-3xs text-on-surface-variant font-medium">
              <p>
                From:{" "}
                <span className="text-on-surface font-semibold">
                  {displayedEmail.senderName}
                </span>
              </p>
              {displayedEmail.senderEmail && (
                <p className="mt-0.5">Email: {displayedEmail.senderEmail}</p>
              )}
              <p className="mt-0.5">To: {displayedEmail.to}</p>
              <p className="mt-0.5">Date: {displayedEmail.date}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-surface-container-high text-on-surface-variant shrink-0 rounded-full p-1 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingDetail ? (
            <div className="flex h-40 items-center justify-center">
              <div className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : (
            <div className="text-on-surface-variant text-xs leading-relaxed">
              <EmailBodyRenderer
                content={
                  emailDetail?.body ||
                  getMessageBody(displayedEmail, displayedEmail.snippet)
                }
                contentType={emailDetail?.contentType ?? "text"}
              />
            </div>
          )}

          {/* Thread conversation */}
          {mailbox !== "drafts" && (threadMessages?.length ?? 0) > 1 && (
            <div className="border-outline-variant/60 mt-4 border-t pt-4">
              <p className="text-on-surface mb-2 text-xs font-semibold">
                Conversation ({threadMessages?.length})
              </p>
              <div className="space-y-2">
                {threadMessages?.map((message, index) => (
                  <button
                    key={message.id ?? index}
                    type="button"
                    onClick={() => message.id && onSelectMessage(message.id)}
                    className="border-outline-variant bg-surface-container-low hover:bg-surface-container-high w-full rounded-xl border p-3 text-left transition"
                  >
                    <span className="text-on-surface block text-[10px] font-semibold">
                      Message {index + 1}
                    </span>
                    <span className="text-on-surface-variant mt-1 block truncate text-[10px]">
                      {message.snippet || "Open message"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reply form */}
          {mailbox !== "drafts" && (
            <form
              className="border-outline-variant/60 mt-4 space-y-2 border-t pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                onReply({ id: email.id, body: replyBody });
                setReplyBody("");
              }}
            >
              <label className="text-2xs text-on-surface flex items-center gap-1.5 font-semibold">
                <Reply className="size-3.5" /> Reply
              </label>
              <textarea
                required
                rows={4}
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                placeholder="Write your reply..."
                className="border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-primary w-full resize-none rounded-xl border px-3 py-2 text-xs focus:ring-1 focus:outline-none"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isReplying}
                  className="text-2xs rounded-xl font-semibold"
                >
                  <Send className="mr-1 size-3.5" /> Send Reply
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-outline-variant/60 flex justify-end gap-2 border-t p-6 pt-4">
          {mailbox === "drafts" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenDraftEditor(email)}
                className="text-2xs rounded-xl font-semibold"
              >
                <Save className="mr-1 size-3.5" /> Edit Draft
              </Button>
              <Button
                variant="error"
                size="sm"
                onClick={() => {
                  const draftId = getDraftId(email);
                  if (draftId) onDeleteDraft(draftId);
                }}
                className="text-2xs rounded-xl font-semibold"
              >
                <Trash2 className="mr-1 size-3.5" /> Delete
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isSendingDraft}
                onClick={() => {
                  const draftId = getDraftId(email);
                  if (draftId) onSendDraft(draftId);
                }}
                className="text-2xs rounded-xl font-semibold"
              >
                <Send className="mr-1 size-3.5" /> Send Draft
              </Button>
            </>
          ) : (
            <Button
              variant="error"
              size="sm"
              onClick={() => onTrash(email.id)}
              className="text-2xs rounded-xl !py-2 font-semibold shadow-sm"
            >
              <Trash2 className="mr-1 size-3.5" /> Trash Message
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
