import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardCopy,
  Code2,
  ExternalLink,
  FileText,
  FolderOpen,
  GitBranch,
  Keyboard,
  Library,
  Monitor,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  MAIN_CORE_VIEW_IDS,
  MAIN_VIEW_REGISTRY,
  type View,
} from "../app/mainViewRegistry";
import {
  NEXUS_TEMPLATE_PACKS,
  buildNexusTemplatePackMarkdown,
} from "../app/nexusTemplatePacks";
import { useTheme } from "../store/themeStore";
import {
  NOTES_MAGIC_DEFINITIONS_WITH_PLANNING,
  buildNotesMagicSnippetWithPlanning,
} from "./notes/notesMagicPlanning";
import "./info/InfoView.css";

type InfoSectionId =
  | "start"
  | "views"
  | "markdown"
  | "files"
  | "canvas"
  | "shortcuts"
  | "release";

type ViewStatus = "fertig" | "teilweise" | "entwicklung";

type ViewGuide = {
  id: View;
  purpose: string;
  flow: string[];
  features: string[];
  shortcuts: string[];
  status: ViewStatus;
  statusReason: string;
  gaps: string[];
  localData: string;
};

const VIEW_GUIDES: ViewGuide[] = [
  {
    id: "dashboard",
    purpose: "Tagesstart, Schnellaufnahme und Rückkehr in zuletzt aktive Arbeit.",
    flow: ["Today prüfen", "Arbeit fortsetzen", "Gedanken schnell erfassen", "Layout bei Bedarf anpassen"],
    features: ["Today Layer", "Continue Lane", "Quick Capture", "persistentes Widget-Layout"],
    shortcuts: ["Ctrl+1", "Ctrl+K"],
    status: "fertig",
    statusReason: "Die zentralen Start-, Capture- und Layout-Flows sind implementiert und lokal persistent.",
    gaps: ["Release-Smoke auf allen Zielgrößen bleibt Pflicht."],
    localData: "Widget-Layout und Arbeitsdaten bleiben lokal; Runtime- und Tierstatus kommen von der API.",
  },
  {
    id: "calendar",
    purpose: "Zeitansicht über vorhandene Tasks und Reminders, ohne zweite Termin-Datenbank.",
    flow: ["Zeitraum wählen", "Tasks/Reminders filtern", "Eintrag planen", "Agenda oder Monat prüfen"],
    features: ["Tag/Woche/Monat", "Agenda", "Quick Composer", "ICS-Import", "Drag-Reschedule"],
    shortcuts: ["Ctrl+2", "Heute", "Import"],
    status: "teilweise",
    statusReason: "Planung und Import sind vorhanden; Toolbar-Dichte und responsive Bedienung werden weiter stabilisiert.",
    gaps: ["Mobile/enge Breiten final prüfen", "Import-Fehlerführung weiter vereinheitlichen"],
    localData: "Calendar liest und schreibt dieselben lokalen Tasks und Reminders wie die anderen Views.",
  },
  {
    id: "notes",
    purpose: "Markdown-Wissensbasis mit Suche, Links, Vorschau und Nexus Magic.",
    flow: ["Notiz wählen oder erstellen", "Titel und Inhalt pflegen", "Preview/Split prüfen", "Tags/Links ergänzen"],
    features: ["Markdown + GFM", "Wikilinks/Backlinks", "Magic Blocks", "Import/Export", "Autosave"],
    shortcuts: ["Ctrl+P", "Ctrl+F", "Ctrl+S", "Ctrl+B", "Ctrl+I", "Ctrl+K"],
    status: "teilweise",
    statusReason: "Der Editor ist umfangreich; Unified Bar, schmale Breiten und alle Metadaten-Aktionen brauchen weiter UI-QA.",
    gaps: ["Toolbar auf kleinen Breiten finalisieren", "Dateiname/Metadaten jederzeit auffindbar halten"],
    localData: "Notizen und Entwürfe werden lokal gespeichert. Externe Bild-URLs werden nur beim Anzeigen geladen.",
  },
  {
    id: "tasks",
    purpose: "Arbeitsboard für Status, Priorität, Deadlines, Blocker, Subtasks und Fokus.",
    flow: ["Aufgabe erfassen", "Status und Priorität setzen", "Blocker klären", "Fokus oder Batch-Triage nutzen"],
    features: ["Board", "Focus Mode", "Batch Mode", "Subtasks", "Linked Notes", "Markdown-Notizen"],
    shortcuts: ["1–5", "B", "H", "N", "T", "E", "G"],
    status: "fertig",
    statusReason: "CRUD, Board, Details und Triage sind vorhanden; Release-Regressionen bleiben zu testen.",
    gaps: ["Große Boards und Keyboard-Flows im RC-Smoke prüfen"],
    localData: "Tasks liegen lokal und werden von Dashboard, Calendar und Flux gemeinsam gelesen.",
  },
  {
    id: "reminders",
    purpose: "Zeitbasierte Follow-ups mit Snooze, Wiederholung und Kontext.",
    flow: ["Reminder anlegen", "Zeitpunkt/Wiederholung setzen", "Overdue triagieren", "Erledigen oder snoozen"],
    features: ["Agenda", "Repeat Rules", "Snooze", "Notification Health", "Task/Note-Kontext"],
    shortcuts: ["Ctrl+4", "Snooze", "Health"],
    status: "fertig",
    statusReason: "Planung, Wiederholung, Snooze und Health-Zustände sind implementiert.",
    gaps: ["Systembenachrichtigungen je Plattform im Installer-Smoke prüfen"],
    localData: "Reminder bleiben lokal; Betriebssystem-Benachrichtigungen benötigen deine Gerätefreigabe.",
  },
  {
    id: "files",
    purpose: "Bibliothek und Projektzuordnung für Nexus-Inhalte sowie lokale Import-/Export-Ziele.",
    flow: ["Library oder Workspace wählen", "Root bewusst setzen", "Inhalte filtern", "Zuordnen oder exportieren"],
    features: ["Library", "Workspaces", "Root Folder", "Recent/Pinned/Unassigned", "Import/Export", "Preview"],
    shortcuts: ["Ctrl+5", "Ctrl+F", "Import"],
    status: "teilweise",
    statusReason: "Workspace-Filter und Dateiaktionen sind vorhanden; Begriffe, Scope-Signale und kompakte Layouts werden weiter geschärft.",
    gaps: ["Workspace-Scope immer sichtbar machen", "Root-/Sync-Fehler noch handlungsorientierter erklären"],
    localData: "Library zeigt lokale Nexus-Inhalte. Ein Workspace ist eine Zuordnung; ein Root ist ein bewusst gewählter Geräteordner.",
  },
  {
    id: "canvas",
    purpose: "Räumliche Projekt- und Wissensstruktur mit Nodes, Kanten, Widgets und Templates.",
    flow: ["Canvas wählen", "Node anlegen", "Inhalt bearbeiten", "Verbinden", "Layout/Fokus nutzen"],
    features: ["Pan/Zoom", "Nodes/Edges", "Inspector", "Project Panel", "Magic Templates", "Export"],
    shortcuts: ["Ctrl+P", "Ctrl+M", "Ctrl+0", "F", "P", "G", "+/−"],
    status: "entwicklung",
    statusReason: "Die Engine und viele Node-Typen sind vorhanden; Interaktion, große Graphen und Feature-Kohärenz brauchen einen größeren Stabilitätsschritt.",
    gaps: ["Undo/Redo und Edge-Editing durchgängig härten", "große Graphen/performance testen", "Mobile Interaktion finalisieren"],
    localData: "Canvas-Daten bleiben lokal. Verknüpfte Notes/Tasks referenzieren lokale IDs; Export ist explizit.",
  },
  {
    id: "flux",
    purpose: "Operative Sicht auf Engpässe, überfällige Arbeit und relevante Aktivität.",
    flow: ["Arbeitsansicht wählen", "Queue priorisieren", "Bottleneck öffnen", "bewusst in der Quell-View handeln"],
    features: ["Ops Score", "Action Queue", "Bottlenecks", "Activity Stream", "Focus/Backlog"],
    shortcuts: ["Ctrl+F", "Ctrl+Shift+B", "Ctrl+Shift+D", "Ctrl+Shift+R"],
    status: "teilweise",
    statusReason: "Triage und Kontextsprünge funktionieren; Leerräume und Informationsgewichtung brauchen weitere Produkt-QA.",
    gaps: ["Empty-/Low-activity-Zustände informativer machen", "Metrikdefinitionen weiter erklären"],
    localData: "Flux berechnet seine Signale aus lokalen Tasks, Reminders, Notes und Aktivitätsdaten.",
  },
  {
    id: "code",
    purpose: "Lokaler Scratch-Editor für Snippets, kleine Dateien und begrenzte Ausführung.",
    flow: ["Datei wählen", "Code bearbeiten", "Run/Preview bewusst starten", "Output prüfen"],
    features: ["Editor", "Quick Open", "lokaler Runner", "Output-History", "Sprachprofile"],
    shortcuts: ["Ctrl+P", "Ctrl+Enter", "Ctrl+S"],
    status: "teilweise",
    statusReason: "Scratch-Flows sind vorhanden; Nexus Code bleibt die vollständige IDE und der lokale Runner ist absichtlich begrenzt.",
    gaps: ["Runner-Sandbox pro Plattform weiter testen", "Projekt-/Git-Flows gehören primär in Nexus Code"],
    localData: "Dateien und Output bleiben lokal. Tier-Freigabe kommt aus dem API-View-Katalog.",
  },
  {
    id: "settings",
    purpose: "Kontrollzentrum für Theme, Oberfläche, Bewegung, Barrierefreiheit, Workspace und Diagnose.",
    flow: ["Preset wählen", "Theme prüfen", "Details gezielt anpassen", "Vorschau und Accessibility testen"],
    features: ["Themes", "App/Panel Background", "Glow", "Motion", "Accessibility", "Backup/Restore"],
    shortcuts: ["Ctrl+9", "Settings-Suche"],
    status: "teilweise",
    statusReason: "Die Module sind umfangreich; visuelle Wirkung, Dichte und verständliche Reduktion werden fortlaufend verbessert.",
    gaps: ["Jede sichtbare Option auf reale Wirkung prüfen", "lange Seiten und Sticky-Header auf kleinen Displays testen"],
    localData: "Darstellung und Backups sind lokal. Account-/Tierinformationen werden aus der API gelesen.",
  },
  {
    id: "info",
    purpose: "In-App-Handbuch, Markdown-Referenz, View-Reifegrad und Release-Hinweise.",
    flow: ["Thema über Navigation wählen", "Handbuch durchsuchen", "Beispiel kopieren", "passende View kontrolliert öffnen"],
    features: ["View-Guides", "Magic-Referenz", "Files/Canvas-Erklärung", "Shortcuts", "Release-Matrix"],
    shortcuts: ["Ctrl+0", "/ für Suche"],
    status: "fertig",
    statusReason: "Handbuch und Registry-Matrix sind direkt in der App auffindbar und für Tastatur/Screenreader strukturiert.",
    gaps: ["Bei neuen Features müssen Registry und Handbuch gemeinsam aktualisiert werden"],
    localData: "Info liest keine Nutzerdaten und schreibt nur dann lokal, wenn du den Walkthrough-Fortschritt nutzt.",
  },
  {
    id: "devtools",
    purpose: "Interne Diagnose-, Builder- und Release-Werkzeuge für freigeschaltete Entwicklungsrollen.",
    flow: ["Diagnoseziel wählen", "Signal reproduzieren", "Artefakt prüfen", "ohne Secrets exportieren"],
    features: ["Visual Builder", "Diagnostics", "Release Health", "Artifacts", "Feature Catalog"],
    shortcuts: ["Dev/Admin", "tierabhängig"],
    status: "entwicklung",
    statusReason: "DevTools ist absichtlich eine interne, tier-/rollenabhängige Oberfläche und kein normaler Endnutzer-Flow.",
    gaps: ["Release-Rollen und Exporte weiter härten", "nicht für normale Nutzer prominent machen"],
    localData: "Lokale Diagnoseartefakte dürfen keine Tokens oder Secrets enthalten. Freigabe kommt aus API/Rolle.",
  },
];

const INFO_SECTIONS: Array<{
  id: InfoSectionId;
  label: string;
  detail: string;
  icon: LucideIcon;
}> = [
  { id: "start", label: "Start & Daten", detail: "Was Nexus ist", icon: BookOpen },
  { id: "views", label: "Views", detail: "Guide und Reifegrad", icon: Monitor },
  { id: "markdown", label: "Markdown", detail: "Standard + Nexus Magic", icon: FileText },
  { id: "files", label: "Files", detail: "Library, Workspace, Root", icon: FolderOpen },
  { id: "canvas", label: "Canvas", detail: "Funktionen und Bedienung", icon: GitBranch },
  { id: "shortcuts", label: "Shortcuts", detail: "Schneller arbeiten", icon: Keyboard },
  { id: "release", label: "Release", detail: "Status und Grenzen", icon: ShieldCheck },
];

const STANDARD_MARKDOWN = [
  { title: "Überschriften", syntax: "# H1\n## H2\n### H3", use: "Dokumente in klare, scanbare Abschnitte gliedern." },
  { title: "Betonung", syntax: "**fett**  *kursiv*  ~~durchgestrichen~~  `inline code`", use: "Begriffe betonen, Änderungen markieren und kurze technische Werte zeigen." },
  { title: "Listen", syntax: "- Punkt\n  - Unterpunkt\n1. Erster Schritt\n2. Zweiter Schritt", use: "Sammlungen und geordnete Abläufe dokumentieren." },
  { title: "Aufgabenliste", syntax: "- [ ] Offen\n- [x] Erledigt", use: "Einfache Checklisten im Dokument; für verknüpfte Arbeit nexus-task nutzen." },
  { title: "Links & Bilder", syntax: "[Nexus](https://nexusproject.dev)\n![Alt-Text](https://example.test/bild.png)", use: "Quellen und externe Bilder referenzieren. Externe URLs können Netzwerkzugriffe auslösen." },
  { title: "Wikilinks", syntax: "[[Projekt Alpha]]", use: "Lokale Notes und Wissenskontext über Titel verbinden." },
  { title: "Zitat", syntax: "> Eine Entscheidung mit Quelle oder Kontext.", use: "Zitate und herausgehobenen Kontext kennzeichnen." },
  { title: "Codeblock", syntax: "```ts\nconst ready = true;\n```", use: "Mehrzeiligen Code mit Sprachkennzeichnung anzeigen und kopieren." },
  { title: "Tabelle (GFM)", syntax: "| Bereich | Status |\n| --- | --- |\n| API | bereit |", use: "Kleine Vergleiche und Statusübersichten. Große Datensätze gehören nicht in Markdown-Tabellen." },
  { title: "Trennlinie", syntax: "---", use: "Lange Dokumente visuell unterteilen." },
];

const MAGIC_USE_CASES: Record<string, string> = {
  "nexus-list": "Kompakte Label/Detail-Übersichten.",
  "nexus-checklist": "Visueller Fortschritt für eine lokale Dokument-Checkliste.",
  "nexus-alert": "Kurze Info-, Erfolgs-, Warn- oder Fehlermeldung.",
  "nexus-progress": "Mehrere Prozentwerte vergleichbar darstellen.",
  "nexus-timeline": "Termine, Releases oder Ereignisse chronologisch zeigen.",
  "nexus-grid": "Kurze Inhalte in einem responsiven Raster anordnen.",
  "nexus-card": "Externe Bild-URL mit Titel und Beschreibung präsentieren.",
  "nexus-metrics": "KPI, Wert und Delta als kompakte Kennzahlen zeigen.",
  "nexus-steps": "Einen Prozess mit benannten Schritten erklären.",
  "nexus-quadrant": "Bis zu vier Prioritäts- oder Mapping-Felder vergleichen.",
  "nexus-kanban": "Eine kleine Statusübersicht im Dokument zeigen; ersetzt nicht das Tasks-Board.",
  "nexus-callout": "Einen Hinweis mit Typ, Titel und Text hervorheben.",
  "nexus-details": "Langen Zusatzkontext aufklappbar halten, ohne rohes HTML.",
  "nexus-daily-brief": "Callout, Checkliste und Blockerliste als Tagesbriefing kombinieren.",
  "nexus-decision-log": "Entscheidungen plus Review-Timeline dokumentieren.",
  badge: "Ein kleines Inline-Abzeichen im Fließtext erzeugen.",
  "nexus-task": "Eine Task aus einer Note skizzieren und bewusst mit dem Tasks-System verknüpfen.",
  "nexus-reminder": "Einen Reminder aus einer Note planen und bewusst verknüpfen.",
};

const CANVAS_FEATURES = [
  ["Navigation", "Mausrad/Trackpad zoomt, Drag auf leerer Fläche verschiebt, Ctrl+0 passt alles ein."],
  ["Nodes", "Text-, Note-, Code-, Task-, Reminder-, Projekt-, Ziel-, Decision-, Risk- und weitere Widgets anlegen."],
  ["Kanten", "Nodes verbinden und Beziehungen im Graph sichtbar machen; Änderungen bewusst prüfen."],
  ["Project Panel", "Suchen, filtern, Mehrfachauswahl, Tags, Fokusverlauf und Details bearbeiten."],
  ["Inspector", "Ausgewählten Node, Metadaten, Inhalt und Verknüpfungen bearbeiten."],
  ["Magic Builder", "Mindmap, Roadmap, Sprint, Risiko-, Entscheidungs- oder Brief-Strukturen als Startpunkt erzeugen."],
  ["Layout", "Mindmap, Timeline, Board und Auto-Layout als Aufräumhilfe nutzen, danach manuell verfeinern."],
  ["Export", "Canvas bewusst als JSON oder Markdown exportieren; Export ist kein Cloud-Sync."],
];

const STATUS_LABEL: Record<ViewStatus, string> = {
  fertig: "Fertig / RC",
  teilweise: "Teilweise",
  entwicklung: "Fehlend / in Entwicklung",
};

const copyText = async (value: string) => {
  if (!navigator.clipboard?.writeText) return false;
  await navigator.clipboard.writeText(value);
  return true;
};

const getMagicExample = (id: string, template: string, fields: Array<{ key: string; placeholder: string }>) => {
  const values = Object.fromEntries(fields.map((field) => [field.key, field.placeholder]));
  return buildNotesMagicSnippetWithPlanning(id, values).trim() || template.trim();
};

export function InfoView({
  onOpenWalkthrough,
  onOpenView,
}: {
  onOpenWalkthrough?: () => void;
  onOpenView?: (view: View) => void;
} = {}) {
  const theme = useTheme();
  const [activeSection, setActiveSection] = useState<InfoSectionId>("start");
  const [activeViewId, setActiveViewId] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const activeGuide = VIEW_GUIDES.find((guide) => guide.id === activeViewId) ?? VIEW_GUIDES[0];
  const activeRegistryItem = MAIN_VIEW_REGISTRY[activeGuide.id];

  const visibleGuides = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("de");
    if (!normalized) return VIEW_GUIDES;
    return VIEW_GUIDES.filter((guide) => {
      const registry = MAIN_VIEW_REGISTRY[guide.id];
      return [registry?.label, guide.id, guide.purpose, guide.features.join(" "), guide.gaps.join(" ")]
        .join(" ")
        .toLocaleLowerCase("de")
        .includes(normalized);
    });
  }, [query]);

  const visibleMagic = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("de");
    if (!normalized) return NOTES_MAGIC_DEFINITIONS_WITH_PLANNING;
    return NOTES_MAGIC_DEFINITIONS_WITH_PLANNING.filter((definition) =>
      [definition.id, definition.label, definition.desc, MAGIC_USE_CASES[definition.id] || ""]
        .join(" ")
        .toLocaleLowerCase("de")
        .includes(normalized),
    );
  }, [query]);

  const copy = async (id: string, value: string) => {
    try {
      if (!(await copyText(value))) return;
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
    } catch {
      setCopiedId(null);
    }
  };

  const openGuideView = (viewId: View) => {
    if (!onOpenView) return;
    onOpenView(viewId);
  };

  const renderSection = () => {
    if (activeSection === "start") {
      return (
        <div className="nx-info-section-stack">
          <section className="nx-info-card nx-info-intro-card">
            <div className="nx-info-card-heading">
              <Library size={18} />
              <div><span>Produktmodell</span><h2>Ein lokaler Workspace mit API-gesteuertem Zugang</h2></div>
            </div>
            <p>
              Notes, Tasks, Reminders, Canvas, Einstellungen und die meisten Arbeitszustände bleiben lokal auf diesem Gerät.
              Die Nexus API prüft Account, Session, Tier, View-Katalog und Release-Vertrag. Sie ist kein stiller Upload-Kanal für deine Inhalte.
            </p>
            <div className="nx-info-callout-grid">
              <article><strong>Lokal</strong><span>Arbeitsinhalte, Entwürfe, Layouts, Themes, Walkthrough-Fortschritt.</span></article>
              <article><strong>API</strong><span>Login, Account/Tier, erlaubte Views, Release- und Runtime-Vertrag.</span></article>
              <article><strong>Explizit</strong><span>Import, Export, externe Links und künftig aktiv konfigurierte Sync-Verbindungen.</span></article>
            </div>
          </section>

          <section className="nx-info-card">
            <div className="nx-info-card-heading">
              <Boxes size={18} />
              <div><span>Arbeitsfluss</span><h2>Welche View macht was?</h2></div>
            </div>
            <div className="nx-info-flow-grid">
              <button type="button" onClick={() => { setActiveSection("views"); setActiveViewId("notes"); }}><FileText size={17} /><strong>Wissen</strong><span>Notes sammelt linearen Kontext.</span></button>
              <button type="button" onClick={() => { setActiveSection("views"); setActiveViewId("tasks"); }}><CheckCircle2 size={17} /><strong>Arbeit</strong><span>Tasks und Reminders machen nächste Schritte konkret.</span></button>
              <button type="button" onClick={() => { setActiveSection("canvas"); setActiveViewId("canvas"); }}><GitBranch size={17} /><strong>Struktur</strong><span>Canvas zeigt Beziehungen und Projektbilder.</span></button>
              <button type="button" onClick={() => { setActiveSection("views"); setActiveViewId("flux"); }}><Sparkles size={17} /><strong>Fokus</strong><span>Flux zeigt Druck und Engpässe.</span></button>
            </div>
          </section>

          <section className="nx-info-card">
            <div className="nx-info-card-heading">
              <ShieldCheck size={18} />
              <div><span>Ehrliche Grenzen</span><h2>Was Nexus nicht automatisch tut</h2></div>
            </div>
            <ul className="nx-info-check-list">
              <li><AlertTriangle size={15} />Ein Workspace ist eine Zuordnung, kein automatischer Cloud-Sync.</li>
              <li><AlertTriangle size={15} />Ein Root-Ordner wird nur nach deiner Auswahl verwendet.</li>
              <li><AlertTriangle size={15} />Tier-gesperrte Views werden nicht durch Handbuch- oder Tour-Aktionen umgangen.</li>
              <li><AlertTriangle size={15} />Canvas Auto-Layout und Flux-Triage unterstützen Entscheidungen, treffen sie aber nicht heimlich.</li>
            </ul>
          </section>
        </div>
      );
    }

    if (activeSection === "views") {
      return (
        <div className="nx-info-view-layout">
          <div className="nx-info-view-list" role="list" aria-label="Dokumentierte Views">
            {visibleGuides.map((guide) => {
              const item = MAIN_VIEW_REGISTRY[guide.id];
              const Icon = item?.icon ?? Monitor;
              return (
                <button
                  key={guide.id}
                  type="button"
                  className={guide.id === activeGuide.id ? "is-active" : undefined}
                  onClick={() => setActiveViewId(guide.id)}
                >
                  <Icon size={15} />
                  <span><strong>{item?.label ?? guide.id}</strong><small>{STATUS_LABEL[guide.status]}</small></span>
                  <ChevronRight size={14} />
                </button>
              );
            })}
          </div>
          <article className="nx-info-card nx-info-view-guide">
            <div className="nx-info-guide-head">
              <div className="nx-info-guide-icon" style={{ color: activeRegistryItem?.color }}>
                {activeRegistryItem?.icon ? React.createElement(activeRegistryItem.icon, { size: 22 }) : <Monitor size={22} />}
              </div>
              <div><span>View-Handbuch</span><h2>{activeRegistryItem?.label ?? activeGuide.id}</h2><p>{activeGuide.purpose}</p></div>
              <span className={`nx-info-status is-${activeGuide.status}`}>{STATUS_LABEL[activeGuide.status]}</span>
            </div>
            <div className="nx-info-guide-columns">
              <div><h3>Empfohlener Ablauf</h3><ol>{activeGuide.flow.map((item) => <li key={item}>{item}</li>)}</ol></div>
              <div><h3>Vorhanden</h3><ul>{activeGuide.features.map((item) => <li key={item}>{item}</li>)}</ul></div>
            </div>
            <div className="nx-info-guide-note"><strong>Lokale Daten / API</strong><span>{activeGuide.localData}</span></div>
            <div className="nx-info-guide-note is-warning"><strong>Status</strong><span>{activeGuide.statusReason}</span></div>
            <div className="nx-info-gap-list"><strong>Offen oder weiter zu prüfen</strong>{activeGuide.gaps.map((gap) => <span key={gap}>{gap}</span>)}</div>
            <div className="nx-info-action-row">
              <div className="nx-info-key-row">{activeGuide.shortcuts.map((key) => <kbd key={key}>{key}</kbd>)}</div>
              <button type="button" disabled={!onOpenView} onClick={() => openGuideView(activeGuide.id)}>
                View öffnen <ArrowRight size={14} />
              </button>
            </div>
            {!onOpenView ? <p className="nx-info-action-hint">Navigation ist in diesem Host nicht verbunden. Nutze Sidebar oder Spotlight; Zugriffsregeln bleiben aktiv.</p> : null}
          </article>
        </div>
      );
    }

    if (activeSection === "markdown") {
      return (
        <div className="nx-info-section-stack">
          <section className="nx-info-card">
            <div className="nx-info-card-heading"><FileText size={18} /><div><span>Standard + GFM</span><h2>Markdown-Referenz</h2></div></div>
            <p>Notes rendert Markdown mit GFM-Erweiterungen. HTML wird nicht als freier UI-Code ausgeführt; für aufklappbare Inhalte gibt es <code>nexus-details</code>.</p>
            <div className="nx-info-reference-grid">
              {STANDARD_MARKDOWN.map((entry) => (
                <article key={entry.title}>
                  <div><strong>{entry.title}</strong><button type="button" aria-label={`${entry.title} kopieren`} onClick={() => void copy(`md-${entry.title}`, entry.syntax)}><ClipboardCopy size={13} />{copiedId === `md-${entry.title}` ? "Kopiert" : "Kopieren"}</button></div>
                  <pre><code>{entry.syntax}</code></pre><p>{entry.use}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="nx-info-card">
            <div className="nx-info-card-heading"><Sparkles size={18} /><div><span>{NOTES_MAGIC_DEFINITIONS_WITH_PLANNING.length} Definitionen</span><h2>Vollständige Nexus-Magic-Referenz</h2></div></div>
            <p>Magic wird über den „Magic“-Dialog eingefügt. Jede Definition unten stammt aus derselben Registry wie der Editor. Task und Reminder erzeugen erst nach bewusster Aktion echte verknüpfte Einträge.</p>
            <div className="nx-info-magic-list">
              {visibleMagic.map((definition) => {
                const example = getMagicExample(definition.id, definition.template, definition.fields);
                return (
                  <details key={definition.id} className="nx-info-magic-item">
                    <summary><span className="nx-info-magic-icon">{definition.icon}</span><span><strong>{definition.label}</strong><small>{definition.id} · {definition.desc}</small></span><ChevronRight size={15} /></summary>
                    <div className="nx-info-magic-body">
                      <div className="nx-info-magic-meta"><div><strong>Syntax</strong><span>{definition.fields.map((field) => field.label).join(" · ") || "Inline-Syntax"}</span></div><div><strong>Wann nutzen?</strong><span>{MAGIC_USE_CASES[definition.id] ?? definition.desc}</span></div></div>
                      <div className="nx-info-code-head"><span>Beispiel</span><button type="button" onClick={() => void copy(`magic-${definition.id}`, example)}><ClipboardCopy size={13} />{copiedId === `magic-${definition.id}` ? "Kopiert" : "Kopieren"}</button></div>
                      <pre><code>{example}</code></pre>
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        </div>
      );
    }

    if (activeSection === "files") {
      return (
        <div className="nx-info-section-stack">
          <section className="nx-info-card">
            <div className="nx-info-card-heading"><FolderOpen size={18} /><div><span>Files-Modell</span><h2>Library, Workspace und Root sind drei verschiedene Dinge</h2></div></div>
            <div className="nx-info-concept-grid">
              <article><span>1</span><strong>Library</strong><p>Die gesamte lokale Nexus-Bibliothek: Notes, Code, Tasks, Reminders und Canvas. „All Files“ zeigt diesen Gesamtbestand.</p></article>
              <article><span>2</span><strong>Workspace</strong><p>Eine benannte Projektzuordnung innerhalb von Nexus. Aktivierst du einen Workspace-Filter, siehst du nur zugewiesene Inhalte.</p></article>
              <article><span>3</span><strong>Root Folder</strong><p>Ein von dir gewählter Ordner auf diesem Gerät für lokale Dateiaktionen. Kein Workspace erhält automatisch Zugriff darauf.</p></article>
            </div>
            <div className="nx-info-path-flow"><span>Lokaler Nexus-Inhalt</span><ArrowRight size={14} /><span>optional einem Workspace zuweisen</span><ArrowRight size={14} /><span>bewusst importieren/exportieren oder Root verwenden</span></div>
          </section>
          <section className="nx-info-card">
            <div className="nx-info-card-heading"><ShieldCheck size={18} /><div><span>Sicher arbeiten</span><h2>Scope vor Aktion prüfen</h2></div></div>
            <ul className="nx-info-check-list">
              <li><CheckCircle2 size={15} />„All Files“ bedeutet Library-Scope, nicht den aktiven Workspace.</li>
              <li><CheckCircle2 size={15} />Ein Workspace zeigt nur zugewiesene Inhalte; „Unassigned“ hilft beim Aufräumen.</li>
              <li><CheckCircle2 size={15} />Auto-Sync benötigt zuerst einen Root; ohne Root darf nichts still aktiviert werden.</li>
              <li><CheckCircle2 size={15} />Import und Export sind bewusste Aktionen. Vorher Dateiname, Ziel und sensible Inhalte prüfen.</li>
            </ul>
            <div className="nx-info-action-row"><span /><button type="button" disabled={!onOpenView} onClick={() => openGuideView("files")}>Files öffnen <ArrowRight size={14} /></button></div>
          </section>
        </div>
      );
    }

    if (activeSection === "canvas") {
      return (
        <div className="nx-info-section-stack">
          <section className="nx-info-card">
            <div className="nx-info-card-heading"><GitBranch size={18} /><div><span>Canvas-Handbuch</span><h2>Von einer Kernidee zu einem lesbaren Graph</h2></div></div>
            <p>Starte mit einem zentralen Node und ergänze nur Beziehungen, die eine Frage beantworten. Auto-Layout ist eine Aufräumhilfe, kein Ersatz für eine bewusste Informationsarchitektur.</p>
            <div className="nx-info-feature-list">{CANVAS_FEATURES.map(([title, body]) => <article key={title}><strong>{title}</strong><span>{body}</span></article>)}</div>
          </section>
          <section className="nx-info-card">
            <div className="nx-info-card-heading"><Keyboard size={18} /><div><span>Bedienfolge</span><h2>Ein sicherer erster Canvas</h2></div></div>
            <ol className="nx-info-steps"><li><span>1</span><div><strong>Canvas wählen oder erstellen</strong><p>Ein Projekt pro Canvas hält Suche, Export und Fokus verständlich.</p></div></li><li><span>2</span><div><strong>Hub-Node anlegen</strong><p>Titel und Ziel klären, dann weitere Nodes ergänzen.</p></div></li><li><span>3</span><div><strong>Verbinden und beschriften</strong><p>Nur relevante Beziehungen anlegen; Inspector für Metadaten nutzen.</p></div></li><li><span>4</span><div><strong>Fit, Layout, Export prüfen</strong><p>Großen Graph testen und vor Export sensible Inhalte prüfen.</p></div></li></ol>
            <div className="nx-info-action-row"><div className="nx-info-key-row">{VIEW_GUIDES.find((guide) => guide.id === "canvas")?.shortcuts.map((key) => <kbd key={key}>{key}</kbd>)}</div><button type="button" disabled={!onOpenView} onClick={() => openGuideView("canvas")}>Canvas öffnen <ArrowRight size={14} /></button></div>
          </section>
        </div>
      );
    }

    if (activeSection === "shortcuts") {
      return (
        <section className="nx-info-card">
          <div className="nx-info-card-heading"><Keyboard size={18} /><div><span>Tastatur</span><h2>Shortcuts nach View</h2></div></div>
          <p>Shortcuts gelten nur, wenn kein Textfeld die Eingabe benötigt. Mit <kbd>Esc</kbd> schließt du üblicherweise Dialoge oder verlässt einen Modus.</p>
          <div className="nx-info-shortcut-grid">{VIEW_GUIDES.map((guide) => { const item = MAIN_VIEW_REGISTRY[guide.id]; return <article key={guide.id}><strong>{item?.label ?? guide.id}</strong><div>{guide.shortcuts.map((key) => <kbd key={key}>{key}</kbd>)}</div><button type="button" disabled={!onOpenView} onClick={() => openGuideView(guide.id)}>Öffnen <ExternalLink size={12} /></button></article>; })}</div>
        </section>
      );
    }

    const statusCounts = VIEW_GUIDES.reduce<Record<ViewStatus, number>>((counts, guide) => { counts[guide.status] += 1; return counts; }, { fertig: 0, teilweise: 0, entwicklung: 0 });
    return (
      <div className="nx-info-section-stack">
        <section className="nx-info-card">
          <div className="nx-info-card-heading"><ShieldCheck size={18} /><div><span>Stand: Juli 2026</span><h2>View-Vollständigkeitsmatrix</h2></div></div>
          <p>Die Matrix verbindet die produktive Main-Registry mit dem tatsächlich vorhandenen View-Code. „Fertig / RC“ bedeutet: Kernflow vorhanden, nicht „bugfrei ohne weitere Smokes“.</p>
          <div className="nx-info-status-summary"><span className="is-fertig">{statusCounts.fertig} Fertig / RC</span><span className="is-teilweise">{statusCounts.teilweise} Teilweise</span><span className="is-entwicklung">{statusCounts.entwicklung} Fehlend / Entwicklung</span></div>
          <div className="nx-info-matrix-wrap"><table><thead><tr><th>View</th><th>Registry</th><th>Status</th><th>Offen / Grenze</th></tr></thead><tbody>{MAIN_CORE_VIEW_IDS.map((viewId) => { const guide = VIEW_GUIDES.find((entry) => entry.id === viewId); const item = MAIN_VIEW_REGISTRY[viewId]; if (!guide) return <tr key={viewId}><td>{item?.label ?? viewId}</td><td>registriert</td><td><span className="nx-info-status is-entwicklung">Doku fehlt</span></td><td>Guide und Code-Status prüfen.</td></tr>; return <tr key={viewId}><td><button type="button" onClick={() => { setActiveSection("views"); setActiveViewId(viewId); }}>{item?.label ?? viewId}</button></td><td>{item?.heavy ? "registriert · heavy" : "registriert"}</td><td><span className={`nx-info-status is-${guide.status}`}>{STATUS_LABEL[guide.status]}</span></td><td>{guide.gaps.join(" · ")}</td></tr>; })}</tbody></table></div>
        </section>
        <section className="nx-info-card">
          <div className="nx-info-card-heading"><Wrench size={18} /><div><span>Release-Vertrag</span><h2>Vor jedem RC erneut prüfen</h2></div></div>
          <div className="nx-info-release-grid"><article><strong>Build & Typen</strong><span>Main-Build, Core-Verträge und Ecosystem-Verifier.</span></article><article><strong>Security</strong><span>Keine Secrets im Bundle/Export, Tier- und Rollenprüfungen nicht umgehen.</span></article><article><strong>Persistenz</strong><span>Erstellen, bearbeiten, reloaden und Restore-Pfade testen.</span></article><article><strong>Visuell</strong><span>1280 px, enge Desktopbreite, Mobile, Tastatur, Screenreader-Namen und Body-Overflow prüfen.</span></article></div>
        </section>
      </div>
    );
  };

  return (
    <div className="nx-info-root" style={{ "--nx-info-accent": theme.accent, "--nx-info-accent-2": theme.accent2 } as React.CSSProperties}>
      <header className="nx-info-hero">
        <div><span className="nx-info-kicker"><BookOpen size={13} /> Nexus Handbuch</span><h1>Verstehen, ausprobieren, release-sicher arbeiten.</h1><p>Vollständige Referenz für Views, lokale Daten, Markdown, Nexus Magic, Files und Canvas.</p></div>
        <div className="nx-info-hero-actions">
          {onOpenWalkthrough ? <button type="button" onClick={onOpenWalkthrough}><Sparkles size={15} /> Geführten Rundgang starten</button> : null}
          <a href="https://nexusproject.dev" target="_blank" rel="noreferrer">Website <ExternalLink size={13} /></a>
        </div>
      </header>

      <div className="nx-info-search-row">
        <label><Search size={15} /><span className="sr-only">Handbuch durchsuchen</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Views, Features oder Magic Block suchen …" /></label>
        <span>{MAIN_CORE_VIEW_IDS.length} Registry-Views · {NOTES_MAGIC_DEFINITIONS_WITH_PLANNING.length} Magic-Definitionen</span>
      </div>

      <div className="nx-info-shell">
        <nav className="nx-info-nav" aria-label="Handbuch-Inhalt">
          {INFO_SECTIONS.map((section) => { const Icon = section.icon; return <button key={section.id} type="button" className={activeSection === section.id ? "is-active" : undefined} aria-current={activeSection === section.id ? "page" : undefined} onClick={() => setActiveSection(section.id)}><Icon size={16} /><span><strong>{section.label}</strong><small>{section.detail}</small></span><ChevronRight size={14} /></button>; })}
          <div className="nx-info-nav-note"><ShieldCheck size={15} /><span>Handbuch-Aktionen verwenden immer den normalen View-Wechsel und umgehen keine API-/Tier-Prüfung.</span></div>
        </nav>
        <main className="nx-info-content" id={`info-${activeSection}`} tabIndex={-1}>{renderSection()}</main>
      </div>

      <section className="nx-info-template-strip" aria-label="Template Packs">
        <div><span>Starter Kits</span><strong>{NEXUS_TEMPLATE_PACKS.length} Template Packs für Notes, Tasks, Canvas, Code und Flux</strong></div>
        <div>{NEXUS_TEMPLATE_PACKS.slice(0, 5).map((pack) => <button type="button" key={pack.id} onClick={() => void copy(`pack-${pack.id}`, buildNexusTemplatePackMarkdown(pack))}>{copiedId === `pack-${pack.id}` ? "Kopiert" : pack.title}<ClipboardCopy size={12} /></button>)}</div>
      </section>
    </div>
  );
}
