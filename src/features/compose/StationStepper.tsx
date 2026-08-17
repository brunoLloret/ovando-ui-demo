import { useState, type ReactNode } from "react";
import type { SpineStation } from "../../components";
import styles from "./StationStepper.module.css";

export interface StationStepperProps {
  stations: SpineStation[];
  current: string;
  onSelect: (id: string) => void;
  /** The run controls (model picker + Write button) — shown in the ⋯ overflow menu. */
  controls?: ReactNode;
}

/** The phone top-bar nav: a compact station stepper (‹ Forces · 4/6 ›) with a tap-to-open station
 * menu and a ⋯ overflow for the controls. The bar never changes size — the menus float over it. */
export function StationStepper({ stations, current, onSelect, controls }: StationStepperProps) {
  const [menu, setMenu] = useState<null | "stations" | "more">(null);
  const idx = Math.max(0, stations.findIndex((s) => s.id === current));
  const cur = stations[idx];
  const go = (i: number) => { if (i >= 0 && i < stations.length) onSelect(stations[i].id); };
  const toggle = (m: "stations" | "more") => setMenu((v) => (v === m ? null : m));

  return (
    <div className={styles.bar}>
      <button className={styles.arrow} onClick={() => go(idx - 1)} disabled={idx <= 0} aria-label="previous station">‹</button>
      <button className={styles.label} onClick={() => toggle("stations")} aria-haspopup="true" aria-expanded={menu === "stations"}>
        <b>{cur?.label ?? "—"}</b>
        <span className={styles.count}>{idx + 1}/{stations.length}</span>
      </button>
      <button className={styles.arrow} onClick={() => go(idx + 1)} disabled={idx >= stations.length - 1} aria-label="next station">›</button>
      <span className={styles.spacer} />
      {controls && (
        <button className={styles.more} onClick={() => toggle("more")} aria-label="controls" aria-expanded={menu === "more"}>⋯</button>
      )}

      {menu === "stations" && (
        <div className={styles.menu}>
          {stations.map((s, i) => (
            <button
              key={s.id}
              className={[styles.menuItem, s.id === current && styles.menuActive].filter(Boolean).join(" ")}
              onClick={() => { onSelect(s.id); setMenu(null); }}
            >
              <span className={styles.menuIdx}>{i + 1}</span> {s.label}
              {s.count ? <span className={styles.menuCount}>· {s.count}</span> : null}
            </button>
          ))}
        </div>
      )}
      {menu === "more" && (
        <div className={[styles.menu, styles.menuControls].join(" ")} onClick={() => setMenu(null)}>
          {controls}
        </div>
      )}
    </div>
  );
}
