// Dev-only utility: wraps an onEvent callback to record timestamped events for replay fixtures.
// Tree-shakes to a no-op in production builds (import.meta.env.DEV guard).

import type { SandboxEvent } from "../../lib/types";

export interface RecordedEvent {
  t: number; // ms since recording started
  event: SandboxEvent;
}

export interface Recorder {
  /** Wrap an onEvent callback; resets the recording on each call. */
  wrap: (onEvent: (e: SandboxEvent) => void) => (e: SandboxEvent) => void;
  /** Download the accumulated events as a JSON fixture file. */
  download: (filename?: string) => void;
  clear: () => void;
}

export function createRecorder(): Recorder {
  if (!import.meta.env.DEV) {
    return { wrap: (fn) => fn, download: () => {}, clear: () => {} };
  }

  const records: RecordedEvent[] = [];
  let startMs = 0;

  return {
    wrap(onEvent) {
      records.length = 0;
      startMs = Date.now();
      return (e: SandboxEvent) => {
        records.push({ t: Date.now() - startMs, event: e });
        onEvent(e);
      };
    },
    download(filename = "replay.json") {
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    clear() {
      records.length = 0;
    },
  };
}
