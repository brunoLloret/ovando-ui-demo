import { useState } from "react";
import { setLocale, hasChosenLocale, type Locale } from "./lib/locale";
import styles from "./LanguageGate.module.css";

/**
 * First-run language chooser: a full-screen gate with two big buttons, shown until the user
 * explicitly picks a language (auto-detected locale doesn't dismiss it). Bilingual on purpose —
 * it can't rely on a chosen language yet. The header EN|ES toggle switches later.
 */
export function LanguageGate() {
  const [done, setDone] = useState(() => hasChosenLocale());
  if (done) return null;

  const choose = (l: Locale) => {
    setLocale(l);
    setDone(true);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Choose your language">
      <div className={styles.card}>
        <div className={styles.brand}>Field of Potential Meaning</div>
        <div className={styles.prompt}>
          <span>Choose your language</span>
          <span className={styles.promptEs}>Elige tu idioma</span>
        </div>
        <div className={styles.buttons}>
          <button className={styles.lang} onClick={() => choose("en")}>English</button>
          <button className={styles.lang} onClick={() => choose("es")}>Español</button>
        </div>
      </div>
    </div>
  );
}
