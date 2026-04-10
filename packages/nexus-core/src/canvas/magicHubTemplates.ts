export type CanvasMagicTemplateId =
  | "mindmap"
  | "roadmap"
  | "sprint"
  | "risk-matrix"
  | "decision-flow"
  | "meeting-hub"
  | "delivery-map"
  | "ai-project";

export type CanvasMagicTemplatePayload = {
  template: CanvasMagicTemplateId;
  title: string;
  includeNotes: boolean;
  includeTasks: boolean;
  aiPrompt?: string;
  aiDepth?: "light" | "balanced" | "deep";
};

export type CanvasMagicHubMeta = {
  label: string;
  color: string;
  summary: string;
  focusRows: string[];
  stepsRows: string[];
  timelineRows: string[];
  metricRows: string[];
  kanbanRows: string[];
};

export const CANVAS_MAGIC_HUB_TEMPLATES: Record<
  CanvasMagicTemplateId,
  CanvasMagicHubMeta
> = {
  "mindmap": {
    label: "Mindmap Core",
    color: "#64D2FF",
    summary: "Zentrales Topic mit strukturierten Branches und Next Actions.",
    focusRows: [
      "Hauptthema | Produktvision und Scope",
      "Stakeholder | Product, Engineering, Design",
      "Erwartetes Ergebnis | Klarer Entscheidungsrahmen",
    ],
    stepsRows: [
      "Cluster bilden | Hauptäste und Themenbereiche definieren",
      "Priorisieren | Wichtigste Branches zuerst bearbeiten",
      "Ableiten | Konkrete Tasks/Nodes an den Hub hängen",
    ],
    timelineRows: [
      "Heute | Thema und Äste initialisieren",
      "Diese Woche | Branches mit Details füllen",
      "Nächster Checkpoint | Entscheidungen finalisieren",
    ],
    metricRows: [
      "Abgedeckte Themen | 0 | +0",
      "Offene Fragen | 0 | +0",
      "Priorisierte Items | 0 | +0",
    ],
    kanbanRows: [
      "Backlog | Rohideen sammeln",
      "Doing | Themen clustern",
      "Review | Konsens prüfen",
      "Done | Map freigeben",
    ],
  },
  "roadmap": {
    label: "Project Roadmap",
    color: "#30D158",
    summary: "Roadmap-Hub für Ziele, Milestones, Risiken und Delivery-Timeline.",
    focusRows: [
      "North Star | Kundennutzen + Business Impact",
      "Scope | Must-have Features",
      "Gate-Kriterium | Performance + QA Signoff",
    ],
    stepsRows: [
      "Planung | Scope locken und Meilensteine setzen",
      "Umsetzung | Kernfeatures liefern",
      "Release | Launch + Monitoring",
    ],
    timelineRows: [
      "W1 | Discovery + Scope",
      "W2-W3 | Build + Integrationen",
      "W4 | QA + Beta",
      "W5 | Launch",
    ],
    metricRows: [
      "Roadmap Progress | 12 | +2",
      "Release Confidence | 45 | +5",
      "Offene Risiken | 3 | -1",
    ],
    kanbanRows: [
      "Backlog | Anforderungen",
      "Doing | Delivery Sprint",
      "Review | QA + Go/No-Go",
      "Done | Rollout",
    ],
  },
  "sprint": {
    label: "Sprint Planner",
    color: "#FF9F0A",
    summary: "Sprint-Hub mit Fokus auf Scope-Stabilität und Execution.",
    focusRows: [
      "Sprint Goal | Wichtigstes Ergebnis dieser Iteration",
      "Kapazität | Teamgröße und verfügbare Slots",
      "Definition of Done | Qualitätskriterien",
    ],
    stepsRows: [
      "Planen | Scope + Prioritäten finalisieren",
      "Liefern | Daily Progress und Blocker lösen",
      "Abschließen | Review und Retro",
    ],
    timelineRows: [
      "Tag 1 | Sprint Planning",
      "Tag 2-8 | Implementierung",
      "Tag 9 | QA + Review",
      "Tag 10 | Retro + Abschluss",
    ],
    metricRows: [
      "Scope Completion | 0 | +0",
      "Blocker | 0 | +0",
      "Review Readiness | 0 | +0",
    ],
    kanbanRows: [
      "Backlog | Sprint Backlog",
      "Doing | Aktive Tickets",
      "Review | QA/PO Review",
      "Done | Akzeptierte Tickets",
    ],
  },
  "risk-matrix": {
    label: "Risk Matrix",
    color: "#FF453A",
    summary: "Risiko-Hub mit Priorisierung, Mitigation und Owner-Zuordnung.",
    focusRows: [
      "Critical | Hoher Impact, hohe Wahrscheinlichkeit",
      "High | Hoher Impact oder hohe Wahrscheinlichkeit",
      "Owner Pflicht | Jede Risk-Card braucht Owner + ETA",
    ],
    stepsRows: [
      "Erfassen | Risiken sauber benennen",
      "Bewerten | Impact x Wahrscheinlichkeit priorisieren",
      "Mitigieren | Maßnahmen + Verantwortliche festlegen",
    ],
    timelineRows: [
      "Heute | Top-Risiken erfassen",
      "Diese Woche | Mitigation planen",
      "Wöchentlich | Risk Review",
    ],
    metricRows: [
      "Critical Risks | 0 | +0",
      "Mitigation Coverage | 0 | +0",
      "Blockierte Deliverables | 0 | +0",
    ],
    kanbanRows: [
      "Open | Neue Risiken",
      "Mitigation | Maßnahmen in Arbeit",
      "Review | Effektivität prüfen",
      "Closed | Risiko entschärft",
    ],
  },
  "decision-flow": {
    label: "Decision Flow",
    color: "#BF5AF2",
    summary: "Decision-Hub für Optionen, Kriterien, Tradeoffs und Outcome.",
    focusRows: [
      "Entscheidungspunkt | Welche Frage muss final beantwortet werden?",
      "Option A/B | Alternativen mit Vor- und Nachteilen",
      "Abnahmekriterium | Wann gilt die Entscheidung als richtig?",
    ],
    stepsRows: [
      "Optionen sammeln | 2-3 realistische Pfade definieren",
      "Bewerten | Nach Impact, Aufwand, Risiko",
      "Committen | Entscheidung treffen und next step starten",
    ],
    timelineRows: [
      "Heute | Optionen + Kriterien",
      "Morgen | Review mit Stakeholdern",
      "Diese Woche | Entscheidung umsetzen",
    ],
    metricRows: [
      "Entscheidungsreife | 0 | +0",
      "Offene Annahmen | 0 | +0",
      "Risiko-Level | 0 | +0",
    ],
    kanbanRows: [
      "Optionen | Sammeln",
      "Analyse | Bewerten",
      "Decision | Commit",
      "Execution | Umsetzung",
    ],
  },
  "meeting-hub": {
    label: "Meeting Hub",
    color: "#64D2FF",
    summary: "Zentrale Meeting-Node mit Agenda, Decisions und Action Items.",
    focusRows: [
      "Meeting Ziel | Ergebnis des Termins",
      "Teilnehmer | Owner + Entscheider",
      "Follow-up | Nächstes Sync-Fenster",
    ],
    stepsRows: [
      "Kickoff | Ziel und Rahmen klären",
      "Diskussion | Optionen + Risiken durchgehen",
      "Abschluss | Entscheidungen + Actions fixieren",
    ],
    timelineRows: [
      "Jetzt | Agenda durchgehen",
      "In 24h | Actions bestätigt",
      "In 3 Tagen | Follow-up Review",
    ],
    metricRows: [
      "Entscheidungen | 0 | +0",
      "Offene Punkte | 0 | +0",
      "Action Completion | 0 | +0",
    ],
    kanbanRows: [
      "Agenda | Offene Topics",
      "Live | Aktuelle Diskussion",
      "Action Items | Zugewiesene Tasks",
      "Done | Erledigte Follow-ups",
    ],
  },
  "delivery-map": {
    label: "Delivery Map",
    color: "#30D158",
    summary: "Delivery-Hub von Backlog bis Launch mit klaren Gates.",
    focusRows: [
      "Backlog Health | Klar priorisierte Anforderungen",
      "Build Status | Umsetzungsstand",
      "Launch Gate | QA + Monitoring ready",
    ],
    stepsRows: [
      "Scope | Backlog konsolidieren",
      "Build | Implementierung + Integrationen",
      "Release | QA, Rollout, Monitoring",
    ],
    timelineRows: [
      "W1 | Backlog + Scope",
      "W2 | Build",
      "W3 | QA",
      "W4 | Launch",
    ],
    metricRows: [
      "Lead Time | 0 | +0",
      "Deploy Success | 0 | +0",
      "P1 Bugs | 0 | +0",
    ],
    kanbanRows: [
      "Backlog | Priorisieren",
      "Build | Implementieren",
      "QA | Validieren",
      "Launch | Ausrollen",
    ],
  },
  "ai-project": {
    label: "AI Project Generator",
    color: "#5E5CE6",
    summary: "Prompt-basierter Projekt-Hub als Startpunkt für weitere Nodes.",
    focusRows: [
      "Prompt Fokus | Ziel, User, Outcome",
      "Scope Guardrails | Was ist in/out of scope?",
      "Risikoannahmen | Kritische Unsicherheiten",
    ],
    stepsRows: [
      "Prompt schärfen | Relevante Inputs sammeln",
      "Projektstruktur mappen | Goals, Milestones, Risks",
      "Execution starten | Hub mit echten Modulen ergänzen",
    ],
    timelineRows: [
      "Jetzt | Prompt finalisieren",
      "Heute | Initialstruktur erstellen",
      "Diese Woche | Validieren + umsetzen",
    ],
    metricRows: [
      "Plan Clarity | 0 | +0",
      "Risikoabdeckung | 0 | +0",
      "Delivery Confidence | 0 | +0",
    ],
    kanbanRows: [
      "Input | Prompt + Kontext",
      "Generate | Struktur erzeugen",
      "Review | Team-Feedback",
      "Execute | Umsetzung",
    ],
  },
};

const joinRows = (rows: string[]) => rows.join("\n");

export function buildCanvasMagicHubMarkdown(payload: CanvasMagicTemplatePayload) {
  const meta = CANVAS_MAGIC_HUB_TEMPLATES[payload.template];
  const promptLine =
    payload.template === "ai-project" && payload.aiPrompt
      ? `\n> AI Prompt: ${payload.aiPrompt.trim()}`
      : "";

  const sections = [
    `# ${meta.label}`,
    "",
    meta.summary,
    promptLine,
    "",
    "```nexus-list",
    joinRows(meta.focusRows),
    "```",
    "",
    "```nexus-steps",
    joinRows(meta.stepsRows),
    "```",
    "",
    "```nexus-timeline",
    joinRows(meta.timelineRows),
    "```",
    "",
    "```nexus-metrics",
    joinRows(meta.metricRows),
    "```",
    "",
    "```nexus-kanban",
    joinRows(meta.kanbanRows),
    "```",
  ];

  if (payload.includeTasks) {
    sections.push(
      "",
      "```nexus-checklist",
      "Kickoff und Scope bestätigen | false",
      "Owner für Kernmodule setzen | false",
      "Review-Termin planen | false",
      "```",
    );
  }

  if (payload.includeNotes) {
    sections.push(
      "",
      "```nexus-alert",
      "info",
      "Nutze diese Hub-Node als zentralen Startpunkt und hänge weitere Nodes direkt an.",
      "```",
    );
  }

  return sections.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type CanvasMagicHubQuickActionId =
  | "note"
  | "task"
  | "decision"
  | "risk";

export type CanvasMagicHubQuickActionTemplate = {
  id: CanvasMagicHubQuickActionId;
  label: string;
  nodeType: "markdown" | "task" | "decision" | "risk";
  title: string;
  color: string;
  yOffset: number;
  content: string;
  status?: "idea" | "todo" | "doing" | "review" | "blocked";
  priority?: "low" | "mid" | "high";
  progress?: number;
};

export const CANVAS_MAGIC_HUB_QUICK_ACTIONS: CanvasMagicHubQuickActionTemplate[] =
  [
    {
      id: "note",
      label: "Note",
      nodeType: "markdown",
      title: "Hub Note",
      color: "#64D2FF",
      yOffset: -140,
      content: "## Note\n- Kontext\n- Entscheidung\n- Nächster Schritt",
      status: "idea",
      priority: "mid",
      progress: 0,
    },
    {
      id: "task",
      label: "Task",
      nodeType: "task",
      title: "Hub Task",
      color: "#30D158",
      yOffset: -20,
      content: "Task Scope und Deliverable",
      status: "todo",
      priority: "mid",
      progress: 0,
    },
    {
      id: "decision",
      label: "Decision",
      nodeType: "decision",
      title: "Hub Decision",
      color: "#AF52DE",
      yOffset: 100,
      content: "Optionen, Tradeoffs und finaler Beschluss",
      status: "review",
      priority: "high",
      progress: 0,
    },
    {
      id: "risk",
      label: "Risk",
      nodeType: "risk",
      title: "Hub Risk",
      color: "#FF453A",
      yOffset: 220,
      content: "Risiko, Impact, Mitigation",
      status: "blocked",
      priority: "high",
      progress: 45,
    },
  ];

const QUICK_ACTION_MAP: Record<
  CanvasMagicHubQuickActionId,
  CanvasMagicHubQuickActionTemplate
> = Object.fromEntries(
  CANVAS_MAGIC_HUB_QUICK_ACTIONS.map((entry) => [entry.id, entry]),
) as Record<CanvasMagicHubQuickActionId, CanvasMagicHubQuickActionTemplate>;

export const getCanvasMagicHubQuickAction = (
  actionId: CanvasMagicHubQuickActionId,
) => QUICK_ACTION_MAP[actionId];
