import { Send, Mail, FileText, ExternalLink, Reply, Search, CheckCircle2 } from "lucide-react";
import type { ExecutedAction } from "../../types";
import { ActionStatus, DetailRow } from "./shared";
import { EmailBodyRenderer } from "~/app/_components/email/EmailBodyRenderer";

export function SendEmailCard({ action }: { action: Extract<ExecutedAction, { type: "send_email" }> }) {
  const hasBody = !!action.body || !!action.htmlBody;
  return (
    <div className="border-outline-variant/50 bg-surface-container-low shadow-sm overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-md">
      {/* Sleek Window-style Header */}
      <div className="bg-surface-container-high px-4 py-3 flex items-center justify-between border-b border-outline-variant/30">
        <div className="flex items-center gap-2.5">
          <div className="shrink-0 rounded-lg bg-blue-500/10 p-1.5 text-blue-500">
            <Send className="size-4" />
          </div>
          <div>
            <h4 className="text-label-md text-on-surface font-bold font-sans">
              Email Sent
            </h4>
          </div>
        </div>
        <ActionStatus success={action.success} />
      </div>

      {/* Header Fields Block (Mocking Real Email Headers) */}
      <div className="px-4 py-3 space-y-2 border-b border-outline-variant/20 bg-surface-container-lowest/50 text-xs">
        <div className="flex items-baseline gap-2">
          <span className="text-on-surface-variant font-semibold w-12 text-right">To:</span>
          <span className="text-on-surface font-medium break-all select-all bg-surface-container-high/40 px-2 py-0.5 rounded-md">{action.to}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-on-surface-variant font-semibold w-12 text-right">Subject:</span>
          <span className="text-on-surface font-semibold">{action.subject}</span>
        </div>
      </div>

      {/* Email Body Content Window */}
      {hasBody && (
        <div className="bg-surface-container-lowest">
          <div className="border border-outline-variant/20 bg-white dark:bg-zinc-950 shadow-inner overflow-x-hidden">
            {action.htmlBody ? (
              <EmailBodyRenderer content={action.htmlBody} contentType="html" noBorder />
            ) : (
              <p className="text-body-sm text-on-surface whitespace-pre-wrap font-sans leading-relaxed">
                {action.body}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CreateEmailDraftCard({ action }: { action: Extract<ExecutedAction, { type: "create_email_draft" }> }) {
  const fromValue = action.senderName && action.senderEmail
    ? `${action.senderName} <${action.senderEmail}>`
    : (action.senderEmail ?? action.senderName ?? "Connected Gmail account");

  return (
    <div className="border-primary/25 bg-surface-container-low shadow-sm overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-md">
      {/* Sleek Window-style Header */}
      <div className="bg-primary-container/20 px-4 py-3 flex items-center justify-between border-b border-primary/20">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 text-primary shrink-0 rounded-lg p-1.5">
            <Mail className="size-4" />
          </div>
          <div>
            <h4 className="text-label-md text-on-surface font-bold font-sans">
              Email Draft Ready
            </h4>
          </div>
        </div>
        <ActionStatus success={action.success} />
      </div>

      {/* Header Fields Block (Mocking Real Email Headers) */}
      <div className="px-4 py-3 space-y-2 border-b border-outline-variant/20 bg-surface-container-lowest/50 text-xs">
        <div className="flex items-baseline gap-2">
          <span className="text-on-surface-variant font-semibold w-12 text-right">From:</span>
          <span className="text-on-surface-variant break-all">{fromValue}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-on-surface-variant font-semibold w-12 text-right">To:</span>
          <span className="text-on-surface font-medium break-all select-all bg-surface-container-high/40 px-2 py-0.5 rounded-md">{action.to}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-on-surface-variant font-semibold w-12 text-right">Subject:</span>
          <span className="text-on-surface font-semibold">{action.subject}</span>
        </div>
      </div>

      {/* Email Body Content Window */}
      <div className="bg-surface-container-lowest space-y-3">
        <div className="border border-outline-variant/20 bg-white dark:bg-zinc-950 shadow-inner overflow-x-hidden">
          {action.htmlBody ? (
            <EmailBodyRenderer content={action.htmlBody} contentType="html" noBorder />
          ) : (
            <p className="text-body-sm text-on-surface whitespace-pre-wrap font-sans leading-relaxed">
              {action.body}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 px-2 pb-2">
          <span className="text-on-surface-variant/70 text-[10px] font-mono select-all">
            Draft ID: {action.draftId}
          </span>
          <a
            href={action.mailLink ?? "/mail?mailbox=drafts"}
            className="bg-primary text-on-primary hover:bg-primary-hover shadow-xs active:scale-[0.98] inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all font-sans"
          >
            {action.messageId ? "Open in Gmail" : "Open Drafts"}
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
