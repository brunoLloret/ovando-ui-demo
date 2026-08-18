import { JsonView } from "../../components";
import type { SandboxEvent } from "../../lib/types";
import { downloadJson } from "../../lib/download";
import { useT, type MessageKey } from "../../lib/i18n";
import styles from "./RawTrace.module.css";

const PHASE_STEPS = new Set(["vision", "keys", "field", "node", "chain", "choice", "dramatize", "plan", "cast", "section", "run", "frozen", "error"]);

export interface RawTraceProps {
  events: SandboxEvent[];
  /** What the writer fed in — the run's ingested controllers/material. */
  inputs: Record<string, unknown>;
}

/** Group events by step, preserving first-seen order; repeated steps collect into arrays. */
function groupByPhase(events: SandboxEvent[]): Array<{ step: string; items: SandboxEvent[] }> {
  const order: string[] = [];
  const byStep = new Map<string, SandboxEvent[]>();
  for (const ev of events) {
    const key = ev.step === "chain-built" ? "chain" : ev.step;
    if (!byStep.has(key)) {
      byStep.set(key, []);
      order.push(key);
    }
    byStep.get(key)!.push(ev);
  }
  return order.map((step) => ({ step, items: byStep.get(step)! }));
}

/**
 * A raw diagnostic trace of the run: the inputs the writer fed in, then what each phase emitted,
 * grouped by step (input → output made legible), plus the full event stream. Collapsed by default.
 */
export function RawTrace({ events, inputs }: RawTraceProps) {
  const t = useT();
  if (events.length === 0) return null;
  const groups = groupByPhase(events);
  const phaseMeta = (step: string) =>
    PHASE_STEPS.has(step)
      ? { label: t(`trace.phase.${step}.label` as MessageKey), desc: t(`trace.phase.${step}.desc` as MessageKey) }
      : { label: step, desc: "" };
  return (
    <details className={styles.wrap}>
      <summary className={styles.summary}>{t("trace.summary", { n: events.length })}</summary>
      <div className={styles.body}>
        <div className={styles.exportRow}>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={() => downloadJson("run-trace.json", { inputs, events })}
            title={t("trace.exportTitle")}
          >
            {t("trace.export")}
          </button>
        </div>
        <div className={styles.phase}>
          <div className={styles.phaseHead}>
            <span className={styles.phaseLabel}>{t("trace.inputs")}</span>
            <span className={styles.phaseDesc}>{t("trace.inputsDesc")}</span>
          </div>
          <JsonView value={inputs} label={t("trace.ingested")} />
        </div>

        {groups.map(({ step, items }) => {
          const meta = phaseMeta(step);
          const value = items.length === 1 ? items[0] : items;
          return (
            <div key={step} className={styles.phase}>
              <div className={styles.phaseHead}>
                <span className={styles.phaseLabel}>{meta.label}</span>
                <span className={styles.phaseDesc}>{meta.desc}</span>
                {items.length > 1 && <span className={styles.count}>×{items.length}</span>}
              </div>
              <JsonView value={value} label={t("trace.output", { label: meta.label.toLowerCase() })} />
            </div>
          );
        })}

        <div className={styles.phase}>
          <JsonView value={events} label={t("trace.stream", { n: events.length })} />
        </div>
      </div>
    </details>
  );
}
