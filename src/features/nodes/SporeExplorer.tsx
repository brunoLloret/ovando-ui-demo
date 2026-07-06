import { useState } from "react";
import { Button, Modal } from "../../components";
import { api } from "../../lib/api";
import { NodeChainEditor } from "./NodeChainEditor";
import { useNodeChain } from "./useNodeChain";
import type { NodePair } from "./types";
import styles from "./SporeExplorer.module.css";

export interface SporeExplorerProps {
  open: boolean;
  spores: string[];
  visionText: string;
  initialPairs: NodePair[];
  /** Closing (Done / Escape / backdrop) commits the current arrangement — non-destructive. */
  onClose: (pairs: NodePair[], firstWord: string | null) => void;
}

/**
 * The popup that explores the spores and their future as nodes: pick one spore as the first word
 * (or none), propose polarity-pairs, then drag to reorder nodes / swap words. Closing keeps your work.
 */
export function SporeExplorer({ open, spores, visionText, initialPairs, onClose }: SporeExplorerProps) {
  const chain = useNodeChain(initialPairs);
  const [firstWord, setFirstWord] = useState<string | null>(null);

  const propose = async (count: number): Promise<NodePair[]> => {
    if (spores.length === 0) return [];
    const res = await api.visionPropose(spores, visionText);
    return res.nodePairs.slice(0, count);
  };

  const commit = () => onClose(chain.toPairs(), firstWord);

  return (
    <Modal
      open={open}
      size="wide"
      title="Explore the spores — their future as nodes"
      onClose={commit}
      footer={<Button variant="primary" onClick={commit}>Done →</Button>}
    >
      <div className={styles.sporesLabel}>
        spores — <b>click</b> one to make it the first word (or none) · <b>drag</b> one into a node's word slot
      </div>
      <div className={styles.bank}>
        {spores.length === 0 && <span className={styles.muted}>no spores yet — surface some in the Vision first</span>}
        {spores.map((w) => (
          <span
            key={w}
            role="button"
            tabIndex={0}
            className={[styles.spore, firstWord === w && styles.selected].filter(Boolean).join(" ")}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-spore", w);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => setFirstWord((prev) => (prev === w ? null : w))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setFirstWord((prev) => (prev === w ? null : w));
            }}
            title={firstWord === w ? "the first word — click to unset · drag into a slot" : "click = first word · drag into a node slot"}
          >
            {w}
          </span>
        ))}
      </div>
      {firstWord && (
        <div className={styles.firstWordNote}>
          first word · <b>{firstWord}</b>
        </div>
      )}

      <div className={styles.divider} />

      <NodeChainEditor chain={chain} onPropose={spores.length ? propose : undefined} spores={spores} />

      <div className={styles.hint}>drag the grip to reorder nodes · drag a word onto another to swap · ✎ to edit · ✕ to remove</div>
    </Modal>
  );
}
