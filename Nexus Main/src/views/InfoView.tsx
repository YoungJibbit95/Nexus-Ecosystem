import React, { useMemo, useState } from "react";
import {
  BookOpen,
  FileText,
  GitBranch,
  Keyboard,
  Layers,
  Monitor,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
} from "lucide-react";
import { useTheme } from "../store/themeStore";
import {
  NEXUS_TEMPLATE_PACKS,
  NEXUS_TEMPLATE_PACK_CATEGORIES,
  buildNexusTemplatePackMarkdown,
  type NexusTemplatePackCategory,
  type NexusTemplatePackItem,
} from "../app/nexusTemplatePacks";
import {
  Acc,
  Badge,
  Card,
  Code,
  Grid2,
  H,
  P,
  hexRgb,
} from "./info/InfoPrimitives";

type ViewDoc = {
  emoji: string;
  icon: string;
  title: string;
  purpose: string;
  mainUse: string[];
  features: string[];
  shortcuts?: string[];
  releaseCheck: string;
  guideTitle: string;
  guideIntro: string;
  dailyFlow: string[];
  qualityBar: string;
  proTip: string;
  wikiTopics: string[];
};

const VIEW_DOCS: ViewDoc[] = [
  {
    emoji: "🏠",
    icon: "DB",
    title: "Dashboard",
    purpose:
      "Der ruhige Startpunkt: Heute lesen, weiterarbeiten und neue Gedanken schnell parken.",
    mainUse: [
      "Today Layer checken",
      "Continue Lane öffnen",
      "Quick Capture nutzen",
      "Layout Editor starten",
    ],
    features: [
      "Runtime/API Health",
      "Widget Grid",
      "Drag/drop Swap",
      "Hidden Widgets Tray",
      "mobile angepasste Cards",
    ],
    shortcuts: ["Ctrl+1", "Edit Layout", "Quick Capture"],
    releaseCheck:
      "Dashboard muss ohne Boot-Loop laden und sein Layout nach Reload behalten.",
    guideTitle: "Dashboard Guide",
    guideIntro:
      "Starte hier, wenn du wissen willst, was heute wirklich wichtig ist. Das Dashboard soll nicht voll wirken, sondern entscheiden helfen.",
    dailyFlow: [
      "Erst den Today Layer lesen: Fälliges, Blocker und offene Arbeit.",
      "Dann die Continue Lane nutzen, um ohne Suchen in den letzten Kontext zurückzukommen.",
      "Neue Gedanken über Quick Capture aufnehmen, statt sofort die View zu wechseln.",
      "Layout nur dann bearbeiten, wenn ein Widget gerade dauerhaft stört oder fehlt.",
    ],
    qualityBar:
      "Ein gutes Dashboard fühlt sich nach weniger Chaos an: klare Priorität, kein Widget-Rauschen, keine verlorene Arbeit nach Reload.",
    proTip:
      "Wenn du release-testest, ziehe ein Widget hoch/runter, lade neu und prüfe, ob Position und Sichtbarkeit gleich bleiben.",
    wikiTopics: [
      "main-dashboard-guide",
      "Today Layer",
      "Quick Capture",
      "Dashboard Layout v2",
    ],
  },
  {
    emoji: "📝",
    icon: "NO",
    title: "Notes",
    purpose:
      "Die interne Wissensbasis für Markdown, Guides, Backlinks, Emojis und Magic Blocks.",
    mainUse: [
      "Note erstellen",
      "Guide lesen",
      "Markdown schreiben",
      "Preview/Split nutzen",
      "Tags und Pins pflegen",
    ],
    features: [
      "Command Strip",
      "Advanced Blocks Menu",
      "Emoji Picker",
      "Import/Export",
      "Autosave/Manual Save",
    ],
    shortcuts: ["Ctrl+P", "Ctrl+F", "Ctrl+S", "Ctrl+B", "Ctrl+I", "Ctrl+K"],
    releaseCheck:
      "Editor, Blocks-Menü und Emoji Picker dürfen keine Klickziele verdecken.",
    guideTitle: "Notes Guide",
    guideIntro:
      "Notes ist der Ort für echte Arbeitsnotizen, nicht nur Demo-Markdown. Schreibe roh, strukturiere später, und nutze Magic Blocks nur dort, wo sie Lesbarkeit bringen.",
    dailyFlow: [
      "Links eine Note wählen oder mit dem New-Button eine neue Notiz anlegen.",
      "Im Editor erst den Inhalt schreiben, dann mit Tags, Pins und Überschriften aufräumen.",
      "Split nutzen, wenn du Tabellen, Callouts oder Magic Blocks prüfst.",
      "Emoji-Menü und Blocks-Menü bewusst als kleine Helfer nutzen, nicht als Platzfresser.",
    ],
    qualityBar:
      "Notes ist releasebereit, wenn Sidebar, Editor, Toolbar, Blocks-Menü und Emoji Picker gleichzeitig bedienbar bleiben.",
    proTip:
      "Für Doku-Notizen funktionieren kurze H2s plus ein Callout pro Abschnitt deutlich besser als lange Textwände.",
    wikiTopics: [
      "main-notes-guide",
      "main-notes-markdown-reference",
      "main-notes-magic-menu-guide",
      "Wikilinks",
    ],
  },
  {
    emoji: "✅",
    icon: "TA",
    title: "Tasks",
    purpose:
      "Der Arbeitsmodus für Board, Focus, Deadlines, Prioritäten, Blocker und Batch Triage.",
    mainUse: [
      "Tasks erstellen",
      "Status bewegen",
      "Focus Mode nutzen",
      "Batch Mode für Triage verwenden",
    ],
    features: [
      "To Do/Doing/Done Board",
      "Due Soon",
      "High Priority",
      "Blocked",
      "Linked Notes",
      "Subtasks",
    ],
    shortcuts: ["1..5", "B", "H", "N", "T", "E", "G"],
    releaseCheck:
      "Task-Karten müssen ruhig, klickstabil und ohne innere Fremd-Rechtecke wirken.",
    guideTitle: "Tasks Guide",
    guideIntro:
      "Tasks soll dir Arbeit sortieren, nicht mehr Arbeit machen. Die View ist für klare nächste Schritte gebaut: was ist offen, was läuft, was blockiert?",
    dailyFlow: [
      "Neue Aufgabe kurz formulieren, später Details ergänzen.",
      "Status bewusst wechseln: To Do, Doing und Done sind Produktentscheidungen.",
      "Blocker und Priorität nutzen, wenn eine Aufgabe sonst in der Liste versinkt.",
      "Focus Mode öffnen, wenn ein einzelner Task gerade wichtiger ist als das Board.",
    ],
    qualityBar:
      "Tasks ist gut, wenn du eine Aufgabe auch in voller Karte noch sicher anklicken, verschieben und bearbeiten kannst.",
    proTip:
      "Bei großen Boards lieber erst filtern und dann triagieren; Batch-Mode ist für Ordnung, nicht für blindes Wegklicken.",
    wikiTopics: [
      "main-tasks-guide",
      "Task Board",
      "Flux Triage",
      "Linked Notes",
    ],
  },
  {
    emoji: "⏰",
    icon: "RE",
    title: "Reminders",
    purpose:
      "Zeitbasierte Follow-ups mit Wiederholung, Snooze und Kontext zu Tasks oder Notes.",
    mainUse: [
      "Reminder planen",
      "Overdue triagieren",
      "Snooze setzen",
      "Task/Note verlinken",
    ],
    features: [
      "daily/weekly/monthly Repeat",
      "Snooze all overdue",
      "Notification Health",
      "Done Cleanup",
    ],
    shortcuts: ["Ctrl+4", "Snooze", "Health"],
    releaseCheck:
      "Overdue- und Fallback-Zustände müssen auch ohne Notification Permission lesbar bleiben.",
    guideTitle: "Reminders Guide",
    guideIntro:
      "Reminders ist dein kleiner Vertrag mit der Zukunft. Wichtig ist nicht die Anzahl der Erinnerungen, sondern ob sie beim Wiederauftauchen noch verständlich sind.",
    dailyFlow: [
      "Reminder mit konkretem Verb schreiben: anrufen, prüfen, deployen, bezahlen.",
      "Bei Overdue erst entscheiden: erledigen, snoozen oder in Task umwandeln.",
      "Wiederholungen nur für echte Routinen nutzen.",
      "Notification Health prüfen, wenn Erinnerungen nicht sichtbar auftauchen.",
    ],
    qualityBar:
      "Die View passt, wenn Overdue nicht bedrohlich wirkt, sondern schnell sortierbar bleibt.",
    proTip:
      "Ein Reminder ohne Kontext altert schlecht. Linke wichtige Reminder lieber mit Task oder Note.",
    wikiTopics: [
      "main-reminders-guide",
      "Reminder Health",
      "Snooze",
      "Repeat Rules",
    ],
  },
  {
    emoji: "📁",
    icon: "FI",
    title: "Files",
    purpose:
      "Workspace-Hub für lokale Inhalte, Exporte, Imports und Projektzuordnung.",
    mainUse: [
      "Workspace setzen",
      "Items durchsuchen",
      "Import/Export nutzen",
      "Dateien zuordnen",
    ],
    features: [
      "Recent",
      "Pinned",
      "Unassigned",
      "Workspace Views",
      "Context Menus",
      "Sync Status",
    ],
    shortcuts: ["Ctrl+5", "Import", "Export"],
    releaseCheck:
      "Downloads und Exports müssen eindeutig benannt sein und dürfen keine lokalen Secrets enthalten.",
    guideTitle: "Files Guide",
    guideIntro:
      "Files ist die Brücke zwischen Nexus und deinem echten Projektordner. Die View soll helfen, Dinge zu finden und sauber zuzuordnen.",
    dailyFlow: [
      "Zuerst Workspace setzen, damit Imports und Exports nicht irgendwo landen.",
      "Recent und Pinned nutzen, um aktive Dateien nicht jedes Mal neu zu suchen.",
      "Unassigned regelmäßig aufräumen, wenn Dateien keinem Projektkontext zugeordnet sind.",
      "Vor Export kurz prüfen, ob Dateiname und Ziel wirklich stimmen.",
    ],
    qualityBar:
      "Files ist releasebereit, wenn lokale Aktionen klar benannt sind und der Nutzer nie raten muss, was gerade mit einer Datei passiert.",
    proTip:
      "Für Website-Downloads gehören Installer in einen klaren Release-Ordner, nicht in zufällige Workspace-Exports.",
    wikiTopics: [
      "main-files-guide",
      "Workspace Sync",
      "Downloads",
      "Import Export",
    ],
  },
  {
    emoji: "🧩",
    icon: "CV",
    title: "Canvas",
    purpose:
      "Ein Obsidian-naher Knowledge Graph mit Nodes, Edges, Wiki-Links, Jump Search und Templates.",
    mainUse: [
      "Node anlegen",
      "Nodes verbinden",
      "Ctrl+P Jump Search",
      "Magic Builder",
      "Focus/Fit View",
    ],
    features: [
      "Pan/Zoom/Grid",
      "Project Panel",
      "Outline",
      "Relations",
      "Auto Layout",
      "JSON/Markdown Export",
    ],
    shortcuts: ["Ctrl+P", "Ctrl+M", "Ctrl+0", "F", "P", "G", "+", "-"],
    releaseCheck:
      "Pan, Zoom und Drag dürfen nicht mit Buttons kollidieren; Double-click Add nur auf leerer Fläche.",
    guideTitle: "Canvas Guide",
    guideIntro:
      "Canvas ist für Denken mit Raum. Nutze es für Beziehungen, Entscheidungen und Projektbilder, die in einer linearen Note schnell eng werden.",
    dailyFlow: [
      "Mit einem zentralen Node starten, nicht mit zwanzig kleinen Knoten.",
      "Wiki-Links nutzen, wenn Canvas und Notes denselben Begriff teilen sollen.",
      "Jump Search verwenden, sobald der Canvas groß wird.",
      "Auto Layout nur als Aufräumhilfe einsetzen, danach bewusst nachjustieren.",
    ],
    qualityBar:
      "Canvas ist gut, wenn du zoomen, ziehen, verbinden und Buttons anklicken kannst, ohne dass Elemente unter dem Cursor wegrutschen.",
    proTip:
      "Für Release-Smokes immer leerer Canvas, großer Canvas und verbundenes Node-Set testen.",
    wikiTopics: [
      "main-canvas-guide",
      "main-canvas-magic-builder-guide",
      "Canvas Magic",
      "Wikilinks",
    ],
  },
  {
    emoji: "⚡",
    icon: "FL",
    title: "Flux",
    purpose:
      "Der Ops- und Engpass-Layer über Tasks, Reminders, Blocker und aktive Arbeit.",
    mainUse: [
      "Queue Slices filtern",
      "Bottlenecks öffnen",
      "Backlog starten",
      "Reminder triagieren",
    ],
    features: [
      "Ops Score",
      "Overdue/Due Soon",
      "High Priority",
      "Focus",
      "Reminder Triage",
      "Task Backlog",
    ],
    shortcuts: ["Ctrl+F", "Ctrl+Shift+B", "Ctrl+Shift+D", "Ctrl+Shift+R"],
    releaseCheck:
      "Flux darf laufende Tasks nicht heimlich erledigen; Statuswechsel müssen bewusst bleiben.",
    guideTitle: "Flux Guide",
    guideIntro:
      "Flux ist die nüchterne Sicht auf Druck im System. Es soll dir Engpässe zeigen, ohne dir Entscheidungen abzunehmen, die du bewusst treffen musst.",
    dailyFlow: [
      "Queue nach überfällig, blockiert oder hohe Priorität filtern.",
      "Bottlenecks öffnen und nur echte Ursachen bearbeiten.",
      "Urgent Flow nutzen, um To-do nach Doing zu ziehen oder laufende Arbeit zur Review zu öffnen.",
      "Reminder-Triage machen, bevor Overdue zur Dauerwolke wird.",
    ],
    qualityBar:
      "Flux ist sicher, wenn jede Automatik nachvollziehbar bleibt und nichts still auf Done springt.",
    proTip:
      "Flux ist kein Ersatz für Planung; es zeigt nur, wo Planung gerade brennt.",
    wikiTopics: [
      "main-flux-guide",
      "Urgent Flow",
      "Reminder Triage",
      "Ops Score",
    ],
  },
  {
    emoji: "💻",
    icon: "CO",
    title: "Code",
    purpose:
      "Embedded Scratch-/Code-Editor für Snippets, kleine Projekte, Run/Preview und Output-History.",
    mainUse: [
      "Datei öffnen",
      "Code schreiben",
      "Run/Preview starten",
      "Output prüfen",
    ],
    features: [
      "Monaco Editor",
      "Quick Open",
      "JS/TS/Python Beispiele",
      "Output History",
      "Code App Tier-Gating",
    ],
    shortcuts: ["Ctrl+P", "Ctrl+Enter", "Ctrl+S"],
    releaseCheck:
      "Filesystem- und Run-Flows müssen klar begrenzt und auditierbar bleiben.",
    guideTitle: "Code Guide",
    guideIntro:
      "Code in Nexus Main ist für schnelle technische Skizzen und kleine Ausführungen gedacht. Für große Arbeit bleibt Nexus Code die stärkere IDE-Surface.",
    dailyFlow: [
      "Snippet oder kleine Datei öffnen, bevor du den großen Editor brauchst.",
      "Run/Preview bewusst starten und Output prüfen.",
      "Output-History nutzen, wenn ein Experiment mehrere Schritte hat.",
      "Bei Projektarbeit in Nexus Code wechseln.",
    ],
    qualityBar:
      "Code ist releaseklar, wenn Run, Save, Output und Tier-Gating ohne versteckte Nebenwirkungen funktionieren.",
    proTip:
      "Nenne Scratch-Dateien so, dass du sie später wiedererkennst; `test2` rächt sich schneller als man denkt.",
    wikiTopics: [
      "main-code-guide",
      "Nexus Code",
      "Code App Tier",
      "Output History",
    ],
  },
  {
    emoji: "🎛️",
    icon: "SE",
    title: "Settings",
    purpose:
      "Kontrollzentrum für Theme, Glow, Panel/App Backgrounds, Motion, Accessibility, Layout und Workspace.",
    mainUse: [
      "Theme wählen",
      "Panel Texture prüfen",
      "Motion Profil setzen",
      "Workspace Wartung nutzen",
    ],
    features: [
      "Theme Import/Export",
      "Panel Preview Cards",
      "Glow Lab",
      "App Background",
      "Reduced Motion",
      "Danger-safe Reset",
    ],
    shortcuts: ["Ctrl+9", "Advanced", "Experimental"],
    releaseCheck:
      "Jede sichtbare Option braucht reale Wirkung oder klaren Schutz/Disabled-Kontext.",
    guideTitle: "Settings Guide",
    guideIntro:
      "Settings ist kein Spielzeugkasten ohne Boden. Die wichtigsten Optionen sind vorne, riskantere Engine-Regler bleiben bewusst hinter Advanced und Experimental.",
    dailyFlow: [
      "Erst Experience Preset wählen: Focus, Balanced, Studio, Performance oder Cinematic.",
      "Dann Theme Library nutzen und nur bei Bedarf Farben selbst anpassen.",
      "Panel Texture mit echter Vorschau prüfen, nicht blind durchschalten.",
      "Motion an Hardware und persönliche Ruhe anpassen.",
    ],
    qualityBar:
      "Settings ist releasefertig, wenn Import/Export sicher ist und jede Option erklärt, was sie tut.",
    proTip:
      "Für Screenshots eignet sich ein ruhiges Theme plus Mist/Solid Panel besser als maximaler Glow.",
    wikiTopics: [
      "main-settings-overview",
      "main-settings-theme-glass",
      "main-settings-glow-background",
      "Theme Library",
    ],
  },
  {
    emoji: "📚",
    icon: "IN",
    title: "Info",
    purpose:
      "Diese Dokumentations- und Referenzview für App, Views, Releasevertrag und Smoke-Check.",
    mainUse: [
      "Feature-Überblick lesen",
      "View-Guides nachschlagen",
      "Shortcuts prüfen",
      "Release-Checks verfolgen",
    ],
    features: [
      "App Guide",
      "View Guide Tabs",
      "Architecture",
      "Shortcuts",
      "Smoke Matrix Summary",
    ],
    shortcuts: ["Ctrl+0", "Info"],
    releaseCheck:
      "InfoView muss den aktuellen Stand abbilden und darf keine alten v5-Versprechen zeigen.",
    guideTitle: "Info Guide",
    guideIntro:
      "InfoView ist das Handbuch direkt in der App. Wenn du vergisst, wie eine View gedacht ist, sollst du nicht im Repo suchen müssen.",
    dailyFlow: [
      "Oben den Überblick lesen, wenn du Nexus jemandem erklärst.",
      "View-Guide-Tabs nutzen, wenn du eine konkrete Ansicht testen oder verstehen willst.",
      "Release- und Smoke-Check vor Builds oder Deploys öffnen.",
      "Shortcuts nachschlagen, wenn du schneller durch die App willst.",
    ],
    qualityBar:
      "InfoView ist gut, wenn sie wie echte Produktdoku klingt und denselben Stand wie Wiki, Website und Notes beschreibt.",
    proTip:
      "Beim Release immer zuerst nach v5, Platzhaltern und übertriebenen Produktversprechen suchen.",
    wikiTopics: [
      "main-info-view-guide",
      "main-infoview-product-brain",
      "InfoView",
      "Release Docs",
    ],
  },
  {
    emoji: "🛠️",
    icon: "DV",
    title: "DevTools",
    purpose:
      "Developer-/Admin-nahe Diagnose, Builder, Recipes, Export-Hilfen und Release-Health-Arbeit.",
    mainUse: [
      "Diagnostics lesen",
      "Artifacts exportieren",
      "UI Builder testen",
      "Logs ohne Secrets prüfen",
    ],
    features: [
      "Builder",
      "Calculator",
      "Recipes",
      "Visual Diagnostics",
      "Export Panels",
      "Feature Catalog Kontext",
    ],
    shortcuts: ["Dev only", "Admin/Debug"],
    releaseCheck:
      "In Release nicht prominent für normale User; keine Secrets in UI, Logs oder Exporten.",
    guideTitle: "DevTools Guide",
    guideIntro:
      "DevTools ist für Arbeit am Produkt, nicht für normale Nutzerführung. Die View darf stark sein, muss aber sauber gegated und verständlich bleiben.",
    dailyFlow: [
      "Diagnostics und Builder nur öffnen, wenn du wirklich am System arbeitest.",
      "Exports prüfen, bevor du sie weiterverwendest.",
      "Logs immer auf Secrets und private Pfade kontrollieren.",
      "Für normale Nutzer DevTools nicht als Feature verkaufen.",
    ],
    qualityBar:
      "DevTools ist releasefähig, wenn Admin-/Debug-Kontext sichtbar bleibt und keine sensiblen Daten austreten.",
    proTip:
      "DevTools darf intern mächtig sein; öffentlich sollte es leise und kontrolliert bleiben.",
    wikiTopics: [
      "main-devtools-guide",
      "Visual Builder",
      "Feature Catalog",
      "Diagnostics",
    ],
  },
  {
    emoji: "📈",
    icon: "RD",
    title: "Render Diagnostics",
    purpose:
      "Diagnosefläche für Render-, Motion- und Performance-Zustände im Entwicklungsmodus.",
    mainUse: [
      "Frame/Render Signale prüfen",
      "Motion Budget bewerten",
      "UI Regressions debuggen",
    ],
    features: [
      "Render Surface Budget",
      "Motion Runtime",
      "Diagnostics Button",
      "Support Kontext",
    ],
    shortcuts: ["Diagnostics"],
    releaseCheck:
      "Nur gated sichtbar und für Support nutzbar, nicht als normale Produktview verkaufen.",
    guideTitle: "Render Diagnostics Guide",
    guideIntro:
      "Diese View ist der Blick unter die Motorhaube. Sie hilft, UI-Gefühl mit echten Render- und Motion-Signalen abzugleichen.",
    dailyFlow: [
      "Diagnostics öffnen, wenn Animation, Blur oder Toolbar-Verhalten komisch wirkt.",
      "Budget, Surface-Klassen und Degradation-Level prüfen.",
      "Auffällige Invariants notieren und mit konkreten Views reproduzieren.",
      "Nach UI-Änderungen kurz prüfen, ob Motion/Render nicht überdreht.",
    ],
    qualityBar:
      "Diagnostics ist nützlich, wenn es Ursachen zeigt, ohne normale Nutzer mit Entwicklungsrauschen zu belasten.",
    proTip:
      "Wenn etwas 'grainy' oder hektisch wirkt, hier zuerst Motion/Surface-Degradation gegenprüfen.",
    wikiTopics: [
      "main-render-diagnostics-guide",
      "Render Pipeline",
      "Motion Engine",
      "Surface Classes",
    ],
  },
];

const MAGIC_BLOCKS = [
  "nexus-list",
  "nexus-checklist",
  "nexus-progress",
  "nexus-timeline",
  "nexus-kanban",
  "nexus-metrics",
  "nexus-steps",
  "nexus-grid",
  "nexus-card",
  "nexus-alert",
  "nexus-callout",
  "nexus-quadrant",
];

function PillButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const t = useTheme();
  const rgb = hexRgb(t.accent);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        border: active
          ? `1px solid rgba(${rgb},0.42)`
          : "1px solid rgba(255,255,255,0.12)",
        background: active ? `rgba(${rgb},0.16)` : "rgba(255,255,255,0.04)",
        color: active ? t.accent : "inherit",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 820,
        padding: "7px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

async function writeTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === "undefined") return false;

  const node = document.createElement("textarea");
  node.value = text;
  node.setAttribute("readonly", "true");
  node.style.position = "fixed";
  node.style.left = "-9999px";
  document.body.appendChild(node);
  node.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(node);
  return copied;
}

function TemplatePackCard({
  pack,
  accent,
  copied,
  onCopy,
}: {
  pack: NexusTemplatePackItem;
  accent: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const accentRgb = hexRgb(accent);
  const tierLabel = pack.tier.replace("_", " ").toUpperCase();

  return (
    <div
      style={{
        minHeight: 260,
        borderRadius: 16,
        border: `1px solid rgba(${accentRgb},0.26)`,
        background: `radial-gradient(420px circle at 0% 0%, rgba(${accentRgb},0.14), transparent 58%), linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02))`,
        boxShadow: `0 18px 42px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.06)`,
        padding: 15,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: accent, marginBottom: 3 }}>
            {pack.title}
          </div>
          <div style={{ fontSize: 11, opacity: 0.62 }}>
            {pack.targetView} starter kit
          </div>
        </div>
        <Badge label={tierLabel} color={accent} />
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.58, opacity: 0.76 }}>{pack.summary}</div>
      <div
        style={{
          padding: "9px 10px",
          borderRadius: 12,
          background: `rgba(${accentRgb},0.08)`,
          border: `1px solid rgba(${accentRgb},0.16)`,
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: accent }}>Best for:</strong> {pack.bestFor}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {pack.tags.map((tag) => (
          <span
            key={tag}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.045)",
              padding: "3px 7px",
              fontSize: 10,
              opacity: 0.78,
            }}
          >
            #{tag}
          </span>
        ))}
      </div>
      <div
        style={{
          borderRadius: 12,
          background: "rgba(0,0,0,0.22)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "9px 10px",
          fontFamily: "'Fira Code', monospace",
          fontSize: 10.5,
          lineHeight: 1.55,
          color: `rgba(${accentRgb},0.92)`,
          whiteSpace: "pre-wrap",
        }}
      >
        {pack.payloadPreview.slice(0, 5).join("\n")}
      </div>
      <button
        type="button"
        onClick={onCopy}
        style={{
          marginTop: "auto",
          borderRadius: 999,
          border: `1px solid rgba(${accentRgb},0.34)`,
          background: copied ? `rgba(${hexRgb("#30d158")},0.16)` : `rgba(${accentRgb},0.13)`,
          color: copied ? "#30d158" : accent,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 850,
          padding: "8px 10px",
          boxShadow: copied ? "none" : `0 0 28px rgba(${accentRgb},0.12)`,
        }}
      >
        {copied ? "Copied Markdown" : "Copy pack Markdown"}
      </button>
      <div style={{ fontSize: 10, opacity: 0.48 }}>
        Quick start: {pack.quickStart[0]}
      </div>
    </div>
  );
}

export function InfoView({
  onOpenWalkthrough,
}: { onOpenWalkthrough?: () => void } = {}) {
  const t = useTheme();
  const rgb = hexRgb(t.accent);
  const [activeGuide, setActiveGuide] = useState(VIEW_DOCS[0].title);
  const [activeTemplateCategory, setActiveTemplateCategory] =
    useState<NexusTemplatePackCategory>("notes");
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({
    about: true,
    docs: true,
    views: true,
    templates: true,
    notes: true,
    accounts: true,
    settings: false,
    architecture: false,
    release: false,
    shortcuts: false,
    changelog: true,
  });

  const viewCount = VIEW_DOCS.length;
  const activeView =
    VIEW_DOCS.find((view) => view.title === activeGuide) ?? VIEW_DOCS[0];
  const activeTemplateCategoryMeta =
    NEXUS_TEMPLATE_PACK_CATEGORIES.find((category) => category.id === activeTemplateCategory) ??
    NEXUS_TEMPLATE_PACK_CATEGORIES[0];
  const visibleTemplatePacks = useMemo(
    () => NEXUS_TEMPLATE_PACKS.filter((pack) => pack.category === activeTemplateCategory),
    [activeTemplateCategory],
  );
  const tog = (key: string) =>
    setOpen((state) => ({ ...state, [key]: !state[key] }));
  const copyTemplatePack = async (pack: NexusTemplatePackItem) => {
    const copied = await writeTextToClipboard(buildNexusTemplatePackMarkdown(pack));
    if (!copied) return;
    setCopiedTemplateId(pack.id);
    window.setTimeout(() => setCopiedTemplateId(null), 1600);
  };
  const viewDocsText = useMemo(
    () =>
      VIEW_DOCS.map(
        (view) =>
          `${view.emoji} ${view.title}: ${view.purpose}\nFlow: ${view.dailyFlow.join(" -> ")}\nFeatures: ${view.features.join(", ")}\nRelease: ${view.releaseCheck}`,
      ).join("\n\n"),
    [],
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "16px 18px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 16,
            padding: "22px 24px",
            borderRadius: 20,
            background: `radial-gradient(560px circle at 8% 0%, rgba(${rgb},0.2), transparent 60%), radial-gradient(480px circle at 92% 0%, rgba(${hexRgb(t.accent2)},0.16), transparent 62%), linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))`,
            border: `1px solid rgba(${rgb},0.24)`,
            boxShadow: `0 18px 54px rgba(0,0,0,0.18), 0 0 60px rgba(${rgb},0.08)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                fontSize: 31,
                fontWeight: 950,
                marginBottom: 5,
                background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: -1.2,
              }}
            >
              📚 Nexus v6 Handbuch
            </div>
            <div style={{ fontSize: 12, opacity: 0.68, marginBottom: 12 }}>
              Menschlich geschriebene App-Doku · eigene Guides pro View ·
              API-connected Bootflow · 8. Mai 2026
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Badge label={`🧭 ${viewCount} View-Guides`} color={t.accent} />
              <Badge label="🔐 Hosted API required" color="#64d2ff" />
              <Badge label="✨ v6 Release Docs" color="#30d158" />
              <Badge label="✅ Smoke-ready" color="#ff9f0a" />
            </div>
            {onOpenWalkthrough ? (
              <button
                type="button"
                onClick={onOpenWalkthrough}
                style={{
                  marginTop: 12,
                  borderRadius: 999,
                  border: `1px solid rgba(${rgb},0.32)`,
                  background: `rgba(${rgb},0.14)`,
                  color: t.accent,
                  fontSize: 11,
                  fontWeight: 850,
                  padding: "6px 11px",
                  cursor: "pointer",
                }}
              >
                🚀 Walkthrough öffnen
              </button>
            ) : null}
          </div>
        </div>

        <Acc
          title="🌌 Was ist Nexus v6?"
          icon={BookOpen}
          open={open.about}
          onToggle={() => tog("about")}
          badge="START"
        >
          <P>
            Nexus ist ein API-verbundener Workspace für Notizen, Aufgaben,
            Erinnerungen, Dateien, Canvas, Code-Skizzen und Release-Arbeit. Die
            App soll nicht wie eine Demo starten, sondern wie ein echter
            Arbeitsplatz: erst wird Catalog/Layout/Release gegen die Hosted API
            geprüft, danach öffnet sich der lokale Workspace.
          </P>
          <Grid2>
            <Card
              icon="📝"
              title="Denken"
              desc="Notes und Canvas halten Ideen, Entscheidungen, Risiken, Links und Knowledge-Graph-Strukturen zusammen."
            />
            <Card
              icon="✅"
              title="Planen"
              desc="Dashboard, Tasks und Reminders machen aus offenen Gedanken konkrete nächste Schritte."
            />
            <Card
              icon="💻"
              title="Umsetzen"
              desc="Code, Files und Terminal helfen bei Snippets, Projektdateien, Exports und schneller Navigation."
            />
            <Card
              icon="🔎"
              title="Review"
              desc="Flux, Info, DevTools und Diagnostics zeigen Engpässe, Release-Gates und technische Risiken."
            />
          </Grid2>
        </Acc>

        <Acc
          title="🧱 Gesamte App-Struktur"
          icon={Layers}
          open={open.docs}
          onToggle={() => tog("docs")}
          badge="MAP"
        >
          <P>
            Nexus v6 ist content-first gedacht: Navigation und Status helfen,
            aber die Hauptfläche bleibt der Star. Chrome, Panels und Inspector
            sollen Arbeit sichtbar machen, nicht den Platz auffressen.
          </P>
          <Grid2>
            <Card
              icon="🧭"
              title="v6 Shell"
              desc="Einheitlicher View-Frame mit Fokusmodus, kompakter Quick Navigation, optionalem Inspector und Status-Signalen."
            />
            <Card
              icon="🔄"
              title="Runtime"
              desc="createNexusRuntime verbindet API Boot, View Access, Feature Catalog, Layout Schema, Release und Capability-Kontext."
            />
            <Card
              icon="💾"
              title="Lokale Daten"
              desc="Notes, Tasks, Reminders, Code, Folders und Aktivität bleiben lokal erhalten und werden beim Start sicher gemerged."
            />
            <Card
              icon="🎨"
              title="Design-System"
              desc="Theme, Glow, Panel Background, App Background, Motion Profile, Typography und Accessibility laufen über Settings."
            />
            <Card
              icon="👤"
              title="Account"
              desc="Website-Account und Nexus-Login teilen denselben API-Kontext. Remember me speichert Token, nicht Passwort."
            />
            <Card
              icon="🚢"
              title="Release"
              desc="Build, Encoding, Ecosystem Verify, Release Gate und View-Smokes bleiben Teil des Release-Vertrags."
            />
          </Grid2>
        </Acc>

        <Acc
          title="Template Packs"
          icon={GitBranch}
          open={open.templates}
          onToggle={() => tog("templates")}
          badge={`${NEXUS_TEMPLATE_PACKS.length} PACKS`}
        >
          <P>
            Template Packs sind die neue Starter-Kit-Schicht fuer Nexus v6.
            Statt verstreuter Beispiele findest du hier saubere Startpunkte fuer
            Notes, Task Boards, Canvas Layouts, Code Snippets und Flux
            Workflows. Jeder Pack laesst sich als Markdown kopieren und in die
            passende View uebernehmen.
          </P>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {NEXUS_TEMPLATE_PACK_CATEGORIES.map((category) => {
              const count = NEXUS_TEMPLATE_PACKS.filter((pack) => pack.category === category.id).length;
              const active = activeTemplateCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveTemplateCategory(category.id)}
                  style={{
                    minHeight: 82,
                    textAlign: "left",
                    borderRadius: 15,
                    border: active
                      ? `1px solid rgba(${hexRgb(category.accent)},0.42)`
                      : "1px solid rgba(255,255,255,0.09)",
                    background: active
                      ? `linear-gradient(135deg, rgba(${hexRgb(category.accent)},0.16), rgba(255,255,255,0.035))`
                      : "rgba(255,255,255,0.035)",
                    color: "inherit",
                    cursor: "pointer",
                    padding: "11px 12px",
                    boxShadow: active ? `0 0 34px rgba(${hexRgb(category.accent)},0.14)` : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <strong style={{ color: category.accent, fontSize: 12 }}>
                      {category.label}
                    </strong>
                    <span
                      style={{
                        borderRadius: 999,
                        border: `1px solid rgba(${hexRgb(category.accent)},0.28)`,
                        background: `rgba(${hexRgb(category.accent)},0.12)`,
                        color: category.accent,
                        padding: "2px 7px",
                        fontSize: 10,
                        fontWeight: 850,
                      }}
                    >
                      {count}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, lineHeight: 1.45, opacity: 0.66 }}>
                    {category.summary}
                  </div>
                </button>
              );
            })}
          </div>
          <div
            style={{
              borderRadius: 16,
              border: `1px solid rgba(${hexRgb(activeTemplateCategoryMeta.accent)},0.2)`,
              background: `linear-gradient(135deg, rgba(${hexRgb(activeTemplateCategoryMeta.accent)},0.08), rgba(255,255,255,0.025))`,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <strong style={{ color: activeTemplateCategoryMeta.accent }}>
                {activeTemplateCategoryMeta.label}
              </strong>
              <span style={{ fontSize: 12, opacity: 0.65 }}>{activeTemplateCategoryMeta.summary}</span>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))",
              gap: 10,
              marginBottom: 12,
            }}
          >
            {visibleTemplatePacks.map((pack) => (
              <TemplatePackCard
                key={pack.id}
                pack={pack}
                accent={activeTemplateCategoryMeta.accent}
                copied={copiedTemplateId === pack.id}
                onCopy={() => void copyTemplatePack(pack)}
              />
            ))}
          </div>
          <H>Template Pack Coverage</H>
          <Code>
            {NEXUS_TEMPLATE_PACK_CATEGORIES.map((category) => {
              const packs = NEXUS_TEMPLATE_PACKS.filter((pack) => pack.category === category.id);
              return `${category.label}: ${packs.map((pack) => pack.title).join(" / ")}`;
            }).join("\n")}
          </Code>
        </Acc>

        <Acc
          title="🧭 Eigene Guide-Tabs für jede View"
          icon={Monitor}
          open={open.views}
          onToggle={() => tog("views")}
          badge="VIEW GUIDES"
        >
          <P>
            Jede View hat jetzt einen eigenen Guide-Tab mit Bedienfolge,
            Qualitätsgrenze, Release-Check und passenden Wiki-Themen. Die Karten
            darunter bleiben als schnelle Übersicht, aber die Tabs sind der
            eigentliche Arbeitsguide.
          </P>
          <div
            style={{
              display: "flex",
              gap: 7,
              overflowX: "auto",
              padding: "2px 0 10px",
              marginBottom: 10,
            }}
          >
            {VIEW_DOCS.map((view) => (
              <PillButton
                key={view.title}
                active={activeView.title === view.title}
                label={`${view.emoji} ${view.title}`}
                onClick={() => setActiveGuide(view.title)}
              />
            ))}
          </div>
          <div
            style={{
              borderRadius: 16,
              border: `1px solid rgba(${rgb},0.24)`,
              background: `linear-gradient(135deg, rgba(${rgb},0.11), rgba(${hexRgb(t.accent2)},0.07)), rgba(255,255,255,0.035)`,
              padding: "15px 16px",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 930 }}>
                {activeView.emoji} {activeView.guideTitle}
              </div>
              <Badge label={`📌 ${activeView.title}`} color={t.accent} />
              <Badge label="🧪 Release relevant" color="#ff9f0a" />
            </div>
            <P>{activeView.guideIntro}</P>
            <Grid2>
              <Card
                icon="🪜"
                title="So nutzt du die View"
                desc={activeView.dailyFlow
                  .map((item, index) => `${index + 1}. ${item}`)
                  .join(" ")}
              />
              <Card
                icon="✨"
                title="Wichtigste Features"
                desc={activeView.features.join(" / ")}
                keys={activeView.shortcuts}
              />
              <Card
                icon="✅"
                title="Qualitätsgrenze"
                desc={activeView.qualityBar}
              />
              <Card
                icon="💡"
                title="Praktischer Tipp"
                desc={activeView.proTip}
              />
              <Card
                icon="🧪"
                title="Release-Check"
                desc={activeView.releaseCheck}
              />
              <Card
                icon="🔎"
                title="Wiki-Themen"
                desc={activeView.wikiTopics.join(" / ")}
              />
            </Grid2>
          </div>
          <H>🗂️ Alle Views auf einen Blick</H>
          <Grid2>
            {VIEW_DOCS.map((view) => (
              <Card
                key={view.title}
                icon={view.emoji}
                title={view.title}
                desc={`${view.purpose} Hauptflows: ${view.mainUse.join(" / ")}. Release: ${view.releaseCheck}`}
                keys={view.shortcuts}
              />
            ))}
          </Grid2>
          <H>📋 Copy/Paste View Reference</H>
          <Code>{viewDocsText}</Code>
        </Acc>

        <Acc
          title="📝 Notes, Markdown und interne Guides"
          icon={FileText}
          open={open.notes}
          onToggle={() => tog("notes")}
          badge="DOCS"
        >
          <P>
            Notes ist die interne Dokumentationszentrale. Die Starter-Readmes
            umfassen Welcome, View Guide, Markdown/Magic Showcase, Canvas Guide
            sowie Tasks/Flux Guide. Neue Seed-Docs werden additiv ergänzt;
            unveränderte Welcome-Seeds werden automatisch auf den aktuellen
            Stand gehoben.
          </P>
          <Grid2>
            <Card
              icon="📄"
              title="Markdown Elemente"
              desc="Headings, Listen, Tabellen, Checklisten, Links, Quotes, Code, Details, Trennlinien und Inline-Code."
            />
            <Card
              icon="🪄"
              title="Magic Blocks"
              desc={`Unterstützt: ${MAGIC_BLOCKS.join(", ")}.`}
            />
            <Card
              icon="😀"
              title="Emoji Picker"
              desc="Kategorien, Scroll, Suche, Alias-Begriffe und eine größere Emoji-Auswahl für schnelle visuelle Struktur."
            />
            <Card
              icon="🔗"
              title="Wikilinks"
              desc="[[Wiki Links]] und Backlinks verbinden Notes, Canvas und Tasks zu einem echten Workspace-Kontext."
            />
          </Grid2>
          <Code>{`Empfohlene Notes-Guide-Dateien
- ✨ Willkommen in Nexus v6
- 🧭 Nexus v6 View Guide
- 🪄 Notes Magic und Markdown Showcase
- 🧩 Canvas Guide
- ✅ Tasks und Flux Guide`}</Code>
        </Acc>

        <Acc
          title="🔐 Account, API, Tiers und Release-Zugriff"
          icon={ShieldCheck}
          open={open.accounts}
          onToggle={() => tog("accounts")}
          badge="SECURITY"
        >
          <P>
            Nexus Main startet mit API-Abfrage. Wenn Catalog, Layout oder
            Release wegen 401/403 blockieren, zeigt die App Login/Register statt
            eines leeren Screens und prüft den Bootflow nach Anmeldung erneut.
          </P>
          <Grid2>
            <Card
              icon="🔑"
              title="Login"
              desc="Mit Website-Account anmelden. Remember me speichert nur den Session-Token, niemals das Passwort."
            />
            <Card
              icon="👤"
              title="Register"
              desc="Account kann auf der Website oder direkt in Nexus Main erstellt werden; danach gilt derselbe API-Bootflow."
            />
            <Card
              icon="💳"
              title="Tier Modell"
              desc="Free: Main Basics. Pro/Lifetime: Canvas, Code, DevTools und Mobile Access je nach Freigabe. Lifetime Pro ergänzt Flux/Top Features."
            />
            <Card
              icon="🛡️"
              title="Admin Sicherheit"
              desc="Admins dürfen nicht selbst entstehen. Rollen/Freigaben gehören in Control Plane/Admin-Kontext."
            />
            <Card
              icon="📦"
              title="Release Manifest"
              desc="Catalog, Layout und Release sind Runtime-Vertrag. Kein stiller Offline-Bypass für Hosted Boot."
            />
            <Card
              icon="⬇️"
              title="Downloads"
              desc="Website-Downloads zeigen Main/Code Installer pro Plattform; Artefakte gehören in public/downloads oder Release-Storage."
            />
          </Grid2>
        </Acc>

        <Acc
          title="🎛️ Settings, Design und Panel Background"
          icon={SlidersHorizontal}
          open={open.settings}
          onToggle={() => tog("settings")}
        >
          <P>
            Settings steuert das visuelle System. Panel Backgrounds sind echte
            Surface-Presets mit Basis-Layer, Tint und Pattern, damit Shell,
            Notes, Glass Panels und Settings-Vorschau denselben Look sprechen.
          </P>
          <Grid2>
            <Card
              icon="🎨"
              title="Theme Library"
              desc="Vordefinierte v6-Themes mit Preview, Beschreibung, Accent/Accent2/BG und sicherem Apply Flow."
            />
            <Card
              icon="BK"
              title="Backup Restore"
              desc="Workspace Snapshots mit lokalen Versionen, JSON Export/Import, Preview, Konfliktliste und Safety-Backup vor Restore."
            />
            <Card
              icon="🧊"
              title="Panel Background"
              desc="Glass, Solid, Gradient, Mist, Hologram, Linen, Dots, Grid, Stripes, Carbon, Circuit und Soft Noise."
            />
            <Card
              icon="🌌"
              title="App Background"
              desc="Solid, Gradient, Animated Gradient, Mesh, Aurora, Noise, Spotlight, Prism, Horizon und Constellation."
            />
            <Card
              icon="✨"
              title="Glow Lab"
              desc="Ambient, Outline, Focus, Gradient, Pulse, Border Glow, Inner Shadow und sichere Performance-Grenzen."
            />
            <Card
              icon="🎬"
              title="Motion Engine"
              desc="Minimal, Balanced, Expressive, Cinematic mit Reduced Motion und stabileren Klickzielen."
            />
            <Card
              icon="♿"
              title="Accessibility"
              desc="High Contrast, Tooltips, Auto Accent Contrast, Font Size und Density."
            />
          </Grid2>
        </Acc>

        <Acc
          title="✅ Release- und Smoke-Check"
          icon={Star}
          open={open.release}
          onToggle={() => tog("release")}
        >
          <P>
            Vor Release reicht ein Build allein nicht. Jede Hauptview braucht
            einen kurzen visuellen Smoke: öffnen, erstellen/bearbeiten,
            speichern/reloaden, API-Fallback sehen und Hauptflow mit
            Maus/Tastatur bedienen.
          </P>
          <Grid2>
            <Card
              icon="🏗️"
              title="Builds"
              desc="Nexus Main, Mobile, Code, Code Mobile, Website, Wiki und Core Package Gate."
            />
            <Card
              icon="🧪"
              title="Verify"
              desc="verify:single-react, verify:encoding, verify:ecosystem und release:gate."
            />
            <Card
              icon="💿"
              title="Installer"
              desc="Windows NSIS, macOS DMG auf macOS Runner, Linux AppImage/deb für Main und Code."
            />
            <Card
              icon="🛡️"
              title="Security"
              desc="Keine Secrets im Bundle, API Daten sauber, Admin/Rollen nur kontrolliert, DevTools gated."
            />
            <Card
              icon="📚"
              title="Docs"
              desc="InfoView, Notes Guides, Website, Wiki und Release Notes müssen denselben Stand beschreiben."
            />
            <Card
              icon="📸"
              title="Evidence"
              desc="Screenshots/Videos pro RC in docs/release-evidence/<version>/ sammeln."
            />
          </Grid2>
        </Acc>

        <Acc
          title="⌨️ Tastenkürzel und Command-Hub"
          icon={Keyboard}
          open={open.shortcuts}
          onToggle={() => tog("shortcuts")}
        >
          <Grid2>
            <Card
              icon="🧭"
              title="Global"
              desc="Navigation, View-Wechsel und Fokus."
              keys={["Ctrl+1..9", "Ctrl+[", "Ctrl+]", "Esc"]}
            />
            <Card
              icon="📝"
              title="Notes"
              desc="Schreiben, Suchen, Formatieren und Speichern."
              keys={[
                "Ctrl+P",
                "Ctrl+F",
                "Ctrl+S",
                "Ctrl+B",
                "Ctrl+I",
                "Ctrl+K",
              ]}
            />
            <Card
              icon="✅"
              title="Tasks"
              desc="Arbeitsmodi und Triage."
              keys={["1..5", "B", "H", "N", "T", "E", "G"]}
            />
            <Card
              icon="🧩"
              title="Canvas"
              desc="Knowledge-Graph Navigation."
              keys={["Ctrl+P", "Ctrl+M", "Ctrl+0", "F", "P", "G", "+", "-"]}
            />
            <Card
              icon="⚡"
              title="Flux"
              desc="Ops und Quick Actions."
              keys={[
                "Ctrl+F",
                "Ctrl+Shift+N/C/T/R",
                "Ctrl+Shift+B",
                "Ctrl+Shift+D",
              ]}
            />
            <Card
              icon="⌨️"
              title="Terminal"
              desc="Command Hub für Navigation, Create-Flows, Macros und Suche."
              keys={["Enter", "Tab", "ArrowUp/Down", "Esc", "Ctrl+L"]}
            />
          </Grid2>
        </Acc>

        <Acc
          title="✨ v6 Changelog"
          icon={Sparkles}
          open={open.changelog}
          onToggle={() => tog("changelog")}
          badge="CURRENT"
        >
          <Grid2>
            <Card
              icon="🖥️"
              title="Content-first Shell"
              desc="Kompakter Header, weniger Orb/Chrome, Inspector weniger dominant, mehr Fläche für Main Content."
            />
            <Card
              icon="📝"
              title="Notes v6"
              desc="Command Strip, größerer Editor, Advanced Blocks, Emoji Picker, bessere Guides und Welcome-Migration."
            />
            <Card
              icon="✅"
              title="Tasks v6"
              desc="Ruhigere Board-Steuerung, stabile Karten, weniger innere Rechtecke, bessere Drop-Zonen."
            />
            <Card
              icon="🧩"
              title="Canvas v6"
              desc="Obsidian-näherer Jump/Search-Flow, Double-click Quick Add, Wiki-Linking, ruhigere Toolbar-Ziele."
            />
            <Card
              icon="⚡"
              title="Flux Safety"
              desc="Triage startet To-do Tasks oder öffnet laufende Arbeit, statt heimlich Done zu setzen."
            />
            <Card
              icon="🎨"
              title="Theme & Docs Polish"
              desc="Neue v6-Theme Library, bessere Panel-Vorschau, weniger generische Texte und Guide-Tabs pro View."
            />
          </Grid2>
        </Acc>

        <div style={{ height: 36 }} />
      </div>
    </div>
  );
}
