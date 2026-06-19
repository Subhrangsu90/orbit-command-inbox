"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Inbox,
  Mail,
  MessageSquare,
  RefreshCw,
  Reply,
  Save,
  Send,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { Button } from "~/app/_components/ui/button";
import { EmailBodyRenderer } from "~/app/_components/email/EmailBodyRenderer";
import { SenderAvatar } from "~/app/_components/email/SenderAvatar";
import { ComposeEmailDialog } from "~/app/_components/email/ComposeEmailDialog";
import { api } from "~/trpc/react";
import { mailboxDisplayName } from "~/app/_utils/emailPresentation";

type Mailbox = "inbox" | "starred" | "sent" | "drafts";

type MailDetailClientProps = {
  id: string;
  mailbox: Mailbox;
  draftId?: string;
};

type EmailDetail = {
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
  isUnread?: boolean;
  priority?: "high" | "medium" | "low";
  priorityReason?: string;
  body?: string;
  contentType?: "html" | "markdown" | "text";
  messageId?: string;
  replyTo?: string;
  draftId?: string;
};

function getMessageBody(value: EmailDetail | undefined) {
  return value?.body || value?.snippet || "";
}

export function MailDetailClient({
  id,
  mailbox,
  draftId,
}: MailDetailClientProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [replyBody, setReplyBody] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const isDraft = mailbox === "drafts";
  const draftLookupId = draftId ?? id;

  const emailQuery = api.emails.get.useQuery(
    { id },
    { enabled: !isDraft && Boolean(id) },
  );
  const draftQuery = api.emails.getDraft.useQuery(
    { id: draftLookupId },
    { enabled: isDraft && Boolean(draftLookupId) },
  );
  const displayedEmail = (isDraft ? draftQuery.data : emailQuery.data) as
    | EmailDetail
    | undefined;
  const isLoading = isDraft ? draftQuery.isLoading : emailQuery.isLoading;
  const showRecipient = mailbox === "sent" || mailbox === "drafts";
  const displayName = showRecipient
    ? displayedEmail?.recipientName
    : displayedEmail?.senderName;
  const displayEmail = showRecipient
    ? displayedEmail?.recipientEmail
    : displayedEmail?.senderEmail;

  const threadQuery = api.emails.getThread.useQuery(
    { id: displayedEmail?.threadId ?? "", format: "full" },
    {
      enabled: !isDraft && Boolean(displayedEmail?.threadId),
      retry: false,
      retryOnMount: false,
      staleTime: 30_000,
    },
  );
  const threadMessages = (() => {
    const msgs = threadQuery.data?.messages ?? [];
    const seen = new Set<string>();
    return msgs.filter((message) => {
      if (!message.id || seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    });
  })();

  const modifyLabelsMutation = api.emails.modifyLabels.useMutation({
    onSuccess: () => void utils.emails.get.invalidate({ id }),
  });
  const replyMutation = api.emails.reply.useMutation({
    onSuccess: () => {
      setReplyBody("");
      void utils.emails.get.invalidate({ id });
      void utils.emails.getThread.invalidate();
    },
  });
  const trashMutation = api.emails.trash.useMutation({
    onSuccess: () => router.push(`/mail?mailbox=${mailbox}`),
  });
  const deleteDraftMutation = api.emails.deleteDraft.useMutation({
    onSuccess: () => router.push("/mail?mailbox=drafts"),
  });
  const sendDraftMutation = api.emails.sendDraft.useMutation({
    onSuccess: () => router.push("/mail?mailbox=sent"),
  });
  const sendMutation = api.emails.send.useMutation({
    onSuccess: () => {
      setIsComposeOpen(false);
      router.push("/mail?mailbox=sent");
    },
  });
  const updateDraftMutation = api.emails.updateDraft.useMutation({
    onSuccess: () => {
      setIsComposeOpen(false);
      void draftQuery.refetch();
    },
  });

  useEffect(() => {
    if (
      !displayedEmail?.isUnread ||
      isDraft ||
      modifyLabelsMutation.isPending
    ) {
      return;
    }
    modifyLabelsMutation.mutate({
      id: displayedEmail.id,
      removeLabelIds: ["UNREAD"],
    });
  }, [displayedEmail?.id, displayedEmail?.isUnread, isDraft]);

  function openDraftEditor() {
    if (!displayedEmail) return;
    setComposeTo(displayedEmail.recipientEmail || displayedEmail.to);
    setComposeSubject(
      displayedEmail.subject === "(No subject)" ? "" : displayedEmail.subject,
    );
    setComposeBody(getMessageBody(displayedEmail));
    setIsComposeOpen(true);
  }

  return (
    <WorkspaceLayout wide>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href={`/mail?mailbox=${mailbox}`}
              className="border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high grid size-10 shrink-0 place-items-center rounded-xl border transition"
              aria-label="Back to mailbox"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-primary text-[10px] font-bold tracking-wider uppercase sm:text-[11px]">
                {mailboxDisplayName(mailbox)}
              </p>
              <h1 className="text-on-surface truncate text-base font-semibold sm:text-xl">
                {displayedEmail?.subject ?? "Email details"}
              </h1>
            </div>
          </div>

          {displayedEmail && (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              {isDraft ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openDraftEditor}
                    className="h-10 rounded-xl text-xs font-semibold sm:h-9"
                  >
                    <Save className="mr-1.5 size-3.5" /> Edit Draft
                  </Button>
                  <Button
                    variant="error"
                    size="sm"
                    loading={deleteDraftMutation.isPending}
                    onClick={() =>
                      deleteDraftMutation.mutate({ id: draftLookupId })
                    }
                    className="h-10 rounded-xl text-xs font-semibold sm:h-9"
                  >
                    <Trash2 className="mr-1.5 size-3.5" /> Delete
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={sendDraftMutation.isPending}
                    onClick={() =>
                      sendDraftMutation.mutate({ id: draftLookupId })
                    }
                    className="col-span-2 h-10 rounded-xl text-xs font-semibold sm:col-span-1 sm:h-9"
                  >
                    <Send className="mr-1.5 size-3.5" /> Send
                  </Button>
                </>
              ) : (
                <Button
                  variant="error"
                  size="sm"
                  loading={trashMutation.isPending}
                  onClick={() => trashMutation.mutate({ id })}
                  className="h-10 rounded-xl text-xs font-semibold sm:h-9"
                >
                  <Trash2 className="mr-1.5 size-3.5" /> Trash
                </Button>
              )}
            </div>
          )}
        </div>

        <section className="bg-surface-container-lowest overflow-hidden">
          {isLoading ? (
            <div className="flex min-h-[55vh] items-center justify-center px-6 py-16">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="text-primary size-7 animate-spin" />
                <p className="text-on-surface-variant text-xs font-semibold">
                  Loading message...
                </p>
              </div>
            </div>
          ) : !displayedEmail ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center p-8 text-center">
              <Inbox className="text-on-surface-variant mb-3 size-10 opacity-60" />
              <p className="text-on-surface text-sm font-semibold">
                Message unavailable
              </p>
              <p className="text-on-surface-variant mt-1 text-xs">
                The message could not be loaded.
              </p>
            </div>
          ) : (
            <>
              <div className="border-outline-variant/40 bg-surface-container-lowest border-b">
                <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                      <SenderAvatar
                        name={displayName ?? ""}
                        email={displayEmail ?? ""}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="bg-primary/10 text-primary border-primary/25 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
                            <Inbox className="size-3" />
                            {mailbox}
                          </span>
                          {displayedEmail.labelIds?.includes("UNREAD") && (
                            <span className="bg-primary text-on-primary rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                              Unread
                            </span>
                          )}
                        </div>

                        <h2 className="text-on-surface text-xl leading-tight font-bold break-words sm:text-2xl lg:text-3xl">
                          {displayedEmail.subject || "(No Subject)"}
                        </h2>
                      </div>
                    </div>

                    {displayedEmail.priority && (
                      <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-64 sm:justify-end">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase ${
                            displayedEmail.priority === "high"
                              ? "border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                              : displayedEmail.priority === "medium"
                                ? "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          <Star className="size-3 fill-current" />
                          {displayedEmail.priority}
                        </span>
                        {displayedEmail.priorityReason && (
                          <span className="border-outline-variant/40 bg-surface-container-low text-on-surface-variant rounded-xl border px-3 py-1.5 text-[11px] leading-relaxed break-words">
                            {displayedEmail.priorityReason}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-outline-variant/35 bg-surface-container-low grid gap-3 rounded-2xl border p-3 text-[11px] sm:grid-cols-[1fr_auto] sm:items-end sm:p-4">
                    <div className="min-w-0 space-y-2">
                      <p className="text-on-surface-variant flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 font-medium">
                        <UserRound className="text-primary size-3.5 shrink-0" />
                        <span className="text-on-surface font-semibold">
                          {showRecipient ? "To" : "From"} {displayName}
                        </span>
                        {displayEmail && (
                          <span className="break-all opacity-75">
                            &lt;{displayEmail}&gt;
                          </span>
                        )}
                      </p>

                      {!showRecipient && displayedEmail.to && (
                        <p className="text-on-surface-variant/80 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 font-medium">
                          <Mail className="size-3.5 shrink-0" />
                          <span>to</span>
                          <span className="break-all">{displayedEmail.to}</span>
                        </p>
                      )}
                    </div>

                    <p className="text-on-surface-variant/70 flex items-center gap-1.5 text-[10px] font-semibold sm:justify-end">
                      <Calendar className="size-3.5 shrink-0" />
                      <span className="break-words">{displayedEmail.date}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mx-auto grid w-full max-w-5xl gap-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
                <div className="min-w-0">
                  <EmailBodyRenderer
                    content={getMessageBody(displayedEmail)}
                    contentType={displayedEmail.contentType ?? "text"}
                  />
                </div>

                {!isDraft && threadMessages.length > 1 && (
                  <section className="border-outline-variant/50 bg-surface-container-lowest rounded-2xl border p-3 sm:p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-primary flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
                        <MessageSquare className="size-3.5" />
                        Thread
                      </p>
                      <span className="text-on-surface-variant text-[10px] font-semibold">
                        {threadMessages.length} messages
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {threadMessages.map((message, index) => {
                        const isActive = message.id === displayedEmail.id;
                        return (
                          <Link
                            key={message.id ?? index}
                            href={
                              message.id
                                ? `/mail/${encodeURIComponent(message.id)}?mailbox=${mailbox}`
                                : "#"
                            }
                            className={`border-outline-variant/40 hover:bg-surface-container-high/70 grid gap-1 rounded-xl border p-3 text-left transition sm:grid-cols-[auto_1fr] sm:items-center sm:gap-3 ${
                              isActive
                                ? "ring-primary/35 bg-primary/5 border-primary/30 pointer-events-none ring-2"
                                : "bg-surface-container-low"
                            }`}
                          >
                            <span className="text-primary bg-primary/10 w-fit rounded-full px-2 py-0.5 text-[10px] font-bold">
                              {index + 1}
                            </span>
                            <span className="text-on-surface-variant block truncate text-[11px] font-medium">
                              {isActive ? "Viewing: " : ""}
                              {message.snippet || "Open message"}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}

                {!isDraft && (
                  <form
                    className="border-outline-variant/50 bg-surface-container-lowest space-y-3 rounded-2xl border p-3 sm:p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      replyMutation.mutate({ id, body: replyBody });
                    }}
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-primary flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase">
                        <Reply className="size-3.5" />
                        <span>Reply</span>
                      </div>
                      <p className="text-on-surface-variant truncate text-[11px] font-medium">
                        To {displayedEmail.senderEmail || displayedEmail.from}
                      </p>
                    </div>
                    <div className="border-outline-variant/60 focus-within:ring-primary focus-within:border-primary bg-surface-container-low overflow-hidden rounded-xl border transition focus-within:ring-1">
                      <textarea
                        required
                        rows={5}
                        value={replyBody}
                        onChange={(event) => setReplyBody(event.target.value)}
                        placeholder="Write your reply here..."
                        className="text-on-surface placeholder:text-on-surface-variant/45 min-h-36 w-full resize-y bg-transparent px-4 py-3 text-sm leading-relaxed focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        loading={replyMutation.isPending}
                        className="h-10 w-full rounded-xl text-xs font-semibold sm:w-auto"
                      >
                        <Send className="mr-1.5 size-3.5" /> Send Reply
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <ComposeEmailDialog
        isOpen={isComposeOpen}
        editingDraftId={draftLookupId}
        composeTo={composeTo}
        composeSubject={composeSubject}
        composeBody={composeBody}
        onComposeTo={setComposeTo}
        onComposeSubject={setComposeSubject}
        onComposeBody={setComposeBody}
        onClose={() => setIsComposeOpen(false)}
        onSend={(input) => sendMutation.mutate(input)}
        isSending={sendMutation.isPending}
        onSaveDraft={() => undefined}
        isSavingDraft={false}
        onUpdateDraft={(input) => updateDraftMutation.mutate(input)}
        isUpdatingDraft={updateDraftMutation.isPending}
      />
    </WorkspaceLayout>
  );
}
