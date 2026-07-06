import type { SandboxEvent } from "../../lib/types";

/** One plain-language line describing what the pipeline is doing right now (ported from explain()). */
export function narrate(ev: SandboxEvent): string {
  switch (ev.step) {
    case "vision":
      return "Reading the seed as a material state — physical conditions only, no metaphor, no story yet.";
    case "keys":
      return "Condensing that field-report down to a few charged words.";
    case "field":
      return "Pairing a key with a distant partner — the charged space between two poles is the material.";
    case "node":
      return `Growing the chain — node ${ev.i} of ${ev.total}: a process-relation, not a plot yet.`;
    case "chain":
    case "chain-built":
      return "The relational skeleton is built. The plot is latent inside it, not yet chosen.";
    case "choice":
      return "Your turn — pick among the candidates, and add any direction. Your words fold into the story.";
    case "dramatize":
      return ev.status === "start"
        ? "Finding the human situation that has the SAME shape as this abstract chain…"
        : "The forces and the central conflict have emerged from the chain.";
    case "plan":
      return "Arranging the telling — the montage decides what the reader meets, and in what order.";
    case "cast":
      return "Casting the stable characters that will carry the abstract forces.";
    case "section":
      return ev.status === "start"
        ? `Writing §${ev.n}: incarnate the beat, inhabit the voice, hold its grammatical position.`
        : `§${ev.n} written — moving on.`;
    case "edition":
      return "Auditing the whole draft: contradictions, dropped threads, over-repetition.";
    case "run":
      return "The work is finished — cast, record, and the full text.";
    case "frozen":
      return `Frozen as a draft at the ${ev.at} stage. You can resume from where you left off.`;
    case "error":
      return `Error: ${ev.message}`;
    default:
      return "";
  }
}
