"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileNavigation } from "./MobileNavigation";
import { authClient } from "~/server/better-auth/client";

export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Redirect to login if not authenticated (handled in side effect)
  useEffect(() => {
    if (!session.isPending && !session.data) {
      router.replace("/login");
    }
  }, [session.isPending, session.data, router]);

  // Show premium loading state while session is being verified
  if (session.isPending || !session.data) {
    return (
      <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center gap-4">
        <div className="size-10 rounded-xl bg-primary text-on-primary flex items-center justify-center animate-pulse shadow-sm">
          <span className="material-symbols-outlined text-icon-lg animate-spin">sync</span>
        </div>
        <p className="text-xs text-on-surface-variant animate-pulse font-semibold tracking-wider uppercase">
          Verifying Workspace Session...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-on-background">
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
        
        <main className="mx-auto w-full max-w-6xl flex-grow space-y-xl p-gutter pb-24 md:pb-gutter">
          {children}
        </main>
        
        <Footer />
      </div>

      <MobileNavigation />
    </div>
  );
}
