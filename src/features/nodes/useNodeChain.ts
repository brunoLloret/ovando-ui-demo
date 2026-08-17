import { useCallback, useMemo, useState } from "react";
import type { ChainNode, NodePair, NodeRelation, NodeSubnode } from "./types";

let seq = 0;
const nid = () => `n${++seq}`;

const toNode = (pair: NodePair): ChainNode => ({ id: nid(), a: pair.a, b: pair.b });

export interface NodeChain {
  nodes: ChainNode[];
  /** Append a node (blank by default). */
  add: (pair?: NodePair) => void;
  /** Append several nodes at once (e.g. "propose N more"), leaving existing nodes untouched. */
  addMany: (pairs: NodePair[]) => void;
  /** Remove a node by id. */
  remove: (id: string) => void;
  /** Patch a node's words. */
  update: (id: string, patch: Partial<NodePair>) => void;
  /** Move a node one slot up (-1) or down (+1); clamps at the ends. */
  move: (id: string, dir: -1 | 1) => void;
  /** Move a node to an absolute index (drag-and-drop reorder). */
  reorder: (id: string, toIndex: number) => void;
  /** Swap two words (within a node or across nodes) — drag a word onto another. */
  swapWords: (idA: string, slotA: "a" | "b", idB: string, slotB: "a" | "b") => void;
  /** Append a relation to a node's list; pass undefined to clear all. */
  setRelation: (id: string, relation: NodeRelation | undefined) => void;
  /** Remove one relation from a node's list by index. */
  removeRelation: (id: string, index: number) => void;
  /** Store the decomposed sub-nodes on a node (view-only). */
  setSubnodes: (id: string, subnodes: NodeSubnode[]) => void;
  /** Replace the whole chain (e.g. from a fresh proposal). */
  setAll: (pairs: NodePair[]) => void;
  /** The chain as plain pairs, ready for the backend / `_nodePairs`. */
  toPairs: () => NodePair[];
}

/**
 * State for an editable chain of nodes: add / remove / edit / reorder.
 * Pure client state — the caller decides when to persist or generate from it.
 */
export function useNodeChain(initial: NodePair[] = []): NodeChain {
  const [nodes, setNodes] = useState<ChainNode[]>(() => initial.map(toNode));

  const add = useCallback((pair: NodePair = { a: "", b: "" }) => {
    setNodes((prev) => [...prev, toNode(pair)]);
  }, []);

  const addMany = useCallback((pairs: NodePair[]) => {
    setNodes((prev) => [...prev, ...pairs.map(toNode)]);
  }, []);

  const remove = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const update = useCallback((id: string, patch: Partial<NodePair>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setNodes((prev) => {
      const i = prev.findIndex((n) => n.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const reorder = useCallback((id: string, toIndex: number) => {
    setNodes((prev) => {
      const from = prev.findIndex((n) => n.id === id);
      if (from < 0) return prev;
      const to = Math.max(0, Math.min(prev.length - 1, toIndex));
      if (from === to) return prev;
      const next = prev.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const swapWords = useCallback((idA: string, slotA: "a" | "b", idB: string, slotB: "a" | "b") => {
    if (idA === idB && slotA === slotB) return;
    setNodes((prev) => {
      const na = prev.find((n) => n.id === idA);
      const nb = prev.find((n) => n.id === idB);
      if (!na || !nb) return prev;
      const valA = na[slotA];
      const valB = nb[slotB];
      if (idA === idB) return prev.map((n) => (n.id === idA ? { ...n, [slotA]: valB, [slotB]: valA } : n));
      return prev.map((n) => {
        if (n.id === idA) return { ...n, [slotA]: valB };
        if (n.id === idB) return { ...n, [slotB]: valA };
        return n;
      });
    });
  }, []);

  const setRelation = useCallback((id: string, relation: NodeRelation | undefined) => {
    setNodes((prev) => prev.map((n) => {
      if (n.id !== id) return n;
      if (!relation) return { ...n, relations: [] };
      return { ...n, relations: [...(n.relations ?? []), relation] };
    }));
  }, []);

  const removeRelation = useCallback((id: string, index: number) => {
    setNodes((prev) => prev.map((n) =>
      n.id === id ? { ...n, relations: (n.relations ?? []).filter((_, i) => i !== index) } : n
    ));
  }, []);

  const setSubnodes = useCallback((id: string, subnodes: NodeSubnode[]) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, subnodes } : n)));
  }, []);

  const setAll = useCallback((pairs: NodePair[]) => {
    setNodes(pairs.map(toNode));
  }, []);

  const toPairs = useCallback((): NodePair[] => nodes.map(({ a, b }) => ({ a, b })), [nodes]);

  return useMemo(
    () => ({ nodes, add, addMany, remove, update, move, reorder, swapWords, setRelation, removeRelation, setSubnodes, setAll, toPairs }),
    [nodes, add, addMany, remove, update, move, reorder, swapWords, setRelation, removeRelation, setSubnodes, setAll, toPairs],
  );
}
