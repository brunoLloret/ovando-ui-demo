// App mode: 'replay' (no backend, no key) vs 'live' (key configured, backend available).
// Default is replay — the public demo works with no accounts and no API spend.

import { useSyncExternalStore } from "react";
import type { RecordedEvent } from "../features/run/replay";

export type AppMode = "replay" | "live";

export interface ReplayManifestEntry {
  name: string;
  title: string;
  seed: string;
  blurb: string;
}

let _mode: AppMode = "replay";
let _fixture: RecordedEvent[] | null = null;
const _listeners = new Set<() => void>();

function notify() { _listeners.forEach((l) => l()); }

export function getMode(): AppMode { return _mode; }

export function setMode(m: AppMode): void {
  if (_mode === m) return;
  _mode = m;
  notify();
}

export function getActiveFixture(): RecordedEvent[] | null { return _fixture; }
export function setActiveFixture(events: RecordedEvent[]): void { _fixture = events; }

/** React hook — re-renders when mode changes. */
export function useMode(): AppMode {
  return useSyncExternalStore(
    (cb) => { _listeners.add(cb); return () => { _listeners.delete(cb); }; },
    getMode,
  );
}

/** Probe /healthz; resolve to 'live' if it responds OK, 'replay' otherwise. */
export async function detectMode(): Promise<AppMode> {
  try {
    const res = await fetch("/healthz", { signal: AbortSignal.timeout(2000) });
    return res.ok ? "live" : "replay";
  } catch {
    return "replay";
  }
}
