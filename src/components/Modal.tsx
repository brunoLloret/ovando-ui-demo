import { useEffect, type ReactNode } from "react";
import styles from "./Modal.module.css";

export interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  /** Footer actions (buttons), rendered right-aligned. */
  footer?: ReactNode;
  /** Card width — "default" (440) or "wide" (680, for workspaces). */
  size?: "default" | "wide";
}

/**
 * A centered pop-up card on a dimmed backdrop. Closes on Escape or backdrop click.
 * Presentational only — caller owns open state and content.
 */
export function Modal({ open, title, onClose, children, footer, size = "default" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        className={[styles.card, size === "wide" && styles.wide].filter(Boolean).join(" ")}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && <div className={styles.title}>{title}</div>}
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
