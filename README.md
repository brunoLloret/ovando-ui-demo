

https://github.com/user-attachments/assets/b8381ef0-bc10-44d9-aa9a-a0960534bc44

# Field of Potential Meaning — UI

A React + TypeScript interface for a writing method that treats a story as a **field of
potential meaning** — working its deep structure (nodes, relations, forces, telling) *before* and
*around* the prose, with a human in the loop at every stage.

> **This repository is the client (UI) only.** The generation pipeline — the engine, prompts, and
> model orchestration — is a separate, private service the UI talks to over an `/api` boundary. The
> interface renders on its own, but running a generation requires that service.

## The chain

Compose walks a six-station spine, one focused room at a time:

1. **Vision** — write freely; surface *spores* (charged seed-words) from the text.
2. **Node** — work a single node in detail: its two words, and the *relation* between them
   (explore candidates or write your own); decompose it into sub-nodes.
3. **Field** — shape the whole chain: propose, add, remove, reorder, swap words.
4. **Forces** — the human situation the chain becomes; click a force to understand and deepen it.
5. **Telling** — how it's told (montage · point of view · sections); see each section's plan.
6. **Bible** — cast, record, and the finished work.

A run streams through these rooms live; joints (when *I pick* is on) let you choose at each fork.

## Stack

- **React 19** + **TypeScript**, built with **Vite**.
- Reusable "Notation" primitives (Spine, Toggle, Picker, Modal, …) with a shared design-token
  system.
- A small typed API layer (`src/lib/api.ts`) and an SSE run hook (`src/features/run`).

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
```

`npm run dev` proxies `/api` to `http://localhost:3847` (the private pipeline service). Without it,
the UI loads and is navigable, but *Surface the spores*, *Generate*, etc. will fail — those call the
engine.

```bash
npm run build      # typecheck + production build → dist/
npm run check      # typecheck only
```

## Structure

```
src/
  components/   reusable primitives (Button, Modal, Picker, Spine, Toggle, Tabs, …)
  features/
    compose/    the Compose chain: rooms + the run orchestration
    nodes/      the node chain editor + Spore Explorer
    run/        the SSE run hook
  lib/          types + the /api client
  styles/       design tokens
```

## License

MIT — see [LICENSE](./LICENSE).
