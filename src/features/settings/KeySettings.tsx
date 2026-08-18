import { useCallback, useEffect, useState } from "react";
import { Button, Modal, Picker, TextInput, Toggle, type PickerOption } from "../../components";
import { getKey, setKey, clearKey, validateKey, type Provider } from "../../lib/keys";
import { useT } from "../../lib/i18n";
import styles from "./KeySettings.module.css";

const PLACEHOLDER: Record<Provider, string> = {
  gemini:    "AIza…",
  openai:    "sk-…",
  anthropic: "sk-ant-…",
};

type State = "idle" | "checking" | "ok" | { error: string };

export interface KeySettingsProps {
  open: boolean;
  onClose: () => void;
}

export function KeySettings({ open, onClose }: KeySettingsProps) {
  const t = useT();
  const PROVIDERS: PickerOption[] = [
    { value: "gemini", label: "Gemini", description: t("key.provider.gemini.desc") },
    { value: "openai", label: "OpenAI", description: t("key.provider.openai.desc") },
    { value: "anthropic", label: "Anthropic", description: t("key.provider.anthropic.desc") },
  ];
  const saved = getKey();
  const [provider, setProvider] = useState<Provider>(saved?.provider ?? "gemini");
  const [keyInput, setKeyInput] = useState("");
  const [persist, setPersist] = useState(() => !!localStorage.getItem("ovando_provider_key"));
  const [state, setState] = useState<State>("idle");

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return;
    const k = getKey();
    setProvider(k?.provider ?? "gemini");
    setKeyInput("");
    setPersist(!!localStorage.getItem("ovando_provider_key"));
    setState(k ? "ok" : "idle");
  }, [open]);

  const check = useCallback(async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) { setState({ error: t("key.pasteFirst") }); return; }
    setState("checking");
    const result = await validateKey(provider, trimmed);
    if (result.valid) {
      setKey(provider, trimmed, persist);
      setState("ok");
    } else {
      setState({ error: result.error ?? t("key.invalid") });
    }
  }, [provider, keyInput, persist, t]);

  const clear = useCallback(() => {
    clearKey();
    setKeyInput("");
    setState("idle");
  }, []);

  const hasSaved = !!getKey();
  const isChecking = state === "checking";

  const stateLabel =
    state === "checking" ? t("key.checking") :
    state === "ok"       ? t("key.accepted") :
    typeof state === "object" ? `✗ ${state.error}` : null;

  const stateCls =
    state === "ok"              ? styles.stateOk :
    typeof state === "object"   ? styles.stateError :
    state === "checking"        ? styles.stateChecking : "";

  return (
    <Modal
      open={open}
      title={t("key.title")}
      onClose={onClose}
      footer={
        <div className={styles.footer}>
          {hasSaved && (
            <Button variant="ghost" onClick={clear}>{t("key.clear")}</Button>
          )}
          <Button variant="ghost" onClick={onClose}>{t("key.close")}</Button>
          <Button
            variant="primary"
            onClick={() => void check()}
            disabled={isChecking || !keyInput.trim()}
          >
            {isChecking ? t("key.checking") : t("key.check")}
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.trust}>
          {t("key.trust")}
        </p>

        <p className={styles.hint}>
          {t("key.hint.pre")}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("key.hint.link")}
          </a>
          {t("key.hint.post")}
        </p>

        <div className={styles.field}>
          <Picker
            label={t("key.provider")}
            value={provider}
            options={PROVIDERS}
            onChange={(v) => { setProvider(v as Provider); setState("idle"); }}
          />
        </div>

        <div className={styles.field}>
          <TextInput
            label={t("key.apiKey")}
            type="password"
            placeholder={PLACEHOLDER[provider]}
            value={keyInput}
            onChange={(e) => { setKeyInput(e.target.value); setState("idle"); }}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className={styles.field}>
          <Toggle
            checked={persist}
            onChange={setPersist}
            label={t("key.remember")}
          />
        </div>

        {stateLabel && (
          <p className={[styles.state, stateCls].join(" ")}>{stateLabel}</p>
        )}
      </div>
    </Modal>
  );
}
