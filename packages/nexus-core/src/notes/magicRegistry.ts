export type NotesMagicField = {
  key: string;
  label: string;
  multiline: boolean;
  placeholder: string;
};

export type NotesMagicDefinition = {
  id: string;
  label: string;
  icon: string;
  desc: string;
  color: string;
  fields: NotesMagicField[];
  template: string;
};

export const NOTES_MAGIC_DEFINITIONS: NotesMagicDefinition[] = [
  {
    id: "nexus-list",
    label: "Liste",
    icon: "📋",
    desc: "Zeilen mit Label und Detail",
    color: "#00AAFF",
    fields: [
      {
        key: "rows",
        label: "Einträge (Label | Detail, eine Zeile pro Eintrag)",
        multiline: true,
        placeholder:
          "Alpha | Erster Punkt\nBeta | Zweiter Punkt\nGamma | Dritter Punkt",
      },
    ],
    template: "\n```nexus-list\n{{rows}}\n```\n",
  },
  {
    id: "nexus-checklist",
    label: "Checklist",
    icon: "☑️",
    desc: "Interaktive Checkliste mit Fortschritt",
    color: "#30D158",
    fields: [
      {
        key: "rows",
        label: "Einträge (Text | done/true/false, eine Zeile pro Punkt)",
        multiline: true,
        placeholder:
          "UI Polish | false\nAPI Contract finalisieren | true\nRelease Smoke-Test | false",
      },
    ],
    template: "\n```nexus-checklist\n{{rows}}\n```\n",
  },
  {
    id: "nexus-alert",
    label: "Alert Box",
    icon: "🔔",
    desc: "Info, Warnung oder Fehler",
    color: "#FF9F0A",
    fields: [
      {
        key: "type",
        label: "Typ (info / success / warning / error)",
        multiline: false,
        placeholder: "info",
      },
      {
        key: "msg",
        label: "Nachricht",
        multiline: true,
        placeholder: "Wichtige Information hier...",
      },
    ],
    template: "\n```nexus-alert\n{{type}}\n{{msg}}\n```\n",
  },
  {
    id: "nexus-progress",
    label: "Fortschritt",
    icon: "📊",
    desc: "Fortschrittsbalken mit Prozent",
    color: "#30D158",
    fields: [
      {
        key: "rows",
        label: "Einträge (Label | Prozent, eine Zeile pro Balken)",
        multiline: true,
        placeholder: "Frontend | 80\nBackend | 65\nDesign | 45",
      },
    ],
    template: "\n```nexus-progress\n{{rows}}\n```\n",
  },
  {
    id: "nexus-timeline",
    label: "Timeline",
    icon: "🗓️",
    desc: "Zeitstrahl mit Datum und Text",
    color: "#BF5AF2",
    fields: [
      {
        key: "rows",
        label: "Einträge (Datum | Ereignis, eine Zeile pro Punkt)",
        multiline: true,
        placeholder:
          "Q1 2026 | Projektstart\nQ2 2026 | Alpha Release\nQ3 2026 | Beta Launch",
      },
    ],
    template: "\n```nexus-timeline\n{{rows}}\n```\n",
  },
  {
    id: "nexus-grid",
    label: "Grid",
    icon: "⊞",
    desc: "Mehrspaltiges Raster",
    color: "#FF6B6B",
    fields: [
      {
        key: "cols",
        label: "Spalten (Zahl)",
        multiline: false,
        placeholder: "2",
      },
      {
        key: "items",
        label: "Inhalte (eine Zeile pro Zelle)",
        multiline: true,
        placeholder: "Zelle 1\nZelle 2\nZelle 3\nZelle 4",
      },
    ],
    template: "\n```nexus-grid\n{{cols}}\n{{items}}\n```\n",
  },
  {
    id: "nexus-card",
    label: "Bild-Karte",
    icon: "🖼️",
    desc: "Karte mit Bild, Titel und Text",
    color: "#FF79C6",
    fields: [
      {
        key: "url",
        label: "Bild-URL",
        multiline: false,
        placeholder: "https://images.unsplash.com/photo-1618005182384?w=600",
      },
      {
        key: "title",
        label: "Titel",
        multiline: false,
        placeholder: "Mein Titel",
      },
      {
        key: "desc",
        label: "Beschreibung",
        multiline: false,
        placeholder: "Kurze Beschreibung...",
      },
    ],
    template: "\n```nexus-card\n{{url}} | {{title}} | {{desc}}\n```\n",
  },
  {
    id: "nexus-metrics",
    label: "KPI Cards",
    icon: "📈",
    desc: "Kennzahlen mit Wert und Delta",
    color: "#64D2FF",
    fields: [
      {
        key: "rows",
        label: "Einträge (Label | Wert | Delta, eine Zeile pro KPI)",
        multiline: true,
        placeholder: "MRR | 49.2k | +8.4%\nNPS | 61 | +5\nUptime | 99.95% | +0.03%",
      },
    ],
    template: "\n```nexus-metrics\n{{rows}}\n```\n",
  },
  {
    id: "nexus-steps",
    label: "Process Steps",
    icon: "🪜",
    desc: "Schrittfolge mit Details",
    color: "#30D158",
    fields: [
      {
        key: "rows",
        label: "Einträge (Schritt | Detail, eine Zeile pro Schritt)",
        multiline: true,
        placeholder:
          "Research | Problem und Zielbild klären\nBuild | Kernfeatures implementieren\nValidate | QA und Feedback einholen",
      },
    ],
    template: "\n```nexus-steps\n{{rows}}\n```\n",
  },
  {
    id: "nexus-quadrant",
    label: "Quadrant Board",
    icon: "🧩",
    desc: "2x2 Board für Priorisierung und Mapping",
    color: "#FF9F0A",
    fields: [
      {
        key: "rows",
        label: "Einträge (Titel | Inhalt, bis zu 4 Zeilen)",
        multiline: true,
        placeholder:
          "Quick Wins | Hoher Impact, geringer Aufwand\nBig Bets | Hoher Impact, hoher Aufwand\nFill-ins | Niedriger Impact, geringer Aufwand\nAvoid | Niedriger Impact, hoher Aufwand",
      },
    ],
    template: "\n```nexus-quadrant\n{{rows}}\n```\n",
  },
  {
    id: "nexus-kanban",
    label: "Kanban Board",
    icon: "🗂️",
    desc: "Spaltenbasiertes Board für Workflow-Status",
    color: "#5E5CE6",
    fields: [
      {
        key: "rows",
        label: "Einträge (Spalte | Task, eine Zeile pro Karte)",
        multiline: true,
        placeholder:
          "Backlog | Projektbrief finalisieren\nDoing | API Integration\nReview | QA Smoke Tests\nDone | Kickoff durchgeführt",
      },
    ],
    template: "\n```nexus-kanban\n{{rows}}\n```\n",
  },
  {
    id: "nexus-callout",
    label: "Callout",
    icon: "💡",
    desc: "Hinweisbox mit Typ, Titel und Beschreibung",
    color: "#007AFF",
    fields: [
      {
        key: "header",
        label: "Header (Typ | Titel)",
        multiline: false,
        placeholder: "tip | Rollout Hinweis",
      },
      {
        key: "msg",
        label: "Text",
        multiline: true,
        placeholder:
          "Führe vor dem Release einen Smoke-Test in Production durch.",
      },
    ],
    template: "\n```nexus-callout\n{{header}}\n{{msg}}\n```\n",
  },
  {
    id: "nexus-daily-brief",
    label: "Daily Brief",
    icon: "🧭",
    desc: "Tagesbriefing mit Fokus, Prioritäten und Blockern",
    color: "#30D158",
    fields: [
      {
        key: "headline",
        label: "Titel",
        multiline: false,
        placeholder: "Daily Brief - Team Sync",
      },
      {
        key: "summary",
        label: "Kurzstatus",
        multiline: true,
        placeholder: "Heute Fokus auf Release-Stabilisierung und offene QA-Punkte.",
      },
      {
        key: "priorities",
        label: "Prioritäten (Text | done/true/false)",
        multiline: true,
        placeholder:
          "Crash in View-Switch analysieren | false\nSmoke-Test auf macOS laufen lassen | false\nRelease Notes finalisieren | true",
      },
      {
        key: "blockers",
        label: "Blocker (Label | Detail)",
        multiline: true,
        placeholder:
          "API Timeout | sporadisch bei schwachem Netz\nBuild Agent | Runner gerade überlastet",
      },
    ],
    template:
      "\n```nexus-callout\ninfo | {{headline}}\n{{summary}}\n```\n\n```nexus-checklist\n{{priorities}}\n```\n\n```nexus-list\n{{blockers}}\n```\n",
  },
  {
    id: "nexus-decision-log",
    label: "Decision Log",
    icon: "🧠",
    desc: "Entscheidungen mit Begründung und Follow-up dokumentieren",
    color: "#BF5AF2",
    fields: [
      {
        key: "decisions",
        label: "Entscheidungen (Thema | Beschluss + Owner)",
        multiline: true,
        placeholder:
          "API Gateway | Node bleibt Fallback-Engine, Owner: Platform\nCanvas Zoom | Trackpad-Smoothing aktivieren, Owner: UX",
      },
      {
        key: "timeline",
        label: "Review-Termine (Datum | Review-Ziel)",
        multiline: true,
        placeholder:
          "Heute | Entscheidung kommunizieren\nMorgen | Umsetzung gegenprüfen\nEnde Woche | Outcome evaluieren",
      },
    ],
    template:
      "\n```nexus-list\n{{decisions}}\n```\n\n```nexus-timeline\n{{timeline}}\n```\n",
  },
  {
    id: "badge",
    label: "Badge",
    icon: "✨",
    desc: "Inline-Abzeichen im Text",
    color: "#FFE600",
    fields: [
      { key: "label", label: "Text", multiline: false, placeholder: "Nexus" },
      {
        key: "variant",
        label: "Farbe (magic / success / warning / error / info)",
        multiline: false,
        placeholder: "magic",
      },
    ],
    template: "`b:{{label}}|{{variant}}`",
  },
];

export function buildNotesMagicSnippet(
  templateId: string,
  values: Record<string, string>,
) {
  const definition = NOTES_MAGIC_DEFINITIONS.find((entry) => entry.id === templateId);
  if (!definition) return "";
  return definition.template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const next = values[key];
    return typeof next === "string" && next.length > 0
      ? next
      : "";
  });
}
