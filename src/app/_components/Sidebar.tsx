"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { authClient } from "~/server/better-auth/client";
import { primaryNavigation } from "../_lib/navigation";
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
  const pathname = usePathname();

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

  async function handleLogout() {
    await authClient.signOut();
    window.location.reload();
  }

  return (
    <aside
      className={`hidden md:flex fixed left-0 top-0 h-full flex-col py-6 bg-surface-container-low border-r border-outline-variant z-45 overflow-hidden transition-[width] duration-200 ${
        isExpanded ? "w-80" : "w-20"
      }`}
    >
      {/* Brand Header */}
      <div className="mb-4 flex h-10 items-center justify-between px-md shrink-0">
        <div
          className="relative flex min-w-0 w-full items-center justify-between gap-md"
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
              className="grid size-10 shrink-0 place-items-center rounded-full text-primary transition-colors hover:bg-surface-container-high"
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
                className="flex h-10 items-center text-primary"
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
                className="grid size-10 shrink-0 place-items-center rounded-full text-primary transition-colors hover:bg-surface-container-high"
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
      <nav className="flex-grow space-y-1 overflow-y-auto overflow-x-hidden">
        {primaryNavigation.map((item) => {
          const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              aria-label={item.label}
              className={`mx-2 flex h-12 items-center gap-md rounded-full px-md transition-all ${
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
                <span className="whitespace-nowrap font-sans text-label-lg transition-opacity duration-150">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>


    </aside>
  );
}
