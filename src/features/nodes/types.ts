/** The two words of a node — matches the backend `nodePairs` shape (`{ a, b }`). */
export interface NodePair {
  a: string;
  b: string;
}

/** A relation between a node's two words (matches lib/types RelationCandidate structurally). */
export interface NodeRelation {
  kind: string;
  schema: string;
  description: string;
  properties: string[];
}

/** An intermediate state within a node's process — a stored, view-only level (deferred feature). */
export interface NodeSubnode {
  word: string;
  derived_from: string;
  reasoning: string;
}

/** A node in the editable chain: a pair plus a stable id, an optional relation, and stored sub-nodes. */
export interface ChainNode extends NodePair {
  id: string;
  relation?: NodeRelation;
  subnodes?: NodeSubnode[];
}
