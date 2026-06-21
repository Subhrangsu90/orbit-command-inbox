"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { authClient } from "~/server/better-auth/client";
import { useWorkspacePreferences } from "~/app/_components/workspacePreferencesContext";
import { api } from "~/trpc/react";
import { Logo } from "~/app/_components/Logo";
import { Button } from "~/app/_components/ui/button";
import { IntegrationConnectionList } from "~/app/_components/integrations/IntegrationConnectionList";

export default function OnboardingPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const { preferences, isLoading: isLoadingPrefs, refetchPreferences } = useWorkspacePreferences();

  // Integrations query (used to determine finish button label)
  const { data: connections } = api.integrations.getStatus.useQuery(undefined, {
    enabled: !!session.data,
  });

  const completeOnboardingMutation = api.preferences.completeOnboarding.useMutation();

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

      <div className="w-full max-w-2xl space-y-8 bg-surface-container/60 backdrop-blur-md border border-outline-variant p-8 md:p-12 rounded-[2rem] shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-primary/5">
        
        {/* Glow corner accent */}
        <div className="absolute -top-16 -right-16 size-44 bg-gradient-to-br from-primary/20 to-secondary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col items-center text-center space-y-5">
          <div className="p-3 bg-surface-container-high rounded-2xl border border-outline-variant shadow-inner scale-110">
            <Logo showText={false} size={36} />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-on-surface flex items-center justify-center gap-2">
              Get Started with Tacta <Sparkles className="size-5 text-primary animate-pulse" />
            </h1>
            <p className="text-sm text-on-surface-variant mx-auto leading-relaxed">
              Connect your communication platforms to unlock automatic command triage and event scheduling.
            </p>
          </div>
        </div>

        {/* Integration Cards */}
        <IntegrationConnectionList variant="onboarding" />

        {/* Footer Actions */}
        <div className="pt-6 max-w-[32rem] mx-auto border-t border-outline-variant flex flex-col items-center gap-3">
          <Button
            variant="primary"
            size="md"
            loading={completeOnboardingMutation.isPending}
            onClick={() => void handleFinish()}
            className="w-full !rounded-2xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
          >
            {connections?.gmail || connections?.calendar ? "Finish Setup & Launch" : "Launch Workspace"}
            <ArrowRight className="size-4" />
          </Button>
          
          <Button
            variant="text"
            size="sm"
            onClick={() => void handleFinish()}
            className="text-on-surface-variant hover:text-on-surface text-2xs font-semibold transition hover:underline"
          >
            Skip for now (you can connect later in Settings)
          </Button>
        </div>

      </div>
    </div>
  );
}
