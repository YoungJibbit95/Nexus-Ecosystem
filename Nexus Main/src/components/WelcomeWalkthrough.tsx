import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Code2,
  Columns,
  FileText,
  FolderOpen,
  GitBranch,
  HardDrive,
  Monitor,
  Settings,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wand2,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Glass } from "./Glass";
import { useTheme } from "../store/themeStore";
import type { View } from "./Sidebar";

type WalkthroughCard = {
  title: string;
  body: string;
};

type WalkthroughSetupTask = {
  id: string;
  title: string;
  detail: string;
  view?: View;
  externalHref?: string;
  actionLabel?: string;
};

type WalkthroughStep = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  view?: View;
  icon: LucideIcon;
  accent: string;
  bullets: string[];
  cards: WalkthroughCard[];
  keybinds?: string[];
  externalHref?: string;
  externalLabel?: string;
  markdownExample?: string[];
  setupTasks?: WalkthroughSetupTask[];
};

const WALKTHROUGH_SETUP_STORAGE_KEY = "nx-main-walkthrough-setup-v1";

const STEPS: WalkthroughStep[] = [
  {
    id: "hello",
    eyebrow: "Start",
    title: "Willkommen in Nexus",
    summary:
      "Nexus ist dein persönlicher Workspace zum Denken, Planen, Schreiben und Strukturieren. Dieser Rundgang zeigt dir die wichtigsten Orte und erklärt dir, wie du am besten mit Nexus arbeiten kannst.",
    view: "dashboard",
    icon: Sparkles,
    accent: "#22d3ee",
    bullets: [
      "Die App startet API-connected: Somit können wir feststellen, welche Tier dein Account verwenden darf. Zudem ist dies nötig um spätere Cloud-Connections zu ermöglichen.",
      "Deine eigentlichen Arbeitsdaten und Dateien bleiben jedoch lokal im Workspace.",
      "Du kannst später jederzeit über die Info-View oder Settings wieder hierher zurückkommen.",
    ],
    cards: [
      {
        title: "Erst orientieren",
        body: "Dashboard und Info zeigen dir, wo du bist und was gerade wichtig ist.",
      },
      {
        title: "Dann arbeiten",
        body: "Notes, Tasks, Reminders und Dateien sind die täglichen Hauptflächen.",
      },
      {
        title: "Dann verfeinern",
        body: "Settings zum einstellen von Themes und Layouts, Flux, Code und DevTools helfen beim Polieren, Automatisieren und Releasen. Letztere sind jedoch nicht im Free-Modell enthalten.",
      },
    ],
  },
  {
    id: "account",
    eyebrow: "Account",
    title: "Account und App-Login",
    summary:
      "Du kannst deinen Account auf nexusproject.dev erstellen und dich mit denselben Daten in Nexus anmelden. Die Website ist für Account-Verwaltung, Abos, Lizenzen und Downloads gedacht. Infos zum Projekt findest du dort auch.",
    view: "settings",
    icon: ShieldCheck,
    accent: "#34d399",
    externalHref: "https://nexusproject.dev/?page=account",
    externalLabel: "Account-Seite öffnen",
    bullets: [
      "Auf der Website erstellst du deinen Account, verwaltest Abo, Lizenz und Tier.",
      "In der App meldest du dich mit demselben Account an, damit der API-Bootflow freigegeben wird.",
      '"Angemeldet bleiben" speichert nur den API-Session-Token auf diesem Gerät, niemals dein Passwort.',
    ],
    cards: [
      {
        title: "Free",
        body: "Dashboard, Notes, Tasks, Reminders und Files als Basis-Workspace.",
      },
      {
        title: "Pro / Lifetime",
        body: "Canvas, Code, DevTools und Mobile Access fuer grössere Workflows.",
      },
      {
        title: "Lifetime Pro",
        body: "Erweiterte Pro-Flächen inklusive Flux und künftige Systeme wie zb. Clouds für Unternehmen.",
      },
    ],
  },
  {
    id: "setup",
    eyebrow: "Setup",
    title: "Dann fangen wir mal an...",
    summary:
      "Wenn du diese Checkliste einmal durchgehst, hast du Account, Workspace, erste Dateien und die wichtigsten Views praktisch berührt. Du musst nicht alles sofort erledigen: Nexus merkt sich deinen Fortschritt lokal auf diesem Geraet.",
    view: "dashboard",
    icon: CheckCircle2,
    accent: "#06b6d4",
    bullets: [
      "Arbeite die Punkte der Reihe nach ab, wenn du Nexus frisch einrichtest.",
      "Jeder Punkt fuehrt dich direkt zur passenden View oder zur Account-Seite.",
      "Die Checkliste speichert nur erledigt/nicht erledigt, keine Account- oder Workspace-Daten.",
    ],
    cards: [
      {
        title: "Schnellstart",
        body: "Account, Workspace, erste Note, erste Task und erste Canvas-Node reichen fuer einen guten Start.",
      },
      {
        title: "Template Packs",
        body: "Info bietet Starter Kits fuer Notes, Task Boards, Canvas Layouts, Code Snippets und Flux Workflows.",
      },
      {
        title: "Spaeter fortsetzen",
        body: "Du kannst den Walkthrough erneut oeffnen und offene Punkte nachholen.",
      },
    ],
    setupTasks: [
      {
        id: "account-page",
        title: "Account auf der Website erstellen oder pruefen",
        detail:
          "Oeffne nexusproject.dev, erstelle deinen Account und merke dir, welches Tier freigeschaltet ist.",
        externalHref: "https://nexusproject.dev/?page=account",
        actionLabel: "Website",
      },
      {
        id: "app-login",
        title: "In der App anmelden und Remember-Me bewusst setzen",
        detail:
          "Nutze denselben Account in Nexus Main. Remember-Me speichert nur den Session-Token, nicht dein Passwort.",
        view: "settings",
        actionLabel: "Login/Settings",
      },
      {
        id: "workspace-folder",
        title: "Workspace-Ordner festlegen",
        detail:
          "Lege in Files einen nachvollziehbaren Ordner fuer Exporte, Assets und Projektdateien fest.",
        view: "files",
        actionLabel: "Files",
      },
      {
        id: "import-data",
        title: "Vorhandene Daten optional importieren",
        detail:
          "Wenn du schon Markdown, Projektdateien oder Exporte hast, importiere sie erst nach dem Workspace-Ordner.",
        view: "files",
        actionLabel: "Import",
      },
      {
        id: "first-note",
        title: "Erste Projekt-Note schreiben",
        detail:
          "Erstelle eine kleine Startnotiz mit Ziel, naechstem Schritt und einem Link wie [[Projekt Hub]].",
        view: "notes",
        actionLabel: "Notes",
      },
      {
        id: "first-task",
        title: "Eine Task und einen Reminder anlegen",
        detail:
          "Mache aus der Startnotiz eine konkrete Aufgabe und haenge bei Bedarf eine Erinnerung dran.",
        view: "tasks",
        actionLabel: "Tasks",
      },
      {
        id: "first-canvas",
        title: "Canvas-Hub fuer das Projekt erstellen",
        detail:
          "Baue eine Hub-Node und haenge Goal, Risk, Decision oder Task Nodes daran.",
        view: "canvas",
        actionLabel: "Canvas",
      },
      {
        id: "template-pack",
        title: "Ein Template Pack als Startpunkt kopieren",
        detail:
          "Oeffne Info -> Template Packs und kopiere ein Pack fuer Note, Board, Canvas, Code oder Flux.",
        view: "info",
        actionLabel: "Templates",
      },
      {
        id: "info-guide",
        title: "InfoView als Handbuch merken",
        detail:
          "Oeffne Info, wenn du spaeter View-Guides, Shortcuts oder Release-Hinweise suchst.",
        view: "info",
        actionLabel: "Info",
      },
    ],
  },
  {
    id: "dashboard",
    eyebrow: "View 1",
    title: "Dashboard: dein Startpunkt",
    summary:
      "Das Dashboard sammelt Heute, Continue, Runtime Health und wichtige Workspace-Signale. Es ist die beste erste Station nach dem Login.",
    view: "dashboard",
    icon: BarChart3,
    accent: "#64d2ff",
    bullets: [
      "Today zeigt dir offene Arbeit, Erinnerungen und aktuelle Signale.",
      "Continue bringt dich schnell zurueck zu Notizen, Tasks oder Canvas-Arbeit.",
      "Der Layout Editor laesst dich Widgets verschieben, tauschen und ausblenden.",
    ],
    cards: [
      {
        title: "Wenn du neu bist",
        body: "Starte hier, pruefe offene Tasks und erstelle eine erste Notiz oder Aufgabe.",
      },
      {
        title: "Wenn du wiederkommst",
        body: "Nutze Continue, statt dich durch alle Views zu klicken.",
      },
    ],
    keybinds: ["Quick Capture", "Layout bearbeiten", "Continue"],
  },
  {
    id: "notes",
    eyebrow: "View 2",
    title: "Notes: schreiben, ordnen, verlinken",
    summary:
      "Notes ist dein Wissenszentrum. Du kannst normale Markdown-Notizen schreiben, Readmes bauen, Tags nutzen, Emojis einsetzen und Magic Blocks rendern.",
    view: "notes",
    icon: FileText,
    accent: "#a78bfa",
    bullets: [
      "Nutze Split Preview, wenn du beim Schreiben direkt sehen willst, wie Markdown aussieht.",
      "Tags, Pins, Suche und Backlinks helfen dir, Wissen spaeter wiederzufinden.",
      "Der Emoji Picker und Blocks/Magic-Menue sind fuer schnellere, schoenere Dokumente gedacht.",
    ],
    cards: [
      {
        title: "Starter-Readmes",
        body: "Willkommen, View Guide, Canvas Guide, Ops Guide und Markdown Showcase sind direkt enthalten.",
      },
      {
        title: "Verlinkung",
        body: "Mit [[Wiki Links]] kannst du Notes und Canvas-Strukturen gedanklich verbinden.",
      },
    ],
    keybinds: ["Ctrl/Cmd + S", "Ctrl/Cmd + B", "Ctrl/Cmd + K"],
  },
  {
    id: "markdown",
    eyebrow: "System",
    title: "Markdown und Notes Magic",
    summary:
      "Nexus kann klassisches Markdown plus eigene Magic Blocks. Das ist ideal fuer Statusseiten, Guides, Checklisten, Release-Notizen und kleine Dashboards.",
    view: "notes",
    icon: Wand2,
    accent: "#f97316",
    bullets: [
      "Klassisch: Ueberschriften, Listen, Tabellen, Code, Quotes, Links und Checkboxes.",
      "Magic: nexus-list, nexus-checklist, nexus-progress, nexus-timeline, nexus-kanban, nexus-metrics, nexus-card und nexus-callout.",
      "Tipp: Starte mit dem Markdown Showcase in Notes und kopiere dir gute Blocks in eigene Projekt-Notizen.",
    ],
    cards: [
      {
        title: "Fuer Planung",
        body: "Kanban, Steps und Checklists machen aus Rohtext klare naechste Schritte.",
      },
      {
        title: "Fuer Review",
        body: "Metrics, Progress und Callouts zeigen Status, Risiken und Entscheidungen auf einen Blick.",
      },
    ],
    markdownExample: [
      "```nexus-checklist",
      "Account erstellt | done",
      "Dashboard geprueft | todo",
      "Erste Projekt-Note geschrieben | todo",
      "```",
    ],
  },
  {
    id: "tasks-reminders",
    eyebrow: "Views 3-4",
    title: "Tasks und Reminders: Arbeit verlaesslich machen",
    summary:
      "Tasks bewegt echte Arbeit. Reminders holt dich zur richtigen Zeit zurueck. Zusammen verhindern sie, dass gute Ideen in Notes liegen bleiben.",
    view: "tasks",
    icon: Columns,
    accent: "#ff9f0a",
    bullets: [
      "Tasks hat Board, Focus, Due Soon, High Priority, Blocked und Batch-Triage.",
      "Reminders koennen einmalig oder wiederholend sein und lassen sich snoozen.",
      "Tasks, Reminders und Notes koennen miteinander verknuepft werden.",
    ],
    cards: [
      {
        title: "Anfaenger-Workflow",
        body: "Schreibe eine Idee in Notes, mache daraus eine Task, haenge bei Bedarf einen Reminder dran.",
      },
      {
        title: "Saubere Triage",
        body: "Blocked, Deadline, Priority und Tags zeigen dir, was wirklich Aufmerksamkeit braucht.",
      },
    ],
    keybinds: ["Neue Task", "Snooze", "Batch Mode"],
  },
  {
    id: "files",
    eyebrow: "View 5",
    title: "Files: dein Workspace-Hub",
    summary:
      "Files verbindet lokale Ordner, Exporte und App-Daten. Wenn du mit echten Projekten arbeitest, ist der Workspace-Ordner der wichtigste Setup-Schritt.",
    view: "files",
    icon: HardDrive,
    accent: "#5e5ce6",
    bullets: [
      "Lege einen Workspace-Ordner fest, damit Exporte und Projektdateien an einem nachvollziehbaren Ort landen.",
      "Recent, Pinned, Unassigned und Workspace-Views helfen beim Aufraeumen.",
      "Import/Export bleibt manuell moeglich, Auto-Sync kann spaeter dazukommen.",
    ],
    cards: [
      {
        title: "Empfohlen",
        body: "Erstelle einen Ordner wie Nexus Workspace und nutze ihn fuer Notes, Code, Assets und Exporte.",
      },
      {
        title: "Sicher",
        body: "Der Walkthrough aendert keine Dateien. Du entscheidest selbst, welchen Ordner Nexus nutzt.",
      },
    ],
  },
  {
    id: "canvas",
    eyebrow: "View 6",
    title: "Canvas: Denken wie in Obsidian, visuell",
    summary:
      "Canvas ist fuer Zusammenhaenge: Projekte, Ziele, Entscheidungen, Risiken, Tasks, Markdown-Nodes und Wiki-Links als sichtbarer Graph.",
    view: "canvas",
    icon: GitBranch,
    accent: "#30d158",
    bullets: [
      "Doppelklick auf leere Flaeche erstellt schnell neue Nodes.",
      "Ctrl/Cmd + P oeffnet Jump Search, wenn die Map groesser wird.",
      "Magic Templates erzeugen Meeting Hubs, Delivery Maps und Projekt-Strukturen schneller.",
    ],
    cards: [
      {
        title: "Guter Start",
        body: "Baue eine Hub-Node, dann Goal, Risk, Decision und Task-Nodes drumherum.",
      },
      {
        title: "Obsidian-Gefuehl",
        body: "[[Wiki Links]] helfen, Notes und Nodes logisch zu verbinden.",
      },
    ],
    keybinds: ["Ctrl/Cmd + P", "Ctrl/Cmd + M", "F", "G"],
  },
  {
    id: "flux",
    eyebrow: "View 7",
    title: "Flux: Queue, Bottlenecks und sichere Triage",
    summary:
      "Flux ist nicht noch eine To-do-Liste, sondern die Ops-Ebene ueber Tasks und Reminders. Sie zeigt Engpaesse und macht naechste Aktionen klar.",
    view: "flux",
    icon: Zap,
    accent: "#f59e0b",
    bullets: [
      "Queue Presets zeigen Overdue, Due Soon, High Priority, Focus und Backlog.",
      "Bottlenecks fuehren dich zu echten Tasks oder Reminders, statt nur Warnungen zu zeigen.",
      "Flux markiert laufende Tasks nicht heimlich Done. Kritische Statuswechsel bleiben bewusst.",
    ],
    cards: [
      {
        title: "Wann nutzen?",
        body: "Wenn viele offene Dinge da sind und du nicht weisst, womit du anfangen sollst.",
      },
      {
        title: "Release-tauglich",
        body: "Triage hilft, aber macht keine unsichtbaren Veraenderungen an laufender Arbeit.",
      },
    ],
  },
  {
    id: "code-devtools",
    eyebrow: "Views 8-9",
    title: "Code und DevTools: bauen, testen, polieren",
    summary:
      "Code ist fuer Scratch-Dateien, Snippets und kleine Experimente. DevTools ist die interne Builder- und Diagnoseflaeche fuer fortgeschrittene Arbeit.",
    view: "code",
    icon: Code2,
    accent: "#bf5af2",
    bullets: [
      "Code bietet Editor, Quick Open, Run/Preview und Output-History.",
      "DevTools ist fuer Builder-Flows, Visual Tests und interne Release-Arbeit gedacht.",
      "Je nach Tier oder API-Freigabe koennen diese Views gesperrt sein.",
    ],
    cards: [
      {
        title: "Prototyping",
        body: "Nutze Code fuer kleine Tests, bevor du daraus echte Projektdateien machst.",
      },
      {
        title: "Admin/Dev Kontext",
        body: "DevTools bleibt bewusst getrennt von normalen Arbeitsviews.",
      },
    ],
    keybinds: ["Run", "Preview", "Output"],
  },
  {
    id: "settings-info",
    eyebrow: "Views 10-11",
    title: "Settings und Info: anpassen und nachschlagen",
    summary:
      "Settings macht Nexus persoenlich: Themes, Glow, Panel Backgrounds, App Backgrounds, Motion, Dichte und Accessibility. Info ist das Handbuch in der App.",
    view: "settings",
    icon: Settings,
    accent: "#8e8e93",
    bullets: [
      "Themes und Backgrounds sollen wie die Product Page wirken: glassy, klar, farbig, aber nicht chaotisch.",
      "Accessibility, Reduced Motion und Dichte helfen, Nexus an dein Geraet und deine Augen anzupassen.",
      "Info enthaelt Guides pro View, Architektur, Release-Hinweise und Troubleshooting.",
    ],
    cards: [
      {
        title: "Wenn etwas komisch aussieht",
        body: "Pruefe Panel Background, App Background, Glow und Motion Profile in Settings.",
      },
      {
        title: "Wenn du etwas suchst",
        body: "Info ist der Ort fuer View-Guides, Features und die groesseren Nexus-Konzepte.",
      },
    ],
  },
  {
    id: "cross-view",
    eyebrow: "Systeme",
    title: "View-uebergreifende Systeme",
    summary:
      "Nexus wird stark, wenn die Views zusammenarbeiten: Links, Tags, Workspace-Dateien, Terminal, Command-Flows, API Access und Release Checks greifen ineinander.",
    view: "info",
    icon: TerminalSquare,
    accent: "#38bdf8",
    bullets: [
      "Links und Backlinks verbinden Notes, Canvas, Tasks und Reminders.",
      "Terminal und Command Palette helfen, schnell Views zu wechseln oder neue Items anzulegen.",
      "API Access steuert, welche Views dein Account nutzen darf.",
      "Release Gates pruefen Build, Encoding, Ecosystem-Vertraege und Installer-Ziele.",
    ],
    cards: [
      {
        title: "Merksatz",
        body: "Notes sammelt Wissen, Tasks bewegt Arbeit, Canvas zeigt Struktur, Flux entscheidet Fokus.",
      },
      {
        title: "Guter erster Test",
        body: "Login, Dashboard, Note, Task, Reminder, Canvas-Node und Files-Workspace einmal durchgehen.",
      },
    ],
  },
  {
    id: "next",
    eyebrow: "Loslegen",
    title: "Deine ersten 10 Minuten",
    summary:
      "Wenn du Nexus gerade zum ersten Mal nutzt, brauchst du keinen perfekten Workflow. Ein kleiner sauberer Start reicht.",
    view: "dashboard",
    icon: CheckCircle2,
    accent: "#22c55e",
    bullets: [
      "1. Account pruefen und optional angemeldet bleiben aktivieren.",
      "2. Workspace-Ordner in Files setzen.",
      "3. Eine erste Projekt-Note in Notes schreiben.",
      "4. Eine Task mit Deadline oder Reminder anlegen.",
      "5. Eine Canvas-Hub-Node fuer das Projekt erstellen.",
      "6. Info offen lassen, wenn du spaeter etwas nachschlagen willst.",
    ],
    cards: [
      {
        title: "Keine Angst vor Settings",
        body: "Du kannst spaeter alles optisch anpassen, ohne deine Arbeitsdaten zu resetten.",
      },
      {
        title: "Guides bleiben da",
        body: "Die Starter-Readmes in Notes und die InfoView wachsen mit Nexus weiter.",
      },
    ],
  },
];

const clampStepIndex = (index: number) =>
  Math.max(0, Math.min(STEPS.length - 1, index));

const readSetupTaskIds = () => {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(WALKTHROUGH_SETUP_STORAGE_KEY) || "[]",
    );
    return new Set<string>(
      Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === "string")
        : [],
    );
  } catch {
    return new Set<string>();
  }
};

const writeSetupTaskIds = (ids: Set<string>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      WALKTHROUGH_SETUP_STORAGE_KEY,
      JSON.stringify([...ids]),
    );
  } catch {
    // Onboarding progress is a local convenience, not a critical dependency.
  }
};

export function WelcomeWalkthrough({
  open,
  onClose,
  onOpenView,
  availableViews = [],
}: {
  open: boolean;
  onClose: () => void;
  onOpenView: (view: View) => void;
  availableViews?: View[];
}) {
  const t = useTheme();
  const [index, setIndex] = useState(0);
  const [setupTaskIds, setSetupTaskIds] = useState(() => readSetupTaskIds());
  const step = useMemo(() => STEPS[clampStepIndex(index)], [index]);
  const availableSet = useMemo(() => new Set(availableViews), [availableViews]);
  const canOpenStepView = Boolean(
    step.view && (availableViews.length === 0 || availableSet.has(step.view)),
  );
  const Icon = step.icon;
  const setupTasks = step.setupTasks || [];
  const setupDoneCount = setupTasks.filter((task) =>
    setupTaskIds.has(task.id),
  ).length;
  const setupPercent =
    setupTasks.length > 0
      ? Math.round((setupDoneCount / setupTasks.length) * 100)
      : 0;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step.view || !canOpenStepView) return;
    onOpenView(step.view);
  }, [canOpenStepView, onOpenView, open, step.view]);

  if (!open) return null;

  const toggleSetupTask = (id: string, checked?: boolean) => {
    const next = new Set(setupTaskIds);
    if (checked ?? !next.has(id)) next.add(id);
    else next.delete(id);
    setSetupTaskIds(next);
    writeSetupTaskIds(next);
  };

  const resetSetupTasks = () => {
    const next = new Set<string>();
    setSetupTaskIds(next);
    writeSetupTaskIds(next);
  };

  return (
    <div
      className="nx-walkthrough-overlay"
      style={
        {
          "--nx-walkthrough-accent": step.accent || t.accent,
          "--nx-walkthrough-accent2": t.accent2,
        } as React.CSSProperties
      }
      onClick={onClose}
    >
      <Glass
        glow
        type="modal"
        className="nx-walkthrough-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="nx-walkthrough-hero">
          <div className="nx-walkthrough-brand">
            <div className="nx-walkthrough-brand-icon">
              <Sparkles size={17} />
            </div>
            <div>
              <div className="nx-walkthrough-kicker">Nexus v6 Erststart</div>
              <div className="nx-walkthrough-title">
                Kompletter Workspace-Walkthrough
              </div>
            </div>
          </div>

          <button
            className="nx-walkthrough-close"
            type="button"
            onClick={onClose}
            aria-label="Walkthrough schliessen"
          >
            <X size={15} />
          </button>
        </div>

        <div className="nx-walkthrough-shell">
          <aside
            className="nx-walkthrough-rail"
            aria-label="Walkthrough Kapitel"
          >
            <div className="nx-walkthrough-rail-note">
              <BookOpen size={15} />
              <span>
                Fuehrt dich einmal durch Account, Views, Markdown und Systeme.
              </span>
            </div>
            <div className="nx-walkthrough-step-list">
              {STEPS.map((item, itemIndex) => {
                const ItemIcon = item.icon;
                const active = itemIndex === index;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`nx-walkthrough-step-button${active ? " is-active" : ""}`}
                    onClick={() => setIndex(itemIndex)}
                  >
                    <span className="nx-walkthrough-step-icon">
                      <ItemIcon size={14} />
                    </span>
                    <span className="nx-walkthrough-step-copy">
                      <span>{item.eyebrow}</span>
                      <strong>{item.title}</strong>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="nx-walkthrough-content">
            <div className="nx-walkthrough-progress" aria-hidden="true">
              {STEPS.map((item, itemIndex) => (
                <span
                  key={item.id}
                  className={itemIndex <= index ? "is-filled" : undefined}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.section
                key={step.id}
                className="nx-walkthrough-page"
                initial={{ opacity: 0, y: 12, scale: 0.992 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.992 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="nx-walkthrough-page-head">
                  <div className="nx-walkthrough-page-icon">
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="nx-walkthrough-page-eyebrow">
                      Schritt {index + 1} von {STEPS.length} · {step.eyebrow}
                    </div>
                    <h2>{step.title}</h2>
                  </div>
                </div>

                <p className="nx-walkthrough-summary">{step.summary}</p>

                <div className="nx-walkthrough-grid">
                  <div className="nx-walkthrough-panel nx-walkthrough-panel-main">
                    <div className="nx-walkthrough-panel-label">
                      Was du wissen solltest
                    </div>
                    <ul>
                      {step.bullets.map((bullet) => (
                        <li key={bullet}>
                          <CheckCircle2 size={14} />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="nx-walkthrough-card-stack">
                    {step.cards.map((card) => (
                      <div
                        className="nx-walkthrough-mini-card"
                        key={card.title}
                      >
                        <strong>{card.title}</strong>
                        <span>{card.body}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {step.markdownExample ? (
                  <div className="nx-walkthrough-code-card">
                    <div>
                      <Wand2 size={14} />
                      Mini-Beispiel fuer Notes Magic
                    </div>
                    <pre>{step.markdownExample.join("\n")}</pre>
                  </div>
                ) : null}

                {setupTasks.length > 0 ? (
                  <div className="nx-walkthrough-setup-card">
                    <div className="nx-walkthrough-setup-head">
                      <div>
                        <div className="nx-walkthrough-panel-label">
                          Start-Checkliste
                        </div>
                        <strong>
                          {setupDoneCount}/{setupTasks.length} erledigt
                        </strong>
                        <span>
                          {setupPercent}% deines Erststarts sind vorbereitet.
                        </span>
                      </div>
                      <button
                        type="button"
                        className="nx-walkthrough-secondary-action"
                        onClick={resetSetupTasks}
                      >
                        Zuruecksetzen
                      </button>
                    </div>
                    <div
                      className="nx-walkthrough-setup-progress"
                      aria-hidden="true"
                    >
                      <span style={{ width: `${setupPercent}%` }} />
                    </div>
                    <div className="nx-walkthrough-setup-list">
                      {setupTasks.map((task) => {
                        const done = setupTaskIds.has(task.id);
                        const taskViewAvailable = Boolean(
                          task.view &&
                          (availableViews.length === 0 ||
                            availableSet.has(task.view)),
                        );
                        return (
                          <div
                            className={`nx-walkthrough-setup-item${done ? " is-done" : ""}`}
                            key={task.id}
                          >
                            <button
                              type="button"
                              className="nx-walkthrough-setup-check"
                              onClick={() => toggleSetupTask(task.id)}
                              aria-label={`${task.title} ${done ? "als offen markieren" : "als erledigt markieren"}`}
                            >
                              {done ? <CheckCircle2 size={16} /> : null}
                            </button>
                            <div>
                              <strong>{task.title}</strong>
                              <span>{task.detail}</span>
                            </div>
                            <div className="nx-walkthrough-setup-actions">
                              {task.externalHref ? (
                                <a
                                  className="nx-walkthrough-secondary-action"
                                  href={task.externalHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => toggleSetupTask(task.id, true)}
                                >
                                  <Monitor size={13} />
                                  {task.actionLabel || "Oeffnen"}
                                </a>
                              ) : null}
                              {task.view ? (
                                <button
                                  type="button"
                                  className="nx-walkthrough-secondary-action"
                                  disabled={!taskViewAvailable}
                                  onClick={() => {
                                    if (task.view && taskViewAvailable)
                                      onOpenView(task.view);
                                    toggleSetupTask(task.id, true);
                                  }}
                                >
                                  <FolderOpen size={13} />
                                  {task.actionLabel || task.view}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="nx-walkthrough-action-row">
                  <div className="nx-walkthrough-chip-row">
                    {step.keybinds?.map((keybind) => (
                      <span className="nx-walkthrough-chip" key={keybind}>
                        {keybind}
                      </span>
                    ))}
                    {step.view ? (
                      <span
                        className={`nx-walkthrough-chip${canOpenStepView ? "" : " is-muted"}`}
                      >
                        {canOpenStepView
                          ? `View: ${step.view}`
                          : `View gesperrt/nicht geladen: ${step.view}`}
                      </span>
                    ) : null}
                  </div>

                  <div className="nx-walkthrough-inline-actions">
                    {step.externalHref ? (
                      <a
                        className="nx-walkthrough-secondary-action"
                        href={step.externalHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Monitor size={13} />
                        {step.externalLabel || "Website oeffnen"}
                      </a>
                    ) : null}
                    {step.view ? (
                      <button
                        type="button"
                        className="nx-walkthrough-secondary-action"
                        disabled={!canOpenStepView}
                        onClick={() => {
                          if (step.view && canOpenStepView)
                            onOpenView(step.view);
                        }}
                      >
                        <FolderOpen size={13} />
                        View ansehen
                      </button>
                    ) : null}
                  </div>
                </div>
              </motion.section>
            </AnimatePresence>
          </main>
        </div>

        <div className="nx-walkthrough-footer">
          <button
            type="button"
            className="nx-walkthrough-nav-button"
            disabled={index === 0}
            onClick={() => setIndex((value) => clampStepIndex(value - 1))}
          >
            <ArrowLeft size={14} />
            Zurueck
          </button>

          <div className="nx-walkthrough-footer-center">
            <span>
              {Math.round(((index + 1) / STEPS.length) * 100)}% gelesen
            </span>
            <span>
              Du kannst den Guide spaeter in Info oder Settings erneut oeffnen.
            </span>
          </div>

          {index < STEPS.length - 1 ? (
            <button
              type="button"
              className="nx-walkthrough-primary-action"
              onClick={() => setIndex((value) => clampStepIndex(value + 1))}
            >
              Weiter
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="nx-walkthrough-primary-action"
              onClick={onClose}
            >
              Fertig starten
              <CheckCircle2 size={14} />
            </button>
          )}
        </div>
      </Glass>
    </div>
  );
}
