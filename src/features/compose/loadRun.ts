import type { NodePair, SavedState } from "../../lib/types";
import type { ChainNodeView, RoomsState, SectionView } from "./roomsState";

export interface HydratedRun {
  rooms: RoomsState;
  seed: string;
  partner: string;
  scale: number;
  nodePairs: NodePair[];
  /** The run's field of charged words — its keys, plus every node word — to repopulate the Vision spore bank. */
  spores: string[];
}

/**
 * The React reconstruct: fold a saved GlobalState into the same RoomsState the live run produces,
 * so a loaded run renders identically. Also returns the first node's words + count to seed the form.
 */
export function hydrateFromState(st: SavedState): HydratedRun {
  const order = st.sequence?.node_order ?? [];
  const nodes = st.nodes ?? {};
  const rels = st.relations ?? {};
  const seeds = st.seeds ?? {};
  const word = (id: string) => seeds[id]?.word ?? "?";

  const chain: ChainNodeView[] = order.map((id, i) => {
    const n = nodes[id];
    const rel = (n && rels[n.selected_relation]) ?? {};
    return {
      i: i + 1,
      a: n ? word(n.seed_pair[0]) : "?",
      b: n ? word(n.seed_pair[1]) : "?",
      process: rel.description ?? "",
      kind: rel.kind,
      schema: rel.schema,
    };
  });

  const first = chain[0];
  const sections: SectionView[] = (st._meta?.sections ?? []).map((s) => ({
    n: s.n,
    coordinate: s.coordinate,
    prose: s.prose,
    sceneTitle: s.scene_title,
    actant: s.actant,
    situation: s.situation,
    entryPoint: s.entryPoint,
    objective: s.objective,
    obstacle: s.obstacle,
    innerExperience: s.innerExperience,
    unsaid: s.unsaid,
  }));

  const rooms: RoomsState = {
    phase: "run",
    vision: { charge: st._vision?.charge, statement: st._vision?.statement, keys: st._keys },
    firstNode: first ? { poleA: first.a, poleB: first.b, process: first.process, kind: first.kind, schema: first.schema } : {},
    chain,
    nodeTotal: chain.length,
    forces: st._meta?.dramatization ?? null,
    telling: { format: st._meta?.format, sections },
    bible: { work: st._meta?.work, cast: st._meta?.cast },
    frozenAt: null,
  };

  // the field of charged words: the keys (if any) + every node word, deduped — repopulates the spore bank
  const spores = [...new Set([...(st._keys ?? []), ...chain.flatMap((n) => [n.a, n.b])])].filter((w) => w && w !== "?");

  return {
    rooms,
    seed: first?.a ?? "",
    partner: first?.b ?? "",
    scale: chain.length || 3,
    nodePairs: chain.map((n) => ({ a: n.a, b: n.b })),
    spores,
  };
}
