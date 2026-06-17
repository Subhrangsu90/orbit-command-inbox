"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  ChevronDown,
  Check,
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { api } from "~/trpc/react";
import { Button } from "~/app/_components/ui/button";
import { authClient } from "~/server/better-auth/client";

type ExecutedAction =
  | { type: "send_email"; to: string; subject: string; success: boolean }
  | { type: "reply_to_email"; id: string; success: boolean }
  | { type: "create_calendar_event"; summary: string; startTime: string; success: boolean }
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
          <div className="flex h-[calc(100vh-12rem)] max-h-[800px] items-center justify-center border border-outline-variant bg-surface-container-low rounded-3xl shadow-xl">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="size-8 animate-spin text-primary" />
              <p className="text-on-surface-variant text-xs font-semibold animate-pulse">
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
  const { data: rooms = [], refetch: refetchRooms, isLoading: isLoadingRooms } =
    api.agent.listRooms.useQuery();

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
        }
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
        className={`w-full max-w-2xl mx-auto flex flex-col items-center ${isCentered ? "mt-4" : ""}`}
      >
        <div className="relative flex items-center bg-surface-container-highest border border-outline-variant/80 rounded-full p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/45 transition w-full">
          {/* Plus icon on the left */}
          <button
            type="button"
            className="flex items-center justify-center size-9 rounded-full text-on-surface-variant hover:bg-surface-container-high transition shrink-0"
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
            className="flex-grow bg-transparent text-on-surface text-body-md py-2 px-3 outline-none border-none placeholder:text-on-surface-variant/40"
          />

          {/* Action elements on the right */}
          <div className="flex items-center gap-1.5 pr-1.5 shrink-0">
            {input.trim() ? (
              <Button
                type="submit"
                disabled={chatInRoomMutation.isPending}
                className="rounded-full size-9 p-0 flex items-center justify-center bg-primary text-on-primary hover:bg-primary-container shadow-xs transition"
              >
                <Send className="size-4" />
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 rounded-full py-1 px-3.5 transition cursor-pointer select-none text-[11px] font-semibold text-on-surface-variant h-8">
                  <span>GPT-4o-mini</span>
                  <ChevronDown className="size-3 text-on-surface-variant/60" />
                </div>
                <button
                  type="button"
                  className="flex items-center justify-center size-9 rounded-full text-on-surface-variant hover:bg-surface-container-high transition"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 w-full px-4">
            {[
              {
                title: "Schedule meeting",
                desc: "Send calendar invite & email for next Thursday",
                prompt: "Send a calendar invite to friend@corsair.dev at 9 AM next Thursday. Send him an email too saying I look forward to our meeting.",
                icon: <Calendar className="size-5 text-primary" />,
              },
              {
                title: "Search emails",
                desc: "Find recent updates in your inbox",
                prompt: "Search my inbox for recent emails about project updates.",
                icon: <Search className="size-5 text-primary" />,
              },
              {
                title: "View agenda",
                desc: "Check your upcoming events for next week",
                prompt: "Show my upcoming calendar events for next week.",
                icon: <Mail className="size-5 text-primary" />,
              },
            ].map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInput(sug.prompt)}
                className="flex flex-col items-start p-4 bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 rounded-2xl transition text-left gap-2.5 w-full shadow-xs"
              >
                <div className="p-2 bg-primary/10 rounded-xl shrink-0">
                  {sug.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-label-md font-bold text-on-surface font-sans truncate">
                    {sug.title}
                  </h4>
                  <p className="text-[11px] text-on-surface-variant/70 font-sans mt-0.5 leading-normal">
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
      <div className="flex flex-col h-[calc(100vh-10rem)] relative bg-transparent">
        
        {/* Header */}
        <div className="flex items-center justify-between py-2 border-b border-outline-variant/30 mb-4 shrink-0 bg-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary/10 text-primary p-2 rounded-2xl shrink-0">
              <Sparkles className="size-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    onBlur={() => activeRoomId && handleRenameSubmit(activeRoomId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && activeRoomId) handleRenameSubmit(activeRoomId);
                      if (e.key === "Escape") setEditingRoomId(null);
                    }}
                    className="bg-surface-container-lowest text-on-surface border border-primary text-sm px-3 py-1 rounded-xl outline-none focus:ring-1 focus:ring-primary w-64 max-w-full font-medium"
                  />
                  <button
                    onClick={() => activeRoomId && handleRenameSubmit(activeRoomId)}
                    className="p-1.5 hover:bg-primary-container text-primary rounded-xl transition"
                    title="Save title"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => setEditingRoomId(null)}
                    className="p-1.5 hover:bg-surface-container-high text-on-surface-variant rounded-xl transition"
                    title="Cancel"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 min-w-0">
                  <h2 className="text-title-md font-sans font-semibold text-on-surface truncate max-w-xs sm:max-w-md md:max-w-lg">
                    {activeRoom?.title ?? "Orbit Copilot"}
                  </h2>
                  {activeRoom && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (activeRoomId) {
                            setEditingRoomId(activeRoomId);
                            setRenameInput(activeRoom.title);
                          }
                        }}
                        className="p-1.5 hover:bg-surface-container-high rounded-xl text-on-surface-variant hover:text-on-surface transition"
                        title="Rename Session"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => activeRoomId && handleDeleteRoom(e, activeRoomId)}
                        className="p-1.5 hover:bg-error/15 rounded-xl text-on-surface-variant hover:text-error transition"
                        title="Delete Session"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <span className="inline-block size-2 rounded-full bg-emerald-500 animate-ping"></span>
                Powered by Corsair MCP & GPT-4o-mini
              </p>
            </div>
          </div>

          {/* Quick action: New Chat button */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              onClick={handleCreateRoom}
              disabled={createRoomMutation.isPending}
              className="rounded-xl text-xs border-outline-variant flex items-center gap-1.5 font-semibold hover:bg-surface-container-high py-2 px-3.5 h-9"
            >
              <Plus className="size-4" /> New Chat
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow flex flex-col min-h-0 relative">
          {isLoadingHistory ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <p className="text-3xs text-on-surface-variant/70 font-semibold uppercase tracking-wider mt-2">
                Loading history...
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent max-w-3xl mx-auto w-full">
              <h1 className="text-3xl sm:text-4xl font-sans font-bold text-on-surface text-center mb-8 tracking-tight animate-fade-in">
                {welcomeText}
              </h1>
              {renderInputForm(true)}
            </div>
          ) : (
            <div className="flex-grow flex flex-col min-h-0 relative pb-[100px]">
              {/* Messages Thread */}
              <div className="flex-grow overflow-y-auto p-4 space-y-6 scrollbar-thin">
                {messages.map((msg, index) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={index}
                      className={`flex gap-4 max-w-[85%] ${
                        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`size-9 rounded-full flex items-center justify-center shrink-0 text-title-sm font-bold shadow-xs ${
                          isUser
                            ? "bg-secondary text-on-secondary"
                            : "bg-primary text-on-primary"
                        }`}
                      >
                        {isUser ? "U" : "O"}
                      </div>

                      {/* Bubble */}
                      <div className="space-y-3">
                        <div
                          className={`px-5 py-3.5 rounded-3xl text-body-md leading-relaxed whitespace-pre-wrap ${
                            isUser
                              ? "bg-primary text-on-primary rounded-tr-none shadow-xs"
                              : "bg-surface-container-highest text-on-surface border border-outline-variant rounded-tl-none"
                          }`}
                        >
                          {msg.content}
                        </div>

                        {/* Executed Action Cards */}
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="grid gap-2.5 mt-2">
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
                {(chatInRoomMutation.isPending || createRoomMutation.isPending) && (
                  <div className="flex gap-4 max-w-[80%] mr-auto items-start">
                    <div className="size-9 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                      O
                    </div>
                    <div className="bg-surface-container-highest text-on-surface border border-outline-variant px-5 py-3.5 rounded-3xl rounded-tl-none flex items-center gap-3">
                      <RefreshCw className="size-4 animate-spin text-primary" />
                      <span className="text-body-md text-on-surface-variant font-medium animate-pulse">
                        {createRoomMutation.isPending ? "Creating conversation..." : "Orbit Agent is executing actions..."}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input Form Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
                {renderInputForm(false)}
              </div>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

function ActionCard({ action }: { action: ExecutedAction }) {
  switch (action.type) {
    case "send_email":
      return (
        <div className="flex items-center gap-3 bg-surface-container-highest border border-outline-variant p-3.5 rounded-2xl shadow-sm">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
            <Mail className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-label-md font-semibold text-on-surface">Sent Email</h4>
            <p className="text-body-sm text-on-surface-variant truncate">
              To: {action.to} • {action.subject}
            </p>
          </div>
          {action.success ? (
            <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="size-5 text-red-500 shrink-0" />
          )}
        </div>
      );

    case "reply_to_email":
      return (
        <div className="flex items-center gap-3 bg-surface-container-highest border border-outline-variant p-3.5 rounded-2xl shadow-sm">
          <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Reply className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-label-md font-semibold text-on-surface">Sent Reply</h4>
            <p className="text-body-sm text-on-surface-variant truncate">
              Thread ID: {action.id}
            </p>
          </div>
          {action.success ? (
            <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="size-5 text-red-500 shrink-0" />
          )}
        </div>
      );

    case "create_calendar_event":
      return (
        <div className="flex items-center gap-3 bg-surface-container-highest border border-outline-variant p-3.5 rounded-2xl shadow-sm">
          <div className="p-2 bg-violet-500/10 text-violet-500 rounded-xl">
            <Calendar className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-label-md font-semibold text-on-surface">Created Event</h4>
            <p className="text-body-sm text-on-surface-variant truncate">
              {action.summary} ({new Date(action.startTime).toLocaleString()})
            </p>
          </div>
          {action.success ? (
            <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="size-5 text-red-500 shrink-0" />
          )}
        </div>
      );

    case "search_emails":
      return (
        <div className="flex items-center gap-3 bg-surface-container-highest border border-outline-variant p-3.5 rounded-2xl shadow-sm">
          <div className="p-2 bg-teal-500/10 text-teal-500 rounded-xl">
            <Search className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-label-md font-semibold text-on-surface">Queried Emails</h4>
            <p className="text-body-sm text-on-surface-variant truncate">
              Query: &quot;{action.query}&quot; • Found {action.count} results
            </p>
          </div>
          <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
        </div>
      );

    case "list_events":
      return (
        <div className="flex items-center gap-3 bg-surface-container-highest border border-outline-variant p-3.5 rounded-2xl shadow-sm">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
            <Calendar className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-label-md font-semibold text-on-surface">Listed Events</h4>
            <p className="text-body-sm text-on-surface-variant truncate">
              Found {action.count} upcoming events
            </p>
          </div>
          <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
        </div>
      );

    default:
      return null;
  }
}
