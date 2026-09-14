"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { parseThemePreference, resolveTheme, THEME_MEDIA_QUERY, THEME_STORAGE_KEY, type Theme, type ThemePreference } from "@/lib/theme";

const ThemeContext = createContext<{
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
} | null>(null);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [theme, setTheme] = useState<Theme>("light");
  const darkFavicon = useRef<string | null>(null);

  const applyPreference = useCallback((next: ThemePreference) => {
    const resolved = resolveTheme(next, window.matchMedia(THEME_MEDIA_QUERY).matches);
    document.documentElement.dataset.theme = resolved;
    setPreferenceState(next);
    setTheme(resolved);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#17191c" : "#f8f9f6");
  }, []);

  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[data-theme-icon]');
    if (!icon) return;
    if (theme === "light") {
      icon.href = "/assets/leaf-logo.png";
      return;
    }
    if (darkFavicon.current) {
      icon.href = darkFavicon.current;
      return;
    }

    // Browser tab icons do not inherit the in-app logo's CSS invert filter.
    // Render that same asset and filter at favicon size, preserving its shape.
    let cancelled = false;
    const source = new Image();
    source.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.filter = "invert(1)";
      context.drawImage(source, 0, 0, 64, 64);
      darkFavicon.current = canvas.toDataURL("image/png");
      if (!cancelled) icon.href = darkFavicon.current;
    };
    source.src = "/assets/leaf-logo-dark.png";
    return () => { cancelled = true; };
  }, [theme]);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(THEME_STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
    applyPreference(parseThemePreference(saved));
    const syncStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) applyPreference(parseThemePreference(event.newValue));
    };
    window.addEventListener("storage", syncStorage);
    return () => window.removeEventListener("storage", syncStorage);
  }, [applyPreference]);

  useEffect(() => {
    const media = window.matchMedia(THEME_MEDIA_QUERY);
    const syncSystem = () => { if (preference === "system") applyPreference("system"); };
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, [preference, applyPreference]);

  const setPreference = useCallback((next: ThemePreference) => {
    applyPreference(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Keep this session usable without persistence. */ }
  }, [applyPreference]);

  return <ThemeContext.Provider value={{ theme, preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
