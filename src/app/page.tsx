"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Search,
  Trash2,
  Keyboard,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Tag,
  Users,
  Megaphone,
  Info,
  Inbox,
  Square,
  CheckSquare2,
  Star,
  Database,
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { api } from "~/trpc/react";
import { Button } from "~/app/_components/ui/button";
import { EmailListItem } from "~/app/_components/email/EmailListItem";
import { EmailDetailDialog } from "~/app/_components/email/EmailDetailDialog";
import { ComposeEmailDialog } from "~/app/_components/email/ComposeEmailDialog";
import { LabelsDialog } from "~/app/_components/email/LabelsDialog";
import { CalendarAgendaSidebar } from "~/app/_components/calendar/CalendarAgendaSidebar";
import { mailboxDisplayName } from "~/app/_utils/emailPresentation";

const CATEGORIES = [
  { id: "primary", name: "Primary", icon: Inbox },
  { id: "promotions", name: "Promotions", icon: Tag },
  { id: "social", name: "Social", icon: Users },
  { id: "updates", name: "Updates", icon: Info },
  { id: "forums", name: "Forums", icon: Megaphone },
] as const;

export default function Home() {
  const searchParams = useSearchParams();
  const requestedMailbox = searchParams.get("mailbox") ?? "inbox";
  const mailbox = ["inbox", "starred", "sent", "drafts"].includes(
    requestedMailbox,
  )
    ? (requestedMailbox as "inbox" | "starred" | "sent" | "drafts")
    : "inbox";
  const { data: connections, isLoading: isLoadingConnections } =
    api.corsair.getConnections.useQuery();
  const isConnected = !!connections?.gmail;

  // Tabs and pagination state
  const [category, setCategory] = useState<
    "primary" | "promotions" | "social" | "updates" | "forums"
  >("primary");
  const [currentPageToken, setCurrentPageToken] = useState<string | undefined>(
    undefined,
  );
  const [pageTokenHistory, setPageTokenHistory] = useState<
    (string | undefined)[]
  >([undefined]);

  // Search and selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const manuallyMarkedUnreadRef = useRef<Set<string>>(new Set());
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [searchSource, setSearchSource] = useState<"gmail" | "local">("gmail");
  const [localSearchField, setLocalSearchField] = useState<
    "subject" | "body" | "from" | "to" | "snippet"
  >("subject");

  // Compose form state
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  // Reset pagination on category or search query change
  useEffect(() => {
    setCurrentPageToken(undefined);
    setPageTokenHistory([undefined]);
    setSelectedIndex(0);
    setSelectedEmailId(null);
    setSelectedMessageIds([]);
    manuallyMarkedUnreadRef.current.clear();
  }, [category, searchQuery, mailbox]);

  // Emails query
  const {
    data: emailsData,
    isLoading: isLoadingEmails,
    refetch,
  } = api.emails.list.useQuery(
    {
      q: searchQuery || undefined,
      category: mailbox === "inbox" ? category : undefined,
      mailbox,
      pageToken: currentPageToken,
      maxResults: 15,
    },
    {
      enabled: isConnected && mailbox !== "drafts" && searchSource === "gmail",
    },
  );

  const {
    data: draftsData,
    isLoading: isLoadingDrafts,
    refetch: refetchDrafts,
  } = api.emails.listDrafts.useQuery(
    {
      q: searchQuery || undefined,
      pageToken: currentPageToken,
      maxResults: 15,
    },
    { enabled: isConnected && mailbox === "drafts" },
  );

  const { data: localSearchData, isLoading: isLoadingLocalSearch } =
    api.emails.searchLocal.useQuery(
      {
        entity: "messages",
        filters: searchQuery.trim()
          ? [
              {
                field: localSearchField,
                operator: "contains" as const,
                value: searchQuery.trim(),
              },
            ]
          : [],
        limit: 50,
        offset: 0,
      },
      {
        enabled:
          isConnected && mailbox !== "drafts" && searchSource === "local",
      },
    );

  const localEmails = (localSearchData?.rows ?? []).map((row) => {
    const data = row.data;
    const sender = String(data.from ?? "");
    const recipient = String(data.to ?? "");
    return {
      id: String(data.id ?? row.entityId),
      threadId: String(data.threadId ?? ""),
      snippet: String(data.snippet ?? data.body ?? ""),
      labelIds: Array.isArray(data.labelIds) ? data.labelIds.map(String) : [],
      internalDate: String(data.internalDate ?? row.updatedAt ?? ""),
      subject: String(data.subject ?? "(No subject)"),
      from: sender,
      senderName: sender || "Unknown sender",
      senderEmail: sender.match(/<([^>]+)>/)?.[1] ?? sender,
      to: recipient,
      recipientName: recipient || "Unknown recipient",
      recipientEmail: recipient.match(/<([^>]+)>/)?.[1] ?? recipient,
      date: String(data.internalDate ?? row.updatedAt ?? ""),
      isUnread: Array.isArray(data.labelIds)
        ? data.labelIds.includes("UNREAD")
        : false,
    };
  });

  const emails =
    mailbox === "drafts"
      ? (draftsData?.drafts ?? [])
      : searchSource === "local"
        ? localEmails
        : (emailsData?.messages ?? []);
  const isLoadingMailbox =
    mailbox === "drafts"
      ? isLoadingDrafts
      : searchSource === "local"
        ? isLoadingLocalSearch
        : isLoadingEmails;
  const isGmailConnected = isConnected && !emailsData?.notConnected;
  const selectedEmail = emails.find((email) => email.id === selectedEmailId);

  const { data: emailDetail, isLoading: isLoadingEmailDetail } =
    api.emails.get.useQuery(
      { id: selectedEmailId ?? "" },
      {
        enabled:
          Boolean(selectedEmailId) && isGmailConnected && mailbox !== "drafts",
      },
    );

  const { data: labelsData, refetch: refetchLabels } =
    api.emails.listLabels.useQuery(undefined, {
      enabled: isGmailConnected,
    });

  const { data: threadDetail } = api.emails.getThread.useQuery(
    {
      id: selectedEmail?.threadId ?? "",
      format: "full",
    },
    {
      enabled:
        mailbox !== "drafts" && Boolean(selectedEmail?.threadId) && isConnected,
    },
  );

  function refetchMailbox() {
    return mailbox === "drafts" ? refetchDrafts() : refetch();
  }

  // Mutations
  const sendMutation = api.emails.send.useMutation({
    onSuccess: () => {
      setIsComposeOpen(false);
      resetCompose();
      void refetchMailbox();
    },
  });

  const trashMutation = api.emails.trash.useMutation({
    onSuccess: () => {
      setSelectedEmailId(null);
      void refetchMailbox();
    },
  });

  const modifyLabelsMutation = api.emails.modifyLabels.useMutation({
    onSuccess: () => void refetchMailbox(),
  });

  const replyMutation = api.emails.reply.useMutation({
    onSuccess: () => void refetchMailbox(),
  });

  const createDraftMutation = api.emails.createDraft.useMutation({
    onSuccess: () => {
      setIsComposeOpen(false);
      resetCompose();
      void refetchDrafts();
    },
  });

  const updateDraftMutation = api.emails.updateDraft.useMutation({
    onSuccess: () => {
      setIsComposeOpen(false);
      resetCompose();
      void refetchDrafts();
    },
  });

  const deleteDraftMutation = api.emails.deleteDraft.useMutation({
    onSuccess: () => {
      setSelectedEmailId(null);
      void refetchDrafts();
    },
  });

  const sendDraftMutation = api.emails.sendDraft.useMutation({
    onSuccess: () => {
      setSelectedEmailId(null);
      void refetchDrafts();
    },
  });

  const batchModifyMutation = api.emails.batchModifyMessages.useMutation({
    onSuccess: () => {
      setSelectedMessageIds([]);
      void refetchMailbox();
    },
  });

  const createLabelMutation = api.emails.createLabel.useMutation({
    onSuccess: () => {
      setNewLabelName("");
      void refetchLabels();
    },
  });

  const deleteLabelMutation = api.emails.deleteLabel.useMutation({
    onSuccess: () => void refetchLabels(),
  });

  function resetCompose() {
    setEditingDraftId(null);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
  }

  function getDraftId(value: unknown) {
    if (
      typeof value === "object" &&
      value !== null &&
      "draftId" in value &&
      typeof value.draftId === "string"
    ) {
      return value.draftId;
    }
    return null;
  }

  function getMessageBody(value: unknown, fallback: string) {
    if (
      typeof value === "object" &&
      value !== null &&
      "body" in value &&
      typeof value.body === "string"
    ) {
      return value.body;
    }
    return fallback;
  }

  function openDraftEditor(draft: (typeof emails)[number]) {
    setEditingDraftId(getDraftId(draft));
    setComposeTo(draft.recipientEmail || draft.to);
    setComposeSubject(draft.subject === "(No subject)" ? "" : draft.subject);
    setComposeBody(
      "body" in draft && typeof draft.body === "string"
        ? draft.body
        : draft.snippet,
    );
    setIsComposeOpen(true);
  }

  // Auto-mark as read when opening
  useEffect(() => {
    if (!emailDetail?.isUnread || modifyLabelsMutation.isPending) return;
    if (manuallyMarkedUnreadRef.current.has(emailDetail.id)) return;
    modifyLabelsMutation.mutate({
      id: emailDetail.id,
      removeLabelIds: ["UNREAD"],
    });
  }, [emailDetail?.id, emailDetail?.isUnread]);

  // Pagination
  const nextPageToken =
    mailbox === "drafts"
      ? draftsData?.nextPageToken
      : emailsData?.nextPageToken;
  const hasNextPage = !!nextPageToken && searchSource === "gmail";
  const hasPrevPage = pageTokenHistory.length > 1;

  const handleNextPage = () => {
    if (nextPageToken) {
      const nextToken = nextPageToken;
      setPageTokenHistory((prev) => [...prev, nextToken]);
      setCurrentPageToken(nextToken);
      setSelectedIndex(0);
      setSelectedEmailId(null);
    }
  };

  const handlePrevPage = () => {
    if (pageTokenHistory.length > 1) {
      const newHistory = [...pageTokenHistory];
      newHistory.pop();
      const prevToken = newHistory[newHistory.length - 1];
      setPageTokenHistory(newHistory);
      setCurrentPageToken(prevToken);
      setSelectedIndex(0);
      setSelectedEmailId(null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isGmailConnected || isComposeOpen || selectedEmailId) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        if (e.key === "Escape") {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "j":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, emails.length - 1));
          break;
        case "k":
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.max(prev - 0.5, 0) ? Math.max(prev - 1, 0) : 0,
          );
          break;
        case "enter":
          e.preventDefault();
          if (emails[selectedIndex]) {
            setSelectedEmailId(emails[selectedIndex].id ?? null);
          }
          break;
        case "e":
          e.preventDefault();
          if (emails[selectedIndex]?.id) {
            const draftId = getDraftId(emails[selectedIndex]);
            if (mailbox === "drafts" && draftId) {
              deleteDraftMutation.mutate({ id: draftId });
            } else {
              trashMutation.mutate({ id: emails[selectedIndex].id });
            }
          }
          break;
        case "c":
          e.preventDefault();
          setIsComposeOpen(true);
          break;
        case "r":
          e.preventDefault();
          void refetchMailbox();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGmailConnected, isComposeOpen, selectedEmailId, emails, selectedIndex]);

  // Adjust selection when emails change
  useEffect(() => {
    if (selectedIndex >= emails.length && emails.length > 0) {
      setSelectedIndex(emails.length - 1);
    }
  }, [emails, selectedIndex]);

  return (
    <WorkspaceLayout wide>
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Top Header & Global Actions */}
        <div className="border-outline-variant flex flex-col justify-between gap-4 border-b pb-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <h2 className="text-on-surface font-serif text-3xl font-bold tracking-tight">
              {mailboxDisplayName(mailbox)}
            </h2>
            <p className="text-on-surface-variant flex items-center gap-1.5 text-xs">
              <Keyboard className="size-3.5" /> Navigate with{" "}
              <kbd className="bg-surface-container border-outline-variant rounded border px-1 text-[10px]">
                J
              </kbd>{" "}
              /{" "}
              <kbd className="bg-surface-container border-outline-variant rounded border px-1 text-[10px]">
                K
              </kbd>
              ,{" "}
              <kbd className="bg-surface-container border-outline-variant rounded border px-1 text-[10px]">
                Enter
              </kbd>{" "}
              to read,{" "}
              <kbd className="bg-surface-container border-outline-variant rounded border px-1 text-[10px]">
                E
              </kbd>{" "}
              to trash,{" "}
              <kbd className="bg-surface-container border-outline-variant rounded border px-1 text-[10px]">
                C
              </kbd>{" "}
              to compose.
            </p>
          </div>

          {isGmailConnected && (
            <div className="flex items-center gap-2">
              <div className="mr-2 flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasPrevPage}
                  onClick={handlePrevPage}
                  className="border-outline-variant h-8 w-8 rounded-lg !p-0 disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-on-surface-variant/80 px-1.5 text-[10px] font-bold">
                  Page {pageTokenHistory.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasNextPage}
                  onClick={handleNextPage}
                  className="border-outline-variant h-8 w-8 rounded-lg !p-0 disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetchMailbox()}
                className="border-outline-variant hover:bg-surface-container h-9 rounded-xl border px-3"
              >
                <RefreshCw className="mr-1.5 size-4" /> Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLabelsOpen(true)}
                className="border-outline-variant hover:bg-surface-container h-9 rounded-xl border px-3"
              >
                <Tag className="mr-1.5 size-4" /> Labels
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  resetCompose();
                  setIsComposeOpen(true);
                }}
                className="bg-primary text-on-primary hover:bg-primary-container flex h-9 items-center gap-1.5 rounded-xl px-3 shadow-sm"
              >
                <Plus className="size-4" /> Compose
              </Button>
            </div>
          )}
        </div>

        {/* Connection Status */}
        {isLoadingConnections ? (
          <div className="border-outline-variant bg-surface-container-lowest flex h-48 items-center justify-center rounded-2xl border">
            <div className="flex flex-col items-center gap-2">
              <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
              <p className="text-on-surface-variant text-xs">
                Checking connection...
              </p>
            </div>
          </div>
        ) : !isGmailConnected ? (
          <div className="border-outline-variant bg-surface-container-lowest mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
            <div className="relative mb-4">
              <Mail className="text-on-surface-variant size-12 opacity-60" />
              <span className="bg-surface-container-lowest absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full">
                <AlertCircle className="text-warning size-4" />
              </span>
            </div>
            <p className="text-on-surface text-sm font-semibold">
              Gmail disconnected
            </p>
            <p className="text-on-surface-variant mt-1 max-w-sm text-xs">
              Please go to settings page to connect your Gmail account to manage
              your inbox.
            </p>
            <Link
              href="/settings"
              className="bg-primary text-on-primary hover:bg-primary-container mt-4 inline-flex rounded-xl px-5 py-2.5 text-xs font-semibold shadow-sm transition hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Settings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="text-on-surface-variant absolute top-1/2 left-3.5 size-4 -translate-y-1/2 opacity-60" />
                <input
                  type="text"
                  placeholder="Search mail (press Esc to clear)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-primary focus:border-primary w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm transition focus:ring-1 focus:outline-none"
                />
              </div>
              {mailbox !== "drafts" && (
                <div className="border-outline-variant bg-surface-container-lowest flex items-center rounded-xl border p-1">
                  <button
                    type="button"
                    onClick={() => setSearchSource("gmail")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      searchSource === "gmail"
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant"
                    }`}
                  >
                    Gmail
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchSource("local")}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      searchSource === "local"
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant"
                    }`}
                  >
                    <Database className="size-3" /> Local
                  </button>
                </div>
              )}
              {searchSource === "local" && mailbox !== "drafts" && (
                <select
                  value={localSearchField}
                  onChange={(event) =>
                    setLocalSearchField(
                      event.target.value as typeof localSearchField,
                    )
                  }
                  aria-label="Local search field"
                  className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-xl border px-3 py-2 text-xs"
                >
                  <option value="subject">Subject</option>
                  <option value="body">Body</option>
                  <option value="from">From</option>
                  <option value="to">To</option>
                  <option value="snippet">Snippet</option>
                </select>
              )}
            </div>

            {/* Category Tabs */}
            {mailbox === "inbox" && (
              <div className="border-outline-variant/60 flex gap-1 overflow-x-auto border-b select-none">
                {CATEGORIES.map((cat) => {
                  const isActive = category === cat.id;
                  const CatIcon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                        isActive
                          ? "border-primary text-primary bg-primary/5"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50 border-transparent"
                      }`}
                    >
                      <CatIcon className="size-4" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Batch Actions Bar */}
            {emails.length > 0 && mailbox !== "drafts" && (
              <div className="border-outline-variant bg-surface-container-lowest flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMessageIds(
                      selectedMessageIds.length === emails.length
                        ? []
                        : emails.map((email) => email.id),
                    )
                  }
                  className="text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 text-xs font-semibold"
                >
                  {selectedMessageIds.length === emails.length ? (
                    <CheckSquare2 className="size-4" />
                  ) : (
                    <Square className="size-4" />
                  )}
                  {selectedMessageIds.length
                    ? `${selectedMessageIds.length} selected`
                    : "Select all"}
                </button>

                {selectedMessageIds.length > 0 && (
                  <>
                    <span className="bg-outline-variant h-5 w-px" />
                    <button
                      type="button"
                      onClick={() =>
                        batchModifyMutation.mutate({
                          ids: selectedMessageIds,
                          removeLabelIds: ["UNREAD"],
                        })
                      }
                      className="text-on-surface-variant hover:text-on-surface text-xs font-semibold"
                    >
                      Mark read
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        batchModifyMutation.mutate({
                          ids: selectedMessageIds,
                          addLabelIds: ["UNREAD"],
                        })
                      }
                      className="text-on-surface-variant hover:text-on-surface text-xs font-semibold"
                    >
                      Unread
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        batchModifyMutation.mutate({
                          ids: selectedMessageIds,
                          addLabelIds: ["STARRED"],
                        })
                      }
                      className="text-on-surface-variant hover:text-on-surface flex items-center gap-1 text-xs font-semibold"
                    >
                      <Star className="size-3.5" /> Star
                    </button>
                    <select
                      defaultValue=""
                      aria-label="Apply Gmail label"
                      onChange={(event) => {
                        if (!event.target.value) return;
                        batchModifyMutation.mutate({
                          ids: selectedMessageIds,
                          addLabelIds: [event.target.value],
                        });
                        event.target.value = "";
                      }}
                      className="border-outline-variant bg-surface-container-low text-on-surface rounded-lg border px-2 py-1 text-xs"
                    >
                      <option value="">Apply label...</option>
                      {(labelsData?.labels ?? [])
                        .filter((label) => label.type === "user")
                        .map((label) => (
                          <option key={label.id} value={label.id}>
                            {label.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        batchModifyMutation.mutate({
                          ids: selectedMessageIds,
                          addLabelIds: ["TRASH"],
                        })
                      }
                      className="text-error ml-auto flex items-center gap-1 text-xs font-semibold"
                    >
                      <Trash2 className="size-3.5" /> Trash
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Main Email List + Calendar Sidebar */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              <div className="lg:col-span-9 space-y-2">
                {isLoadingMailbox ? (
                  <div className="border-outline-variant bg-surface-container-lowest flex h-64 items-center justify-center rounded-2xl border">
                    <div className="flex flex-col items-center gap-2">
                      <div className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent" />
                      <p className="text-on-surface-variant text-xs">
                        Loading {mailboxDisplayName(mailbox).toLowerCase()}...
                      </p>
                    </div>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="border-outline-variant bg-surface-container-lowest flex flex-col items-center justify-center rounded-2xl border p-12 text-center">
                    <CheckCircle2 className="mb-2 size-10 text-emerald-500" />
                    <p className="text-on-surface text-sm font-semibold">
                      No {mailboxDisplayName(mailbox).toLowerCase()} messages
                    </p>
                    <p className="text-on-surface-variant mt-0.5 text-xs">
                      No emails found matching your query.
                    </p>
                  </div>
                ) : (
                  <div className="border-outline-variant bg-surface-container-lowest divide-outline-variant/40 divide-y overflow-hidden rounded-2xl border">
                    {emails.map((email, idx) => (
                      <EmailListItem
                        key={email.id}
                        email={email}
                        isSelected={idx === selectedIndex}
                        isOpen={email.id === selectedEmailId}
                        isUnread={email.isUnread}
                        mailbox={mailbox}
                        isChecked={selectedMessageIds.includes(email.id)}
                        onClick={() => {
                          setSelectedIndex(idx);
                          setSelectedEmailId(email.id ?? null);
                        }}
                        onToggleCheck={() =>
                          setSelectedMessageIds((current) =>
                            current.includes(email.id)
                              ? current.filter((id) => id !== email.id)
                              : [...current, email.id],
                          )
                        }
                        onTrash={() => trashMutation.mutate({ id: email.id })}
                        onDeleteDraft={() => {
                          const draftId = getDraftId(email);
                          if (draftId) deleteDraftMutation.mutate({ id: draftId });
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <CalendarAgendaSidebar
                isConnected={Boolean(connections?.googlecalendar)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Email Detail Dialog */}
      {selectedEmailId && selectedEmail && (
        <EmailDetailDialog
          email={selectedEmail}
          emailDetail={emailDetail}
          isLoadingDetail={isLoadingEmailDetail}
          threadMessages={threadDetail?.messages}
          mailbox={mailbox}
          onClose={() => setSelectedEmailId(null)}
          onSelectMessage={(id) => setSelectedEmailId(id)}
          onReply={(input) => replyMutation.mutate(input)}
          isReplying={replyMutation.isPending}
          onTrash={(id) => trashMutation.mutate({ id })}
          onOpenDraftEditor={openDraftEditor}
          onDeleteDraft={(id) => deleteDraftMutation.mutate({ id })}
          onSendDraft={(id) => sendDraftMutation.mutate({ id })}
          isSendingDraft={sendDraftMutation.isPending}
          getDraftId={getDraftId}
          getMessageBody={getMessageBody}
        />
      )}

      {/* Compose Email Dialog */}
      <ComposeEmailDialog
        isOpen={isComposeOpen}
        editingDraftId={editingDraftId}
        composeTo={composeTo}
        composeSubject={composeSubject}
        composeBody={composeBody}
        onComposeTo={setComposeTo}
        onComposeSubject={setComposeSubject}
        onComposeBody={setComposeBody}
        onClose={() => {
          setIsComposeOpen(false);
          resetCompose();
        }}
        onSend={(input) => sendMutation.mutate(input)}
        isSending={sendMutation.isPending}
        onSaveDraft={(input) => createDraftMutation.mutate(input)}
        isSavingDraft={createDraftMutation.isPending}
        onUpdateDraft={(input) => updateDraftMutation.mutate(input)}
        isUpdatingDraft={updateDraftMutation.isPending}
      />

      {/* Labels Dialog */}
      <LabelsDialog
        isOpen={isLabelsOpen}
        labels={labelsData?.labels ?? []}
        newLabelName={newLabelName}
        onNewLabelName={setNewLabelName}
        onClose={() => setIsLabelsOpen(false)}
        onCreateLabel={(name) => createLabelMutation.mutate({ name })}
        isCreating={createLabelMutation.isPending}
        onDeleteLabel={(id) => deleteLabelMutation.mutate({ id })}
        isDeleting={deleteLabelMutation.isPending}
      />
    </WorkspaceLayout>
  );
}
