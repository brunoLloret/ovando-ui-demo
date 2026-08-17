import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { SandboxRunSummary } from "../../lib/types";
import styles from "./ProjectsPage.module.css";

export interface ProjectsPageProps {
  /** D — Vision → Materials (the core exercise): starts a new Compose project. */
  onStartNew: () => void;
  /** Reopen a saved run. */
  onOpen: (run: string) => void;
  /** The other entry paths (A interview · B ingest · C plain writer). Routed by the parent. */
  onChoose?: (choice: "A" | "B" | "C") => void;
}

// The run the "▶ Demo project" opens (a finished story, ready to walk through on camera).
const DEMO_RUN = "sandbox_ui_helmet";

// A · B · C — the three secondary doors. D (Vision → Materials) is the hero, below.
const PATHS = [
  {
    key: "A",
    glyph: "?",
    cta: "interview →",
    title: "Get to know the work",
    desc: "A guided conversation and timed exercises — even calls with others — to surface what you're making. Gathered into notes that seed the project.",
  },
  {
    key: "B",
    glyph: "⇥",
    cta: "ingest →",
    title: "Bring in existing work",
    desc: "Import a project already underway. A light intake gauges how well you hold it, then lays its basis inside.",
  },
  {
    key: "C",
    glyph: "¶",
    cta: "write →",
    title: "Straight to the page",
    desc: "Open the writer and begin, on a plain, familiar surface. A Vision → Materials session is always one click away.",
  },
] as const;

/** Landing: choose how to begin (A/B/C/D), open the demo, or load a saved run. */
export function ProjectsPage({ onStartNew, onOpen, onChoose }: ProjectsPageProps) {
  const [runs, setRuns] = useState<SandboxRunSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showRuns, setShowRuns] = useState(false);

  const demo = runs?.find((r) => (DEMO_RUN ? r.run === DEMO_RUN : r.hasWork)) ?? null;
  const choose = (k: "A" | "B" | "C") => (onChoose ? onChoose(k) : onStartNew());

  useEffect(() => {
    let alive = true;
    api
      .sandboxRuns()
      .then((r) => alive && setRuns(r))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : String(e)));
    return () => { alive = false; };
  }, []);

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Field of Potential Meaning</p>
      <h1 className={styles.h1}>Start a new project</h1>
      <p className={styles.sub}>choose how to begin — nothing here is binding</p>

      {/* D — the core exercise */}
      <button className={[styles.card, styles.hero].join(" ")} onClick={onStartNew} aria-label="D — Vision to Materials">
        <span className={styles.node}><span className={styles.g}>◦</span></span>
        <span className={styles.body}>
          <span className={styles.tag}>D</span>
          <span className={styles.corelabel}>the core exercise · start here</span>
          <span className={styles.title}>Vision → Materials</span>
          <span className={styles.desc}>From a single seed, mobilize your imagination and populate your first material — the generative heart of the app. Every other path can run it later.</span>
        </span>
        <span className={[styles.enter, styles.gold].join(" ")}>Begin →</span>
      </button>

      {/* A · B · C */}
      <div className={styles.grid}>
        {PATHS.map((p) => (
          <button key={p.key} className={[styles.card, styles.mini].join(" ")} onClick={() => choose(p.key)} aria-label={`${p.key} — ${p.title}`}>
            <span className={styles.top}>
              <span className={styles.tag}>{p.key}</span>
              <span className={[styles.node, styles.sm].join(" ")}><span className={styles.g}>{p.glyph}</span></span>
            </span>
            <span className={styles.title}>{p.title}</span>
            <span className={styles.desc}>{p.desc}</span>
            <span className={styles.foot}><span className={styles.cta}>{p.cta}</span></span>
          </button>
        ))}
      </div>

      {/* Demo + saved runs */}
      <div className={styles.footer}>
        {demo && (
          <button className={styles.footLink} onClick={() => onOpen(demo.run)} title="open the demo project — a finished story, ready to walk through">
            ▶ Demo project{demo.seed ? ` · “${demo.seed}”` : ""}
          </button>
        )}
        <button className={styles.footLink} onClick={() => setShowRuns((s) => !s)} aria-expanded={showRuns}>
          — or load a saved run {showRuns ? "▴" : "▾"}
        </button>
      </div>

      {showRuns && (
        <div className={styles.section}>
          {err && <div className={styles.muted}>could not load runs — {err}</div>}
          {!runs && !err && <div className={styles.muted}>loading…</div>}
          {runs && runs.length === 0 && <div className={styles.muted}>No saved runs yet.</div>}
          {runs && runs.length > 0 && (
            <div className={styles.list}>
              {runs.map((r) => (
                <button key={r.run} className={styles.row} onClick={() => onOpen(r.run)}>
                  <span className={styles.seed}>{r.seed}</span>
                  <span className={styles.meta}>
                    {r.nodes} nodes{r.frozen ? " · frozen draft" : r.hasWork ? "" : " · layers only"}
                  </span>
                  <span className={styles.arrow}>→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
