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
  Sparkles,
} from "lucide-react";
import { Acc, Badge, Card, Code, Grid2, H, P, hexRgb } from "./info/InfoPrimitives";

export function InfoView({ onOpenWalkthrough }: { onOpenWalkthrough?: () => void } = {}) {
  const t = useTheme();
  const rgb = hexRgb(t.accent);
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
    <div style={{ height: "100%", overflowY: "auto", padding: "20px 22px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 28,
            padding: "24px 28px",
            borderRadius: 18,
            background: `linear-gradient(135deg, rgba(${rgb},0.12) 0%, transparent 60%)`,
            border: `1px solid rgba(${rgb},0.2)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(${rgb},0.2), transparent)`,
              filter: "blur(30px)",
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                marginBottom: 6,
                background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              NEXUS v5.0
            </div>
            <div style={{ fontSize: 13, opacity: 0.55, marginBottom: 16 }}>
              Productivity Suite · Workspace Edition · 10. April 2026
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Badge label="Notes" color={t.accent} />
              <Badge label="Code" color="#BF5AF2" />
              <Badge label="Tasks" color="#FF9F0A" />
              <Badge label="Reminders" color="#FF453A" />
              <Badge label="Canvas" color="#30D158" />
              <Badge label="Files" color="#64D2FF" />
              <Badge label="Flux" color="#FFD60A" />
              <Badge label="DevTools" color="#FF6B35" />
              <Badge label="Settings" color="#5E5CE6" />
            </div>
            {onOpenWalkthrough ? (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={onOpenWalkthrough}
                  style={{
                    borderRadius: 9,
                    border: `1px solid rgba(${rgb},0.32)`,
                    background: `rgba(${rgb},0.14)`,
                    color: t.accent,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
                >
                  Walkthrough öffnen
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <Acc title="Changelog" icon={Star} open={open.changelog} onToggle={() => tog("changelog")} badge="v5.0">
          <P>
            Dieser Changelog dokumentiert nur produktiv sichtbare Änderungen. Keine Preview-Claims, keine
            "in Arbeit"-Versprechen als fertige Features.
          </P>
          {[
            {
              icon: "🧩",
              title: "Dashboard finalisiert",
              color: "#FF9F0A",
              items: [
                "In-Grid-Editing als primärer Flow (kein alter Snap-Board-Zwang mehr)",
                "Widget-Swap, Hidden Widgets Tray, Presets, Undo/Redo, Lock stabilisiert",
                "Safe-Mode für Widget-Renderfehler, damit kein kompletter View-Ausfall entsteht",
              ],
            },
            {
              icon: "🧠",
              title: "Canvas produktiver",
              color: "#30D158",
              items: [
                "Find/Jump-to-Node, Outline/Navigator und Bulk-Actions im Project Panel",
                "Magic-Template-Resolver gehärtet (inkl. ai-project Guard-Pfad)",
                "Stabilere Focus/Fit-Transitions und bessere Node-Interaktion",
              ],
            },
            {
              icon: "⚙️",
              title: "Settings klarer",
              color: "#64D2FF",
              items: [
                "Stabile vs. Advanced/Experimental Controls getrennt",
                "Theme Import/Export mit Guard/Allowlist statt rohem JSON-Durchreichen",
                "Release-Freeze für Toolbar/Spotlight/Glow in Settings sichtbar respektiert",
              ],
            },
            {
              icon: "📘",
              title: "InfoView als Source of Truth",
              color: "#FF6B35",
              items: [
                "Doku-Drift gegen reale Views reduziert",
                "Render-/Motion-Erklärung präzisiert (keine Overclaims)",
                "Desktop/Mobile-Inhalte enger angeglichen",
              ],
            },
          ].map((section) => (
            <div
              key={section.title}
              style={{
                padding: "14px 16px",
                borderRadius: 11,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${section.color}22`,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: section.color }}>
                {section.icon} {section.title}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {section.items.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 12,
                      opacity: 0.72,
                      lineHeight: 1.6,
                      paddingLeft: 14,
                      position: "relative",
                      marginBottom: 3,
                    }}
                  >
                    <span style={{ position: "absolute", left: 2, color: section.color }}>·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div
            style={{
              marginTop: 16,
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(48,209,88,0.08)",
              border: "1px solid rgba(48,209,88,0.2)",
              fontSize: 11,
              color: "#30d158",
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            ✓ Production channel · Electron v28 · Vite 5 · React 18 · Zustand · Monaco
          </div>
        </Acc>

        <Acc title="Was ist Nexus?" icon={BookOpen} open={open.about} onToggle={() => tog("about")}>
          <P>
            Nexus ist eine lokale Productivity-Suite für Wissensarbeit, Planung, Ausführung und Review. Die
            Stärke liegt in der Kombination aus Notes/Code/Tasks/Reminders/Canvas mit gemeinsamem Workspace-
            und Motion-/Render-Vertrag.
          </P>
          <Grid2>
            <Card icon="📝" title="Notes" desc="Markdown + Wissensnavigation mit Links, Backlinks und strukturierten Blocks." />
            <Card icon="💻" title="Code" desc="Leichter Embedded-Editor mit Quick Open, Run/Preview und Output-History." />
            <Card icon="✅" title="Tasks" desc="Kanban + Focus/Saved Views + Linked Context zu Notes/Reminders." />
            <Card icon="🔔" title="Reminders" desc="Triage-orientiert mit recurrence, snooze und Health/Fallback-Kontext." />
            <Card icon="🧠" title="Canvas" desc="Strukturierte Wissensfläche mit Find/Jump, Outline und Fokusfahrten." />
            <Card icon="🗂️" title="Files" desc="Content- und Workspace-Hub über Note/Code/Task/Reminder/Canvas." />
            <Card icon="⚡" title="Flux" desc="Ops-Layer mit Queue-Slices, Bottlenecks und Drilldown-Aktionen." />
            <Card icon="🛠️" title="DevTools" desc="Builder/Recipe- und Export-Tools für produktive UI-Arbeit." />
            <Card icon="⚙️" title="Settings" desc="Stabile Alltags-Settings plus klar getrennte Advanced/Experimental Sektionen." />
          </Grid2>
          <Code>{`Nexus v5.0 — Stack
━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend:  React 18 + Vite 5
State:     Zustand (persisted stores)
Editor:    Monaco + Textarea fallback
Runtime:   Electron v28
Core:      @nexus/core (render + motion + shared contracts)`}</Code>
        </Acc>

        <Acc
          title="Nexus Engine & Architektur"
          icon={Monitor}
          open={open.architecture}
          onToggle={() => tog("architecture")}
          badge="CORE"
        >
          <P>
            Render und Motion laufen zentral über den Shared Core. Der Rollout ist weit fortgeschritten, aber
            nicht jeder Legacy-Pfad wurde vollständig eliminiert. Ziel ist kontrollierte Konsolidierung statt
            fragiler Big-Bang-Rewrites.
          </P>
          <Grid2>
            <Card icon="🧭" title="Render Pipeline" desc="Measure → Resolve → Allocate → Commit → Cleanup." />
            <Card icon="🎞️" title="Motion-Vertrag" desc="Render begrenzt Komplexität, Motion setzt sie qualitätskontrolliert um." />
            <Card icon="🧱" title="Surface/Effekt-Klassen" desc="Klare Klassen statt lokalem Mischbetrieb aus Blur/Shader/Hover-Workarounds." />
            <Card icon="🛡️" title="Guardrails" desc="Transform/Filter/Opacity Ownership + Bounds-Integrity für stabile Interaktion." />
            <Card icon="📉" title="Degradation" desc="Low Power / Reduced Motion / Last reduzieren Komplexität statt UX-Brüche zu erzeugen." />
            <Card icon="📚" title="Ehrliche Doku" desc="InfoView beschreibt den realen Stand, nicht einen theoretischen Zielzustand." />
          </Grid2>
          <Code>{`@nexus/core/render
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) Measure   -> Sichtbarkeit + Kontext erfassen
2) Resolve   -> Capability + Invariants bestimmen
3) Allocate  -> Budget für dynamic/shader/burst vergeben
4) Commit    -> Änderungen gezielt ausrollen
5) Cleanup   -> Diagnostics + Cache/Stability aktualisieren

Prinzip:
- Render entscheidet was ein Surface tragen darf
- Motion entscheidet wie es ausgeführt wird
- Views konsumieren den Vertrag statt lokale Parallel-Engines zu bauen`}</Code>
        </Acc>

        <Acc
          title="Diagnostics & Source of Truth"
          icon={BarChart3}
          open={open.diagnostics}
          onToggle={() => tog("diagnostics")}
          badge="DEV"
        >
          <Grid2>
            <Card
              icon="📊"
              title="Render Diagnostics"
              desc="Dev-View mit Render-Tier, Budget-Status, Surface-Zählung und Pipeline-Gesundheit."
            />
            <Card
              icon="🎚️"
              title="Motion Diagnostics"
              desc="Motion-Capability, Degradation-Level und aktive Choreography-Pfade nachvollziehen."
            />
            <Card
              icon="✨"
              title="Why Nexus feels smooth"
              desc="Kurze Wege, capability-aware transitions, material-settle und keine unkoordinierten Doppelmotionen."
            />
            <Card
              icon="🗺️"
              title="Docs Map"
              desc="READMEs + Wiki + InfoView bilden gemeinsam den Source-of-Truth-Pfad."
            />
          </Grid2>
          <Code>{`Source of Truth Reihenfolge
1) Produktverhalten in der laufenden App
2) Shared contracts in packages/nexus-core
3) App-README und Workspace-README
4) InfoView als in-app Referenz
5) Wiki/Website als externe Spiegelung`}</Code>
        </Acc>

        <Acc title="Komplette View-Referenz" icon={Layers} open={open.guide} onToggle={() => tog("guide")} badge="ALL VIEWS">
          <P>
            Kurzreferenz für reale Kernnutzung. Fokus auf häufige Flows und verlässliche Shortcuts.
          </P>
          <Grid2>
            <Card icon="📊" title="Dashboard" desc="Today + Continue + Runtime Health + In-Grid Layout Editing." keys={["Layout bearbeiten", "Swap Widgets", "Hidden Tray"]} />
            <Card icon="📝" title="Notes" desc="Wissensarbeit mit Outline, Linking, Magic Blocks und schnellem Wechsel." keys={["Cmd/Ctrl+S", "Cmd/Ctrl+B", "Cmd/Ctrl+K"]} />
            <Card icon="💻" title="CodeView" desc="Quick Open, Run/Preview, Output-History und Monaco-Fallback." keys={["Cmd/Ctrl+P", "Cmd/Ctrl+Enter", "Cmd/Ctrl+S"]} />
            <Card icon="✅" title="Tasks" desc="Board + Focus Views + Linked Context + Batch-Flows." />
            <Card icon="🔔" title="Reminders" desc="Recurrence/Snooze/Triage mit Task-/Note-Kontext." />
            <Card icon="🧠" title="Canvas" desc="Find/Jump, Outline, Multi-Select/Bulk, Focus/Fit und Magic Builder." keys={["Cmd/Ctrl+P", "Cmd/Ctrl+M", "Cmd/Ctrl+0", "F", "P"]} />
            <Card icon="🗂️" title="Files" desc="Workspace-Hub mit Canvas-Items, Smart Views und Assign-Flows." />
            <Card icon="⚡" title="Flux" desc="Ops Score + Bottlenecks + Drilldown-Actions auf echte Ziele." />
            <Card icon="🛠️" title="DevTools" desc="Builder/Recipe/Export für wiederverwendbare Artefakte." />
            <Card icon="⚙️" title="Settings" desc="Stable Settings zuerst, Advanced/Experimental kontrolliert getrennt." />
            <Card icon="📈" title="Render Diagnostics" desc="Dev-only Analyseview für Render/Motion-Zustände." />
            <Card icon="⌘" title="Terminal" desc="Command-Hub für Navigation, Suche und schnelle Aktionen." keys={["Enter", "Tab", "ArrowUp/Down", "Esc"]} />
          </Grid2>
        </Acc>

        <Acc title="Dashboard — In-Grid Editor" icon={Layout} open={open.dashboard} onToggle={() => tog("dashboard")} badge="UPDATED">
          <P>
            Dashboard wird direkt im Grid bearbeitet. Kein separater Sidebar-Editor als Hauptworkflow.
          </P>
          <Grid2>
            <Card icon="🔁" title="Widget-Swap" desc="Widget auf Widget ziehen, Positionen werden direkt getauscht." />
            <Card icon="🧰" title="Inline-Chrome" desc="Drag Handle, 1w/2w, Visible/Hidden direkt pro Karte im Edit Mode." />
            <Card icon="🎛️" title="Action Bar" desc="Undo/Redo, Preset, Lock, Reset zentral in der Floating Action Bar." />
            <Card icon="📦" title="Hidden Widgets Tray" desc="Ausgeblendete Widgets bleiben erreichbar und rückholbar." />
            <Card icon="🛟" title="Safe Mode" desc="Einzelne Widget-Fehler führen nicht mehr zu leerem Dashboard." />
            <Card icon="⚡" title="Today/Capture" desc="Note/Task/Reminder/Canvas Quick Capture direkt aus Today Layer." />
          </Grid2>
        </Acc>

        <Acc title="Notes — Wissensoberfläche" icon={FileText} open={open.notes} onToggle={() => tog("notes")}> 
          <P>
            Notes ist mehr als Editor: schnelle Navigation, strukturiertes Markdown und verlinkter Kontext.
          </P>
          <Grid2>
            <Card icon="🧭" title="Navigation" desc="Quick Switch/Filter/Tags und strukturierte Notizlisten." />
            <Card icon="🔗" title="Linking" desc="Wikilinks, Backlinks und verwandte Inhalte für Wissensnetze." />
            <Card icon="🪄" title="Magic Blocks" desc="nexus-* Blocks für strukturierte Pläne, Metriken und Kanban-Schnipsel." />
            <Card icon="💾" title="Autosave + History" desc="Draft-Commit, Undo/Redo und stabiler Dirty-State." />
          </Grid2>
          <Code>{`Unterstützte Magic-Blocks (Notes + Canvas Markdown)
- nexus-list
- nexus-checklist
- nexus-alert
- nexus-callout
- nexus-progress
- nexus-timeline
- nexus-grid
- nexus-card
- nexus-kanban
- nexus-badge
- nexus-metrics
- nexus-steps
- nexus-quadrant`}</Code>
        </Acc>

        <Acc title="CodeView — Embedded Coding" icon={Code2} open={open.code} onToggle={() => tog("code")}> 
          <Grid2>
            <Card icon="📂" title="Quick Open" desc="Dateien schnell via Shortcut öffnen und zwischen offenen Tabs wechseln." keys={["Cmd/Ctrl+P"]} />
            <Card icon="▶️" title="Run / Preview" desc="JS/TS-Run, HTML/CSS-Preview, JSON-Validation und klare Output-Trennung." keys={["Cmd/Ctrl+Enter"]} />
            <Card icon="🧪" title="Run History" desc="Letzte Läufe mit Status und Dauer für schnelle Wiederholung." />
            <Card icon="🛟" title="Monaco Fallback" desc="Wenn Monaco nicht lädt, bleibt ein funktionaler Fallback-Editor aktiv." />
          </Grid2>
        </Acc>

        <Acc title="Tasks" icon={CheckSquare} open={open.tasks} onToggle={() => tog("tasks")}> 
          <Grid2>
            <Card icon="🎯" title="Focus Views" desc="My Day, Due Soon und Priority-orientierte Arbeitsmodi." />
            <Card icon="🔗" title="Linked Context" desc="Direkte Sprünge zu verknüpften Notes/Reminders (und optional Canvas)." />
            <Card icon="🧱" title="Blocker/Dependency" desc="Abhängigkeiten sichtbar machen, statt nur Statuslisten zu pflegen." />
            <Card icon="🧺" title="Batch Actions" desc="Mehrfachauswahl für Status/Priorität/Tag-Operationen." />
          </Grid2>
        </Acc>

        <Acc title="Reminders" icon={Bell} open={open.reminders} onToggle={() => tog("reminders")}> 
          <Grid2>
            <Card icon="🔁" title="Recurrence" desc="Wiederholungen mit verständlicher Zusammenfassung und Edit-Flow." />
            <Card icon="💤" title="Snooze" desc="Schnelle Presets für tägliche Triage ohne Modal-Overhead." />
            <Card icon="🔗" title="Linked Context" desc="Task-/Note-Kontext direkt auf Reminder-Karten und im Detaildialog." />
            <Card icon="🛡️" title="Reliability" desc="Health/Fallback-Status erklärt klar, ob Reminder zuverlässig ausgelöst werden." />
          </Grid2>
        </Acc>

        <Acc title="Canvas — Strukturierte Wissensfläche" icon={GitBranch} open={open.canvas} onToggle={() => tog("canvas")}> 
          <P>
            Canvas ist für Orientierung und Wissensarbeit ausgelegt: Suche, Navigator, Fokusfahrten und
            strukturierte Node-Typen statt nur "unendliche Fläche".
          </P>
          <Grid2>
            <Card icon="🔎" title="Find / Jump to Node" desc="Schnell nach Titel/Typ/Tags suchen und direkt auf Node fokussieren." />
            <Card icon="🗺️" title="Outline / Navigator" desc="Projektpanel mit Node-Gruppen, klickbarem Jump und Fokusmodus." />
            <Card icon="🧺" title="Multi-Select / Bulk" desc="Mehrere Nodes wählen und gemeinsam Status/Priority/Tags setzen oder löschen." />
            <Card icon="🎥" title="Camera Focus / Fit" desc="Fokusfahrten und Fit-View als orientierende Übergänge statt harte Sprünge." />
            <Card icon="🪄" title="Magic Templates" desc="Hub-first Templates plus ai-project Prompt-Flow für Multi-Node-Strukturen." />
            <Card icon="📐" title="Node Resize + Node Zoom" desc="Getrennte Handles für Rahmen-Größe und Inhalts-Zoom pro Node." />
          </Grid2>
          <Card
            title="Canvas Controls"
            desc=""
            keys={[
              "Space Hold Pan",
              "Cmd/Ctrl+P Quick Switch",
              "Cmd/Ctrl+M Magic",
              "Cmd/Ctrl+0 Fit",
              "F Focus/Fit",
              "P Project Panel",
              "G Grid",
              "+ / - Zoom",
            ]}
          />
        </Acc>

        <Acc title="Files & Workspaces" icon={HardDrive} open={open.files} onToggle={() => tog("files")}> 
          <P>
            Files verbindet Content-Browser, Workspace-Organisation und Import/Export/Handoff-Workflows.
          </P>
          <Grid2>
            <Card icon="📦" title="Alle Item-Typen" desc="Note, Code, Task, Reminder und Canvas als reguläre Files-Items." />
            <Card icon="🧠" title="Smart Views" desc="Workspace, Recent, Pinned und Unassigned für schnelle Selektion." />
            <Card icon="🔁" title="Assign Flows" desc="Einzel- und Batch-Zuordnung von Items zu Workspaces." />
            <Card icon="💾" title="Disk + Runtime Flows" desc="Desktop-Sync und Mobile-Handoff mit Import/Review/Merge-Pfaden." />
          </Grid2>
        </Acc>

        <Acc title="Flux — Ops Tool" icon={Zap} open={open.flux} onToggle={() => tog("flux")}> 
          <Grid2>
            <Card icon="🧭" title="Queue Slices" desc="Ops-Presets wie Overdue, Due Soon, Focus und Backlog-Triage." />
            <Card icon="🚨" title="Bottleneck Drilldowns" desc="Engpässe verweisen auf konkrete Zielobjekte statt nur Statuszahlen." />
            <Card icon="⚡" title="Action Flows" desc="Open task/reminder/note/code direkt aus Queue und Activity heraus." />
            <Card icon="📈" title="Ops Score" desc="Hilfswert mit erklärter Aussagekraft statt pseudo-präziser Kennzahl." />
          </Grid2>
        </Acc>

        <Acc title="DevTools" icon={Wrench} open={open.devtools} onToggle={() => tog("devtools")}> 
          <Grid2>
            <Card icon="🧪" title="Builder Outputs" desc="Snippet/Recipe/Component/Prototype als wiederverwendbare Artefakte." />
            <Card icon="📚" title="Artifact Library" desc="Saved Recipes + Recent Builds statt rein temporärem Playground-Output." />
            <Card icon="📋" title="Export/Copy Flows" desc="Apply-to-code und Exporte für echten Tooling-Workflow." />
            <Card icon="🧭" title="QA Utility" desc="Pragmatische Perf/Accessibility-Hinweise in produktiven Flows." />
          </Grid2>
        </Acc>

        <Acc title="Settings — Stable zuerst" icon={Settings} open={open.settings} onToggle={() => tog("settings")}> 
          <P>
            Settings priorisiert stabile Alltagssteuerung. Advanced/Experimental ist getrennt und klar markiert.
          </P>
          <Grid2>
            <Card icon="✅" title="Stable Controls" desc="Theme, Layout, Accessibility, Editor-Defaults und Workspace-Maintenance." />
            <Card icon="🧪" title="Advanced / Experimental" desc="Engine-nahe Optionen mit klarer Kennzeichnung und geringerem Prominenzgrad." />
            <Card icon="🧱" title="Release Freeze" desc="Toolbar-/Spotlight-/Glow-Zonen werden nicht als frei editierbare Release-Settings geführt." />
            <Card icon="🛡️" title="Theme Import Guard" desc="Schema/Allowlist/Defaults verhindern kaputte oder veraltete JSON-Imports." />
          </Grid2>
          <Card title="Maintenance" desc="Walkthrough, Spotlight Reset, Terminal Reset und Dashboard Reset sind getrennt erklärt." />
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
            Terminal ist der schnelle Command-Hub für Navigation, Create-Flows und Canvas/Spotlight-Aktionen.
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
          <H>Warum nutzen?</H>
          <Grid2>
            <Card icon="⚡" title="Schneller als UI-Klickpfade" desc="Direkte Befehle für wiederkehrende Flows in einem Schritt." />
            <Card icon="🧩" title="Bridge zu Canvas/Spotlight" desc="Sinnvoll für Template- und Fokus-Aktionen während aktiver Arbeit." />
            <Card icon="📜" title="History + Macros" desc="Wiederholen komplexer Befehlsfolgen ohne manuelle Re-Klicks." />
            <Card icon="🧼" title="Kontrollierter Zustand" desc="Clear/Undo/Redo halten den Command-Kontext nachvollziehbar." />
          </Grid2>
        </Acc>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
