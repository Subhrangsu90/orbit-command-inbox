import { Send, Mail, FileText, ExternalLink, Reply, Search, CheckCircle2 } from "lucide-react";
import type { ExecutedAction } from "../../types";
import { ActionStatus, DetailRow } from "./shared";

export function SendEmailCard({ action }: { action: Extract<ExecutedAction, { type: "send_email" }> }) {
  const hasBody = !!action.body;
  return (
    <div className="border-outline-variant/60 bg-surface-container-highest overflow-hidden rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-xl bg-blue-500/10 p-2 text-blue-500">
          <Send className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-label-lg text-on-surface font-semibold font-sans">
            Email sent
          </h4>
          <p className="text-body-sm text-on-surface-variant mt-0.5 truncate font-sans">
            To: {action.to} • {action.subject}
          </p>
        </div>
        <ActionStatus success={action.success} />
      </div>

      {hasBody && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2">
            <DetailRow
              icon={<Mail className="size-4" />}
              label="To"
              value={action.to}
            />
            <DetailRow
              icon={<FileText className="size-4" />}
              label="Subject"
              value={action.subject}
            />
          </div>
          <p className="text-body-sm text-on-surface whitespace-pre-wrap font-sans">
            {action.body}
          </p>
        </div>
      )}
    </div>
  );
}

export function CreateEmailDraftCard({ action }: { action: Extract<ExecutedAction, { type: "create_email_draft" }> }) {
  return (
    <div className="border-primary/30 bg-surface-container-highest overflow-hidden rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary shrink-0 rounded-xl p-2">
          <Mail className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-label-lg text-on-surface font-semibold font-sans">
            Email draft ready
          </h4>
          <p className="text-body-sm text-on-surface-variant mt-0.5 truncate font-sans">
            To: {action.to} • {action.subject}
          </p>
        </div>
        <ActionStatus success={action.success} />
      </div>

      <div className="mt-3 space-y-3">
        <div className="grid gap-2">
          <DetailRow
            icon={<Mail className="size-4" />}
            label="From"
            value={
              action.senderName && action.senderEmail
                ? `${action.senderName} <${action.senderEmail}>`
                : (action.senderEmail ??
                  action.senderName ??
                  "Connected Gmail account")
            }
          />
          <DetailRow
            icon={<Mail className="size-4" />}
            label="To"
            value={action.to}
          />
          <DetailRow
            icon={<FileText className="size-4" />}
            label="Subject"
            value={action.subject}
          />
        </div>
        <p className="text-body-sm text-on-surface whitespace-pre-wrap font-sans">
          {action.body}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-on-surface-variant text-[11px] font-sans">
            Draft ID: {action.draftId}
          </span>
          <a
            href={action.mailLink ?? "/mail?mailbox=drafts"}
            className="text-primary hover:bg-primary/10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition font-sans"
          >
            {action.messageId ? "Open draft" : "Open drafts"}
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function ReplyToEmailCard({ action }: { action: Extract<ExecutedAction, { type: "reply_to_email" }> }) {
  return (
    <div className="border-outline-variant/60 bg-surface-container-highest flex items-center gap-3 overflow-hidden rounded-2xl border p-4">
      <div className="shrink-0 rounded-xl bg-indigo-500/10 p-2 text-indigo-500">
        <Reply className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-label-lg text-on-surface font-semibold font-sans">
          Sent Reply
        </h4>
        <p className="text-body-sm text-on-surface-variant truncate font-sans">
          Thread ID: {action.id}
        </p>
      </div>
      <ActionStatus success={action.success} />
    </div>
  );
}

export function SearchEmailsCard({ action }: { action: Extract<ExecutedAction, { type: "search_emails" }> }) {
  return (
    <div className="border-outline-variant/60 bg-surface-container-highest flex items-center gap-3 overflow-hidden rounded-2xl border p-4">
      <div className="shrink-0 rounded-xl bg-teal-500/10 p-2 text-teal-500">
        <Search className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-label-lg text-on-surface font-semibold font-sans">
          Queried Emails
        </h4>
        <p className="text-body-sm text-on-surface-variant truncate font-sans">
          {action.query ? `Query: "${action.query}"` : "All Inbox"} • Found {action.count} results
        </p>
      </div>
      <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
    </div>
  );
}
