import type {
  NexusAppId,
  NexusFeatureCatalog,
  NexusFeatureManifestItem,
  NexusLayoutProfile,
  NexusReleaseChannel,
  NexusUiSchemaDocument,
} from "@nexus/api";

export const CONTROL_FEATURE_FLAGS_SCHEMA_VERSION = 1;
export const CONTROL_FEATURE_FLAGS_STORAGE_KEY = "nx-devtools-control-feature-flags-v1";

export type FeatureFlagRisk = "low" | "medium" | "high";

export type ControlFeatureFlagDraft = NexusFeatureManifestItem & {
  enabled: boolean;
  rolloutPercent: number;
  owner: string;
  risk: FeatureFlagRisk;
  note: string;
};

export type ControlFeatureFlagAuditEvent = {
  id: string;
  at: string;
  actor: "local-admin";
  action: "toggle" | "rollout" | "validate" | "import" | "reset" | "save";
  target: string;
  detail: string;
};

export type ControlFeatureFlagRolloutStage = {
  id: string;
  label: string;
  channel: NexusReleaseChannel;
  percent: number;
  gates: string[];
  rollback: string;
};

export type ControlFeatureFlagValidationIssue = {
  severity: "error" | "warning" | "info";
  scope: "catalog" | "layout" | "rollout";
  target: string;
  message: string;
};

export type ControlFeatureFlagDraftState = {
  schemaVersion: number;
  updatedAt: string;
  catalog: NexusFeatureCatalog;
  layoutSchema: NexusUiSchemaDocument;
  features: ControlFeatureFlagDraft[];
  rolloutPlan: ControlFeatureFlagRolloutStage[];
  auditLog: ControlFeatureFlagAuditEvent[];
};

const DEFAULT_COMPAT: Record<NexusAppId, string> = {
  main: ">=6.0.0",
  mobile: ">=6.0.0",
  code: ">=6.0.0",
  "code-mobile": ">=6.0.0",
  control: ">=2.0.0",
};

const DEFAULT_LAYOUT_PROFILE: NexusLayoutProfile = {
  id: "desktop-control-draft",
  mode: "desktop",
  density: "comfortable",
  navigation: "sidebar",
  tokens: {
    spacing: "spacious",
    motion: "cinematic-safe",
    panel: "glass-gradient",
  },
};

const DEFAULT_FEATURES: ControlFeatureFlagDraft[] = [
  {
    featureId: "main.notes.magic",
    name: "Notes Magic",
    description: "Markdown blocks, emoji picker, wiki links, split preview and guide notes.",
    version: "6.0.0",
    appTargets: ["main"],
    rollout: "stable",
    stable: true,
    enabled: true,
    rolloutPercent: 100,
    requires: [],
    tags: ["free", "notes", "editor"],
    updatedAt: "2026-05-13T00:00:00.000Z",
    owner: "product",
    risk: "low",
    note: "Core free-tier writing flow.",
  },
  {
    featureId: "main.tasks.board",
    name: "Tasks Board",
    description: "Kanban board, focus lanes, batch controls and reminder handoff.",
    version: "6.0.0",
    appTargets: ["main"],
    rollout: "stable",
    stable: true,
    enabled: true,
    rolloutPercent: 100,
    requires: [],
    tags: ["free", "tasks"],
    updatedAt: "2026-05-13T00:00:00.000Z",
    owner: "product",
    risk: "low",
    note: "Core free-tier task flow.",
  },
  {
    featureId: "main.canvas.graph",
    name: "Canvas Graph",
    description: "Obsidian-style visual workspace with quick add, links and spatial navigation.",
    version: "6.0.0",
    appTargets: ["main"],
    rollout: "beta",
    stable: false,
    enabled: true,
    rolloutPercent: 80,
    requires: ["main.notes.magic"],
    tags: ["pro", "canvas", "graph"],
    updatedAt: "2026-05-13T00:00:00.000Z",
    owner: "product",
    risk: "medium",
    note: "Pro-tier visual knowledge system.",
  },
  {
    featureId: "main.code.scratch",
    name: "Code Scratchpad",
    description: "In-app code editor, snippets, terminal output and quick open flows.",
    version: "6.0.0",
    appTargets: ["main", "code"],
    rollout: "beta",
    stable: false,
    enabled: true,
    rolloutPercent: 70,
    requires: [],
    tags: ["pro", "code", "devtools"],
    updatedAt: "2026-05-13T00:00:00.000Z",
    owner: "engineering",
    risk: "medium",
    note: "Requires packaged IDE smoke before full rollout.",
  },
  {
    featureId: "main.flux.ops",
    name: "Flux Ops",
    description: "Prioritization stream, bottleneck triage and cross-view operations.",
    version: "6.0.0",
    appTargets: ["main"],
    rollout: "beta",
    stable: false,
    enabled: true,
    rolloutPercent: 50,
    requires: ["main.tasks.board"],
    tags: ["lifetime_pro", "flux", "automation"],
    updatedAt: "2026-05-13T00:00:00.000Z",
    owner: "product",
    risk: "high",
    note: "Lifetime Pro feature, keep gradual until activity heuristics are smoke-tested.",
  },
  {
    featureId: "main.settings.backupRestore",
    name: "Workspace Backup Restore",
    description: "Versioned local snapshots, JSON export/import, preview and conflict safety.",
    version: "6.0.0",
    appTargets: ["main"],
    rollout: "stable",
    stable: true,
    enabled: true,
    rolloutPercent: 100,
    requires: [],
    tags: ["free", "settings", "recovery"],
    updatedAt: "2026-05-13T00:00:00.000Z",
    owner: "engineering",
    risk: "low",
    note: "Client-local safety net, no secrets included.",
  },
  {
    featureId: "main.mobile.handoff",
    name: "Mobile Handoff",
    description: "Pro mobile access, device pairing and same-ecosystem workspace handoff.",
    version: "6.0.0",
    appTargets: ["main", "mobile"],
    rollout: "beta",
    stable: false,
    enabled: true,
    rolloutPercent: 35,
    requires: [],
    tags: ["pro", "mobile", "cloud"],
    updatedAt: "2026-05-13T00:00:00.000Z",
    owner: "cloud",
    risk: "high",
    note: "Gate behind Pro/Lifetime until cloud file sync is verified.",
  },
  {
    featureId: "main.control.releaseHealth",
    name: "Release Health Dashboard",
    description: "Local RC checklist, diagnostics export, runtime map and gate report.",
    version: "6.0.0",
    appTargets: ["main", "control"],
    rollout: "stable",
    stable: true,
    enabled: true,
    rolloutPercent: 100,
    requires: [],
    tags: ["admin", "release", "diagnostics"],
    updatedAt: "2026-05-13T00:00:00.000Z",
    owner: "engineering",
    risk: "low",
    note: "Visible in DevTools for release prep; production mutation stays server-side.",
  },
];

const nowIso = () => new Date().toISOString();

const eventId = () =>
  `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const normalizeAppTargets = (targets: unknown): NexusAppId[] => {
  const allowed: NexusAppId[] = ["main", "mobile", "code", "code-mobile", "control"];
  const values = Array.isArray(targets) ? targets : ["main"];
  const normalized = values.filter((value): value is NexusAppId => allowed.includes(value as NexusAppId));
  return normalized.length > 0 ? normalized : ["main"];
};

const toManifest = (feature: ControlFeatureFlagDraft): NexusFeatureManifestItem => ({
  featureId: feature.featureId,
  name: feature.name,
  description: feature.description,
  version: feature.version,
  appTargets: feature.appTargets,
  rollout: feature.enabled ? feature.rollout : "disabled",
  stable: feature.enabled && feature.rollout === "stable",
  requires: feature.requires,
  tags: feature.tags,
  updatedAt: feature.updatedAt,
});

export const createControlFeatureFlagAuditEvent = (
  action: ControlFeatureFlagAuditEvent["action"],
  target: string,
  detail: string,
): ControlFeatureFlagAuditEvent => ({
  id: eventId(),
  at: nowIso(),
  actor: "local-admin",
  action,
  target,
  detail,
});

export const createFeatureCatalogDraft = (
  features: ControlFeatureFlagDraft[] = DEFAULT_FEATURES,
): NexusFeatureCatalog => ({
  schemaVersion: "1",
  featureVersion: `draft-${nowIso().slice(0, 10)}`,
  channel: "staging",
  generatedAt: nowIso(),
  compatMatrix: DEFAULT_COMPAT,
  features: features.map(toManifest),
});

export const createLayoutSchemaDraft = (): NexusUiSchemaDocument => ({
  schemaVersion: "2",
  featureVersion: `layout-draft-${nowIso().slice(0, 10)}`,
  channel: "staging",
  appId: "main",
  minClientVersion: "6.0.0",
  compatMatrix: DEFAULT_COMPAT,
  layoutProfile: DEFAULT_LAYOUT_PROFILE,
  componentWhitelist: [
    "view-shell",
    "command-bar",
    "glass-panel",
    "markdown-preview",
    "task-board",
    "canvas-graph",
    "release-health",
    "backup-restore",
  ],
  screens: [
    {
      id: "dashboard",
      title: "Dashboard",
      enabled: true,
      components: [
        { id: "today-layer", type: "glass-panel", props: { priority: "primary" } },
        { id: "resume-lane", type: "view-shell", props: { density: "spacious" } },
      ],
    },
    {
      id: "notes",
      title: "Notes",
      enabled: true,
      components: [
        { id: "notes-list", type: "glass-panel", props: { width: "balanced" } },
        { id: "markdown-preview", type: "markdown-preview", props: { zIndex: "popover-safe" } },
      ],
    },
    {
      id: "devtools",
      title: "DevTools",
      enabled: true,
      components: [
        { id: "release-health", type: "release-health", props: { adminOnly: true } },
        { id: "feature-flags", type: "glass-panel", props: { adminOnly: true } },
      ],
    },
  ],
  updatedAt: nowIso(),
});

export const createDefaultControlFeatureFlagDraftState = (): ControlFeatureFlagDraftState => {
  const features = DEFAULT_FEATURES.map((feature) => ({ ...feature }));
  return {
    schemaVersion: CONTROL_FEATURE_FLAGS_SCHEMA_VERSION,
    updatedAt: nowIso(),
    catalog: createFeatureCatalogDraft(features),
    layoutSchema: createLayoutSchemaDraft(),
    features,
    rolloutPlan: createReleaseRolloutPlan(features),
    auditLog: [
      createControlFeatureFlagAuditEvent(
        "save",
        "draft",
        "Initial local Control feature draft created.",
      ),
    ],
  };
};

export const normalizeControlFeatureFlagState = (
  value: Partial<ControlFeatureFlagDraftState> | null | undefined,
): ControlFeatureFlagDraftState => {
  const fallback = createDefaultControlFeatureFlagDraftState();
  const features: ControlFeatureFlagDraft[] = Array.isArray(value?.features) && value.features.length > 0
    ? value.features.map((feature) => ({
        ...feature,
        enabled: feature.enabled !== false,
        rolloutPercent: clampPercent(Number(feature.rolloutPercent ?? 0)),
        appTargets: normalizeAppTargets(feature.appTargets),
        requires: Array.isArray(feature.requires) ? feature.requires : [],
        tags: Array.isArray(feature.tags) ? feature.tags : [],
        risk: feature.risk || "medium",
        owner: feature.owner || "product",
        note: feature.note || "",
        updatedAt: feature.updatedAt || nowIso(),
      }))
    : fallback.features;

  return {
    schemaVersion: CONTROL_FEATURE_FLAGS_SCHEMA_VERSION,
    updatedAt: value?.updatedAt || nowIso(),
    catalog: value?.catalog || createFeatureCatalogDraft(features),
    layoutSchema: value?.layoutSchema || fallback.layoutSchema,
    features,
    rolloutPlan: Array.isArray(value?.rolloutPlan) ? value.rolloutPlan : createReleaseRolloutPlan(features),
    auditLog: Array.isArray(value?.auditLog) ? value.auditLog.slice(0, 80) : fallback.auditLog,
  };
};

export const readControlFeatureFlagDraftState = (): ControlFeatureFlagDraftState => {
  if (typeof window === "undefined") {
    return createDefaultControlFeatureFlagDraftState();
  }
  try {
    const raw = window.localStorage.getItem(CONTROL_FEATURE_FLAGS_STORAGE_KEY);
    if (!raw) return createDefaultControlFeatureFlagDraftState();
    return normalizeControlFeatureFlagState(JSON.parse(raw));
  } catch {
    return createDefaultControlFeatureFlagDraftState();
  }
};

export const writeControlFeatureFlagDraftState = (state: ControlFeatureFlagDraftState) => {
  const normalized = normalizeControlFeatureFlagState({
    ...state,
    updatedAt: nowIso(),
    catalog: createFeatureCatalogDraft(state.features),
    rolloutPlan: state.rolloutPlan.length > 0 ? state.rolloutPlan : createReleaseRolloutPlan(state.features),
  });
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CONTROL_FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(normalized, null, 2));
  }
  return normalized;
};

export const appendFeatureFlagAuditEvent = (
  state: ControlFeatureFlagDraftState,
  event: ControlFeatureFlagAuditEvent,
): ControlFeatureFlagDraftState => ({
  ...state,
  updatedAt: nowIso(),
  auditLog: [event, ...state.auditLog].slice(0, 80),
});

export const updateFeatureDraft = (
  state: ControlFeatureFlagDraftState,
  featureId: string,
  patch: Partial<ControlFeatureFlagDraft>,
): ControlFeatureFlagDraftState => {
  const features = state.features.map((feature) =>
    feature.featureId === featureId
      ? {
          ...feature,
          ...patch,
          rolloutPercent: clampPercent(Number(patch.rolloutPercent ?? feature.rolloutPercent)),
          updatedAt: nowIso(),
        }
      : feature,
  );
  return {
    ...state,
    updatedAt: nowIso(),
    features,
    catalog: createFeatureCatalogDraft(features),
    rolloutPlan: createReleaseRolloutPlan(features),
  };
};

export const toggleFeatureDraft = (
  state: ControlFeatureFlagDraftState,
  featureId: string,
): ControlFeatureFlagDraftState => {
  const current = state.features.find((feature) => feature.featureId === featureId);
  if (!current) return state;
  const next = updateFeatureDraft(state, featureId, { enabled: !current.enabled });
  return appendFeatureFlagAuditEvent(
    next,
    createControlFeatureFlagAuditEvent(
      "toggle",
      featureId,
      `${current.name} ${current.enabled ? "disabled" : "enabled"} in local draft.`,
    ),
  );
};

export const validateFeatureCatalogDraft = (
  state: Pick<ControlFeatureFlagDraftState, "features" | "catalog">,
): ControlFeatureFlagValidationIssue[] => {
  const issues: ControlFeatureFlagValidationIssue[] = [];
  const ids = new Set<string>();

  for (const feature of state.features) {
    if (!feature.featureId.trim()) {
      issues.push({ severity: "error", scope: "catalog", target: "feature", message: "Feature without id." });
    }
    if (ids.has(feature.featureId)) {
      issues.push({ severity: "error", scope: "catalog", target: feature.featureId, message: "Duplicate feature id." });
    }
    ids.add(feature.featureId);
    if (feature.enabled && feature.rolloutPercent <= 0) {
      issues.push({ severity: "warning", scope: "catalog", target: feature.featureId, message: "Enabled feature has 0% rollout." });
    }
    if (!feature.enabled && feature.rollout !== "disabled") {
      issues.push({ severity: "info", scope: "catalog", target: feature.featureId, message: "Disabled draft will publish as disabled rollout." });
    }
    if (feature.rollout === "stable" && feature.rolloutPercent < 100) {
      issues.push({ severity: "warning", scope: "catalog", target: feature.featureId, message: "Stable feature should reach 100% rollout." });
    }
    for (const required of feature.requires) {
      if (!ids.has(required) && !state.features.some((item) => item.featureId === required)) {
        issues.push({ severity: "error", scope: "catalog", target: feature.featureId, message: `Missing dependency ${required}.` });
      }
    }
  }

  if (state.catalog.channel === "production") {
    issues.push({ severity: "warning", scope: "catalog", target: "channel", message: "Local editor is a draft surface; production mutation must stay server-side." });
  }

  return issues;
};

export const validateLayoutSchemaDraft = (
  layoutSchema: NexusUiSchemaDocument,
): ControlFeatureFlagValidationIssue[] => {
  const issues: ControlFeatureFlagValidationIssue[] = [];
  const screenIds = new Set<string>();
  const componentIds = new Set<string>();
  const whitelist = new Set(layoutSchema.componentWhitelist || []);

  if (layoutSchema.appId !== "main") {
    issues.push({ severity: "warning", scope: "layout", target: layoutSchema.appId, message: "This Main release panel expects appId main." });
  }
  if (!layoutSchema.minClientVersion) {
    issues.push({ severity: "error", scope: "layout", target: "minClientVersion", message: "Layout schema needs a min client version." });
  }
  for (const screen of layoutSchema.screens || []) {
    if (screenIds.has(screen.id)) {
      issues.push({ severity: "error", scope: "layout", target: screen.id, message: "Duplicate screen id." });
    }
    screenIds.add(screen.id);
    if (!screen.enabled) {
      issues.push({ severity: "info", scope: "layout", target: screen.id, message: "Screen is disabled in this draft." });
    }
    for (const component of screen.components || []) {
      if (componentIds.has(component.id)) {
        issues.push({ severity: "warning", scope: "layout", target: component.id, message: "Component id reused across screens." });
      }
      componentIds.add(component.id);
      if (!whitelist.has(component.type)) {
        issues.push({ severity: "error", scope: "layout", target: component.id, message: `Component type ${component.type} is not whitelisted.` });
      }
    }
  }
  if ((layoutSchema.screens || []).length === 0) {
    issues.push({ severity: "error", scope: "layout", target: "screens", message: "No screens in layout schema." });
  }

  return issues;
};

export const createReleaseRolloutPlan = (
  features: ControlFeatureFlagDraft[],
): ControlFeatureFlagRolloutStage[] => {
  const risky = features.filter((feature) => feature.enabled && (feature.risk === "high" || feature.rolloutPercent < 100));
  const hasHighRisk = risky.some((feature) => feature.risk === "high");
  return [
    {
      id: "stage-local-smoke",
      label: "Local smoke",
      channel: "staging",
      percent: 0,
      gates: ["npm run release:gate -- --fast", "DevTools Release Health score 100%", "No console errors in core views"],
      rollback: "Keep draft local and do not publish catalog.",
    },
    {
      id: "stage-canary",
      label: hasHighRisk ? "Admin canary" : "Canary",
      channel: "staging",
      percent: hasHighRisk ? 10 : 25,
      gates: ["Hosted API bootstrap green", "Login/remember-me smoke green", "Tier gates checked"],
      rollback: "Return changed flags to beta or disabled.",
    },
    {
      id: "stage-production",
      label: "Production promote",
      channel: "production",
      percent: risky.length > 0 ? Math.min(100, Math.max(...risky.map((feature) => feature.rolloutPercent))) : 100,
      gates: ["Installer checksums uploaded", "Download page links verified", "No open blocker in release checklist"],
      rollback: "Promote previous release snapshot with rollback token.",
    },
  ];
};

export const buildFeatureFlagEditorReport = (state: ControlFeatureFlagDraftState) => {
  const catalogIssues = validateFeatureCatalogDraft(state);
  const layoutIssues = validateLayoutSchemaDraft(state.layoutSchema);
  const issues = [...catalogIssues, ...layoutIssues];
  return {
    kind: "nexus-control-feature-flag-draft-report",
    generatedAt: nowIso(),
    schemaVersion: CONTROL_FEATURE_FLAGS_SCHEMA_VERSION,
    summary: {
      features: state.features.length,
      enabled: state.features.filter((feature) => feature.enabled).length,
      disabled: state.features.filter((feature) => !feature.enabled).length,
      beta: state.features.filter((feature) => feature.rollout === "beta").length,
      highRisk: state.features.filter((feature) => feature.risk === "high").length,
      issues: issues.length,
      errors: issues.filter((issue) => issue.severity === "error").length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
    },
    catalog: createFeatureCatalogDraft(state.features),
    layoutSchema: state.layoutSchema,
    rolloutPlan: createReleaseRolloutPlan(state.features),
    issues,
    auditLog: state.auditLog.slice(0, 24),
    productionNote: "This is a local Control draft. Production writes must be made through the hosted Control Plane with admin auth and audit logging.",
  };
};
