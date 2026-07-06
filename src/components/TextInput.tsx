import type { InputHTMLAttributes } from "react";
import styles from "./TextInput.module.css";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional label rendered above the input (struct register). */
  label?: string;
}

/** A labelled text/number input in the struct register. Fully controlled by the caller. */
export function TextInput({ label, className, ...rest }: TextInputProps) {
  const input = <input className={[styles.input, className].filter(Boolean).join(" ")} {...rest} />;
  if (!label) return input;
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {input}
    </label>
  );
}
