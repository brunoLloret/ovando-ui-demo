import styles from "./Toggle.module.css";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  /** Glyph shown on the knob when on / off (defaults `|` / `o`, matching the Notation family). */
  onGlyph?: string;
  offGlyph?: string;
  labelSide?: "left" | "right";
  /** Show an indicator LED beside the switch — lit red when on, dark when off. */
  light?: boolean;
}

/**
 * The squared slide-switch primitive (ported from toggle.js). Controlled: the caller owns state.
 * A raised rounded key rides in a recessed groove; on press it dips onto its shadow.
 */
export function Toggle({ checked, onChange, label, onGlyph = "|", offGlyph = "o", labelSide = "left", light = false }: ToggleProps) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? "toggle"}
      className={styles.switch}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob}>{checked ? onGlyph : offGlyph}</span>
    </button>
  );
  const led = light ? <span aria-hidden="true" className={[styles.led, checked && styles.ledOn].filter(Boolean).join(" ")} /> : null;
  if (!label) return <span className={styles.row}>{button}{led}</span>;
  const text = (
    <span className={styles.label} onClick={() => onChange(!checked)}>
      {label}
    </span>
  );
  return (
    <span className={styles.row}>
      {labelSide === "left" ? text : button}
      {labelSide === "left" ? button : text}
      {led}
    </span>
  );
}
