"use client";

import { Trash2, ChevronRight, Square, CheckSquare2 } from "lucide-react";
import { SenderAvatar } from "./SenderAvatar";

type EmailSummary = {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  senderName: string;
  senderEmail: string;
  to: string;
  recipientName: string;
  recipientEmail: string;
  date: string;
  isUnread: boolean;
  priority?: "high" | "medium" | "low";
  priorityReason?: string;
};

type EmailListItemProps = {
  email: EmailSummary;
  isSelected: boolean;
  isOpen: boolean;
  isUnread: boolean;
  mailbox: "inbox" | "starred" | "sent" | "drafts";
  isChecked: boolean;
  onClick: () => void;
  onToggleCheck: () => void;
  onTrash: () => void;
  onDeleteDraft: () => void;
};

export function EmailListItem({
  email,
  isSelected,
  isOpen,
  isUnread,
  mailbox,
  isChecked,
  onClick,
  onToggleCheck,
  onTrash,
  onDeleteDraft,
}: EmailListItemProps) {
  const showRecipient = mailbox === "sent" || mailbox === "drafts";
  const displayName = showRecipient ? email.recipientName : email.senderName;
  const displayEmail = showRecipient ? email.recipientEmail : email.senderEmail;

  return (
    <div
      onClick={onClick}
      className={`group flex cursor-pointer items-start justify-between gap-4 p-4 transition-all ${
        isOpen
          ? "bg-primary/8 border-primary border-l-2"
          : isSelected
            ? "bg-primary/5 border-primary border-l-2"
            : isUnread
              ? "bg-primary/[0.03] border-l-2 border-primary/40 hover:bg-primary/[0.06]"
              : "hover:bg-surface-container-low border-l-2 border-transparent"
      }`}
    >
      {mailbox !== "drafts" && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleCheck();
          }}
          aria-label={`Select ${email.subject}`}
          className="text-on-surface-variant mt-1 shrink-0"
        >
          {isChecked ? (
            <CheckSquare2 className="text-primary size-4" />
          ) : (
            <Square className="size-4" />
          )}
        </button>
      )}
      <SenderAvatar name={displayName} email={displayEmail} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {isUnread && (
            <span className="bg-primary mt-0.5 size-2 shrink-0 rounded-full" />
          )}
          <span
            className={`max-w-[120px] truncate text-xs sm:max-w-[180px] ${
              isUnread
                ? "text-on-surface font-bold"
                : "text-on-surface font-semibold"
            }`}
          >
            {showRecipient ? `To: ${displayName}` : displayName}
          </span>
          {email.priority && (
            <span
              title={email.priorityReason}
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                email.priority === "high"
                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                  : email.priority === "medium"
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
              }`}
            >
              {email.priority}
            </span>
          )}
          <span className="text-3xs text-on-surface-variant/70 shrink-0 ml-auto">
            {email.date ? new Date(email.date).toLocaleDateString() : ""}
          </span>
        </div>
        <h4
          className={`truncate text-xs ${
            isUnread ? "text-on-surface font-bold" : "text-on-surface font-medium"
          }`}
        >
          {email.subject}
        </h4>
        <p
          className={`text-3xs truncate ${
            isUnread ? "text-on-surface-variant font-medium" : "text-on-surface-variant"
          }`}
        >
          {email.snippet}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (mailbox === "drafts") {
              onDeleteDraft();
            } else {
              onTrash();
            }
          }}
          className="hover:bg-error/10 hover:text-error text-on-surface-variant rounded-lg p-1.5 opacity-0 transition group-hover:opacity-100 md:opacity-100"
          title={mailbox === "drafts" ? "Delete draft" : "Trash"}
        >
          <Trash2 className="size-3.5" />
        </button>
        <ChevronRight className="text-on-surface-variant/40 size-4" />
      </div>
    </div>
  );
}
