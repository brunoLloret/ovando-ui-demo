import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "key" | "primary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `key` = neutral pushable key (default); `primary` = ochre (reserved for Generate-class actions); `ghost` = borderless. */
  variant?: Variant;
}

/**
 * The pushable "key" primitive of the Notation system: a raised card that dips onto its
 * offset shadow on press. `primary` is the only place ochre may appear.
 */
export function Button({ variant = "key", className, type = "button", ...rest }: ButtonProps) {
  const cls = [styles.btn, styles[variant], className].filter(Boolean).join(" ");
  return <button type={type} className={cls} {...rest} />;
}
