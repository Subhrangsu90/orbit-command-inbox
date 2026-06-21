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
  ChevronDown,
  ChevronUp,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Info,
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { Button } from "~/app/_components/ui/button";
import { EmailBodyRenderer } from "~/app/_components/email/EmailBodyRenderer";
import { SenderAvatar } from "~/app/_components/email/SenderAvatar";
import { ComposeEmailDialog } from "~/app/_components/email/ComposeEmailDialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";

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
  const [showDetails, setShowDetails] = useState(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const isDraft = mailbox === "drafts";
  const draftLookupId = draftId ?? id;

  const emailQuery = api.emails.get.useQuery(
    { id },
    { enabled: !isDraft && Boolean(id) },
  );
  const summaryQuery = api.emails.getSummary.useQuery(
    { id },
    { enabled: false, retry: false },
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
      toast.success("Reply sent successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send reply");
    },
  });
  const generateReplyMutation = api.emails.generateAiReply.useMutation({
    onSuccess: (data) => {
      setReplyBody(data.reply);
      setAiCustomPrompt("");
      toast.success("AI reply draft generated!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate AI reply");
    },
  });
  const trashMutation = api.emails.trash.useMutation({
    onSuccess: () => {
      toast.success("Email moved to trash");
      router.push(`/mail?mailbox=${mailbox}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to trash email");
    },
  });
  const deleteDraftMutation = api.emails.deleteDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft deleted successfully");
      router.push("/mail?mailbox=drafts");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete draft");
    },
  });
  const sendDraftMutation = api.emails.sendDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft sent successfully!");
      router.push("/mail?mailbox=sent");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send draft");
    },
  });
  const sendMutation = api.emails.send.useMutation({
    onSuccess: () => {
      toast.success("Email sent successfully!");
      setIsComposeOpen(false);
      router.push("/mail?mailbox=sent");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send email");
    },
  });
  const updateDraftMutation = api.emails.updateDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft saved successfully");
      setIsComposeOpen(false);
      void draftQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save draft");
    },
  });

  useEffect(() => {
    if (summaryQuery.error) {
      toast.error(summaryQuery.error.message || "Failed to generate AI summary");
    }
  }, [summaryQuery.error]);

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href={`/mail?mailbox=${mailbox}`}
              className="border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high grid size-9 shrink-0 place-items-center rounded-xl border transition shadow-xs"
              aria-label="Back to mailbox"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0 flex items-center gap-2">
              <span className="bg-primary/10 text-primary border-primary/25 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                <Inbox className="size-3" />
                {mailbox}
              </span>
              {displayedEmail?.labelIds?.includes("UNREAD") && (
                <span className="bg-primary text-on-primary rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase shadow-xs">
                  Unread
                </span>
              )}
            </div>
          </div>

          {displayedEmail && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isDraft ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openDraftEditor}
                    className="h-9 rounded-xl text-xs font-semibold px-3 shadow-xs"
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
                    className="h-9 rounded-xl text-xs font-semibold px-3 shadow-xs"
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
                    className="h-9 rounded-xl text-xs font-semibold px-4 shadow-sm"
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
                  className="h-9 rounded-xl text-xs font-semibold px-3 shadow-xs"
                >
                  <Trash2 className="mr-1.5 size-3.5" /> Trash
                </Button>
              )}
            </div>
          )}
        </div>

        <section className="bg-transparent overflow-hidden">
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
            <div className="flex min-h-[55vh] flex-col items-center justify-center p-8 text-center bg-surface-container-lowest border border-outline-variant/40 rounded-3xl">
              <Inbox className="text-on-surface-variant mb-3 size-10 opacity-60" />
              <p className="text-on-surface text-sm font-semibold">
                Message unavailable
              </p>
              <p className="text-on-surface-variant mt-1 text-xs">
                The message could not be loaded.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between px-2">
                <div className="space-y-1">
                  <h1 className="text-on-surface text-2xl font-bold tracking-tight leading-tight sm:text-3xl">
                    {displayedEmail.subject || "(No Subject)"}
                  </h1>
                  {displayedEmail.priorityReason && (
                    <p className="text-on-surface-variant/85 text-xs leading-relaxed max-w-3xl bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 mt-1.5">
                      <strong className="text-primary font-bold mr-1">AI Priority Reason:</strong>
                      {displayedEmail.priorityReason}
                    </p>
                  )}
                </div>

                {displayedEmail.priority && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase shrink-0 h-fit ${
                      displayedEmail.priority === "high"
                        ? "border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                        : displayedEmail.priority === "medium"
                          ? "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    <Star className="size-3.5 fill-current" />
                    {displayedEmail.priority} Priority
                  </span>
                )}
              </div>

              {/* AI Summary Card */}
              {!isDraft && (
                <div className="bg-surface-container-low border border-outline-variant/40 rounded-3xl p-4 sm:p-5 shadow-xs mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-wider uppercase">
                      <Sparkles className="size-4 text-primary animate-pulse" />
                      <span>AI Email Summary</span>
                    </div>
                    {!summaryQuery.data && !summaryQuery.isFetching && (
                      <button
                        type="button"
                        onClick={() => summaryQuery.refetch()}
                        className="bg-primary hover:bg-primary/90 text-on-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <Sparkles className="size-3" />
                        <span>Summarize Email</span>
                      </button>
                    )}
                  </div>
                  {summaryQuery.isFetching ? (
                    <div className="space-y-2 animate-pulse py-1">
                      <div className="h-3 bg-primary/10 rounded w-5/6"></div>
                      <div className="h-3 bg-primary/10 rounded w-4/5"></div>
                      <div className="h-3 bg-primary/10 rounded w-2/3"></div>
                    </div>
                  ) : summaryQuery.data?.summary ? (
                    <div className="text-on-surface-variant text-xs leading-relaxed whitespace-pre-line border-t border-outline-variant/30 pt-2.5 mt-1 animate-in fade-in-50 duration-200">
                      {summaryQuery.data.summary}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl overflow-hidden shadow-xs">
                <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-outline-variant/20 bg-surface-container-lowest">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                      <SenderAvatar
                        name={displayName ?? ""}
                        email={displayEmail ?? ""}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-on-surface font-semibold text-sm sm:text-base">
                            {displayName}
                          </span>
                          {displayEmail && (
                            <span className="text-on-surface-variant/75 text-xs truncate hidden sm:inline">
                              &lt;{displayEmail}&gt;
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-on-surface-variant/80 hover:text-primary hover:bg-surface-container-high inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium transition cursor-pointer"
                          >
                            <span>to {showRecipient ? displayedEmail.recipientEmail || displayedEmail.to : "me"}</span>
                            {showDetails ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-on-surface-variant/75 text-xs font-medium hidden md:inline">
                        {displayedEmail.date}
                      </span>
                      <span className="text-on-surface-variant/75 text-xs font-medium inline md:hidden">
                        {displayedEmail.date.split(",")[0] ?? displayedEmail.date}
                      </span>

                      <div className="flex items-center gap-1 border-l border-outline-variant/25 pl-3">
                        {!isDraft && (
                          <button
                            type="button"
                            title="Reply"
                            onClick={() => {
                              const replyForm = document.getElementById("reply-form");
                              if (replyForm) {
                                replyForm.scrollIntoView({ behavior: "smooth" });
                                const textarea = replyForm.querySelector("textarea");
                                textarea?.focus();
                              }
                            }}
                            className="text-on-surface-variant/80 hover:text-primary hover:bg-surface-container-high grid size-8 place-items-center rounded-lg transition"
                          >
                            <Reply className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {showDetails && (
                    <div className="mt-4 border border-outline-variant/30 bg-surface-container-low rounded-2xl p-4 text-xs shadow-xs animate-in fade-in-50 duration-200">
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr className="align-top">
                            <td className="text-on-surface-variant/70 font-semibold pr-4 pb-2 w-16">from:</td>
                            <td className="text-on-surface font-medium pb-2 break-all">
                              {displayName} {displayEmail ? `<${displayEmail}>` : ""}
                            </td>
                          </tr>
                          {displayedEmail.to && (
                            <tr className="align-top">
                              <td className="text-on-surface-variant/70 font-semibold pr-4 pb-2 w-16">to:</td>
                              <td className="text-on-surface font-medium pb-2 break-all">
                                {displayedEmail.to}
                              </td>
                            </tr>
                          )}
                          {displayedEmail.replyTo && (
                            <tr className="align-top">
                              <td className="text-on-surface-variant/70 font-semibold pr-4 pb-2 w-16">reply-to:</td>
                              <td className="text-on-surface font-medium pb-2 break-all">
                                {displayedEmail.replyTo}
                              </td>
                            </tr>
                          )}
                          <tr className="align-top">
                            <td className="text-on-surface-variant/70 font-semibold pr-4 pb-2 w-16">date:</td>
                            <td className="text-on-surface font-medium pb-2 break-words">
                              {displayedEmail.date}
                            </td>
                          </tr>
                          <tr className="align-top">
                            <td className="text-on-surface-variant/70 font-semibold pr-4 pb-2 w-16">subject:</td>
                            <td className="text-on-surface font-medium pb-2 break-words">
                              {displayedEmail.subject || "(No Subject)"}
                            </td>
                          </tr>
                          {displayedEmail.messageId && (
                            <tr className="align-top">
                              <td className="text-on-surface-variant/70 font-semibold pr-4 w-16">id:</td>
                              <td className="text-on-surface-variant/80 font-mono text-[10px] break-all">
                                {displayedEmail.messageId}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-6 lg:p-8 bg-surface-container-lowest text-on-surface min-w-0">
                  <EmailBodyRenderer
                    content={getMessageBody(displayedEmail)}
                    contentType={displayedEmail.contentType ?? "text"}
                  />
                </div>
              </div>

              {!isDraft && threadMessages.length > 1 && (
                <section className="border-outline-variant/40 bg-surface-container-lowest rounded-3xl border p-4 sm:p-5 shadow-xs">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-primary flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                      <MessageSquare className="size-4" />
                      Conversation Thread
                    </p>
                    <span className="text-on-surface-variant text-xs font-semibold">
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
                          className={`border-outline-variant/30 hover:bg-surface-container-high/70 grid gap-1 rounded-xl border p-3 text-left transition sm:grid-cols-[auto_1fr] sm:items-center sm:gap-3 ${
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
                  id="reply-form"
                  className="bg-surface-container-low border border-outline-variant/40 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xs animate-in fade-in-50"
                  onSubmit={(event) => {
                    event.preventDefault();
                    replyMutation.mutate({ id, body: replyBody });
                  }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/20 pb-3">
                    <div className="text-primary flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                      <Reply className="size-4" />
                      <span>Reply to conversation</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                      <span>To:</span>
                      <span className="text-on-surface font-semibold truncate bg-surface-container-high px-2.5 py-0.5 rounded-full">
                        {displayedEmail.senderEmail || displayedEmail.from}
                      </span>
                    </div>
                  </div>

                  {/* AI Reply Assistant */}
                  <div className="bg-surface-container-low border border-outline-variant/40 rounded-3xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary tracking-wider uppercase">
                      <Sparkles className="size-3.5 text-primary animate-pulse" />
                      <span>AI Reply Assistant</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-on-surface-variant/75 font-semibold">Tones:</span>
                      <button
                        type="button"
                        disabled={generateReplyMutation.isPending}
                        onClick={() => generateReplyMutation.mutate({ id, tone: "agree" })}
                        className="bg-primary-container text-on-primary-container hover:bg-primary-container/85 border border-outline-variant/20 rounded-xl px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ThumbsUp className="size-3.5" />
                        <span>Agree</span>
                      </button>
                      <button
                        type="button"
                        disabled={generateReplyMutation.isPending}
                        onClick={() => generateReplyMutation.mutate({ id, tone: "decline" })}
                        className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ThumbsDown className="size-3.5" />
                        <span>Decline</span>
                      </button>
                      <button
                        type="button"
                        disabled={generateReplyMutation.isPending}
                        onClick={() => generateReplyMutation.mutate({ id, tone: "info" })}
                        className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Info className="size-3.5" />
                        <span>Ask Details</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Or type custom instructions (e.g. reschedule to Friday)..."
                        value={aiCustomPrompt}
                        onChange={(e) => setAiCustomPrompt(e.target.value)}
                        disabled={generateReplyMutation.isPending}
                        className="border-outline-variant bg-surface-container-low text-on-surface focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/40 flex-1 rounded-lg border px-3 py-1.5 text-xs transition focus:ring-1 focus:outline-none disabled:opacity-50"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && aiCustomPrompt.trim()) {
                            e.preventDefault();
                            generateReplyMutation.mutate({ id, tone: "custom", prompt: aiCustomPrompt });
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={!aiCustomPrompt.trim() || generateReplyMutation.isPending}
                        loading={generateReplyMutation.isPending && generateReplyMutation.variables?.tone === "custom"}
                        onClick={() => generateReplyMutation.mutate({ id, tone: "custom", prompt: aiCustomPrompt })}
                        className="h-8.5 rounded-lg text-[11px] font-semibold px-3 shadow-sm shrink-0 animate-fade-in"
                      >
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div className="border-outline-variant/60 focus-within:ring-primary focus-within:border-primary bg-surface-container-low overflow-hidden rounded-2xl border transition focus-within:ring-1 relative">
                    <textarea
                      required
                      rows={6}
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      placeholder={generateReplyMutation.isPending ? "AI is writing a reply for you..." : `Reply to ${displayName}...`}
                      disabled={generateReplyMutation.isPending}
                      className="text-on-surface placeholder:text-on-surface-variant/45 min-h-36 w-full resize-y bg-transparent px-4 py-3 text-sm leading-relaxed focus:outline-none disabled:opacity-50"
                    />
                    {generateReplyMutation.isPending && (
                      <div className="absolute inset-0 bg-surface-container-low/60 flex items-center justify-center backdrop-blur-xs rounded-2xl animate-fade-in">
                        <div className="flex items-center gap-2 bg-surface-container border border-outline-variant/35 rounded-xl px-4 py-2.5 shadow-md">
                          <RefreshCw className="size-3.5 text-primary animate-spin" />
                          <span className="text-xs font-semibold text-primary">AI is drafting a reply...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={replyMutation.isPending}
                      className="h-10 w-full rounded-xl text-xs font-semibold sm:w-auto px-4 shadow-sm"
                    >
                      <Send className="mr-1.5 size-3.5" /> Send Reply
                    </Button>
                  </div>
                </form>
              )}
            </div>
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
