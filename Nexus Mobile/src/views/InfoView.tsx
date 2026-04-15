import { useMobile } from '../lib/useMobile'
import React, { useState } from 'react'
import { useTheme } from '../store/themeStore'
import {
  BookOpen, Code2, FileText, CheckSquare, Bell,
  Layout, Settings, Palette, Terminal, Keyboard, Zap, GitBranch, Sparkles,
  Wand2, Search, Layers, Calculator, HardDrive, Wrench, Package, BarChart3,
  Type, Monitor, Sliders, Eye, Play, Copy, Star, Clock
} from 'lucide-react'
import { Acc, Badge, Card, Code, Grid2, H, P, hexRgb } from './info/InfoPrimitives'

export function InfoView() {
  const t = useTheme()
  const rgb = hexRgb(t.accent)
  const mob = useMobile()
  const [open, setOpen] = useState<Record<string,boolean>>({
    about: true,
    architecture: true,
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
  })
  const tog = (k: string) => setOpen(s => ({ ...s, [k]: !s[k] }))

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: mob?.isMobile ? '14px 14px' : '20px 22px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Hero */}
        <div style={{ marginBottom: 28, padding: '24px 28px', borderRadius: 18, background: `linear-gradient(135deg, rgba(${rgb},0.12) 0%, transparent 60%)`, border: `1px solid rgba(${rgb},0.2)`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, rgba(${rgb},0.2), transparent)`, filter: 'blur(30px)' }}/>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 6, background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              NEXUS v5.0
            </div>
            <div style={{ fontSize: 13, opacity: 0.55, marginBottom: 16 }}>Productivity Suite · Workspace Edition · 10. April 2026</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <Badge label="Notes" color={t.accent}/>
              <Badge label="Code Editor" color="#BF5AF2"/>
              <Badge label="Tasks" color="#FF9F0A"/>
              <Badge label="Reminders" color="#FF453A"/>
              <Badge label="Canvas" color="#30D158"/>
              <Badge label="Files" color="#64D2FF"/>
              <Badge label="Flux" color="#FFD60A"/>
              <Badge label="DevTools" color="#FF6B35"/>
              <Badge label="Workspaces" color="#5E5CE6"/>
            </div>
          </div>
        </div>

        {/* ═══ CHANGELOG ═══ */}
        <Acc title="Changelog" icon={Star} open={open.changelog} onToggle={() => tog('changelog')} badge="v5.0 NEW">
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.accent }}>v5.0 — Stability, Performance & UX Polish</div>
            <div style={{ fontSize: 10, opacity: 0.45, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>
              4. April 2026 · Active Channel
            </div>
          </div>

          {[
            { icon: '🚀', title: 'Performance-Update projektweit', color: '#64D2FF', items: [
              'View-Wechsel und Startup überarbeitet, weniger wahrnehmbare Delays im Build',
              'Terminal und UI-Updates mit geringerem Re-Render-Druck auf Laptop/Phone',
              'Canvas Rendering mit reduzierten Effekten bei hohen Lastsituationen',
              'Stabilere Runtime bei schwankender Netzqualität',
            ]},
            { icon: '🧠', title: 'Canvas Stabilität + UX', color: '#30D158', items: [
              'Resize-Verhalten gehärtet (kein weißes Flashing mehr auf Node-Hintergründen)',
              'Resize nutzt jetzt Resize-Safe Fallback ohne schwere Filter im Drag',
              'Node-Interaktion bleibt flüssig bei Zoom/Pan/Resize',
              'Main- und Mobile-Canvas wieder auf gleichem Stabilitätsstand',
            ]},
            { icon: '⌘', title: 'Terminal + Navigation', color: '#BF5AF2', items: [
              'Terminal-Banner und Runtime-Versionen auf v5 aktualisiert',
              'Command/Navigation-Flows bleiben vollständig erhalten',
              'Schnelle Aktionen für Create/Goto/Search weiterhin direkt verfügbar',
            ]},
            { icon: '📘', title: 'InfoView & Version-Parität', color: '#FF6B35', items: [
              'Mobile InfoView auf v5 angehoben',
              'Stale v4.x Marker in Mobile entfernt (App/Sidebar/Code/Terminal)',
              'Dokumentationsinhalte auf aktuellen Feature-Stand gebracht',
            ]},
          ].map(section => (
            <div key={section.title} style={{ padding: '14px 16px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: `1px solid ${section.color}22`, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: section.color }}>{section.icon} {section.title}</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {section.items.map((item, i) => (
                  <li key={i} style={{ fontSize: 12, opacity: 0.74, lineHeight: 1.6, paddingLeft: 14, position: 'relative', marginBottom: 3 }}>
                    <span style={{ position: 'absolute', left: 2, color: section.color }}>·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '18px 0' }}/>

          <div style={{ opacity: 0.62 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Previous Releases</div>
            <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.65 }}>
              Core Production Build · Dashboard Widgets · Command Palette · Theme Tokens + Auto-Kontrast ·
              Notes/Code/Tasks/Reminders/Canvas Foundation · Glow/Glass Engine · Preset-System
            </div>
          </div>

          <div style={{ marginTop: 16, padding: '10px 16px', borderRadius: 10, background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)', fontSize: 11, color: '#30d158', textAlign: 'center', fontWeight: 700 }}>
            ✓ Production-ready · Electron + React + Zustand · Liquid Glass UI · v5.0.0
          </div>
        </Acc>

        {/* ═══ ABOUT ═══ */}
        <Acc title="Was ist Nexus?" icon={BookOpen} open={open.about} onToggle={() => tog('about')}>
          <P>Nexus ist eine lokale Productivity-App mit modernem Liquid-Glass UI. Fokus: schnelle Navigation, klare Datenmodelle, starke Editor-Workflows und eine konsistente UX über alle Views.</P>
          <Grid2>
            <Card icon="📝" title="Notes" desc="Markdown-Editor mit Split/Preview, Tags, Pinning und Magic-Elementen."/>
            <Card icon="💻" title="Code" desc="Monaco-basierter Editor mit Multi-Language Support und Ausführungs-/Preview-Modi."/>
            <Card icon="✅" title="Tasks" desc="Kanban-Flow mit Deadlines, Subtasks, Prioritäten und Filtern."/>
            <Card icon="🔔" title="Reminders" desc="Zeitbasierte Erinnerungen mit Snooze, Repeat und Toast-Flow."/>
            <Card icon="📊" title="Dashboard" desc="Pinbare Widgets, personalisierbar und persistent gespeichert."/>
            <Card icon="🗂️" title="Files & Workspaces" desc="Einheitliche Dateiansicht über Notes/Code/Tasks/Reminders."/>
            <Card icon="⚡" title="Flux" desc="Operations View mit Queue, Bottlenecks, Activity-Filter und Quick Actions."/>
            <Card icon="🛠️" title="DevTools" desc="Builder + UI Calculator für schnelle Frontend-Arbeit."/>
            <Card icon="⚙️" title="Settings" desc="Theme-System mit Presets, Tokens, Glass/Glow/Background/Motion."/>
          </Grid2>
          <Code>{`Nexus v5.0 — Stack
━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend:   React 18 + Vite 5 + TypeScript
State:      Zustand (persisted Stores)
Editor:     Monaco Editor
Markdown:   react-markdown + remark-gfm
DnD:        react-dnd
Animation:  Framer Motion
Runtime:    Electron`}
          </Code>
        </Acc>

        <Acc title="Nexus Engine & Architektur" icon={Monitor} open={open.architecture} onToggle={() => tog('architecture')} badge="CORE v5">
          <P>Auch auf Mobile basiert Nexus auf derselben zentralen UI-Engine wie Desktop: Render-Capabilities, Motion-Degradation und Guardrails kommen aus dem Shared Core.</P>
          <Grid2>
            <Card icon="🧭" title="Render Pipeline" desc="Measure → Resolve → Allocate → Commit → Cleanup für stabile und vorhersagbare UI-Updates."/>
            <Card icon="🎞️" title="Motion-Vertrag" desc="Render entscheidet die Komplexität, Motion setzt sie kontrolliert um — ohne Konflikte pro Element."/>
            <Card icon="🛡️" title="Guardrails" desc="Bounds/Hitbox/Owner-Regeln verhindern visuelle Drift und kaputte Interaktionen."/>
            <Card icon="📉" title="Degradation" desc="Bei Last oder Low-Power sinkt Komplexität stufenweise statt die UX abrupt abzuschalten."/>
          </Grid2>
          <Code>{`@nexus/core (shared)
━━━━━━━━━━━━━━━━━━━━━━━━━━
Render: Surface classes + effect budget + diagnostics
Motion: Familien + capability-aware transitions
Apps:   Main/Mobile konsumieren denselben Vertrag

Effekt:
- konsistentere Optik
- stabilere Laufzeit
- weniger Sonderlogik pro View`}
          </Code>
        </Acc>

        <Acc title="Komplette View-Referenz" icon={Layers} open={open.guide} onToggle={() => tog('guide')} badge="ALL VIEWS">
          <P>Alle produktiven Views mit Kernfunktionen und praktischen Shortcuts in einer kompakten Übersicht.</P>
          <Grid2>
            <Card icon="📊" title="Dashboard" desc="Widget-Liveboard mit Layout-Editor und persistenter Anordnung." keys={['Drag Widgets','Layout bearbeiten','Reset Layout']}/>
            <Card icon="📝" title="Notes" desc="Markdown + Magic Blocks, Import/Export, Tags, Split/Preview." keys={['Cmd/Ctrl+S','Cmd/Ctrl+B','Cmd/Ctrl+I','Cmd/Ctrl+K']}/>
            <Card icon="💻" title="Code" desc="Monaco, Run/Preview, Tabs, Search und Output." keys={['Cmd/Ctrl+Enter','Cmd/Ctrl+S']}/>
            <Card icon="✅" title="Tasks" desc="Kanban mit Prioritäten, Deadlines und Subtasks."/>
            <Card icon="🔔" title="Reminders" desc="Snooze/Repeat/Overdue mit schneller Bearbeitung."/>
            <Card icon="🧠" title="Canvas" desc="Infinite Board mit Magic Presets, Auto-Layout und Export." keys={['Cmd/Ctrl+M','Cmd/Ctrl+0','+ / -','G','F']}/>
            <Card icon="🗂️" title="Files" desc="Workspace-Ordner und zentraler Datei-/Item-Zugriff."/>
            <Card icon="⚡" title="Flux" desc="Ops-Center mit Queue, Bottlenecks und Quick Create." keys={['Cmd/Ctrl+F','Cmd/Ctrl+Shift+N/C/T/R']}/>
            <Card icon="🛠️" title="DevTools" desc="UI-Builder und Helper für schnelle Frontend-Iterationen."/>
            <Card icon="⚙️" title="Settings" desc="Presets + Theme/Panel/Motion-Konfiguration."/>
            <Card icon="⌘" title="Terminal" desc="Command-Hub für Navigation, Suche und schnelle Aktionen." keys={['Enter','Tab','ArrowUp/Down','Esc']}/>
            <Card icon="ℹ️" title="Info" desc="Produktguide, Changelog und Referenzdokumentation."/>
          </Grid2>
        </Acc>

        {/* ═══ DASHBOARD ═══ */}
        <Acc title="Dashboard — Layout Editor" icon={Layout} open={open.dashboard} onToggle={() => tog('dashboard')} badge="UPDATED">
          <P>Das Dashboard nutzt ein flexibles 2-Spalten-Layout mit Snap-Verhalten und persistenter Widget-Positionierung.</P>
          <Grid2>
            <Card icon="🧲" title="Snap Layout" desc="Widgets lassen sich präzise im Grid platzieren und neu anordnen."/>
            <Card icon="🎛️" title="Manuelle Kontrolle" desc="Breite, Spalte, Zeile und Sichtbarkeit pro Widget steuerbar."/>
            <Card icon="♻️" title="Reset" desc="Dashboard-Layout kann jederzeit auf Standard zurückgesetzt werden."/>
            <Card icon="📦" title="Persistenz" desc="Widget-Konfiguration bleibt zwischen Sessions erhalten."/>
          </Grid2>
          <Card title="Keybinds" desc="Keine globalen Tastenkürzel in Dashboard; Fokus auf direkte UI-Interaktion."/>
        </Acc>

        {/* ═══ NOTES ═══ */}
        <Acc title="Notes — Markdown Editor" icon={FileText} open={open.notes} onToggle={() => tog('notes')}>
          <H>Workflow</H>
          <Grid2>
            <Card icon="✏️" title="Edit / Split / Preview" desc="Drei Ansichtsmodi mit schneller Umschaltung und stabilen Scrollflächen."/>
            <Card icon="🏷️" title="Tags & Pinning" desc="Tags zur Strukturierung, Pinning für wichtige Notizen oben in der Liste."/>
            <Card icon="⚡" title="Magic Builder" desc="Nexus-spezifische Elemente wie List/Alert/Progress/Card/Timeline/Grid."/>
            <Card icon="💾" title="Autosave" desc="Notizen werden automatisch gespeichert (konfigurierbar)."/>
          </Grid2>
          <H>Beispiel</H>
          <Code>{`\`\`\`nexus-alert
warning
Deployment läuft gerade im Wartungsfenster.
\`\`\`

\`\`\`nexus-progress
UI Polish | 90
Testing   | 70
Release   | 40
\`\`\`

\`\`\`nexus-kanban
Backlog | Scope finalisieren
Doing | API integrieren
Review | QA + Smoke Test
Done | Release freigeben
\`\`\`

\`\`\`nexus-callout
tip | Rollout Hinweis
Vor dem Go-Live alle kritischen Flows einmal im Build testen.
\`\`\``}
          </Code>
          <Card title="Nützliche Shortcuts" desc="" keys={['Cmd/Ctrl+S Save','Cmd/Ctrl+B Bold','Cmd/Ctrl+I Italic','Cmd/Ctrl+K Link','Cmd/Ctrl+Z Undo','Cmd/Ctrl+Y Redo','Tab Indent']}/>
        </Acc>

        {/* ═══ CODE ═══ */}
        <Acc title="Code Editor" icon={Code2} open={open.code} onToggle={() => tog('code')}>
          <H>Features</H>
          <Grid2>
            <Card icon="🧠" title="Monaco Engine" desc="Syntax-Highlighting, große Sprachabdeckung, strukturierte Editor-Experience."/>
            <Card icon="▶️" title="Run & Preview" desc="Schnelle Ausführung/Preview je nach Dateityp und Modus."/>
            <Card icon="📂" title="Tab & Datei-Flow" desc="Code-Dateien anlegen, öffnen, speichern und schnell wechseln."/>
            <Card icon="🔎" title="Output Feedback" desc="Ergebnisse und Fehler sauber lesbar im Output-Bereich."/>
          </Grid2>
          <Card title="Shortcuts" desc="" keys={['Cmd/Ctrl+Enter Run','Cmd/Ctrl+S Save','Tab Indent (Textarea-Fallback)','Enter Create File (Modal)']}/>
        </Acc>

        {/* ═══ TASKS ═══ */}
        <Acc title="Tasks — Kanban Board" icon={CheckSquare} open={open.tasks} onToggle={() => tog('tasks')}>
          <H>Board-System</H>
          <P>Drei Statusspalten mit Drag & Drop: <strong>To Do</strong>, <strong>In Progress</strong>, <strong>Done</strong>.</P>
          <Grid2>
            <Card icon="🏷️" title="Tags & Filter" desc="Filter nach Priority und Tags für schnelle Fokussierung."/>
            <Card icon="📅" title="Deadlines" desc="Überfällige Tasks werden visuell hervorgehoben."/>
            <Card icon="☑️" title="Subtasks" desc="Task-Detail mit Subtask-Fortschritt und Toggle-Flow."/>
            <Card icon="📝" title="Task Notes" desc="Jeder Task kann eigene Markdown-Notizen enthalten."/>
            <Card icon="⚡" title="Prioritäten" desc="Low / Mid / High über Farbcode und Streifen."/>
            <Card icon="📊" title="Stats" desc="Fortschritt + Kennzahlen direkt im View."/>
          </Grid2>
        </Acc>

        {/* ═══ REMINDERS ═══ */}
        <Acc title="Reminders" icon={Bell} open={open.reminders} onToggle={() => tog('reminders')}>
          <H>Reminder Flow</H>
          <Grid2>
            <Card icon="⏱" title="Quick Time Presets" desc="+15m, +1h, +3h, Tomorrow, +1 week."/>
            <Card icon="🔁" title="Repeat" desc="none / daily / weekly / monthly."/>
            <Card icon="💤" title="Snooze" desc="5m, 15m oder 1h direkt aus Karte oder Toast."/>
            <Card icon="📝" title="Notes" desc="Optionaler Markdown-Notizbereich pro Reminder."/>
          </Grid2>
          <Grid2>
            <Card icon="🗓" title="Upcoming" desc="Zukünftige Erinnerungen, chronologisch gruppiert."/>
            <Card icon="⚠️" title="Overdue" desc="Überfällige Erinnerungen mit schneller Aktion."/>
            <Card icon="✅" title="Done" desc="Abgeschlossene Items zur Nachverfolgung."/>
            <Card icon="🔍" title="Search/Filter" desc="Schneller Zugriff über Titel/Message."/>
          </Grid2>
        </Acc>

        {/* ═══ CANVAS ═══ */}
        <Acc title="Canvas — Infinite Board" icon={GitBranch} open={open.canvas} onToggle={() => tog('canvas')}>
          <P>Magic Presets erstellen einen zentralen großen Hub pro Preset. Von dort aus kannst du weitere Nodes strukturiert anbinden.</P>
          <H>Visuelles Arbeiten</H>
          <Grid2>
            <Card icon="📝" title="Text & Ideas" desc="Freie Ideenblöcke auf unendlicher Fläche."/>
            <Card icon="🖼" title="Media & Snippets" desc="Bilder, Inhalte und strukturierte Elemente kombinieren."/>
            <Card icon="🔗" title="Connections" desc="Zusammenhänge als Knoten + Verbindungen darstellen."/>
            <Card icon="🔍" title="Zoom & Pan" desc="Präzise Navigation für große Maps."/>
          </Grid2>
          <Card title="Canvas Controls" desc="" keys={['Space Hold Pan Mode','Delete Node','Esc Reset Selection','Cmd/Ctrl+0 Reset View']}/>
        </Acc>

        {/* ═══ FILES / WORKSPACES ═══ */}
        <Acc title="Files & Workspaces" icon={HardDrive} open={open.files} onToggle={() => tog('files')}>
          <P>Der Files-View ist die zentrale Übersicht über Notes, Code, Tasks und Reminders inklusive Workspace-Zuordnung.</P>
          <Grid2>
            <Card icon="➕" title="Workspaces" desc="Erstellen, umbenennen und farblich strukturieren."/>
            <Card icon="📦" title="Item Zuweisung" desc="Items per Menü mehreren Workspaces zuordnen."/>
            <Card icon="⊞" title="Grid/List" desc="Zwischen visuellem Kartenmodus und kompakter Liste wechseln."/>
            <Card icon="🔍" title="Filter & Suche" desc="Typfilter plus Volltextsuche über Titel/Preview."/>
          </Grid2>
          <Card title="Keybinds" desc="" keys={['Enter Save Workspace (Modal)']}/>
        </Acc>

        {/* ═══ FLUX ═══ */}
        <Acc title="Flux — Ops Center" icon={Zap} open={open.flux} onToggle={() => tog('flux')} badge="REWORKED">
          <P>Flux bündelt operative Workflows: Action Queue, Bottleneck-Erkennung, Activity-Stream und Quick Create.</P>
          <Grid2>
            <Card icon="🧭" title="Action Queue" desc="Priorisierte Liste offener Tasks/Fälligkeiten mit direkten Resolve-Aktionen."/>
            <Card icon="🚨" title="Bottlenecks" desc="Engpässe werden anhand Priorität, Status und Fälligkeit hervorgehoben."/>
            <Card icon="🕵️" title="Activity Stream" desc="Filter nach Note/Code/Task/Reminder plus Volltextsuche."/>
            <Card icon="⚡" title="Quick Create" desc="Neue Note/Code/Task/Reminder direkt per UI oder Shortcut."/>
            <Card icon="📈" title="Ops Score" desc="Gesundheitswert 0–100 aus Queue-Last, Bottlenecks und Aktivitätsniveau."/>
            <Card icon="🏁" title="Bulk Actions" desc="Resolve Urgent und Start Backlog für schnelle Entlastung in Peak-Phasen."/>
          </Grid2>
          <Card title="Keybinds" desc="" keys={['Cmd/Ctrl+F Focus Search','Cmd/Ctrl+Shift+N/C/T/R Quick Create','Cmd/Ctrl+Shift+D Resolve Urgent','Cmd/Ctrl+Shift+B Start Backlog','1/2/3/4 Filter','0 Reset Filter','F Focus Mode','Esc Reset Query']}/>
        </Acc>

        {/* ═══ DEVTOOLS ═══ */}
        <Acc title="DevTools — Builder & Calculator" icon={Wrench} open={open.devtools} onToggle={() => tog('devtools')} badge="NEW">
          <H>Builder</H>
          <Grid2>
            <Card icon="📐" title="Layout/Spacing" desc="Schnelle Kontrolle über Maße, Padding, Margin und Positionierung."/>
            <Card icon="🎨" title="Visual Styling" desc="Background, Border, Shadow, Glow, Blur und Typografie in einem Flow."/>
            <Card icon="📋" title="Code Output" desc="Exportierbarer CSS/Tailwind Output für schnelle Übernahme."/>
            <Card icon="🧮" title="UI Calculator" desc="Hilfsfunktionen für Spacing, Typografie, Farben und Layout."/>
          </Grid2>
        </Acc>

        {/* ═══ SETTINGS ═══ */}
        <Acc title="Settings — Theme Editor" icon={Settings} open={open.settings} onToggle={() => tog('settings')}>
          <P>Alle Änderungen sind live. Der Settings-View steuert Farben, Glass, Glow, Motion, Layout und Editor-Verhalten zentral.</P>
          <Grid2>
            <Card icon="🎨" title="Theme" desc="Mode, Presets, Accent-Farben, Global Font."/>
            <Card icon="🪟" title="Glass" desc="Blur/Saturation/Tint/Border + Modi wie frosted, crystal, neon."/>
            <Card icon="✨" title="Glow" desc="Farbverläufe, Intensität, Radius, Animation."/>
            <Card icon="🖼" title="Background" desc="Solid/Gradient/Mesh/Aurora inkl. Overlay-Optionen."/>
            <Card icon="📐" title="Layout" desc="Sidebar, Toolbar, Radius, Dichte und Schriftgrößen."/>
            <Card icon="🎬" title="Motion" desc="Animationsgeschwindigkeit und Accessibility-Optionen."/>
            <Card icon="💻" title="Editor" desc="Autosave, Wrap, Zeilennummern, Tab-Size, Notes-Font."/>
            <Card icon="🧠" title="QOL" desc="High Contrast, Reduced Motion, Auto Accent-Kontrast."/>
          </Grid2>
        </Acc>

        {/* ═══ SHORTCUTS ═══ */}
        <Acc title="Tastenkürzel" icon={Keyboard} open={open.shortcuts} onToggle={() => tog('shortcuts')}>
          <Grid2>
            <Card title="Global / Palette" desc="" keys={['Cmd/Ctrl+K Palette Toggle','Cmd/Ctrl+1..9 Direkt zu View-Slots','Cmd/Ctrl+[ / ] View vor/zurück','Esc Palette Close']}/>
            <Card title="Dashboard" desc="Keine globalen Tastenkürzel; Fokus auf direkte UI-Interaktion."/>
            <Card title="Notes" desc="" keys={['Cmd/Ctrl+S Save','Cmd/Ctrl+B Bold','Cmd/Ctrl+I Italic','Cmd/Ctrl+K Link','Cmd/Ctrl+Z Undo','Cmd/Ctrl+Y Redo','Tab Indent']}/>
            <Card title="Code" desc="" keys={['Cmd/Ctrl+Enter Run','Cmd/Ctrl+S Save','Tab Indent (Textarea)','Enter Create File (Modal)']}/>
            <Card title="Tasks" desc="" keys={['Enter Add Tag','Enter Add Subtask']}/>
            <Card title="Reminders" desc="Keine globalen Tastenkürzel; Fokus auf Quick-Presets und Kartenaktionen."/>
            <Card title="Canvas" desc="" keys={['Space Hold Pan Mode','Delete Node','Esc Reset Selection','Cmd/Ctrl+0 Reset View']}/>
            <Card title="Files" desc="" keys={['Enter Save Workspace (Modal)']}/>
            <Card title="Flux" desc="" keys={['Cmd/Ctrl+F Focus Search','Cmd/Ctrl+Shift+N/C/T/R Quick Create','Cmd/Ctrl+Shift+D Resolve Urgent','Cmd/Ctrl+Shift+B Start Backlog','1/2/3/4 Filter','0 Reset Filter','F Focus Mode','Esc Reset Query']}/>
            <Card title="DevTools" desc="" keys={['Tab Indent (Builder Textarea)','Enter Confirm Rename','Esc Cancel Rename']}/>
            <Card title="Settings" desc="" keys={['Enter Commit Hex Color']}/>
            <Card title="Info" desc="Keine globalen Tastenkürzel; dient als Referenz- und Release-Übersicht."/>
            <Card title="Terminal" desc="" keys={['Enter Execute','ArrowUp/ArrowDown History','Esc Close Terminal','Ctrl+L Clear']}/>
          </Grid2>
        </Acc>

        {/* ═══ TERMINAL ═══ */}
        <Acc title="Terminal" icon={Terminal} open={open.terminal} onToggle={() => tog('terminal')}>
          <P>Das Nexus Terminal ist eine schnelle Kommandooberfläche für Navigation, Erstellen, Suche und Theme-Steuerung.</P>
          <H>Verfügbare Commands</H>
          <Code>{`help
views
goto <view>
new note|task|reminder|code
list notes|tasks|reminders
stats
theme dark|light
preset <name>
search <query>
palette
clear
exit`}
          </Code>
          <P>Zusätzlich gibt es Quick-Chips im Terminal für häufige Befehle.</P>
        </Acc>

        <div style={{ height: 40 }}/>
      </div>
    </div>
  )
}
