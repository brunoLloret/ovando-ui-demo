import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Picker, Spine, type SpineHandle, type SpineStation } from "../../components";
import { api } from "../../lib/api";
import { useMode, setActiveFixture, type ReplayManifestEntry } from "../../lib/mode";
import { getKey } from "../../lib/keys";
import type { ChoiceResult, DramatizeBody, Force, SandboxEvent } from "../../lib/types";
import { useSandboxRun, saveRun, listRuns, getRun, type CachedRunMeta } from "../run";
import { useNodeChain, type NodePair } from "../nodes";
import { useComposeRooms, foldEvents, type RoomsState } from "./roomsState";
import { hydrateFromState } from "./loadRun";
import { narrate } from "./narrate";
import { ChoiceCard } from "./ChoiceCard";
import { DEFAULT_CONTROLLERS, MODEL_OPTIONS, type Controllers } from "./types";
import { VisionRoom } from "./rooms/VisionRoom";
import { NodeInspector } from "./rooms/NodeInspector";
import { FieldRoom } from "./rooms/FieldRoom";
import { ForcesRoom } from "./rooms/ForcesRoom";
import { TellingRoom } from "./rooms/TellingRoom";
import { BibleRoom } from "./rooms/BibleRoom";
import { RawTrace } from "./RawTrace";
import { GlobalContext } from "./GlobalContext";
import { StationStepper } from "./StationStepper";
import styles from "./ComposePage.module.css";

const STAGE_ORDER = ["vision", "node", "field", "forces", "telling", "bible"] as const;
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
    case "actions":
    case "plan":
    case "cast":
    case "section":
    case "edition":
      return "telling";
    case "run":
    case "done": // render finished — headed to Bible (the work-guard holds focus until work exists)
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
  loadRequest?: { run: string | null; nonce: number };
  onNeedKey?: () => void;
}

export function ComposePage({ loadRequest, onNeedKey }: ComposePageProps = {}) {
  const [controllers, setControllers] = useState<Controllers>(DEFAULT_CONTROLLERS);
  // Joints/pauses are disabled for now — generation runs step by step through the room buttons
  // (Field → Forces "generate the forces" → Telling "write the story"), so runs never pause.
  const pick = false;
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
  // remember the chain signature we last built forces for, so an unchanged chain reuses the saved
  // run (no rebuild — the "Field repopulates" fix); a changed chain rebuilds.
  const builtRef = useRef<{ sig: string; run: string } | null>(null);
  const pendingSig = useRef<string | null>(null);
  // the editable forces layer (station 4 workbench): starts from the generated forces, then reshaped
  const [forcesEdit, setForcesEdit] = useState<Force[] | null>(null);
  const [forcesBusy, setForcesBusy] = useState(false);

  const mode = useMode();
  const [manifest, setManifest] = useState<ReplayManifestEntry[]>([]);
  const [selectedReplay, setSelectedReplay] = useState("");
  // saved live generations (localStorage) — survive a refresh and reload in one click
  const [cachedRuns, setCachedRuns] = useState<CachedRunMeta[]>([]);
  const restoredRef = useRef(false);
  const savedForRef = useRef<string | null>(null);

  // bundled examples are available in every mode (replay animates them; live loads them instantly)
  useEffect(() => {
    fetch("/replays/index.json")
      .then((r) => r.json() as Promise<ReplayManifestEntry[]>)
      .then((m) => { setManifest(m); setSelectedReplay((s) => s || (m[0]?.name ?? "")); })
      .catch(() => {});
    setCachedRuns(listRuns());
  }, []);

  const watchReplay = useCallback(async () => {
    if (!selectedReplay) return;
    try {
      const events = await fetch(`/replays/${selectedReplay}.json`).then((r) => r.json());
      setActiveFixture(events as Parameters<typeof setActiveFixture>[0]);
      setFormError(null);
      setLoadedRooms(null);
      void run.start({ seed: selectedReplay, manual: false });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to load replay");
    }
  }, [selectedReplay, run]);

  const patchControllers = useCallback((patch: Partial<Controllers>) => setControllers((c) => ({ ...c, ...patch })), []);

  // fold a finished event log (a cached run or a bundled example) back into the rooms — no live run
  const applyEvents = useCallback((events: SandboxEvent[]) => {
    run.reset();
    const folded = foldEvents(events);
    setLoadedRooms(folded);
    setFormError(null);
    const pairs = folded.chain.map((n) => ({ a: n.a, b: n.b }));
    chain.setAll(pairs);
    setControllers((c) => ({ ...c, seed: folded.firstNode.poleA ?? c.seed, partner: folded.firstNode.poleB ?? c.partner, scale: pairs.length || c.scale }));
    setSpores([...new Set([...(folded.vision.keys ?? []), ...folded.chain.flatMap((n) => [n.a, n.b])])].filter(Boolean) as string[]);
    setSelectedNodeIndex(0);
    setCurrent(folded.bible.work ? "bible" : folded.chain.length ? "field" : "vision");
  }, [run, chain]);

  // "Load" picker: bundled example (ex:<name>) or a cached run (rc:<id>), loaded instantly
  const loadEntry = useCallback((value: string) => {
    if (value.startsWith("ex:")) {
      const name = value.slice(3);
      fetch(`/replays/${name}.json`)
        .then((r) => r.json() as Promise<Array<{ event: SandboxEvent }>>)
        .then((recs) => applyEvents(recs.map((rec) => rec.event)))
        .catch((e) => setFormError(e instanceof Error ? e.message : "Failed to load example"));
    } else if (value.startsWith("rc:")) {
      const rec = getRun(value.slice(3));
      if (rec) applyEvents(rec.events);
    }
  }, [applyEvents]);

  const loadOptions = useMemo(() => {
    const ex = manifest.map((m) => ({ value: `ex:${m.name}`, label: `★ ${m.title}`, description: m.blurb }));
    const rc = cachedRuns.map((r) => ({ value: `rc:${r.id}`, label: `↻ ${r.title}`, description: `saved generation${r.seed ? ` · “${r.seed}”` : ""}` }));
    return [...ex, ...rc];
  }, [manifest, cachedRuns]);

  // cache a finished live run so a refresh keeps it and it stays one click away in "Load"
  useEffect(() => {
    if (mode !== "live" || run.running) return;
    const work = derivedRooms.bible.work;
    if (!work || run.events.length === 0) return;
    const id = run.runName ?? "local-run";
    const sentinel = `${id}::${work.length}`;
    if (savedForRef.current === sentinel) return; // already cached this exact result
    savedForRef.current = sentinel;
    const seed = derivedRooms.firstNode.poleA ?? controllers.seed ?? "run";
    const partner = derivedRooms.firstNode.poleB;
    saveRun({ id, title: partner ? `${seed} → ${partner}` : seed, seed, savedAt: Date.now(), events: run.events });
    setCachedRuns(listRuns());
  }, [mode, run.running, run.events, run.runName, derivedRooms, controllers.seed]);

  // returning visitor: restore the most recent saved run so a refresh doesn't lose the work (once)
  useEffect(() => {
    if (restoredRef.current || mode !== "live") return;
    if (loadRequest?.run || run.events.length > 0 || loadedRooms || cachedRuns.length === 0) return;
    restoredRef.current = true;
    const latest = getRun(cachedRuns[0].id);
    if (latest) applyEvents(latest.events);
  }, [mode, cachedRuns, loadRequest?.run, run.events.length, loadedRooms, applyEvents]);

  // focus follows the run
  useEffect(() => {
    if (!rooms.phase) return;
    const station = stationForStep(rooms.phase);
    // the "run start" ping maps to Bible — don't yank focus to step 6 until the work actually exists
    if (station === "bible" && !rooms.bible.work) return;
    setCurrent(station);
  }, [rooms.phase, rooms.bible.work]);

  // feed the field glyph each time a node completes
  useEffect(() => {
    if (rooms.chain.length > prevChain.current) spineRef.current?.feed("node", "field", { populate: true });
    prevChain.current = rooms.chain.length;
  }, [rooms.chain.length]);

  // a joint often fires before its phase event is emitted (e.g. the first relation, while focus is
  // still on Vision) — pull focus to where the joint belongs so the card isn't over the wrong room
  useEffect(() => {
    if (!run.pendingChoice) return;
    const at = run.pendingChoice.at;
    if (at === "telling") setCurrent("telling");
    else if (at === "match" || at === "registers" || at === "forces") setCurrent("forces");
    else setCurrent("node");
  }, [run.pendingChoice]);

  // the telling joint carries the room's montage/pov/length back to the run
  const answerChoice = useCallback(
    (result: ChoiceResult) => {
      if (run.pendingChoice?.at === "telling") {
        run.answer({ ...result, controls: { format: controllers.format, pov: controllers.pov, words: controllers.words } });
      } else {
        run.answer(result);
      }
    },
    [run, controllers.format, controllers.pov, controllers.words],
  );

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
        setSpores(h.spores); // repopulate the Vision spore bank from the run's word field
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

  // once a forces-only run establishes its name, remember it against the chain signature we built it
  // from — so pressing "regenerate the forces" on an UNCHANGED chain reuses it instead of rebuilding.
  useEffect(() => {
    if (run.runName && pendingSig.current) {
      builtRef.current = { sig: pendingSig.current, run: run.runName };
      pendingSig.current = null;
    }
  }, [run.runName]);

  // Station 4: generate the forces from the current chain, WITHOUT rendering the whole story.
  const generateForces = useCallback(() => {
    if (mode === "live" && !getKey()) { onNeedKey?.(); return; }
    const runPairs = chain.nodes
      .filter((n) => n.a.trim() && n.b.trim())
      .map((n) => ({ a: n.a, b: n.b, ...(n.relations?.length ? { relation: n.relations[0] } : {}) }));
    if (runPairs.length === 0) {
      setFormError("Define at least one node (two words) first.");
      setCurrent("node");
      return;
    }
    setFormError(null);
    setLoadedRooms(null);
    const sig = JSON.stringify(runPairs.map((p) => [p.a, p.b, p.relation?.schema ?? ""]));
    const reuse = builtRef.current && builtRef.current.sig === sig ? builtRef.current.run : undefined;
    if (!reuse) pendingSig.current = sig; // record against the runName this build produces
    const body: DramatizeBody = reuse
      ? { run: reuse, manual: pick, userText: visionText.trim() || undefined, model: controllers.model }
      : { seed: runPairs[0].a, partner: runPairs[0].b || undefined, scale: runPairs.length, manual: pick, nodePairs: runPairs, userText: visionText.trim() || undefined, model: controllers.model };
    void run.dramatizeStage(body);
  }, [chain, run, pick, visionText, controllers.model]);

  // the editable forces reset whenever a fresh dramatization arrives (a new/regenerated whole set)
  useEffect(() => {
    setForcesEdit(rooms.forces?.agents ? [...rooms.forces.agents] : null);
  }, [rooms.forces]);
  const effectiveForces = forcesEdit ?? rooms.forces?.agents ?? [];

  const discardForce = useCallback((i: number) => {
    setForcesEdit((f) => (f ?? rooms.forces?.agents ?? []).filter((_, j) => j !== i));
  }, [rooms.forces]);

  const addForce = useCallback(() => {
    const rn = run.runName ?? loadRequest?.run;
    if (!rn) return;
    const existing = forcesEdit ?? rooms.forces?.agents ?? [];
    setForcesBusy(true);
    setFormError(null);
    api.forceGenerate({ run: rn, mode: "new", existing, count: 1, userText: visionText.trim() || undefined, model: controllers.model })
      .then((r) => { if (r.agents.length) setForcesEdit([...existing, ...r.agents]); })
      .catch((e) => setFormError(e instanceof Error ? e.message : String(e)))
      .finally(() => setForcesBusy(false));
  }, [run.runName, loadRequest?.run, forcesEdit, rooms.forces, visionText, controllers.model]);

  const regenerateForces = useCallback((indices: number[]) => {
    const rn = run.runName ?? loadRequest?.run;
    const existing = forcesEdit ?? rooms.forces?.agents ?? [];
    if (!rn || indices.length === 0) return;
    const replaceNames = indices.map((i) => existing[i]?.name).filter(Boolean) as string[];
    setForcesBusy(true);
    setFormError(null);
    api.forceGenerate({ run: rn, mode: "replace", existing, replaceNames, userText: visionText.trim() || undefined, model: controllers.model })
      .then((r) => {
        const copy = [...existing];
        let k = 0;
        for (const i of indices) if (r.agents[k]) copy[i] = r.agents[k++];
        setForcesEdit(copy);
      })
      .catch((e) => setFormError(e instanceof Error ? e.message : String(e)))
      .finally(() => setForcesBusy(false));
  }, [run.runName, loadRequest?.run, forcesEdit, rooms.forces, visionText, controllers.model]);

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
  // a finished (runName from events) or loaded (loadRequest.run) run can be re-told
  const activeRun = run.runName ?? loadRequest?.run ?? null;
  // rendering is available once a run exists AND the forces have been found (from a full run, a
  // forces-only run, or a loaded run) — sandbox-rerun renders from the persisted chain + forces.
  const canRetell = !run.running && Boolean(activeRun) && Boolean(rooms.bible.work || rooms.telling.sections.length || rooms.forces);
  const retell = () => {
    if (!activeRun) return;
    // if the writer reshaped the forces, render from THAT set (sandbox-rerun uses it as-is)
    const edited = forcesEdit && rooms.forces ? { ...rooms.forces, agents: forcesEdit } : undefined;
    void run.rerun({ run: activeRun, format: controllers.format, pov: controllers.pov, words: controllers.words, model: controllers.model, ...(edited ? { dramatization: edited } : {}) });
  };

  // pre-generate readiness: at least one complete node to grow forces from
  const definedNodes = nodePairs.filter((p) => p.a.trim() && p.b.trim()).length;
  const readiness = run.running
    ? "generating…"
    : definedNodes > 0
      ? `${definedNodes} node${definedNodes > 1 ? "s" : ""} · go to Forces to generate the forces, then Telling to write`
      : "build the chain in the Field (two words per node), then generate the forces in step 4";

  // the run controls — shared by the desktop spine (right slot) and the phone stepper (⋯ overflow)
  const controls = mode === "replay" ? (
    <>
      {manifest.length > 0 && (
        <Picker
          label="Watch"
          value={selectedReplay}
          options={manifest.map((m) => ({ value: m.name, label: m.title, description: m.blurb }))}
          onChange={setSelectedReplay}
        />
      )}
      <Button variant="primary" onClick={() => void watchReplay()} disabled={!selectedReplay || run.running}>
        {run.running ? "Watching…" : "Watch"}
      </Button>
    </>
  ) : (
    <>
      {loadOptions.length > 0 && (
        <Picker
          label="load"
          value=""
          options={[{ value: "", label: "Load…" }, ...loadOptions]}
          onChange={(v) => { if (v) loadEntry(v); }}
        />
      )}
      <Picker label="model" value={controllers.model} options={MODEL_OPTIONS} onChange={(v) => patchControllers({ model: v })} />
      {canRetell && (
        <Button variant="primary" onClick={retell} title={rooms.bible.work ? "re-tell this run's story from the same chain (new sections)" : "write the story from the chain + forces you generated (no rebuild)"}>
          {rooms.bible.work ? "Re-tell" : "Write the story →"}
        </Button>
      )}
    </>
  );

  return (
    <main className={styles.page}>
      <div className={styles.spineWrap}>
        <div className={styles.barDesktop}>
          <Spine
            ref={spineRef}
            stations={stations}
            current={current}
            onSelect={setCurrent}
            left={<span className={styles.seedChip}>{seedChip}</span>}
            right={controls}
          />
        </div>
        <div className={styles.barPhone}>
          <StationStepper stations={stations} current={current} onSelect={setCurrent} controls={controls} />
        </div>
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
        {run.stillHere && (
          <div className={styles.stillHere}>
            <span>Are you still here? No pick for a while — this run will freeze into a resumable draft soon.</span>
            <button className={styles.stillHereBtn} onClick={run.poke}>
              I&rsquo;m here
            </button>
          </div>
        )}
        {run.pendingChoice && <ChoiceCard prompt={run.pendingChoice} onAnswer={answerChoice} onActivity={run.poke} />}

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
        {current === "forces" && (
          <ForcesRoom
            forces={rooms.forces}
            agents={effectiveForces}
            onGenerate={generateForces}
            onAddNew={addForce}
            onDiscard={discardForce}
            onRegenerate={regenerateForces}
            running={run.running}
            canGenerate={definedNodes > 0}
            busy={forcesBusy}
          />
        )}
        {current === "telling" && (
          <TellingRoom controllers={controllers} onChange={patchControllers} telling={rooms.telling} running={run.running} forceSetup={run.pendingChoice?.at === "telling"} />
        )}
        {current === "bible" && <BibleRoom bible={rooms.bible} forces={rooms.forces} telling={rooms.telling} />}
      </div>

      <GlobalContext
        premise={visionText.trim() || undefined}
        registers={[]}
        chain={rooms.chain}
        forces={rooms.forces}
        agents={effectiveForces}
        format={rooms.telling.format ?? controllers.format}
        pov={controllers.pov}
        words={controllers.words}
        sections={rooms.telling.sections}
        work={rooms.bible.work}
        cast={rooms.bible.cast}
        model={controllers.model}
        runName={activeRun ?? undefined}
        events={run.events.length}
      />

      <RawTrace
        events={run.events}
        inputs={{
          seed: controllers.seed || nodePairs[0]?.a || undefined,
          partner: controllers.partner || undefined,
          scale: controllers.scale,
          format: controllers.format,
          pov: controllers.pov || "explore (rotate)",
          words: controllers.words,
          model: controllers.model,
          visionText: visionText || undefined,
          spores,
          nodePairs: chain.nodes.map((n) => ({ a: n.a, b: n.b, relation: n.relations?.[0]?.schema || undefined })),
        }}
      />
    </main>
  );
}
