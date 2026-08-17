import { JsonView } from "../../components";
import type { SandboxEvent } from "../../lib/types";
import styles from "./RawTrace.module.css";

export interface RawTraceProps {
  events: SandboxEvent[];
  /** What the writer fed in — the run's ingested controllers/material. */
  inputs: Record<string, unknown>;
}

/** A friendly label + one-line "what this phase does" for each event step. */
const PHASE: Record<string, { label: string; desc: string }> = {
  vision: { label: "Vision", desc: "seed → a material field (statement · charge)" },
  keys: { label: "Keys", desc: "the field → charged key words" },
  field: { label: "First node", desc: "two words → their relation" },
  node: { label: "Chain nodes", desc: "each pair → a relation (kind · schema · process)" },
  chain: { label: "Chain built", desc: "the assembled relational skeleton" },
  "chain-built": { label: "Chain built", desc: "the assembled relational skeleton" },
  choice: { label: "Joints", desc: "the forks you picked (I-pick)" },
  dramatize: { label: "Forces", desc: "the chain → a human situation (agents · conflict · match)" },
  plan: { label: "Telling plan", desc: "the forces → a montage / discourse order" },
  cast: { label: "Cast", desc: "the agents → named characters" },
  section: { label: "Sections", desc: "the plan → prose, one section at a time" },
  run: { label: "Run", desc: "start / done — the finished work" },
  frozen: { label: "Frozen", desc: "the run was paused into a draft" },
  error: { label: "Error", desc: "something failed" },
};

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
  if (events.length === 0) return null;
  const groups = groupByPhase(events);
  return (
    <details className={styles.wrap}>
      <summary className={styles.summary}>raw trace — what each phase ingested &amp; emitted ({events.length} events)</summary>
      <div className={styles.body}>
        <div className={styles.phase}>
          <div className={styles.phaseHead}>
            <span className={styles.phaseLabel}>Inputs</span>
            <span className={styles.phaseDesc}>what you fed the run</span>
          </div>
          <JsonView value={inputs} label="ingested inputs" />
        </div>

        {groups.map(({ step, items }) => {
          const meta = PHASE[step] ?? { label: step, desc: "" };
          const value = items.length === 1 ? items[0] : items;
          return (
            <div key={step} className={styles.phase}>
              <div className={styles.phaseHead}>
                <span className={styles.phaseLabel}>{meta.label}</span>
                <span className={styles.phaseDesc}>{meta.desc}</span>
                {items.length > 1 && <span className={styles.count}>×{items.length}</span>}
              </div>
              <JsonView value={value} label={`${meta.label.toLowerCase()} — output`} />
            </div>
          );
        })}

        <div className={styles.phase}>
          <JsonView value={events} label={`full event stream (${events.length})`} />
        </div>
      </div>
    </details>
  );
}
