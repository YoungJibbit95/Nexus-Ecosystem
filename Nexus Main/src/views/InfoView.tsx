import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from '../store/themeStore'
import { buildMotionRuntime } from '../lib/motionEngine'
import {
  ChevronDown, BookOpen, Code2, FileText, CheckSquare, Bell,
  Layout, Settings, Palette, Terminal, Keyboard, Zap, GitBranch, Sparkles,
  Wand2, Search, Layers, Calculator, HardDrive, Wrench, Package, BarChart3,
  Type, Monitor, Sliders, Eye, Play, Copy, Star, Clock
} from 'lucide-react'

function Acc({ title, icon: Icon, open, onToggle, children, badge }: any) {
  const t = useTheme()
  const motionRuntime = useMemo(() => buildMotionRuntime(t), [t])
  const quickMotion = `var(--nx-motion-quick, ${motionRuntime.quickMs}ms)`
  const regularMotion = `var(--nx-motion-regular, ${motionRuntime.regularMs}ms)`
  const motionEase = 'cubic-bezier(0.22, 1, 0.36, 1)'
  return (
    <div style={{ marginBottom: 8 }}>
      <motion.button
        type="button"
        onClick={onToggle}
        whileHover={t.animations?.hoverLift ? { filter: 'brightness(1.03)' } : undefined}
        whileTap={motionRuntime.reduced ? undefined : { filter: 'brightness(0.97)' }}
        transition={motionRuntime.spring}
        style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px',
        background: open ? `rgba(${hexRgb(t.accent)},0.1)` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${open ? `rgba(${hexRgb(t.accent)},0.25)` : 'rgba(255,255,255,0.08)'}`,
        borderRadius: open ? '12px 12px 0 0' : 12,
        cursor: 'pointer', color: 'inherit',
        transition: `background-color ${regularMotion} ${motionEase}, border-color ${quickMotion} ${motionEase}, box-shadow ${regularMotion} ${motionEase}`,
      }}
      >
        {Icon && <Icon size={18} style={{ color: t.accent, opacity: 0.85, flexShrink: 0 }}/>}
        <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 700 }}>{title}</span>
        {badge && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 8, background: t.accent, color: '#fff' }}>{badge}</span>}
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0, opacity: 0.5 }}
          transition={motionRuntime.spring}
          style={{ display: 'inline-flex' }}
        >
          <ChevronDown size={14} />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: Math.max(0.14, motionRuntime.regularMs / 1000), ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function hexRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}

function Card({ title, icon, desc, keys }: { title: string; icon?: string; desc: string; keys?: string[] }) {
  const t = useTheme()
  const motionRuntime = useMemo(() => buildMotionRuntime(t), [t])
  return (
    <motion.div
      whileHover={t.animations?.hoverLift ? { filter: 'brightness(1.03)' } : undefined}
      transition={motionRuntime.spring}
      style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 8 }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5, color: t.accent }}>{icon} {title}</div>
      <div style={{ fontSize: 12, opacity: 0.68, lineHeight: 1.6 }}>{desc}</div>
      {keys && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
        {keys.map(k => <kbd key={k} style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontFamily: 'monospace', background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.13)' }}>{k}</kbd>)}
      </div>}
    </motion.div>
  )
}

function Code({ children }: { children: string }) {
  const t = useTheme()
  return (
    <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.09)', marginBottom: 12, overflowX: 'auto' }}>
      <pre style={{ margin: 0, fontSize: 12, fontFamily: "'Fira Code',monospace", color: `rgba(${hexRgb(t.accent)},0.9)`, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{children}</pre>
    </div>
  )
}

function Badge({ label, color = '#007AFF' }: { label: string; color?: string }) {
  return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: `${color}22`, color, border: `1px solid ${color}44`, marginRight: 5 }}>{label}</span>
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 8, marginBottom: 8 }}>{children}</div>
}

function H({ children }: { children: string }) {
  const t = useTheme()
  return <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
    <div style={{ width: 18, height: 2, background: t.accent, borderRadius: 1 }}/>{children}
  </div>
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.7, marginBottom: 12 }}>{children}</p>
}

export function InfoView() {
  const t = useTheme()
  const rgb = hexRgb(t.accent)
  const [open, setOpen] = useState<Record<string,boolean>>({
    about: true,
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
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 22px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Hero */}
        <div style={{ marginBottom: 28, padding: '24px 28px', borderRadius: 18, background: `linear-gradient(135deg, rgba(${rgb},0.12) 0%, transparent 60%)`, border: `1px solid rgba(${rgb},0.2)`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, rgba(${rgb},0.2), transparent)`, filter: 'blur(30px)' }}/>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 6, background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              NEXUS v5.0
            </div>
            <div style={{ fontSize: 13, opacity: 0.55, marginBottom: 16 }}>Productivity Suite · Glass & Glow Edition · 4. April 2026</div>
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
          {/* v5.0 */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: t.accent }}>v5.0 — Stability, Performance & UX Polish</div>
                <div style={{ fontSize: 10, opacity: 0.4, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>Current Release · 4 April 2026 · Stable</div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, background: 'rgba(48,209,88,0.18)', color: '#30d158', border: '1px solid rgba(48,209,88,0.3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>ACTIVE</span>
            </div>
          </div>

          {[
            { icon: '🚀', title: 'Performance-Update projektweit', color: '#64D2FF', items: [
              'Glass Hover-Light mit requestAnimationFrame gedrosselt (weniger CPU-Spikes bei vielen Panels)',
              'Terminal rendert nur die letzten 120 Zeilen sichtbar (smooth auf Laptop-GPUs)',
              'Terminal-History-Limit reduziert, um Reaktionszeit bei langen Sessions stabil zu halten',
              'Toolbar-Zeitupdate auf 60s gesenkt, damit weniger globale Re-Renders entstehen',
            ]},
            { icon: '⌘', title: 'Terminal Stabilität + neue Workflows', color: '#BF5AF2', items: [
              'Terminal dauerhaft unten mittig verankert für konsistente Bedienung',
              'Macro-Schutz gegen Endlosschleifen (Depth-Limit + Self-Run-Block) bleibt aktiv',
              'Undo/Redo, Macro-Recording und Search bleiben erhalten',
              'Quick-Commands + Spotlight-Bridge weiter direkt nutzbar',
            ]},
            { icon: '🧠', title: 'Canvas 2.x bleibt voll erhalten', color: '#30D158', items: [
              'Mindmap/Project-Templates, PM-Nodes und Auto-Layout weiterhin vollständig verfügbar',
              'Neues Template: AI Project Generator (Prompt + Depth light/balanced/deep)',
              'Snap-to-Grid, Quick Add, Minimap und Connection-Editing unverändert nutzbar',
              'Layout-Switch (Mindmap/Timeline/Board) wird sofort angewendet',
              'Resize-Safe Rendering reduziert White-Flashes bei Node-Resize deutlich',
              'Mehr Fokus auf Bedienbarkeit bei Trackpad + kleineren Laptop-Screens',
            ]},
            { icon: '📐', title: 'Dashboard Layout Editor verbessert', color: '#FF9F0A', items: [
              'Drag & Drop mit Snap bleibt aktiv, inkl. präzisem Drop auf Zielbereiche',
              'Manuelle Grid-Kontrollen (C1/C2, R-/R+, Breite) weiter ausgebaut',
              'Layout-Normalisierung reduziert springende oder inkonsistente Reihenfolgen',
              'Reset auf Default jederzeit verfügbar',
            ]},
            { icon: '🎛️', title: 'Global UI Cleanup', color: '#007AFF', items: [
              'Persistente View-Header-Leiste (oben mit View-Namen/Badges) entfernt',
              'Große View-Badge-Leiste in der Full-Width Toolbar entfernt',
              'Sidebar-Prinzip, Toolbar und Terminal-Struktur bleiben erhalten',
              'Glass/Glow-Optik bleibt, aber mit weniger visueller Unruhe',
              'Mehr Fokus auf klare Informationshierarchie',
            ]},
            { icon: '🔎', title: 'Spotlight + Command Bridge', color: '#5E5CE6', items: [
              'Terminal und Spotlight können weiterhin Canvas-Templates/Layout triggern',
              'Pinned/Recent-Command-Flows im Spotlight bleiben aktiv',
              'Direkte Navigation und Schnellaktionen über alle Views',
            ]},
            { icon: '📘', title: 'InfoView Guides komplett aktualisiert', color: '#FF6B35', items: [
              'Alle Kern-Guides auf v5.0 angehoben',
              'Terminal-, Canvas-, Dashboard- und Settings-Texte an aktuellen Funktionsstand angepasst',
              'Changelog und Kurzreferenzen mit neuen Workflows ergänzt',
            ]},
          ].map(section => (
            <div key={section.title} style={{ padding: '14px 16px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: `1px solid ${section.color}22`, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: section.color }}>{section.icon} {section.title}</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {section.items.map((item, i) => (
                  <li key={i} style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.6, paddingLeft: 14, position: 'relative', marginBottom: 3 }}>
                    <span style={{ position: 'absolute', left: 2, color: section.color }}>·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '20px 0' }}/>

          {/* v3.4 */}
          <div style={{ opacity: 0.55 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>v3.5 — DevTools & Workspaces</div>
            <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.7, marginBottom: 12 }}>
              Color-Cycling Gradient Glow · Magic Menu Portal-Fix · NexusToolbar Integration · Sidebar Position L/R ·
              Void & Sakura Presets · Electron CJS-Fix · QOL Settings Section
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>v3.3 — The Command Era</div>
            <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.7, marginBottom: 12 }}>
              Spotlight 2.0 mit Multi-Store-Suche · Smart Double-Shift Toggle · Refractive Glass Motion ·
              Horizontal Parity UI · Spotlight Kommandopalette
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>v3.2 — Ultimate Upgrade</div>
            <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.7 }}>
              Aurora/Mesh Backgrounds · Gradient Glow System · Glassmorphism+ (Sättigung, Tint, Border) ·
              Magic Widgets (7 Typen) · Reduced Motion · High Contrast
            </div>
          </div>

          <div style={{ marginTop: 16, padding: '10px 16px', borderRadius: 10, background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)', fontSize: 11, color: '#30d158', textAlign: 'center', fontWeight: 700 }}>
            ✓ Production-ready · Electron v28 · Vite 5 · React 18 · Zustand · Monaco v4 · Google Fonts · v5.0.0
          </div>
        </Acc>

        {/* ═══ ABOUT ═══ */}
        <Acc title="Was ist Nexus?" icon={BookOpen} open={open.about} onToggle={() => tog('about')}>
          <P>Nexus ist eine All-in-One Productivity-Suite mit Glassmorphism-Interface, gebaut mit Electron + React + Monaco. Alles läuft lokal, keine Cloud, volle Kontrolle über deine Daten.</P>
          <Grid2>
            <Card icon="📝" title="Notes" desc="Markdown-Editor mit Magic-Widgets, Split-View, Tags, Pinning und Syntax-Highlighting."/>
            <Card icon="💻" title="Code Editor" desc="Monaco-Engine, 14+ Sprachen, Live-Ausführung für JS/TS, HTML/CSS Preview, JSON-Validator."/>
            <Card icon="✅" title="Tasks" desc="Kanban-Board mit Tags, Deadlines, Subtasks, Markdown-Notes und Prioritäten-Filter."/>
            <Card icon="🔔" title="Reminders" desc="Timeline-Erinnerungen mit Snooze, Quick-Set, Markdown-Notes und Audio-Alerts."/>
            <Card icon="🔷" title="Canvas" desc="Infinite Arbeitsfläche für Mindmaps + PM: Magic Builder, Auto-Layout, Snap, PM-Nodes."/>
            <Card icon="🗂️" title="Workspaces" desc="Dateien in Projekten organisieren, zwischen Workspaces wechseln, Items zuweisen."/>
            <Card icon="⚡" title="Flux" desc="Operations View mit Activity-Stream, Action-Queue, Bottleneck-Erkennung und Schnellaktionen."/>
            <Card icon="🛠️" title="DevTools" desc="Visual CSS/Tailwind Builder + 20 UI-Rechenfunktionen für Webentwickler."/>
            <Card icon="⚙️" title="Settings" desc="7-Tab Theme-Editor mit Live-Preview — Glass, Glow, Background, Layout, Motion."/>
          </Grid2>
          <Code>{`Nexus v5.0 — Architektur
━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend:  React 18 + Vite 5 + TailwindCSS
State:     Zustand (persist via localStorage)
Editor:    Monaco Editor (via @monaco-editor/react)
Renderer:  Electron v28 (Chromium)
Markdown:  ReactMarkdown + remark-gfm
Drag&Drop: react-dnd + HTML5Backend
Anim:      Framer Motion`}
          </Code>
        </Acc>

        {/* ═══ DASHBOARD ═══ */}
        <Acc title="Dashboard — Layout Editor" icon={Layout} open={open.dashboard} onToggle={() => tog('dashboard')} badge="UPDATED">
          <P>Das Dashboard ist jetzt ein flexibles 2-Spalten Grid mit Snap-Logik. Widgets können per Drag & Drop oder manuell präzise positioniert werden.</P>
          <Grid2>
            <Card icon="🧲" title="Snap-Board" desc="Widget im Layout-Editor direkt auf Zellen ziehen. Row/Column wird live angezeigt."/>
            <Card icon="🎛️" title="Manuelle Steuerung" desc="Pro Widget: Breite (1w/2w), Spalte (C1/C2), Zeile (R-/R+) und Sichtbarkeit."/>
            <Card icon="↕️" title="Reorder" desc="Chevron Up/Down für Reihenfolge, zusätzlich Drag direkt im Dashboard-Grid."/>
            <Card icon="♻️" title="Reset" desc="Layout jederzeit auf Default zurücksetzen."/>
          </Grid2>
          <Code>{`Layout-Tipps:
1) Editor öffnen (Button "Layout bearbeiten")
2) Widget auf Snap-Board oder direkt im Grid droppen
3) Bei Feintuning C1/C2 und R-/R+ nutzen
4) Für volle Breite: Widget auf 2w setzen`}
          </Code>
        </Acc>

        {/* ═══ NOTES ═══ */}
        <Acc title="Notes — Markdown Editor" icon={FileText} open={open.notes} onToggle={() => tog('notes')}>
          <H>Modi</H>
          <Grid2>
            <Card icon="✏️" title="Edit Mode" desc="Reiner Markdown-Editor mit Syntax-Highlighting und Zeilennummern."/>
            <Card icon="👁" title="Preview Mode" desc="Gerendertes Markdown mit allen Magic-Widgets, Code-Blocks und Tabellen."/>
            <Card icon="⬛" title="Split Mode" desc="Editor links, Preview rechts — beide scrollen synchronisiert."/>
            <Card icon="⛶" title="Fullscreen" desc="View maximiert für maximale Schreibfläche, alle UI ausgeblendet."/>
          </Grid2>
          <H>Magic Widgets</H>
          <P>Magic-Widgets werden in Markdown als Code-Blöcke mit speziellen Sprachen geschrieben:</P>
          <Code>{`\`\`\`nexus-list
Label A | Wert A
Label B | Wert B
\`\`\`

\`\`\`nexus-alert
info
Deine Nachricht hier...
\`\`\`

\`\`\`nexus-progress
Frontend | 80
Backend  | 60
Tests    | 40
\`\`\`

\`\`\`nexus-timeline
W1 | Discovery
W2 | Build
W3 | Launch
\`\`\`

\`\`\`nexus-grid
2
API
UI
QA
Rollout
\`\`\`

\`\`\`nexus-card
Titel | Beschreibung | Meta
\`\`\``}
          </Code>
          <H>Magic Menü (⚡-Button)</H>
          <Grid2>
            <Card icon="📋" title="List Widget" desc="Zweispaltige Liste mit Labels und Werten."/>
            <Card icon="🔔" title="Alert Box" desc="Info/Warning/Error/Success/Tip Boxen."/>
            <Card icon="📊" title="Progress Bars" desc="Fortschrittsbalken mit Prozentangabe."/>
            <Card icon="🗓️" title="Timeline" desc="Roadmap-Ansicht mit Datum/Phase und Beschreibung."/>
            <Card icon="⊞" title="Grid" desc="Mehrspaltige Blöcke für strukturierte Inhalte."/>
            <Card icon="🃏" title="Card" desc="Hervorgehobene Inhaltsbox mit Titel, Text, Meta."/>
          </Grid2>
          <H>Tastenkürzel</H>
          <Card title="Editor Shortcuts" desc="" keys={['Cmd/Ctrl+S Save','Cmd/Ctrl+B Bold','Cmd/Ctrl+I Italic','Cmd/Ctrl+K Link','Cmd/Ctrl+Z Undo','Cmd/Ctrl+Y Redo','Tab Indent']}/>
        </Acc>

        {/* ═══ CODE ═══ */}
        <Acc title="Code Editor" icon={Code2} open={open.code} onToggle={() => tog('code')}>
          <H>Unterstützte Sprachen</H>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
            {['JavaScript','TypeScript','Python','HTML','CSS','JSON','Markdown','Java','C++','Rust','Go','Bash','SQL','Text'].map(l => <Badge key={l} label={l} color={t.accent}/>)}
          </div>
          <H>Ausführung</H>
          <Grid2>
            <Card icon="▶️" title="JS / TS" desc="Echter new Function()-Sandbox mit vollem console-Mock: log, warn, error, table, dir, assert, time, group." keys={['Ctrl+Enter']}/>
            <Card icon="🌐" title="HTML / CSS" desc="Live <iframe>-Preview im Split-Panel — CSS wird in eine Template-Page injiziert." />
            <Card icon="📋" title="JSON" desc="Validierung + Pretty-Print + Fehlerstelle markieren mit Kontext." />
            <Card icon="🔬" title="Andere Sprachen" desc="Intelligente Simulation: print()/println()/cout/printf-Aufrufe werden erkannt und ausgegeben."/>
          </Grid2>
          <H>Tastenkürzel</H>
          <Card title="Editor Shortcuts" desc="" keys={['Cmd/Ctrl+Enter Run','Cmd/Ctrl+S Save','Tab Indent (Textarea-Fallback)','Enter Create File (Modal)']}/>
          <H>Output Panel</H>
          <P>Das Terminal ist ein globales Command-Panel mit Suggestions, Macro-Workflow, Undo/Redo und Spotlight-Bridge. Clear setzt die Session zurück, History bleibt leichtgewichtig.</P>
          <Code>{`// Beispiel: JavaScript Output
console.log("Hello!")          // → Hello!
console.table([{a:1},{a:2}])   // → JSON-Tabelle
console.error("Fehler")        // → ❌ rot
const arr = [1,2,3]
console.log(arr.map(x=>x*2))   // → [2, 4, 6]`}
          </Code>
        </Acc>

        {/* ═══ TASKS ═══ */}
        <Acc title="Tasks — Kanban Board" icon={CheckSquare} open={open.tasks} onToggle={() => tog('tasks')}>
          <H>Board</H>
          <P>3 Spalten: <strong>To Do</strong>, <strong>In Progress</strong>, <strong>Done</strong>. Tasks per Drag & Drop verschieben. Doppelklick öffnet Edit-Modal.</P>
          <Grid2>
            <Card icon="🏷️" title="Tags & Filter" desc="Tags beim Erstellen vergeben, im Filter-Panel nach Tags filtern. Mehrere Tags kombinierbar."/>
            <Card icon="📅" title="Deadlines" desc="Datum setzen — überfällige Tasks werden rot markiert mit ⚠️-Icon."/>
            <Card icon="☑️" title="Subtasks" desc="Im Edit-Modal unter 'Subtasks' — Enter fügt neue Subtask hinzu. Fortschritt als x/n Badge."/>
            <Card icon="📝" title="Markdown Notes" desc="Jeder Task hat einen eigenen Markdown-Editor im 'Notes' Tab des Edit-Modals."/>
            <Card icon="⚡" title="Prioritäten" desc="Low (grün), Medium (gelb), High (rot) — farbiger Streifen am linken Rand der Karte."/>
            <Card icon="📊" title="Stats Bar" desc="Fortschrittsbalken + Total, Done, Overdue, High-Priority Counter oben im Board."/>
          </Grid2>
          <Code>{`Task anlegen:
1. + Button in einer Spalte klicken
2. Titel eingeben (Enter oder 'Create Task')
3. Priorität, Deadline, Tags im Modal setzen
4. Unter 'Notes' Tab: Markdown-Notizen

Schnell verschieben: Card anfassen und in andere Spalte ziehen`}
          </Code>
        </Acc>

        {/* ═══ REMINDERS ═══ */}
        <Acc title="Reminders" icon={Bell} open={open.reminders} onToggle={() => tog('reminders')}>
          <H>Erinnerungen erstellen</H>
          <Grid2>
            <Card icon="⏱" title="Quick-Set" desc="Buttons +15m, +1h, +3h, Tomorrow, +1 week setzen das Datum automatisch."/>
            <Card icon="🔁" title="Repeat" desc="Einmalig, täglich, wöchentlich oder monatlich — Interval wird nach dem Auslösen fortgesetzt."/>
            <Card icon="💤" title="Snooze" desc="5m, 15m, 1h snoozen direkt auf der Karte oder im Toast-Popup."/>
            <Card icon="📝" title="Notes Tab" desc="Markdown-Notizen pro Reminder — z.B. Links, Checklisten, Kontext."/>
          </Grid2>
          <H>Ansichten</H>
          <Grid2>
            <Card icon="🗓" title="Upcoming" desc="Alle zukünftigen Erinnerungen nach Datum gruppiert (Today, Tomorrow, Datum)."/>
            <Card icon="⏳" title="Soon" desc="Filter für nächste 30 Minuten, ideal für kurzfristige Priorisierung."/>
            <Card icon="⚠️" title="Overdue" desc="Abgelaufene und vergessene Erinnerungen — sofortige Snooze-Buttons sichtbar."/>
            <Card icon="✅" title="Done" desc="Abgeschlossene Erinnerungen."/>
            <Card icon="🔍" title="All" desc="Alle Erinnerungen in chronologischer Reihenfolge."/>
          </Grid2>
          <P>Ein Toast-Popup erscheint automatisch wenn eine Erinnerung ausgelöst wird — mit Dismiss, Snooze 5m / 15m / 1h. Overdue-Quick-Actions: +15m / +1h und Clear Done.</P>
        </Acc>

        {/* ═══ CANVAS ═══ */}
        <Acc title="Canvas — Infinite Board" icon={GitBranch} open={open.canvas} onToggle={() => tog('canvas')}>
          <H>Core Features</H>
          <Grid2>
            <Card icon="✨" title="Magic Builder" desc="Template-Generator für Mindmap, Roadmap, Sprint, Risk Matrix, Decision Flow und AI Project." keys={['Ctrl+M']}/>
            <Card icon="🤖" title="AI Project Generator" desc="Prompt + Tiefenstufe erzeugt Goals, Milestones, Risks, Decisions und Delivery-Tasks."/>
            <Card icon="🧭" title="Auto Layout" desc="Nodes automatisch in Mindmap-, Timeline- oder Board-Struktur ausrichten."/>
            <Card icon="🧲" title="Snap to Grid" desc="Exakte Positionierung beim Draggen. Für Laptop-Trackpads besonders hilfreich."/>
            <Card icon="🔗" title="Connections" desc="Nodes über Ports verbinden, Hover-Delete direkt auf der Linie."/>
          </Grid2>
          <H>Node-Typen</H>
          <Grid2>
            <Card icon="📝" title="Content Nodes" desc="Text, Markdown, Checklist, Code, Image, Linked Note/Code/Task/Reminder."/>
            <Card icon="📦" title="Project" desc="Owner, Status, Priority, Tags, Due-Date, Progress + Projektnotizen."/>
            <Card icon="🎯" title="Goal" desc="Priorität, Fortschritt und Zielbeschreibung."/>
            <Card icon="🚩" title="Milestone" desc="Status, Datum, Deliverables und Fortschritt."/>
            <Card icon="🌿" title="Decision" desc="Optionen, Kriterien, Owner, Deadline und Ergebnis."/>
            <Card icon="⚠️" title="Risk" desc="Priorität, Status, Probability/Impact Slider und Risk-Score."/>
          </Grid2>
          <H>Magic Markdown im Canvas</H>
          <Code>{`\`\`\`nexus-list
Owner | Product
Budget | TBD
\`\`\`

\`\`\`nexus-progress
Scope | 70
Readiness | 55
\`\`\`

\`\`\`nexus-timeline
Q1 | Discovery
Q2 | Build
Q3 | Launch
\`\`\`

\`\`\`nexus-grid
2
Vision
Risks
Dependencies
KPIs
\`\`\`

\`\`\`nexus-kanban
Todo | API Endpoint
Doing | UI Flow
Review | QA Run
\`\`\``}
          </Code>
          <H>Navigation</H>
          <Card title="Canvas Controls" desc="" keys={['Space Hold (Pan-Modus)','Delete Node','Esc Selection Reset','Cmd/Ctrl+0 Reset View','+ / = Zoom In','- Zoom Out','G Grid Toggle','F Focus/Fit','P Project Panel','Cmd/Ctrl+M Magic Builder']}/>
        </Acc>

        {/* ═══ FILES / WORKSPACES ═══ */}
        <Acc title="Files & Workspaces" icon={HardDrive} open={open.files} onToggle={() => tog('files')}>
          <P>Der Files View ist ein vollständiger Workspace-Manager. Links die Workspace-Sidebar, rechts die Dateiliste.</P>
          <H>Workspaces</H>
          <Grid2>
            <Card icon="➕" title="Workspace erstellen" desc="Oben rechts + klicken — Icon, Farbe und Beschreibung wählbar."/>
            <Card icon="🔀" title="Wechseln" desc="Workspace in der Sidebar anklicken — zeigt nur Items dieses Workspace."/>
            <Card icon="📦" title="Items zuweisen" desc="⋮-Menü auf einem Item → 'Add to Workspace' → Workspace wählen."/>
            <Card icon="🏠" title="All Files" desc="Zeigt alle Items ohne Workspace-Filter — globale Übersicht."/>
          </Grid2>
          <H>Dateiliste</H>
          <Grid2>
            <Card icon="⊞" title="Grid View" desc="Karten-Layout mit Preview-Text — Doppelklick öffnet Item."/>
            <Card icon="≡" title="List View" desc="Kompakte Listenansicht mit Typ, Zeit und Workspace-Farbe."/>
            <Card icon="🔍" title="Suche" desc="Echtzeit-Suche über Titel und Inhalt aller Items."/>
            <Card icon="🔽" title="Filter" desc="Nach Typ filtern: All, Note, Code, Task, Reminder."/>
          </Grid2>
        </Acc>

        {/* ═══ FLUX ═══ */}
        <Acc title="Flux — Ops Center" icon={Zap} open={open.flux} onToggle={() => tog('flux')} badge="REWORKED">
          <P>Flux bündelt operative Arbeit: Action-Queue, Bottlenecks, Filterbarer Activity-Stream und schnelle Erstellaktionen für alle Kernobjekte.</P>
          <Grid2>
            <Card icon="🧭" title="Action Queue" desc="Priorisiert offene Tasks und fällige Reminder mit direkten Resolve-Aktionen (Start/Done)."/>
            <Card icon="🚨" title="Bottlenecks" desc="Automatische Engpass-Erkennung aus Priorität, Status und Fälligkeitsfenster."/>
            <Card icon="🕵️" title="Activity Stream" desc="Filterbar nach Note/Code/Task/Reminder + Volltextsuche."/>
            <Card icon="⚡" title="Quick Create" desc="Neue Note/Code/Task/Reminder direkt aus Flux anlegen."/>
            <Card icon="📈" title="Ops Score" desc="Gesundheitswert 0–100 aus offenen Tasks, Due-Remindern, Bottlenecks und Aktivitätslevel."/>
            <Card icon="🏁" title="Bulk Actions" desc="Resolve Urgent und Start Backlog für schnelle Queue-Entlastung bei hoher Last."/>
          </Grid2>
          <H>Tastenkürzel</H>
          <Card
            title="Flux Shortcuts"
            desc=""
            keys={[
              'Cmd/Ctrl+F Focus Search',
              'Cmd/Ctrl+Shift+N New Note',
              'Cmd/Ctrl+Shift+C New Code',
              'Cmd/Ctrl+Shift+T New Task',
              'Cmd/Ctrl+Shift+R New Reminder',
              'Cmd/Ctrl+Shift+D Resolve Urgent',
              'Cmd/Ctrl+Shift+B Start Backlog',
              '1/2/3/4 Filter',
              '0 Filter Reset',
              'F Focus Mode Toggle',
              'Esc Reset Query/Filter',
            ]}
          />
        </Acc>

        {/* ═══ DEVTOOLS ═══ */}
        <Acc title="DevTools — Builder & Calculator" icon={Wrench} open={open.devtools} onToggle={() => tog('devtools')} badge="NEU">
          <H>Visual Builder</H>
          <P>Erstelle CSS-Elemente visuell und kopiere den generierten Code direkt in dein Projekt.</P>
          <Grid2>
            <Card icon="📐" title="Size" desc="Breite, Höhe, Einheiten (px/rem/%/vw/vh), Display-Typ, Overflow."/>
            <Card icon="↔" title="Spacing" desc="Padding X/Y und Margin X/Y per Slider."/>
            <Card icon="⬜" title="Border" desc="Radius, Breite, Farbe, Stil (solid/dashed/dotted)."/>
            <Card icon="🎨" title="Background" desc="Typen: glass, solid, gradient, radial, gradient-opacity. Farben + Winkel."/>
            <Card icon="🌑" title="Shadow" desc="X/Y Offset, Blur, Spread, Farbe, Inset-Toggle."/>
            <Card icon="✨" title="Glow" desc="On/Off, Farbe, Blur, Spread, Opacity."/>
            <Card icon="🌫" title="Blur" desc="Backdrop-Blur und CSS Filter-Blur separat."/>
            <Card icon="🔤" title="Typography" desc="Font-Size, Weight, Line-Height, Letter-Spacing, Farbe, Align."/>
          </Grid2>
          <P>Code-Output wechseln zwischen <strong>CSS</strong> (vollständige .element {'{}'} Regel) und <strong>Tailwind</strong> (className-String). Copy-Button oben rechts.</P>
          <H>UI Calculator — Funktionskategorien</H>
          {[
            { cat: 'Spacing', fns: 'px→rem, rem→px, 8pt Grid, 4pt Grid' },
            { cat: 'Color', fns: 'Hex→RGB, Hex→RGBA mit Alpha, WCAG Kontrastverhältnis, Relative Luminanz' },
            { cat: 'Typography', fns: 'Modular Type Scale, Ideale Line-Height, Chars-per-Line, Letter-Spacing in em' },
            { cat: 'Layout', fns: 'Goldener Schnitt, CSS aspect-ratio Fraction, Viewport %, fluid clamp()' },
            { cat: 'Animation', fns: 'FPS→Frame-Duration ms, cubic-bezier Generator, Spring Stiffness→Duration, Stagger Delay Total' },
          ].map(row => (
            <div key={row.cat} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, width: 90, flexShrink: 0 }}>{row.cat}</span>
              <span style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.5 }}>{row.fns}</span>
            </div>
          ))}
        </Acc>

        {/* ═══ SETTINGS ═══ */}
        <Acc title="Settings — Theme Editor" icon={Settings} open={open.settings} onToggle={() => tog('settings')}>
          <P>Der Settings-View hat 7 Tabs. Alle Änderungen sind live — kein Speichern nötig. Der Live-Preview oben zeigt Änderungen in Echtzeit.</P>
          <Grid2>
            <Card icon="🎨" title="Theme" desc="Presets (13 Themes), Dark/Light Mode, Farb-Picker für Accent/Accent2/Background, Global Font wählen."/>
            <Card icon="🪟" title="Glass" desc="6 Glass-Modi: default, frosted, crystal, neon, matte, mirror. Blur, Saturation, Border-Opacity, Tint-Farbe, Noise-Overlay."/>
            <Card icon="✨" title="Glow" desc="Glow-Mode, Gradient-Farben 1+2, Intensity, Radius, Spread, Angle, Blend-Mode, Animation."/>
            <Card icon="🖼" title="Background" desc="App-Hintergrund (6 Modi), Panel-Muster (8 Typen), Vignette, Scanlines, Overlay-Darkness."/>
            <Card icon="📐" title="Layout" desc="Sidebar-Breite, Panel-Radius, Shadow-Depth, Sidebar-Position, Font-Size, Spacing, Compact-Mode."/>
            <Card icon="🎬" title="Motion" desc="Animation-Speed, Entry-Stil (5 Typen), 10 Toggle-Optionen, Reduce-Motion für Barrierefreiheit."/>
            <Card icon="💻" title="Editor" desc="Autosave, Word-Wrap, Zeilennummern, Tab-Size, Notes-Font, High-Contrast, Panel-Density."/>
          </Grid2>
          <H>Theme speichern / exportieren</H>
          <P>Unten links: "Save Theme" speichert in localStorage. "Export" lädt eine JSON-Datei herunter. "Import" lädt eine JSON-Datei und wendet sie direkt an.</P>
        </Acc>

        {/* ═══ SHORTCUTS ═══ */}
        <Acc title="Tastenkürzel" icon={Keyboard} open={open.shortcuts} onToggle={() => tog('shortcuts')}>
          <Grid2>
            <Card title="Global / Spotlight" desc="" keys={['Shift×2 Spotlight Toggle','Cmd/Ctrl+K Spotlight Open','Esc Spotlight Close']}/>
            <Card title="Dashboard" desc="Keine globalen Tastenkürzel; Fokus auf Drag/Drop und Inline-Controls."/>
            <Card title="Notes" desc="" keys={['Cmd/Ctrl+S Save','Cmd/Ctrl+B Bold','Cmd/Ctrl+I Italic','Cmd/Ctrl+K Link','Cmd/Ctrl+Z Undo','Cmd/Ctrl+Y Redo','Tab Indent']}/>
            <Card title="Code" desc="" keys={['Cmd/Ctrl+Enter Run','Cmd/Ctrl+S Save','Tab Indent (Textarea)','Enter Create File (Modal)']}/>
            <Card title="Tasks" desc="" keys={['Enter Add Tag','Enter Add Subtask']}/>
            <Card title="Reminders" desc="Keine globalen Tastenkürzel; Fokus auf Quick-Presets und Kartenaktionen."/>
            <Card title="Canvas" desc="" keys={['Space Hold Pan Mode','Delete Node','Esc Reset Selection','Cmd/Ctrl+0 Reset View','+ / = Zoom In','- Zoom Out','G Grid Toggle','F Focus/Fit','P Project Panel','Cmd/Ctrl+M Magic Builder']}/>
            <Card title="Files" desc="" keys={['Enter Save Workspace (Modal)']}/>
            <Card title="Flux" desc="" keys={['Cmd/Ctrl+F Focus Search','Cmd/Ctrl+Shift+N/C/T/R Quick Create','Cmd/Ctrl+Shift+D Resolve Urgent','Cmd/Ctrl+Shift+B Start Backlog','1/2/3/4 Filter','0 Reset Filter','F Focus Mode','Esc Reset Query']}/>
            <Card title="DevTools" desc="" keys={['Tab Indent (Builder Textarea)','Enter Confirm Rename','Esc Cancel Rename']}/>
            <Card title="Settings" desc="" keys={['Enter Commit Hex Color']}/>
            <Card title="Info" desc="Keine globalen Tastenkürzel; dient als Referenz- und Release-Übersicht."/>
            <Card title="Terminal" desc="" keys={['Enter Execute','Tab Autocomplete','ArrowUp/ArrowDown History','Esc Close Terminal','Ctrl+L/Ctrl+K Clear']}/>
          </Grid2>
        </Acc>

        {/* ═══ TERMINAL ═══ */}
        <Acc title="Terminal" icon={Terminal} open={open.terminal} onToggle={() => tog('terminal')}>
          <P>Das integrierte Terminal öffnet sich am unteren Rand und ist mit Spotlight/Canvas verbunden. Besonders nützlich: schnelle Navigation, Makros und direkte Canvas-Kommandos.</P>
          <H>Workflow</H>
          <Grid2>
            <Card icon="⚡" title="Quick Commands" desc="Pills für häufige Befehle, Tab-Autocomplete und Verlauf mit ↑/↓."/>
            <Card icon="🧩" title="Macros" desc="Abläufe aufnehmen, speichern und wiederholen (inkl. Schutz vor Rekursion)." />
            <Card icon="↩️" title="Undo/Redo" desc="Terminal-Command-Timeline mit schneller Wiederholung zuletzt genutzter Flows." />
            <Card icon="🔎" title="Spotlight Bridge" desc="Mit `spotlight <query>` direkt Command Palette mit Vorfilter öffnen." />
          </Grid2>
          <H>Befehle</H>
          <Code>{`help              — Alle Befehle anzeigen
views | ls        — Alle Views anzeigen
goto <view>       — Direkt zu einer View springen
new note [Titel]  — Neue Notiz erstellen
new task [Titel]  — Neuen Task erstellen
new reminder [T]  — Erinnerung in +1h erstellen
search [query]    — Suche über Notes/Tasks/Code/Reminders
spotlight [query] — Spotlight öffnen
canvas list       — Canvases anzeigen
canvas new [name] — Neues Canvas erstellen
canvas template roadmap [name] — Roadmap Template bauen
canvas template ai [name]      — AI Project Template bauen
canvas focus      — Canvas fit-view triggern
theme [name]      — Theme wechseln (z.B. theme Cyberpunk)
profile [focus|cinematic|compact|default]
macro start <name> / macro stop / macro run <name>
undo | redo       — Command-Verlauf nutzen
clear             — Terminal leeren`}
          </Code>
        </Acc>

        <div style={{ height: 40 }}/>
      </div>
    </div>
  )
}
