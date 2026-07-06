import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Spine, Toggle, type SpineHandle, type SpineStation } from "../../components";
import { api } from "../../lib/api";
import type { RunControllers } from "../../lib/types";
import { useSandboxRun } from "../run";
import { useNodeChain, type NodePair } from "../nodes";
import { useComposeRooms, type RoomsState } from "./roomsState";
import { hydrateFromState } from "./loadRun";
import { narrate } from "./narrate";
import { ChoiceCard } from "./ChoiceCard";
import { DEFAULT_CONTROLLERS, type Controllers } from "./types";
import { VisionRoom } from "./rooms/VisionRoom";
import { NodeInspector } from "./rooms/NodeInspector";
import { FieldRoom } from "./rooms/FieldRoom";
import { ForcesRoom } from "./rooms/ForcesRoom";
import { TellingRoom } from "./rooms/TellingRoom";
import { BibleRoom } from "./rooms/BibleRoom";
import styles from "./ComposePage.module.css";

const STAGE_ORDER = ["vision", "node", "field", "forces", "telling", "bible"] as const;
const STAGE_SHORT: Record<string, string> = {
  vision: "Vision",
  node: "Node",
  field: "Field",
  forces: "Forces",
  telling: "Telling",
  bible: "Bible",
};
const STAGE_LABEL: Record<string, string> = {
  vision: "Vision — the seed becomes a material field",
  node: "First node — two words, one relation",
  field: "Field — growing the chain of nodes",
  forces: "Forces — the human story emerges",
  telling: "Telling — arranging & writing the sections",
  bible: "Bible — cast, record & the finished work",
};

/** step → spine station id (the labels shifted historically; this is the single mapping). */
function stationForStep(step: string): string {
  switch (step) {
    case "vision":
    case "keys":
      return "vision";
    case "field":
      return "node";
    case "node":
    case "chain":
    case "chain-built":
      return "field";
    case "dramatize":
      return "forces";
    case "plan":
    case "cast":
    case "section":
    case "edition":
      return "telling";
    case "run":
      return "bible";
    default:
      return "vision";
  }
}

/**
 * The Compose chain: the spine nav + one focused room + the live run. Generate streams the
 * pipeline (useSandboxRun), events fold into per-room state (useComposeRooms), focus follows
 * the run, and joints surface as ChoiceCards when "I pick" is on. The Field is the NodeChainEditor.
 */
export interface ComposePageProps {
  /** Request to (re)load a saved run into the rooms, or reset to fresh. Nonce forces re-fire. */
  loadRequest?: { run: string | null; nonce: number };
}

export function ComposePage({ loadRequest }: ComposePageProps = {}) {
  const [controllers, setControllers] = useState<Controllers>(DEFAULT_CONTROLLERS);
  const [pick, setPick] = useState(false);
  const chain = useNodeChain([]);
  const nodePairs = useMemo<NodePair[]>(() => chain.nodes.map((n) => ({ a: n.a, b: n.b })), [chain.nodes]);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(0);
  const [spores, setSpores] = useState<string[]>([]);
  const [visionText, setVisionText] = useState("");
  const [current, setCurrent] = useState("vision");
  const [formError, setFormError] = useState<string | null>(null);
  const [loadedRooms, setLoadedRooms] = useState<RoomsState | null>(null);

  const run = useSandboxRun({ pick });
  const derivedRooms = useComposeRooms(run.events);
  // a live run's events win; otherwise show a loaded run (or the empty initial state)
  const rooms = run.events.length > 0 ? derivedRooms : (loadedRooms ?? derivedRooms);
  const spineRef = useRef<SpineHandle>(null);
  const prevChain = useRef(0);

  const patchControllers = useCallback((patch: Partial<Controllers>) => setControllers((c) => ({ ...c, ...patch })), []);

  // focus follows the run
  useEffect(() => {
    if (rooms.phase) setCurrent(stationForStep(rooms.phase));
  }, [rooms.phase]);

  // feed the field glyph each time a node completes
  useEffect(() => {
    if (rooms.chain.length > prevChain.current) spineRef.current?.feed("node", "field", { populate: true });
    prevChain.current = rooms.chain.length;
  }, [rooms.chain.length]);

  // a joint often fires before its phase event is emitted (e.g. the first relation, while focus is
  // still on Vision) — pull focus to where the joint belongs so the card isn't over the wrong room
  useEffect(() => {
    if (!run.pendingChoice) return;
    setCurrent(run.pendingChoice.at === "match" ? "forces" : "node");
  }, [run.pendingChoice]);

  // open a saved run into the rooms, or reset to a fresh project (driven by loadRequest.nonce)
  useEffect(() => {
    if (!loadRequest) return;
    run.reset();
    setLoadedRooms(null);
    setFormError(null);
    if (!loadRequest.run) {
      setControllers(DEFAULT_CONTROLLERS);
      chain.setAll([]);
      setSpores([]);
      setVisionText("");
      setCurrent("vision");
      return;
    }
    let alive = true;
    api
      .sandboxState(loadRequest.run)
      .then((st) => {
        if (!alive) return;
        const h = hydrateFromState(st);
        setLoadedRooms(h.rooms);
        setControllers((c) => ({ ...c, seed: h.seed, partner: h.partner, scale: h.scale }));
        chain.setAll(h.nodePairs);
        setCurrent("bible");
      })
      .catch((e) => alive && setFormError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRequest?.nonce]);

  const onPropose = useCallback(
    async (count: number): Promise<NodePair[]> => {
      if (spores.length === 0) return [];
      const res = await api.visionPropose(spores, visionText);
      return res.nodePairs.slice(0, count);
    },
    [spores, visionText],
  );

  const generate = useCallback(() => {
    // only complete nodes go to the run; each may carry a relation established in the node room
    const runPairs = chain.nodes
      .filter((n) => n.a.trim() && n.b.trim())
      .map((n) => ({ a: n.a, b: n.b, ...(n.relation ? { relation: n.relation } : {}) }));
    const usePairs = runPairs.length > 0;
    const seed = usePairs ? runPairs[0].a : controllers.seed.trim();
    if (!seed) {
      setFormError("Define a node (two words) in the Field, or type a seed.");
      setCurrent("node");
      return;
    }
    setFormError(null);
    setLoadedRooms(null); // a fresh run's events take over the rooms
    const body: RunControllers = {
      seed,
      partner: usePairs ? runPairs[0].b || undefined : controllers.partner.trim() || undefined,
      scale: usePairs ? runPairs.length : controllers.scale,
      format: controllers.format,
      pov: controllers.pov,
      words: controllers.words,
      manual: true,
      nodePairs: usePairs ? runPairs : undefined,
    };
    void run.start(body);
  }, [chain, controllers, run]);

  const stations: SpineStation[] = useMemo(() => {
    const fieldCount = rooms.chain.length || nodePairs.length;
    return [
      { id: "vision", index: 1, label: "vision", glyph: "◦" },
      { id: "node", index: 2, label: "node", glyph: "o–o" },
      { id: "field", index: 3, label: "field", glyph: "∴", count: fieldCount },
      { id: "forces", index: 4, label: "forces", glyph: ">|<" },
      { id: "telling", index: 5, label: "telling", glyph: "¶" },
      { id: "bible", index: 6, label: "bible", glyph: "§" },
    ];
  }, [rooms.chain.length, nodePairs.length]);

  const last = run.events[run.events.length - 1];
  const narration = run.error
    ? `Error: ${run.error}`
    : last
      ? narrate(last)
      : "Write a Vision or type a seed, then Generate — watch each decision between a word and a page.";

  const seedChip = controllers.seed || nodePairs[0]?.a || "—";
  const stageIdx = Math.max(0, STAGE_ORDER.indexOf(current as (typeof STAGE_ORDER)[number]));
  // a finished (runName from events) or loaded (loadRequest.run) run can be re-told
  const activeRun = run.runName ?? loadRequest?.run ?? null;
  const canRetell = !run.running && Boolean(activeRun) && Boolean(rooms.bible.work || rooms.telling.sections.length);
  const retell = () => {
    if (!activeRun) return;
    void run.rerun({ run: activeRun, format: controllers.format, pov: controllers.pov, words: controllers.words });
  };

  // pre-generate readiness: at least one complete node, or a seed to grow from
  const definedNodes = nodePairs.filter((p) => p.a.trim() && p.b.trim()).length;
  const hasSeed = controllers.seed.trim().length > 0;
  const canGenerate = !run.running && (definedNodes > 0 || hasSeed);
  const readiness = run.running
    ? "generating…"
    : definedNodes > 0
      ? `ready · ${definedNodes} node${definedNodes > 1 ? "s" : ""} · ${controllers.format} · ~${controllers.words} words`
      : hasSeed
        ? `ready · one word “${controllers.seed}” → grows a ${controllers.scale}-node chain`
        : "define a node (two words) in the Field, or type a seed, then Generate";

  return (
    <main className={styles.page}>
      <div className={styles.spineWrap}>
        <Spine
          ref={spineRef}
          stations={stations}
          current={current}
          onSelect={setCurrent}
          left={<span className={styles.seedChip}>{seedChip}</span>}
          right={
            <>
              <Toggle checked={pick} onChange={setPick} label="I pick" />
              {canRetell && (
                <Button onClick={retell} title="re-tell this run's story from the same chain (new sections)">
                  Re-tell
                </Button>
              )}
              <Button variant="primary" onClick={generate} disabled={!canGenerate} title={canGenerate ? "run the pipeline" : "define a node or a seed first"}>
                {run.running ? "Generating…" : "Generate"}
              </Button>
            </>
          }
        />
      </div>

      {run.running ? (
        <div className={styles.process}>
          <span className={styles.processStep}>
            step {Math.max(0, STAGE_ORDER.indexOf(current as (typeof STAGE_ORDER)[number])) + 1} of {STAGE_ORDER.length}
          </span>
          <b className={styles.processStage}>{STAGE_LABEL[current] ?? current}</b>
          <span className={styles.processNarr}>{narration}</span>
        </div>
      ) : (
        <>
          <div className={styles.narrator}>{narration}</div>
          <div className={styles.readiness}>{readiness}</div>
        </>
      )}
      {formError && <div className={styles.error}>{formError}</div>}

      <div className={styles.roomFrame}>
        <div className={styles.stageNav}>
          <Button variant="ghost" onClick={() => setCurrent(STAGE_ORDER[stageIdx - 1])} disabled={stageIdx <= 0}>
            ← {stageIdx > 0 ? STAGE_SHORT[STAGE_ORDER[stageIdx - 1]] : ""}
          </Button>
          <span className={styles.stageHere}>
            step {stageIdx + 1} of {STAGE_ORDER.length} · <b>{STAGE_SHORT[current] ?? current}</b>
          </span>
          <Button variant="ghost" onClick={() => setCurrent(STAGE_ORDER[stageIdx + 1])} disabled={stageIdx >= STAGE_ORDER.length - 1}>
            {stageIdx < STAGE_ORDER.length - 1 ? STAGE_SHORT[STAGE_ORDER[stageIdx + 1]] : ""} →
          </Button>
        </div>
        {run.stillHere && (
          <div className={styles.stillHere}>
            <span>Are you still here? No pick for a while — this run will freeze into a resumable draft soon.</span>
            <button className={styles.stillHereBtn} onClick={run.poke}>
              I&rsquo;m here
            </button>
          </div>
        )}
        {run.pendingChoice && <ChoiceCard prompt={run.pendingChoice} onAnswer={run.answer} onActivity={run.poke} />}

        {current === "vision" && (
          <VisionRoom
            vision={rooms.vision}
            text={visionText}
            onTextChange={setVisionText}
            spores={spores}
            onExtracted={(s, t) => {
              setSpores(s);
              setVisionText(t);
            }}
            nodePairs={nodePairs}
            onCommitNodes={(pairs, firstWord) => {
              chain.setAll(pairs);
              setControllers((c) => ({ ...c, seed: firstWord ?? pairs[0]?.a ?? c.seed }));
              setSelectedNodeIndex(0);
              setCurrent("node"); // land in the Node room to keep working them
            }}
          />
        )}
        {current === "node" && (
          <NodeInspector
            chain={chain}
            selectedIndex={selectedNodeIndex}
            onSelectIndex={setSelectedNodeIndex}
            generated={rooms.chain[selectedNodeIndex]}
          />
        )}
        {current === "field" && (
          <FieldRoom
            chain={chain}
            onPropose={spores.length ? onPropose : undefined}
            onInspect={(i) => {
              setSelectedNodeIndex(i);
              setCurrent("node");
            }}
            generated={rooms.chain}
            running={run.running}
          />
        )}
        {current === "forces" && <ForcesRoom forces={rooms.forces} />}
        {current === "telling" && (
          <TellingRoom controllers={controllers} onChange={patchControllers} telling={rooms.telling} running={run.running} />
        )}
        {current === "bible" && <BibleRoom bible={rooms.bible} />}
      </div>
    </main>
  );
}
