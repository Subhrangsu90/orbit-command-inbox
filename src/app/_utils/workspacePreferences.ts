import { defaultAppearance, type AppearancePreferences } from "./theme";

export type WorkspacePreferences = AppearancePreferences & {
  onboarded: boolean;
  settingsShortcut: string;
  shortcutPrevEmail: string;
  shortcutNextEmail: string;
  shortcutReadEmail: string;
  shortcutTrashEmail: string;
  shortcutStarEmail: string;
  shortcutComposeEmail: string;
  shortcutRefreshEmail: string;
  shortcutCalendarPrev: string;
  shortcutCalendarNext: string;
  shortcutCalendarToday: string;
  shortcutCalendarCreate: string;
  shortcutCalendarRefresh: string;
};

const STORAGE_KEY = "votyx.workspace-preferences";

const defaultPreferences: WorkspacePreferences = {
  ...defaultAppearance,
  onboarded: false,
  settingsShortcut: "Alt+s",
  shortcutPrevEmail: "k",
  shortcutNextEmail: "j",
  shortcutReadEmail: "Enter",
  shortcutTrashEmail: "e",
  shortcutStarEmail: "s",
  shortcutComposeEmail: "c",
  shortcutRefreshEmail: "r",
  shortcutCalendarPrev: "j",
  shortcutCalendarNext: "k",
  shortcutCalendarToday: "t",
  shortcutCalendarCreate: "c",
  shortcutCalendarRefresh: "r",
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
    onboarded: typeof parsed.onboarded === "boolean" ? parsed.onboarded : defaultPreferences.onboarded,
    settingsShortcut: parsed.settingsShortcut ?? defaultPreferences.settingsShortcut,
    shortcutPrevEmail: parsed.shortcutPrevEmail ?? defaultPreferences.shortcutPrevEmail,
    shortcutNextEmail: parsed.shortcutNextEmail ?? defaultPreferences.shortcutNextEmail,
    shortcutReadEmail: parsed.shortcutReadEmail ?? defaultPreferences.shortcutReadEmail,
    shortcutTrashEmail: parsed.shortcutTrashEmail ?? defaultPreferences.shortcutTrashEmail,
    shortcutStarEmail: parsed.shortcutStarEmail ?? defaultPreferences.shortcutStarEmail,
    shortcutComposeEmail: parsed.shortcutComposeEmail ?? defaultPreferences.shortcutComposeEmail,
    shortcutRefreshEmail: parsed.shortcutRefreshEmail ?? defaultPreferences.shortcutRefreshEmail,
    shortcutCalendarPrev: parsed.shortcutCalendarPrev ?? defaultPreferences.shortcutCalendarPrev,
    shortcutCalendarNext: parsed.shortcutCalendarNext ?? defaultPreferences.shortcutCalendarNext,
    shortcutCalendarToday: parsed.shortcutCalendarToday ?? defaultPreferences.shortcutCalendarToday,
    shortcutCalendarCreate: parsed.shortcutCalendarCreate ?? defaultPreferences.shortcutCalendarCreate,
    shortcutCalendarRefresh: parsed.shortcutCalendarRefresh ?? defaultPreferences.shortcutCalendarRefresh,
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
