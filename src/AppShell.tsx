import { useState } from "react";
import { Tabs, type TabItem } from "./components";
import { ComposePage } from "./features/compose";
import { ProjectsPage } from "./features/projects/ProjectsPage";
import { RunsTab, WindowsTab, AnalysisTab, CalibrationTab } from "./features/data/DataTabs";
import { StoryFieldTab } from "./features/storyfield/StoryFieldTab";

// Demo build: only Projects + Compose are exposed. The other tabs (Story Field / Runs / Windows /
// Analysis / Calibration) are built but intentionally not listed here, so they're unreachable.
const TABS: TabItem[] = [
  { id: "projects", label: "Projects" },
  { id: "compose", label: "Compose" },
];

/** Top-level shell: the tab bar + the active pane. Owns the active tab and the run being opened. */
export function AppShell() {
  const [active, setActive] = useState("projects");
  // Compose stays mounted (a paid run must survive tab switches); loadRequest.nonce drives open/reset.
  const [loadRequest, setLoadRequest] = useState<{ run: string | null; nonce: number }>({ run: null, nonce: 0 });

  const startNew = () => {
    setLoadRequest((r) => ({ run: null, nonce: r.nonce + 1 }));
    setActive("compose");
  };
  const openProject = (run: string) => {
    setLoadRequest((r) => ({ run, nonce: r.nonce + 1 }));
    setActive("compose");
  };

  return (
    <div>
      <Tabs tabs={TABS} active={active} onSelect={setActive} />
      {active === "projects" && <ProjectsPage onStartNew={startNew} onOpen={openProject} />}
      <div style={{ display: active === "compose" ? "block" : "none" }}>
        <ComposePage loadRequest={loadRequest} />
      </div>
      <div style={{ display: active === "storyfield" ? "block" : "none" }}>
        <StoryFieldTab active={active === "storyfield"} />
      </div>
      {active === "runs" && <RunsTab />}
      {active === "windows" && <WindowsTab />}
      {active === "analysis" && <AnalysisTab />}
      {active === "calibration" && <CalibrationTab />}
    </div>
  );
}
