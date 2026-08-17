// Client-side domain types mirroring the backend contracts (src/engine/orchestrator.ts,
// src/types/choice.ts, and the /api routes). Kept deliberately minimal — only what the UI
// consumes — with optional fields where the backend is permissive.

import type { NodePair, NodeRelation } from "../features/nodes/types";
export type { NodePair, NodeRelation };

/** A node-pair sent to the run, optionally carrying a relation established in the node room. */
export type RunNodePair = NodePair & { relation?: NodeRelation };

/** POST /api/sandbox-rerun body — re-tell a saved run, optionally with refined forces. */
export interface RerunBody {
  run: string;
  format?: string;
  pov?: string;
  words?: number;
  /** an edited dramatization (refined forces) — reused as-is instead of the saved one. */
  dramatization?: Dramatization;
  /** re-derive the forces fresh from the chain instead of reusing them. */
  freshForces?: boolean;
  /** which model to run on (opus/sonnet/haiku). */
  model?: string;
}

/** POST /api/sandbox body — the run controllers. */
export interface RunControllers {
  seed: string;
  partner?: string;
  scale?: number;
  format?: string;
  pov?: string;
  words?: number;
  /** always true in the UI — the chooser is attached and the client decides pause vs auto. */
  manual?: boolean;
  /** confirmed node-pairs from Vision; when present the engine builds exactly these nodes.
   *  A pair may carry a relation established in the node room — it overrides the generated one. */
  nodePairs?: RunNodePair[];
  apparatus?: boolean;
  /** the writer's own story/direction (from Vision) — the SPINE that WINS over the chain in dramatize. */
  userText?: string;
  /** which model to run on (opus/sonnet/haiku) — applies to the whole pipeline. */
  model?: string;
}

/** POST /api/dramatize body — the FORCES stage only: build the chain (or reuse a saved `run`) and
 *  generate the forces, stopping before render. */
export interface DramatizeBody {
  /** reuse a saved run's already-built chain (no rebuild); omit to build fresh from the pairs. */
  run?: string;
  seed?: string;
  partner?: string;
  scale?: number;
  manual?: boolean;
  nodePairs?: RunNodePair[];
  /** the writer's own story/direction — the spine that wins over the chain in dramatize. */
  userText?: string;
  /** which model to run on (opus/sonnet/haiku). */
  model?: string;
}

/** A human joint surfaced by the run when "I pick" is on. */
export interface ChoiceOption {
  label: string;
  schema?: string;
  detail?: string;
  kind?: string;
}
export interface ChoicePrompt {
  step: "choice";
  id: string;
  at: "partner" | "relation" | "match" | "pair" | "registers" | "forces" | "telling" | string;
  title: string;
  context?: string;
  options: ChoiceOption[];
  pair?: NodePair;
  /** multi-select joint (e.g. registers): pick several, not one */
  multi?: boolean;
  /** cap on how many a multi-select joint accepts (0/undefined = no cap) */
  maxSelect?: number;
}
export interface ChoiceResult {
  index: number;
  /** indices picked on a multi-select joint */
  selected?: number[];
  text?: string;
  regenerate?: boolean;
  pair?: NodePair;
  /** for the "telling" joint: montage/pov/length the human set before writing */
  controls?: { format?: string; pov?: string; words?: number };
}
/** POST /api/sandbox-choose body. */
export type ChoiceAnswer = { id: string } & ChoiceResult;

/** The SSE run stream — one JSON object per `data:` line, discriminated on `step`. */
export type SandboxEvent =
  | { step: "vision"; statement?: string; charge?: string }
  | { step: "keys"; keys: string[] }
  | { step: "field"; poleA: string; poleB: string; process: string; kind?: string; schema?: string }
  | { step: "node"; i: number; total: number; seedA: string; seedB: string; process: string; kind?: string; schema?: string }
  | { step: "chain" | "chain-built"; nodes: number }
  | ChoicePrompt
  | { step: "frozen"; runName?: string; at: string }
  | { step: "dramatize"; status: "start" | "done"; dramatization?: Dramatization }
  | { step: "actions"; scope?: string; actions?: string[] }
  | { step: "plan"; format: string; rationale: string; units?: unknown[] }
  | { step: "cast"; cast?: CastMember[]; apparatus?: boolean }
  | { step: "section"; status: "start" | "done"; n: number; coordinate?: string; [k: string]: unknown }
  | { step: "edition"; contradictions?: unknown[]; dropped_threads?: unknown[]; repeated_images?: unknown[] }
  | { step: "run"; status: "done" | string; work?: string; runName?: string }
  | { step: "error"; where?: string; message: string };

/** A force — a drive/pressure given a human face (the dramatization's agents). */
export interface Force {
  name: string;
  derived_from?: string[];
  action?: string;
  intention?: string;
  emotion?: string;
}
export interface Dramatization {
  human_match?: string;
  central_conflict?: string;
  agents?: Force[];
}
/** POST /api/force/elaborate — the deepened workshop of a single force. */
export interface ForceElaboration {
  want: string;
  fear: string;
  contradiction: string;
  note: string;
}
export interface CastMember {
  name: string;
  [k: string]: unknown;
}

/** POST /api/node/relation candidate — a relation between a node's two words. */
export interface RelationCandidate {
  kind: string;
  schema: string;
  description: string;
  properties: string[];
}

/** POST /api/node/subnodes result — an intermediate sub-state within a node's process. */
export interface SubSeed {
  word: string;
  derived_from: string;
  reasoning: string;
}

/** GET /api/vision-extract response. */
export interface VisionExtract {
  spores: string[];
  experiences: string[];
  forceDynamics: string[];
  coreImages: string[];
}

/** GET /api/sandbox-runs entry. */
export interface SandboxRunSummary {
  run: string;
  seed: string;
  nodes: number;
  hasWork?: boolean;
  frozen?: boolean;
  frozenAt?: string;
}

/** GET /api/runs entry (the diagnostic Runs tab). */
export interface RunListItem {
  name: string;
  seeds: number;
  nodes: number;
  writings: number;
  cost: number;
  modified: string | null;
}

/** GET /api/sandbox-state — a saved GlobalState (permissive; only the fields the UI reconstructs). */
export interface SavedState {
  _vision?: { charge?: string; statement?: string };
  _keys?: string[];
  sequence?: { node_order?: string[] };
  nodes?: Record<string, { seed_pair: [string, string]; selected_relation: string }>;
  relations?: Record<string, { description?: string; kind?: string; schema?: string }>;
  seeds?: Record<string, { word: string }>;
  _meta?: {
    dramatization?: Dramatization;
    cast?: CastMember[];
    sections?: Array<{
      n: number; coordinate?: string; prose?: string; scene_title?: string;
      actant?: string; situation?: string; entryPoint?: string; objective?: string;
      obstacle?: string; innerExperience?: string; unsaid?: string;
    }>;
    work?: string;
    format?: string;
  };
}
