import { useMemo } from "react";
import type { CastMember, Dramatization, SandboxEvent } from "../../lib/types";

/** One node as it arrives in the run stream (the accumulating Field/chain). */
export interface ChainNodeView {
  i: number;
  a: string;
  b: string;
  process: string;
  kind?: string;
  schema?: string;
}

export interface SectionView {
  n: number;
  coordinate?: string;
  prose?: string;
  sceneTitle?: string;
  perspective?: string;
  actant?: string;
  situation?: string;
  entryPoint?: string;
  objective?: string;
  obstacle?: string;
  innerExperience?: string;
  unsaid?: string;
  actions?: string[];
}

/** Derived per-room state — a pure fold of the event log. */
export interface RoomsState {
  phase: string | null;
  vision: { statement?: string; charge?: string; keys?: string[] };
  firstNode: { poleA?: string; poleB?: string; process?: string; kind?: string; schema?: string };
  chain: ChainNodeView[];
  nodeTotal: number;
  forces: Dramatization | null;
  telling: { format?: string; rationale?: string; actionChain?: string[]; sections: SectionView[] };
  bible: { work?: string; cast?: CastMember[] };
  frozenAt: string | null;
}

const INITIAL: RoomsState = {
  phase: null,
  vision: {},
  firstNode: {},
  chain: [],
  nodeTotal: 0,
  forces: null,
  telling: { sections: [] },
  bible: {},
  frozenAt: null,
};

/** Fold a single event into the rooms state (immutable). */
export function foldEvent(state: RoomsState, ev: SandboxEvent): RoomsState {
  const phase = ev.step;
  switch (ev.step) {
    case "vision":
      return { ...state, phase, vision: { ...state.vision, statement: ev.statement, charge: ev.charge } };
    case "keys":
      return { ...state, phase, vision: { ...state.vision, keys: ev.keys } };
    case "field":
      return {
        ...state,
        phase,
        firstNode: { poleA: ev.poleA, poleB: ev.poleB, process: ev.process, kind: ev.kind, schema: ev.schema },
      };
    case "node": {
      const node: ChainNodeView = { i: ev.i, a: ev.seedA, b: ev.seedB, process: ev.process, kind: ev.kind, schema: ev.schema };
      const chain = state.chain.some((n) => n.i === ev.i)
        ? state.chain.map((n) => (n.i === ev.i ? node : n))
        : [...state.chain, node];
      return { ...state, phase, chain, nodeTotal: ev.total };
    }
    case "chain":
    case "chain-built":
      return { ...state, phase };
    case "dramatize":
      return ev.status === "done" && ev.dramatization
        ? { ...state, phase, forces: ev.dramatization }
        : { ...state, phase };
    case "actions":
      return { ...state, phase, telling: { ...state.telling, actionChain: Array.isArray(ev.actions) ? ev.actions : [] } };
    case "plan":
      return { ...state, phase, telling: { ...state.telling, format: ev.format, rationale: ev.rationale, sections: [] } };
    case "cast":
      return { ...state, phase, bible: { ...state.bible, cast: ev.cast } };
    case "section": {
      if (ev.status !== "done") return { ...state, phase };
      const str = (v: unknown) => (typeof v === "string" ? v : undefined);
      const view: SectionView = {
        n: ev.n,
        coordinate: ev.coordinate,
        prose: str(ev.prose),
        sceneTitle: str(ev.sceneTitle) ?? str(ev.scene_title),
        perspective: str(ev.perspective),
        actant: str(ev.actant),
        situation: str(ev.situation),
        entryPoint: str(ev.entryPoint),
        objective: str(ev.objective),
        obstacle: str(ev.obstacle),
        innerExperience: str(ev.innerExperience),
        unsaid: str(ev.unsaid),
        actions: Array.isArray(ev.actions) ? (ev.actions as string[]) : undefined,
      };
      const sections = state.telling.sections.some((s) => s.n === ev.n)
        ? state.telling.sections.map((s) => (s.n === ev.n ? view : s))
        : [...state.telling.sections, view];
      return { ...state, phase, telling: { ...state.telling, sections } };
    }
    case "run":
      return ev.status === "done" ? { ...state, phase, bible: { ...state.bible, work: ev.work } } : { ...state, phase };
    case "frozen":
      return { ...state, phase, frozenAt: ev.at };
    default:
      return { ...state, phase };
  }
}

/** Derive room state from the run's event log (pure, memoized). */
export function useComposeRooms(events: SandboxEvent[]): RoomsState {
  return useMemo(() => events.reduce(foldEvent, INITIAL), [events]);
}
