import { useCallback, useEffect, useRef, useState } from "react";
import { api, streamRerun, streamSandbox } from "../../lib/api";
import type { ChoiceAnswer, ChoicePrompt, ChoiceResult, RerunBody, RunControllers, SandboxEvent } from "../../lib/types";

const IDLE_MS = 120000; // no pick for 2 min → "are you still here?"
const GRACE_MS = 60000; // another minute of silence → freeze the run as a draft

export interface SandboxRun {
  running: boolean;
  /** Every event received this run, in order (the consumer maps them to rooms). */
  events: SandboxEvent[];
  /** The current step. */
  phase: string | null;
  error: string | null;
  /** A joint awaiting the human, when "I pick" is on; null in auto mode. */
  pendingChoice: ChoicePrompt | null;
  /** True when a pending joint has gone idle — show the "still here?" prompt. */
  stillHere: boolean;
  /** The run's name (from the run events) — needed to re-render it. */
  runName: string | null;
  start: (body: RunControllers) => Promise<void>;
  /** Re-tell a saved run (render only), optionally with refined forces. */
  rerun: (body: RerunBody) => Promise<void>;
  /** Answer the pending joint (POST /api/sandbox-choose). */
  answer: (result: ChoiceResult) => Promise<void>;
  /** Signal the human is present — dismiss the prompt and restart the idle countdown. */
  poke: () => void;
  reset: () => void;
}

/**
 * Drives a run against POST /api/sandbox (SSE). Policy: when `pick` is on, a `choice` event
 * surfaces as `pendingChoice` for the UI; when off, it auto-answers (index 0). Toggling `pick`
 * off mid-joint auto-answers the open one — matching the current UI. `pick` is read live via a ref.
 */
export function useSandboxRun({ pick }: { pick: boolean }): SandboxRun {
  const [events, setEvents] = useState<SandboxEvent[]>([]);
  const [phase, setPhase] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingChoice, setPendingChoice] = useState<ChoicePrompt | null>(null);
  const [stillHere, setStillHere] = useState(false);
  const [runName, setRunName] = useState<string | null>(null);

  const pickRef = useRef(pick);
  pickRef.current = pick;
  const pendingRef = useRef<ChoicePrompt | null>(null);
  pendingRef.current = pendingChoice;
  const abortRef = useRef<AbortController | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (graceTimer.current) clearTimeout(graceTimer.current);
    idleTimer.current = null;
    graceTimer.current = null;
  }, []);

  const postAnswer = useCallback(async (answerBody: ChoiceAnswer) => {
    try {
      await api.chooseSandbox(answerBody);
    } catch (e) {
      console.error("sandbox-choose failed:", e);
    }
  }, []);

  // arm the presence countdown for the open joint: idle → "still here?" → grace → freeze
  const armIdle = useCallback(() => {
    clearTimers();
    setStillHere(false);
    idleTimer.current = setTimeout(() => {
      setStillHere(true);
      graceTimer.current = setTimeout(() => {
        const p = pendingRef.current;
        if (p) {
          void api.freezeSandbox(p.id).catch((e) => console.error("freeze failed:", e));
          setPendingChoice(null);
          setStillHere(false);
        }
      }, GRACE_MS);
    }, IDLE_MS);
  }, [clearTimers]);

  const poke = useCallback(() => {
    if (pendingRef.current) armIdle();
  }, [armIdle]);

  const handleEvent = useCallback(
    (ev: SandboxEvent) => {
      setEvents((prev) => [...prev, ev]);
      setPhase(ev.step);
      if (ev.step === "run" && ev.runName) setRunName(ev.runName);
      if (ev.step === "error") setError(ev.message);
      if (ev.step === "choice") {
        if (pickRef.current) {
          setPendingChoice(ev);
          armIdle();
        } else void postAnswer({ id: ev.id, index: 0 });
      }
    },
    [postAnswer, armIdle],
  );

  const runStream = useCallback(
    async (streamer: (onEvent: (e: SandboxEvent) => void, signal: AbortSignal) => Promise<void>) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      clearTimers();
      setStillHere(false);
      setEvents([]);
      setPhase(null);
      setError(null);
      setPendingChoice(null);
      setRunning(true);
      try {
        await streamer(handleEvent, ac.signal);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        setRunning(false);
      }
    },
    [handleEvent, clearTimers],
  );

  const start = useCallback((body: RunControllers) => runStream((oe, sig) => streamSandbox(body, oe, sig)), [runStream]);
  const rerun = useCallback((body: RerunBody) => runStream((oe, sig) => streamRerun(body, oe, sig)), [runStream]);

  const answer = useCallback(
    async (result: ChoiceResult) => {
      const p = pendingRef.current;
      if (!p) return;
      clearTimers();
      setStillHere(false);
      setPendingChoice(null);
      await postAnswer({ id: p.id, ...result });
    },
    [postAnswer, clearTimers],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    clearTimers();
    setStillHere(false);
    setEvents([]);
    setPhase(null);
    setError(null);
    setPendingChoice(null);
    setRunning(false);
  }, [clearTimers]);

  // toggling "I pick" off while a joint is open → auto-answer it (mirrors the current UI)
  useEffect(() => {
    if (!pick && pendingRef.current) {
      const p = pendingRef.current;
      clearTimers();
      setStillHere(false);
      setPendingChoice(null);
      void postAnswer({ id: p.id, index: 0 });
    }
  }, [pick, postAnswer, clearTimers]);

  // cancel any in-flight stream + timers on unmount
  useEffect(() => () => {
    abortRef.current?.abort();
    clearTimers();
  }, [clearTimers]);

  return { running, events, phase, error, pendingChoice, stillHere, runName, start, rerun, answer, poke, reset };
}
