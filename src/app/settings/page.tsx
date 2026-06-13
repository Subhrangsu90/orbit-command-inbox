"use client";

import { useState } from "react";
import { 
  User, 
  Sliders,
  CheckCircle2,
  AlertCircle,
  Settings,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { useWorkspacePreferences } from "~/app/_components/workspacePreferencesContext";
import { AppearanceSettingsPanel } from "~/app/_components/ThemeControls";
import { authClient } from "~/server/better-auth/client";
import { Card } from "~/app/_components/ui/card";
import { Button } from "~/app/_components/ui/button";
import { GmailIcon, GoogleCalendarIcon } from "~/app/_components/ui/icons";
import { api } from "~/trpc/react";

export default function SettingsPage() {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const { preferences, updatePreferences, isSaving, isLoading, provider } = useWorkspacePreferences();
  const [activeTab, setActiveTab] = useState<"general" | "integrations">("general");

  // Integrations query & mutations
  const { data: connections, isLoading: isLoadingConnections, refetch } = api.integrations.getStatus.useQuery();
  const disconnectGmailMutation = api.integrations.disconnectGmail.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });
  const disconnectCalendarMutation = api.integrations.disconnectCalendar.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const getGmailUrlMutation = api.integrations.getGmailConnectUrl.useMutation();
  const getCalendarUrlMutation = api.integrations.getCalendarConnectUrl.useMutation();

  async function handleConnect(plugin: "gmail" | "googlecalendar") {
    try {
      if (plugin === "gmail") {
        const { url } = await getGmailUrlMutation.mutateAsync({ redirectTo: "/chat" });
        window.location.href = url;
      } else {
        const { url } = await getCalendarUrlMutation.mutateAsync({ redirectTo: "/chat" });
        window.location.href = url;
      }
    } catch (e) {
      console.error(`Failed to generate connect URL for ${plugin}:`, e);
    }
  }

  async function handleDisconnect(plugin: "gmail" | "googlecalendar") {
    try {
      if (plugin === "gmail") {
        await disconnectGmailMutation.mutateAsync();
      } else {
        await disconnectCalendarMutation.mutateAsync();
      }
    } catch (e) {
      console.error(`Failed to disconnect ${plugin}:`, e);
    }
  }

  return (
    <WorkspaceLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-outline-variant bg-gradient-to-r from-surface-container via-surface-container/90 to-primary/5 p-8 shadow-sm">
          <div className="absolute -top-24 -right-24 size-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Settings className="size-3.5" /> Workspace Config
              </div>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-on-surface">Settings Dashboard</h2>
              <p className="text-on-surface-variant text-sm">
                Configure your user profile, adjust system-wide accessibility appearance preferences, and orchestrate connected service integrations.
              </p>
            </div>
            
            {/* Quick Status Pill */}
            <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant rounded-2xl p-4 self-start md:self-center shadow-inner">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="text-left">
                <p className="text-[10px] text-on-surface-variant leading-none font-bold uppercase tracking-wider">Workspace Node</p>
                <p className="text-xs font-semibold text-on-surface mt-1">Status: Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab System */}
        <div className="flex border-b border-outline-variant gap-2 select-none">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-colors duration-150 ${
              activeTab === "general"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <User className="size-4" /> General Settings
          </button>
          <button
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-colors duration-150 ${
              activeTab === "integrations"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Workflow className="size-4" /> Integrations & Plugins
          </button>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === "general" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Profile Card */}
              {user && (
                <Card className="bg-surface-container border border-outline-variant p-6 rounded-2xl shadow-sm flex flex-col justify-between min-h-[300px]">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="size-4.5 text-primary" />
                        <span className="font-semibold text-sm">User Profile</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="size-3" /> Verified
                      </span>
                    </div>

                    <div className="flex items-center gap-5">
                      {user.image ? (
                        <div className="relative p-1 rounded-full border border-primary/20 bg-surface-container-high shadow-inner">
                          <img src={user.image} alt={user.name} className="size-16 rounded-full object-cover border border-outline shadow-sm" />
                        </div>
                      ) : (
                        <div className="size-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xl shadow-md border border-primary/20">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="space-y-1">
                        <h3 className="font-serif text-lg font-bold text-on-surface leading-tight">{user.name}</h3>
                        <p className="text-xs text-on-surface-variant font-medium">{user.email}</p>
                        <p className="text-[10px] text-on-surface-variant/70 font-semibold tracking-wide">
                          MEMBER SINCE {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-outline-variant/50 flex justify-between items-center">
                    <span className="text-2xs text-on-surface-variant">Auth Provider</span>
                    {provider && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-container text-on-primary-container border border-primary/10 shadow-sm">
                        {provider === "google" && (
                          <>
                            <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                            </svg>
                            <span>Google Account</span>
                          </>
                        )}
                        {provider === "github" && (
                          <>
                            <svg className="size-3.5 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                            </svg>
                            <span>GitHub OAuth</span>
                          </>
                        )}
                        {provider === "credential" && (
                          <>
                            <span className="material-symbols-outlined text-xs leading-none">key</span>
                            <span>Secure Credentials</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Control Panel */}
              <Card className="bg-surface-container border border-outline-variant p-6 rounded-2xl shadow-sm flex flex-col justify-between min-h-[300px]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-outline-variant pb-3 mb-2">
                    <Sliders className="size-4.5 text-primary" />
                    <span className="font-semibold text-sm">Appearance & Accessibility</span>
                  </div>
                  
                  <AppearanceSettingsPanel appearance={preferences} onAppearanceChange={updatePreferences} />
                </div>
                
                {(isLoading || isSaving) && (
                  <div className="mt-4 text-xs text-primary font-semibold animate-pulse flex items-center gap-2">
                    <span className="size-1.5 bg-primary rounded-full animate-ping" />
                    {isSaving ? "Saving system preferences..." : "Loading system configuration..."}
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "integrations" && (
            <Card className="bg-surface-container border border-outline-variant p-6 rounded-2xl shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-icon-md leading-none">integration_instructions</span>
                    <span className="font-semibold text-sm">Service Connections</span>
                  </div>
                  <p className="text-3xs text-on-surface-variant">Manage connections to read events and automate communication flows.</p>
                </div>
                {isLoadingConnections && (
                  <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gmail Connection Card */}
                <div className="p-5 bg-surface-container-low border border-outline-variant rounded-xl flex flex-col justify-between gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-xl bg-surface-container-high border border-outline-variant shadow-inner p-2.5">
                        <GmailIcon className="size-full" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-on-surface">Gmail Integration</h4>
                        <p className="text-3xs text-on-surface-variant font-medium">Orchestrate emails with commands</p>
                      </div>
                    </div>
                    {connections?.gmail ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-3xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="size-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 text-3xs font-semibold text-on-surface-variant border border-outline-variant">
                        <AlertCircle className="size-3" /> Inactive
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-outline-variant/30 pt-4">
                    <span className="text-[10px] text-on-surface-variant font-medium">Auto-Sync status: ON</span>
                    {connections?.gmail ? (
                      <Button
                        variant="error"
                        size="sm"
                        loading={disconnectGmailMutation.isPending}
                        onClick={() => void handleDisconnect("gmail")}
                        className="rounded-lg !py-1.5 !px-2.5 text-2xs font-semibold shadow-sm"
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={getGmailUrlMutation.isPending}
                        onClick={() => void handleConnect("gmail")}
                        className="rounded-lg !py-1.5 !px-3 text-2xs font-semibold shadow-sm"
                      >
                        Connect Gmail
                      </Button>
                    )}
                  </div>
                </div>

                {/* Google Calendar Connection Card */}
                <div className="p-5 bg-surface-container-low border border-outline-variant rounded-xl flex flex-col justify-between gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-xl bg-surface-container-high border border-outline-variant shadow-inner p-2.5">
                        <GoogleCalendarIcon className="size-full" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-on-surface">Google Calendar</h4>
                        <p className="text-3xs text-on-surface-variant font-medium">Scheduled invites & agenda triage</p>
                      </div>
                    </div>
                    {connections?.calendar ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-3xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="size-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 text-3xs font-semibold text-on-surface-variant border border-outline-variant">
                        <AlertCircle className="size-3" /> Inactive
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-outline-variant/30 pt-4">
                    <span className="text-[10px] text-on-surface-variant font-medium">Auto-Sync status: ON</span>
                    {connections?.calendar ? (
                      <Button
                        variant="error"
                        size="sm"
                        loading={disconnectCalendarMutation.isPending}
                        onClick={() => void handleDisconnect("googlecalendar")}
                        className="rounded-lg !py-1.5 !px-2.5 text-2xs font-semibold shadow-sm"
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={getCalendarUrlMutation.isPending}
                        onClick={() => void handleConnect("googlecalendar")}
                        className="rounded-lg !py-1.5 !px-3 text-2xs font-semibold shadow-sm"
                      >
                        Connect Calendar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
