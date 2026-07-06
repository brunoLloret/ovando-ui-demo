import styles from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  active: string;
  onSelect: (id: string) => void;
}

/** The top-level tab bar (Notation style). Controlled: the caller owns the active tab. */
export function Tabs({ tabs, active, onSelect }: TabsProps) {
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === active}
          className={[styles.tab, t.id === active && styles.active].filter(Boolean).join(" ")}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
