import { useCallback, useEffect, useState } from "react";
import { Button, Modal, Picker, TextInput, Toggle, type PickerOption } from "../../components";
import { getKey, setKey, clearKey, validateKey, type Provider } from "../../lib/keys";
import styles from "./KeySettings.module.css";

const PROVIDERS: PickerOption[] = [
  { value: "gemini",    label: "Gemini",    description: "Google AI Studio — free tier, no credit card required. Recommended." },
  { value: "openai",    label: "OpenAI",    description: "ChatGPT API — requires a paid OpenAI account." },
  { value: "anthropic", label: "Anthropic", description: "Claude API — requires a paid Anthropic account." },
];

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
    if (!trimmed) { setState({ error: "Paste your key first." }); return; }
    setState("checking");
    const result = await validateKey(provider, trimmed);
    if (result.valid) {
      setKey(provider, trimmed, persist);
      setState("ok");
    } else {
      setState({ error: result.error ?? "Invalid key." });
    }
  }, [provider, keyInput, persist]);

  const clear = useCallback(() => {
    clearKey();
    setKeyInput("");
    setState("idle");
  }, []);

  const hasSaved = !!getKey();
  const isChecking = state === "checking";

  const stateLabel =
    state === "checking" ? "Checking…" :
    state === "ok"       ? "✓ Key accepted — live mode active" :
    typeof state === "object" ? `✗ ${state.error}` : null;

  const stateCls =
    state === "ok"              ? styles.stateOk :
    typeof state === "object"   ? styles.stateError :
    state === "checking"        ? styles.stateChecking : "";

  return (
    <Modal
      open={open}
      title="Provider key"
      onClose={onClose}
      footer={
        <div className={styles.footer}>
          {hasSaved && (
            <Button variant="ghost" onClick={clear}>Clear key</Button>
          )}
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            onClick={() => void check()}
            disabled={isChecking || !keyInput.trim()}
          >
            {isChecking ? "Checking…" : "Check key"}
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.trust}>
          Your key stays in your browser and is only used to run your requests — we never store or log it.
        </p>

        <p className={styles.hint}>
          No key?{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get a free Gemini key
          </a>{" "}
          — no card, ~1 min.
        </p>

        <div className={styles.field}>
          <Picker
            label="Provider"
            value={provider}
            options={PROVIDERS}
            onChange={(v) => { setProvider(v as Provider); setState("idle"); }}
          />
        </div>

        <div className={styles.field}>
          <TextInput
            label="API key"
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
            label="Remember on this device"
          />
        </div>

        {stateLabel && (
          <p className={[styles.state, stateCls].join(" ")}>{stateLabel}</p>
        )}
      </div>
    </Modal>
  );
}
