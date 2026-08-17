// Autosaved working draft of the current project — the INPUT side of a compose session
// (vision text, spore bank, the node chain with its relations, controllers, and which station
// you're on). Persisted to localStorage so a refresh never loses work-in-progress.
//
// This is distinct from the run cache (runCache.ts), which stores FINISHED generations. The draft
// is the project you're still building; the run cache is the output you've already produced.

import type { ChainNode } from "../nodes";
import type { Controllers } from "./types";

const KEY = "fopm.draft.v1";

export interface ComposeDraft {
  savedAt: number;
  visionText: string;
  spores: string[];
  controllers: Controllers;
  nodes: ChainNode[];
  current: string;
  selectedNodeIndex: number;
}

/** True when a draft holds something worth restoring (avoid persisting/rehydrating an empty project). */
export function draftHasContent(d: Pick<ComposeDraft, "visionText" | "spores" | "nodes">): boolean {
  return Boolean(
    d.visionText.trim() ||
    d.spores.length > 0 ||
    d.nodes.some((n) => n.a.trim() || n.b.trim() || (n.relations?.length ?? 0) > 0),
  );
}

export function saveDraft(draft: ComposeDraft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // storage full or unavailable — best-effort, ignore
  }
}

export function loadDraft(): ComposeDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as ComposeDraft;
    return d && Array.isArray(d.nodes) ? d : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
