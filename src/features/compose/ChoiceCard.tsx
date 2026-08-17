import { useEffect, useState } from "react";
import { Button, TextInput } from "../../components";
import type { ChoicePrompt, ChoiceResult } from "../../lib/types";
import styles from "./ChoiceCard.module.css";

export interface ChoiceCardProps {
  prompt: ChoicePrompt;
  onAnswer: (result: ChoiceResult) => void;
  /** Called on any interaction — signals presence to reset the freeze countdown. */
  onActivity?: () => void;
}

/** Renders a live joint: the "pair" joint (two editable words) or an options joint (pick + direction). */
export function ChoiceCard({ prompt, onAnswer, onActivity }: ChoiceCardProps) {
  const act = onActivity ?? (() => {});
  const [a, setA] = useState(prompt.pair?.a ?? "");
  const [b, setB] = useState(prompt.pair?.b ?? "");
  const [selected, setSelected] = useState(0);
  const [multiSel, setMultiSel] = useState<number[]>([]);
  const [text, setText] = useState("");

  // reset local draft when a new joint arrives
  useEffect(() => {
    setA(prompt.pair?.a ?? "");
    setB(prompt.pair?.b ?? "");
    setSelected(0);
    setMultiSel([]);
    setText("");
  }, [prompt.id]);

  const isPair = prompt.at === "pair";
  const isMulti = Boolean(prompt.multi);
  const cap = prompt.maxSelect ?? 0;

  const toggleMulti = (i: number) => {
    act();
    setMultiSel((prev) => {
      if (prev.includes(i)) return prev.filter((x) => x !== i);
      if (cap > 0 && prev.length >= cap) return prev; // at the cap — ignore further picks
      return [...prev, i];
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <b>{prompt.title}</b>
        <span className={styles.chip}>{prompt.at}</span>
      </div>
      {prompt.context && <div className={styles.context}>{prompt.context}</div>}

      {isPair ? (
        <>
          <div className={styles.pair}>
            <TextInput label="word A" value={a} onChange={(e) => { setA(e.target.value); act(); }} />
            <TextInput label="word B" value={b} onChange={(e) => { setB(e.target.value); act(); }} />
          </div>
          <div className={styles.actions}>
            <Button onClick={() => onAnswer({ index: 0, pair: { a: a.trim().toLowerCase(), b: b.trim().toLowerCase() } })}>
              use this pair →
            </Button>
            <Button
              variant="ghost"
              onClick={() => onAnswer({ index: 0, regenerate: true, pair: { a: a.trim().toLowerCase(), b: b.trim().toLowerCase() } })}
            >
              ↻ generate a fresh pair
            </Button>
          </div>
        </>
      ) : prompt.at === "telling" ? (
        <>
          <div className={styles.context}>Set montage · point of view · length in the room below, then write.</div>
          <textarea
            className={styles.direction}
            placeholder="add any final direction for the telling (optional)"
            value={text}
            onChange={(e) => { setText(e.target.value); act(); }}
          />
          <div className={styles.actions}>
            <Button onClick={() => onAnswer({ index: 0, text: text.trim() || undefined })}>write the story →</Button>
          </div>
        </>
      ) : prompt.at === "forces" ? (
        <>
          <div className={styles.options}>
            {prompt.options.map((opt, i) => (
              <div key={i} className={styles.option} style={{ cursor: "default" }}>
                <div className={styles.label}>{opt.label}</div>
                {opt.detail && <div className={styles.detail}>{opt.detail}</div>}
              </div>
            ))}
          </div>
          <textarea
            className={styles.direction}
            placeholder="add a note to bind the forces (optional) — folds into the story"
            value={text}
            onChange={(e) => { setText(e.target.value); act(); }}
          />
          <div className={styles.actions}>
            <Button onClick={() => onAnswer({ index: 0, text: text.trim() || undefined })}>approve the forces →</Button>
            <Button variant="ghost" onClick={() => onAnswer({ index: 0, text: text.trim() || undefined, regenerate: true })}>
              ↻ regenerate them
            </Button>
          </div>
        </>
      ) : isMulti ? (
        <>
          <div className={styles.options}>
            {prompt.options.map((opt, i) => {
              const on = multiSel.includes(i);
              const atCap = cap > 0 && multiSel.length >= cap && !on;
              return (
                <button
                  key={i}
                  className={[styles.option, on && styles.selected].filter(Boolean).join(" ")}
                  onClick={() => toggleMulti(i)}
                  disabled={atCap}
                  style={atCap ? { opacity: 0.45 } : undefined}
                >
                  <div className={styles.label}>
                    <span className={styles.kind}>{on ? "✓" : "＋"}</span> {opt.label}
                  </div>
                  {opt.detail && <div className={styles.detail}>{opt.detail}</div>}
                </button>
              );
            })}
          </div>
          <textarea
            className={styles.direction}
            placeholder="add your reading or direction (optional) — this folds into the story"
            value={text}
            onChange={(e) => { setText(e.target.value); act(); }}
          />
          <div className={styles.actions}>
            <Button onClick={() => onAnswer({ index: 0, selected: multiSel, text: text.trim() || undefined })}>
              {multiSel.length ? `Use ${multiSel.length}${cap ? ` of ${cap}` : ""} →` : "Use none — range freely →"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.options}>
            {prompt.options.map((opt, i) => {
              const on = i === selected;
              return (
                <button
                  key={i}
                  className={[styles.option, on && styles.selected].filter(Boolean).join(" ")}
                  onClick={() => { setSelected(i); act(); }}
                >
                  {opt.schema && <div className={styles.schema}>{opt.schema}</div>}
                  <div className={styles.label}>
                    <span className={styles.radio}>{on ? "●" : "○"}</span>
                    {opt.kind && <span className={styles.kind}>{opt.kind}</span>} {opt.label}
                  </div>
                  {opt.detail && <div className={styles.detail}>{opt.detail}</div>}
                </button>
              );
            })}
          </div>
          <textarea
            className={styles.direction}
            placeholder="add your reading or direction (optional) — this folds into the story"
            value={text}
            onChange={(e) => { setText(e.target.value); act(); }}
          />
          <div className={styles.actions}>
            <Button onClick={() => onAnswer({ index: selected, text: text.trim() || undefined })}>
              Choose “{prompt.options[selected]?.label ?? ""}” →
            </Button>
            <Button variant="ghost" onClick={() => onAnswer({ index: selected, text: text.trim() || undefined, regenerate: true })}>
              None fit — regenerate
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
