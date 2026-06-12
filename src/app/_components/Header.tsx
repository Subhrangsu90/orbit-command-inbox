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
  const { appearance, isLoading, isSaving, updatePreferences, provider } = useWorkspacePreferences();

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
        {provider && (
          <div className="flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-semibold text-on-surface-variant select-none border border-outline-variant shadow-sm mr-1">
            {provider === "google" && (
              <>
                <svg className="size-4" viewBox="0 0 24 24" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-[10px]">Google</span>
              </>
            )}
            {provider === "github" && (
              <>
                <svg className="size-4 text-on-surface" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
                <span className="text-[10px]">GitHub</span>
              </>
            )}
            {provider !== "google" && provider !== "github" && (
              <>
                <span className="material-symbols-outlined text-[14px]">key</span>
                <span className="capitalize text-[10px]">{provider}</span>
              </>
            )}
          </div>
        )}
        <span className="hidden font-sans text-label-lg text-on-surface-variant md:block">
          Last synced: just now
        </span>
        <ThemeToggleButton
          appearance={appearance}
          disabled={isLoading || isSaving}
          onAppearanceChange={(nextAppearance) =>
            void updatePreferences(nextAppearance).catch(() => undefined)
          }
        />
        <Link
          aria-label="Open profile"
          className="rounded-full"
          title="Profile Settings"
          href="/settings"
        >
          <img
            alt="User profile avatar"
            className="size-8 rounded-full border border-outline object-cover shadow-sm"
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
