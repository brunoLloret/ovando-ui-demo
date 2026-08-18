import { useState } from "react";
import { useT } from "./lib/i18n";
import { useLocale, setLocale, type Locale } from "./lib/locale";
import { hasAccess, grantAccess, checkPassword } from "./lib/access";
import styles from "./AccessGate.module.css";

// Web3Forms access key (tied to caballoret@gmail.com) — these keys are designed to live in client
// code; spam protection is server-side. Overridable via VITE_WEB3FORMS_KEY if ever rotated.
const WEB3FORMS_KEY = (import.meta.env.VITE_WEB3FORMS_KEY as string | undefined) ?? "c9a712f9-ae48-435f-a6f7-5e4454e69adb";
// Optional newsletter link (set VITE_SUBSTACK_URL to show a "subscribe" link).
const SUBSTACK_URL = import.meta.env.VITE_SUBSTACK_URL as string | undefined;
// Loom demo — the /embed/ form of the share link plays inline in an iframe.
const DEMO_EMBED = "https://www.loom.com/embed/b701da43aad94a2fb747f83c78ce0605";

type DemoState = "idle" | "sending" | "sent" | { error: string };

/**
 * The front-page beta gate: enter with an invite password, or request a demo (emails us via a
 * form service). Soft, client-side — the app is BYOK, so this gates who's invited, not anything paid.
 * Sits below the LanguageGate so the visitor picks a language first.
 */
export function AccessGate() {
  const t = useT();
  const locale = useLocale();
  const [granted, setGranted] = useState(() => hasAccess());
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [demo, setDemo] = useState<DemoState>("idle");
  const [showVideo, setShowVideo] = useState(false);

  if (granted) return null;

  const submitPassword = () => {
    if (checkPassword(pw)) {
      grantAccess();
      setGranted(true);
    } else {
      setPwError(true);
    }
  };

  const submitDemo = async () => {
    if (!email.trim()) { setDemo({ error: t("access.demo.needEmail") }); return; }
    if (!WEB3FORMS_KEY) { setDemo({ error: t("access.demo.notConfigured") }); return; }
    setDemo("sending");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: "Ovando — demo request",
          from_name: "Ovando",
          email: email.trim(),
          message: note.trim() || "(no message)",
        }),
      });
      setDemo(res.ok ? "sent" : { error: t("access.demo.error") });
    } catch {
      setDemo({ error: t("access.demo.error") });
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t("access.title")}>
      <div className={styles.card}>
        <div className={styles.localeRow}>
          {(["en", "es"] as Locale[]).map((l) => (
            <button
              key={l}
              type="button"
              className={styles.localeBtn}
              data-active={locale === l}
              onClick={() => setLocale(l)}
              aria-pressed={locale === l}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div className={styles.eyebrow}>{t("access.eyebrow")}</div>
        <h1 className={styles.title}>{t("access.title")}</h1>
        <p className={styles.sub}>{t("access.sub")}</p>

        <div className={styles.panels}>
          {/* Invite password */}
          <section className={styles.panel}>
            <div className={styles.panelTitle}>{t("access.invite.title")}</div>
            <input
              className={styles.input}
              type="password"
              placeholder={t("access.invite.placeholder")}
              value={pw}
              onChange={(e) => { setPw(e.target.value); setPwError(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") submitPassword(); }}
              autoComplete="off"
            />
            <button className={styles.primary} onClick={submitPassword}>{t("access.invite.enter")}</button>
            {pwError && <div className={styles.error}>{t("access.invite.wrong")}</div>}
          </section>

          {/* Watch the demo */}
          <section className={styles.panel}>
            <div className={styles.panelTitle}>{t("access.watch.title")}</div>
            <p className={styles.blurb}>{t("access.watch.blurb")}</p>
            <button className={styles.secondary} onClick={() => setShowVideo(true)}>{t("access.watch.cta")}</button>
          </section>

          {/* Request a demo */}
          <section className={styles.panel}>
            <div className={styles.panelTitle}>{t("access.demo.title")}</div>
            {demo === "sent" ? (
              <div className={styles.sent}>{t("access.demo.sent")}</div>
            ) : (
              <>
                <p className={styles.blurb}>{t("access.demo.blurb")}</p>
                <input
                  className={styles.input}
                  type="email"
                  placeholder={t("access.demo.email")}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (typeof demo === "object") setDemo("idle"); }}
                  autoComplete="email"
                />
                <textarea
                  className={styles.textarea}
                  placeholder={t("access.demo.note")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
                <button className={styles.secondary} onClick={() => void submitDemo()} disabled={demo === "sending"}>
                  {demo === "sending" ? t("access.demo.sending") : t("access.demo.submit")}
                </button>
                {typeof demo === "object" && <div className={styles.error}>{demo.error}</div>}
                {SUBSTACK_URL && (
                  <a className={styles.newsletter} href={SUBSTACK_URL} target="_blank" rel="noopener noreferrer">
                    {t("access.newsletter")}
                  </a>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {showVideo && (
        <div className={styles.videoOverlay} onClick={() => setShowVideo(false)}>
          <div className={styles.videoBox} onClick={(e) => e.stopPropagation()}>
            <button className={styles.videoClose} onClick={() => setShowVideo(false)} aria-label={t("access.watch.close")}>✕</button>
            <div className={styles.videoAspect}>
              <iframe
                src={DEMO_EMBED}
                title={t("access.watch.title")}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
