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
          <div className="flex h-[calc(100dvh-9.5rem)] min-h-[420px] items-center justify-center overflow-hidden md:h-[calc(100vh-12rem)] md:max-h-[800px]">
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
  const [showHistoryOnMobile, setShowHistoryOnMobile] = useState(false);

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
        className={`mx-auto flex w-full flex-col items-center ${isCentered ? "mt-4 max-w-3xl" : "max-w-4xl"}`}
      >
        <div className="border-outline-variant/60 bg-surface-container-highest/85 focus-within:border-primary/60 focus-within:ring-primary/25 relative flex w-full min-w-0 items-center rounded-[1.75rem] border p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.08)] backdrop-blur transition focus-within:ring-4">
          {/* Plus icon on the left */}
          <button
            type="button"
            className="text-on-surface-variant hover:bg-surface-container-high hover:text-primary flex size-10 shrink-0 items-center justify-center rounded-full transition"
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
            placeholder="Ask Tacta anything..."
            className="text-on-surface placeholder:text-on-surface-variant/45 min-w-0 flex-1 border-none bg-transparent px-2 py-3 text-sm outline-none sm:px-4 sm:text-base"
          />

          {/* Action elements on the right */}
          <div className="flex shrink-0 items-center gap-1.5 pr-1">
            {input.trim() ? (
              <Button
                type="submit"
                disabled={chatInRoomMutation.isPending}
                className="bg-primary text-on-primary hover:bg-primary/90 flex size-10 items-center justify-center rounded-full p-0 shadow-sm transition"
              >
                <Send className="size-4" />
              </Button>
            ) : (
              <>
                <button
                  type="button"
                  className="text-on-surface-variant hover:bg-surface-container-high hover:text-primary flex size-10 items-center justify-center rounded-full transition"
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
          <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-3">
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
                className="border-outline-variant/45 bg-surface-container-lowest/70 hover:border-primary/35 hover:bg-surface-container-low flex w-full min-w-0 flex-col items-start gap-3 rounded-2xl border p-4 text-left shadow-sm backdrop-blur transition"
              >
                <div className="bg-primary/10 text-primary shrink-0 rounded-2xl p-2.5">
                  {sug.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-label-md text-on-surface truncate font-sans font-bold">
                    {sug.title}
                  </h4>
                  <p className="text-on-surface-variant/75 mt-1 font-sans text-xs leading-relaxed">
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
      <div className="relative -mx-3 flex h-[calc(100dvh-9.5rem)] min-h-[430px] flex-col overflow-hidden bg-background sm:-mx-md sm:h-[calc(100dvh-10rem)] md:mx-0 md:h-[calc(100vh-12rem)] md:min-h-[620px]">
        {/* Header */}
        <div className="border-outline-variant/45 mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-2 border-b px-3 py-3 sm:px-5 md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="bg-primary-container text-on-primary-container shrink-0 rounded-2xl p-2.5 shadow-sm">
              <Sparkles className="size-4.5 sm:size-5" />
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
                    className="bg-background text-on-surface border-primary focus:ring-primary/35 w-32 max-w-full rounded-full border px-4 py-1.5 text-sm font-medium outline-none focus:ring-4 min-[380px]:w-48 sm:w-64"
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
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
                  <h2 className="text-on-surface max-w-[9rem] truncate font-sans text-sm font-bold sm:max-w-md sm:text-title-md md:max-w-lg">
                    {activeRoom?.title ?? "Tacta Copilot"}
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
              <p className="text-body-sm text-on-surface-variant mt-0.5 hidden items-center gap-1.5 sm:flex">
                <span className="inline-block size-2 rounded-full bg-emerald-500"></span>
                Draft-first email and calendar copilot
              </p>
            </div>
          </div>

          {/* Quick action: New Chat & Sessions button */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <Button
              variant="outline"
              onClick={() => setShowHistoryOnMobile(!showHistoryOnMobile)}
              className="border-outline-variant/70 hover:bg-surface-container-high flex h-9 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold md:hidden"
            >
              <span className="material-symbols-outlined text-sm leading-none">history</span>
              <span className="hidden min-[380px]:inline">Sessions</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleCreateRoom}
              disabled={createRoomMutation.isPending}
              className="border-outline-variant/70 bg-surface-container-lowest/60 hover:bg-surface-container-high flex h-10 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-sm sm:px-4"
            >
              <Plus className="size-4" />
              <span className="hidden min-[380px]:inline">New Chat</span>
            </Button>
          </div>
        </div>

        {/* Mobile History Drawer / Overlay */}
        {showHistoryOnMobile && (
          <div className="border-outline-variant/60 bg-surface-container-lowest/95 absolute inset-x-3 top-[65px] z-30 animate-fade-in rounded-2xl border p-3 shadow-xl backdrop-blur md:hidden">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">Chat Sessions</h3>
              <button
                onClick={() => setShowHistoryOnMobile(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[45dvh] space-y-1 overflow-y-auto">
              {rooms.length === 0 ? (
                <p className="py-2 text-xs italic text-on-surface-variant/40">No chats yet</p>
              ) : (
                rooms.map((room) => {
                  const isRoomActive = activeRoomId === room.id;
                  return (
                    <div
                      key={room.id}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
                        isRoomActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      <button
                        onClick={() => {
                          selectRoom(room.id);
                          setShowHistoryOnMobile(false);
                        }}
                        className="flex-grow text-left truncate font-medium mr-2"
                        title={room.title}
                      >
                        {room.title}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoomId(room.id);
                            setRenameInput(room.title);
                            setShowHistoryOnMobile(false);
                          }}
                          className="hover:bg-surface-container-low p-1.5 rounded-lg text-on-surface-variant/75"
                          title="Rename"
                        >
                          <Edit2 className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            handleDeleteRoom(e, room.id);
                            setShowHistoryOnMobile(false);
                          }}
                          className="hover:bg-error/15 rounded-lg p-1.5 text-error/75 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="relative mx-auto flex min-h-0 w-full max-w-6xl flex-grow flex-col">
          {isLoadingHistory ? (
            <div className="flex flex-1 flex-col items-center justify-center">
              <RefreshCw className="text-primary size-6 animate-spin" />
              <p className="text-3xs text-on-surface-variant/70 mt-2 font-semibold tracking-wider uppercase">
                Loading history...
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center bg-transparent px-4 py-8 sm:px-8">
              <h1 className="text-on-surface animate-fade-in mb-6 max-w-3xl text-center font-sans text-3xl font-bold leading-tight tracking-tight sm:mb-8 sm:text-5xl">
                {welcomeText}
              </h1>
              {renderInputForm(true)}
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-grow flex-col pb-[96px] sm:pb-[100px]">
              {/* Messages Thread */}
              <div className="scrollbar-thin flex-grow space-y-5 overflow-y-auto px-3 py-5 sm:px-5 md:px-6">
                {messages.map((msg, index) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={index}
                      className={`mx-auto flex w-full max-w-4xl gap-2 sm:gap-3 md:gap-4 ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-xs sm:size-9 sm:rounded-2xl sm:text-title-sm ${
                          isUser
                            ? "bg-primary text-on-primary"
                            : "bg-primary-container text-on-primary-container"
                        } ${isUser ? "order-2" : ""}`}
                      >
                        {isUser ? "U" : "T"}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`min-w-0 space-y-3 ${isUser ? "max-w-[84%] sm:max-w-[78%]" : "w-full max-w-3xl"}`}
                      >
                        <div
                          className={`overflow-hidden break-words px-3.5 py-3 text-sm leading-relaxed sm:px-5 sm:py-3.5 sm:text-body-md ${
                            isUser
                              ? "bg-primary text-on-primary rounded-3xl rounded-tr-md whitespace-pre-wrap shadow-xs"
                              : "text-on-surface"
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
                  <div className="mr-auto flex max-w-[92%] items-start gap-2 sm:max-w-[80%] sm:gap-4">
                    <div className="bg-primary text-on-primary flex size-9 shrink-0 animate-pulse items-center justify-center rounded-full shadow-xs">
                      T
                    </div>
                    <div className="bg-surface-container-highest text-on-surface border-outline-variant flex min-w-0 items-center gap-2 rounded-2xl rounded-tl-none border px-3 py-3 sm:gap-3 sm:rounded-3xl sm:px-5 sm:py-3.5">
                      <RefreshCw className="text-primary size-4 animate-spin" />
                      <span className="text-on-surface-variant animate-pulse text-sm font-medium sm:text-body-md">
                        {createRoomMutation.isPending
                          ? "Creating conversation..."
                          : "Tacta Agent is executing actions..."}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input Form Bar */}
              <div className="from-background via-background/95 absolute right-0 bottom-0 left-0 bg-gradient-to-t to-transparent px-3 py-4 sm:px-5">
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
