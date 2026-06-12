"use client";

import { 
  User, 
  Sliders, 
  Palette, 
  CheckCircle2, 
  FileText, 
  Command 
} from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { useWorkspacePreferences } from "~/app/_components/workspacePreferencesContext";
import { AppearanceSettingsPanel } from "~/app/_components/ThemeControls";
import { authClient } from "~/server/better-auth/client";

export default function SettingsPage() {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const { preferences, updatePreferences, isSaving, isLoading } = useWorkspacePreferences();

  return (
    <WorkspaceLayout>
      <div className="max-w-3xl space-y-8">
        <div>
          <h2 className="font-serif text-3xl font-bold tracking-tight">Appearance & Scale</h2>
          <p className="text-on-surface-variant mt-2">
            Tailor your workspace look, color scheme, and comfortable reading layout options.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-6 items-start">
          
          {/* Controls Column */}
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
                  </div>
                </div>
              </div>
            )}

            {/* Control Panel */}
            <div className="bg-surface-container border border-outline-variant p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-outline-variant pb-3 mb-2">
                <Sliders className="size-4 text-primary" />
                <span className="font-semibold text-sm">Control Panel</span>
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

          {/* Real-time Preview Area */}
          <div className="bg-surface-container-low border border-outline-variant p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-outline-variant pb-3 mb-2">
              <Palette className="size-4 text-primary" />
              <span className="font-semibold text-sm">Live Preview Component</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-surface border border-outline-variant rounded-xl flex items-start gap-3">
                <CheckCircle2 className="size-4 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Design System Applied</p>
                  <p className="text-xs text-on-surface-variant">
                    Using typography and spacing tokens from the design config.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-surface border border-outline-variant rounded-xl flex items-start gap-3">
                <FileText className="size-4 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Font Size Preview</p>
                  <p className="text-xs text-on-surface-variant">
                    Your current font scale is set to <span className="font-bold text-primary">{preferences.textScale}</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary-container text-on-primary-container rounded-xl text-xs space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <Command className="size-3.5" /> Orbit Workspace Engine
              </p>
              <p className="leading-relaxed opacity-90">
                The inbox processes mail threads automatically, updating calendar events asynchronously.
              </p>
            </div>
          </div>

        </div>
      </div>
    </WorkspaceLayout>
  );
}
