"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileNavigation } from "./MobileNavigation";
import { authClient } from "~/server/better-auth/client";
import { useWorkspacePreferences } from "./workspacePreferencesContext";

export function WorkspaceLayout({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const { preferences, isLoading: isLoadingPrefs } = useWorkspacePreferences();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session.isPending && !session.data) {
      router.replace("/login");
    }
  }, [session.isPending, session.data, router]);

  // Redirect to onboarding if authenticated but onboarding is incomplete
  useEffect(() => {
    if (
      !session.isPending &&
      session.data &&
      !isLoadingPrefs &&
      !preferences.onboarded
    ) {
      router.replace("/onboarding");
    }
  }, [
    session.isPending,
    session.data,
    isLoadingPrefs,
    preferences.onboarded,
    router,
  ]);

  // Show premium loading state while session is being verified
  if (session.isPending || !session.data) {
    return (
      <div className="bg-background text-on-surface flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="bg-primary text-on-primary flex size-10 animate-pulse items-center justify-center rounded-xl shadow-sm">
          <span className="material-symbols-outlined text-icon-lg animate-spin">
            sync
          </span>
        </div>
        <p className="text-on-surface-variant animate-pulse text-xs font-semibold tracking-wider uppercase">
          Verifying Workspace Session...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background flex min-h-screen">
      <Sidebar
        isExpanded={isSidebarExpanded}
        onToggleExpanded={() =>
          setIsSidebarExpanded((isExpanded) => !isExpanded)
        }
        user={user}
      />

      <div
        className={`flex min-h-screen flex-grow flex-col transition-[margin] duration-200 ${
          isSidebarExpanded ? "md:ml-80" : "md:ml-20"
        }`}
      >
        <Header user={user} />

        <main
          className={`space-y-xl p-gutter md:pb-gutter mx-auto w-full flex-grow pb-24 ${
            wide ? "max-w-[1600px]" : "max-w-6xl"
          }`}
        >
          {children}
        </main>

        <Footer />
      </div>

      <MobileNavigation />
    </div>
  );
}
