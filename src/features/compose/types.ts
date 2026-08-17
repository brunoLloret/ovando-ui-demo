/** The run-form controllers, split across the First Node and Telling rooms. */
export interface Controllers {
  seed: string;
  partner: string;
  scale: number;
  format: string;
  pov: string;
  words: number;
  /** which model to run this call on (opus/sonnet/haiku) — applies to the whole pipeline. */
  model: string;
}

export const DEFAULT_CONTROLLERS: Controllers = {
  seed: "",
  partner: "",
  scale: 3,
  format: "linear",
  pov: "",
  words: 200,
  model: "sonnet",
};

/** The models you can run any call on, with plain-language "which is better for what" notes
 * (shown on hover). Order = recommended-first. */
export const MODEL_OPTIONS = [
  {
    value: "sonnet",
    label: "Sonnet — balanced (default)",
    description: "The all-rounder. Strong structure and prose across the whole pipeline at a fraction of Opus's cost — start here, switch up or down only if you have a reason.",
  },
  {
    value: "opus",
    label: "Opus — deepest",
    description: "Richest reasoning and the best prose. Worth it for dramatize (finding the human story) and the final writing. Slowest and by far the most expensive — overkill for the structural steps.",
  },
  {
    value: "haiku",
    label: "Haiku — fast & cheap",
    description: "Quickest and cheapest by a wide margin. Great for the structural calls — surfacing spores, relations, sub-nodes — but noticeably lighter on nuanced prose, so weaker for the actual writing.",
  },
  // ── OpenRouter (needs OPENROUTER_API_KEY; runs the WHOLE pipeline, incl. the structured
  //    JSON stages, which non-Claude models handle less reliably) ──
  {
    value: "hermes-4-405b",
    label: "Hermes 4 405B — OpenRouter",
    description: "The best OpenRouter model in our tests — uncensored, closest to frontier quality. Good when you want a non-Claude voice or fewer content guardrails. Runs the whole pipeline; watch for occasional JSON hiccups on the structured stages.",
  },
  {
    value: "hermes-4-70b",
    label: "Hermes 4 70B — OpenRouter",
    description: "Highest phrase density and surprise we measured — vivid, less predictable prose; smaller, so faster and cheaper than 405B. Uncensored. Same whole-pipeline caveat on structured JSON.",
  },
  {
    value: "gpt-4o",
    label: "GPT-4o — OpenRouter",
    description: "OpenAI's frontier model via OpenRouter — strong, reliable general quality and clean JSON; a good non-Claude sanity check. Has its own content guardrails.",
  },
  {
    value: "llama-3.1-70b",
    label: "Llama 3.1 70B — OpenRouter",
    description: "Open-weights workhorse — inexpensive and capable, a solid uncensored baseline. Prose is competent but less distinctive than the Hermes tunes.",
  },
];
