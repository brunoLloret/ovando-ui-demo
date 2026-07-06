import { useState } from "react";
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
  const [count, setCount] = useState(6);
  const [busy, setBusy] = useState(false);

  const editing = chain.nodes.find((n) => n.id === editingId) ?? null;

  const propose = async () => {
    if (!onPropose) return;
    setBusy(true);
    try {
      chain.setAll(await onPropose(Math.max(1, Math.min(12, count || 6))));
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
                <button type="button" className={styles.stepBtn} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label="fewer">
                  −
                </button>
                <span className={styles.stepVal}>{count}</span>
                <button type="button" className={styles.stepBtn} onClick={() => setCount((c) => Math.min(12, c + 1))} aria-label="more">
                  +
                </button>
              </div>
              <Button onClick={propose} disabled={busy}>
                {busy ? "proposing…" : "propose nodes"}
              </Button>
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
