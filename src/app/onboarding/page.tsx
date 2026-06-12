"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, CalendarDays, CheckCircle2, ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import { authClient } from "~/server/better-auth/client";
import { useWorkspacePreferences } from "~/app/_components/workspacePreferencesContext";
import { api } from "~/trpc/react";
import { Logo } from "~/app/_components/Logo";

export default function OnboardingPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const { preferences, isLoading: isLoadingPrefs, refetchPreferences } = useWorkspacePreferences();

  // Corsair integration query & mutations
  const { data: connections, isLoading: isLoadingConnections, refetch: refetchConnections } = api.corsair.getConnections.useQuery(undefined, {
    enabled: !!session.data,
  });

  const completeOnboardingMutation = api.preferences.completeOnboarding.useMutation();
  const disconnectMutation = api.corsair.disconnect.useMutation({
    onSuccess: () => {
      void refetchConnections();
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session.isPending && !session.data) {
      router.replace("/login");
    }
  }, [session.isPending, session.data, router]);

  // Redirect to home if already onboarded
  useEffect(() => {
    if (!session.isPending && session.data && !isLoadingPrefs && preferences.onboarded) {
      router.replace("/");
    }
  }, [session.isPending, session.data, isLoadingPrefs, preferences.onboarded, router]);

  function handleConnect(plugin: "gmail" | "googlecalendar") {
    window.location.href = `/api/corsair/auth?plugin=${plugin}`;
  }

  async function handleDisconnect(plugin: "gmail" | "googlecalendar") {
    try {
      await disconnectMutation.mutateAsync({ plugin });
    } catch (e) {
      console.error(`Failed to disconnect ${plugin}:`, e);
    }
  }

  async function handleFinish() {
    try {
      await completeOnboardingMutation.mutateAsync();
      await refetchPreferences();
      router.push("/");
    } catch (e) {
      console.error("Failed to complete onboarding:", e);
    }
  }

  if (session.isPending || !session.data || isLoadingPrefs) {
    return (
      <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center gap-4">
        <div className="size-10 rounded-xl bg-primary text-on-primary flex items-center justify-center animate-pulse shadow-sm">
          <span className="material-symbols-outlined text-icon-lg animate-spin">sync</span>
        </div>
        <p className="text-xs text-on-surface-variant animate-pulse font-semibold tracking-wider uppercase">
          Loading Onboarding...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-background via-background to-primary/5 text-on-background flex flex-col items-center justify-center p-gutter relative overflow-hidden">
      {/* Background radial blobs for visual depth */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 size-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 size-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full space-y-8 bg-surface-container/60 backdrop-blur-md border border-outline-variant p-8 md:p-12 rounded-[2rem] shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-primary/5">
        
        {/* Glow corner accent */}
        <div className="absolute -top-16 -right-16 size-44 bg-gradient-to-br from-primary/20 to-secondary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col items-center text-center space-y-5">
          <div className="p-3 bg-surface-container-high rounded-2xl border border-outline-variant shadow-inner scale-110">
            <Logo showText={false} size={36} />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-on-surface flex items-center justify-center gap-2">
              Get Started with Orbit <Sparkles className="size-5 text-primary animate-pulse" />
            </h1>
            <p className="text-sm text-on-surface-variant mx-auto leading-relaxed">
              Connect your communication platforms to unlock automatic command triage and event scheduling.
            </p>
          </div>
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          
          {/* Gmail Card */}
          <div className={`p-6 border rounded-2xl flex flex-col justify-between gap-6 transition-all duration-200 ${
            connections?.gmail 
              ? "bg-primary/5 border-primary/20 shadow-sm" 
              : "bg-surface-container-low border-outline-variant hover:border-outline"
          }`}>
            <div className="space-y-3">
              <div className={`size-10 rounded-xl grid place-items-center ${
                connections?.gmail ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
              }`}>
                <Mail className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface">Gmail Account</h3>
                <p className="text-2xs text-on-surface-variant leading-relaxed mt-1">
                  Read, route, and compose emails automatically via command rules.
                </p>
              </div>
            </div>

            <div className="pt-2">
              {connections?.gmail ? (
                <div className="flex flex-col gap-2">
                  <span className="inline-flex self-start items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-3" /> Connected
                  </span>
                  <button
                    onClick={() => void handleDisconnect("gmail")}
                    className="text-3xs font-semibold text-error hover:underline text-left"
                  >
                    Disconnect account
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnect("gmail")}
                  className="w-full bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-xl text-2xs font-bold transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                >
                  Connect Gmail
                </button>
              )}
            </div>
          </div>

          {/* Calendar Card */}
          <div className={`p-6 border rounded-2xl flex flex-col justify-between gap-6 transition-all duration-200 ${
            connections?.googlecalendar 
              ? "bg-primary/5 border-primary/20 shadow-sm" 
              : "bg-surface-container-low border-outline-variant hover:border-outline"
          }`}>
            <div className="space-y-3">
              <div className={`size-10 rounded-xl grid place-items-center ${
                connections?.googlecalendar ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
              }`}>
                <CalendarDays className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface">Google Calendar</h3>
                <p className="text-2xs text-on-surface-variant leading-relaxed mt-1">
                  Synchronize events, process scheduled invites, and confirm slots.
                </p>
              </div>
            </div>

            <div className="pt-2">
              {connections?.googlecalendar ? (
                <div className="flex flex-col gap-2">
                  <span className="inline-flex self-start items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-3" /> Connected
                  </span>
                  <button
                    onClick={() => void handleDisconnect("googlecalendar")}
                    className="text-3xs font-semibold text-error hover:underline text-left"
                  >
                    Disconnect calendar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnect("googlecalendar")}
                  className="w-full bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-xl text-2xs font-bold transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                >
                  Connect Calendar
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-outline-variant flex flex-col items-center gap-3">
          <button
            onClick={() => void handleFinish()}
            disabled={completeOnboardingMutation.isPending}
            className="w-full bg-primary hover:bg-primary-container text-on-primary py-3 rounded-2xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {connections?.gmail || connections?.googlecalendar ? "Finish Setup & Launch" : "Launch Workspace"}
            <ArrowRight className="size-4" />
          </button>
          
          <button
            onClick={() => void handleFinish()}
            disabled={completeOnboardingMutation.isPending}
            className="text-on-surface-variant hover:text-on-surface text-2xs font-semibold transition hover:underline"
          >
            Skip for now (you can connect later in Settings)
          </button>
        </div>

      </div>
    </div>
  );
}
