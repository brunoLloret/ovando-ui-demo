import { useEffect, useState } from "react";
import { Button, Modal } from "../../../components";
import { api } from "../../../lib/api";
import { useT } from "../../../lib/i18n";
import type { Force, ForceElaboration } from "../../../lib/types";
import styles from "./ForceWorkshop.module.css";

export interface ForceWorkshopProps {
  /** The force being worked, or null when closed. */
  force: Force | null;
  /** The central conflict, for context in the elaboration. */
  conflict?: string;
  onClose: () => void;
}

/** Pop-up to understand & deepen one force before the story writes — its drives, then an elaboration. */
export function ForceWorkshop({ force, conflict, onClose }: ForceWorkshopProps) {
  const t = useT();
  const [elab, setElab] = useState<ForceElaboration | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setElab(null);
    setErr(null);
  }, [force?.name]);

  const elaborate = async () => {
    if (!force) return;
    setBusy(true);
    setErr(null);
    try {
      setElab(await api.forceElaborate({ name: force.name, intention: force.intention, action: force.action, emotion: force.emotion, conflict }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={force !== null}
      size="wide"
      title={t("workshop.title", { name: force?.name ?? "" })}
      onClose={onClose}
      footer={<Button variant="primary" onClick={onClose}>{t("workshop.done")}</Button>}
    >
      {force && (
        <>
          <div className={styles.grid}>
            {force.intention && <Row label={t("workshop.wants")} value={force.intention} />}
            {force.action && <Row label={t("workshop.does")} value={force.action} />}
            {force.emotion && <Row label={t("workshop.feels")} value={force.emotion} />}
            {force.derived_from && force.derived_from.length > 0 && <Row label={t("workshop.from")} value={force.derived_from.join(" · ")} />}
          </div>

          <div className={styles.actions}>
            <Button onClick={elaborate} disabled={busy}>
              {busy ? t("workshop.deepening") : elab ? t("workshop.again") : t("workshop.elaborate")}
            </Button>
            <span className={styles.hint}>{t("workshop.hint")}</span>
          </div>
          {err && <div className={styles.err}>{err}</div>}

          {elab && (
            <div className={styles.elab}>
              {elab.want && <Row label={t("workshop.deepWant")} value={elab.want} />}
              {elab.fear && <Row label={t("workshop.fear")} value={elab.fear} />}
              {elab.contradiction && <Row label={t("workshop.contradiction")} value={elab.contradiction} />}
              {elab.note && <div className={styles.note}>{elab.note}</div>}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  );
}
