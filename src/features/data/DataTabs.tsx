import { useState } from "react";
import { JsonView } from "../../components";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import styles from "./dataTabs.module.css";

/** Runs — the saved GlobalStates on disk: list + full raw detail. */
export function RunsTab() {
  const { data: runs, error, loading } = useFetch(() => api.runs());
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className={styles.split}>
      <div className={styles.list}>
        {loading && <div className={styles.muted}>loading…</div>}
        {error && <div className={styles.muted}>{error}</div>}
        {runs?.map((r) => (
          <button
            key={r.name}
            className={[styles.item, r.name === selected && styles.active].filter(Boolean).join(" ")}
            onClick={() => setSelected(r.name)}
          >
            <div className={styles.itemTitle}>{r.name}</div>
            <div className={styles.itemMeta}>
              {r.nodes} nodes · {r.writings} writings{r.cost ? ` · $${r.cost.toFixed(3)}` : ""}
            </div>
          </button>
        ))}
      </div>
      <div className={styles.detail}>{selected ? <RunDetail name={selected} /> : <div className={styles.muted}>Select a run</div>}</div>
    </div>
  );
}

function RunDetail({ name }: { name: string }) {
  const { data, error, loading } = useFetch(() => api.runDetail(name), [name]);
  if (loading) return <div className={styles.muted}>loading…</div>;
  if (error) return <div className={styles.muted}>{error}</div>;
  return <JsonView value={data} open />;
}

/** Windows — the per-stage LLM token windows (kernel/llm-windows.json). */
export function WindowsTab() {
  const { data, error, loading } = useFetch(() => api.windows());
  const entries = data && typeof data === "object" ? Object.entries(data) : [];
  return (
    <div className={styles.pad}>
      <div className={styles.h}>LLM windows{entries.length ? ` · ${entries.length}` : ""}</div>
      {loading && <div className={styles.muted}>loading…</div>}
      {error && <div className={styles.muted}>{error}</div>}
      {entries.map(([k, v]) => (
        <div key={k} className={styles.card}>
          <div className={styles.k}>{k}</div>
          <JsonView value={v} />
        </div>
      ))}
    </div>
  );
}

/** Analysis — question and trajectory records from the eval index. */
export function AnalysisTab() {
  const q = useFetch(() => api.questions());
  const t = useFetch(() => api.trajectories());
  const questions = q.data?.records ?? [];
  const trajectories = t.data?.records ?? [];
  return (
    <div className={styles.pad}>
      <div className={styles.section}>
        <div className={styles.h}>Questions{questions.length ? ` · ${questions.length}` : ""}</div>
        {q.loading && <div className={styles.muted}>loading…</div>}
        {q.error && <div className={styles.muted}>{q.error}</div>}
        {questions.map((rec, i) => (
          <JsonView key={i} value={rec} label={`question ${i + 1}`} />
        ))}
      </div>
      <div className={styles.section}>
        <div className={styles.h}>Trajectories{trajectories.length ? ` · ${trajectories.length}` : ""}</div>
        {t.loading && <div className={styles.muted}>loading…</div>}
        {t.error && <div className={styles.muted}>{t.error}</div>}
        {trajectories.map((rec, i) => (
          <JsonView key={i} value={rec} label={`trajectory ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

/** Calibration — the calibration-results records. */
export function CalibrationTab() {
  const { data, error, loading } = useFetch(() => api.calibration());
  const records = data?.records ?? [];
  return (
    <div className={styles.pad}>
      <div className={styles.h}>Calibration{records.length ? ` · ${records.length}` : ""}</div>
      {loading && <div className={styles.muted}>loading…</div>}
      {error && <div className={styles.muted}>{error}</div>}
      {records.length === 0 && !loading && !error && <div className={styles.muted}>No calibration records.</div>}
      {records.map((rec, i) => (
        <JsonView key={i} value={rec} label={`record ${i + 1}`} />
      ))}
    </div>
  );
}
