// Typed wrappers over the Express /api routes. The backend is unchanged; this is the single
// place the React client talks to it. Streaming (the run) is a separate helper, `streamSandbox`.

import type {
  ChoiceAnswer,
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

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
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
  nodeSubnodes: (a: string, b: string, process?: string) =>
    postJson<{ subSeeds: SubSeed[] }>("/api/node/subnodes", { a, b, process }),
  forceElaborate: (f: { name: string; intention?: string; action?: string; emotion?: string; conflict?: string }) =>
    postJson<ForceElaboration>("/api/force/elaborate", f),
  randomSeed: () => jsonFetch<{ seed: string }>("/api/random-seed"),
  sandboxRuns: () => jsonFetch<SandboxRunSummary[]>("/api/sandbox-runs"),
  sandboxState: (run: string) => jsonFetch<SavedState>(`/api/sandbox-state?run=${encodeURIComponent(run)}`),
  chooseSandbox: (answer: ChoiceAnswer) => postJson<unknown>("/api/sandbox-choose", answer),
  freezeSandbox: (id: string) => postJson<unknown>("/api/sandbox-freeze", { id }),
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
    headers: { "Content-Type": "application/json" },
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

/** Run the pipeline as an SSE stream (chain → forces → telling → bible). */
export const streamSandbox = (body: RunControllers, onEvent: (e: SandboxEvent) => void, signal?: AbortSignal) =>
  streamPost("/api/sandbox", body, onEvent, signal);

/** Re-tell a saved run (render only), optionally with refined forces — an SSE stream. */
export const streamRerun = (body: RerunBody, onEvent: (e: SandboxEvent) => void, signal?: AbortSignal) =>
  streamPost("/api/sandbox-rerun", body, onEvent, signal);
