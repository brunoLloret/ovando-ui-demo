import styles from "./JsonView.module.css";

export interface JsonViewProps {
  value: unknown;
  /** Collapsible summary label; when set, renders inside a <details>. */
  label?: string;
  open?: boolean;
}

/** Read-only pretty-printed JSON, optionally collapsed under a label. For diagnostic data tabs. */
export function JsonView({ value, label, open = false }: JsonViewProps) {
  const pre = <pre className={styles.pre}>{JSON.stringify(value, null, 2)}</pre>;
  if (!label) return pre;
  return (
    <details open={open} className={styles.details}>
      <summary className={styles.summary}>{label}</summary>
      {pre}
    </details>
  );
}
