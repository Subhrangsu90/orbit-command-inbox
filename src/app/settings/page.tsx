"use client";

import { 
  User, 
  Sliders, 
  Mail,
  CalendarDays,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { useWorkspacePreferences } from "~/app/_components/workspacePreferencesContext";
import { AppearanceSettingsPanel } from "~/app/_components/ThemeControls";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

export default function SettingsPage() {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const { preferences, updatePreferences, isSaving, isLoading, provider } = useWorkspacePreferences();

  // Corsair integration query & mutations
  const { data: connections, isLoading: isLoadingConnections, refetch } = api.corsair.getConnections.useQuery();
  const disconnectMutation = api.corsair.disconnect.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

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

  return (
    <WorkspaceLayout>
      <div className="max-w-3xl space-y-8">
        <div>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-on-surface">Workspace Settings</h2>
          <p className="text-on-surface-variant mt-2 text-sm">
            Manage your profile, adjust visual appearance themes, and connect your Google integrations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-6 items-start">
          
          {/* Left Column: Profile & Appearance */}
          <div className="space-y-6">
            {/* Profile Card */}
            {user && (
              <div className="bg-surface-container border border-outline-variant p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-outline-variant pb-3 mb-2">
                  <User className="size-4 text-primary" />
                  <span className="font-semibold text-sm">User Profile</span>
                </div>
                <div className="flex items-center gap-4">
                  {user.image ? (
                    <img src={user.image} alt={user.name} className="size-14 rounded-full border border-outline-variant shadow-sm" />
                  ) : (
                    <div className="size-14 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shadow-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="font-serif text-base font-bold leading-none">{user.name}</h3>
                    <p className="text-xs text-on-surface-variant">{user.email}</p>
                    <p className="text-[10px] text-on-surface-variant/70">
                      Member since {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    {provider && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {provider === "google" && (
                          <>
                            <svg className="size-3 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                            </svg>
                            <span>Google</span>
                          </>
                        )}
                        {provider === "github" && (
                          <>
                            <svg className="size-3 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                            </svg>
                            <span>GitHub</span>
                          </>
                        )}
                        {provider === "credential" && (
                          <>
                            <svg className="size-3 shrink-0 fill-current animate-pulse" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                            </svg>
                            <span>Email</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Control Panel */}
            <div className="bg-surface-container border border-outline-variant p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-outline-variant pb-3 mb-2">
                <Sliders className="size-4 text-primary" />
                <span className="font-semibold text-sm">Appearance</span>
              </div>
              
              <AppearanceSettingsPanel appearance={preferences} onAppearanceChange={updatePreferences} />
              
              {(isLoading || isSaving) && (
                <div className="text-xs text-primary font-semibold animate-pulse flex items-center gap-2">
                  <span className="size-1.5 bg-primary rounded-full animate-ping" />
                  {isSaving ? "Saving to workspace..." : "Loading preferences..."}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Corsair Integrations */}
          <div className="bg-surface-container border border-outline-variant p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-icon-md leading-none">integration_instructions</span>
                <span className="font-semibold text-sm">Integrations & Plugins</span>
              </div>
              {isLoadingConnections && (
                <span className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>

            <div className="space-y-4">
              {/* Gmail Connection Row */}
              <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-on-surface">Gmail Integration</h4>
                    <p className="text-2xs text-on-surface-variant">Orchestrate emails with commands</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connections?.gmail ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="size-3" /> Connected
                      </span>
                      <button
                        onClick={() => void handleDisconnect("gmail")}
                        className="bg-error/10 hover:bg-error/20 text-error px-2.5 py-1.5 rounded-lg text-2xs font-semibold transition"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-2xs font-semibold text-on-surface-variant border border-outline-variant">
                        <AlertCircle className="size-3" /> Disconnected
                      </span>
                      <button
                        onClick={() => handleConnect("gmail")}
                        className="bg-primary hover:bg-primary-container text-on-primary px-3 py-1.5 rounded-lg text-2xs font-semibold transition shadow-sm"
                      >
                        Connect
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Google Calendar Connection Row */}
              <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-on-surface">Google Calendar</h4>
                    <p className="text-2xs text-on-surface-variant">Manage scheduled events & updates</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connections?.googlecalendar ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="size-3" /> Connected
                      </span>
                      <button
                        onClick={() => void handleDisconnect("googlecalendar")}
                        className="bg-error/10 hover:bg-error/20 text-error px-2.5 py-1.5 rounded-lg text-2xs font-semibold transition"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-2xs font-semibold text-on-surface-variant border border-outline-variant">
                        <AlertCircle className="size-3" /> Disconnected
                      </span>
                      <button
                        onClick={() => handleConnect("googlecalendar")}
                        className="bg-primary hover:bg-primary-container text-on-primary px-3 py-1.5 rounded-lg text-2xs font-semibold transition shadow-sm"
                      >
                        Connect
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </WorkspaceLayout>
  );
}
