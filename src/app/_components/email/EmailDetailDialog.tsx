"use client";

import { useState } from "react";
import { X, Send, Reply, Trash2, Save, ArrowLeft, Calendar, Inbox, Star, MessageSquare } from "lucide-react";
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
  priority?: "high" | "medium" | "low";
  priorityReason?: string;
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
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md transition-all duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card 
        className="bg-surface-container/95 border-outline-variant/60 relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border shadow-2xl transition-all duration-300 animate-slide-up"
      >
        {/* Header toolbar */}
        <div className="border-outline-variant/40 flex items-center justify-between border-b px-6 py-4 bg-surface-container-low/50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="hover:bg-surface-container-high text-on-surface-variant flex size-8 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95"
              title="Back to List"
            >
              <ArrowLeft className="size-4" />
            </button>
            
            <div className="h-4 w-px bg-outline-variant/50" />
            
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/25 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
              <Inbox className="size-3" />
              {mailbox}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="hover:bg-surface-container-high text-on-surface-variant flex size-8 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Email Meta Info Header */}
        <div className="border-outline-variant/30 flex items-start gap-4 border-b p-6 bg-surface-container-low/20">
          <SenderAvatar
            name={showRecipient ? displayedEmail.recipientName : displayedEmail.senderName}
            email={showRecipient ? displayedEmail.recipientEmail : displayedEmail.senderEmail}
            size="md"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-on-surface font-serif text-base md:text-lg font-bold leading-tight tracking-tight">
              {displayedEmail.subject || "(No Subject)"}
            </h2>
            
            <div className="text-[11px] text-on-surface-variant/80 font-medium space-y-0.5">
              <p className="flex items-center gap-1 flex-wrap">
                <span className="text-on-surface font-semibold">
                  {showRecipient ? "To: " : "From: "}
                  {showRecipient ? displayedEmail.recipientName : displayedEmail.senderName}
                </span>
                <span className="opacity-75">
                  &lt;{showRecipient ? displayedEmail.recipientEmail : displayedEmail.senderEmail}&gt;
                </span>
              </p>
              
              {!showRecipient && displayedEmail.to && (
                <p className="opacity-75">to {displayedEmail.to}</p>
              )}
              
              <p className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 mt-1 font-semibold">
                <Calendar className="size-3" />
                {displayedEmail.date}
              </p>
              
              {/* Priority Indicator */}
              {displayedEmail.priority && (
                <div className="mt-2.5 flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                      displayedEmail.priority === "high"
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                        : displayedEmail.priority === "medium"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    <Star className="size-2.5 fill-current" />
                    Priority: {displayedEmail.priority}
                  </span>
                  {displayedEmail.priorityReason && (
                    <span className="text-[10px] text-on-surface-variant/80 italic font-normal bg-surface-container-high/40 px-2.5 py-0.5 rounded-lg border border-outline-variant/20">
                      {displayedEmail.priorityReason}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Email content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingDetail ? (
            <div className="flex h-48 items-center justify-center">
              <div className="flex flex-col items-center gap-2.5">
                <div className="border-primary size-7 animate-spin rounded-full border-2 border-t-transparent" />
                <p className="text-3xs text-on-surface-variant font-bold tracking-wider uppercase">Loading conversation...</p>
              </div>
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
            <div className="border-outline-variant/30 mt-6 border-t pt-5">
              <p className="text-on-surface mb-3 text-2xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 select-none">
                <MessageSquare className="size-3.5" />
                Conversation Thread ({threadMessages?.length} Messages)
              </p>
              <div className="space-y-2">
                {threadMessages?.map((message, index) => {
                  const isActive = message.id === displayedEmail.id;
                  return (
                    <button
                      key={message.id ?? index}
                      type="button"
                      disabled={isActive}
                      onClick={() => message.id && onSelectMessage(message.id)}
                      className={`border-outline-variant/40 bg-surface-container-low hover:bg-surface-container-high/80 w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                        isActive 
                          ? "ring-2 ring-primary/40 bg-primary/5 cursor-default border-primary/30" 
                          : "hover:scale-[1.005] cursor-pointer"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface text-3xs font-bold uppercase tracking-wider">
                          Message {index + 1} {isActive && "(Viewing)"}
                        </span>
                      </div>
                      <span className="text-on-surface-variant/80 mt-1 block truncate text-[11px] font-medium">
                        {message.snippet || "Open message"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reply form */}
          {mailbox !== "drafts" && (
            <form
              className="border-outline-variant/30 mt-6 space-y-3 border-t pt-5"
              onSubmit={(event) => {
                event.preventDefault();
                onReply({ id: email.id, body: replyBody });
                setReplyBody("");
              }}
            >
              <div className="flex items-center gap-2 text-2xs text-on-surface font-bold uppercase tracking-wider text-primary select-none">
                <Reply className="size-3.5" /> 
                <span>Compose Reply</span>
              </div>
              
              <div className="border border-outline-variant/60 rounded-2xl overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition bg-surface-container-low">
                <div className="px-4 py-2 border-b border-outline-variant/30 flex items-center text-[10px] text-on-surface-variant/70 font-semibold gap-1">
                  <span>To:</span>
                  <span className="text-on-surface">{displayedEmail.senderEmail || displayedEmail.from}</span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder="Write your reply here..."
                  className="bg-transparent text-on-surface w-full resize-none px-4 py-3 text-xs focus:outline-none placeholder:text-on-surface-variant/40"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isReplying}
                  className="text-2xs rounded-xl font-bold px-4 py-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                >
                  <Send className="mr-1.5 size-3.5" /> Send Reply
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-outline-variant/40 flex justify-end gap-2 border-t p-6 bg-surface-container-low/40">
          {mailbox === "drafts" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenDraftEditor(email)}
                className="text-2xs rounded-xl font-bold px-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xs"
              >
                <Save className="mr-1.5 size-3.5" /> Edit Draft
              </Button>
              <Button
                variant="error"
                size="sm"
                onClick={() => {
                  const draftId = getDraftId(email);
                  if (draftId) onDeleteDraft(draftId);
                }}
                className="text-2xs rounded-xl font-bold px-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xs"
              >
                <Trash2 className="mr-1.5 size-3.5" /> Delete
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isSendingDraft}
                onClick={() => {
                  const draftId = getDraftId(email);
                  if (draftId) onSendDraft(draftId);
                }}
                className="text-2xs rounded-xl font-bold px-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
              >
                <Send className="mr-1.5 size-3.5" /> Send Draft
              </Button>
            </>
          ) : (
            <Button
              variant="error"
              size="sm"
              onClick={() => onTrash(email.id)}
              className="text-2xs rounded-xl px-4 py-2 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
            >
              <Trash2 className="mr-1.5 size-3.5" /> Trash Message
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
