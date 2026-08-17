// Replay engine: emits recorded events through the same SSE plumbing the live run uses.
// Choice events pause the clock until the user answers; the recorded path continues regardless
// of which option was picked (this replay follows the recorded path).

import type { ChoicePrompt, SandboxEvent } from "../../lib/types";

export interface RecordedEvent {
  t: number; // ms since the recording started
  event: SandboxEvent;
}

const MAX_GAP_MS = 2500;

// Module-level resolve for the currently-paused choice, if any.
let _choiceResolve: (() => void) | null = null;

/** Called by api.chooseSandbox in replay mode to unblock a paused choice. */
export function resolveReplayChoice(): void {
  _choiceResolve?.();
  _choiceResolve = null;
}

function waitMs(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    const onAbort = () => { clearTimeout(id); reject(new DOMException("Aborted", "AbortError")); };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function waitForChoice(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    _choiceResolve = resolve;
    const onAbort = () => {
      _choiceResolve = null;
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Replay a fixture through the standard onEvent callback.
 * Timing gaps are replayed at original speed (capped at MAX_GAP_MS).
 * Choice events pause until resolveReplayChoice() is called.
 */
export async function replayRun(
  events: RecordedEvent[],
  onEvent: (e: SandboxEvent) => void,
  signal: AbortSignal,
  speed = 1,
): Promise<void> {
  if (events.length === 0) return;
  let lastT = 0;

  for (const { t, event } of events) {
    if (signal.aborted) return;

    const gap = Math.min(t - lastT, MAX_GAP_MS) / speed;
    if (gap > 0) {
      await waitMs(gap, signal);
      if (signal.aborted) return;
    }
    lastT = t;

    if (event.step === "choice") {
      // Surface the ChoiceCard via the normal event path, then pause.
      onEvent(event as ChoicePrompt);
      await waitForChoice(signal);
      if (signal.aborted) return;
      // Continue with the recorded path regardless of the user's pick.
    } else {
      onEvent(event);
    }
  }
}
