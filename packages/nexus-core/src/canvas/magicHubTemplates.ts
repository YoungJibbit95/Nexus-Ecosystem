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
    summary: "Prompt-basierte Multi-Node Projektmap mit Goals, Milestones, Risks und Execution-Plan.",
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

export const DEFAULT_CANVAS_MAGIC_TEMPLATE_ID: CanvasMagicTemplateId = "mindmap";

export type CanvasMagicTemplatePayloadInput = Omit<
  CanvasMagicTemplatePayload,
  "template"
> & {
  template?: string | null;
};

export const isCanvasMagicTemplateId = (
  template: unknown,
): template is CanvasMagicTemplateId =>
  typeof template === "string" && template in CANVAS_MAGIC_HUB_TEMPLATES;

export const resolveCanvasMagicTemplateId = (
  template: unknown,
  fallback: CanvasMagicTemplateId = DEFAULT_CANVAS_MAGIC_TEMPLATE_ID,
): CanvasMagicTemplateId => (isCanvasMagicTemplateId(template) ? template : fallback);

export const resolveCanvasMagicHubTemplateMeta = (
  template: unknown,
  fallback: CanvasMagicTemplateId = DEFAULT_CANVAS_MAGIC_TEMPLATE_ID,
) => {
  const id = resolveCanvasMagicTemplateId(template, fallback);
  return {
    id,
    meta: CANVAS_MAGIC_HUB_TEMPLATES[id],
    wasFallback: id !== template,
  };
};

export const normalizeCanvasMagicTemplatePayload = (
  payload: CanvasMagicTemplatePayloadInput,
  fallback: CanvasMagicTemplateId = DEFAULT_CANVAS_MAGIC_TEMPLATE_ID,
): CanvasMagicTemplatePayload => {
  const resolved = resolveCanvasMagicTemplateId(payload.template, fallback);
  return {
    ...payload,
    template: resolved,
    title: payload.title ?? "",
    includeNotes: payload.includeNotes ?? true,
    includeTasks: payload.includeTasks ?? true,
    aiPrompt: payload.aiPrompt ?? "",
    aiDepth: payload.aiDepth ?? "balanced",
  };
};

export type CanvasMagicTemplateBuildResult =
  | {
      kind: "ai-project";
      payload: CanvasMagicTemplatePayload;
      graph: CanvasMagicProjectGraph;
    }
  | {
      kind: "hub";
      payload: CanvasMagicTemplatePayload;
      templateId: CanvasMagicTemplateId;
      title: string;
      meta: CanvasMagicHubMeta;
      markdown: string;
    };

const joinRows = (rows: string[]) => rows.join("\n");

export function buildCanvasMagicHubMarkdown(payload: CanvasMagicTemplatePayload) {
  const normalized = normalizeCanvasMagicTemplatePayload(payload);
  const { id, meta } = resolveCanvasMagicHubTemplateMeta(normalized.template);
  const promptLine =
    id === "ai-project" && normalized.aiPrompt
      ? `\n> AI Prompt: ${normalized.aiPrompt.trim()}`
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

  if (normalized.includeTasks) {
    sections.push(
      "",
      "```nexus-checklist",
      "Kickoff und Scope bestätigen | false",
      "Owner für Kernmodule setzen | false",
      "Review-Termin planen | false",
      "```",
    );
  }

  if (normalized.includeNotes) {
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

export type CanvasMagicProjectNodeType =
  | "project"
  | "goal"
  | "milestone"
  | "risk"
  | "decision"
  | "markdown"
  | "checklist";

export type CanvasMagicProjectNodeMeta = {
  status?: "todo" | "doing" | "blocked" | "done";
  priority?: "low" | "mid" | "high" | "critical";
  progress?: number;
  dueDate?: string;
  owner?: string;
  tags?: string[];
};

export type CanvasMagicProjectNode = {
  id: string;
  type: CanvasMagicProjectNodeType;
  x: number;
  y: number;
  title: string;
  width?: number;
  height?: number;
  color?: string;
  content?: string;
  meta?: CanvasMagicProjectNodeMeta;
  checklistItems?: string[];
};

export type CanvasMagicProjectGraph = {
  rootId: string;
  nodes: CanvasMagicProjectNode[];
  links: Array<{ from: string; to: string }>;
};

const spreadPositions = (count: number, gap: number) => {
  if (count <= 1) return [0];
  const start = (-gap * (count - 1)) / 2;
  return Array.from({ length: count }, (_, index) => start + index * gap);
};

const dueDateFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const extractPromptKeywords = (prompt: string, max: number) => {
  const tokens = prompt
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
  const stopWords = new Set([
    "with",
    "that",
    "this",
    "from",
    "into",
    "über",
    "oder",
    "aber",
    "project",
    "projekt",
    "product",
    "feature",
    "features",
    "platform",
    "system",
    "tool",
  ]);
  const freq = new globalThis.Map<string, number>();
  tokens.forEach((word) => {
    if (stopWords.has(word)) return;
    freq.set(word, (freq.get(word) || 0) + 1);
  });
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word]) => word);
};

export const buildAiProjectMagicGraph = (
  payload: CanvasMagicTemplatePayloadInput,
): CanvasMagicProjectGraph => {
  const normalized = normalizeCanvasMagicTemplatePayload(payload, "ai-project");
  const prompt = (normalized.aiPrompt || "").trim();
  const depth = normalized.aiDepth || "balanced";
  const goalCount = depth === "light" ? 3 : depth === "deep" ? 6 : 4;
  const milestoneCount = depth === "light" ? 3 : depth === "deep" ? 6 : 4;
  const riskCount = depth === "light" ? 2 : depth === "deep" ? 5 : 3;
  const keywords = extractPromptKeywords(prompt, goalCount + 2);

  const goalTitles =
    keywords.length > 0
      ? keywords.slice(0, goalCount).map((word) => `Goal: ${word}`)
      : ["Goal: Product Value", "Goal: Delivery", "Goal: Quality"].slice(0, goalCount);
  const milestoneTitles = [
    "Milestone: Discovery",
    "Milestone: Architecture",
    "Milestone: Build",
    "Milestone: QA",
    "Milestone: Beta",
    "Milestone: Launch",
  ].slice(0, milestoneCount);
  const riskTitles = [
    "Risk: Scope Drift",
    "Risk: Integration Delay",
    "Risk: Performance Regression",
    "Risk: Adoption Gap",
    "Risk: Quality Regression",
  ].slice(0, riskCount);

  const goalX = spreadPositions(goalTitles.length, 290);
  const milestoneX = spreadPositions(milestoneTitles.length, 260);
  const riskX = spreadPositions(riskTitles.length, 300);
  const rootTitle = normalized.title?.trim() || "AI Project Core";

  const nodes: CanvasMagicProjectNode[] = [
    {
      id: "root",
      type: "project",
      x: 0,
      y: 0,
      title: rootTitle,
      width: 390,
      height: 260,
      color: "#5E5CE6",
      content: prompt
        ? `AI Prompt:\n${prompt}\n\nAuto-generated map (${depth}).`
        : "AI-generated project map.",
      meta: {
        status: "doing",
        priority: "high",
        progress: 10,
        dueDate: dueDateFromNow(21),
        owner: "team",
        tags: ["magic", "ai-project", `depth:${depth}`],
      },
    },
    {
      id: "decision",
      type: "decision",
      x: -620,
      y: 150,
      title: "Primary Decision",
      color: "#BF5AF2",
      content: "Optionen, Tradeoffs und Go/No-Go.",
      meta: {
        status: "todo",
        priority: "high",
        tags: ["decision"],
      },
    },
  ];

  const links: Array<{ from: string; to: string }> = [];

  goalTitles.forEach((title, index) => {
    const nodeId = `goal-${index}`;
    nodes.push({
      id: nodeId,
      type: "goal",
      x: goalX[index] || 0,
      y: -320,
      title,
      color: "#30D158",
      meta: {
        status: "todo",
        priority: "mid",
        progress: 5 + index * 6,
        dueDate: dueDateFromNow(14 + index * 6),
        tags: ["goal"],
      },
    });
    links.push({ from: "root", to: nodeId });
  });

  milestoneTitles.forEach((title, index) => {
    const nodeId = `milestone-${index}`;
    nodes.push({
      id: nodeId,
      type: "milestone",
      x: milestoneX[index] || 0,
      y: 80,
      title,
      color: "#FF9F0A",
      meta: {
        status: index === 0 ? "doing" : "todo",
        priority: index <= 1 ? "high" : "mid",
        progress: index === 0 ? 28 : 0,
        dueDate: dueDateFromNow(5 + index * 6),
        tags: ["milestone"],
      },
    });
    links.push({ from: "root", to: nodeId });
  });

  riskTitles.forEach((title, index) => {
    const nodeId = `risk-${index}`;
    nodes.push({
      id: nodeId,
      type: "risk",
      x: riskX[index] || 0,
      y: 430,
      title,
      color: "#FF453A",
      meta: {
        status: index === 0 ? "blocked" : "todo",
        priority: index === 0 ? "critical" : "high",
        tags: ["risk"],
      },
    });
    links.push({ from: "root", to: nodeId });
  });

  if (normalized.includeNotes) {
    nodes.push({
      id: "context-board",
      type: "markdown",
      x: 670,
      y: -100,
      title: "AI Context Board",
      width: 360,
      height: 340,
      color: "#64D2FF",
      content:
        "```nexus-list\nProblem | Welches Problem wird gelöst?\nPrimary User | Für wen bauen wir?\nSuccess Metric | Welche Metrik beweist Erfolg?\n```\n\n"
        + "```nexus-metrics\nActivation | 0 | +0\nRetention D30 | 0 | +0\nNPS | 0 | +0\n```\n\n"
        + "```nexus-steps\nDiscovery | Zielbild schärfen\nBuild | Kernmodule liefern\nQA | Stabilität sichern\n```",
      meta: {
        status: "todo",
        priority: "mid",
        tags: ["context", "notes"],
      },
    });
    links.push({ from: "root", to: "context-board" });
  }

  if (normalized.includeTasks) {
    nodes.push({
      id: "execution-plan",
      type: "checklist",
      x: 670,
      y: 280,
      title: "Execution Plan",
      color: "#30D158",
      checklistItems: [
        "Kickoff + Scope lock",
        "Architecture review",
        "Implementation sprint",
        "QA + hardening",
        "Go-live checklist",
      ].slice(0, depth === "deep" ? 5 : 4),
      meta: {
        status: "todo",
        priority: "mid",
        tags: ["execution", "checklist"],
      },
    });
    links.push({ from: "root", to: "execution-plan" });
  }

  links.push({ from: "root", to: "decision" });

  return {
    rootId: "root",
    nodes,
    links,
  };
};

export const buildCanvasMagicTemplate = (
  payload: CanvasMagicTemplatePayloadInput,
): CanvasMagicTemplateBuildResult => {
  const normalized = normalizeCanvasMagicTemplatePayload(payload);
  if (normalized.template === "ai-project") {
    return {
      kind: "ai-project",
      payload: normalized,
      graph: buildAiProjectMagicGraph(normalized),
    };
  }

  const { id, meta } = resolveCanvasMagicHubTemplateMeta(normalized.template);
  const title = normalized.title?.trim() || meta.label;
  return {
    kind: "hub",
    payload: normalized,
    templateId: id,
    title,
    meta,
    markdown: buildCanvasMagicHubMarkdown(normalized),
  };
};

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
