import { useEffect, useState } from "react";
import { Button, TextInput } from "../../../components";
import { api } from "../../../lib/api";
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
}

/** Station 2 — the node room: work one node in detail (words · relation · sub-nodes), or create one. */
export function NodeInspector({ chain, selectedIndex, onSelectIndex, generated }: NodeInspectorProps) {
  const total = chain.nodes.length;
  const idx = Math.max(0, Math.min(selectedIndex, total - 1));
  const node = chain.nodes[idx];

  const [rels, setRels] = useState<RelationCandidate[] | null>(null);
  const [relText, setRelText] = useState("");
  const [relBusy, setRelBusy] = useState(false);
  const [subBusy, setSubBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // reset the explored relation (sub-nodes are stored on the node, so they persist)
  useEffect(() => {
    setRels(null);
    setRelText("");
    setErr(null);
  }, [node?.id]);

  if (total === 0 || !node) {
    return (
      <div className={rooms.room}>
        <div className={rooms.title}>Node — create &amp; inspect one node in detail</div>
        <div className={rooms.muted}>No nodes yet. Add one below, or build the chain in the Field.</div>
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => { chain.add(); onSelectIndex(chain.nodes.length); }}>＋ create a node</Button>
        </div>
      </div>
    );
  }

  const exploreRelation = async () => {
    setRelBusy(true);
    setErr(null);
    try {
      const res = await api.nodeRelation(node.a, node.b, relText.trim() || undefined);
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
      const res = await api.nodeSubnodes(node.a, node.b, generated?.process);
      chain.setSubnodes(node.id, res.subSeeds); // stored on the node — view-only for now
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubBusy(false);
    }
  };

  return (
    <div className={rooms.room}>
      <div className={rooms.title}>Node — work one node in detail</div>

      <div className={styles.nav}>
        <Button variant="ghost" onClick={() => onSelectIndex(idx - 1)} disabled={idx === 0} aria-label="previous node">←</Button>
        <span className={styles.counter}>node {idx + 1} of {total}</span>
        <Button variant="ghost" onClick={() => onSelectIndex(idx + 1)} disabled={idx === total - 1} aria-label="next node">→</Button>
        <span className={styles.spacer} />
        <Button onClick={() => { chain.add(); onSelectIndex(total); }}>＋ new</Button>
        <Button variant="ghost" onClick={() => { chain.remove(node.id); onSelectIndex(Math.max(0, idx - 1)); }}>✕ remove</Button>
      </div>

      <div className={styles.words}>
        <TextInput label="word A" value={node.a} onChange={(e) => chain.update(node.id, { a: e.target.value.toLowerCase() })} style={{ width: 160 }} />
        <Button variant="ghost" onClick={() => chain.swapWords(node.id, "a", node.id, "b")} title="swap the two words">⇄</Button>
        <TextInput label="word B" value={node.b} onChange={(e) => chain.update(node.id, { b: e.target.value.toLowerCase() })} style={{ width: 160 }} />
      </div>

      {err && <div className={styles.err}>{err}</div>}

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.h}>Relation</span>
        </div>
        <div className={styles.relControls}>
          <TextInput
            label="describe the relation, or steer the exploration (optional)"
            value={relText}
            onChange={(e) => setRelText(e.target.value)}
            placeholder={`e.g. ${node.a} hardens into the record of ${node.b}`}
            style={{ flex: 1, minWidth: 240 }}
          />
          <Button onClick={exploreRelation} disabled={relBusy || !node.a || !node.b} title="ask the model for candidate relations (your text guides them)">
            {relBusy ? "exploring…" : rels ? "↻ explore more" : "explore →"}
          </Button>
          <Button
            onClick={() => {
              if (!relText.trim()) return;
              chain.setRelation(node.id, { kind: "", schema: relText.trim(), description: "", properties: [] });
              setRelText("");
            }}
            disabled={!relText.trim()}
            title="store exactly what you wrote as this node's relation"
          >
            establish as written
          </Button>
        </div>

        {(node.relations ?? []).length > 0 && (
          <div className={styles.established}>
            <div className={styles.establishedTag}>✓ established relations</div>
            {(node.relations ?? []).map((r, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                {r.kind && <span className={rooms.kindChip}>{r.kind}</span>}
                {r.schema && <div className={rooms.schema}>{r.schema}</div>}
                {r.description && <div className={rooms.prose}>{r.description}</div>}
                <Button variant="ghost" onClick={() => chain.removeRelation(node.id, i)} title="remove this relation">
                  ✕ remove
                </Button>
              </div>
            ))}
            <Button variant="ghost" onClick={() => chain.setRelation(node.id, undefined)} title="clear all relations">
              clear all
            </Button>
          </div>
        )}

        {!rels && generated?.process && (
          <div className={styles.relCard} tabIndex={0}>
            {generated.kind && <span className={rooms.kindChip}>{generated.kind}</span>}
            {generated.schema && <div className={rooms.schema}>{generated.schema}</div>}
            <div className={styles.revealHint}>hover to read →</div>
            <div className={`${rooms.prose} ${styles.reveal}`}>{generated.process}</div>
            <div style={{ marginTop: 8 }}>
              <Button onClick={() => chain.setRelation(node.id, { kind: generated.kind ?? "", schema: generated.schema ?? "", description: generated.process ?? "", properties: [] })}>
                establish this →
              </Button>
            </div>
          </div>
        )}

        {rels?.map((c, i) => (
          <div key={i} className={styles.relCard} tabIndex={0}>
            <span className={rooms.kindChip}>{c.kind}</span>
            <div className={rooms.schema}>{c.schema}</div>
            <div className={styles.revealHint}>hover to read →</div>
            <div className={`${rooms.prose} ${styles.reveal}`}>{c.description}</div>
            {c.properties.length > 0 && <div className={styles.props}>{c.properties.join(" · ")}</div>}
            <div style={{ marginTop: 8 }}>
              <Button onClick={() => chain.setRelation(node.id, c)}>establish this →</Button>
            </div>
          </div>
        ))}

        {!rels && !generated?.process && !relBusy && (node.relations ?? []).length === 0 && (
          <div className={rooms.muted}>explore candidate relations, then establish one for this node.</div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.h}>Sub-nodes</span>
          <Button onClick={decompose} disabled={subBusy || !node.a || !node.b}>
            {subBusy ? "decomposing…" : node.subnodes?.length ? "↻ decompose again" : "decompose into sub-nodes →"}
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
          <div className={rooms.muted}>break this node into three intermediate states — stored on the node, a real level (view-only for now).</div>
        )}
      </div>

      <div className={styles.footer}>
        <span className={rooms.muted}>node {idx + 1} of {total} defined</span>
        <span className={styles.spacer} />
        {idx < total - 1 ? (
          <Button variant="primary" onClick={() => onSelectIndex(idx + 1)}>Next node →</Button>
        ) : (
          <Button variant="primary" onClick={() => { chain.add(); onSelectIndex(total); }}>＋ Define another node</Button>
        )}
      </div>
    </div>
  );
}
