"use client";

/**
 * Theme provider — toggles `data-theme="dark"` on <html> + persists in
 * localStorage. Scoped to the authenticated (app) workspace routes only;
 * the marketing/landing/auth pages always render light.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

const STORAGE_KEY = "polaris.theme";

// Dark theme is only allowed inside these path prefixes (the (app) shell).
// Everything else (landing, /pricing, /case-studies, /signin, /onboard, etc.)
// stays light regardless of user preference.
const APP_PREFIX_RE =
  /^\/(strategist|dashboard|account|billing|connections|deadlines|family|partners|resources|roadmap|settings|transactions|universities|admin|monitor)(\/|$)/;

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void; set: (t: Theme) => void }>({
  theme: "light",
  toggle: () => {},
  set: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isAppRoute = APP_PREFIX_RE.test(pathname);
  const [theme, setTheme] = useState<Theme>("light");

  // Hydrate from localStorage / system preference on mount (client only).
  // If we're on a marketing route, always force light and don't touch storage.
  useEffect(() => {
    if (!isAppRoute) {
      apply("light");
      setTheme("light");
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "dark" || stored === "light") {
      apply(stored);
      setTheme(stored);
      return;
    }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial: Theme = prefersDark ? "dark" : "light";
    apply(initial);
    setTheme(initial);
  }, [isAppRoute]);

  const set = useCallback(
    (t: Theme) => {
      if (!isAppRoute) return; // never allow toggling theme outside the app shell
      apply(t);
      localStorage.setItem(STORAGE_KEY, t);
      setTheme(t);
    },
    [isAppRoute],
  );

  const toggle = useCallback(() => {
    set(theme === "dark" ? "light" : "dark");
  }, [theme, set]);

  return <ThemeCtx.Provider value={{ theme, toggle, set }}>{children}</ThemeCtx.Provider>;
}

function apply(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = t;
  document.documentElement.style.colorScheme = t;
}

export function useTheme() {
  return useContext(ThemeCtx);
}

/**
 * Tiny inline script that runs BEFORE React hydration to prevent a flash
 * of unstyled light when the user prefers dark. Only honors the saved theme
 * on app routes — marketing/landing pages are always forced to light.
 */
export const THEME_PREFLIGHT_SCRIPT = `
(function(){
  try {
    var p = location.pathname || '/';
    var isApp = /^\\/(strategist|dashboard|account|billing|connections|deadlines|family|partners|resources|roadmap|settings|transactions|universities|admin|monitor)(\\/|$)/.test(p);
    var t = 'light';
    if (isApp) {
      var s = localStorage.getItem('${STORAGE_KEY}');
      t = s === 'dark' || s === 'light' ? s :
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    document.documentElement.dataset.theme = t;
    document.documentElement.style.colorScheme = t;
  } catch(e) {}
})();
`;
