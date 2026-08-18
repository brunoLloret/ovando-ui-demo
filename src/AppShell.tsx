import { useState } from "react";
import { Button, Tabs, Toggle, type TabItem } from "./components";
import { KeySettings } from "./features/settings";
import { useMode, setMode } from "./lib/mode";
import { getKey } from "./lib/keys";
import { useLocale, setLocale, type Locale } from "./lib/locale";
import { useT } from "./lib/i18n";
import { LanguageGate } from "./LanguageGate";
import styles from "./AppShell.module.css";
import { ComposePage } from "./features/compose";
import { ProjectsPage } from "./features/projects/ProjectsPage";
import { RunsTab, WindowsTab, AnalysisTab, CalibrationTab } from "./features/data/DataTabs";
import { StoryFieldTab } from "./features/storyfield/StoryFieldTab";

/** Top-level shell: the tab bar + the active pane. Owns the active tab and the run being opened. */
export function AppShell() {
  const [active, setActive] = useState("projects");
  const [loadRequest, setLoadRequest] = useState<{ run: string | null; nonce: number }>({ run: null, nonce: 0 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mode = useMode();
  const locale = useLocale();
  const t = useT();

  // Demo build: only Projects + Compose are exposed. The other tabs (Story Field / Runs / Windows /
  // Analysis / Calibration) are built but intentionally not listed here, so they're unreachable.
  const TABS: TabItem[] = [
    { id: "projects", label: t("shell.tab.projects") },
    { id: "compose", label: t("shell.tab.compose") },
  ];

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
      <LanguageGate />
      <KeySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <div className={styles.header}>
        <Tabs tabs={TABS} active={active} onSelect={setActive} />
        <div className={styles.controls}>
          <div className={styles.locale}>
            {(["en", "es"] as Locale[]).map((l) => (
              <Button
                key={l}
                variant="ghost"
                onClick={() => setLocale(l)}
                style={{ fontWeight: locale === l ? 700 : 400, opacity: locale === l ? 1 : 0.5 }}
                aria-pressed={locale === l}
              >
                {l.toUpperCase()}
              </Button>
            ))}
          </div>
          <Toggle checked={mode === "live"} onChange={handleModeToggle} label={t("shell.live")} />
          <Button variant="ghost" onClick={openSettings}>{getKey() ? t("shell.key.set") : t("shell.key")}</Button>
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
