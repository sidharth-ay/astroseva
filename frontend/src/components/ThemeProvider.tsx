"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { LocalKeys, readLocal, writeLocal } from "@/lib/local";

export type Theme = "light" | "dark";

function storedTheme(): Theme {
  // The bootstrap script in layout.tsx already wrote the stored value onto
  // <html> before hydration, so reconciling with the DOM keeps the first
  // client render and the server render in agreement instead of flashing.
  if (typeof document !== "undefined") {
    const fromDom = document.documentElement.dataset.theme;
    if (fromDom === "light" || fromDom === "dark") return fromDom;
  }
  const stored = readLocal<string | null>(LocalKeys.theme, null);
  return stored === "dark" ? "dark" : "light";
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeState>({
  theme: "light",
  setTheme: () => undefined,
  toggleTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(storedTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeLocal(LocalKeys.theme, next);
    document.documentElement.dataset.theme = next;
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      writeLocal(LocalKeys.theme, next);
      document.documentElement.dataset.theme = next;
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}
