// Persist completed runs to localStorage so a refresh — or a return visit — keeps the work,
// and the last few generations stay one click away. Pure browser storage; no backend, no key.

import type { SandboxEvent } from "../../lib/types";

const KEY = "fopm.runs.v1";
const MAX = 10;

export interface CachedRun {
  id: string;
  title: string;
  seed: string;
  savedAt: number;
  events: SandboxEvent[];
}

export type CachedRunMeta = Omit<CachedRun, "events">;

function readAll(): CachedRun[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedRun[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(runs: CachedRun[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(runs.slice(0, MAX)));
  } catch {
    // storage full or unavailable — best-effort, ignore
  }
}

/** Save a completed run, most-recent first, deduped by id (re-tells of the same run update in place). */
export function saveRun(run: CachedRun): void {
  const rest = readAll().filter((r) => r.id !== run.id);
  writeAll([run, ...rest]);
}

/** The saved runs' metadata (no event payloads), most-recent first. */
export function listRuns(): CachedRunMeta[] {
  return readAll().map((r) => ({ id: r.id, title: r.title, seed: r.seed, savedAt: r.savedAt }));
}

export function getRun(id: string): CachedRun | null {
  return readAll().find((r) => r.id === id) ?? null;
}

export function deleteRun(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
}

export function clearRuns(): void {
  writeAll([]);
}
