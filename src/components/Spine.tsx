import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import styles from "./Spine.module.css";

export type SpineState = "idle" | "done" | "paused";

export interface SpineStation {
  id: string;
  label: string;
  /** Glyph in the node (defaults to the id's first char). */
  glyph?: ReactNode;
  /** Small index shown before the caption. */
  index?: number;
  /** Count badge (shown when > 0). */
  count?: number;
  state?: SpineState;
  accent?: boolean;
}

export interface SpineFeedOpts {
  duration?: number;
  /** Scatter a dot into the target glyph on arrival (default true). */
  populate?: boolean;
  onArrive?: () => void;
}

/** Imperative handle for transient animations the declarative props can't express. */
export interface SpineHandle {
  feed: (fromId: string, toId: string, opts?: SpineFeedOpts) => void;
}

export interface SpineProps {
  stations: SpineStation[];
  current: string;
  onSelect: (id: string) => void;
  left?: ReactNode;
  right?: ReactNode;
}

const SCATTER: [number, number][] = [
  [70, 26],
  [26, 70],
  [78, 72],
  [22, 30],
  [50, 88],
  [86, 46],
];

/**
 * The horizontal glyph spine (ported from spine.js). Content-blind nav: stations, the recess+focus
 * state, count badges, and the feed animation between stations. The parent owns the room content.
 */
export const Spine = forwardRef<SpineHandle, SpineProps>(function Spine(
  { stations, current, onSelect, left, right },
  ref,
) {
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const spineRef = useRef<HTMLDivElement>(null);
  const travelRef = useRef<HTMLDivElement>(null);
  const [dots, setDots] = useState<Record<string, number>>({});

  const feed = useCallback((fromId: string, toId: string, opts: SpineFeedOpts = {}) => {
    const from = nodeRefs.current[fromId];
    const to = nodeRefs.current[toId];
    const spineEl = spineRef.current;
    const travel = travelRef.current;
    if (!from || !to || !spineEl || !travel) return;
    const s = spineEl.getBoundingClientRect();
    const center = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
    };
    const a = center(from);
    const b = center(to);
    travel.style.opacity = "1";
    const anim = travel.animate(
      [{ transform: `translate(${a.x}px,${a.y}px)` }, { transform: `translate(${b.x}px,${b.y}px)` }],
      { duration: opts.duration ?? 500, easing: "ease", fill: "forwards" },
    );
    anim.onfinish = () => {
      travel.style.opacity = "0";
      to.animate([{ transform: "scale(1)" }, { transform: "scale(1.14)" }, { transform: "scale(1)" }], {
        duration: 280,
        easing: "ease-out",
      });
      if (opts.populate !== false) {
        setDots((d) => ({ ...d, [toId]: Math.min((d[toId] ?? 0) + 1, SCATTER.length) }));
      }
      opts.onArrive?.();
    };
  }, []);

  useImperativeHandle(ref, () => ({ feed }), [feed]);

  return (
    <div className={styles.bar}>
      <div className={styles.side}>{left}</div>
      <div className={styles.spine} ref={spineRef}>
        <div className={styles.line} />
        <div className={styles.travel} ref={travelRef} />
        {stations.map((st) => {
          const nodeCls = [
            styles.node,
            current === st.id && styles.current,
            st.state === "done" && styles.done,
            st.state === "paused" && styles.paused,
            st.accent && styles.accent,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div className={styles.cell} key={st.id}>
              <button
                type="button"
                ref={(el) => {
                  nodeRefs.current[st.id] = el;
                }}
                className={nodeCls}
                aria-label={st.label}
                onClick={() => onSelect(st.id)}
              >
                {st.count != null && st.count > 0 && <span className={styles.badge}>{st.count}</span>}
                <span className={styles.glyph}>
                  {st.glyph ?? st.id.charAt(0)}
                  {Array.from({ length: dots[st.id] ?? 0 }).map((_, i) => (
                    <span key={i} className={styles.fdot} style={{ left: `${SCATTER[i][0]}%`, top: `${SCATTER[i][1]}%` }} />
                  ))}
                </span>
              </button>
              <span className={styles.cap}>
                {st.index != null && <span className={styles.capN}>{st.index}</span>} {st.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className={styles.side}>{right}</div>
    </div>
  );
});
