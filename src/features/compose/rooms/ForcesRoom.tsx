import { useState } from "react";
import { Button } from "../../../components";
import { useT } from "../../../lib/i18n";
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
  const t = useT();
  const [workshop, setWorkshop] = useState<Force | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const busyAny = busy || running;
  const toggle = (i: number) => setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  return (
    <div className={styles.room}>
      <div className={styles.title}>{t("forces.title")}</div>

      {onGenerate && (
        <div className={styles.forcesGen}>
          <Button variant="primary" onClick={onGenerate} disabled={busyAny || !canGenerate} title={t("forces.genTitle")}>
            {running ? t("forces.generating") : forces ? t("forces.regenAll") : t("forces.generate")}
          </Button>
          <span className={styles.muted}>{canGenerate ? t("forces.fromChain") : t("forces.defineFirst")}</span>
        </div>
      )}

      {!forces ? (
        <div className={styles.muted}>{t("forces.empty")}</div>
      ) : (
        <>
          {forces.human_match && <div className={styles.prose} style={{ marginBottom: 10 }}>{forces.human_match}</div>}
          {forces.central_conflict && <div className={styles.schema}>{t("forces.conflict")} · {forces.central_conflict}</div>}

          <div className={styles.forcesBar}>
            <span className={styles.muted}>{t("forces.bar")}</span>
            <span className={styles.spacerFlex} />
            {sel.length > 0 && (
              <Button onClick={() => { onRegenerate(sel); setSel([]); }} disabled={busyAny}>
                {t("forces.regenSelected", { n: sel.length })}
              </Button>
            )}
            <Button variant="ghost" onClick={onAddNew} disabled={busyAny} title={t("forces.newForceTitle")}>
              {t("forces.newForce")}
            </Button>
          </div>

          <div className={styles.forceList}>
            {agents.map((a, i) => {
              const on = sel.includes(i);
              return (
                <div key={`${a.name}-${i}`} className={[styles.forceRow, on && styles.forceRowSel].filter(Boolean).join(" ")}>
                  <button className={styles.forceCheck} onClick={() => toggle(i)} aria-label={on ? t("forces.deselect") : t("forces.select")} title={t("forces.selectToRegen")}>
                    {on ? "☑" : "☐"}
                  </button>
                  <button className={styles.forceMain} onClick={() => setWorkshop(a)} title={t("forces.workTitle")}>
                    <b>{a.name}</b>
                    {a.intention && <span className={styles.forceWant}> {t("forces.wants", { intention: a.intention })}</span>}
                    {(a.action || a.emotion) && (
                      <div className={styles.forceSub}>{[a.action && t("forces.does", { action: a.action }), a.emotion && t("forces.feels", { emotion: a.emotion })].filter(Boolean).join(" · ")}</div>
                    )}
                  </button>
                  <div className={styles.forceActions}>
                    <Button variant="ghost" onClick={() => onRegenerate([i])} disabled={busyAny} title={t("forces.regenOne")} aria-label={t("forces.regenerate")}>↻</Button>
                    <Button variant="ghost" onClick={() => onDiscard(i)} disabled={busyAny} title={t("forces.discardOne")} aria-label={t("forces.discard")}>✕</Button>
                  </div>
                </div>
              );
            })}
            {agents.length === 0 && <div className={styles.muted}>{t("forces.emptyList")}</div>}
          </div>
          {busy && <div className={styles.muted} style={{ marginTop: 8 }}>{t("forces.working")}</div>}

          <ForceWorkshop force={workshop} conflict={forces.central_conflict} onClose={() => setWorkshop(null)} />
        </>
      )}
    </div>
  );
}
