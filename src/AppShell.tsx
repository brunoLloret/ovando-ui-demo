import { useState } from "react";
import { Button, Tabs, Toggle, type TabItem } from "./components";
import { KeySettings } from "./features/settings";
import { useMode, setMode } from "./lib/mode";
import { getKey } from "./lib/keys";
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
  const [loadRequest, setLoadRequest] = useState<{ run: string | null; nonce: number }>({ run: null, nonce: 0 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mode = useMode();

  const openSettings = () => setSettingsOpen(true);
  const handleModeToggle = (wantLive: boolean) => {
    setMode(wantLive ? "live" : "replay");
  };

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
      <KeySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1rem" }}>
        <Tabs tabs={TABS} active={active} onSelect={setActive} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Toggle checked={mode === "live"} onChange={handleModeToggle} label="Live" />
          <Button variant="ghost" onClick={openSettings}>{getKey() ? "⚙ Key ✓" : "⚙ Key"}</Button>
        </div>
      </div>
      {active === "projects" && (
        // A/B/C flows (interview · ingest · plain writer) aren't built yet — route them to the
        // Vision→Materials workspace for now; branch here when each path exists.
        <ProjectsPage onStartNew={startNew} onOpen={openProject} onChoose={() => startNew()} />
      )}
      <div style={{ display: active === "compose" ? "block" : "none" }}>
        <ComposePage loadRequest={loadRequest} onNeedKey={openSettings} />
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
