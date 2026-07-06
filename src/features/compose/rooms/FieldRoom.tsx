import { NodeChainEditor, type NodeChain, type NodePair } from "../../nodes";
import type { ChainNodeView } from "../roomsState";
import styles from "./rooms.module.css";

export interface FieldRoomProps {
  /** The shared chain state (also edited in the Node inspector). */
  chain: NodeChain;
  onPropose?: (count: number) => Promise<NodePair[]>;
  /** Open a node in the detail inspector (station 2). */
  onInspect: (index: number) => void;
  /** Generated nodes from the run (with their relations); when present, shows the built chain. */
  generated: ChainNodeView[];
  running: boolean;
}

/**
 * Station 3 (the Field): the chain overview. Before/without a run it's the editable chain
 * (add / remove / reorder / swap / drag spores · click a node to inspect it); during/after a run
 * it shows the built chain with each relation (click to inspect).
 */
export function FieldRoom({ chain, onPropose, onInspect, generated, running }: FieldRoomProps) {
  const showBuilt = running || generated.length > 0;
  return (
    <div className={styles.room}>
      <div className={styles.title}>Field — the relational space where meaning emerges</div>
      {showBuilt ? (
        <div className={styles.stack}>
          {generated.length === 0 && <div className={styles.muted}>building the chain…</div>}
          {generated.map((n) => (
            <button key={n.i} className={styles.builtRow} onClick={() => onInspect(n.i - 1)} title="inspect this node">
              <div className={styles.poles}>
                <b>{n.a}</b>
                <span className={styles.rel}>↔</span>
                <b>{n.b}</b>
                {n.kind && <span className={styles.kindChip}>{n.kind}</span>}
              </div>
              {n.schema && <div className={styles.schema}>{n.schema}</div>}
              {n.process && <div className={styles.prose}>{n.process}</div>}
            </button>
          ))}
        </div>
      ) : (
        <NodeChainEditor chain={chain} onPropose={onPropose} onInspect={onInspect} />
      )}
    </div>
  );
}
