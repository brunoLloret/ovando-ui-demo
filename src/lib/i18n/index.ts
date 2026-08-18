// Translation lookup + interpolation. Two entry points:
//   t(key, vars)   — imperative, reads the current locale (for non-React call sites)
//   useT()         — hook returning a t bound to the live locale (re-renders on switch)

import { getLocale, useLocale, type Locale } from "../locale";
import { en, type MessageKey } from "./en";
import { es } from "./es";

const catalogs: Record<Locale, Record<MessageKey, string>> = { en, es };

type Vars = Record<string, string | number>;

function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const msg = catalogs[locale]?.[key] ?? catalogs.en[key] ?? key;
  return interpolate(msg, vars);
}

/** Imperative translate at the current locale. */
export function t(key: MessageKey, vars?: Vars): string {
  return translate(getLocale(), key, vars);
}

/** Hook: returns a t() bound to the live locale — the component re-renders when it flips. */
export function useT(): (key: MessageKey, vars?: Vars) => string {
  const locale = useLocale();
  return (key, vars) => translate(locale, key, vars);
}

export type { MessageKey };
