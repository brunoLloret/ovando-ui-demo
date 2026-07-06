import { useEffect, useState } from "react";
import { Button, Modal, TextInput } from "../../components";
import type { ChainNode, NodePair } from "./types";
import styles from "./NodeEditModal.module.css";

export interface NodeEditModalProps {
  /** The node being edited, or null when closed. */
  node: ChainNode | null;
  onSave: (id: string, pair: NodePair) => void;
  onClose: () => void;
  /** Optional spore word-bank — click a chip to fill a word (the reliable, non-drag path). */
  spores?: string[];
}

/** Pop-up to edit a node's two words. Local draft; commits only on Save. */
export function NodeEditModal({ node, onSave, onClose, spores }: NodeEditModalProps) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  // reset the draft whenever a different node opens
  useEffect(() => {
    setA(node?.a ?? "");
    setB(node?.b ?? "");
  }, [node]);

  const save = () => {
    if (!node) return;
    onSave(node.id, { a: a.trim().toLowerCase(), b: b.trim().toLowerCase() });
    onClose();
  };

  // click a spore → fill the first empty word, else replace A
  const useSpore = (w: string) => {
    if (!a.trim()) setA(w);
    else if (!b.trim()) setB(w);
    else setA(w);
  };

  return (
    <Modal
      open={node !== null}
      title="Edit node — two words, one relation"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <TextInput label="word A" value={a} onChange={(e) => setA(e.target.value)} autoFocus />
        <TextInput label="word B" value={b} onChange={(e) => setB(e.target.value)} />
      </div>
      {spores && spores.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="struct" style={{ color: "var(--muted)", marginBottom: 6 }}>spores — click to fill a word</div>
          <div className={styles.bank}>
            {spores.map((w) => (
              <button key={w} type="button" className={styles.spore} onClick={() => useSpore(w)}>
                {w}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="struct" style={{ marginTop: 12, color: "var(--muted)" }}>
        The relation between these two words is explored when the chain generates.
      </div>
    </Modal>
  );
}
