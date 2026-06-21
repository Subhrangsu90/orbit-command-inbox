"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Sparkles,
  RefreshCw,
  Trash2,
  Edit2,
  X,
  Check,
} from "lucide-react";

import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { api } from "~/trpc/react";
import { Button } from "~/app/_components/ui/button";
import { authClient } from "~/server/better-auth/client";
import { toast } from "sonner";

import type { ExecutedAction, ChatMessage } from "./types";
import { ThinkingTimeline, isWorkspaceActionQuery } from "./_components/ThinkingTimeline";
import { AssistantMessageContent } from "./_components/AssistantMessageContent";
import { ActionCard } from "./_components/ActionCard";
import { ChatInputForm } from "./_components/ChatInputForm";

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <WorkspaceLayout>
          <div className="flex min-h-[50vh] items-center justify-center">
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
  const userImage = session.data?.user?.image;
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
  const chatInputRef = useRef<HTMLInputElement>(null);

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
    onError: (err) => {
      toast.error(err.message || "Failed to create chat room");
    },
  });

  const deleteRoomMutation = api.agent.deleteRoom.useMutation({
    onSuccess: (_, variables) => {
      void utils.agent.listRooms.invalidate();
      if (activeRoomId === variables.roomId) {
        selectRoom(null);
      }
      toast.success("Chat room deleted successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete chat room");
    },
  });

  const renameRoomMutation = api.agent.renameRoom.useMutation({
    onSuccess: () => {
      void utils.agent.listRooms.invalidate();
      setEditingRoomId(null);
      toast.success("Chat room renamed successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to rename chat room");
    },
  });

  const chatInRoomMutation = api.agent.chatInRoom.useMutation({
    onSuccess: () => {
      void utils.agent.listRooms.invalidate();
      void refetchHistory();
      setTimeout(() => chatInputRef.current?.focus(), 100);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send message to AI");
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
  const isEditing = !!activeRoomId && activeRoomId === editingRoomId;
  const isInitialChatScreen = !isLoadingHistory && messages.length === 0;

  return (
    <WorkspaceLayout>
      <div className="bg-background relative flex w-full flex-col">
        {/* Header */}
        <div className={`border-outline-variant/45 mx-auto flex w-full items-center justify-between gap-2 border-b px-3 py-3 sm:px-5 md:px-6 ${
          isInitialChatScreen ? "md:hidden" : ""
        }`}>
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
                    className="bg-background text-on-surface border-primary focus:ring-primary/35 w-full max-w-xs rounded-full border px-4 py-1.5 text-sm font-medium outline-none focus:ring-4"
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
                  <h2 className="text-on-surface sm:text-title-md truncate font-sans text-sm font-bold">
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
              <span className="material-symbols-outlined text-sm leading-none">
                history
              </span>
              <span className="hidden min-[380px]:inline">Sessions</span>
            </Button>
          </div>
        </div>

        {/* Mobile History Drawer / Overlay */}
        {showHistoryOnMobile && (
          <div className="border-outline-variant/60 bg-surface-container-lowest/95 animate-fade-in absolute inset-x-3 top-[65px] z-30 rounded-2xl border p-3 shadow-xl backdrop-blur md:hidden">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-on-surface text-xs font-bold tracking-wider uppercase">
                Chat Sessions
              </h3>
              <button
                onClick={() => setShowHistoryOnMobile(false)}
                className="text-on-surface-variant hover:text-on-surface rounded-lg p-1"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[45dvh] space-y-1 overflow-y-auto">
              {rooms.length === 0 ? (
                <p className="text-on-surface-variant/40 py-2 text-xs italic">
                  No chats yet
                </p>
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
                        className="mr-2 flex-grow truncate text-left font-medium"
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
                          className="hover:bg-surface-container-low text-on-surface-variant/75 rounded-lg p-1.5"
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
                          className="hover:bg-error/15 text-error/75 rounded-lg p-1.5 transition-colors"
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
        <div className="mx-auto flex w-full flex-col">
          {isLoadingHistory ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center">
              <RefreshCw className="text-primary size-6 animate-spin" />
              <p className="text-3xs text-on-surface-variant/70 mt-2 font-semibold tracking-wider uppercase">
                Loading history...
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex w-full flex-1 flex-col items-center justify-center bg-transparent px-4 py-16 sm:px-8">
              <h1 className="text-on-surface animate-fade-in mb-6 text-center font-sans text-3xl leading-tight font-bold tracking-tight sm:mb-8 sm:text-5xl">
                {welcomeText}
              </h1>
              <ChatInputForm
                isCentered={true}
                input={input}
                setInput={setInput}
                chatInputRef={chatInputRef}
                isPending={chatInRoomMutation.isPending}
                handleSend={handleSend}
                handleCreateRoom={handleCreateRoom}
              />
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Messages Thread */}
              <div className="space-y-5 px-3 py-5 sm:px-5 md:px-6">
                {messages.map((msg, index) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={index}
                      className={`mx-auto flex w-full gap-2 sm:gap-3 md:gap-4 ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {/* Avatar */}
                      {isUser ? (
                        userImage ? (
                          <img
                            src={userImage}
                            alt={userName || "User"}
                            className="order-2 size-8 shrink-0 rounded-xl object-cover shadow-xs sm:size-9 sm:rounded-2xl"
                          />
                        ) : (
                          <div className="bg-primary text-on-primary order-2 flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-xs sm:size-9 sm:rounded-2xl">
                            <span className="sm:text-title-sm">{firstName?.charAt(0)?.toUpperCase() || "U"}</span>
                          </div>
                        )
                      ) : (
                        <div className="bg-primary-container text-on-primary-container flex size-8 shrink-0 items-center justify-center rounded-xl shadow-xs sm:size-9 sm:rounded-2xl">
                          <Sparkles className="size-4 sm:size-[1.125rem]" />
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`min-w-0 space-y-3 ${isUser ? "max-w-[84%] sm:max-w-[78%]" : "w-full"}`}
                      >
                        <div
                          className={`sm:text-body-md overflow-hidden px-3.5 py-3 text-sm leading-relaxed break-words sm:px-5 sm:py-3.5 ${
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
                  <div className="mr-auto flex items-start gap-2 sm:gap-4">
                    <div className="bg-primary-container text-on-primary-container flex size-8 items-center justify-center rounded-xl shadow-xs sm:size-9 sm:rounded-2xl">
                      <Sparkles className="size-4 sm:size-[1.125rem]" />
                    </div>
                    {createRoomMutation.isPending || !isWorkspaceActionQuery(chatInRoomMutation.variables?.content ?? "") ? (
                      <div className="bg-surface-container-highest text-on-surface border-outline-variant flex min-w-0 items-center gap-2 rounded-2xl rounded-tl-none border px-3 py-3 sm:gap-3 sm:rounded-3xl sm:px-5 sm:py-3.5">
                        <RefreshCw className="text-primary size-4 animate-spin" />
                        <span className="text-on-surface-variant sm:text-body-md animate-pulse text-sm font-medium">
                          {createRoomMutation.isPending
                            ? "Creating conversation..."
                            : "Tacta is thinking..."}
                        </span>
                      </div>
                    ) : (
                      <div className="flex w-full flex-col p-1">
                        <div className="mb-3 flex items-center gap-2 pb-1 text-on-surface">
                          <RefreshCw className="text-primary size-4 animate-spin" />
                          <span className="text-label-md font-semibold">
                            Executing Workspace Tools
                          </span>
                        </div>
                        <ThinkingTimeline />
                      </div>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Sticky Bottom Input Form Bar */}
              <div className="from-background via-background/95 sticky bottom-16 z-10 bg-gradient-to-t to-transparent px-3 py-4 sm:px-5 md:bottom-0">
                <ChatInputForm
                  isCentered={false}
                  input={input}
                  setInput={setInput}
                  chatInputRef={chatInputRef}
                  isPending={chatInRoomMutation.isPending}
                  handleSend={handleSend}
                  handleCreateRoom={handleCreateRoom}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
