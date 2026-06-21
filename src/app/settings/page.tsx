"use client";

import { useState, useEffect } from "react";
import { AlertCircle, ShieldCheck, X } from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { useWorkspacePreferences } from "~/app/_components/workspacePreferencesContext";
import type { WorkspacePreferences } from "~/app/_utils/workspacePreferences";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import { IntegrationConnectionList } from "~/app/_components/integrations/IntegrationConnectionList";
import { useRouter, useSearchParams } from "next/navigation";

const SHORTCUT_GROUPS = [
  {
    label: "Global",
    shortcuts: [
      {
        key: "settingsShortcut",
        label: "Open Settings",
        desc: "Jump to settings from anywhere",
        default: "Alt+G",
      },
    ],
  },
  {
    label: "Inbox",
    shortcuts: [
      {
        key: "shortcutNextEmail",
        label: "Next Email",
        desc: "Move selection down",
        default: "j",
      },
      {
        key: "shortcutPrevEmail",
        label: "Previous Email",
        desc: "Move selection up",
        default: "k",
      },
      {
        key: "shortcutReadEmail",
        label: "Open Email",
        desc: "Open selected email",
        default: "o",
      },
      {
        key: "shortcutTrashEmail",
        label: "Trash / Delete",
        desc: "Move to trash",
        default: "e",
      },
      {
        key: "shortcutStarEmail",
        label: "Star Email",
        desc: "Toggle star",
        default: "s",
      },
      {
        key: "shortcutComposeEmail",
        label: "Compose",
        desc: "Open compose dialog",
        default: "c",
      },
      {
        key: "shortcutRefreshEmail",
        label: "Refresh",
        desc: "Sync latest emails",
        default: "r",
      },
    ],
  },
  {
    label: "Calendar",
    shortcuts: [
      {
        key: "shortcutCalendarPrev",
        label: "Previous Range",
        desc: "Move calendar back",
        default: "j",
      },
      {
        key: "shortcutCalendarNext",
        label: "Next Range",
        desc: "Move calendar forward",
        default: "k",
      },
      {
        key: "shortcutCalendarToday",
        label: "Go to Today",
        desc: "Jump to current date",
        default: "t",
      },
      {
        key: "shortcutCalendarCreate",
        label: "Create Event",
        desc: "Open create dialog",
        default: "c",
      },
      {
        key: "shortcutCalendarRefresh",
        label: "Refresh",
        desc: "Sync calendar events",
        default: "r",
      },
    ],
  },
] as const;

type TabId = "account" | "appearance" | "shortcuts" | "integrations";

const TABS = [
  { id: "appearance", label: "General", icon: "settings" },
  { id: "account", label: "Account", icon: "account_circle" },
  { id: "shortcuts", label: "Keyboard shortcuts", icon: "keyboard" },
  { id: "integrations", label: "Connected services", icon: "extension" },
] as const;

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 border-b border-outline-variant/30 pb-3">
      <h3 className="text-base font-semibold text-on-surface">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-on-surface-variant">{description}</p>
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
      className={`flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center sm:gap-6 ${
        !last ? "border-b border-outline-variant/20" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-on-surface">{label}</p>
        {description && (
          <p className="mt-1 text-xs text-on-surface-variant leading-normal">
            {description}
          </p>
        )}
      </div>
      <div className="flex w-full shrink-0 justify-start sm:w-auto sm:justify-end">
        {children}
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-primary" : "bg-outline-variant"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block size-4 transform rounded-full bg-surface shadow-xs transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const { preferences, updatePreferences, isSaving, isLoading, provider } =
    useWorkspacePreferences();

  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [recordingKey, setRecordingKey] = useState<
    keyof WorkspacePreferences | null
  >(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync tab with query parameters
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["account", "appearance", "shortcuts", "integrations"].includes(tabParam)) {
      setActiveTab(tabParam as TabId);
      setIsMobileDetailOpen(true);
    }
  }, [searchParams]);

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/chat");
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !recordingKey) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [recordingKey]);

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
        "ctrl+c",
        "ctrl+v",
        "ctrl+a",
        "ctrl+x",
        "ctrl+z",
        "ctrl+y",
        "ctrl+f",
        "ctrl+p",
        "ctrl+s",
        "ctrl+o",
        "ctrl+t",
        "ctrl+n",
        "ctrl+w",
        "ctrl+r",
        "ctrl+l",
        "ctrl+d",
        "ctrl+h",
        "ctrl+j",
        "ctrl+q",
        "ctrl+g",
        "ctrl+shift+i",
        "ctrl+shift+t",
        "ctrl+shift+w",
        "meta+c",
        "meta+v",
        "meta+a",
        "meta+x",
        "meta+z",
        "meta+y",
        "meta+s",
        "meta+f",
        "f5",
        "f11",
        "f12",
        "alt+f4",
        "alt+tab",
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

  return (
    <WorkspaceLayout>
      {/* Fullscreen Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
        {/* Click outside to close */}
        <div className="absolute inset-0 cursor-default" onClick={handleClose} />

        {/* Modal Window Container */}
        <div className="relative z-10 flex h-[620px] max-h-[90vh] w-full max-w-4xl animate-scale-in overflow-hidden rounded-2xl border border-outline-variant bg-surface text-on-surface shadow-2xl">
          
          {/* Left Sidebar Pane (Category List) */}
          <div className={`w-full md:w-64 shrink-0 bg-surface-container p-4 text-on-surface-variant border-r border-outline-variant/30 flex flex-col ${
            isMobileDetailOpen ? "hidden md:flex" : "flex"
          }`}>
            {/* Close Button & Title */}
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClose}
                className="flex size-7 items-center justify-center rounded-lg border border-outline-variant bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
                title="Close settings"
              >
                <X className="size-4" />
              </button>
              <span className="text-sm font-bold text-on-surface md:hidden">Settings</span>
              <div className="size-7 md:hidden" />
            </div>

            {/* Category selection tabs list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-outline-variant">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id as TabId);
                      setIsMobileDetailOpen(true);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                      isActive
                        ? "bg-secondary-container text-on-secondary-container font-bold shadow-xs"
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-base leading-none shrink-0">
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </div>
                    <span className="material-symbols-outlined text-xs text-on-surface-variant/40 md:hidden">
                      chevron_right
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content Pane */}
          <div className={`flex-grow bg-surface overflow-y-auto flex flex-col ${
            isMobileDetailOpen ? "flex" : "hidden md:flex"
          }`}>
            {/* Mobile Header with Back Button */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-outline-variant/20 bg-surface-container/30 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileDetailOpen(false)}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm leading-none">arrow_back</span>
                Back
              </button>
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                {TABS.find((t) => t.id === activeTab)?.label}
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Details panel body content */}
            <div className="flex-grow overflow-y-auto p-6 md:p-8 scrollbar-thin scrollbar-thumb-outline-variant">
              <div className="max-w-2xl">
                
                {/* ── GENERAL / APPEARANCE PANEL ── */}
                {activeTab === "appearance" && (
                  <div className="space-y-6">
                    <div>
                      <SectionHeader
                        title="General Settings"
                        description="Manage appearance themes, scaling, and display attributes."
                      />

                      <div className="space-y-1">
                        <SettingRow
                          label="Appearance"
                          description="Choose between light, dark, or follow your OS."
                        >
                          <select
                            className="border border-outline-variant bg-surface-container text-on-surface focus:ring-1 focus:ring-primary w-full min-w-[140px] rounded-lg px-3 py-1.5 text-xs font-semibold transition outline-none cursor-pointer sm:w-auto"
                            value={preferences.themeMode}
                            onChange={(e) =>
                              void updatePreferences({
                                themeMode: e.target.value as "light" | "dark" | "system",
                              })
                            }
                          >
                            <option value="system">System Default</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                          </select>
                        </SettingRow>

                        <SettingRow
                          label="Contrast"
                          description="Customize the contrast settings of the dashboard."
                        >
                          <select
                            disabled
                            className="border border-outline-variant/40 bg-surface-container/50 text-on-surface-variant/40 w-full min-w-[140px] rounded-lg px-3 py-1.5 text-xs font-semibold outline-none cursor-not-allowed sm:w-auto"
                            value="system"
                          >
                            <option value="system">System Default</option>
                          </select>
                        </SettingRow>

                        <SettingRow
                          label="Accent color"
                          description="Select the default primary color highlight."
                        >
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full bg-primary" />
                            <select
                              disabled
                              className="border border-outline-variant/40 bg-surface-container/50 text-on-surface-variant/40 w-full min-w-[140px] rounded-lg px-3 py-1.5 text-xs font-semibold outline-none cursor-not-allowed sm:w-auto"
                              value="primary"
                            >
                              <option value="primary">Default</option>
                            </select>
                          </div>
                        </SettingRow>

                        <SettingRow
                          label="Language"
                          description="Select your preferred display language."
                        >
                          <select
                            disabled
                            className="border border-outline-variant/40 bg-surface-container/50 text-on-surface-variant/40 w-full min-w-[140px] rounded-lg px-3 py-1.5 text-xs font-semibold outline-none cursor-not-allowed sm:w-auto"
                            value="en"
                          >
                            <option value="en">English (US)</option>
                          </select>
                        </SettingRow>

                        <SettingRow
                          label="Text size"
                          description="Scales all workspace text readability scale."
                          last
                        >
                          <select
                            className="border border-outline-variant bg-surface-container text-on-surface focus:ring-1 focus:ring-primary w-full min-w-[140px] rounded-lg px-3 py-1.5 text-xs font-semibold transition outline-none cursor-pointer sm:w-auto"
                            value={preferences.textScale}
                            onChange={(e) =>
                              void updatePreferences({
                                textScale: e.target.value as "compact" | "comfortable" | "large",
                              })
                            }
                          >
                            <option value="compact">Compact</option>
                            <option value="comfortable">Comfortable</option>
                            <option value="large">Large</option>
                          </select>
                        </SettingRow>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-outline-variant/30">
                      <SectionHeader title="Intelligence & Voice" />
                      <div className="space-y-1">
                        <SettingRow
                          label="Higher intelligence"
                          description="Automatically use advanced reasoning models when answering complex requests."
                        >
                          <ToggleSwitch checked={true} disabled />
                        </SettingRow>

                        <SettingRow
                          label="Enable Dictation"
                          description="Use speech dictation in the workspace search bar."
                        >
                          <ToggleSwitch checked={true} disabled />
                        </SettingRow>

                        <SettingRow
                          label="Separate Voice"
                          description="Keep voice features in a separate overlay screen."
                          last
                        >
                          <ToggleSwitch checked={false} disabled />
                        </SettingRow>
                      </div>
                    </div>

                    {(isLoading || isSaving) && (
                      <div className="text-primary flex animate-pulse items-center gap-2 text-xs font-semibold">
                        <span className="bg-primary size-1.5 animate-ping rounded-full" />
                        {isSaving ? "Saving preferences..." : "Loading..."}
                      </div>
                    )}
                  </div>
                )}

                {/* ── ACCOUNT PANEL ── */}
                {activeTab === "account" && user && (
                  <div className="space-y-6">
                    <div>
                      <SectionHeader
                        title="Profile Details"
                        description="Manage user information and membership details."
                      />
                      <div className="flex items-center gap-5 border-b border-outline-variant/30 pb-6">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name}
                            className="size-14 shrink-0 rounded-full border border-outline object-cover shadow-sm"
                          />
                        ) : (
                          <div className="bg-surface-container text-on-surface flex size-14 shrink-0 items-center justify-center rounded-full border border-outline text-xl font-bold shadow-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">
                            {user.name}
                          </p>
                          <p className="mt-0.5 text-xs text-on-surface-variant truncate">
                            {user.email}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold tracking-wider text-on-surface-variant/60 uppercase">
                            Member since {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <SettingRow label="Account Status" last>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="size-3.5" />
                          Active Member
                        </span>
                      </SettingRow>
                    </div>

                    {/* Auth Provider Group */}
                    <div className="pt-4 border-t border-outline-variant/30">
                      <SectionHeader
                        title="Authentication"
                        description="Sign-in provider details used to secure your workspace."
                      />
                      <SettingRow
                        label="Sign-in method"
                        description="Your active authentication provider"
                        last
                      >
                        {provider && (
                          <div className="bg-surface-container border border-outline-variant text-on-surface inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold">
                            {provider === "google" && (
                              <>
                                <svg
                                  className="size-3.5 shrink-0"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                  />
                                  <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                  />
                                  <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                    fill="#FBBC05"
                                  />
                                  <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                    fill="#EA4335"
                                  />
                                </svg>
                                Google
                              </>
                            )}
                            {provider === "github" && (
                              <>
                                <svg
                                  className="size-3.5 shrink-0 fill-current text-on-surface"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                                </svg>
                                GitHub
                              </>
                            )}
                            {provider === "credential" && (
                              <>
                                <span className="material-symbols-outlined text-xs leading-none">
                                  key
                                </span>
                                Email & Password
                              </>
                            )}
                          </div>
                        )}
                      </SettingRow>
                    </div>
                  </div>
                )}

                {/* ── SHORTCUTS PANEL ── */}
                {activeTab === "shortcuts" && (
                  <div className="space-y-6 animate-fade-in">
                    <SectionHeader
                      title="Keyboard Shortcuts"
                      description="Customise and record key bindings to navigate the workspace."
                    />

                    {/* Error banner */}
                    {validationError && (
                      <div className="bg-error/10 border border-error/20 text-error flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-medium">
                        <AlertCircle className="size-4 shrink-0" />
                        {validationError}
                      </div>
                    )}

                    {/* Recording hint */}
                    {recordingKey && (
                      <div className="bg-primary/10 border border-primary/20 text-primary flex animate-pulse items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium">
                        <span className="material-symbols-outlined text-sm leading-none">
                          keyboard
                        </span>
                        Press any key combination to record. Press{" "}
                        <kbd className="bg-primary/25 mx-0.5 rounded px-1.5 py-0.5 font-mono text-[10px]">
                          Esc
                        </kbd>{" "}
                        to cancel.
                      </div>
                    )}

                    <div className="space-y-8">
                      {SHORTCUT_GROUPS.map((group) => (
                        <div key={group.label} className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">
                            {group.label}
                          </h4>
                          <div className="space-y-1">
                            {group.shortcuts.map((def, idx) => {
                              const val =
                                (preferences[
                                  def.key as keyof WorkspacePreferences
                                ] as string) || def.default;
                              const isThisRecording = recordingKey === def.key;
                              const isLast = idx === group.shortcuts.length - 1;
                              return (
                                <div
                                  key={def.key}
                                  className={`flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center sm:gap-6 ${
                                    !isLast ? "border-b border-outline-variant/20" : ""
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-on-surface">
                                      {def.label}
                                    </p>
                                    <p className="mt-0.5 text-xs text-on-surface-variant">
                                      {def.desc}
                                    </p>
                                  </div>

                                  <div className="flex w-full shrink-0 items-center justify-start gap-2 sm:w-auto sm:justify-end">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRecordingKey(
                                          isThisRecording
                                            ? null
                                            : (def.key as keyof WorkspacePreferences),
                                        )
                                      }
                                      onKeyDown={(e) =>
                                        handleRecordKeyDown(
                                          e,
                                          def.key as keyof WorkspacePreferences,
                                        )
                                      }
                                      className={`flex h-8 min-w-[100px] items-center justify-center rounded-lg border px-3 font-mono text-xs font-semibold transition-all ${
                                        isThisRecording
                                          ? "bg-primary/10 border-primary text-primary ring-primary/20 animate-pulse ring-2"
                                          : "bg-surface-container border-outline-variant text-on-surface hover:border-primary/50 hover:bg-surface-container-high cursor-pointer"
                                      }`}
                                    >
                                      {isThisRecording ? "Press key..." : val}
                                    </button>

                                    <button
                                      type="button"
                                      title={`Reset to default: ${def.default}`}
                                      onClick={() =>
                                        void updatePreferences({ [def.key]: def.default })
                                      }
                                      disabled={val === def.default}
                                      className={`flex size-8 items-center justify-center rounded-lg border transition-all ${
                                        val === def.default
                                          ? "text-on-surface-variant/20 border-transparent cursor-not-allowed"
                                          : "border-outline-variant text-on-surface-variant hover:text-error hover:border-error/40 hover:bg-error/10 cursor-pointer"
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-sm leading-none">
                                        restart_alt
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── INTEGRATIONS PANEL ── */}
                {activeTab === "integrations" && (
                  <div className="space-y-6 animate-fade-in">
                    <div>
                      <SectionHeader
                        title="Connected Services"
                        description="Connect external services to run automated workflows."
                      />
                      <div className="bg-transparent">
                        <IntegrationConnectionList variant="settings" />
                      </div>
                    </div>

                    {/* Auto-sync info */}
                    <div className="text-on-surface-variant flex items-start gap-2 text-xs border-t border-outline-variant/20 pt-4">
                      <span className="material-symbols-outlined mt-0.5 shrink-0 text-sm leading-none">
                        info
                      </span>
                      <p className="leading-relaxed">
                        Connected services will auto-sync in real-time. Disconnecting
                        revokes workspace access without affecting your google account data.
                      </p>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          </div>

        </div>
      </div>
    </WorkspaceLayout>
  );
}
