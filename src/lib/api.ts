// Typed wrappers over the Express /api routes. The backend is unchanged; this is the single
// place the React client talks to it. Streaming (the run) is a separate helper, `streamSandbox`.
//
// REPLAY MODE: when getMode() === 'replay', all network calls are intercepted here.
// streamSandbox / streamRerun / streamDramatize route to the replay engine.
// Everything else returns stubs. No request leaves the browser in replay mode.

import { getMode, getActiveFixture } from "./mode";
import { getKey } from "./keys";
import { getLocale } from "./locale";
import { replayRun, resolveReplayChoice } from "../features/run/replay";

import type {
  ChoiceAnswer,
  DramatizeBody,
  Force,
  ForceElaboration,
  NodePair,
  RelationCandidate,
  RerunBody,
  RunControllers,
  RunListItem,
  SandboxEvent,
  SubSeed,
  SandboxRunSummary,
  SavedState,
  VisionExtract,
} from "./types";

// ── Replay stubs ──────────────────────────────────────────────────────────────

function replayStub(url: string): unknown {
  if (url.startsWith("/api/random-seed"))   return { seed: "stone" };
  if (url.startsWith("/api/sandbox-runs"))  return [];
  if (url.startsWith("/api/define"))        return { word: "", def: null };
  if (url.startsWith("/api/runs"))          return [];
  if (url.startsWith("/api/windows"))       return {};
  if (url.startsWith("/api/trajectories"))  return { records: [] };
  if (url.startsWith("/api/questions"))     return { records: [] };
  if (url.startsWith("/api/calibration"))   return { records: [] };
  if (url.startsWith("/api/vision"))        return { spores: [], experiences: [], forceDynamics: [], coreImages: [], nodePairs: [] };
  if (url.startsWith("/api/node"))          return { candidates: [], subSeeds: [] };
  if (url.startsWith("/api/force"))         return { want: "", fear: "", contradiction: "", note: "", agents: [] };
  return {};
}

// ── Key header injection ──────────────────────────────────────────────────────

function keyHeaders(): Record<string, string> {
  // every request carries the chosen language so the backend generates in it
  const headers: Record<string, string> = { "X-Language": getLocale() };
  const k = getKey();
  if (k) {
    headers["X-Provider"] = k.provider;
    headers["X-Provider-Key"] = k.key;
  }
  return headers;
}

// ── Core fetch helpers ────────────────────────────────────────────────────────

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  if (getMode() === "replay") return replayStub(url) as T;
  const merged: RequestInit = {
    ...init,
    headers: { ...keyHeaders(), ...(init?.headers as Record<string, string> | undefined) },
  };
  const res = await fetch(url, merged);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

const postJson = <T>(url: string, body: unknown): Promise<T> =>
  jsonFetch<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const api = {
  visionExtract: (text: string) => postJson<VisionExtract>("/api/vision-extract", { text }),
  visionPropose: (spores: string[], text: string) =>
    postJson<{ nodePairs: NodePair[] }>("/api/vision-propose", { spores, text }),
  nodeRelation: (a: string, b: string, guidance?: string) =>
    postJson<{ candidates: RelationCandidate[] }>("/api/node/relation", { a, b, guidance }),
  nodeSubnodes: (a: string, b: string, process?: string, intent?: string) =>
    postJson<{ subSeeds: SubSeed[] }>("/api/node/subnodes", { a, b, process, intent }),
  nodeFromText: (text: string, a?: string, b?: string) =>
    postJson<{ a: string; b: string }>("/api/node/from-text", { text, a, b }),
  forceElaborate: (f: { name: string; intention?: string; action?: string; emotion?: string; conflict?: string }) =>
    postJson<ForceElaboration>("/api/force/elaborate", f),
  forceGenerate: (b: { run: string; mode: "new" | "replace"; existing: Force[]; replaceNames?: string[]; count?: number; userText?: string; model?: string }) =>
    postJson<{ agents: Force[] }>("/api/force/generate", b),
  randomSeed: () => jsonFetch<{ seed: string }>("/api/random-seed"),
  sandboxRuns: () => jsonFetch<SandboxRunSummary[]>("/api/sandbox-runs"),
  sandboxState: (run: string) => jsonFetch<SavedState>(`/api/sandbox-state?run=${encodeURIComponent(run)}`),
  chooseSandbox: (answer: ChoiceAnswer): Promise<unknown> => {
    if (getMode() === "replay") { resolveReplayChoice(); return Promise.resolve({}); }
    return postJson<unknown>("/api/sandbox-choose", answer);
  },
  freezeSandbox: (id: string): Promise<unknown> => {
    if (getMode() === "replay") return Promise.resolve({});
    return postJson<unknown>("/api/sandbox-freeze", { id });
  },
  define: (word: string) => jsonFetch<{ word: string; def: string | null; source?: string }>(`/api/define?w=${encodeURIComponent(word)}`),

  // diagnostic data tabs (read-only)
  runs: () => jsonFetch<RunListItem[]>("/api/runs"),
  runDetail: (name: string) => jsonFetch<unknown>(`/api/runs/${encodeURIComponent(name)}`),
  windows: () => jsonFetch<Record<string, unknown>>("/api/windows"),
  trajectories: () => jsonFetch<{ records?: unknown[] }>("/api/trajectories"),
  questions: () => jsonFetch<{ records?: unknown[] }>("/api/questions"),
  calibration: () => jsonFetch<{ records?: unknown[] }>("/api/calibration"),
};

/**
 * POST a body and consume the SSE response: parse each `data:` line into a SandboxEvent and invoke
 * `onEvent`. Resolves when the stream ends; rejects on network error. AbortSignal cancels. Malformed
 * lines are skipped; one handler throw won't stop the stream.
 */
async function streamPost(url: string, body: unknown, onEvent: (event: SandboxEvent) => void, signal?: AbortSignal): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...keyHeaders() },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      let event: SandboxEvent;
      try {
        event = JSON.parse(line.slice(5).trim()) as SandboxEvent;
      } catch {
        continue;
      }
      try {
        onEvent(event);
      } catch (err) {
        console.error("sandbox event handler failed:", event.step, err);
      }
    }
  }
}

/** Run the pipeline as an SSE stream — or replay a fixture in replay mode. */
export function streamSandbox(body: RunControllers, onEvent: (e: SandboxEvent) => void, signal?: AbortSignal): Promise<void> {
  if (getMode() === "replay") return replayRun(getActiveFixture() ?? [], onEvent, signal ?? new AbortController().signal);
  return streamPost("/api/sandbox", body, onEvent, signal);
}

/** Re-tell a saved run — or replay a fixture in replay mode. */
export function streamRerun(body: RerunBody, onEvent: (e: SandboxEvent) => void, signal?: AbortSignal): Promise<void> {
  if (getMode() === "replay") return replayRun(getActiveFixture() ?? [], onEvent, signal ?? new AbortController().signal);
  return streamPost("/api/sandbox-rerun", body, onEvent, signal);
}

/** Generate the FORCES stage only — or replay a fixture in replay mode. */
export function streamDramatize(body: DramatizeBody, onEvent: (e: SandboxEvent) => void, signal?: AbortSignal): Promise<void> {
  if (getMode() === "replay") return replayRun(getActiveFixture() ?? [], onEvent, signal ?? new AbortController().signal);
  return streamPost("/api/dramatize", body, onEvent, signal);
}
