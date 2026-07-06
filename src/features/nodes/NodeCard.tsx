import { useState, type DragEvent } from "react";
import type { ChainNode } from "./types";
import { Button } from "../../components";
import styles from "./NodeCard.module.css";

export interface NodeCardProps {
  node: ChainNode;
  index: number;
  total: number;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  /** Drag-and-drop: move a node to an absolute index. */
  onReorder: (id: string, toIndex: number) => void;
  /** Drag-and-drop: swap two words. */
  onSwap: (idA: string, slotA: "a" | "b", idB: string, slotB: "a" | "b") => void;
  /** Drag-and-drop: drop a spore from the bank into a word slot. */
  onSetWord: (id: string, slot: "a" | "b", word: string) => void;
  /** Open this node in the detail inspector (station 2). */
  onInspect?: () => void;
}

const NODE_MIME = "application/x-node";
const WORD_MIME = "application/x-word";
const SPORE_MIME = "application/x-spore";

interface WordChipProps {
  nodeId: string;
  slot: "a" | "b";
  value: string;
  onSwap: (idA: string, slotA: "a" | "b", idB: string, slotB: "a" | "b") => void;
  onSetWord: (id: string, slot: "a" | "b", word: string) => void;
  /** Click to add/edit this word (the reliable, non-drag path). */
  onPick: () => void;
}

/** A draggable word chip. Module-level (NOT nested in NodeCard) so it isn't remounted mid-drag. */
function WordChip({ nodeId, slot, value, onSwap, onSetWord, onPick }: WordChipProps) {
  return (
    <span
      className={[styles.word, !value && styles.wordEmpty].filter(Boolean).join(" ")}
      onClick={onPick}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData(WORD_MIME, JSON.stringify({ id: nodeId, slot }));
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(WORD_MIME) || e.dataTransfer.types.includes(SPORE_MIME)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onDrop={(e) => {
        const spore = e.dataTransfer.getData(SPORE_MIME);
        if (spore) {
          e.preventDefault();
          e.stopPropagation();
          onSetWord(nodeId, slot, spore.toLowerCase());
          return;
        }
        const raw = e.dataTransfer.getData(WORD_MIME);
        if (!raw) return;
        e.preventDefault();
        e.stopPropagation();
        const src = JSON.parse(raw) as { id: string; slot: "a" | "b" };
        onSwap(src.id, src.slot, nodeId, slot);
      }}
      title="click to edit · drag a spore here · drag onto another word to swap"
    >
      {value || "＋ add"}
    </span>
  );
}

/** One node in the chain: drag the grip to reorder, drag a word onto another to swap; also edit/remove. */
export function NodeCard({ node, index, total, onEdit, onRemove, onMove, onReorder, onSwap, onSetWord, onInspect }: NodeCardProps) {
  const [over, setOver] = useState(false);

  return (
    <div
      className={[styles.card, over && styles.over].filter(Boolean).join(" ")}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(NODE_MIME)) {
          e.preventDefault();
          if (!over) setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e: DragEvent) => {
        setOver(false);
        const id = e.dataTransfer.getData(NODE_MIME);
        if (id) {
          e.preventDefault();
          onReorder(id, index);
        }
      }}
    >
      <span
        className={styles.grip}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(NODE_MIME, node.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        title="drag to reorder"
        aria-label="drag to reorder"
      >
        ⠿
      </span>
      {onInspect ? (
        <button className={styles.ordinalBtn} onClick={onInspect} title="open in the node inspector">
          {index + 1}
        </button>
      ) : (
        <span className={styles.ordinal}>{index + 1}</span>
      )}
      <div className={styles.words}>
        <WordChip nodeId={node.id} slot="a" value={node.a} onSwap={onSwap} onSetWord={onSetWord} onPick={() => onEdit(node.id)} />
        <span className={styles.rel}>↔</span>
        <WordChip nodeId={node.id} slot="b" value={node.b} onSwap={onSwap} onSetWord={onSetWord} onPick={() => onEdit(node.id)} />
      </div>
      <div className={styles.controls}>
        <Button variant="ghost" onClick={() => onMove(node.id, -1)} disabled={index === 0} title="move up" aria-label="move up">
          ↑
        </Button>
        <Button variant="ghost" onClick={() => onMove(node.id, 1)} disabled={index === total - 1} title="move down" aria-label="move down">
          ↓
        </Button>
        <Button variant="ghost" onClick={() => onEdit(node.id)} title="edit" aria-label="edit">
          ✎
        </Button>
        <Button variant="ghost" onClick={() => onRemove(node.id)} title="remove" aria-label="remove">
          ✕
        </Button>
      </div>
    </div>
  );
}
