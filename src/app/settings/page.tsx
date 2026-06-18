"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { useWorkspacePreferences } from "~/app/_components/workspacePreferencesContext";
import type { WorkspacePreferences } from "~/app/_utils/workspacePreferences";
import { AppearanceSettingsPanel } from "~/app/_components/ThemeControls";
import { authClient } from "~/server/better-auth/client";
import { Button } from "~/app/_components/ui/button";
import { GmailIcon, GoogleCalendarIcon } from "~/app/_components/ui/icons";
import { api } from "~/trpc/react";

const SHORTCUT_GROUPS = [
  {
    label: "Global",
    shortcuts: [
      { key: "settingsShortcut", label: "Open Settings", desc: "Jump to settings from anywhere", default: "Alt+G" },
    ],
  },
  {
    label: "Inbox",
    shortcuts: [
      { key: "shortcutNextEmail", label: "Next Email", desc: "Move selection down", default: "j" },
      { key: "shortcutPrevEmail", label: "Previous Email", desc: "Move selection up", default: "k" },
      { key: "shortcutReadEmail", label: "Open Email", desc: "Open selected email", default: "o" },
      { key: "shortcutTrashEmail", label: "Trash / Delete", desc: "Move to trash", default: "e" },
      { key: "shortcutStarEmail", label: "Star Email", desc: "Toggle star", default: "s" },
      { key: "shortcutComposeEmail", label: "Compose", desc: "Open compose dialog", default: "c" },
      { key: "shortcutRefreshEmail", label: "Refresh", desc: "Sync latest emails", default: "r" },
    ],
  },
  {
    label: "Calendar",
    shortcuts: [
      { key: "shortcutCalendarPrev", label: "Previous Range", desc: "Move calendar back", default: "j" },
      { key: "shortcutCalendarNext", label: "Next Range", desc: "Move calendar forward", default: "k" },
      { key: "shortcutCalendarToday", label: "Go to Today", desc: "Jump to current date", default: "t" },
      { key: "shortcutCalendarCreate", label: "Create Event", desc: "Open create dialog", default: "c" },
      { key: "shortcutCalendarRefresh", label: "Refresh", desc: "Sync calendar events", default: "r" },
    ],
  },
] as const;

type TabId = "account" | "appearance" | "shortcuts" | "integrations";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "account", label: "Account", icon: "person" },
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "shortcuts", label: "Shortcuts", icon: "keyboard" },
  { id: "integrations", label: "Integrations", icon: "extension" },
];

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-on-surface">{title}</h3>
      {description && (
        <p className="mt-0.5 text-xs text-on-surface-variant">{description}</p>
      )}
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
  last = false,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-6 py-4 ${
        !last ? "border-b border-outline-variant/20" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-on-surface">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-on-surface-variant leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const { preferences, updatePreferences, isSaving, isLoading, provider } =
    useWorkspacePreferences();
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [recordingKey, setRecordingKey] = useState<keyof WorkspacePreferences | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleRecordKeyDown = (
    e: React.KeyboardEvent,
    keyName: keyof WorkspacePreferences,
  ) => {
    e.preventDefault();
    if (e.key === "Escape") {
      setRecordingKey(null);
      setValidationError(null);
      return;
    }

    const keys: string[] = [];
    if (e.ctrlKey || e.metaKey) keys.push("Ctrl");
    if (e.altKey) keys.push("Alt");
    if (e.shiftKey) keys.push("Shift");

    const mainKey = e.key;
    if (!["Control", "Alt", "Shift", "Meta"].includes(mainKey)) {
      keys.push(mainKey.length === 1 ? mainKey.toLowerCase() : mainKey);
    }

    if (keys.length > 0) {
      const shortcutStr = keys.join("+");
      const lowerStr = shortcutStr.toLowerCase();

      const reservedKeys = [
        "ctrl+c", "ctrl+v", "ctrl+a", "ctrl+x", "ctrl+z", "ctrl+y", "ctrl+f", "ctrl+p", "ctrl+s", "ctrl+o",
        "ctrl+t", "ctrl+n", "ctrl+w", "ctrl+r", "ctrl+l", "ctrl+d", "ctrl+h", "ctrl+j", "ctrl+q", "ctrl+g",
        "ctrl+shift+i", "ctrl+shift+t", "ctrl+shift+w",
        "meta+c", "meta+v", "meta+a", "meta+x", "meta+z", "meta+y", "meta+s", "meta+f",
        "f5", "f11", "f12", "alt+f4", "alt+tab",
      ];
      if (reservedKeys.includes(lowerStr)) {
        setValidationError(
          `"${shortcutStr}" is a reserved system/browser shortcut.`,
        );
        setTimeout(() => setValidationError(null), 4000);
        return;
      }

      void updatePreferences({ [keyName]: shortcutStr });
      setRecordingKey(null);
      setValidationError(null);
    }
  };

  // Integrations
  const {
    data: connections,
    isLoading: isLoadingConnections,
    error: connectionsError,
    refetch,
  } = api.integrations.getStatus.useQuery();
  const disconnectGmailMutation = api.integrations.disconnectGmail.useMutation({
    onSuccess: () => void refetch(),
  });
  const disconnectCalendarMutation = api.integrations.disconnectCalendar.useMutation({
    onSuccess: () => void refetch(),
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
      <div className="max-w-3xl mx-auto">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-serif text-on-surface tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Manage your account, appearance, shortcuts, and integrations.
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-0.5 border-b border-outline-variant mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-150 -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant"
              }`}
            >
              <span className="material-symbols-outlined text-base leading-none">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── ACCOUNT TAB ── */}
        {activeTab === "account" && user && (
          <div className="space-y-10 animate-fade-in">
            {/* Profile Group */}
            <div>
              <SectionHeader
                title="Profile"
                description="Your identity across the Tacta workspace."
              />
              <div className="flex items-center gap-5 py-4 border-b border-outline-variant/20">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="size-14 rounded-full object-cover border border-outline shadow-sm shrink-0"
                  />
                ) : (
                  <div className="size-14 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xl shadow-sm shrink-0 border border-primary/20">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{user.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">{user.email}</p>
                  <p className="text-[10px] text-on-surface-variant/60 font-semibold uppercase tracking-wider mt-1">
                    Member since {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <SettingRow label="Account Status" last>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="size-3.5" />
                  Verified
                </span>
              </SettingRow>
            </div>

            {/* Auth Provider Group */}
            <div>
              <SectionHeader
                title="Authentication"
                description="How you sign in to your account."
              />
              <SettingRow label="Sign-in method" description="Your current authentication provider" last>
                {provider && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container border border-outline-variant text-on-surface">
                    {provider === "google" && (
                      <>
                        <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                        </svg>
                        Google
                      </>
                    )}
                    {provider === "github" && (
                      <>
                        <svg className="size-3.5 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                        </svg>
                        GitHub
                      </>
                    )}
                    {provider === "credential" && (
                      <>
                        <span className="material-symbols-outlined text-xs leading-none">key</span>
                        Email & Password
                      </>
                    )}
                  </div>
                )}
              </SettingRow>
            </div>
          </div>
        )}

        {/* ── APPEARANCE TAB ── */}
        {activeTab === "appearance" && (
          <div className="space-y-10 animate-fade-in">
            <div>
              <SectionHeader
                title="Display"
                description="Customize how Tacta looks and feels."
              />
              <div className="space-y-0">
                <SettingRow
                  label="Color Theme"
                  description="Choose between light, dark, or follow your OS."
                >
                  <select
                    className="border border-outline-variant bg-surface-container text-on-surface text-sm font-medium rounded-lg px-3 py-1.5 min-w-[130px] outline-none focus:ring-1 focus:ring-primary transition"
                    value={preferences.themeMode}
                    onChange={(e) =>
                      void updatePreferences({ themeMode: e.target.value as "light" | "dark" | "system" })
                    }
                  >
                    <option value="system">System Default</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </SettingRow>

                <SettingRow
                  label="Text Size"
                  description="Scales all content via relative rem units."
                  last
                >
                  <select
                    className="border border-outline-variant bg-surface-container text-on-surface text-sm font-medium rounded-lg px-3 py-1.5 min-w-[130px] outline-none focus:ring-1 focus:ring-primary transition"
                    value={preferences.textScale}
                    onChange={(e) =>
                      void updatePreferences({ textScale: e.target.value as "compact" | "comfortable" | "large" })
                    }
                  >
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="large">Large</option>
                  </select>
                </SettingRow>
              </div>
            </div>

            {(isLoading || isSaving) && (
              <div className="flex items-center gap-2 text-xs text-primary font-semibold animate-pulse">
                <span className="size-1.5 bg-primary rounded-full animate-ping" />
                {isSaving ? "Saving preferences..." : "Loading..."}
              </div>
            )}
          </div>
        )}

        {/* ── SHORTCUTS TAB ── */}
        {activeTab === "shortcuts" && (
          <div className="space-y-10 animate-fade-in">
            {/* Error banner */}
            {validationError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-medium">
                <AlertCircle className="size-4 shrink-0" />
                {validationError}
              </div>
            )}

            {/* Recording hint */}
            {recordingKey && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-medium animate-pulse">
                <span className="material-symbols-outlined text-sm leading-none">keyboard</span>
                Press any key combination to record. Press <kbd className="bg-primary/15 px-1.5 py-0.5 rounded font-mono text-[10px] mx-0.5">Esc</kbd> to cancel.
              </div>
            )}

            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.label}>
                <SectionHeader title={group.label} />
                <div>
                  {group.shortcuts.map((def, idx) => {
                    const val = preferences[def.key as keyof WorkspacePreferences] as string || def.default;
                    const isThisRecording = recordingKey === def.key;
                    const isLast = idx === group.shortcuts.length - 1;
                    return (
                      <div
                        key={def.key}
                        className={`flex items-center justify-between gap-6 py-3.5 ${
                          !isLast ? "border-b border-outline-variant/20" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-on-surface">{def.label}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">{def.desc}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setRecordingKey(isThisRecording ? null : def.key as keyof WorkspacePreferences)}
                            onKeyDown={(e) => handleRecordKeyDown(e, def.key as keyof WorkspacePreferences)}
                            className={`min-w-[100px] h-8 px-3 text-xs font-mono font-semibold rounded-lg border flex items-center justify-center transition-all ${
                              isThisRecording
                                ? "bg-primary/15 border-primary text-primary animate-pulse ring-2 ring-primary/30"
                                : "bg-surface-container border-outline-variant text-on-surface hover:border-primary/50 hover:bg-surface-container-high cursor-pointer"
                            }`}
                          >
                            {isThisRecording ? "Press key..." : val}
                          </button>

                          <button
                            type="button"
                            title={`Reset to default: ${def.default}`}
                            onClick={() => void updatePreferences({ [def.key]: def.default })}
                            disabled={val === def.default}
                            className={`size-8 flex items-center justify-center rounded-lg border transition-all ${
                              val === def.default
                                ? "border-transparent text-on-surface-variant/25 cursor-not-allowed"
                                : "border-outline-variant text-on-surface-variant hover:text-error hover:border-error/40 hover:bg-error/8 cursor-pointer"
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm leading-none">restart_alt</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── INTEGRATIONS TAB ── */}
        {activeTab === "integrations" && (
          <div className="space-y-10 animate-fade-in">
            <div>
              <SectionHeader
                title="Connected Services"
                description="Link your Google account services to enable email and calendar features."
              />

              {isLoadingConnections ? (
                <div className="flex items-center gap-3 py-6 text-xs text-on-surface-variant">
                  <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Checking connections...
                </div>
              ) : connectionsError ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-medium">
                  <AlertCircle className="size-4 shrink-0" />
                  Failed to load integration status: {connectionsError.message ?? 'Unknown error'}
                </div>
              ) : (
                <div className="space-y-0">
                  {/* Gmail */}
                  <div className="flex items-center justify-between gap-4 py-5 border-b border-outline-variant/20">
                    <div className="flex items-center gap-4">
                      <div className="grid size-9 place-items-center rounded-xl bg-surface-container border border-outline-variant shadow-sm p-2">
                        <GmailIcon className="size-full" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">Gmail</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          Read, send, and manage your emails
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {connections?.gmail ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="size-3" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant border border-outline-variant">
                          <AlertCircle className="size-3" />
                          Not connected
                        </span>
                      )}
                      {connections?.gmail ? (
                        <Button
                          variant="error"
                          size="sm"
                          loading={disconnectGmailMutation.isPending}
                          onClick={() => void handleDisconnect("gmail")}
                          className="rounded-lg !py-1.5 !px-3 text-xs"
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={getGmailUrlMutation.isPending}
                          onClick={() => void handleConnect("gmail")}
                          className="rounded-lg !py-1.5 !px-3 text-xs"
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Google Calendar */}
                  <div className="flex items-center justify-between gap-4 py-5">
                    <div className="flex items-center gap-4">
                      <div className="grid size-9 place-items-center rounded-xl bg-surface-container border border-outline-variant shadow-sm p-2">
                        <GoogleCalendarIcon className="size-full" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">Google Calendar</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          View and create calendar events
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {connections?.calendar ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="size-3" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant border border-outline-variant">
                          <AlertCircle className="size-3" />
                          Not connected
                        </span>
                      )}
                      {connections?.calendar ? (
                        <Button
                          variant="error"
                          size="sm"
                          loading={disconnectCalendarMutation.isPending}
                          onClick={() => void handleDisconnect("googlecalendar")}
                          className="rounded-lg !py-1.5 !px-3 text-xs"
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={getCalendarUrlMutation.isPending}
                          onClick={() => void handleConnect("googlecalendar")}
                          className="rounded-lg !py-1.5 !px-3 text-xs"
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Auto-sync note */}
            <div className="flex items-start gap-2 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-sm leading-none mt-0.5 shrink-0">info</span>
              <p>Connected services will auto-sync in real-time. Disconnecting revokes Tacta's access without affecting your Google account.</p>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
