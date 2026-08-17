import { useState } from "react";
import { Button } from "../../../components";
import { api } from "../../../lib/api";
import { useMode } from "../../../lib/mode";
import { SporeExplorer, type NodePair } from "../../nodes";
import type { RoomsState } from "../roomsState";
import styles from "./rooms.module.css";

export interface VisionRoomProps {
  /** Auto field-report from the run (shown only when the writer supplied no Vision). */
  vision: RoomsState["vision"];
  /** The vision text — lifted to ComposePage so it survives room switches / a run. */
  text: string;
  onTextChange: (text: string) => void;
  /** Surfaced spores — lifted to ComposePage (used by the Field proposer + the explorer). */
  spores: string[];
  onExtracted: (spores: string[], text: string) => void;
  /** The current node chain — seeds the Spore Explorer popup. */
  nodePairs: NodePair[];
  /** Committed from the Spore Explorer: the arranged chain + the chosen first word (or null). */
  onCommitNodes: (pairs: NodePair[], firstWord: string | null) => void;
}

/** Station 1: write freely, surface the spores, then explore their future as nodes. */
export function VisionRoom({ vision, text, onTextChange, spores, onExtracted, nodePairs, onCommitNodes }: VisionRoomProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const mode = useMode();

  const surface = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await api.visionExtract(text);
      onExtracted(res.spores, text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.room}>
      <div className={styles.title}>Vision — write freely; surface the spores that seed the nodes</div>
      <textarea
        className={styles.textarea}
        placeholder="Start anywhere. What is pressing on you? What image won't leave? Don't organize it — just get it down."
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
      />
      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="primary" onClick={surface} disabled={busy || !text.trim() || mode === "replay"}>
          {busy ? "surfacing…" : "Surface the spores"}
        </Button>
        <span className={styles.muted}>
          {mode === "replay"
            ? "switch to Live mode to surface spores from your own text"
            : "the spores travel down the chain — into First Node, then the Field."}
        </span>
      </div>
      {err && (
        <div className={styles.muted} style={{ color: "var(--danger)", marginTop: 8 }}>
          {err}
        </div>
      )}
      {spores.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className={styles.muted}>spores — your word-bank</div>
          <div className={styles.sporeBank}>
            {spores.map((w) => (
              <span key={w} className={styles.spore}>
                {w}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <Button onClick={() => setExplorerOpen(true)}>explore the spores → their future as nodes</Button>
          </div>
        </div>
      )}
      {vision.charge && (
        <div style={{ marginTop: 16 }}>
          <div className={styles.muted}>field-report</div>
          <div className={styles.prose}>{vision.charge}</div>
          {vision.keys && vision.keys.length > 0 && <div className={styles.muted}>keys · {vision.keys.join(" · ")}</div>}
        </div>
      )}

      <SporeExplorer
        open={explorerOpen}
        spores={spores}
        visionText={text}
        initialPairs={nodePairs}
        onClose={(pairs, firstWord) => {
          setExplorerOpen(false);
          onCommitNodes(pairs, firstWord);
        }}
      />
    </div>
  );
}
