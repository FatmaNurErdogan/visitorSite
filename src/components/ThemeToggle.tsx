"use client";

// Rendered once in the root layout (not per-page) so it's always in the
// exact same viewport position everywhere — position: fixed, see .theme-toggle
// in globals.css. Actual color switching is driven by the [data-theme]
// attribute on <html>, which the blocking script in layout.tsx also sets
// before first paint (from localStorage) to avoid a flash of the wrong theme.
//
// useSyncExternalStore (rather than useState+useEffect) because the real
// value lives outside React (localStorage/matchMedia) and is unknown during
// SSR — this is exactly what the hook is for, and it renders getServerSnapshot
// on the server/first client pass so there's no hydration mismatch.
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const THEME_EVENT = "themechange";

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function getSnapshot(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Tema değiştir"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
    </button>
  );
}
