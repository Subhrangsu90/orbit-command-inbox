"use client";

import { useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
  X,
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { useWorkspacePreferences } from "~/app/_components/workspacePreferencesContext";
import { api } from "~/trpc/react";
import { Button } from "~/app/_components/ui/button";
import { EmailListItem } from "~/app/_components/email/EmailListItem";
import { ComposeEmailDialog } from "~/app/_components/email/ComposeEmailDialog";
import { LabelsDialog } from "~/app/_components/email/LabelsDialog";
import { CalendarAgendaSidebar } from "~/app/_components/calendar/CalendarAgendaSidebar";
import { mailboxDisplayName } from "~/app/_utils/emailPresentation";
import { useMailStore } from "./mailStore";

const CATEGORIES = [
  { id: "primary", name: "Primary", icon: Inbox },
  { id: "promotions", name: "Promotions", icon: Tag },
  { id: "social", name: "Social", icon: Users },
  { id: "updates", name: "Updates", icon: Info },
  { id: "forums", name: "Forums", icon: Megaphone },
] as const;

export default function MailPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-on-surface-variant animate-pulse text-xs font-semibold">
              Loading workspace...
            </p>
          </div>
        </div>
      }
    >
      <MailboxHome />
    </Suspense>
  );
}

function MailboxHome() {
  const { preferences } = useWorkspacePreferences();
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedMailbox = searchParams.get("mailbox") ?? "inbox";
  const mailbox = ["inbox", "starred", "sent", "drafts"].includes(
    requestedMailbox,
  )
    ? (requestedMailbox as "inbox" | "starred" | "sent" | "drafts")
    : "inbox";
  const { data: connections, isLoading: isLoadingConnections } =
    api.corsair.getConnections.useQuery();
  const isConnected = !!connections?.gmail;

  const {
    category,
    currentPageToken,
    pageTokenHistory,
    searchQuery,
    selectedIndex,
    selectedEmailId,
    selectedMessageIds,
    isComposeOpen,
    isLabelsOpen,
    isHelpOpen,
    editingDraftId,
    newLabelName,
    isAdvancedSearchOpen,
    filterFrom,
    filterTo,
    filterSubject,
    filterHasAttachment,
    filterIsStarred,
    filterIsUnread,
    filterAfter,
    filterBefore,
    composeTo,
    composeSubject,
    composeBody,
    setCategory,
    setCurrentPageToken,
    setPageTokenHistory,
    setSearchQuery,
    setSelectedIndex,
    setSelectedEmailId,
    setSelectedMessageIds,
    setIsComposeOpen,
    setIsLabelsOpen,
    setIsHelpOpen,
    setEditingDraftId,
    setNewLabelName,
    setIsAdvancedSearchOpen,
    setFilterFrom,
    setFilterTo,
    setFilterSubject,
    setFilterHasAttachment,
    setFilterIsStarred,
    setFilterIsUnread,
    setFilterAfter,
    setFilterBefore,
    setComposeTo,
    setComposeSubject,
    setComposeBody,
  } = useMailStore();
  const searchSource = searchQuery.trim()
    ? searchQuery.includes(":") || mailbox === "drafts"
      ? ("gmail" as const)
      : ("semantic" as const)
    : ("gmail" as const);

  function compileSearchQuery() {
    const parts: string[] = [];
    if (filterFrom.trim()) parts.push(`from:${filterFrom.trim()}`);
    if (filterTo.trim()) parts.push(`to:${filterTo.trim()}`);
    if (filterSubject.trim()) parts.push(`subject:${filterSubject.trim()}`);
    if (filterHasAttachment) parts.push("has:attachment");
    if (filterIsStarred) parts.push("is:starred");
    if (filterIsUnread) parts.push("is:unread");
    if (filterAfter) {
      parts.push(`after:${filterAfter.replace(/-/g, "/")}`);
    }
    if (filterBefore) {
      parts.push(`before:${filterBefore.replace(/-/g, "/")}`);
    }
    return parts.join(" ");
  }

  // Reset pagination on category or search query change
  useEffect(() => {
    setCurrentPageToken(undefined);
    setPageTokenHistory([undefined]);
    setSelectedIndex(0);
    setSelectedEmailId(null);
    setSelectedMessageIds([]);
  }, [category, searchQuery, mailbox]);

  // Emails query
  const emailsQuery = api.emails.list.useQuery(
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
  const emailsData = emailsQuery.data;
  const isLoadingEmails = emailsQuery.isLoading;

  const draftsQuery = api.emails.listDrafts.useQuery(
    {
      q: searchQuery || undefined,
      pageToken: currentPageToken,
      maxResults: 15,
    },
    { enabled: isConnected && mailbox === "drafts" },
  );
  const draftsData = draftsQuery.data;
  const isLoadingDrafts = draftsQuery.isLoading;

  const { data: localSearchData, isLoading: isLoadingLocalSearch } =
    api.emails.searchLocal.useQuery(
      {
        entity: "messages",
        filters: [],
        limit: 50,
        offset: 0,
      },
      {
        enabled: false,
      },
    );

  const { data: semanticSearchData, isLoading: isLoadingSemanticSearch } =
    api.emails.searchSemantic.useQuery(
      {
        q: searchQuery.trim(),
        limit: 50,
      },
      {
        enabled:
          isConnected &&
          mailbox !== "drafts" &&
          searchSource === "semantic" &&
          searchQuery.trim().length > 0,
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

  const emails = (() => {
    const source =
      mailbox === "drafts"
        ? (draftsData?.drafts ?? [])
        : searchSource === "semantic"
          ? (semanticSearchData?.messages ?? [])
          : (emailsData?.messages ?? []);
    const seen = new Set<string>();

    return source.filter((email: any) => {
      if (!email?.id || seen.has(email.id)) return false;
      seen.add(email.id);
      return true;
    });
  })();
  const isLoadingMailbox =
    mailbox === "drafts"
      ? isLoadingDrafts
      : searchSource === "semantic"
        ? isLoadingSemanticSearch
        : isLoadingEmails;
  const isGmailConnected = isConnected && !emailsData?.notConnected;
  const labelsQuery = api.emails.listLabels.useQuery(undefined, {
    enabled: isGmailConnected,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  const labelsData = labelsQuery.data;
  const refetchLabels = labelsQuery.refetch;

  // SSE Webhook real-time notification integration
  useEffect(() => {
    if (!isConnected) return;

    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;

    function connect() {
      eventSource = new EventSource("/api/sse");

      eventSource.onmessage = (event) => {
        if (event.data === "connected") {
          console.log("[SSE] Connected to notifications stream.");
        }
      };

      eventSource.addEventListener("email_received", () => {
        console.info("[SSE] Realtime email notification received");
        void emailsQuery.refetch();
        void draftsQuery.refetch();

        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("New Email Received", {
              body: "Check your inbox for new messages.",
            });
          } else if (Notification.permission !== "denied") {
            void Notification.requestPermission();
          }
        }
      });

      eventSource.onerror = (err) => {
        console.warn("[SSE] Connection lost, retrying in 5s...", err);
        eventSource?.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(retryTimeout);
    };
  }, [isConnected, emailsQuery.refetch, draftsQuery.refetch]);

  function refetchMailbox() {
    return mailbox === "drafts" ? draftsQuery.refetch() : emailsQuery.refetch();
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
      void draftsQuery.refetch();
    },
  });

  const updateDraftMutation = api.emails.updateDraft.useMutation({
    onSuccess: () => {
      setIsComposeOpen(false);
      resetCompose();
      void draftsQuery.refetch();
    },
  });

  const deleteDraftMutation = api.emails.deleteDraft.useMutation({
    onSuccess: () => {
      setSelectedEmailId(null);
      void draftsQuery.refetch();
    },
  });

  const sendDraftMutation = api.emails.sendDraft.useMutation({
    onSuccess: () => {
      setSelectedEmailId(null);
      void draftsQuery.refetch();
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

  function getEmailDetailHref(email: any) {
    const params = new URLSearchParams({ mailbox });
    const draftId = getDraftId(email);
    if (mailbox === "drafts" && draftId) params.set("draftId", draftId);
    return `/mail/${encodeURIComponent(email.id)}?${params.toString()}`;
  }

  function openEmailDetail(email: any) {
    setSelectedEmailId(email.id ?? null);
    router.push(getEmailDetailHref(email));
  }

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
    if (!isGmailConnected || isComposeOpen) return;

    function matchShortcut(e: KeyboardEvent, shortcutStr: string): boolean {
      if (!shortcutStr) return false;
      const parts = shortcutStr.toLowerCase().split("+");
      const hasCtrl = parts.includes("ctrl");
      const hasAlt = parts.includes("alt");
      const hasShift = parts.includes("shift");

      const mainKey = parts.find((p) => !["ctrl", "alt", "shift"].includes(p));
      if (!mainKey) return false;

      const eventCtrl = e.ctrlKey || e.metaKey;
      const eventAlt = e.altKey;
      const eventShift = e.shiftKey;

      if (eventCtrl !== hasCtrl) return false;
      if (eventAlt !== hasAlt) return false;
      if (eventShift !== hasShift) return false;

      const eventKey = e.key.toLowerCase();
      if (mainKey === "enter" && eventKey === "enter") return true;
      if (mainKey === "escape" && eventKey === "escape") return true;
      if (mainKey === "space" && eventKey === " ") return true;
      if (mainKey === "arrowdown" && eventKey === "arrowdown") return true;
      if (mainKey === "arrowup" && eventKey === "arrowup") return true;
      if (mainKey === "arrowleft" && eventKey === "arrowleft") return true;
      if (mainKey === "arrowright" && eventKey === "arrowright") return true;

      return eventKey === mainKey;
    }

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

      // If help overlay is open, Escape closes it
      if (isHelpOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsHelpOpen(false);
        }
        return;
      }

      if (matchShortcut(e, preferences.shortcutNextEmail || "j")) {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, emails.length - 1));
      } else if (matchShortcut(e, preferences.shortcutPrevEmail || "k")) {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.max(prev - 0.5, 0) ? Math.max(prev - 1, 0) : 0,
        );
      } else if (matchShortcut(e, preferences.shortcutReadEmail || "o")) {
        e.preventDefault();
        if (emails[selectedIndex]) {
          openEmailDetail(emails[selectedIndex]);
        }
      } else if (matchShortcut(e, preferences.shortcutTrashEmail || "e")) {
        e.preventDefault();
        if (emails[selectedIndex]?.id) {
          const draftId = getDraftId(emails[selectedIndex]);
          if (mailbox === "drafts" && draftId) {
            deleteDraftMutation.mutate({ id: draftId });
          } else {
            trashMutation.mutate({ id: emails[selectedIndex].id });
          }
        }
      } else if (matchShortcut(e, preferences.shortcutStarEmail || "s")) {
        e.preventDefault();
        if (emails[selectedIndex]?.id) {
          const emailItem = emails[selectedIndex];
          const isStarred = emailItem.labelIds?.includes("STARRED");
          modifyLabelsMutation.mutate({
            id: emailItem.id,
            addLabelIds: isStarred ? [] : ["STARRED"],
            removeLabelIds: isStarred ? ["STARRED"] : [],
          });
        }
      } else if (matchShortcut(e, preferences.shortcutComposeEmail || "c")) {
        e.preventDefault();
        setIsComposeOpen(true);
      } else if (matchShortcut(e, preferences.shortcutRefreshEmail || "r")) {
        e.preventDefault();
        void refetchMailbox();
      } else if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
      } else if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[placeholder*="Search"]',
        ) as HTMLInputElement | null;
        searchInput?.focus();
        searchInput?.select();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isGmailConnected,
    isComposeOpen,
    isHelpOpen,
    emails,
    selectedIndex,
    preferences.shortcutNextEmail,
    preferences.shortcutPrevEmail,
    preferences.shortcutReadEmail,
    preferences.shortcutTrashEmail,
    preferences.shortcutStarEmail,
    preferences.shortcutComposeEmail,
    preferences.shortcutRefreshEmail,
  ]);

  // Adjust selection when emails change
  useEffect(() => {
    if (selectedIndex >= emails.length && emails.length > 0) {
      setSelectedIndex(emails.length - 1);
    }
  }, [emails, selectedIndex]);

  const HeaderIcon = mailbox === "starred" ? Star : Inbox;

  return (
    <WorkspaceLayout wide>
      <div
        className={`mx-auto max-w-[1600px] ${
          isGmailConnected
            ? "grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]"
            : "space-y-6"
        }`}
      >
        <div
          className={
            isGmailConnected
              ? "min-w-0 space-y-6 xl:mx-auto xl:w-full xl:max-w-[58rem]"
              : "space-y-6"
          }
        >
          {/* Top Header & Global Actions */}
          <div className="border-outline-variant flex flex-col justify-between gap-4 border-b pb-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary border-primary/20 animate-fade-in flex size-10 items-center justify-center rounded-xl border shadow-sm">
                <HeaderIcon className="text-primary size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-on-surface font-serif text-xl font-bold tracking-tight capitalize">
                  {mailboxDisplayName(mailbox)}
                </h2>
                <p className="text-on-surface-variant/85 text-xs">
                  {mailbox === "inbox"
                    ? "Track priority conversations, sync state, and organize your inbox."
                    : mailbox === "starred"
                      ? "Access your flagged and important conversations."
                      : mailbox === "sent"
                        ? "View your outgoing messages and delivery records."
                        : "View and edit your draft communications."}
                </p>
              </div>
            </div>

            {/* Mobile Sub-Navigation (Mailbox Selector) */}
            <div className="scrollbar-none flex w-full items-center gap-2 overflow-x-auto pb-1 md:hidden">
              {[
                { id: "inbox", label: "Inbox", icon: "inbox" },
                { id: "starred", label: "Starred", icon: "star" },
                { id: "sent", label: "Sent", icon: "send" },
                { id: "drafts", label: "Drafts", icon: "drafts" },
              ].map((item) => {
                const isActive = mailbox === item.id;
                return (
                  <Link
                    key={item.id}
                    href={`/mail?mailbox=${item.id}`}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px] leading-none">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {isGmailConnected && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Pagination controls */}
                <div className="bg-surface-container border-outline-variant flex items-center gap-1 rounded-lg border p-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasPrevPage}
                    onClick={handlePrevPage}
                    className="hover:bg-surface-container-high h-7 w-7 rounded-md border-transparent !p-0 disabled:opacity-40"
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <span className="text-on-surface-variant/80 px-1 text-[10px] font-bold">
                    Page {pageTokenHistory.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage}
                    onClick={handleNextPage}
                    className="hover:bg-surface-container-high h-7 w-7 rounded-md border-transparent !p-0 disabled:opacity-40"
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>

                {/* Labels Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLabelsOpen(true)}
                  className="border-outline-variant hover:bg-surface-container-low h-8 rounded-lg border px-3 text-xs"
                >
                  <Tag className="mr-1.5 size-3.5" /> Labels
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
            <div className="border-outline-variant bg-surface-container-lowest mx-auto flex max-w-[28rem] flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
              <div className="relative mb-4">
                <Mail className="text-on-surface-variant size-12 opacity-60" />
                <span className="bg-surface-container-lowest absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full">
                  <AlertCircle className="text-warning size-4" />
                </span>
              </div>
              <p className="text-on-surface text-sm font-semibold">
                Gmail disconnected
              </p>
              <p className="text-on-surface-variant mt-1 max-w-[24rem] text-xs">
                Please go to settings page to connect your Gmail account to
                manage your inbox.
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
              <div className="flex flex-col gap-2">
                <div className="relative flex-1">
                  <Search className="text-on-surface-variant absolute top-1/2 left-3.5 size-4 -translate-y-1/2 opacity-60" />
                  <input
                    type="text"
                    placeholder="Search mail (uses semantic search automatically)…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-primary focus:border-primary w-full rounded-xl border py-2.5 pr-24 pl-10 text-sm transition focus:ring-1 focus:outline-none"
                  />
                  {/* Inline controls on the right side of search input */}
                  {mailbox !== "drafts" && (
                    <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAdvancedSearchOpen((prev) => !prev)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase transition ${
                          isAdvancedSearchOpen
                            ? "bg-primary/15 text-primary"
                            : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                        }`}
                        title="Advanced Filters"
                      >
                        Filters
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Filters Panel */}
              {isAdvancedSearchOpen && searchSource === "gmail" && (
                <div className="bg-surface-container-low border-outline-variant animate-fade-in grid grid-cols-1 gap-4 rounded-2xl border p-4 shadow-lg md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-on-surface-variant text-[10px] font-bold tracking-wide uppercase">
                      From
                    </label>
                    <input
                      type="text"
                      value={filterFrom}
                      onChange={(e) => setFilterFrom(e.target.value)}
                      placeholder="sender@example.com"
                      className="bg-surface-container-lowest text-on-surface border-outline-variant focus:ring-primary w-full rounded-xl border px-3 py-1.5 text-xs outline-none focus:ring-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-on-surface-variant text-[10px] font-bold tracking-wide uppercase">
                      To
                    </label>
                    <input
                      type="text"
                      value={filterTo}
                      onChange={(e) => setFilterTo(e.target.value)}
                      placeholder="recipient@example.com"
                      className="bg-surface-container-lowest text-on-surface border-outline-variant focus:ring-primary w-full rounded-xl border px-3 py-1.5 text-xs outline-none focus:ring-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-on-surface-variant text-[10px] font-bold tracking-wide uppercase">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      placeholder="Subject keywords"
                      className="bg-surface-container-lowest text-on-surface border-outline-variant focus:ring-primary w-full rounded-xl border px-3 py-1.5 text-xs outline-none focus:ring-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-on-surface-variant text-[10px] font-bold tracking-wide uppercase">
                      Date Range
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={filterAfter}
                        onChange={(e) => setFilterAfter(e.target.value)}
                        className="bg-surface-container-lowest text-on-surface border-outline-variant focus:ring-primary w-full rounded-xl border px-2 py-1 text-[10px] outline-none focus:ring-1"
                      />
                      <span className="text-on-surface-variant text-[10px]">
                        to
                      </span>
                      <input
                        type="date"
                        value={filterBefore}
                        onChange={(e) => setFilterBefore(e.target.value)}
                        className="bg-surface-container-lowest text-on-surface border-outline-variant focus:ring-primary w-full rounded-xl border px-2 py-1 text-[10px] outline-none focus:ring-1"
                      />
                    </div>
                  </div>

                  <div className="border-outline-variant/60 flex flex-wrap items-center justify-between gap-4 border-t pt-2 md:col-span-2 lg:col-span-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="text-on-surface flex cursor-pointer items-center gap-2 text-xs select-none">
                        <input
                          type="checkbox"
                          checked={filterHasAttachment}
                          onChange={(e) =>
                            setFilterHasAttachment(e.target.checked)
                          }
                          className="border-outline-variant text-primary focus:ring-primary/45 rounded"
                        />
                        Has Attachment
                      </label>
                      <label className="text-on-surface flex cursor-pointer items-center gap-2 text-xs select-none">
                        <input
                          type="checkbox"
                          checked={filterIsStarred}
                          onChange={(e) => setFilterIsStarred(e.target.checked)}
                          className="border-outline-variant text-primary focus:ring-primary/45 rounded"
                        />
                        Starred
                      </label>
                      <label className="text-on-surface flex cursor-pointer items-center gap-2 text-xs select-none">
                        <input
                          type="checkbox"
                          checked={filterIsUnread}
                          onChange={(e) => setFilterIsUnread(e.target.checked)}
                          className="border-outline-variant text-primary focus:ring-primary/45 rounded"
                        />
                        Unread
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilterFrom("");
                          setFilterTo("");
                          setFilterSubject("");
                          setFilterHasAttachment(false);
                          setFilterIsStarred(false);
                          setFilterIsUnread(false);
                          setFilterAfter("");
                          setFilterBefore("");
                          setSearchQuery("");
                        }}
                        className="text-2xs h-8 rounded-lg font-semibold"
                      >
                        Clear
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const q = compileSearchQuery();
                          setSearchQuery(q);
                          setIsAdvancedSearchOpen(false);
                        }}
                        className="text-2xs bg-primary text-on-primary h-8 rounded-lg font-semibold"
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </div>
              )}

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

              {/* Offline / Cache Banner */}
              {emailsData?.fromCache && (
                <div className="animate-fade-in flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <Database className="size-3.5 shrink-0" />
                  <span>
                    <strong>Showing cached data.</strong> Google API is
                    currently unreachable — displaying your last synced emails.
                    Changes may not reflect.
                  </span>
                  <button
                    type="button"
                    onClick={() => void emailsQuery.refetch()}
                    className="ml-auto flex shrink-0 items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-300"
                  >
                    <RefreshCw className="size-3" />
                    Retry
                  </button>
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
                          : emails.map((email: any) => email.id),
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

              {/* Main Email List */}
              <div className="space-y-2">
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
                    {emails.map((email: any, idx: number) => (
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
                          openEmailDetail(email);
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
                          if (draftId)
                            deleteDraftMutation.mutate({ id: draftId });
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isGmailConnected && (
          <CalendarAgendaSidebar
            isConnected={Boolean(connections?.googlecalendar)}
            className="w-full"
          />
        )}
      </div>

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

      {/* Keyboard Shortcuts Help Dialog */}
      {isHelpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsHelpOpen(false)}
        >
          <div
            className="bg-surface-container border-outline-variant relative flex max-h-[80vh] w-full max-w-[28rem] flex-col overflow-hidden rounded-3xl border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-outline-variant/60 flex items-center justify-between border-b pb-3">
              <h3 className="text-on-surface flex items-center gap-2 font-sans text-lg font-bold">
                <Keyboard className="size-5" /> Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="hover:bg-surface-container-high text-on-surface-variant rounded-full p-1 transition"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="text-on-surface mt-4 space-y-3 text-xs overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <span>Navigate Down</span>
                <kbd className="bg-surface-container-high border-outline-variant rounded border px-1.5 py-0.5 font-semibold shadow-xs">
                  J
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Navigate Up</span>
                <kbd className="bg-surface-container-high border-outline-variant rounded border px-1.5 py-0.5 font-semibold shadow-xs">
                  K
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Open selected email</span>
                <kbd className="bg-surface-container-high border-outline-variant rounded border px-1.5 py-0.5 font-semibold shadow-xs">
                  Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Close email detail view / modal</span>
                <kbd className="bg-surface-container-high border-outline-variant rounded border px-1.5 py-0.5 font-semibold shadow-xs">
                  Escape
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Trash selected email / delete draft</span>
                <kbd className="bg-surface-container-high border-outline-variant rounded border px-1.5 py-0.5 font-semibold shadow-xs">
                  E
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Star / Unstar selected email</span>
                <kbd className="bg-surface-container-high border-outline-variant rounded border px-1.5 py-0.5 font-semibold shadow-xs">
                  S
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Compose new email</span>
                <kbd className="bg-surface-container-high border-outline-variant rounded border px-1.5 py-0.5 font-semibold shadow-xs">
                  C
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Refresh mailbox</span>
                <kbd className="bg-surface-container-high border-outline-variant rounded border px-1.5 py-0.5 font-semibold shadow-xs">
                  R
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Focus search bar</span>
                <kbd className="bg-surface-container-high border-outline-variant rounded border px-1.5 py-0.5 font-semibold shadow-xs">
                  /
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Toggle this help menu</span>
                <kbd className="bg-surface-container-high border-outline-variant rounded border px-1.5 py-0.5 font-semibold shadow-xs">
                  ?
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Floating Compose Button */}
      {isGmailConnected && (
        <button
          onClick={() => {
            resetCompose();
            setIsComposeOpen(true);
          }}
          className="bg-primary text-on-primary hover:bg-primary-container border-primary/20 fixed right-4 bottom-24 z-50 flex h-14 w-14 items-center justify-center rounded-full border shadow-lg transition-all hover:scale-105 active:scale-95 md:right-6 md:bottom-6"
          title="Compose Email"
        >
          <Plus className="size-6" />
        </button>
      )}
    </WorkspaceLayout>
  );
}
