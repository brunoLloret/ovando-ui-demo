import { Picker, TextInput, type PickerOption } from "../../../components";
import type { RoomsState, SectionView } from "../roomsState";
import type { Controllers } from "../types";
import styles from "./rooms.module.css";

/** One section: its prose + an expandable "plan" (the levers the run used to write it). */
function SectionCard({ section: s }: { section: SectionView }) {
  const plan: [string, string | undefined][] = [
    ["objective", s.objective],
    ["situation", s.situation],
    ["entry point", s.entryPoint],
    ["obstacle", s.obstacle],
    ["inner", s.innerExperience],
    ["unsaid", s.unsaid],
    ["actant", s.actant],
  ];
  const hasPlan = plan.some(([, v]) => v);
  return (
    <div className={styles.section}>
      <div className={styles.sectionMeta}>
        <b>§{s.n}</b>
        {s.sceneTitle ? ` · ${s.sceneTitle}` : ""}
        {s.coordinate ? ` · ${s.coordinate}` : ""}
        {s.perspective ? ` · ${s.perspective}` : ""}
      </div>
      {s.prose && <div className={styles.prose}>{s.prose}</div>}
      {hasPlan && (
        <details className={styles.planDetails}>
          <summary className={styles.planSummary}>the plan for this section ▸</summary>
          <div className={styles.planGrid}>
            {plan
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className={styles.planRow}>
                  <span className={styles.planKey}>{k}</span>
                  <span className={styles.planVal}>{v}</span>
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}

const FORMATS: PickerOption[] = [
  { value: "linear", label: "linear", description: "The default — start here. Told in order; see what emerges before rearranging." },
  { value: "derived", label: "derived", description: "The model picks the arrangement it judges best for the material." },
  { value: "in-medias-res", label: "in-medias-res", description: "Opens in the middle of the action, then fills in the past." },
  { value: "palindrome", label: "palindrome", description: "Runs forward, then mirrors back — the shape repeats in reverse." },
  { value: "frame", label: "frame", description: "A story inside a story — an outer scene holds the inner one." },
  { value: "rupture", label: "rupture", description: "A sudden break or jump that dislocates the reader on purpose." },
  { value: "picaresque", label: "picaresque", description: "A loose chain of episodes — one thing after another." },
  { value: "spiral", label: "spiral", description: "Circles the same point, each pass wider or deeper." },
  { value: "fugue", label: "fugue", description: "Several voices or threads interwoven in counterpoint." },
  { value: "fold", label: "fold", description: "Two strands that cross and mirror each other." },
  { value: "braid", label: "braid", description: "A few parallel threads plaited together, crossing throughout." },
];
const POVS: PickerOption[] = [
  { value: "", label: "explore (rotate)" },
  { value: "she", label: "she — third person" },
  { value: "he", label: "he — third person" },
  { value: "they", label: "they — third person plural" },
  { value: "i", label: "I — first person" },
  { value: "we", label: "we — first person plural" },
  { value: "you", label: "you — second person" },
];

export interface TellingRoomProps {
  controllers: Controllers;
  onChange: (patch: Partial<Controllers>) => void;
  telling: RoomsState["telling"];
  running: boolean;
}

/** Station 5: how the chain is told — montage · point of view · section length; sections stream in. */
export function TellingRoom({ controllers, onChange, telling, running }: TellingRoomProps) {
  return (
    <div className={styles.room}>
      <div className={styles.title}>Telling — montage · grammar · sections</div>

      {!running && (
        <>
          <div className={styles.setup}>
            <Picker label="montage" value={controllers.format} options={FORMATS} onChange={(v) => onChange({ format: v })} />
            <Picker label="pov" value={controllers.pov} options={POVS} onChange={(v) => onChange({ pov: v })} />
            <TextInput
              label="words"
              type="number"
              min={80}
              max={600}
              value={controllers.words}
              onChange={(e) => onChange({ words: Math.max(80, Math.min(600, Number(e.target.value) || 200)) })}
              style={{ width: 64 }}
            />
          </div>
          <div className={styles.muted} style={{ marginTop: 10 }}>
            how the chain is told — order, point of view, section length. The sections appear here as they're written.
          </div>
        </>
      )}

      {telling.format && (
        <div style={{ marginTop: running ? 0 : 16 }}>
          <div className={styles.schema}>
            <b style={{ color: "var(--ink)" }}>{telling.format}</b>
            {telling.rationale ? ` — ${telling.rationale}` : ""}
          </div>
          <div className={styles.stack} style={{ marginTop: 8 }}>
            {telling.sections.map((s) => (
              <SectionCard key={s.n} section={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
