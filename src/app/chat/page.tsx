"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import type { ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Sparkles,
  Mail,
  Calendar,
  Search,
  Reply,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  X,
  Mic,
  Check,
  FileText,
  Clock,
  MapPin,
  Users,
  ExternalLink,
} from "lucide-react";

import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { api } from "~/trpc/react";
import { Button } from "~/app/_components/ui/button";
import { authClient } from "~/server/better-auth/client";

type ExecutedAction =
  | {
      type: "send_email";
      to: string;
      subject: string;
      body?: string;
      success: boolean;
    }
  | {
      type: "create_email_draft";
      to: string;
      subject: string;
      body: string;
      draftId: string;
      messageId?: string;
      mailLink?: string;
      success: boolean;
    }
  | { type: "reply_to_email"; id: string; success: boolean }
  | {
      type: "create_calendar_event";
      eventId?: string;
      calendarLink?: string;
      meetingLink?: string;
      summary: string;
      startTime: string;
      endTime: string;
      description?: string;
      location?: string;
      attendees?: string[];
      success: boolean;
    }
  | { type: "search_emails"; query: string; count: number }
  | { type: "list_events"; count: number };

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  actions?: ExecutedAction[];
};

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <WorkspaceLayout>
          <div className="border-outline-variant bg-surface-container-low flex h-[calc(100vh-12rem)] max-h-[800px] items-center justify-center rounded-3xl border shadow-xl">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="text-primary size-8 animate-spin" />
              <p className="text-on-surface-variant animate-pulse text-xs font-semibold">
                Initializing chat client...
              </p>
            </div>
          </div>
        </WorkspaceLayout>
      }
    >
      <ChatContainer />
    </Suspense>
  );
}

function ChatContainer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeRoomId = searchParams.get("roomId");
  const utils = api.useUtils();

  const session = authClient.useSession();
  const userName = session.data?.user?.name;
  const firstName = userName ? userName.split(" ")[0] : "";
  const welcomeText = firstName
    ? `Welcome back, ${firstName}. What's on your mind today?`
    : "What's on your mind today?";

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Helper to select room
  const selectRoom = (roomId: string | null) => {
    if (roomId) {
      router.push(`/chat?roomId=${roomId}`);
    } else {
      router.push(`/chat`);
    }
  };

  // Queries & Mutations
  const {
    data: rooms = [],
    refetch: refetchRooms,
    isLoading: isLoadingRooms,
  } = api.agent.listRooms.useQuery();

  const {
    data: historyData = [],
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = api.agent.getRoomHistory.useQuery(
    { roomId: activeRoomId ?? "" },
    { enabled: !!activeRoomId },
  );

  const createRoomMutation = api.agent.createRoom.useMutation({
    onSuccess: (newRoom) => {
      void utils.agent.listRooms.invalidate();
      selectRoom(newRoom.id);
    },
  });

  const deleteRoomMutation = api.agent.deleteRoom.useMutation({
    onSuccess: (_, variables) => {
      void utils.agent.listRooms.invalidate();
      if (activeRoomId === variables.roomId) {
        selectRoom(null);
      }
    },
  });

  const renameRoomMutation = api.agent.renameRoom.useMutation({
    onSuccess: () => {
      void utils.agent.listRooms.invalidate();
      setEditingRoomId(null);
    },
  });

  const chatInRoomMutation = api.agent.chatInRoom.useMutation({
    onSuccess: () => {
      void utils.agent.listRooms.invalidate();
      void refetchHistory();
    },
  });

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingRoomId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [editingRoomId]);

  // Handle message send
  // Handle message send
  const handleSend = (textToSend: string) => {
    if (!textToSend.trim() || chatInRoomMutation.isPending) return;

    if (!activeRoomId) {
      createRoomMutation.mutate(
        { title: "New Chat" },
        {
          onSuccess: (newRoom) => {
            chatInRoomMutation.mutate({
              roomId: newRoom.id,
              content: textToSend.trim(),
            });
          },
        },
      );
    } else {
      chatInRoomMutation.mutate({
        roomId: activeRoomId,
        content: textToSend.trim(),
      });
    }
    setInput("");
  };

  // Create a new room and focus it
  const handleCreateRoom = () => {
    selectRoom(null);
  };

  // Delete a chat room
  const handleDeleteRoom = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat session?")) {
      deleteRoomMutation.mutate({ roomId });
    }
  };

  // Rename a chat room
  const handleRenameSubmit = (roomId: string) => {
    if (renameInput.trim()) {
      renameRoomMutation.mutate({ roomId, title: renameInput.trim() });
    } else {
      setEditingRoomId(null);
    }
  };

  // Format list of messages to display
  const messages: ChatMessage[] = [
    ...(historyData ?? []).map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
      actions: m.actions as ExecutedAction[],
    })),
    ...(chatInRoomMutation.isPending
      ? [
          {
            role: "user" as const,
            content: chatInRoomMutation.variables?.content ?? "",
          },
        ]
      : []),
  ];

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatInRoomMutation.isPending]);

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const isEditing = activeRoomId === editingRoomId;

  const renderInputForm = (isCentered: boolean) => {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className={`mx-auto flex w-full max-w-2xl flex-col items-center ${isCentered ? "mt-4" : ""}`}
      >
        <div className="bg-surface-container-highest border-outline-variant/80 focus-within:ring-primary/45 relative flex w-full items-center rounded-full border p-1.5 shadow-sm transition focus-within:ring-2">
          {/* Plus icon on the left */}
          <button
            type="button"
            className="text-on-surface-variant hover:bg-surface-container-high flex size-9 shrink-0 items-center justify-center rounded-full transition"
            title="Start New Chat"
            onClick={handleCreateRoom}
          >
            <Plus className="size-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={chatInRoomMutation.isPending}
            placeholder="Ask Orbit anything..."
            className="text-on-surface text-body-md placeholder:text-on-surface-variant/40 flex-grow border-none bg-transparent px-3 py-2 outline-none"
          />

          {/* Action elements on the right */}
          <div className="flex shrink-0 items-center gap-1.5 pr-1.5">
            {input.trim() ? (
              <Button
                type="submit"
                disabled={chatInRoomMutation.isPending}
                className="bg-primary text-on-primary hover:bg-primary-container flex size-9 items-center justify-center rounded-full p-0 shadow-xs transition"
              >
                <Send className="size-4" />
              </Button>
            ) : (
              <>
                <button
                  type="button"
                  className="text-on-surface-variant hover:bg-surface-container-high flex size-9 items-center justify-center rounded-full transition"
                  title="Voice input (Not supported)"
                >
                  <Mic className="size-4.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Suggestion Cards (Only show if centered/welcome state) */}
        {isCentered && (
          <div className="mt-8 grid w-full grid-cols-1 gap-4 px-4 sm:grid-cols-3">
            {[
              {
                title: "Schedule meeting",
                desc: "Send calendar invite & email for next Thursday",
                prompt:
                  "Send a calendar invite to friend@corsair.dev at 9 AM next Thursday. Send him an email too saying I look forward to our meeting.",
                icon: <Calendar className="text-primary size-5" />,
              },
              {
                title: "Search emails",
                desc: "Find recent updates in your inbox",
                prompt:
                  "Search my inbox for recent emails about project updates.",
                icon: <Search className="text-primary size-5" />,
              },
              {
                title: "View agenda",
                desc: "Check your upcoming events for next week",
                prompt: "Show my upcoming calendar events for next week.",
                icon: <Mail className="text-primary size-5" />,
              },
            ].map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInput(sug.prompt)}
                className="bg-surface-container hover:bg-surface-container-high border-outline-variant/40 flex w-full flex-col items-start gap-2.5 rounded-2xl border p-4 text-left shadow-xs transition"
              >
                <div className="bg-primary/10 shrink-0 rounded-xl p-2">
                  {sug.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-label-md text-on-surface truncate font-sans font-bold">
                    {sug.title}
                  </h4>
                  <p className="text-on-surface-variant/70 mt-0.5 font-sans text-[11px] leading-normal">
                    {sug.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </form>
    );
  };

  return (
    <WorkspaceLayout>
      <div className="border-outline-variant/60 bg-surface-container-low relative flex h-[calc(100vh-10rem)] min-h-[620px] flex-col overflow-hidden rounded-[28px] border shadow-sm">
        {/* Header */}
        <div className="border-outline-variant/50 bg-surface-container-high/70 flex shrink-0 items-center justify-between border-b px-4 py-3 backdrop-blur md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-primary text-on-primary shrink-0 rounded-2xl p-2 shadow-xs">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              {isEditing ? (
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    onBlur={() =>
                      activeRoomId && handleRenameSubmit(activeRoomId)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && activeRoomId)
                        handleRenameSubmit(activeRoomId);
                      if (e.key === "Escape") setEditingRoomId(null);
                    }}
                    className="bg-surface-container-lowest text-on-surface border-primary focus:ring-primary w-64 max-w-full rounded-xl border px-3 py-1 text-sm font-medium outline-none focus:ring-1"
                  />
                  <button
                    onClick={() =>
                      activeRoomId && handleRenameSubmit(activeRoomId)
                    }
                    className="hover:bg-primary-container text-primary rounded-xl p-1.5 transition"
                    title="Save title"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => setEditingRoomId(null)}
                    className="hover:bg-surface-container-high text-on-surface-variant rounded-xl p-1.5 transition"
                    title="Cancel"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-2.5">
                  <h2 className="text-title-md text-on-surface max-w-xs truncate font-sans font-semibold sm:max-w-md md:max-w-lg">
                    {activeRoom?.title ?? "Orbit Copilot"}
                  </h2>
                  {activeRoom && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (activeRoomId) {
                            setEditingRoomId(activeRoomId);
                            setRenameInput(activeRoom.title);
                          }
                        }}
                        className="hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-xl p-1.5 transition"
                        title="Rename Session"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) =>
                          activeRoomId && handleDeleteRoom(e, activeRoomId)
                        }
                        className="hover:bg-error/15 text-on-surface-variant hover:text-error rounded-xl p-1.5 transition"
                        title="Delete Session"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <p className="text-body-sm text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-emerald-500"></span>
                Draft-first email and calendar copilot
              </p>
            </div>
          </div>

          {/* Quick action: New Chat button */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              onClick={handleCreateRoom}
              disabled={createRoomMutation.isPending}
              className="border-outline-variant hover:bg-surface-container-high flex h-9 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
            >
              <Plus className="size-4" /> New Chat
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative flex min-h-0 flex-grow flex-col">
          {isLoadingHistory ? (
            <div className="flex flex-1 flex-col items-center justify-center">
              <RefreshCw className="text-primary size-6 animate-spin" />
              <p className="text-3xs text-on-surface-variant/70 mt-2 font-semibold tracking-wider uppercase">
                Loading history...
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center bg-transparent p-8">
              <h1 className="text-on-surface animate-fade-in mb-8 text-center font-sans text-3xl font-bold tracking-tight sm:text-4xl">
                {welcomeText}
              </h1>
              {renderInputForm(true)}
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-grow flex-col pb-[100px]">
              {/* Messages Thread */}
              <div className="flex-grow scrollbar-thin space-y-6 overflow-y-auto px-4 py-5 md:px-6">
                {messages.map((msg, index) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={index}
                      className={`mx-auto flex w-full max-w-5xl gap-3 md:gap-4 ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`text-title-sm flex size-9 shrink-0 items-center justify-center rounded-2xl font-bold shadow-xs ${
                          isUser
                            ? "bg-secondary text-on-secondary"
                            : "bg-primary text-on-primary"
                        } ${isUser ? "order-2" : ""}`}
                      >
                        {isUser ? "U" : "O"}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`min-w-0 space-y-3 ${isUser ? "max-w-[78%]" : "w-full max-w-3xl"}`}
                      >
                        <div
                          className={`text-body-md px-5 py-3.5 leading-relaxed ${
                            isUser
                              ? "bg-primary text-on-primary rounded-3xl rounded-tr-md whitespace-pre-wrap shadow-xs"
                              : "bg-surface-container-highest text-on-surface border-outline-variant rounded-2xl border shadow-xs"
                          }`}
                        >
                          {isUser ? (
                            msg.content
                          ) : (
                            <AssistantMessageContent content={msg.content} />
                          )}
                        </div>

                        {/* Executed Action Cards */}
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="mt-2 grid gap-3">
                            {msg.actions.map((action, idx) => (
                              <ActionCard key={idx} action={action} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Thinking indicator */}
                {(chatInRoomMutation.isPending ||
                  createRoomMutation.isPending) && (
                  <div className="mr-auto flex max-w-[80%] items-start gap-4">
                    <div className="bg-primary text-on-primary flex size-9 shrink-0 animate-pulse items-center justify-center rounded-full shadow-xs">
                      O
                    </div>
                    <div className="bg-surface-container-highest text-on-surface border-outline-variant flex items-center gap-3 rounded-3xl rounded-tl-none border px-5 py-3.5">
                      <RefreshCw className="text-primary size-4 animate-spin" />
                      <span className="text-body-md text-on-surface-variant animate-pulse font-medium">
                        {createRoomMutation.isPending
                          ? "Creating conversation..."
                          : "Orbit Agent is executing actions..."}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input Form Bar */}
              <div className="from-surface-container-low via-surface-container-low/95 absolute right-0 bottom-0 left-0 bg-gradient-to-t to-transparent p-4">
                {renderInputForm(false)}
              </div>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

function AssistantMessageContent({ content }: { content: string }) {
  return (
    <div className="space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-body-md text-on-surface leading-relaxed">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="text-on-surface font-bold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <div className="border-outline-variant/60 my-3 border-t" />,
          ul: ({ children }) => (
            <ul className="text-body-md text-on-surface list-disc space-y-1 pl-5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="text-body-md text-on-surface list-decimal space-y-1 pl-5">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary font-semibold underline underline-offset-2"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-primary/40 bg-primary/5 rounded-r-xl border-l-4 px-3 py-2">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-surface-container-high text-on-surface rounded-md px-1.5 py-0.5 text-[0.9em]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-surface-container text-on-surface border-outline-variant/60 overflow-x-auto rounded-xl border p-3 text-sm">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function formatActionDateTime(value?: string) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function extractUrls(...values: Array<string | undefined>) {
  const found = values
    .flatMap((value) => value?.match(/https?:\/\/[^\s)]+/g) ?? [])
    .map((url) => url.replace(/[.,;]+$/, ""));

  return Array.from(new Set(found));
}

function ActionStatus({ success }: { success: boolean }) {
  return success ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-500">
      <CheckCircle2 className="size-3.5" />
      Done
    </span>
  ) : (
    <span className="text-error inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold">
      <AlertCircle className="size-3.5" />
      Failed
    </span>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: ReactNode;
}) {
  if (!value) return null;

  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="text-on-surface-variant mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-on-surface-variant text-[10px] font-bold tracking-wider uppercase">
          {label}
        </p>
        <div className="text-body-sm text-on-surface min-w-0 break-words">
          {value}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: ExecutedAction }) {
  switch (action.type) {
    case "send_email":
      return (
        <div className="border-outline-variant bg-surface-container-highest overflow-hidden rounded-2xl border shadow-sm">
          <div className="flex items-start gap-3 p-4">
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500">
              <Send className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-label-lg text-on-surface font-semibold">
                  Email sent
                </h4>
                <ActionStatus success={action.success} />
              </div>
              <div className="mt-3 grid gap-2">
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
              {action.body && (
                <div className="border-outline-variant/60 bg-surface-container mt-3 max-h-44 overflow-y-auto rounded-xl border p-3">
                  <p className="text-body-sm text-on-surface whitespace-pre-wrap">
                    {action.body}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case "create_email_draft":
      return (
        <div className="border-primary/35 bg-surface-container-highest overflow-hidden rounded-2xl border shadow-sm">
          <div className="border-primary/20 bg-primary/5 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="bg-primary/10 text-primary rounded-xl p-2">
                <Mail className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-label-lg text-on-surface font-semibold">
                  Email draft ready
                </h4>
                <p className="text-body-sm text-on-surface-variant truncate">
                  Review this before sending
                </p>
              </div>
            </div>
            <ActionStatus success={action.success} />
          </div>
          <div className="grid gap-3 p-4">
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
            <div className="border-outline-variant/60 bg-surface-container max-h-64 overflow-y-auto rounded-xl border p-3">
              <p className="text-body-sm text-on-surface whitespace-pre-wrap">
                {action.body}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-on-surface-variant text-[11px]">
                Draft ID: {action.draftId}
              </span>
              <a
                href={action.mailLink ?? "/mail?mailbox=drafts"}
                className="text-primary hover:bg-primary/10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition"
              >
                {action.messageId ? "Open draft" : "Open drafts"}
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      );

    case "reply_to_email":
      return (
        <div className="bg-surface-container-highest border-outline-variant flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm">
          <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-500">
            <Reply className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-label-md text-on-surface font-semibold">
              Sent Reply
            </h4>
            <p className="text-body-sm text-on-surface-variant truncate">
              Thread ID: {action.id}
            </p>
          </div>
          <ActionStatus success={action.success} />
        </div>
      );

    case "create_calendar_event": {
      const links = extractUrls(
        action.meetingLink,
        action.location,
        action.description,
      );
      return (
        <div className="border-outline-variant bg-surface-container-highest overflow-hidden rounded-2xl border shadow-sm">
          <div className="flex items-start gap-3 p-4">
            <div className="rounded-xl bg-violet-500/10 p-2 text-violet-500">
              <Calendar className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-label-lg text-on-surface truncate font-semibold">
                    {action.summary}
                  </h4>
                  <p className="text-body-sm text-on-surface-variant">
                    Calendar event scheduled
                  </p>
                </div>
                <ActionStatus success={action.success} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <DetailRow
                  icon={<Clock className="size-4" />}
                  label="Starts"
                  value={formatActionDateTime(action.startTime)}
                />
                <DetailRow
                  icon={<Clock className="size-4" />}
                  label="Ends"
                  value={formatActionDateTime(action.endTime)}
                />
                <DetailRow
                  icon={<MapPin className="size-4" />}
                  label="Location"
                  value={action.location}
                />
                <DetailRow
                  icon={<Users className="size-4" />}
                  label="Attendees"
                  value={action.attendees?.join(", ")}
                />
              </div>

              {action.description && (
                <div className="border-outline-variant/60 bg-surface-container mt-4 rounded-xl border p-3">
                  <p className="text-on-surface-variant mb-1 text-[10px] font-bold tracking-wider uppercase">
                    Details
                  </p>
                  <p className="text-body-sm text-on-surface whitespace-pre-wrap">
                    {action.description}
                  </p>
                </div>
              )}

              {(links.length > 0 || action.calendarLink || action.eventId) && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {action.calendarLink && (
                    <a
                      href={action.calendarLink}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-primary text-on-primary hover:bg-primary/90 inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition"
                    >
                      <span className="truncate">Open calendar event</span>
                      <ExternalLink className="size-3.5 shrink-0" />
                    </a>
                  )}
                  {links.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="border-outline-variant text-primary hover:bg-primary/10 inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition"
                    >
                      <span className="truncate">
                        {link === action.meetingLink
                          ? "Open meeting"
                          : "Open link"}
                      </span>
                      <ExternalLink className="size-3.5 shrink-0" />
                    </a>
                  ))}
                  {action.eventId && (
                    <span className="text-on-surface-variant text-[11px]">
                      Event ID: {action.eventId}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    case "search_emails":
      return (
        <div className="bg-surface-container-highest border-outline-variant flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm">
          <div className="rounded-xl bg-teal-500/10 p-2 text-teal-500">
            <Search className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-label-md text-on-surface font-semibold">
              Queried Emails
            </h4>
            <p className="text-body-sm text-on-surface-variant truncate">
              Query: &quot;{action.query}&quot; • Found {action.count} results
            </p>
          </div>
          <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
        </div>
      );

    case "list_events":
      return (
        <div className="bg-surface-container-highest border-outline-variant flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm">
          <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500">
            <Calendar className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-label-md text-on-surface font-semibold">
              Listed Events
            </h4>
            <p className="text-body-sm text-on-surface-variant truncate">
              Found {action.count} upcoming events
            </p>
          </div>
          <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
        </div>
      );

    default:
      return null;
  }
}
