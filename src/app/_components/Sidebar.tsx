"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Logo } from "./Logo";
import { authClient } from "~/server/better-auth/client";

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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const utils = api.useUtils();
  const currentMailbox = searchParams.get("mailbox") ?? "inbox";

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.reload();
  };

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
      className={`group bg-surface-container-low border-outline-variant fixed top-0 left-0 z-45 hidden h-full border-r transition-[width] duration-200 md:flex ${
        isExpanded ? "w-70" : "w-18"
      }`}
    >
      {/* COLUMN 1: Narrow Left Icon Strip (Always visible) */}
      <div className="w-18 border-r border-outline-variant/30 flex flex-col items-center py-6 shrink-0 bg-surface-container-lowest">
        {/* Tacta Logo at Top */}
        <div className="mb-8 flex h-10 items-center justify-center">
          <Link
            href="/chat"
            className="text-primary hover:opacity-85 flex size-10 items-center justify-center transition-opacity"
            title="Tacta Home"
          >
            <Logo showText={false} size={24} />
          </Link>
        </div>

        {/* App Icons (Middle) */}
        <div className="flex-grow flex flex-col items-center gap-4 w-full px-2">
          {/* Agent Chat Icon */}
          <Link
            href="/chat"
            onClick={() => {
              if (activeTab === "agent" && !isExpanded) {
                onToggleExpanded();
              }
            }}
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
            onClick={() => {
              if (activeTab === "mail" && !isExpanded) {
                onToggleExpanded();
              }
            }}
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
            onClick={() => {
              if (activeTab === "calendar" && !isExpanded) {
                onToggleExpanded();
              }
            }}
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

        {/* Settings & Profile Popover Trigger (Bottom) */}
        <div className="w-full px-2 relative">
          {isProfileMenuOpen && (
            <div 
              className="fixed inset-0 z-40 cursor-default" 
              onClick={() => setIsProfileMenuOpen(false)} 
            />
          )}

          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className={`flex items-center justify-center size-12 rounded-2xl transition-all relative z-50 cursor-pointer ${
              isProfileMenuOpen || activeTab === "settings"
                ? "bg-secondary-container text-on-secondary-container font-semibold shadow-xs"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
            title="Profile & Settings"
          >
            {user?.image ? (
              <img
                src={user.image}
                alt="User Profile"
                className="size-8 rounded-full object-cover border border-outline-variant/50"
              />
            ) : (
              <div className="size-8 rounded-full bg-surface-container text-on-surface flex items-center justify-center font-bold text-xs border border-outline-variant/30">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
            )}
          </button>

          {/* Upward Popover Menu */}
          {isProfileMenuOpen && (
            <div className="absolute bottom-14 left-4 z-50 w-60 rounded-2xl bg-surface border border-outline-variant text-on-surface shadow-2xl p-2 animate-scale-in flex flex-col font-sans">
              
              {/* Profile Header */}
              <div className="flex items-center gap-3 p-3 border-b border-outline-variant/30">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt="User Profile"
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-8 rounded-full bg-surface-container text-on-surface flex items-center justify-center font-bold text-xs">
                    {user?.name?.charAt(0).toUpperCase() ?? "U"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-on-surface truncate">{user?.name}</p>
                  <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{user?.email}</p>
                </div>
              </div>

              {/* Menu Links */}
              <div className="py-1 space-y-0.5">
                <Link
                  href="/settings?tab=account"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (activeTab === "settings" && !isExpanded) onToggleExpanded();
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs hover:bg-surface-container-high hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-base leading-none text-on-surface-variant/70">
                    account_circle
                  </span>
                  <span>Profile</span>
                </Link>

                <Link
                  href="/settings?tab=appearance"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (activeTab === "settings" && !isExpanded) onToggleExpanded();
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs hover:bg-surface-container-high hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-base leading-none text-on-surface-variant/70">
                    palette
                  </span>
                  <span>Personalization</span>
                </Link>

                <Link
                  href="/settings?tab=appearance"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (activeTab === "settings" && !isExpanded) onToggleExpanded();
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs hover:bg-surface-container-high hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-base leading-none text-on-surface-variant/70">
                    settings
                  </span>
                  <span>Settings</span>
                </Link>

                <Link
                  href="/settings?tab=shortcuts"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (activeTab === "settings" && !isExpanded) onToggleExpanded();
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs hover:bg-surface-container-high hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-base leading-none text-on-surface-variant/70">
                    keyboard
                  </span>
                  <span>Keyboard shortcuts</span>
                </Link>

                <Link
                  href="/settings?tab=integrations"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (activeTab === "settings" && !isExpanded) onToggleExpanded();
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs hover:bg-surface-container-high hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-base leading-none text-on-surface-variant/70">
                    extension
                  </span>
                  <span>Connected services</span>
                </Link>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    void handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs hover:bg-error/10 hover:text-error transition-colors text-left cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base leading-none text-on-surface-variant/70">
                    logout
                  </span>
                  <span>Log out</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* COLUMN 2: Wider Sub-Navigation Drawer (Only visible when expanded) */}
      {isExpanded && (
        <div className="flex-1 flex flex-col py-6 overflow-hidden bg-surface-container-low animate-fade-in">
          {/* Header depending on activeTab */}
          <div className="px-5 mb-6 flex h-10 items-center shrink-0">
            <h3 className="text-title-sm font-sans font-bold text-on-surface capitalize">
              {activeTab === "agent" && "Agent Chat"}
              {activeTab === "mail" && "Mailbox"}
              {activeTab === "calendar" && "Calendar"}
              {activeTab === "settings" && "Settings"}
            </h3>
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

      {/* Floating Border Toggle Button */}
      <button
        type="button"
        onClick={onToggleExpanded}
        title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        className="absolute top-[30px] -right-3.5 z-50 bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface-variant flex size-7 items-center justify-center rounded border border-outline-variant shadow-md transition-all duration-200 cursor-pointer group/btn opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto"
      >
        <span className="material-symbols-outlined text-base transition-transform duration-150 select-none">
          {isExpanded ? "left_panel_close" : "left_panel_open"}
        </span>
      </button>
    </aside>
  );
}
