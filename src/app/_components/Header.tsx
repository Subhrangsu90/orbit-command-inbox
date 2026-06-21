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
    <header className="sticky top-0 z-40 flex w-full min-w-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface px-3 py-sm sm:px-margin">
      <div className="flex min-w-0 items-center gap-md">
        <Logo showText={true} className="[&_span]:hidden [&_span]:sm:inline-block" size={28} />
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-sm">
        <ThemeToggleButton
          appearance={appearance}
          disabled={isLoading || isSaving}
          onAppearanceChange={(nextAppearance) =>
            void updatePreferences(nextAppearance).catch(() => undefined)
          }
        />
        

        <Link
          aria-label="Open profile"
          className="shrink-0 rounded-full md:hidden"
          title="Profile Settings"
          href="/settings?tab=account"
        >
          <img
            alt="User profile avatar"
            className="size-8 rounded-full border border-outline object-cover shadow-sm transition-all hover:ring-2 hover:ring-primary/20"
            src={user?.image || fallbackAvatar}
          />
        </Link>
        
        <button
          aria-label="Log out"
          className="grid size-9 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-error sm:size-10 md:hidden"
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
