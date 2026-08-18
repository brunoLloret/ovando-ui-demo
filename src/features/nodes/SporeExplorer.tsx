import { useState } from "react";
import { Button, Modal } from "../../components";
import { api } from "../../lib/api";
import { useT } from "../../lib/i18n";
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
  const t = useT();
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
      title={t("spore.title")}
      onClose={commit}
      footer={<Button variant="primary" onClick={commit}>{t("spore.done")}</Button>}
    >
      <div className={styles.sporesLabel}>
        {t("spore.instr")}
      </div>
      <div className={styles.bank}>
        {spores.length === 0 && <span className={styles.muted}>{t("spore.none")}</span>}
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
            title={firstWord === w ? t("spore.firstWordTitle") : t("spore.pickTitle")}
          >
            {w}
          </span>
        ))}
      </div>
      {firstWord && (
        <div className={styles.firstWordNote}>
          {t("spore.firstWord", { word: firstWord })}
        </div>
      )}

      <div className={styles.divider} />

      <NodeChainEditor chain={chain} onPropose={spores.length ? propose : undefined} spores={spores} />

      <div className={styles.hint}>{t("spore.hint")}</div>
    </Modal>
  );
}
