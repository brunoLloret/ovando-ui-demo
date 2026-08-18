import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { CastMember, Dramatization, Force } from "../../lib/types";
import { useT, type MessageKey } from "../../lib/i18n";
import type { ChainNodeView, SectionView } from "./roomsState";
import styles from "./GlobalContext.module.css";

type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** The read-only snapshot of the shared state, assembled by ComposePage from the live rooms. */
export interface GlobalContextData {
  premise?: string;
  registers: string[];
  chain: ChainNodeView[];
  forces: Dramatization | null;
  agents: Force[];
  format?: string;
  pov?: string;
  words?: number;
  sections: SectionView[];
  work?: string;
  cast?: CastMember[];
  model: string;
  runName?: string;
  events: number;
}

type Status = "full" | "partial" | "open";
interface Layer { key: string; label: string; status: Status; body: ReactNode }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const dot = (s: Status) => (s === "full" ? "●" : s === "partial" ? "◐" : "○");

// The context-carrier "eye": a rounded flat-top hexagon (r = corner radius in the 100×92 viewBox).
const HEX_SIZE = 56;
function unit(x: number, y: number): [number, number] { const m = Math.hypot(x, y) || 1; return [x / m, y / m]; }
function rnd(n: number) { return Math.round(n * 100) / 100; }
function hexPath(r: number): string {
  const pts: [number, number][] = [[28, 8], [72, 8], [94, 46], [72, 84], [28, 84], [6, 46]];
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = pts[(i - 1 + n) % n], c = pts[i], q = pts[(i + 1) % n];
    const v1 = unit(p[0] - c[0], p[1] - c[1]), v2 = unit(q[0] - c[0], q[1] - c[1]);
    const A = [c[0] + v1[0] * r, c[1] + v1[1] * r], B = [c[0] + v2[0] * r, c[1] + v2[1] * r];
    d += (i === 0 ? "M" : "L") + rnd(A[0]) + "," + rnd(A[1]) + "Q" + c[0] + "," + c[1] + " " + rnd(B[0]) + "," + rnd(B[1]);
  }
  return d + "Z";
}
const HEX_PATH = hexPath(9);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldBody}>{children}</div>
    </div>
  );
}

function buildLayers(d: GlobalContextData, t: T): Layer[] {
  const muted = <span className={styles.muted}>—</span>;
  return [
    {
      key: "direction",
      label: t("gc.layer.direction"),
      status: d.premise ? "full" : "open",
      body: (
        <>
          <Field label={t("gc.premise")}>{d.premise || <span className={styles.muted}>{t("gc.premiseNone")}</span>}</Field>
          <Field label={t("gc.registers")}>{d.registers.length ? d.registers.join(" · ") : muted}</Field>
          <Field label={t("gc.model")}>{d.model}</Field>
        </>
      ),
    },
    {
      key: "field",
      label: t("gc.layer.field"),
      status: d.chain.length ? "full" : "open",
      body: d.chain.length ? (
        <div className={styles.list}>
          {d.chain.map((n) => (
            <div key={n.i} className={styles.row}>
              <span className={styles.ord}>{n.i}</span>
              <b>{n.a}</b> <span className={styles.rel}>↔</span> <b>{n.b}</b>
              {n.kind && <span className={styles.chip}>{n.kind}</span>}
              {n.schema && <div className={styles.sub}>{n.schema}</div>}
            </div>
          ))}
        </div>
      ) : <span className={styles.muted}>{t("gc.fieldEmpty")}</span>,
    },
    {
      key: "forces",
      label: t("gc.layer.forces"),
      status: d.forces ? "full" : "open",
      body: d.forces ? (
        <>
          {d.forces.central_conflict && <Field label={t("gc.centralConflict")}>{d.forces.central_conflict}</Field>}
          {d.forces.human_match && <Field label={t("gc.humanSituation")}>{d.forces.human_match}</Field>}
          <div className={styles.list}>
            {d.agents.map((a, i) => (
              <div key={`${a.name}-${i}`} className={styles.row}>
                <b>{a.name}</b>
                {a.intention && <span className={styles.sub}>{t("gc.wants", { intention: a.intention })}</span>}
                {(a.action || a.emotion) && <div className={styles.sub}>{[a.action && t("gc.does", { action: a.action }), a.emotion && t("gc.feels", { emotion: a.emotion })].filter(Boolean).join(" · ")}</div>}
              </div>
            ))}
          </div>
        </>
      ) : <span className={styles.muted}>{t("gc.forcesEmpty")}</span>,
    },
    {
      key: "telling",
      label: t("gc.layer.telling"),
      status: d.sections.length ? "full" : d.format ? "partial" : "open",
      body: (
        <>
          <Field label={t("gc.montagePovLength")}>{d.format || "linear"} · {d.pov || t("gc.povExplore")} · ~{d.words ?? 200}w</Field>
          {d.sections.length ? (
            <div className={styles.list}>
              {d.sections.map((s) => (
                <div key={s.n} className={styles.row}>
                  <b>§{s.n}{s.sceneTitle ? ` — ${s.sceneTitle}` : ""}</b>
                  {s.coordinate && <div className={styles.sub}>{s.coordinate}</div>}
                  {s.objective && <div className={styles.sub}>{t("gc.obj", { v: s.objective })}</div>}
                  {s.obstacle && <div className={styles.sub}>{t("gc.obstacle", { v: s.obstacle })}</div>}
                  {s.unsaid && <div className={styles.sub}>{t("gc.unsaid", { v: s.unsaid })}</div>}
                </div>
              ))}
            </div>
          ) : <span className={styles.muted}>{t("gc.sectionsEmpty")}</span>}
        </>
      ),
    },
    {
      key: "questions",
      label: t("gc.layer.questions"),
      status: "open",
      body: (
        <span className={styles.muted}>
          {t("gc.questionsBody")}
        </span>
      ),
    },
    {
      key: "work",
      label: t("gc.layer.work"),
      status: d.work ? "full" : "open",
      body: (
        <>
          {d.cast && d.cast.length > 0 && <Field label={t("gc.cast")}>{d.cast.map((c) => c.name).join(" · ")}</Field>}
          {d.work ? <div className={styles.work}>{d.work}</div> : <span className={styles.muted}>{t("gc.workEmpty")}</span>}
        </>
      ),
    },
    {
      key: "provenance",
      label: t("gc.layer.provenance"),
      status: d.runName ? "full" : "partial",
      body: (
        <>
          <Field label={t("gc.run")}>{d.runName || <span className={styles.muted}>{t("gc.runNone")}</span>}</Field>
          <Field label={t("gc.model")}>{d.model}</Field>
          <Field label={t("gc.events")}>{d.events}</Field>
        </>
      ),
    },
  ];
}

/**
 * The iris + pupil, moved by their GEOMETRY (cx/cy) rather than a CSS transform — geometry changes
 * can't be defeated by the cascade, a transition rule, a filter cache, or transform-box. Isolated so
 * only this re-renders on cursor move. Center is (49, 45.5) in the 100×92 viewBox.
 */
function TrackingIris({ open }: { open: boolean }) {
  const gRef = useRef<SVGGElement>(null);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!open) setOff({ x: 0, y: 0 }); // recenter when the eye closes
  }, [open]);

  useEffect(() => {
    const MAXX = 7, MAXY = 3.6;
    const onMove = (e: MouseEvent) => {
      if (!openRef.current) return;
      const svg = gRef.current?.ownerSVGElement;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      const cx = r.left + r.width * 0.49, cy = r.top + r.height * (45.5 / 92);
      const vx = e.clientX - cx, vy = e.clientY - cy, d = Math.hypot(vx, vy) || 1;
      setOff({ x: (vx / d) * MAXX, y: (vy / d) * MAXY });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  const cx = 49 + off.x, cy = 45.5 + off.y;
  return (
    <g ref={gRef}>
      <circle cx={cx} cy={cy} r={7.8} fill="none" stroke="currentColor" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3.1} fill="currentColor" />
    </g>
  );
}

/** A draggable hexagon that opens the Global Context — a read-only two-pane inspector of the shared
 * state (Direction · Field · Forces · Telling · Questions · Work · Provenance). */
export function GlobalContext(props: GlobalContextData) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => ({ x: typeof window !== "undefined" ? window.innerWidth - 84 : 1180, y: 150 }));
  const [active, setActive] = useState("direction");
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  // keep the eye inside the viewport when the window resizes (or rotates on a phone)
  useEffect(() => {
    const onResize = () => setPos((p) => ({ x: clamp(p.x, 4, window.innerWidth - 62), y: clamp(p.y, 4, window.innerHeight - 58) }));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const layers = useMemo(() => buildLayers(props, t), [props, t]);
  const current = layers.find((l) => l.key === active) ?? layers[0];

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    setPos({ x: clamp(drag.current.ox + dx, 4, window.innerWidth - 62), y: clamp(drag.current.oy + dy, 4, window.innerHeight - 58) });
  };
  const onPointerUp = () => {
    const moved = drag.current?.moved;
    drag.current = null;
    if (!moved) setOpen((o) => !o);
  };

  // anchor the panel near the button, clamped to the viewport
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const panelLeft = clamp(pos.x - 360, 8, vw - 380);
  const panelTop = clamp(pos.y + 58, 8, (typeof window !== "undefined" ? window.innerHeight : 800) - 420);

  return (
    <>
      <button
        className={[styles.hex, open && styles.isOpen].filter(Boolean).join(" ")}
        style={{ left: pos.x, top: pos.y }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        title={t("gc.hexTitle")}
        aria-label={t("gc.title")}
        aria-pressed={open}
      >
        <svg className={styles.svg} viewBox="0 0 100 92" width={HEX_SIZE} height={Math.round((HEX_SIZE * 92) / 100)}>
          <path className={styles.face} d={HEX_PATH} fill="var(--card)" stroke="var(--ink)" strokeWidth={4} strokeLinejoin="round" />
          {/* brow */}
          <path fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" d="M33,40 C40,31 50,29 60,31 C65,32 69,35 72,38" />
          {/* eye shut (rest state) */}
          <g className={styles.eyeClosed} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path strokeWidth={2.8} d="M28,49 C38,53 45,53 50,53 C58,53 67,50 73,44" />
            <path strokeWidth={1.5} d="M40,53 l-2,4" />
            <path strokeWidth={1.5} d="M49,53.5 l-1,4.4" />
            <path strokeWidth={1.5} d="M58,52.5 l1.6,4" />
          </g>
          {/* eye open (on open) */}
          <g className={styles.eyeOpen} strokeLinecap="round" strokeLinejoin="round">
            <path fill="none" stroke="currentColor" strokeWidth={2.8} d="M28,49 C33,37 40,32 49,32 C60,32 69,39 73,44 C68,55 58,59 47,58 C39,58 32,54 28,49 Z" />
            <TrackingIris open={open} />
          </g>
        </svg>
      </button>

      {open && (
        <div className={styles.panel} style={{ left: panelLeft, top: panelTop }}>
          <div className={styles.head}>
            <span className={styles.title}>{t("gc.title")}</span>
            {props.runName && <span className={styles.runChip}>{props.runName}</span>}
            <span className={styles.spacer} />
            <button className={styles.close} onClick={() => setOpen(false)} aria-label={t("gc.close")}>✕</button>
          </div>
          <div className={styles.body}>
            <nav className={styles.nav}>
              {layers.map((l) => (
                <button
                  key={l.key}
                  className={[styles.navItem, l.key === active && styles.navActive].filter(Boolean).join(" ")}
                  onClick={() => setActive(l.key)}
                >
                  <span className={[styles.status, styles[l.status]].filter(Boolean).join(" ")}>{dot(l.status)}</span>
                  {l.label}
                </button>
              ))}
            </nav>
            <div className={styles.content}>{current.body}</div>
          </div>
        </div>
      )}
    </>
  );
}
