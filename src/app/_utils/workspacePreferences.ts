import { defaultAppearance, type AppearancePreferences } from "./theme";

export type WorkspacePreferences = AppearancePreferences;

const STORAGE_KEY = "votyx.workspace-preferences";

const defaultPreferences: WorkspacePreferences = {
  ...defaultAppearance,
};

function normalizePreferences(parsed: Partial<WorkspacePreferences>): WorkspacePreferences {
  return {
    themeMode:
      parsed.themeMode === "light" || parsed.themeMode === "dark" || parsed.themeMode === "system"
        ? parsed.themeMode
        : defaultPreferences.themeMode,
    textScale:
      parsed.textScale === "compact" ||
      parsed.textScale === "comfortable" ||
      parsed.textScale === "large"
        ? parsed.textScale
        : defaultPreferences.textScale,
  };
}

export function getWorkspacePreferences(): WorkspacePreferences {
  try {
    if (typeof window === "undefined") return defaultPreferences;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultPreferences;

    return normalizePreferences(JSON.parse(stored) as Partial<WorkspacePreferences>);
  } catch {
    return defaultPreferences;
  }
}

export function saveWorkspacePreferences(preferences: WorkspacePreferences) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
  } catch (e) {
    console.error("Failed to save workspace preferences to localStorage", e);
  }
}
