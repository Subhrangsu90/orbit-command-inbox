import { useEffect, useState } from "react";
import {
  applyAppearance,
  resolveThemeMode,
  subscribeToSystemTheme,
  type AppearancePreferences,
  type TextScale,
  type ThemeMode,
} from "../_utils/theme";

type ThemeControlsProps = {
  appearance: AppearancePreferences;
  onAppearanceChange: (
    appearance: AppearancePreferences,
  ) => void | Promise<void>;
  compact?: boolean;
  disabled?: boolean;
};

export function ThemeToggleButton({
  appearance,
  onAppearanceChange,
  disabled = false,
}: Pick<ThemeControlsProps, "appearance" | "onAppearanceChange" | "disabled">) {
  const [resolved, setResolved] = useState<"light" | "dark">(() =>
    resolveThemeMode(appearance.themeMode),
  );

  useEffect(() => {
    applyAppearance(appearance);
    setResolved(resolveThemeMode(appearance.themeMode));
    return subscribeToSystemTheme(() => {
      setResolved(resolveThemeMode(appearance.themeMode));
    });
  }, [appearance]);

  const cycleTheme = () => {
    const order: ThemeMode[] = ["light", "dark", "system"];
    const currentIndex = order.indexOf(appearance.themeMode);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % order.length;
    const next = order[nextIndex] ?? "system";
    void onAppearanceChange({ ...appearance, themeMode: next });
  };

  const icon =
    appearance.themeMode === "system"
      ? "brightness_auto"
      : resolved === "dark"
        ? "dark_mode"
        : "light_mode";

  return (
    <button
      aria-label={`Theme: ${appearance.themeMode}. Click to change.`}
      className="text-on-surface-variant hover:bg-surface-container-high hover:text-primary grid size-10 place-items-center rounded-full transition-colors disabled:opacity-60"
      disabled={disabled}
      onClick={cycleTheme}
      title={`Theme (${appearance.themeMode})`}
      type="button"
    >
      <span className="material-symbols-outlined text-icon-md">{icon}</span>
    </button>
  );
}

export function AppearanceSettingsPanel({
  appearance,
  onAppearanceChange,
  disabled = false,
}: ThemeControlsProps) {
  useEffect(() => {
    applyAppearance(appearance);
    return subscribeToSystemTheme(() => {
      applyAppearance(appearance);
    });
  }, [appearance]);

  return (
    <div className="space-y-md">
      <label className="space-y-xs block">
        <span className="text-label-lg text-on-surface font-sans">
          Color theme
        </span>
        <select
          className="border-outline-variant bg-surface-container px-md py-sm text-body-md text-on-surface w-full rounded-lg border font-sans"
          disabled={disabled}
          onChange={(event) =>
            void onAppearanceChange({
              ...appearance,
              themeMode: event.target.value as ThemeMode,
            })
          }
          value={appearance.themeMode}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <label className="space-y-xs block">
        <span className="text-label-lg text-on-surface font-sans">
          Text size
        </span>
        <select
          className="border-outline-variant bg-surface-container px-md py-sm text-body-md text-on-surface w-full rounded-lg border font-sans"
          disabled={disabled}
          onChange={(event) =>
            void onAppearanceChange({
              ...appearance,
              textScale: event.target.value as TextScale,
            })
          }
          value={appearance.textScale}
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="large">Large</option>
        </select>
      </label>

      <p className="text-label-md text-on-surface-variant font-sans">
        Uses relative <code className="text-on-surface">rem</code> sizing so
        layout scales with your preferred text size. Theme syncs to your
        account.
      </p>
    </div>
  );
}
