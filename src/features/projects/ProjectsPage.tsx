import { useEffect, useState } from "react";
import { Button } from "../../components";
import { api } from "../../lib/api";
import type { SandboxRunSummary } from "../../lib/types";
import styles from "./ProjectsPage.module.css";

export interface ProjectsPageProps {
  onStartNew: () => void;
  onOpen: (run: string) => void;
}

/** Landing: start a new project, or reopen a saved run (the old "load a saved run"). */
export function ProjectsPage({ onStartNew, onOpen }: ProjectsPageProps) {
  const [runs, setRuns] = useState<SandboxRunSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .sandboxRuns()
      .then((r) => alive && setRuns(r))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.h1}>Field of Potential Meaning</h1>
      <p className={styles.lede}>A workshop for the deep structure of a story — the field beneath plot and character.</p>

      <Button variant="primary" onClick={onStartNew} style={{ fontSize: 14, padding: "11px 20px" }}>
        ＋ Start a new project
      </Button>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Old projects</div>
        {err && <div className={styles.muted}>could not load projects — {err}</div>}
        {!runs && !err && <div className={styles.muted}>loading…</div>}
        {runs && runs.length === 0 && <div className={styles.muted}>No projects yet — start one above.</div>}
        {runs && runs.length > 0 && (
          <div className={styles.list}>
            {runs.map((r) => (
              <button key={r.run} className={styles.row} onClick={() => onOpen(r.run)}>
                <span className={styles.seed}>{r.seed}</span>
                <span className={styles.meta}>
                  {r.nodes} nodes
                  {r.frozen ? " · frozen draft" : r.hasWork ? "" : " · layers only"}
                </span>
                <span className={styles.arrow}>→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
