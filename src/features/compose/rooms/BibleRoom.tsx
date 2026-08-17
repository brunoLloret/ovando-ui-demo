import type { RoomsState } from "../roomsState";
import styles from "./rooms.module.css";

export interface BibleRoomProps {
  bible: RoomsState["bible"];
  /** The forces (agents + what they want) that the cast emerged from. */
  forces: RoomsState["forces"];
  /** The telling — its sections carry each scene's title, plan, and context. */
  telling: RoomsState["telling"];
}

/** Serialize the whole bible — characters, action chain, scenes & the finished work — to plain text. */
function bibleToText(
  bible: RoomsState["bible"],
  forces: RoomsState["forces"],
  telling: RoomsState["telling"],
): string {
  const lines: string[] = [];
  const rule = "=".repeat(60);
  lines.push("FIRST BIBLE", rule, "");

  if (forces?.central_conflict) {
    lines.push(`CENTRAL CONFLICT: ${forces.central_conflict}`, "");
  }

  const agents = forces?.agents ?? [];
  if (agents.length > 0) {
    lines.push("CHARACTERS", "-".repeat(60));
    for (const a of agents) {
      lines.push(a.name);
      if (a.intention) lines.push(`  wants: ${a.intention}`);
      if (a.action) lines.push(`  does:  ${a.action}`);
      if (a.emotion) lines.push(`  feels: ${a.emotion}`);
      if (a.derived_from?.length) lines.push(`  from:  ${a.derived_from.join(" · ")}`);
      lines.push("");
    }
  }

  const actionChain = telling?.actionChain ?? [];
  if (actionChain.length > 0) {
    lines.push("ACTION CHAIN", "-".repeat(60));
    actionChain.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    lines.push("");
  }

  const sections = telling?.sections ?? [];
  if (sections.length > 0) {
    lines.push("SCENES", "-".repeat(60));
    for (const s of sections) {
      const head = [`§${s.n}`, s.sceneTitle, s.coordinate, s.perspective].filter(Boolean).join(" · ");
      lines.push(head);
      const ctx: [string, string | undefined][] = [
        ["objective", s.objective],
        ["situation", s.situation],
        ["obstacle", s.obstacle],
        ["inner", s.innerExperience],
        ["unsaid", s.unsaid],
        ["actant", s.actant],
      ];
      for (const [k, v] of ctx) if (v) lines.push(`  ${k}: ${v}`);
      if (s.actions?.length) s.actions.forEach((a, k) => lines.push(`  ${k + 1}. ${a}`));
      lines.push("");
    }
  }

  if (bible.work) {
    lines.push("THE WORK", rule, "", bible.work, "");
  }

  return lines.join("\n");
}

function downloadBible(text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "first-bible.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Station 6: the whole map — characters & their wants, a scene index with per-scene context,
 * and the finished work. */
export function BibleRoom({ bible, forces, telling }: BibleRoomProps) {
  const agents = forces?.agents ?? [];
  const sections = telling?.sections ?? [];
  const actionChain = telling?.actionChain ?? [];
  const empty = !bible.work && !bible.cast && agents.length === 0 && sections.length === 0;

  return (
    <div className={styles.room}>
      <div className={styles.title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span>First Bible — the map, the record &amp; the finished work</span>
        {!empty && (
          <button
            type="button"
            className={styles.downloadBtn}
            onClick={() => downloadBible(bibleToText(bible, forces, telling))}
            title="Download the whole bible as a .txt file"
          >
            ↓ .txt
          </button>
        )}
      </div>
      {empty ? (
        <div className={styles.muted}>The whole map — characters, scenes, and the finished work — appears here when you Generate.</div>
      ) : (
        <>
          {/* Contents — a quick index of what's below */}
          <div className={styles.bibleIndex}>
            <span className={styles.bibleIndexLabel}>contents</span>
            {agents.length > 0 && <a className={styles.bibleIndexLink} href="#bible-characters">characters ({agents.length})</a>}
            {actionChain.length > 0 && <a className={styles.bibleIndexLink} href="#bible-actions">action chain ({actionChain.length})</a>}
            {sections.length > 0 && <a className={styles.bibleIndexLink} href="#bible-scenes">scenes ({sections.length})</a>}
            {bible.work && <a className={styles.bibleIndexLink} href="#bible-work">the work</a>}
          </div>

          {/* The central conflict the whole thing orbits */}
          {forces?.central_conflict && (
            <div className={styles.schema} style={{ marginBottom: 12 }}>
              <b style={{ color: "var(--ink)" }}>central conflict</b> · {forces.central_conflict}
            </div>
          )}

          {/* Characters — each force's human face and what it wants */}
          {agents.length > 0 && (
            <section id="bible-characters" className={styles.bibleSection}>
              <div className={styles.bibleHead}>Characters</div>
              {agents.map((a) => (
                <div key={a.name} className={styles.castCard}>
                  <div className={styles.castName}>{a.name}</div>
                  {a.intention && <div className={styles.castLine}><span className={styles.castKey}>wants</span> {a.intention}</div>}
                  {a.action && <div className={styles.castLine}><span className={styles.castKey}>does</span> {a.action}</div>}
                  {a.emotion && <div className={styles.castLine}><span className={styles.castKey}>feels</span> {a.emotion}</div>}
                  {a.derived_from && a.derived_from.length > 0 && (
                    <div className={styles.castLine}><span className={styles.castKey}>from</span> {a.derived_from.join(" · ")}</div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Action chain — the whole-text sequence of concrete actions (the fabula) */}
          {actionChain.length > 0 && (
            <section id="bible-actions" className={styles.bibleSection}>
              <div className={styles.bibleHead}>Action chain</div>
              <ol className={styles.actionList}>
                {actionChain.map((a, i) => <li key={i} className={styles.actionItem}>{a}</li>)}
              </ol>
            </section>
          )}

          {/* Scenes — the index of sections, each with the context it was written from */}
          {sections.length > 0 && (
            <section id="bible-scenes" className={styles.bibleSection}>
              <div className={styles.bibleHead}>Scenes</div>
              {sections.map((s) => {
                const ctx: [string, string | undefined][] = [
                  ["objective", s.objective],
                  ["situation", s.situation],
                  ["obstacle", s.obstacle],
                  ["inner", s.innerExperience],
                  ["unsaid", s.unsaid],
                  ["actant", s.actant],
                ];
                const hasCtx = ctx.some(([, v]) => v);
                return (
                  <div key={s.n} className={styles.sceneCard}>
                    <div className={styles.sceneMeta}>
                      <b>§{s.n}</b>
                      {s.sceneTitle ? ` · ${s.sceneTitle}` : ""}
                      {s.coordinate ? ` · ${s.coordinate}` : ""}
                      {s.perspective ? ` · ${s.perspective}` : ""}
                    </div>
                    {s.actions && s.actions.length > 0 && (
                      <ol className={styles.actionList} style={{ marginBottom: 6 }}>
                        {s.actions.map((a, k) => <li key={k} className={styles.actionItem}>{a}</li>)}
                      </ol>
                    )}
                    {hasCtx && (
                      <div className={styles.sceneCtx}>
                        {ctx.filter(([, v]) => v).map(([k, v]) => (
                          <div key={k} className={styles.sceneCtxRow}>
                            <span className={styles.sceneCtxKey}>{k}</span>
                            <span className={styles.sceneCtxVal}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* The finished work */}
          {bible.work && (
            <section id="bible-work" className={styles.bibleSection}>
              <div className={styles.bibleHead}>The work</div>
              <div className={styles.work}>{bible.work}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
