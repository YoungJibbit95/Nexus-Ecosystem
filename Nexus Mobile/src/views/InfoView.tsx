import { useMobile } from "../lib/useMobile";
import React, { useState } from "react";
import { useTheme } from "../store/themeStore";
import {
  BookOpen,
  Code2,
  FileText,
  CheckSquare,
  Bell,
  Layout,
  Settings,
  Terminal,
  Keyboard,
  Zap,
  GitBranch,
  Layers,
  HardDrive,
  Wrench,
  BarChart3,
  Monitor,
  Star,
} from "lucide-react";
import { Acc, Badge, Card, Code, Grid2, H, P, hexRgb } from "./info/InfoPrimitives";

export function InfoView() {
  const t = useTheme();
  const rgb = hexRgb(t.accent);
  const mob = useMobile();
  const [open, setOpen] = useState<Record<string, boolean>>({
    about: true,
    architecture: true,
    diagnostics: true,
    guide: true,
    changelog: true,
    dashboard: false,
    notes: false,
    code: false,
    tasks: false,
    reminders: false,
    canvas: false,
    files: false,
    flux: false,
    devtools: false,
    settings: false,
    shortcuts: false,
    terminal: false,
  });

  const tog = (k: string) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: mob?.isMobile ? "14px 14px" : "20px 22px",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 22,
            padding: "20px 22px",
            borderRadius: 16,
            background: `linear-gradient(135deg, rgba(${rgb},0.12) 0%, transparent 62%)`,
            border: `1px solid rgba(${rgb},0.2)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -26,
              right: -26,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(${rgb},0.2), transparent)`,
              filter: "blur(24px)",
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                marginBottom: 4,
                background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              NEXUS v5.0
            </div>
            <div style={{ fontSize: 12, opacity: 0.56, marginBottom: 12 }}>
              Mobile Source-of-Truth · 10. April 2026
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Badge label="Notes" color={t.accent} />
              <Badge label="Code" color="#BF5AF2" />
              <Badge label="Tasks" color="#FF9F0A" />
              <Badge label="Reminders" color="#FF453A" />
              <Badge label="Canvas" color="#30D158" />
              <Badge label="Files" color="#64D2FF" />
              <Badge label="Flux" color="#FFD60A" />
            </div>
          </div>
        </div>

        <Acc title="Changelog" icon={Star} open={open.changelog} onToggle={() => tog("changelog")} badge="v5.0">
          <P>
            Mobile dokumentiert dieselben produktiven Änderungen wie Desktop, nur kompakter.
          </P>
          {[
            {
              icon: "📊",
              title: "Dashboard stabilisiert",
              color: "#FF9F0A",
              items: [
                "In-Grid Editing + Hidden Tray + Presets/Undo/Redo/Lock",
                "Safe-Mode bei fehlerhaften Widgets",
              ],
            },
            {
              icon: "🧠",
              title: "Canvas produktiver",
              color: "#30D158",
              items: [
                "Find/Jump + Outline/Navigator + Bulk-Actions",
                "Template-Resolver Guard (inkl. ai-project)",
              ],
            },
            {
              icon: "⚙️",
              title: "Settings robuster",
              color: "#64D2FF",
              items: [
                "Stable vs Advanced/Experimental getrennt",
                "Theme Import mit Guard/Allowlist + sichere Defaults",
              ],
            },
          ].map((section) => (
            <div
              key={section.title}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${section.color}22`,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 7, color: section.color }}>
                {section.icon} {section.title}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {section.items.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 11,
                      opacity: 0.74,
                      lineHeight: 1.55,
                      paddingLeft: 12,
                      position: "relative",
                      marginBottom: 3,
                    }}
                  >
                    <span style={{ position: "absolute", left: 1, color: section.color }}>·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Acc>

        <Acc title="Was ist Nexus?" icon={BookOpen} open={open.about} onToggle={() => tog("about")}>
          <P>
            Nexus ist lokale Wissens- und Arbeitssoftware. Mobile folgt denselben Produktregeln wie Desktop,
            mit verdichteter Oberfläche statt separater Feature-Welt.
          </P>
          <Grid2>
            <Card icon="📝" title="Notes" desc="Markdown + Linking + strukturierte Blocks." />
            <Card icon="💻" title="CodeView" desc="Quick Open, Run/Preview und klarer Output-Flow." />
            <Card icon="✅" title="Tasks" desc="Kanban + Focus/Saved Views + Linked Context." />
            <Card icon="🔔" title="Reminders" desc="Recurrence/Snooze/Triage mit Reliability-Hinweisen." />
            <Card icon="🧠" title="Canvas" desc="Find/Jump, Outline, Fokusfahrten und Magic Templates." />
            <Card icon="🗂️" title="Files" desc="Workspace-Hub über Note/Code/Task/Reminder/Canvas." />
            <Card icon="⚡" title="Flux" desc="Ops-Drilldowns statt reines Statusboard." />
            <Card icon="⚙️" title="Settings" desc="Stabile Controls zuerst, Advanced klar getrennt." />
          </Grid2>
        </Acc>

        <Acc title="Nexus Engine & Architektur" icon={Monitor} open={open.architecture} onToggle={() => tog("architecture")} badge="CORE">
          <P>
            Mobile nutzt denselben Render-/Motion-Vertrag aus <code>@nexus/core</code>. Unterschiede liegen primär
            in Dichte und Interaktionsform, nicht in einer zweiten Architektur.
          </P>
          <Grid2>
            <Card icon="🧭" title="Render Pipeline" desc="Measure → Resolve → Allocate → Commit → Cleanup." />
            <Card icon="🎞️" title="Motion-Vertrag" desc="Capability-aware transitions statt lokaler Sonderanimationen." />
            <Card icon="🛡️" title="Guardrails" desc="Bounds/Owner/Degradation-Regeln schützen Stabilität und Touch-Verhalten." />
            <Card icon="📉" title="Controlled Degradation" desc="Low Power/Reduced Motion reduzieren Komplexität kontrolliert." />
          </Grid2>
          <Code>{`Prinzip
- Render bestimmt das erlaubte Budget
- Motion setzt es kontrolliert um
- Views konsumieren den Vertrag
- Diagnostics machen Zustände sichtbar`}</Code>
        </Acc>

        <Acc title="Diagnostics & Docs Map" icon={BarChart3} open={open.diagnostics} onToggle={() => tog("diagnostics")} badge="DEV">
          <Grid2>
            <Card icon="📊" title="Render Diagnostics" desc="Render Tier, aktive Surfaces, Budget-Status und Health-Werte." />
            <Card icon="🎚️" title="Motion Diagnostics" desc="Capability/Complexity/Degradation im Laufzeitkontext prüfen." />
            <Card icon="✨" title="Why smooth/native" desc="Material settle + capability-aware motion + Ownership Guardrails." />
            <Card icon="🗺️" title="Source of Truth" desc="App-Verhalten -> Core Contracts -> READMEs -> InfoView -> Wiki." />
          </Grid2>
        </Acc>

        <Acc title="Komplette View-Referenz" icon={Layers} open={open.guide} onToggle={() => tog("guide")} badge="ALL VIEWS">
          <Grid2>
            <Card icon="📊" title="Dashboard" desc="Today/Continue + In-Grid Editor + Hidden Tray." />
            <Card icon="📝" title="Notes" desc="Wissensnavigation, Linking und Magic Blocks." />
            <Card icon="💻" title="CodeView" desc="Quick Open + Run/Preview + Output-History." />
            <Card icon="✅" title="Tasks" desc="Focus Views, Batch-Flows und Linked Context." />
            <Card icon="🔔" title="Reminders" desc="Recurrence/Snooze/Triage mit Kontext." />
            <Card icon="🧠" title="Canvas" desc="Find/Jump, Outline, Multi-Select, Focus/Fit." keys={["Cmd/Ctrl+P", "Cmd/Ctrl+M", "Cmd/Ctrl+0", "F", "P"]} />
            <Card icon="🗂️" title="Files" desc="Smart Views + Workspace/Handoff/Import-Export." />
            <Card icon="⚡" title="Flux" desc="Queue-Slices, Bottlenecks und Action-Drilldowns." />
            <Card icon="🛠️" title="DevTools" desc="Builder/Recipe/Export für wiederverwendbare Outputs." />
            <Card icon="⚙️" title="Settings" desc="Stable/Advanced/Experimental klar gegliedert." />
            <Card icon="📈" title="Render Diagnostics" desc="Dev-only Engine- und Runtime-Checks." />
            <Card icon="⌘" title="Terminal" desc="Navigation, Suche und Template-Aktionen via Commands." />
          </Grid2>
        </Acc>

        <Acc title="Dashboard" icon={Layout} open={open.dashboard} onToggle={() => tog("dashboard")}> 
          <Grid2>
            <Card icon="🔁" title="In-Grid Swap" desc="Widget auf Widget ziehen, Positionen direkt tauschen." />
            <Card icon="🧰" title="Inline Edit Chrome" desc="Drag Handle, Span, Visible/Hidden direkt im Grid." />
            <Card icon="🎛️" title="Action Bar" desc="Undo/Redo/Preset/Lock/Reset ohne Layout-Shift." />
            <Card icon="🛟" title="Safe Mode" desc="Ein Widgetfehler legt nicht den ganzen View lahm." />
          </Grid2>
        </Acc>

        <Acc title="Notes" icon={FileText} open={open.notes} onToggle={() => tog("notes")}> 
          <Grid2>
            <Card icon="🧭" title="Quick Navigation" desc="Schnelle Suche/Switching und strukturierte Listensteuerung." />
            <Card icon="🔗" title="Linking" desc="Wikilinks, Backlinks und related context nutzen." />
            <Card icon="🪄" title="Magic Markdown" desc="nexus-list/checklist/alert/callout/progress/timeline/grid/card/kanban/metrics/steps/quadrant." />
            <Card icon="💾" title="Autosave" desc="Stabiler Draft-/Commit-Flow mit Undo/Redo." />
          </Grid2>
        </Acc>

        <Acc title="CodeView" icon={Code2} open={open.code} onToggle={() => tog("code")}> 
          <Grid2>
            <Card icon="📂" title="Quick Open" desc="Dateien schnell öffnen und zwischen Tabs wechseln." keys={["Cmd/Ctrl+P"]} />
            <Card icon="▶️" title="Run/Preview" desc="JS/TS Run, HTML/CSS Preview, JSON Validation." keys={["Cmd/Ctrl+Enter"]} />
            <Card icon="🧪" title="History" desc="Letzte Runs mit Status und Dauer direkt sichtbar." />
            <Card icon="🛟" title="Fallback" desc="Wenn Monaco fehlt, bleibt Editor nutzbar." />
          </Grid2>
        </Acc>

        <Acc title="Tasks" icon={CheckSquare} open={open.tasks} onToggle={() => tog("tasks")}> 
          <Grid2>
            <Card icon="🎯" title="Focus Views" desc="My Day, Due Soon, High Priority als Arbeitsmodi." />
            <Card icon="🔗" title="Linked Context" desc="Task mit Note/Reminder/Canvas-Kontext öffnen." />
            <Card icon="🧱" title="Dependency/Blocker" desc="Blockaden sichtbar statt nur Statuswechsel." />
            <Card icon="🧺" title="Batch Actions" desc="Mehrfachauswahl für schnelle Pflege großer Listen." />
          </Grid2>
        </Acc>

        <Acc title="Reminders" icon={Bell} open={open.reminders} onToggle={() => tog("reminders")}> 
          <Grid2>
            <Card icon="🔁" title="Recurrence" desc="Wiederholungen klarer erstellen und editieren." />
            <Card icon="💤" title="Snooze" desc="Quick Presets für Daily Triage." />
            <Card icon="🔗" title="Linked Context" desc="Task/Note-Kontext direkt auf Reminder-Karten." />
            <Card icon="🛡️" title="Health/Fallback" desc="Zuverlässigkeitsstatus transparent sichtbar." />
          </Grid2>
        </Acc>

        <Acc title="Canvas" icon={GitBranch} open={open.canvas} onToggle={() => tog("canvas")}> 
          <Grid2>
            <Card icon="🔎" title="Find / Jump" desc="Nodes schnell finden und fokussieren." />
            <Card icon="🗺️" title="Outline/Navigator" desc="Projektpanel mit Struktur- und Jump-Flow." />
            <Card icon="🧺" title="Bulk Actions" desc="Multi-Select für Status/Priority/Tag/Delete." />
            <Card icon="🎥" title="Focus/Fit" desc="Sanfte Orientierung statt harter Kamerasprünge." />
            <Card icon="🪄" title="Magic Templates" desc="Hub-first plus ai-project Prompt-Flow." />
            <Card icon="📐" title="Node Resize + Zoom" desc="Rahmen- und Content-Skalierung pro Node." />
          </Grid2>
          <Card title="Controls" desc="" keys={["Cmd/Ctrl+P", "Cmd/Ctrl+M", "Cmd/Ctrl+0", "F", "P", "G", "+ / -"]} />
        </Acc>

        <Acc title="Files & Workspaces" icon={HardDrive} open={open.files} onToggle={() => tog("files")}> 
          <Grid2>
            <Card icon="📦" title="Alle Item-Typen" desc="Note/Code/Task/Reminder/Canvas in einem Hub." />
            <Card icon="🧠" title="Smart Views" desc="Workspace, Recent, Pinned, Unassigned." />
            <Card icon="🔁" title="Assign Flows" desc="Items schnell Workspaces zuordnen oder lösen." />
            <Card icon="💾" title="Import/Export/Handoff" desc="Desktop Sync und Mobile Runtime-Review konsistent." />
          </Grid2>
        </Acc>

        <Acc title="Flux" icon={Zap} open={open.flux} onToggle={() => tog("flux")}> 
          <Grid2>
            <Card icon="🧭" title="Queue Presets" desc="Overdue, Due Soon, Focus, Reminder Triage, Backlog." />
            <Card icon="🚨" title="Bottlenecks" desc="Nachvollziehbare Priorisierung mit Zielbezug." />
            <Card icon="⚡" title="Action Flows" desc="Open/jump-Aktionen direkt aus Queue und Activity." />
            <Card icon="📈" title="Ops Score" desc="Hilfswert mit klarer Interpretation statt Scheinpräzision." />
          </Grid2>
        </Acc>

        <Acc title="DevTools" icon={Wrench} open={open.devtools} onToggle={() => tog("devtools")}> 
          <Grid2>
            <Card icon="🧪" title="Reusable Output" desc="Recipe/Snippet/Component/Prototype als echte Artefakte." />
            <Card icon="📚" title="Library Light" desc="Saved Recipes und Recent Builds statt ephemerer Sessions." />
            <Card icon="📋" title="Export/Copy" desc="Apply-to-code und Export-Flows mit weniger Reibung." />
            <Card icon="🧭" title="QA Focus" desc="Tooling-Hinweise für Perf/Accessibility mit kleinem Scope." />
          </Grid2>
        </Acc>

        <Acc title="Settings" icon={Settings} open={open.settings} onToggle={() => tog("settings")}> 
          <Grid2>
            <Card icon="✅" title="Stable first" desc="Alltagssettings im Vordergrund, Experimental separat." />
            <Card icon="🧪" title="Advanced/Experimental" desc="Klar markiert statt gleichrangig mit Release-Settings." />
            <Card icon="🛡️" title="Import Guard" desc="Theme-Import mit Schema/Allowlist/Defaults abgesichert." />
            <Card icon="🧱" title="Release Freeze" desc="Toolbar/Spotlight/Glow als eingefrorene Zonen respektiert." />
          </Grid2>
        </Acc>

        <Acc title="Tastenkürzel" icon={Keyboard} open={open.shortcuts} onToggle={() => tog("shortcuts")}> 
          <Grid2>
            <Card title="Global" desc="" keys={["Cmd/Ctrl+1..9", "Cmd/Ctrl+[ / ]", "Esc"]} />
            <Card title="Notes" desc="" keys={["Cmd/Ctrl+S", "Cmd/Ctrl+B", "Cmd/Ctrl+I", "Cmd/Ctrl+K"]} />
            <Card title="CodeView" desc="" keys={["Cmd/Ctrl+P", "Cmd/Ctrl+Enter", "Cmd/Ctrl+S"]} />
            <Card title="Canvas" desc="" keys={["Cmd/Ctrl+P", "Cmd/Ctrl+M", "Cmd/Ctrl+0", "F", "P", "G", "+ / -"]} />
            <Card title="Flux" desc="" keys={["Cmd/Ctrl+F", "Cmd/Ctrl+Shift+N/C/T/R", "1..4", "0"]} />
            <Card title="Terminal" desc="" keys={["Enter", "Tab", "ArrowUp/Down", "Esc", "Ctrl+L"]} />
          </Grid2>
        </Acc>

        <Acc title="Terminal" icon={Terminal} open={open.terminal} onToggle={() => tog("terminal")}> 
          <P>
            Terminal bleibt der schnelle Befehlspfad für Navigation, Suche und Canvas/Template-Workflows.
          </P>
          <Code>{`help
views | ls
goto <view>
new note|task|reminder|code
search <query>
spotlight <query>
canvas list
canvas new <name>
canvas template <preset> <name>
canvas focus
theme <name>
profile <focus|cinematic|compact|default>
macro start/stop/run
undo | redo
clear`}</Code>
        </Acc>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
