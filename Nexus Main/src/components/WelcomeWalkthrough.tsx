import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Code2,
  Columns,
  FileText,
  FolderOpen,
  GitBranch,
  HardDrive,
  Info,
  MonitorPlay,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Glass } from "./Glass";
import { useTheme } from "../store/themeStore";
import type { View } from "./Sidebar";
import "./walkthrough/WelcomeWalkthrough.css";

type TourTask = {
  id: string;
  title: string;
  detail: string;
  view?: View;
  externalHref?: string;
  actionLabel?: string;
};

type TourStep = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  view?: View;
  icon: LucideIcon;
  accent: string;
  learn: string[];
  tryThis?: string;
  shortcuts?: string[];
  task?: TourTask;
};

type PersistedTour = {
  index: number;
  completed: string[];
  tasks: string[];
};

const TOUR_STORAGE_KEY = "nx-main-guided-tour-v2";

const STEPS: TourStep[] = [
  {
    id: "welcome",
    eyebrow: "Start",
    title: "Willkommen in deinem Nexus Workspace",
    summary: "Dieser Rundgang führt dich kontrolliert durch die ganze App. Du kannst jede View kurz öffnen, dort etwas ausprobieren und über den Tour-Dock zurückkehren.",
    view: "dashboard",
    icon: Sparkles,
    accent: "#22d3ee",
    learn: [
      "Arbeitsinhalte und Einstellungen bleiben überwiegend lokal auf diesem Gerät.",
      "Die API prüft Login, Tier, freigeschaltete Views und den Release-Vertrag.",
      "Der Rundgang speichert nur Kapitel- und Checklistenfortschritt, keine Arbeitsinhalte.",
    ],
    tryThis: "Öffne das Dashboard und prüfe Today Layer sowie Continue Lane.",
  },
  {
    id: "account-setup",
    eyebrow: "Setup",
    title: "Account und lokales Setup bewusst trennen",
    summary: "Website und API verwalten Account, Tier und Downloads. Deine App-Daten werden dadurch nicht automatisch hochgeladen.",
    view: "settings",
    icon: ShieldCheck,
    accent: "#34d399",
    learn: [
      "Remember Me speichert einen Session-Token, niemals dein Passwort.",
      "Tier-gesperrte Views bleiben auch im Rundgang gesperrt.",
      "Sync oder externe Verbindungen müssen ausdrücklich eingerichtet werden.",
    ],
    task: {
      id: "account-checked",
      title: "Account und Tier geprüft",
      detail: "Öffne die Account-Seite und prüfe Login, Tier und verfügbare Downloads.",
      externalHref: "https://nexusproject.dev/?page=account",
      actionLabel: "Account-Seite",
    },
  },
  {
    id: "dashboard",
    eyebrow: "Orientieren",
    title: "Dashboard: Heute sehen und schnell erfassen",
    summary: "Das Dashboard ist dein ruhiger Startpunkt. Es soll Priorität zeigen, ohne alle Daten gleichzeitig auszubreiten.",
    view: "dashboard",
    icon: BarChart3,
    accent: "#38bdf8",
    learn: ["Today Layer zeigt fällige und aktive Arbeit.", "Continue Lane bringt dich in den letzten Kontext zurück.", "Quick Capture legt Gedanken ab, ohne den aktuellen Flow zu verlieren."],
    tryThis: "Öffne das Dashboard und starte eine Quick Capture – du entscheidest selbst, ob du sie speicherst.",
    shortcuts: ["Ctrl+1", "Ctrl+K"],
    task: { id: "dashboard-seen", title: "Dashboard verstanden", detail: "Today, Continue und Quick Capture einmal gefunden.", view: "dashboard", actionLabel: "Ausprobieren" },
  },
  {
    id: "calendar",
    eyebrow: "Planen",
    title: "Calendar: Tasks und Reminders in der Zeit",
    summary: "Calendar ist keine zweite Datenbank. Er ordnet deine vorhandenen Tasks und Reminders als Tag, Woche, Monat und Agenda ein.",
    view: "calendar",
    icon: CalendarDays,
    accent: "#ff2d9f",
    learn: ["Task nutzt eine Deadline, Reminder einen konkreten Zeitpunkt.", "Filter und Prioritäten reduzieren die sichtbare Menge.", "ICS-Import ist eine bewusste Aktion und zeigt vor dem Import eine Vorschau."],
    tryThis: "Wechsle zwischen Tag, Woche und Monat und öffne den Quick Composer.",
    shortcuts: ["Ctrl+2", "Heute", "Import"],
    task: { id: "calendar-seen", title: "Planungsansicht geprüft", detail: "Zeitraum und Quick Composer einmal ausprobiert.", view: "calendar", actionLabel: "Calendar öffnen" },
  },
  {
    id: "notes",
    eyebrow: "Wissen",
    title: "Notes: schreiben, verknüpfen und sauber rendern",
    summary: "Notes verbindet normales Markdown, GFM, Wikilinks, Backlinks und Nexus Magic mit lokaler Persistenz.",
    view: "notes",
    icon: FileText,
    accent: "#a78bfa",
    learn: ["Titel und Dateiname bleiben Teil der Notiz-Metadaten.", "Split/Preview hilft bei Tabellen, Code und Magic Blocks.", "Magic kann auch Tasks und Reminders skizzieren; verknüpft wird erst nach deiner Aktion."],
    tryThis: "Erstelle eine Testnotiz, gib ihr einen Titel und öffne Split oder Preview.",
    shortcuts: ["Ctrl+P", "Ctrl+S", "Ctrl+B", "Ctrl+K"],
    task: { id: "first-note", title: "Erste Notiz erstellt", detail: "Titel, kurzer Inhalt und Preview geprüft.", view: "notes", actionLabel: "Notes öffnen" },
  },
  {
    id: "tasks",
    eyebrow: "Umsetzen",
    title: "Tasks: Arbeit sichtbar bewegen",
    summary: "Tasks ist das operative Board für Status, Priorität, Deadline, Blocker, Subtasks und Fokus.",
    view: "tasks",
    icon: Columns,
    accent: "#30d158",
    learn: ["To Do, Doing und Done sind bewusste Zustandswechsel.", "Blocker und Priority helfen Flux bei der Triage.", "Focus Mode reduziert das Board auf die aktive Aufgabe."],
    tryThis: "Lege eine kleine Testaufgabe an, öffne Details und setze eine Priorität.",
    shortcuts: ["N", "B", "H", "1–5"],
    task: { id: "first-task", title: "Erste Task strukturiert", detail: "Titel, Status und Priorität einmal gesetzt.", view: "tasks", actionLabel: "Tasks öffnen" },
  },
  {
    id: "reminders",
    eyebrow: "Erinnern",
    title: "Reminders: ein Vertrag mit der Zukunft",
    summary: "Ein Reminder sollte beim Wiederauftauchen noch verständlich sein: klares Verb, Zeitpunkt und genügend Kontext.",
    view: "reminders",
    icon: Bell,
    accent: "#ff9f0a",
    learn: ["Snooze verschiebt bewusst, Done schließt ab.", "Wiederholung ist für echte Routinen gedacht.", "Systembenachrichtigungen benötigen die Gerätefreigabe; die View bleibt auch ohne sie nutzbar."],
    tryThis: "Öffne den Reminder-Composer und prüfe Zeitpunkt, Wiederholung und Kontextfelder.",
    shortcuts: ["Ctrl+4", "Snooze", "Health"],
    task: { id: "reminder-seen", title: "Reminder-Flow geprüft", detail: "Composer und Wiederholungsoptionen angesehen.", view: "reminders", actionLabel: "Reminders öffnen" },
  },
  {
    id: "files",
    eyebrow: "Ordnen",
    title: "Files: Library, Workspace und Root",
    summary: "Library ist der gesamte lokale Nexus-Bestand. Workspace ist eine Projektzuordnung. Root ist ein bewusst gewählter Geräteordner.",
    view: "files",
    icon: HardDrive,
    accent: "#06b6d4",
    learn: ["All Files zeigt die Library, nicht nur einen Workspace.", "Ein aktiver Workspace filtert auf zugewiesene Inhalte.", "Auto-Sync darf erst nach Root-Auswahl aktiv werden; Import und Export bleiben explizit."],
    tryThis: "Lege einen Workspace an oder wähle einen vorhandenen und vergleiche ihn mit All Files.",
    shortcuts: ["Ctrl+5", "Ctrl+F"],
    task: { id: "workspace-understood", title: "Workspace-Scope verstanden", detail: "All Files, Workspace und Root unterscheiden können.", view: "files", actionLabel: "Files öffnen" },
  },
  {
    id: "canvas",
    eyebrow: "Verbinden",
    title: "Canvas: Beziehungen räumlich denken",
    summary: "Canvas kombiniert Nodes, Kanten, Widgets, Inspector, Project Panel, Layouts und Magic Templates.",
    view: "canvas",
    icon: GitBranch,
    accent: "#bf5af2",
    learn: ["Starte mit einem Hub-Node und ergänze nur relevante Beziehungen.", "Auto-Layout hilft beim Aufräumen; du bleibst für Struktur verantwortlich.", "Canvas ist umfangreich und noch in Stabilisierung – speichere und teste große Änderungen bewusst."],
    tryThis: "Erstelle einen Node, ändere seinen Titel, verbinde ihn optional und nutze Fit View.",
    shortcuts: ["Ctrl+P", "Ctrl+M", "Ctrl+0", "F"],
    task: { id: "first-canvas-node", title: "Ersten Canvas-Node angelegt", detail: "Node erstellt, benannt und im Inspector gefunden.", view: "canvas", actionLabel: "Canvas öffnen" },
  },
  {
    id: "flux",
    eyebrow: "Priorisieren",
    title: "Flux: Druck sehen, Entscheidungen behalten",
    summary: "Flux fasst offene Arbeit, Blocker, fällige Reminder und Aktivität zusammen. Es unterstützt Triage, setzt aber nichts heimlich auf Done.",
    view: "flux",
    icon: Zap,
    accent: "#f43f9d",
    learn: ["Action Queue zeigt die nächste sinnvolle Prüfung.", "Bottlenecks führen zurück zu ihrer Quell-View.", "Ops Score ist ein Signal, keine objektive Produktivitätsnote."],
    tryThis: "Wähle einen Queue-Filter und öffne einen vorhandenen Kontext, ohne seinen Status zu ändern.",
    shortcuts: ["Ctrl+F", "Ctrl+Shift+B", "Ctrl+Shift+R"],
    task: { id: "flux-seen", title: "Flux-Triage verstanden", detail: "Queue, Bottleneck und Quellkontext einmal geprüft.", view: "flux", actionLabel: "Flux öffnen" },
  },
  {
    id: "code",
    eyebrow: "Experimentieren",
    title: "Code: kleine lokale Experimente",
    summary: "Code ist ein begrenzter Scratch-Editor für Snippets und kleine Dateien. Nexus Code bleibt die vollständige IDE-Oberfläche.",
    view: "code",
    icon: Code2,
    accent: "#818cf8",
    learn: ["Run/Preview startet nur nach deiner Aktion.", "Der lokale Runner sperrt gefährliche oder nicht unterstützte APIs.", "Dateien, Output und Tier-Zugriff bleiben transparent getrennt."],
    tryThis: "Öffne ein Beispiel, starte Preview oder Run und prüfe den Output.",
    shortcuts: ["Ctrl+P", "Ctrl+Enter", "Ctrl+S"],
  },
  {
    id: "settings",
    eyebrow: "Anpassen",
    title: "Settings: Wirkung vor Menge",
    summary: "Beginne mit einem Experience Preset und Theme. Passe Details erst an, wenn du weißt, welches Problem du lösen willst.",
    view: "settings",
    icon: Settings,
    accent: "#ec4899",
    learn: ["App Background liegt hinter Panels; Transparenz und Panel-Textur bestimmen seine Sichtbarkeit.", "Reduced Motion und Kontrast haben Vorrang vor Show-Effekten.", "Backup/Restore ist von Theme-Reset und Account-Funktionen getrennt."],
    tryThis: "Wähle ein Theme, ändere den App Background und vergleiche Glass mit einer deckenden Panel-Textur.",
    shortcuts: ["Ctrl+9", "Settings-Suche"],
    task: { id: "theme-chosen", title: "Darstellung bewusst gewählt", detail: "Theme, App Background und Panel-Textur verglichen.", view: "settings", actionLabel: "Settings öffnen" },
  },
  {
    id: "info",
    eyebrow: "Nachschlagen",
    title: "Info: das Handbuch bleibt in der App",
    summary: "Info dokumentiert jede View, Standard-Markdown, alle Magic-Definitionen, Files/Canvas, Shortcuts und den ehrlichen Release-Status.",
    view: "info",
    icon: Info,
    accent: "#64d2ff",
    learn: ["Suche nach View, Feature oder Magic Block.", "View öffnen nutzt den normalen tiergeprüften Wechsel.", "Die Vollständigkeitsmatrix trennt vorhandene Kernflows von offenem Stabilitätsbedarf."],
    tryThis: "Öffne Info und suche nach „nexus-task“, „Root“ oder „Canvas“.",
    shortcuts: ["Ctrl+0"],
    task: { id: "handbook-found", title: "Handbuch gefunden", detail: "Eine Referenz gesucht und eine View-Doku geöffnet.", view: "info", actionLabel: "Info öffnen" },
  },
  {
    id: "finish",
    eyebrow: "Fertig",
    title: "Dein Workspace ist bereit für echte Arbeit",
    summary: "Du musst nicht jede View täglich nutzen. Ein guter Nexus-Flow bleibt klein: Wissen in Notes, Arbeit in Tasks, Zeit in Calendar/Reminders, Struktur in Canvas und Engpässe in Flux.",
    view: "dashboard",
    icon: CheckCircle2,
    accent: "#30d158",
    learn: ["Der Rundgang kann jederzeit erneut geöffnet oder zurückgesetzt werden.", "Fortschritt ist nur eine lokale Orientierungshilfe.", "Bei Unsicherheit: Info öffnen und den Status einer View prüfen."],
    tryThis: "Kehre zum Dashboard zurück und beginne mit einem echten, kleinen Arbeitsstück.",
  },
];

const clampIndex = (value: number) => Math.max(0, Math.min(STEPS.length - 1, value));

const readProgress = (): PersistedTour => {
  if (typeof window === "undefined") return { index: 0, completed: [], tasks: [] };
  try {
    const raw = JSON.parse(window.localStorage.getItem(TOUR_STORAGE_KEY) || "null");
    return {
      index: clampIndex(Number(raw?.index) || 0),
      completed: Array.isArray(raw?.completed) ? raw.completed.filter((id: unknown): id is string => typeof id === "string") : [],
      tasks: Array.isArray(raw?.tasks) ? raw.tasks.filter((id: unknown): id is string => typeof id === "string") : [],
    };
  } catch {
    return { index: 0, completed: [], tasks: [] };
  }
};

const writeProgress = (progress: PersistedTour) => {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Die Tour bleibt auch ohne lokalen Speicher vollständig nutzbar.
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
  const theme = useTheme();
  const initialProgress = useMemo(() => readProgress(), []);
  const [index, setIndex] = useState(initialProgress.index);
  const [completed, setCompleted] = useState(() => new Set(initialProgress.completed));
  const [tasks, setTasks] = useState(() => new Set(initialProgress.tasks));
  const [exploring, setExploring] = useState<View | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const step = STEPS[index];
  const availableSet = useMemo(() => new Set(availableViews), [availableViews]);
  const canOpenStep = Boolean(step.view && (availableViews.length === 0 || availableSet.has(step.view)));
  const completedPercent = Math.round((completed.size / STEPS.length) * 100);
  const Icon = step.icon;

  useEffect(() => {
    if (!open) {
      setExploring(null);
      return;
    }
    window.setTimeout(() => dialogRef.current?.focus(), 0);
  }, [open, exploring]);

  useEffect(() => {
    if (!open) return;
    writeProgress({ index, completed: [...completed], tasks: [...tasks] });
  }, [completed, index, open, tasks]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (exploring) setExploring(null);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exploring, onClose, open]);

  if (!open) return null;

  const updateCompleted = (stepId: string, value = true) => {
    setCompleted((current) => {
      const next = new Set(current);
      if (value) next.add(stepId);
      else next.delete(stepId);
      return next;
    });
  };

  const toggleTask = (taskId: string) => {
    setTasks((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const startExploring = (view: View) => {
    if (!(availableViews.length === 0 || availableSet.has(view))) return;
    updateCompleted(step.id);
    onOpenView(view);
    setExploring(view);
  };

  const move = (nextIndex: number) => {
    updateCompleted(step.id);
    setIndex(clampIndex(nextIndex));
  };

  const resetTour = () => {
    setIndex(0);
    setCompleted(new Set());
    setTasks(new Set());
    setExploring(null);
    writeProgress({ index: 0, completed: [], tasks: [] });
  };

  if (exploring) {
    return (
      <aside className="nx-guided-tour-dock" style={{ "--nx-tour-accent": step.accent, "--nx-tour-accent-2": theme.accent2 } as React.CSSProperties} aria-label="Rundgang pausiert">
        <div className="nx-guided-tour-dock-progress" aria-hidden="true"><span style={{ width: `${Math.round(((index + 1) / STEPS.length) * 100)}%` }} /></div>
        <div className="nx-guided-tour-dock-icon"><MonitorPlay size={17} /></div>
        <div><strong>{step.title}</strong><span>Probiere die View aus. Deine Arbeitsdaten werden vom Rundgang nicht verändert.</span></div>
        <button type="button" onClick={() => setExploring(null)}><ArrowLeft size={14} /> Zurück zum Rundgang</button>
        <button type="button" className="nx-guided-tour-dock-close" onClick={onClose} aria-label="Rundgang schließen"><X size={14} /></button>
      </aside>
    );
  }

  return (
    <div className="nx-walkthrough-overlay nx-guided-tour-overlay" style={{ "--nx-walkthrough-accent": step.accent, "--nx-walkthrough-accent2": theme.accent2, "--nx-tour-accent": step.accent, "--nx-tour-accent-2": theme.accent2 } as React.CSSProperties} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <Glass glow type="modal" className="nx-walkthrough-modal nx-guided-tour-modal">
        <div ref={dialogRef} className="nx-guided-tour-dialog" role="dialog" aria-modal="true" aria-labelledby="nx-tour-title" tabIndex={-1}>
          <header className="nx-guided-tour-header">
            <div className="nx-guided-tour-brand"><span><Sparkles size={16} /></span><div><small>Nexus Startführung</small><strong>Workspace-Tour</strong></div></div>
            <div className="nx-guided-tour-header-progress"><strong>{completedPercent}%</strong><span>{completed.size}/{STEPS.length} Kapitel abgeschlossen</span></div>
            <button type="button" onClick={resetTour} title="Rundgang zurücksetzen"><RotateCcw size={14} /><span>Reset</span></button>
            <button type="button" onClick={onClose} aria-label="Rundgang schließen"><X size={15} /></button>
          </header>

          <div className="nx-guided-tour-progress" aria-label={`Schritt ${index + 1} von ${STEPS.length}`}>
            {STEPS.map((item, itemIndex) => <button key={item.id} type="button" className={`${itemIndex === index ? "is-current" : ""}${completed.has(item.id) ? " is-complete" : ""}`} onClick={() => setIndex(itemIndex)} aria-label={`${itemIndex + 1}. ${item.title}`}><span>{completed.has(item.id) ? <Check size={9} /> : itemIndex + 1}</span></button>)}
          </div>

          <div className="nx-guided-tour-layout">
            <nav className="nx-guided-tour-chapters" aria-label="Rundgang-Kapitel">
              {STEPS.map((item, itemIndex) => { const ItemIcon = item.icon; return <button key={item.id} type="button" className={itemIndex === index ? "is-active" : undefined} aria-current={itemIndex === index ? "step" : undefined} onClick={() => setIndex(itemIndex)}><span className="nx-guided-tour-chapter-icon">{completed.has(item.id) ? <CheckCircle2 size={15} /> : <ItemIcon size={15} />}</span><span><small>{item.eyebrow}</small><strong>{item.title}</strong></span></button>; })}
            </nav>

            <main className="nx-guided-tour-content">
              <AnimatePresence mode="wait">
                <motion.section key={step.id} className="nx-guided-tour-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
                  <div className="nx-guided-tour-page-head">
                    <div className="nx-guided-tour-page-icon"><Icon size={22} /></div>
                    <div><small>Schritt {index + 1} von {STEPS.length} · {step.eyebrow}</small><h2 id="nx-tour-title">{step.title}</h2></div>
                    {completed.has(step.id) ? <span className="nx-guided-tour-done"><CheckCircle2 size={13} /> Erledigt</span> : null}
                  </div>

                  <p className="nx-guided-tour-summary">{step.summary}</p>

                  <div className="nx-guided-tour-learn-grid">
                    {step.learn.map((item, itemIndex) => <article key={item}><span>{itemIndex + 1}</span><p>{item}</p></article>)}
                  </div>

                  {step.tryThis ? <div className="nx-guided-tour-try"><MonitorPlay size={17} /><div><strong>Jetzt ausprobieren</strong><span>{step.tryThis}</span></div>{step.view ? <button type="button" disabled={!canOpenStep} onClick={() => step.view && startExploring(step.view)}>{canOpenStep ? "View öffnen" : "Nicht freigeschaltet"}<ArrowRight size={13} /></button> : null}</div> : null}

                  {step.task ? <div className={`nx-guided-tour-task${tasks.has(step.task.id) ? " is-complete" : ""}`}><button type="button" className="nx-guided-tour-task-check" onClick={() => step.task && toggleTask(step.task.id)} aria-label={`${step.task.title} ${tasks.has(step.task.id) ? "als offen markieren" : "als erledigt markieren"}`}>{tasks.has(step.task.id) ? <Check size={14} /> : null}</button><div><strong>{step.task.title}</strong><span>{step.task.detail}</span></div>{step.task.externalHref ? <a href={step.task.externalHref} target="_blank" rel="noreferrer" onClick={() => step.task && setTasks((current) => new Set(current).add(step.task!.id))}>{step.task.actionLabel ?? "Öffnen"}<ArrowRight size={12} /></a> : step.task.view ? <button type="button" disabled={!(availableViews.length === 0 || availableSet.has(step.task.view))} onClick={() => { if (!step.task?.view) return; setTasks((current) => new Set(current).add(step.task!.id)); startExploring(step.task.view); }}>{step.task.actionLabel ?? "Öffnen"}<ArrowRight size={12} /></button> : null}</div> : null}

                  <div className="nx-guided-tour-page-foot">
                    <div>{step.shortcuts?.map((shortcut) => <kbd key={shortcut}>{shortcut}</kbd>)}</div>
                    <button type="button" className={completed.has(step.id) ? "is-complete" : undefined} onClick={() => updateCompleted(step.id, !completed.has(step.id))}>{completed.has(step.id) ? <><Check size={13} /> Kapitel abgeschlossen</> : "Als gelesen markieren"}</button>
                  </div>
                </motion.section>
              </AnimatePresence>
            </main>
          </div>

          <footer className="nx-guided-tour-footer">
            <button type="button" disabled={index === 0} onClick={() => move(index - 1)}><ArrowLeft size={14} /> Zurück</button>
            <span>Fortschritt bleibt lokal und kann jederzeit zurückgesetzt werden.</span>
            {index < STEPS.length - 1 ? <button type="button" className="is-primary" onClick={() => move(index + 1)}>Weiter <ArrowRight size={14} /></button> : <button type="button" className="is-primary" onClick={() => { updateCompleted(step.id); onClose(); }}><CheckCircle2 size={14} /> Tour abschließen</button>}
          </footer>
        </div>
      </Glass>
    </div>
  );
}
