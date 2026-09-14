export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

export const THEME_STORAGE_KEY = "todaysroad-theme";
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function parseThemePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): Theme {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

// Runs before first paint so saved/system dark mode never flashes a light page.
export const themeInitScript = `(() => {
  let preference = "system";
  try { const saved = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (saved === "light" || saved === "dark") preference = saved;
  } catch {}
  const dark = preference === "dark" || (preference === "system" && matchMedia("${THEME_MEDIA_QUERY}").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
})();`;
