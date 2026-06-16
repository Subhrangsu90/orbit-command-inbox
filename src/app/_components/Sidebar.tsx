"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { authClient } from "~/server/better-auth/client";
import { primaryNavigationGroups } from "../_lib/navigation";
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

const fallbackAvatar =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBapolA7_kFN-5tyUgt014ox7TJNYqSact834XOLnputn0OtiraG2YjffWlUXRzxtH2Coz0Gln3Or_9lbFcc8LGLYk_pjhtH3cWbGcsGmD5Cy-Q90Rq9VBXyDSfALCKJ1eK5ztl6LMJ0A9rHgmEL6OaiaUKyNvq0NXwqsbDe8khwphtwe1sFmXVmuMzJlen0venVqiMSrKp_HpFwlk9T6PcYyaJ1UIn4nv0Bz4KltkGcWs2AIpAr0e5UENZerN18Jczc7AebQNBveWk";

export function Sidebar({ user, isExpanded, onToggleExpanded }: SidebarProps) {
  const [isBrandHovered, setIsBrandHovered] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>("Email");
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
    createRoomMutation.mutate({ title: `Conversation #${rooms.length + 1}` });
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches && isExpanded) {
        onToggleExpanded();
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    if (mediaQuery.matches && isExpanded) {
      onToggleExpanded();
    }
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [isExpanded, onToggleExpanded]);

  useEffect(() => {
    if (pathname === "/") {
      setOpenGroup("Email");
    }
  }, [pathname]);

  async function handleLogout() {
    await authClient.signOut();
    window.location.reload();
  }

  return (
    <aside
      className={`bg-surface-container-low border-outline-variant fixed top-0 left-0 z-45 hidden h-full flex-col overflow-hidden border-r py-6 transition-[width] duration-200 md:flex ${
        isExpanded ? "w-80" : "w-20"
      }`}
    >
      {/* Brand Header */}
      <div className="px-md mb-4 flex h-10 shrink-0 items-center justify-between">
        <div
          className="gap-md relative flex w-full min-w-0 items-center justify-between"
          onMouseEnter={() => setIsBrandHovered(true)}
          onMouseLeave={() => setIsBrandHovered(false)}
        >
          {/* Collapsed state */}
          {!isExpanded && (
            <button
              type="button"
              onClick={onToggleExpanded}
              aria-label="Expand sidebar"
              aria-expanded={isExpanded}
              title="Expand sidebar"
              className="text-primary hover:bg-surface-container-high grid size-10 shrink-0 place-items-center rounded-full transition-colors"
            >
              {isBrandHovered ? (
                <span className="material-symbols-outlined">
                  left_panel_open
                </span>
              ) : (
                <Logo showText={false} size={24} />
              )}
            </button>
          )}

          {/* Expanded state */}
          {isExpanded && (
            <>
              <div
                aria-label="Orbit"
                className="text-primary flex h-10 items-center"
                title="Orbit"
              >
                <Logo showText={true} size={24} />
              </div>
              <button
                type="button"
                onClick={onToggleExpanded}
                aria-label="Collapse sidebar"
                aria-expanded={isExpanded}
                title="Collapse sidebar"
                className="text-primary hover:bg-surface-container-high grid size-10 shrink-0 place-items-center rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">
                  left_panel_close
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-grow space-y-1 overflow-x-hidden overflow-y-auto">
        {primaryNavigationGroups.map((group, groupIndex) => {
          const isGroupOpen = group.label === openGroup;
          const isGroupActive = group.items.some((item) => {
            const target = new URL(item.to, "https://orbit.local");
            const targetMailbox = target.searchParams.get("mailbox");

            return targetMailbox
              ? pathname === "/" && currentMailbox === targetMailbox
              : item.exact
                ? pathname === target.pathname
                : pathname.startsWith(target.pathname);
          });
          const submenuId = group.label
            ? `${group.label.toLowerCase()}-submenu`
            : undefined;

          return (
            <div
              key={group.label ?? `navigation-group-${groupIndex}`}
              className={
                groupIndex > 0
                  ? "border-outline-variant mx-2 mt-3 border-t pt-3"
                  : undefined
              }
            >
              {group.label && (
                <button
                  type="button"
                  aria-controls={submenuId}
                  aria-expanded={isExpanded && isGroupOpen}
                  aria-label={`${isGroupOpen ? "Collapse" : "Expand"} ${group.label} menu`}
                  title={group.label}
                  onClick={() => {
                    if (!isExpanded) {
                      setOpenGroup(group.label ?? null);
                      onToggleExpanded();
                      return;
                    }

                    setOpenGroup(isGroupOpen ? null : (group.label ?? null));
                  }}
                  className={`gap-md px-md mx-2 flex h-12 w-[calc(100%-1rem)] items-center rounded-full text-left transition-colors ${
                    isGroupActive
                      ? "text-on-secondary-container bg-secondary-container/60 font-bold"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {group.icon && (
                    <span className="material-symbols-outlined shrink-0">
                      {group.icon}
                    </span>
                  )}
                  {isExpanded && (
                    <>
                      <span className="text-label-lg flex-1 font-sans whitespace-nowrap">
                        {group.label}
                      </span>
                      <span
                        className={`material-symbols-outlined text-xl transition-transform duration-200 ${
                          isGroupOpen ? "rotate-180" : ""
                        }`}
                      >
                        expand_more
                      </span>
                    </>
                  )}
                </button>
              )}

              <div
                id={submenuId}
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  group.label
                    ? isExpanded && isGroupOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                    : "grid-rows-[1fr] opacity-100"
                }`}
              >
                <div className="overflow-hidden">
                  <div
                    className={`space-y-1 ${
                      group.label
                        ? "border-outline-variant mt-1 ml-8 border-l pl-2"
                        : ""
                    }`}
                  >
                    {group.items.map((item) => {
                      const target = new URL(item.to, "https://orbit.local");
                      const targetMailbox = target.searchParams.get("mailbox");
                      const isActive = targetMailbox
                        ? pathname === "/" && currentMailbox === targetMailbox
                        : item.exact
                          ? pathname === target.pathname
                          : pathname.startsWith(target.pathname);

                      return (
                        <div key={item.to} className="space-y-1">
                          <Link
                            aria-label={item.label}
                            className={`gap-md px-md flex h-12 items-center rounded-full transition-all ${
                              group.label ? "mr-2 h-10" : "mx-0"
                            } ${
                              isActive
                                ? "bg-secondary-container text-on-secondary-container font-bold shadow-sm"
                                : "text-on-surface-variant hover:bg-surface-container-high"
                            }`}
                            title={item.label}
                            href={item.to}
                          >
                            <span className="material-symbols-outlined shrink-0">
                              {item.icon}
                            </span>
                            {isExpanded && (
                              <span className="text-label-lg font-sans whitespace-nowrap transition-opacity duration-150">
                                {item.label}
                              </span>
                            )}
                          </Link>

                          {/* Render recent chat rooms under "Agent Chat" when sidebar is expanded */}
                          {item.to === "/chat" && isExpanded && (
                            <div className="pl-6 pr-2 py-1 space-y-1 border-l border-outline-variant/60 ml-5 mt-1">
                              <div className="flex items-center justify-between pl-2 pb-1 pr-1">
                                <p className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-wider">
                                  Recents
                                </p>
                                <button
                                  type="button"
                                  onClick={handleCreateRoom}
                                  disabled={createRoomMutation.isPending}
                                  title="New Chat"
                                  className="text-primary hover:bg-surface-container-high p-0.5 rounded transition-colors flex items-center justify-center"
                                >
                                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                                </button>
                              </div>
                              {rooms.length === 0 ? (
                                <p className="text-[11px] text-on-surface-variant/50 italic pl-2 py-1">No recent chats</p>
                              ) : (
                                rooms.slice(0, 8).map((room) => {
                                  const isRoomActive =
                                    pathname === "/chat" &&
                                    searchParams.get("roomId") === room.id;
                                  return (
                                    <Link
                                      key={room.id}
                                      href={`/chat?roomId=${room.id}`}
                                      className={`block truncate px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                        isRoomActive
                                          ? "bg-secondary-container/50 text-primary font-semibold"
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
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
