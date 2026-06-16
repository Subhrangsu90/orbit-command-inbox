"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getWorkspacePreferences,
  saveWorkspacePreferences,
  type WorkspacePreferences,
} from "../_utils/workspacePreferences";
import { applyAppearance, type AppearancePreferences } from "../_utils/theme";
import { api } from "~/trpc/react";
import { authClient } from "~/server/better-auth/client";

type WorkspacePreferencesContextValue = {
  preferences: WorkspacePreferences;
  appearance: AppearancePreferences;
  isLoading: boolean;
  isSaving: boolean;
  provider: string | null;
  updatePreferences: (patch: Partial<WorkspacePreferences>) => Promise<void>;
  refetchPreferences: () => Promise<unknown>;
};

export const WorkspacePreferencesContext =
  createContext<WorkspacePreferencesContextValue | null>(null);

export function WorkspacePreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const session = authClient.useSession();
  const isAuthenticated = !!session.data;

  // Local state initialized from localStorage
  const [localPreferences, setLocalPreferences] = useState<WorkspacePreferences>(() =>
    getWorkspacePreferences()
  );

  // tRPC query to get preferences from the server, enabled only if authenticated
  const { data: serverPreferences, isLoading, refetch } = api.preferences.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // tRPC mutation to save preferences on the server
  const saveMutation = api.preferences.update.useMutation();

  // Sync server preferences into local state once fetched
  useEffect(() => {
    if (isAuthenticated && serverPreferences) {
      setLocalPreferences((prev) => {
        const merged = {
          ...prev,
          ...serverPreferences,
        };
        saveWorkspacePreferences(merged);
        return merged;
      });
    }
  }, [isAuthenticated, serverPreferences]);

  const appearance = useMemo<AppearancePreferences>(
    () => ({
      themeMode: localPreferences.themeMode,
      textScale: localPreferences.textScale,
    }),
    [localPreferences.themeMode, localPreferences.textScale]
  );

  // Apply appearance whenever it changes
  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  const updatePreferences = useCallback(
    async (patch: Partial<WorkspacePreferences>) => {
      const next = { ...localPreferences, ...patch };
      setLocalPreferences(next);
      saveWorkspacePreferences(next);

      if (isAuthenticated) {
        try {
          await saveMutation.mutateAsync({
            themeMode: next.themeMode,
            textScale: next.textScale,
          });
        } catch (error) {
          console.error("Failed to sync preferences to server:", error);
        }
      }
    },
    [localPreferences, isAuthenticated, saveMutation]
  );

  const value = useMemo(
    () => ({
      preferences: localPreferences,
      appearance,
      isLoading: isAuthenticated ? isLoading : false,
      isSaving: saveMutation.isPending,
      provider: serverPreferences?.provider ?? null,
      updatePreferences,
      refetchPreferences: refetch,
    }),
    [localPreferences, appearance, isAuthenticated, isLoading, saveMutation.isPending, serverPreferences?.provider, updatePreferences, refetch]
  );

  return (
    <WorkspacePreferencesContext.Provider value={value}>
      {children}
    </WorkspacePreferencesContext.Provider>
  );
}

export function useWorkspacePreferences() {
  const context = useContext(WorkspacePreferencesContext);
  if (!context) {
    throw new Error(
      "useWorkspacePreferences must be used within WorkspacePreferencesProvider.",
    );
  }

  return context;
}
