import { useState } from "react";
import { Button } from "../../../components";
import type { Force } from "../../../lib/types";
import type { RoomsState } from "../roomsState";
import { ForceWorkshop } from "./ForceWorkshop";
import styles from "./rooms.module.css";

export interface ForcesRoomProps {
  forces: RoomsState["forces"];
  /** The editable force list (starts from the generated forces; the user reshapes it). */
  agents: Force[];
  /** Regenerate the WHOLE dramatization from the chain (new conflict/match/forces). */
  onGenerate?: () => void;
  /** Add one new force, distinct from the others. */
  onAddNew: () => void;
  /** Discard the force at index i. */
  onDiscard: (i: number) => void;
  /** Regenerate the forces at these indices (one, or several together). */
  onRegenerate: (indices: number[]) => void;
  running?: boolean;
  canGenerate?: boolean;
  /** A force op (add / regenerate some) is in flight. */
  busy?: boolean;
}

/**
 * Station 4 — the Forces workbench (like the node builder): discard a force, regenerate one,
 * add a new one, select several to regenerate together, or regenerate the whole set. Click a
 * force to deepen it. The reshaped set is what the story is written from.
 */
export function ForcesRoom({ forces, agents, onGenerate, onAddNew, onDiscard, onRegenerate, running, canGenerate, busy }: ForcesRoomProps) {
  const [workshop, setWorkshop] = useState<Force | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const busyAny = busy || running;
  const toggle = (i: number) => setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  return (
    <div className={styles.room}>
      <div className={styles.title}>Forces — the human story emerges</div>

      {onGenerate && (
        <div className={styles.forcesGen}>
          <Button variant="primary" onClick={onGenerate} disabled={busyAny || !canGenerate} title="find/refresh the whole dramatization from the chain — this stage only, not the story">
            {running ? "generating…" : forces ? "↻ regenerate all" : "generate the forces →"}
          </Button>
          <span className={styles.muted}>{canGenerate ? "from the chain you built — the story is written later, in Telling" : "define a node first"}</span>
        </div>
      )}

      {!forces ? (
        <div className={styles.muted}>This stage emerges when you generate the forces — the human situation the chain becomes.</div>
      ) : (
        <>
          {forces.human_match && <div className={styles.prose} style={{ marginBottom: 10 }}>{forces.human_match}</div>}
          {forces.central_conflict && <div className={styles.schema}>conflict · {forces.central_conflict}</div>}

          <div className={styles.forcesBar}>
            <span className={styles.muted}>discard · regenerate one · add · or select several to regenerate together</span>
            <span className={styles.spacerFlex} />
            {sel.length > 0 && (
              <Button onClick={() => { onRegenerate(sel); setSel([]); }} disabled={busyAny}>
                ↻ regenerate selected ({sel.length})
              </Button>
            )}
            <Button variant="ghost" onClick={onAddNew} disabled={busyAny} title="generate one new force, distinct from the others">
              ＋ new force
            </Button>
          </div>

          <div className={styles.forceList}>
            {agents.map((a, i) => {
              const on = sel.includes(i);
              return (
                <div key={`${a.name}-${i}`} className={[styles.forceRow, on && styles.forceRowSel].filter(Boolean).join(" ")}>
                  <button className={styles.forceCheck} onClick={() => toggle(i)} aria-label={on ? "deselect force" : "select force"} title="select to regenerate with others">
                    {on ? "☑" : "☐"}
                  </button>
                  <button className={styles.forceMain} onClick={() => setWorkshop(a)} title="work this force — deepen it">
                    <b>{a.name}</b>
                    {a.intention && <span className={styles.forceWant}> — wants {a.intention}</span>}
                    {(a.action || a.emotion) && (
                      <div className={styles.forceSub}>{[a.action && `does ${a.action}`, a.emotion && `feels ${a.emotion}`].filter(Boolean).join(" · ")}</div>
                    )}
                  </button>
                  <div className={styles.forceActions}>
                    <Button variant="ghost" onClick={() => onRegenerate([i])} disabled={busyAny} title="regenerate this force" aria-label="regenerate">↻</Button>
                    <Button variant="ghost" onClick={() => onDiscard(i)} disabled={busyAny} title="discard this force" aria-label="discard">✕</Button>
                  </div>
                </div>
              );
            })}
            {agents.length === 0 && <div className={styles.muted}>no forces left — add one, or regenerate all.</div>}
          </div>
          {busy && <div className={styles.muted} style={{ marginTop: 8 }}>working…</div>}

          <ForceWorkshop force={workshop} conflict={forces.central_conflict} onClose={() => setWorkshop(null)} />
        </>
      )}
    </div>
  );
}
