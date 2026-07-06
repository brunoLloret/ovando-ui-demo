import { useState } from "react";
import type { Force } from "../../../lib/types";
import type { RoomsState } from "../roomsState";
import { ForceWorkshop } from "./ForceWorkshop";
import styles from "./rooms.module.css";

export interface ForcesRoomProps {
  forces: RoomsState["forces"];
}

/** Station 4: the human situation with the same shape as the chain — match, conflict, and each force (click to workshop). */
export function ForcesRoom({ forces }: ForcesRoomProps) {
  const [selected, setSelected] = useState<Force | null>(null);
  return (
    <div className={styles.room}>
      <div className={styles.title}>Forces — the human story emerges</div>
      {!forces ? (
        <div className={styles.muted}>This stage emerges when you Generate — the human situation the chain becomes.</div>
      ) : (
        <>
          {forces.human_match && <div className={styles.prose} style={{ marginBottom: 10 }}>{forces.human_match}</div>}
          {forces.central_conflict && <div className={styles.schema}>conflict · {forces.central_conflict}</div>}
          {forces.agents && forces.agents.length > 0 && (
            <>
              <div className={styles.muted} style={{ margin: "14px 0 6px" }}>the forces — click one to understand & deepen it</div>
              <div className={styles.forceList}>
                {forces.agents.map((a) => (
                  <button key={a.name} className={styles.forceCard} onClick={() => setSelected(a)} title="work this force">
                    <b>{a.name}</b>
                    {a.intention && <span className={styles.forceWant}> — wants {a.intention}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
          <ForceWorkshop force={selected} conflict={forces.central_conflict} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  );
}
