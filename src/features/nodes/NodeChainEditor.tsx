import { useEffect, useState } from "react";
import { Button } from "../../components";
import type { NodeChain } from "./useNodeChain";
import { NodeCard } from "./NodeCard";
import { NodeEditModal } from "./NodeEditModal";
import type { NodePair } from "./types";
import styles from "./NodeChainEditor.module.css";

export interface NodeChainEditorProps {
  /** The chain state, owned by the parent (so the Field and the Node inspector share one chain). */
  chain: NodeChain;
  /** If provided, shows a "propose N" control that asks the backend for a fresh chain of N nodes. */
  onPropose?: (count: number) => Promise<NodePair[]>;
  /** If provided, a node can be opened in the detail inspector (station 2). */
  onInspect?: (index: number) => void;
  /** Optional spore word-bank — offered in the edit pop-up to fill words by click. */
  spores?: string[];
}

/**
 * The chain workbench (controlled): build and shape the chain by direct manipulation — propose N,
 * then add / remove / reorder / swap / edit, drag spores into slots. Open a node in the inspector.
 */
export function NodeChainEditor({ chain, onPropose, onInspect, spores }: NodeChainEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  // "propose N" defaults to the number of nodes built so far, and tracks it until the user steps it.
  const [count, setCount] = useState(() => chain.nodes.length || 6);
  const [countTouched, setCountTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const hasNodes = chain.nodes.length > 0;

  useEffect(() => {
    if (!countTouched) setCount(chain.nodes.length || 6);
  }, [chain.nodes.length, countTouched]);

  const stepCount = (d: -1 | 1) => {
    setCountTouched(true);
    setCount((c) => Math.max(1, Math.min(12, c + d)));
  };

  const editing = chain.nodes.find((n) => n.id === editingId) ?? null;

  // "propose" asks the model for a FRESH set of node-pairs from your Vision spores and REPLACES the
  // chain. Destructive when nodes exist (relations & sub-nodes are lost), so guard it behind a confirm.
  const runPropose = async () => {
    if (!onPropose) return;
    setConfirming(false);
    setBusy(true);
    try {
      chain.setAll(await onPropose(Math.max(1, Math.min(12, count || 6))));
    } finally {
      setBusy(false);
    }
  };
  const onProposeClick = () => {
    if (hasNodes) setConfirming(true);
    else void runPropose();
  };
  // non-destructive: append N fresh pairs to the end, keeping every existing node + its relation/sub-nodes
  const runAppend = async () => {
    if (!onPropose) return;
    setBusy(true);
    try {
      chain.addMany(await onPropose(Math.max(1, Math.min(12, count || 6))));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <span className={styles.title}>
          Chain · {chain.nodes.length} node{chain.nodes.length === 1 ? "" : "s"}
        </span>
        <div className={styles.actions}>
          {onPropose && (
            <>
              <div className={styles.stepper}>
                <span className={styles.stepLabel}>propose</span>
                <button type="button" className={styles.stepBtn} onClick={() => stepCount(-1)} aria-label="fewer">
                  −
                </button>
                <span className={styles.stepVal}>{count}</span>
                <button type="button" className={styles.stepBtn} onClick={() => stepCount(1)} aria-label="more">
                  +
                </button>
              </div>
              {confirming ? (
                <>
                  <span className={styles.confirmMsg}>
                    replace all {chain.nodes.length} node{chain.nodes.length === 1 ? "" : "s"} (and their relations &amp; sub-nodes)?
                  </span>
                  <Button variant="primary" onClick={runPropose} disabled={busy}>
                    {busy ? "proposing…" : "replace"}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
                    keep mine
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={onProposeClick}
                    disabled={busy}
                    title={hasNodes ? "ask the model for a FRESH set of node-pairs from your Vision — this REPLACES the current chain" : "ask the model for a set of node-pairs from your Vision spores"}
                  >
                    {busy ? "proposing…" : hasNodes ? "propose fresh set" : "propose nodes"}
                  </Button>
                  {hasNodes && (
                    <Button
                      variant="ghost"
                      onClick={runAppend}
                      disabled={busy}
                      title="append fresh node-pairs from your Vision to the END of the chain — keeps everything you built"
                    >
                      ＋ {count} more
                    </Button>
                  )}
                </>
              )}
            </>
          )}
          <Button onClick={() => chain.add()}>+ add node</Button>
        </div>
      </div>

      {chain.nodes.length === 0 ? (
        <div className={styles.empty}>
          No nodes yet — propose a set, or add one by hand. Each node is two words in tension.
        </div>
      ) : (
        <div className={styles.list}>
          {chain.nodes.map((node, i) => (
            <NodeCard
              key={node.id}
              node={node}
              index={i}
              total={chain.nodes.length}
              onEdit={setEditingId}
              onRemove={chain.remove}
              onMove={chain.move}
              onReorder={chain.reorder}
              onSwap={chain.swapWords}
              onSetWord={(id, slot, word) => chain.update(id, { [slot]: word })}
              onInspect={onInspect ? () => onInspect(i) : undefined}
            />
          ))}
        </div>
      )}

      <NodeEditModal node={editing} onSave={chain.update} onClose={() => setEditingId(null)} spores={spores} />
    </div>
  );
}
