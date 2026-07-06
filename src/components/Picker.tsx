import { useEffect, useRef, useState } from "react";
import styles from "./Picker.module.css";

export interface PickerOption {
  value: string;
  label: string;
  /** Plain-language explanation shown when the option is hovered. */
  description?: string;
}

export interface PickerProps {
  label?: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
}

/** A labelled dropdown that reveals a plain-words description as you hover options (the montage/pov picker). */
export function Picker({ label, value, options, onChange }: PickerProps) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];
  const shown = options.find((o) => o.value === hover) ?? current;

  return (
    <span className={styles.wrap} ref={ref}>
      {label && <span className={styles.label}>{label}</span>}
      <button type="button" className={styles.btn} onClick={() => setOpen((o) => !o)}>
        {current?.label ?? "—"} <span className={styles.caret}>▾</span>
      </button>
      {open && (
        <div className={styles.pop} onMouseLeave={() => setHover(null)}>
          <div className={styles.opts}>
            {options.map((o) => (
              <button
                key={o.value}
                className={[styles.opt, o.value === value && styles.sel].filter(Boolean).join(" ")}
                onMouseEnter={() => setHover(o.value)}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          {shown?.description && <div className={styles.desc}>{shown.description}</div>}
        </div>
      )}
    </span>
  );
}
