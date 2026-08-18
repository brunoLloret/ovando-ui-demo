// App locale: 'en' | 'es'. Same useSyncExternalStore pattern as mode.ts — a tiny external store
// so any component re-renders when the language flips. Persists to localStorage; first visit
// detects from the browser, defaulting to English.

import { useSyncExternalStore } from "react";

export type Locale = "en" | "es";

const KEY = "fopm.locale";
const listeners = new Set<() => void>();

function detect(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "es") return saved;
    const nav = (navigator.language || "en").toLowerCase();
    return nav.startsWith("es") ? "es" : "en";
  } catch {
    return "en";
  }
}

let _locale: Locale = detect();

export function getLocale(): Locale {
  return _locale;
}

export function setLocale(l: Locale): void {
  if (_locale === l) return;
  _locale = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

/** React hook — re-renders when the locale changes. */
export function useLocale(): Locale {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    getLocale,
  );
}
