import { useEffect, useRef } from "react";
import "./storyfield.css";

export interface StoryFieldTabProps {
  /** Whether this tab is currently shown — the Three.js module loads lazily on first activation. */
  active: boolean;
}

/**
 * The Story Field viz. Reuses the tested Three.js module (public/story-field.js) rather than
 * rewriting it: React renders the exact DOM the module reads, and injects the module script on
 * first activation. The module registers window.sf* and inits lazily on "Show narrative".
 */
export function StoryFieldTab({ active }: StoryFieldTabProps) {
  const injected = useRef(false);

  useEffect(() => {
    if (!active || injected.current || document.getElementById("sf-module")) return;
    injected.current = true;
    const s = document.createElement("script");
    s.type = "module";
    s.id = "sf-module";
    s.src = "/story-field.js";
    document.body.appendChild(s);
  }, [active]);

  return (
    <div className="sf-main">
      <h2 className="sf-h2">Story field — feed any story</h2>
      <textarea
        id="sf-text"
        rows={4}
        placeholder="Paste a full story (chapters, paragraphs — any length). The two fields are computed at every scale."
      />
      <div className="sf-row">
        <button className="sf-key" id="sf-nbtn" onClick={() => window.sfNarrative?.()}>
          Show narrative
        </button>
        <span id="sf-error" className="sf-error" />
      </div>
      <div className="sf-row">
        <span id="sf-scale-controls" className="struct" style={{ display: "none" }}>
          <span className="sf-lbl">scale</span>
          <button className="sf-scale active" data-scale="sentences" onClick={() => window.sfSetScale?.("sentences")}>
            sentences
          </button>
          <button className="sf-scale" data-scale="paragraphs" onClick={() => window.sfSetScale?.("paragraphs")}>
            paragraphs
          </button>
          <button className="sf-scale" data-scale="chapters" onClick={() => window.sfSetScale?.("chapters")}>
            chapters
          </button>
        </span>
        <span id="sf-order-controls" className="struct" style={{ display: "none" }}>
          <span className="sf-lbl">order</span>
          <button className="sf-order active" data-order="told" onClick={() => window.sfSetOrder?.("told")}>
            as told
          </button>
          <button className="sf-order" data-order="happened" onClick={() => window.sfSetOrder?.("happened")}>
            as happened
          </button>
        </span>
      </div>
      <div id="sf-readout" />
      <div id="sf-arc" className="struct sf-arc" />
      <div id="sf-canvas">
        <div id="sf-tooltip" />
      </div>
      <div className="struct sf-legend">
        <b style={{ color: "var(--ink)" }}>Narrative:</b> height = tension (the arc) · color = chronology · toggle
        as-told ⇄ as-happened to see the telling rearrange time · colored threads = characters.
      </div>
    </div>
  );
}
