export type NexusTemplatePackCategory = "notes" | "tasks" | "canvas" | "code" | "flux";

export type NexusTemplatePackTier = "free" | "pro" | "lifetime" | "lifetime_pro";

export type NexusTemplatePackItem = {
  id: string;
  category: NexusTemplatePackCategory;
  title: string;
  summary: string;
  bestFor: string;
  targetView: string;
  tier: NexusTemplatePackTier;
  tags: string[];
  payloadPreview: string[];
  quickStart: string[];
};

export const NEXUS_TEMPLATE_PACK_CATEGORIES: Array<{
  id: NexusTemplatePackCategory;
  label: string;
  accent: string;
  summary: string;
}> = [
  {
    id: "notes",
    label: "Notes",
    accent: "#30d158",
    summary: "Markdown-ready writing structures for daily notes, meetings, projects and releases.",
  },
  {
    id: "tasks",
    label: "Task Boards",
    accent: "#ff9f0a",
    summary: "Board presets for sprint flow, bug triage and launch checklists.",
  },
  {
    id: "canvas",
    label: "Canvas Layouts",
    accent: "#64d2ff",
    summary: "Obsidian-like visual maps for project hubs, risks and decisions.",
  },
  {
    id: "code",
    label: "Code Snippets",
    accent: "#bf5af2",
    summary: "Small implementation starters for API checks, UI scratch work and release scripts.",
  },
  {
    id: "flux",
    label: "Flux Workflows",
    accent: "#ffd60a",
    summary: "Operational playbooks for triage, release ops and bottleneck discovery.",
  },
];

export const NEXUS_TEMPLATE_PACKS: NexusTemplatePackItem[] = [
  {
    id: "notes-daily-focus",
    category: "notes",
    title: "Daily Focus Note",
    summary: "A calm daily note with intent, top three outcomes, blockers, decisions and a closing log.",
    bestFor: "Starting a work session without opening five different panels first.",
    targetView: "Notes",
    tier: "free",
    tags: ["daily", "focus", "journal"],
    payloadPreview: [
      "# Daily Focus",
      "## Intent",
      "## Top 3 outcomes",
      "## Blockers",
      "## Decisions",
      "## Closing log",
    ],
    quickStart: [
      "Create a new note and paste the markdown.",
      "Write the intent before checking Tasks.",
      "Link one task or canvas node before closing the day.",
    ],
  },
  {
    id: "notes-meeting-brief",
    category: "notes",
    title: "Meeting Brief",
    summary: "Agenda, notes, decisions, follow-ups and open questions in one compact handoff.",
    bestFor: "Turning a call into tasks and decisions without losing the human context.",
    targetView: "Notes",
    tier: "free",
    tags: ["meeting", "decisions", "follow-up"],
    payloadPreview: [
      "# Meeting Brief",
      "## Agenda",
      "## Notes",
      "## Decisions",
      "## Follow-ups",
      "## Open questions",
    ],
    quickStart: [
      "Paste before the meeting starts.",
      "Mark decisions while they happen.",
      "Convert follow-ups into Tasks after the call.",
    ],
  },
  {
    id: "notes-project-brief",
    category: "notes",
    title: "Project Brief",
    summary: "A project note that keeps goal, users, scope, non-goals, milestones and risks together.",
    bestFor: "Giving a new project a real backbone before Canvas or Tasks get noisy.",
    targetView: "Notes",
    tier: "free",
    tags: ["project", "scope", "planning"],
    payloadPreview: [
      "# Project Brief",
      "## Goal",
      "## Users",
      "## Scope",
      "## Non-goals",
      "## Milestones",
      "## Risks",
    ],
    quickStart: [
      "Define the goal in one sentence.",
      "Write non-goals early to keep scope honest.",
      "Create a matching Canvas hub when the brief is stable.",
    ],
  },
  {
    id: "notes-release-notes",
    category: "notes",
    title: "Release Notes",
    summary: "A release note shape with changes, evidence, risk, upgrade path and public copy.",
    bestFor: "Preparing an RC handoff that feels trustworthy instead of improvised.",
    targetView: "Notes",
    tier: "free",
    tags: ["release", "rc", "evidence"],
    payloadPreview: [
      "# Release Notes",
      "## What changed",
      "## Evidence",
      "## Known risks",
      "## Upgrade notes",
      "## Public copy",
    ],
    quickStart: [
      "Paste after Release Health is green or documented.",
      "Link screenshots or evidence folders.",
      "Keep risks concrete and dated.",
    ],
  },
  {
    id: "tasks-sprint-board",
    category: "tasks",
    title: "Sprint Board",
    summary: "A simple To Do, In Progress, Review and Done board for short delivery loops.",
    bestFor: "One-week or two-week product polish pushes.",
    targetView: "Tasks",
    tier: "free",
    tags: ["sprint", "kanban", "delivery"],
    payloadPreview: ["To Do", "In Progress", "Review", "Done", "Blocked lane as tag"],
    quickStart: [
      "Create board columns from the preview.",
      "Keep no more than three tasks in progress.",
      "Move review items before starting new work.",
    ],
  },
  {
    id: "tasks-bugfix-triage",
    category: "tasks",
    title: "Bugfix Triage",
    summary: "Severity-first lanes for reports, reproduction, fix, verification and release notes.",
    bestFor: "Cleaning up release blockers without mixing them into feature work.",
    targetView: "Tasks",
    tier: "free",
    tags: ["bugs", "triage", "qa"],
    payloadPreview: ["Reported", "Repro Ready", "Fixing", "Verify", "Release Note"],
    quickStart: [
      "Add severity as a task tag.",
      "Do not move a card to Fixing until reproduction is clear.",
      "Link verification evidence before Done.",
    ],
  },
  {
    id: "tasks-launch-checklist",
    category: "tasks",
    title: "Launch Checklist",
    summary: "A launch board for docs, downloads, API, installer evidence, security and final publish.",
    bestFor: "Keeping a public release calm when many small checks are open.",
    targetView: "Tasks",
    tier: "free",
    tags: ["launch", "release", "checklist"],
    payloadPreview: ["Docs", "Downloads", "API", "Installers", "Security", "Publish"],
    quickStart: [
      "Create one card per release area.",
      "Attach the command or evidence path to each card.",
      "Only publish when every required card has proof.",
    ],
  },
  {
    id: "canvas-project-hub",
    category: "canvas",
    title: "Project Hub",
    summary: "A central project node connected to goals, notes, milestones, risks and decisions.",
    bestFor: "Giving big work an Obsidian-like map instead of a flat list.",
    targetView: "Canvas",
    tier: "pro",
    tags: ["canvas", "project", "knowledge-map"],
    payloadPreview: ["Hub", "Goal", "Milestone", "Risk", "Decision", "Linked Note"],
    quickStart: [
      "Create the Hub node first.",
      "Attach one Goal and one Risk before adding details.",
      "Use wiki links to connect related Notes.",
    ],
  },
  {
    id: "canvas-risk-matrix",
    category: "canvas",
    title: "Risk Matrix",
    summary: "Impact and likelihood lanes for visual risk triage across release or project work.",
    bestFor: "Seeing what can actually hurt the release before it becomes a surprise.",
    targetView: "Canvas",
    tier: "pro",
    tags: ["risk", "matrix", "release"],
    payloadPreview: ["Low impact", "High impact", "Likely", "Unlikely", "Mitigation"],
    quickStart: [
      "Place high-impact risks near the top.",
      "Give every high-impact risk a mitigation node.",
      "Convert accepted risks into release notes.",
    ],
  },
  {
    id: "canvas-decision-flow",
    category: "canvas",
    title: "Decision Flow",
    summary: "A decision map that keeps options, tradeoffs, chosen path and follow-up tasks visible.",
    bestFor: "Avoiding forgotten why-we-chose-this context.",
    targetView: "Canvas",
    tier: "pro",
    tags: ["decision", "tradeoffs", "architecture"],
    payloadPreview: ["Question", "Option A", "Option B", "Tradeoff", "Decision", "Follow-up"],
    quickStart: [
      "Write the question as the center node.",
      "Attach options before opinions.",
      "Create follow-up tasks from the chosen path.",
    ],
  },
  {
    id: "code-fetch-smoke",
    category: "code",
    title: "Fetch Smoke",
    summary: "A tiny API smoke snippet for checking status, JSON parsing and visible error states.",
    bestFor: "Testing hosted API behavior before blaming the UI.",
    targetView: "Code",
    tier: "pro",
    tags: ["api", "smoke", "debug"],
    payloadPreview: [
      "async function smoke(url) {",
      "  const res = await fetch(url);",
      "  console.log(res.status, await res.text());",
      "}",
    ],
    quickStart: [
      "Paste into Code scratch.",
      "Point it at /health or public bootstrap.",
      "Save the result in release evidence if it matters.",
    ],
  },
  {
    id: "code-ui-component-scratch",
    category: "code",
    title: "UI Component Scratch",
    summary: "A small HTML/CSS/JS starter for quickly testing spacing, contrast and copy density.",
    bestFor: "Trying product-page-like UI ideas before touching a real view.",
    targetView: "Code",
    tier: "pro",
    tags: ["ui", "prototype", "component"],
    payloadPreview: ["<section class=\"panel\">", ".panel { border-radius: 18px; }", "button.addEventListener(...)"],
    quickStart: [
      "Paste into Code or DevTools Builder.",
      "Validate empty, hover and focused states.",
      "Move only the clean CSS into the target view.",
    ],
  },
  {
    id: "code-release-script-checklist",
    category: "code",
    title: "Release Script Checklist",
    summary: "A script-oriented checklist for build, verify, checksums and artifact naming.",
    bestFor: "Preparing a repeatable release command sequence.",
    targetView: "Code",
    tier: "pro",
    tags: ["release", "scripts", "checksums"],
    payloadPreview: [
      "npm run verify:encoding",
      "npm run verify:ecosystem",
      "npm run release:gate -- --fast",
      "npm run release:checksums -- --dir <release-dir>",
    ],
    quickStart: [
      "Copy into release notes or a shell plan.",
      "Run one command at a time.",
      "Attach generated checksums to download evidence.",
    ],
  },
  {
    id: "flux-morning-triage",
    category: "flux",
    title: "Morning Triage",
    summary: "A quick Flux pass for overdue items, due-soon reminders, urgent tasks and first action.",
    bestFor: "Opening Nexus and immediately knowing where the pressure is.",
    targetView: "Flux",
    tier: "lifetime_pro",
    tags: ["triage", "morning", "ops"],
    payloadPreview: ["Overdue", "Due soon", "High priority", "Focus", "First action"],
    quickStart: [
      "Filter overdue and due-soon first.",
      "Pick one first action before creating anything new.",
      "Send non-urgent work to backlog.",
    ],
  },
  {
    id: "flux-release-ops",
    category: "flux",
    title: "Release Ops",
    summary: "A release operating mode for blockers, build evidence, docs drift and final risk review.",
    bestFor: "Coordinating the last mile before a public release.",
    targetView: "Flux",
    tier: "lifetime_pro",
    tags: ["release", "ops", "blockers"],
    payloadPreview: ["Blockers", "Evidence", "Docs drift", "Security", "Go / no-go"],
    quickStart: [
      "Start with blockers, not polish.",
      "Match every go decision to evidence.",
      "Copy final risks into release notes.",
    ],
  },
  {
    id: "flux-bottleneck-hunt",
    category: "flux",
    title: "Bottleneck Hunt",
    summary: "A focused workflow for spotting queues, stale work and repeated manual handoffs.",
    bestFor: "Finding where the workspace is slowing the team down.",
    targetView: "Flux",
    tier: "lifetime_pro",
    tags: ["bottleneck", "queue", "review"],
    payloadPreview: ["Stale tasks", "Repeated blockers", "Manual handoff", "Next automation"],
    quickStart: [
      "Sort by age and priority.",
      "Look for repeated blocker names.",
      "Create one automation or template follow-up.",
    ],
  },
];

export const getNexusTemplatePacksByCategory = (category: NexusTemplatePackCategory) =>
  NEXUS_TEMPLATE_PACKS.filter((pack) => pack.category === category);

export const buildNexusTemplatePackMarkdown = (pack: NexusTemplatePackItem) => {
  const preview = pack.payloadPreview.map((line) => `- ${line}`).join("\n");
  const steps = pack.quickStart.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const tags = pack.tags.map((tag) => `#${tag}`).join(" ");

  return [
    `# ${pack.title}`,
    "",
    pack.summary,
    "",
    `Target view: ${pack.targetView}`,
    `Best for: ${pack.bestFor}`,
    `Tier: ${pack.tier}`,
    `Tags: ${tags}`,
    "",
    "## Payload preview",
    preview,
    "",
    "## Quick start",
    steps,
  ].join("\n");
};
