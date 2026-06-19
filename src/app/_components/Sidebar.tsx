"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Logo } from "./Logo";

type SidebarProps = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
  isExpanded: boolean;
  onToggleExpanded: () => void;
};

export function Sidebar({ user, isExpanded, onToggleExpanded }: SidebarProps) {
  const [isBrandHovered, setIsBrandHovered] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const utils = api.useUtils();
  const currentMailbox = searchParams.get("mailbox") ?? "inbox";

  const { data: rooms = [] } = api.agent.listRooms.useQuery(undefined, {
    enabled: !!user,
  });

  const createRoomMutation = api.agent.createRoom.useMutation({
    onSuccess: (newRoom) => {
      void utils.agent.listRooms.invalidate();
      router.push(`/chat?roomId=${newRoom.id}`);
    },
  });

  const handleCreateRoom = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push("/chat");
  };

  const getActiveTab = () => {
    if (pathname.startsWith("/chat")) return "agent";
    if (pathname.startsWith("/mail") || searchParams.has("mailbox")) return "mail";
    if (pathname.startsWith("/calendar")) return "calendar";
    if (pathname.startsWith("/settings")) return "settings";
    return "mail"; // fallback
  };

  const activeTab = getActiveTab();

  return (
    <aside
      className={`bg-surface-container-low border-outline-variant fixed top-0 left-0 z-45 hidden h-full border-r transition-[width] duration-200 md:flex ${
        isExpanded ? "w-70" : "w-18"
      }`}
    >
      {/* COLUMN 1: Narrow Left Icon Strip (Always visible) */}
      <div className="w-18 border-r border-outline-variant/30 flex flex-col items-center py-6 shrink-0 bg-surface-container-lowest">
        {/* Tacta Logo at Top */}
        <div className="mb-8 flex h-10 items-center justify-center">
          <button
            type="button"
            onClick={onToggleExpanded}
            onMouseEnter={() => setIsBrandHovered(true)}
            onMouseLeave={() => setIsBrandHovered(false)}
            title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            className="text-primary hover:bg-surface-container-high grid size-10 place-items-center rounded-2xl transition-colors"
          >
            {isBrandHovered ? (
              <span className="material-symbols-outlined text-2xl font-semibold">
                {isExpanded ? "left_panel_close" : "left_panel_open"}
              </span>
            ) : (
              <Logo showText={false} size={24} />
            )}
          </button>
        </div>

        {/* App Icons (Middle) */}
        <div className="flex-grow flex flex-col items-center gap-4 w-full px-2">
          {/* Agent Chat Icon */}
          <Link
            href="/chat"
            className={`flex items-center justify-center size-12 rounded-2xl transition-all ${
              activeTab === "agent"
                ? "bg-secondary-container text-on-secondary-container font-semibold shadow-xs"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
            title="Agent Copilot"
          >
            <span className="material-symbols-outlined text-2xl font-bold">forum</span>
          </Link>

          {/* Mail Icon */}
          <Link
            href="/mail?mailbox=inbox"
            className={`flex items-center justify-center size-12 rounded-2xl transition-all ${
              activeTab === "mail"
                ? "bg-secondary-container text-on-secondary-container font-semibold shadow-xs"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
            title="Mailbox"
          >
            <span className="material-symbols-outlined text-2xl font-bold">mail</span>
          </Link>

          {/* Calendar Icon */}
          <Link
            href="/calendar"
            className={`flex items-center justify-center size-12 rounded-2xl transition-all ${
              activeTab === "calendar"
                ? "bg-secondary-container text-on-secondary-container font-semibold shadow-xs"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
            title="Calendar"
          >
            <span className="material-symbols-outlined text-2xl font-bold">calendar_month</span>
          </Link>
        </div>

        {/* Settings Icon (Bottom) */}
        <div className="w-full px-2">
          <Link
            href="/settings"
            className={`flex items-center justify-center size-12 rounded-2xl transition-all ${
              activeTab === "settings"
                ? "bg-secondary-container text-on-secondary-container font-semibold shadow-xs"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
            title="Settings"
          >
            <span className="material-symbols-outlined text-2xl font-bold">settings</span>
          </Link>
        </div>
      </div>

      {/* COLUMN 2: Wider Sub-Navigation Drawer (Only visible when expanded) */}
      {isExpanded && (
        <div className="flex-1 flex flex-col py-6 overflow-hidden bg-surface-container-low animate-fade-in">
          {/* Header depending on activeTab */}
          <div className="px-5 mb-6 flex h-10 items-center justify-between shrink-0">
            <h3 className="text-title-sm font-sans font-bold text-on-surface capitalize">
              {activeTab === "agent" && "Agent Chat"}
              {activeTab === "mail" && "Mailbox"}
              {activeTab === "calendar" && "Calendar"}
              {activeTab === "settings" && "Settings"}
            </h3>
            <button
              type="button"
              onClick={onToggleExpanded}
              title="Collapse Sidebar"
              className="text-on-surface-variant hover:bg-surface-container-high p-1 rounded-lg transition"
            >
              <span className="material-symbols-outlined text-lg">left_panel_close</span>
            </button>
          </div>

          {/* Content Pane */}
          <div className="flex-grow overflow-y-auto px-3 space-y-4">
            {/* AGENT TAB */}
            {activeTab === "agent" && (
              <div className="flex h-full min-h-0 flex-col gap-4">
                {/* New Chat Button */}
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  className="w-full py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                  New Chat
                </button>

                {/* Chat list */}
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                  {rooms.length === 0 ? (
                    <p className="px-2 py-1 text-[10px] italic text-on-surface-variant/40">
                      No chats yet
                    </p>
                  ) : (
                    rooms.map((room) => {
                      const isRoomActive =
                        pathname === "/chat" &&
                        searchParams.get("roomId") === room.id;
                      return (
                        <Link
                          key={room.id}
                          href={`/chat?roomId=${room.id}`}
                          className={`block truncate rounded-lg px-3 py-1.5 text-xs transition-colors ${
                            isRoomActive
                              ? "bg-secondary-container/50 font-semibold text-primary"
                              : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                          }`}
                          title={room.title}
                        >
                          {room.title}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* MAIL TAB */}
            {activeTab === "mail" && (
              <div className="space-y-1">
                {[
                  { to: "/mail?mailbox=inbox", label: "Inbox", icon: "inbox" },
                  { to: "/mail?mailbox=starred", label: "Starred", icon: "star" },
                  { to: "/mail?mailbox=sent", label: "Sent", icon: "send" },
                  { to: "/mail?mailbox=drafts", label: "Drafts", icon: "draft" },
                ].map((item) => {
                  const target = new URL(item.to, "https://tacta.online");
                  const targetMailbox = target.searchParams.get("mailbox");
                  const isActive = pathname.startsWith("/mail") && currentMailbox === targetMailbox;

                  return (
                    <Link
                      key={item.to}
                      href={item.to}
                      className={`gap-3 px-3.5 flex h-9 items-center rounded-xl transition-all ${
                        isActive
                          ? "bg-secondary-container text-on-secondary-container font-semibold shadow-xs"
                          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg shrink-0">{item.icon}</span>
                      <span className="text-xs font-medium font-sans">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* CALENDAR TAB */}
            {activeTab === "calendar" && (
              <div className="space-y-1">
                <Link
                  href="/calendar"
                  className={`gap-3 px-3.5 flex h-9 items-center rounded-xl transition-all bg-secondary-container text-on-secondary-container font-semibold shadow-xs`}
                >
                  <span className="material-symbols-outlined text-lg shrink-0">calendar_month</span>
                  <span className="text-xs font-medium font-sans">Calendar Agenda</span>
                </Link>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="space-y-1">
                <Link
                  href="/settings"
                  className={`gap-3 px-3.5 flex h-9 items-center rounded-xl transition-all bg-secondary-container text-on-secondary-container font-semibold shadow-xs`}
                >
                  <span className="material-symbols-outlined text-lg shrink-0">settings</span>
                  <span className="text-xs font-medium font-sans">Settings Panel</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
