import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useT } from "../../lib/i18n";
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
  { key: "A", glyph: "?" },
  { key: "B", glyph: "⇥" },
  { key: "C", glyph: "¶" },
] as const;

/** Landing: choose how to begin (A/B/C/D), open the demo, or load a saved run. */
export function ProjectsPage({ onStartNew, onOpen, onChoose }: ProjectsPageProps) {
  const t = useT();
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
      <h1 className={styles.h1}>{t("projects.h1")}</h1>
      <p className={styles.sub}>{t("projects.sub")}</p>

      {/* D — the core exercise */}
      <button className={[styles.card, styles.hero].join(" ")} onClick={onStartNew} aria-label="D — Vision to Materials">
        <span className={styles.node}><span className={styles.g}>◦</span></span>
        <span className={styles.body}>
          <span className={styles.tag}>D</span>
          <span className={styles.corelabel}>{t("projects.core")}</span>
          <span className={styles.title}>{t("projects.heroTitle")}</span>
          <span className={styles.desc}>{t("projects.heroDesc")}</span>
        </span>
        <span className={[styles.enter, styles.gold].join(" ")}>{t("projects.begin")}</span>
      </button>

      {/* A · B · C */}
      <div className={styles.grid}>
        {PATHS.map((p) => {
          const title = t(`projects.path${p.key}.title` as never);
          return (
            <button key={p.key} className={[styles.card, styles.mini].join(" ")} onClick={() => choose(p.key)} aria-label={`${p.key} — ${title}`}>
              <span className={styles.top}>
                <span className={styles.tag}>{p.key}</span>
                <span className={[styles.node, styles.sm].join(" ")}><span className={styles.g}>{p.glyph}</span></span>
              </span>
              <span className={styles.title}>{title}</span>
              <span className={styles.desc}>{t(`projects.path${p.key}.desc` as never)}</span>
              <span className={styles.foot}><span className={styles.cta}>{t(`projects.path${p.key}.cta` as never)}</span></span>
            </button>
          );
        })}
      </div>

      {/* Demo + saved runs */}
      <div className={styles.footer}>
        {demo && (
          <button className={styles.footLink} onClick={() => onOpen(demo.run)} title={t("projects.demoTitle")}>
            {t("projects.demo")}{demo.seed ? ` · “${demo.seed}”` : ""}
          </button>
        )}
        <button className={styles.footLink} onClick={() => setShowRuns((s) => !s)} aria-expanded={showRuns}>
          {t("projects.loadSaved")} {showRuns ? "▴" : "▾"}
        </button>
      </div>

      {showRuns && (
        <div className={styles.section}>
          {err && <div className={styles.muted}>{t("projects.loadErr", { err })}</div>}
          {!runs && !err && <div className={styles.muted}>{t("projects.loading")}</div>}
          {runs && runs.length === 0 && <div className={styles.muted}>{t("projects.none")}</div>}
          {runs && runs.length > 0 && (
            <div className={styles.list}>
              {runs.map((r) => (
                <button key={r.run} className={styles.row} onClick={() => onOpen(r.run)}>
                  <span className={styles.seed}>{r.seed}</span>
                  <span className={styles.meta}>
                    {t("projects.nodesMeta", { n: r.nodes })}{r.frozen ? t("projects.frozen") : r.hasWork ? "" : t("projects.layersOnly")}
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
