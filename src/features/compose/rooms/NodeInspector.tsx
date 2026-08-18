import { useEffect, useState } from "react";
import { Button, TextInput } from "../../../components";
import { api } from "../../../lib/api";
import { useT } from "../../../lib/i18n";
import type { RelationCandidate } from "../../../lib/types";
import type { NodeChain } from "../../nodes";
import type { ChainNodeView } from "../roomsState";
import styles from "./NodeInspector.module.css";
import rooms from "./rooms.module.css";

export interface NodeInspectorProps {
  chain: NodeChain;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  /** The generated relation for this node from a run, if any. */
  generated?: ChainNodeView;
  /** Advance to the Field station (grow/see the whole chain). */
  onGoToField?: () => void;
}

/** Station 2 — the node room: work one node in detail (words · relation · sub-nodes), or create one. */
export function NodeInspector({ chain, selectedIndex, onSelectIndex, generated, onGoToField }: NodeInspectorProps) {
  const t = useT();
  const total = chain.nodes.length;
  const idx = Math.max(0, Math.min(selectedIndex, total - 1));
  const node = chain.nodes[idx];

  // a node is "explored" once it has both words and an established relation; the Field opens only
  // when every node in the chain is explored (no advancing on half-built nodes)
  const allExplored = total > 0 && chain.nodes.every((n) => n.a.trim() && n.b.trim() && (n.relations?.length ?? 0) > 0);

  const [rels, setRels] = useState<RelationCandidate[] | null>(null);
  const [relBusy, setRelBusy] = useState(false);
  const [subBusy, setSubBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // the writer's own words for this node — persistent, steers relation / sub-nodes / word generation
  const note = node?.note ?? "";

  // reset the explored relation candidates on node switch (the note & sub-nodes persist on the node)
  useEffect(() => {
    setRels(null);
    setErr(null);
  }, [node?.id]);

  if (total === 0 || !node) {
    return (
      <div className={rooms.room}>
        <div className={rooms.title}>{t("node.empty.title")}</div>
        <div className={rooms.muted}>{t("node.empty.hint")}</div>
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => { chain.add(); onSelectIndex(chain.nodes.length); }}>{t("node.create")}</Button>
        </div>
      </div>
    );
  }

  const exploreRelation = async () => {
    setRelBusy(true);
    setErr(null);
    try {
      const res = await api.nodeRelation(node.a, node.b, note.trim() || undefined);
      setRels(res.candidates);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRelBusy(false);
    }
  };

  const decompose = async () => {
    setSubBusy(true);
    setErr(null);
    try {
      // prefer the node's OWN established relation as the process, then a run's; the note steers it
      const process = node.relations?.[0]?.description || node.relations?.[0]?.schema || generated?.process;
      const res = await api.nodeSubnodes(node.a, node.b, process || undefined, note.trim() || undefined);
      chain.setSubnodes(node.id, res.subSeeds); // stored on the node — view-only for now
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubBusy(false);
    }
  };

  // generate or refine the node's two words from the writer's own words about it
  const generateWords = async () => {
    if (!note.trim()) return;
    setGenBusy(true);
    setErr(null);
    try {
      const res = await api.nodeFromText(note.trim(), node.a || undefined, node.b || undefined);
      if (res.a && res.b) chain.update(node.id, { a: res.a, b: res.b });
      else setErr(t("node.err.noWords"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setGenBusy(false);
    }
  };

  return (
    <div className={rooms.room}>
      <div className={rooms.title}>{t("node.title")}</div>

      <div className={styles.nav}>
        <Button variant="ghost" onClick={() => onSelectIndex(idx - 1)} disabled={idx === 0} aria-label={t("node.prev")}>←</Button>
        <span className={styles.counter}>{t("node.counter", { i: idx + 1, total })}</span>
        <Button variant="ghost" onClick={() => onSelectIndex(idx + 1)} disabled={idx === total - 1} aria-label={t("node.next")}>→</Button>
        <span className={styles.spacer} />
        <Button onClick={() => { chain.add(); onSelectIndex(total); }}>{t("node.new")}</Button>
        <Button variant="ghost" onClick={() => { chain.remove(node.id); onSelectIndex(Math.max(0, idx - 1)); }}>{t("node.remove")}</Button>
      </div>

      <div className={styles.words}>
        <TextInput label={t("node.wordA")} value={node.a} onChange={(e) => chain.update(node.id, { a: e.target.value.toLowerCase() })} style={{ flex: "1 1 130px", minWidth: 0 }} />
        <Button variant="ghost" onClick={() => chain.swapWords(node.id, "a", node.id, "b")} title={t("node.swap")}>⇄</Button>
        <TextInput label={t("node.wordB")} value={node.b} onChange={(e) => chain.update(node.id, { b: e.target.value.toLowerCase() })} style={{ flex: "1 1 130px", minWidth: 0 }} />
      </div>

      {err && <div className={styles.err}>{err}</div>}

      {/* The writer's own words for this node — the imagination that steers everything below */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.h}>{t("node.words.h")}</span>
          <Button onClick={generateWords} disabled={genBusy || !note.trim()} title={t("node.words.genTitle")}>
            {genBusy ? t("node.words.generating") : node.a || node.b ? t("node.words.refine") : t("node.words.generate")}
          </Button>
        </div>
        <TextInput
          label={t("node.words.label")}
          value={note}
          onChange={(e) => chain.setNote(node.id, e.target.value)}
          placeholder={t("node.words.placeholder", { a: node.a || t("node.words.defaultA"), b: node.b || t("node.words.defaultB") })}
          style={{ width: "100%" }}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.h}>{t("node.rel.h")}</span>
        </div>
        <div className={styles.relControls}>
          <Button onClick={exploreRelation} disabled={relBusy || !node.a || !node.b} title={t("node.rel.exploreTitle")}>
            {relBusy ? t("node.rel.exploring") : rels ? t("node.rel.exploreMore") : t("node.rel.explore")}
          </Button>
          <Button
            onClick={() => {
              if (!note.trim()) return;
              chain.setRelation(node.id, { kind: "", schema: note.trim(), description: "", properties: [] });
            }}
            disabled={!note.trim()}
            title={t("node.rel.useWordsTitle")}
          >
            {t("node.rel.useWords")}
          </Button>
          <span className={rooms.muted}>{note.trim() ? t("node.rel.steerYes") : t("node.rel.steerNo")}</span>
        </div>

        {(node.relations ?? []).length > 0 && (
          <div className={styles.established}>
            <div className={styles.establishedTag}>{t("node.rel.established")}</div>
            {(node.relations ?? []).map((r, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                {r.kind && <span className={rooms.kindChip}>{r.kind}</span>}
                {r.schema && <div className={rooms.schema}>{r.schema}</div>}
                {r.description && <div className={rooms.prose}>{r.description}</div>}
                <Button variant="ghost" onClick={() => chain.removeRelation(node.id, i)} title={t("node.rel.removeOne")}>
                  {t("node.remove")}
                </Button>
              </div>
            ))}
            <Button variant="ghost" onClick={() => chain.setRelation(node.id, undefined)} title={t("node.rel.clearAllTitle")}>
              {t("node.rel.clearAll")}
            </Button>
          </div>
        )}

        {!rels && generated?.process && (
          <div className={styles.relCard} tabIndex={0}>
            {generated.kind && <span className={rooms.kindChip}>{generated.kind}</span>}
            {generated.schema && <div className={rooms.schema}>{generated.schema}</div>}
            <div className={styles.revealHint}>{t("node.rel.hover")}</div>
            <div className={`${rooms.prose} ${styles.reveal}`}>{generated.process}</div>
            <div style={{ marginTop: 8 }}>
              <Button onClick={() => chain.setRelation(node.id, { kind: generated.kind ?? "", schema: generated.schema ?? "", description: generated.process ?? "", properties: [] })}>
                {t("node.rel.establishThis")}
              </Button>
            </div>
          </div>
        )}

        {rels?.map((c, i) => (
          <div key={i} className={styles.relCard} tabIndex={0}>
            <span className={rooms.kindChip}>{c.kind}</span>
            <div className={rooms.schema}>{c.schema}</div>
            <div className={styles.revealHint}>{t("node.rel.hover")}</div>
            <div className={`${rooms.prose} ${styles.reveal}`}>{c.description}</div>
            {c.properties.length > 0 && <div className={styles.props}>{c.properties.join(" · ")}</div>}
            <div style={{ marginTop: 8 }}>
              <Button onClick={() => chain.setRelation(node.id, c)}>{t("node.rel.establishThis")}</Button>
            </div>
          </div>
        ))}

        {!rels && !generated?.process && !relBusy && (node.relations ?? []).length === 0 && (
          <div className={rooms.muted}>{t("node.rel.emptyHint")}</div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.h}>{t("node.sub.h")}</span>
          <Button onClick={decompose} disabled={subBusy || !node.a || !node.b}>
            {subBusy ? t("node.sub.decomposing") : node.subnodes?.length ? t("node.sub.again") : t("node.sub.decompose")}
          </Button>
        </div>
        {node.subnodes?.map((s, i) => (
          <div key={i} className={styles.subCard}>
            <div className={styles.subHead}>
              <b className={styles.subWord}>{s.word}</b>
              {s.derived_from && <span className={styles.subFrom}> · {s.derived_from}</span>}
            </div>
            {s.reasoning && <div className={rooms.muted}>{s.reasoning}</div>}
          </div>
        ))}
        {!node.subnodes?.length && !subBusy && (
          <div className={rooms.muted}>{t("node.sub.emptyHint")}</div>
        )}
      </div>

      <div className={styles.footer}>
        <span className={rooms.muted}>{t("node.footer.defined", { i: idx + 1, total })}</span>
        <span className={styles.spacer} />
        {idx < total - 1 ? (
          <Button variant="primary" onClick={() => onSelectIndex(idx + 1)}>{t("node.footer.next")}</Button>
        ) : (
          <Button onClick={() => { chain.add(); onSelectIndex(total); }}>{t("node.footer.define")}</Button>
        )}
        {onGoToField && (
          <Button
            variant="primary"
            onClick={onGoToField}
            disabled={!allExplored}
            title={allExplored ? t("node.footer.fieldTitleReady") : t("node.footer.fieldTitleGated")}
          >
            {t("node.footer.field")}
          </Button>
        )}
      </div>
    </div>
  );
}
