import type { SandboxEvent } from "../../lib/types";
import type { MessageKey } from "../../lib/i18n";

type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** One plain-language line describing what the pipeline is doing right now (locale-aware via t). */
export function narrate(ev: SandboxEvent, t: T): string {
  switch (ev.step) {
    case "vision":
      return t("narrate.vision");
    case "keys":
      return t("narrate.keys");
    case "field":
      return t("narrate.field");
    case "node":
      return t("narrate.node", { i: ev.i, total: ev.total });
    case "chain":
    case "chain-built":
      return t("narrate.chain");
    case "choice":
      return t("narrate.choice");
    case "dramatize":
      return ev.status === "start" ? t("narrate.dramatize.start") : t("narrate.dramatize.done");
    case "plan":
      return t("narrate.plan");
    case "cast":
      return t("narrate.cast");
    case "section":
      return ev.status === "start" ? t("narrate.section.start", { n: ev.n }) : t("narrate.section.done", { n: ev.n });
    case "edition":
      return t("narrate.edition");
    case "run":
      return t("narrate.run");
    case "frozen":
      return t("narrate.frozen", { at: ev.at });
    case "error":
      return t("narrate.error", { message: ev.message });
    default:
      return "";
  }
}
