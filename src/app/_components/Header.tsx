"use client";

import Link from "next/link";
import { ThemeToggleButton } from "./ThemeControls";
import { useWorkspacePreferences } from "./workspacePreferencesContext";
import { authClient } from "~/server/better-auth/client";
import { Logo } from "./Logo";

type HeaderProps = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
};

const fallbackAvatar =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD0ApEj0CWHUBFrLe2rHkZsV4JJOTOU0KOcnS3HTx5Rd4bgGPXqWarJl5vD2SjO7jubyiRRe31Y4qOvtlj6QS2S6MZE7xeXaekrvBOI_enOyfJSuZCuMnoSTbDaFFM2_81HHf7UMdLhF9WFc2sQf4YqIlKPnrjlRWfQIzByr_gLqWtiGylcSDtI2vVcadW0bgoiSDiezMPikL8fFWDUhlq4fPv6mc3_RzixWxl6-iOMeAS4XpeeO-qU6ViMAwgiQn3bswwBjsE3nZzu";

export function Header({ user }: HeaderProps) {
  const { preferences, appearance, isLoading, isSaving, updatePreferences } = useWorkspacePreferences();

  async function handleLogout() {
    await authClient.signOut();
    window.location.reload();
  }

  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-outline-variant bg-surface px-margin py-sm">
      <div className="flex items-center gap-md">
        <Logo showText={true} size={28} />
      </div>
      <div className="flex items-center gap-sm">
        <ThemeToggleButton
          appearance={appearance}
          disabled={isLoading || isSaving}
          onAppearanceChange={(nextAppearance) =>
            void updatePreferences(nextAppearance).catch(() => undefined)
          }
        />
        
        {/* Settings Gear Button with custom shortcut tooltip */}
        <Link
          aria-label="Open settings"
          className="grid size-10 place-items-center rounded-full text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-primary relative group"
          title={`Settings (${preferences.settingsShortcut || "Alt+s"})`}
          href="/settings"
        >
          <span className="material-symbols-outlined text-icon-md transition-transform duration-300 group-hover:rotate-45">
            settings
          </span>
        </Link>

        <Link
          aria-label="Open profile"
          className="rounded-full shrink-0"
          title="Profile Settings"
          href="/settings"
        >
          <img
            alt="User profile avatar"
            className="size-8 rounded-full border border-outline object-cover shadow-sm hover:ring-2 hover:ring-primary/20 transition-all"
            src={user?.image || fallbackAvatar}
          />
        </Link>
        
        <button
          aria-label="Log out"
          className="grid size-10 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-error"
          onClick={() => void handleLogout()}
          title="Log out"
          type="button"
        >
          <span className="material-symbols-outlined text-icon-md">logout</span>
        </button>
      </div>
    </header>
  );
}
