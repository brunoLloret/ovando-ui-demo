import { Picker, TextInput, type PickerOption } from "../../../components";
import { useT } from "../../../lib/i18n";
import type { MessageKey } from "../../../lib/i18n";
import type { RoomsState, SectionView } from "../roomsState";
import type { Controllers } from "../types";
import styles from "./rooms.module.css";

type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** One section: its prose + an expandable "plan" (the levers the run used to write it). */
function SectionCard({ section: s, t }: { section: SectionView; t: T }) {
  const plan: [MessageKey, string | undefined][] = [
    ["telling.plan.objective", s.objective],
    ["telling.plan.situation", s.situation],
    ["telling.plan.entryPoint", s.entryPoint],
    ["telling.plan.obstacle", s.obstacle],
    ["telling.plan.inner", s.innerExperience],
    ["telling.plan.unsaid", s.unsaid],
    ["telling.plan.actant", s.actant],
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
          <summary className={styles.planSummary}>{t("telling.planToggle")}</summary>
          <div className={styles.planGrid}>
            {plan
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className={styles.planRow}>
                  <span className={styles.planKey}>{t(k)}</span>
                  <span className={styles.planVal}>{v}</span>
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}

const FORMAT_VALUES = ["linear", "derived", "in-medias-res", "palindrome", "frame", "rupture", "picaresque", "spiral", "fugue", "fold", "braid"] as const;
const POV_VALUES = ["", "she", "he", "they", "i", "we", "you"] as const;
const POV_KEY: Record<string, MessageKey> = {
  "": "telling.pov.explore", she: "telling.pov.she", he: "telling.pov.he",
  they: "telling.pov.they", i: "telling.pov.i", we: "telling.pov.we", you: "telling.pov.you",
};

export interface TellingRoomProps {
  controllers: Controllers;
  onChange: (patch: Partial<Controllers>) => void;
  telling: RoomsState["telling"];
  running: boolean;
  /** Keep the montage/pov/length pickers open even mid-run — the telling gate is asking for them. */
  forceSetup?: boolean;
}

/** Station 5: how the chain is told — montage · point of view · section length; sections stream in. */
export function TellingRoom({ controllers, onChange, telling, running, forceSetup }: TellingRoomProps) {
  const t = useT();
  const formats: PickerOption[] = FORMAT_VALUES.map((v) => ({
    value: v,
    label: t(`telling.format.${v}.label` as MessageKey),
    description: t(`telling.format.${v}.desc` as MessageKey),
  }));
  const povs: PickerOption[] = POV_VALUES.map((v) => ({ value: v, label: t(POV_KEY[v]) }));
  return (
    <div className={styles.room}>
      <div className={styles.title}>{t("telling.title")}</div>

      {(!running || forceSetup) && (
        <>
          <div className={styles.setup}>
            <Picker label={t("telling.montage")} value={controllers.format} options={formats} onChange={(v) => onChange({ format: v })} />
            <Picker label={t("telling.pov")} value={controllers.pov} options={povs} onChange={(v) => onChange({ pov: v })} />
            <TextInput
              label={t("telling.words")}
              type="number"
              min={80}
              max={600}
              value={controllers.words}
              // clamp only on blur — clamping every keystroke forces 80 the moment you type "1",
              // which made the field impossible to edit
              onChange={(e) => onChange({ words: Number(e.target.value) })}
              onBlur={(e) => onChange({ words: Math.max(80, Math.min(600, Number(e.target.value) || 200)) })}
              style={{ width: 64 }}
            />
          </div>
          <div className={styles.muted} style={{ marginTop: 10 }}>
            {t("telling.howTold")}
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
              <SectionCard key={s.n} section={s} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
