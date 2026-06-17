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
import { Card } from "~/app/_components/ui/card";
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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="border-outline-variant flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/mail?mailbox=${mailbox}`}
              className="text-on-surface-variant hover:bg-surface-container-high grid size-10 shrink-0 place-items-center rounded-xl transition"
              aria-label="Back to mailbox"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-primary text-[10px] font-bold tracking-wider uppercase">
                {mailboxDisplayName(mailbox)}
              </p>
              <h1 className="text-on-surface truncate font-serif text-xl font-bold">
                {displayedEmail?.subject ?? "Email details"}
              </h1>
            </div>
          </div>

          {displayedEmail && (
            <div className="flex flex-wrap items-center gap-2">
              {isDraft ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openDraftEditor}
                    className="h-9 rounded-xl text-xs font-semibold"
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
                    className="h-9 rounded-xl text-xs font-semibold"
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
                    className="h-9 rounded-xl text-xs font-semibold"
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
                  className="h-9 rounded-xl text-xs font-semibold"
                >
                  <Trash2 className="mr-1.5 size-3.5" /> Trash
                </Button>
              )}
            </div>
          )}
        </div>

        <Card className="border-outline-variant bg-surface-container-lowest overflow-hidden rounded-3xl border shadow-sm">
          {isLoading ? (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="text-primary size-7 animate-spin" />
                <p className="text-on-surface-variant text-xs font-semibold">
                  Loading message...
                </p>
              </div>
            </div>
          ) : !displayedEmail ? (
            <div className="flex h-[60vh] flex-col items-center justify-center p-8 text-center">
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
              <div className="bg-surface-container-low/30 border-outline-variant/40 border-b px-4 py-5 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-3xl items-start gap-3 sm:gap-4">
                  <SenderAvatar
                    name={displayName ?? ""}
                    email={displayEmail ?? ""}
                    size="md"
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-primary/10 text-primary border-primary/25 flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                        <Inbox className="size-3" />
                        {mailbox}
                      </span>
                      {displayedEmail.labelIds?.includes("UNREAD") && (
                        <span className="bg-primary size-2 rounded-full" />
                      )}
                    </div>

                    <h2 className="text-on-surface font-serif text-xl leading-tight font-bold tracking-tight break-words sm:text-2xl lg:text-3xl">
                      {displayedEmail.subject || "(No Subject)"}
                    </h2>

                    <div className="text-on-surface-variant/80 space-y-1 text-[11px] font-medium">
                      <p className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                        <UserRound className="text-primary size-3.5" />
                        <span className="text-on-surface font-semibold">
                          {showRecipient ? "To:" : "From:"} {displayName}
                        </span>
                        {displayEmail && (
                          <span className="break-all opacity-75">
                            &lt;{displayEmail}&gt;
                          </span>
                        )}
                      </p>

                      {!showRecipient && displayedEmail.to && (
                        <p className="flex flex-wrap items-center gap-x-1 gap-y-0.5 pl-4 opacity-75">
                          <Mail className="size-3" />
                          to{" "}
                          <span className="break-all">{displayedEmail.to}</span>
                        </p>
                      )}

                      <p className="text-on-surface-variant/60 flex items-center gap-1 pl-4 text-[10px] font-semibold">
                        <Calendar className="size-3" />
                        {displayedEmail.date}
                      </p>
                    </div>

                    {displayedEmail.priority && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                            displayedEmail.priority === "high"
                              ? "border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                              : displayedEmail.priority === "medium"
                                ? "border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          <Star className="size-2.5 fill-current" />
                          {displayedEmail.priority} priority
                        </span>
                        {displayedEmail.priorityReason && (
                          <span className="bg-surface-container-high/40 border-outline-variant/20 text-on-surface-variant/80 rounded-lg border px-2.5 py-0.5 text-[10px] font-normal break-words italic">
                            {displayedEmail.priorityReason}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <EmailBodyRenderer
                  content={getMessageBody(displayedEmail)}
                  contentType={displayedEmail.contentType ?? "text"}
                />

                {!isDraft && threadMessages.length > 1 && (
                  <div className="border-outline-variant/30 border-t pt-5">
                    <p className="text-2xs text-primary mb-3 flex items-center gap-1.5 font-bold tracking-wider uppercase">
                      <MessageSquare className="size-3.5" />
                      Conversation Thread ({threadMessages.length} Messages)
                    </p>
                    <div className="space-y-2">
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
                            className={`border-outline-variant/40 bg-surface-container-low hover:bg-surface-container-high/80 block rounded-2xl border p-4 text-left transition ${
                              isActive
                                ? "ring-primary/40 bg-primary/5 border-primary/30 pointer-events-none ring-2"
                                : ""
                            }`}
                          >
                            <span className="text-on-surface text-3xs font-bold tracking-wider uppercase">
                              Message {index + 1} {isActive && "(Viewing)"}
                            </span>
                            <span className="text-on-surface-variant/80 mt-1 block truncate text-[11px] font-medium">
                              {message.snippet || "Open message"}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!isDraft && (
                  <form
                    className="border-outline-variant/30 space-y-3 border-t pt-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      replyMutation.mutate({ id, body: replyBody });
                    }}
                  >
                    <div className="text-2xs text-primary flex items-center gap-2 font-bold tracking-wider uppercase">
                      <Reply className="size-3.5" />
                      <span>Compose Reply</span>
                    </div>
                    <div className="border-outline-variant/60 focus-within:ring-primary focus-within:border-primary bg-surface-container-low overflow-hidden rounded-2xl border transition focus-within:ring-1">
                      <div className="border-outline-variant/30 text-on-surface-variant/70 flex items-center gap-1 border-b px-4 py-2 text-[10px] font-semibold">
                        <span>To:</span>
                        <span className="text-on-surface break-all">
                          {displayedEmail.senderEmail || displayedEmail.from}
                        </span>
                      </div>
                      <textarea
                        required
                        rows={5}
                        value={replyBody}
                        onChange={(event) => setReplyBody(event.target.value)}
                        placeholder="Write your reply here..."
                        className="text-on-surface placeholder:text-on-surface-variant/40 w-full resize-none bg-transparent px-4 py-3 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        loading={replyMutation.isPending}
                        className="rounded-xl text-xs font-semibold"
                      >
                        <Send className="mr-1.5 size-3.5" /> Send Reply
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </Card>
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
