export const EXTENSIONS_STORAGE_KEY = "nexus-code-extension-registry";
export const LEGACY_EXTENSIONS_STORAGE_KEY = "nexus-code-installed-extensions";
export const EXTENSION_REGISTRY_VERSION = 3;

export const EXTENSION_CATEGORIES = [
  { id: "all", label: "Alle" },
  { id: "ai", label: "AI" },
  { id: "formatter", label: "Formatter" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "git", label: "Git" },
  { id: "theme", label: "Themes" },
  { id: "runtime", label: "Runtime" },
  { id: "collaboration", label: "Collab" },
  { id: "tools", label: "Tools" },
];

export const EXTENSION_SOURCES = [
  { id: "all", label: "Alle Quellen" },
  { id: "bundled", label: "Bundled" },
  { id: "marketplace", label: "Marketplace" },
  { id: "local", label: "Lokal" },
];

export const EXTENSION_STATE_FILTERS = [
  { id: "all", label: "Alle" },
  { id: "installed", label: "Installiert" },
  { id: "enabled", label: "Aktiv" },
  { id: "disabled", label: "Pausiert" },
  { id: "available", label: "Verfuegbar" },
  { id: "updates", label: "Updates" },
  { id: "errors", label: "Fehler" },
];

export const EXTENSION_CONTRIBUTION_FILTERS = [
  { id: "all", label: "Alle Beitraege" },
  { id: "commands", label: "Commands" },
  { id: "languages", label: "Languages" },
  { id: "themes", label: "Themes" },
  { id: "views", label: "Views" },
];

const DEFAULT_INSTALLED_IDS = ["nexus-theme-core", "prettier", "eslint"];
const CORE_CONTRIBUTION_POINTS = ["commands", "languages", "themes", "views"];

export const EXTENSION_RUNTIME_CONTRIBUTION_POINTS = [
  { point: "commands", label: "Commands" },
  { point: "views", label: "Views" },
  { point: "languages", label: "Languages" },
  { point: "themes", label: "Themes" },
];

const CONTRIBUTION_POINT_LABELS = {
  commands: "Commands",
  languages: "Languages",
  themes: "Themes",
  views: "Views",
  iconThemes: "Icon themes",
  formatters: "Formatters",
  problemMatchers: "Problem matchers",
  debugAdapters: "Debug adapters",
  configuration: "Settings",
};

function toStringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function createDiagnostic(level, code, message, detail) {
  return { level, code, message, detail: detail || "" };
}

function normalizeOptionalString(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeTimestamp(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

function humanizeIdentifier(value) {
  return String(value || "")
    .split(/[._:-]/)
    .filter(Boolean)
    .slice(-2)
    .join(" ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function command(commandId, title, category = "Nexus") {
  return { command: commandId, title: title || humanizeIdentifier(commandId), category };
}

function language(id, aliases, extensions, configuration) {
  return {
    id,
    aliases: toStringArray(aliases),
    extensions: toStringArray(extensions),
    configuration,
  };
}

function theme(id, label, uiTheme, path) {
  return { id, label, uiTheme, path };
}

function view(id, name, container = "nexus.activitybar", when) {
  return { id, name: name || humanizeIdentifier(id), container, when };
}

function normalizeCommandContribution(entry) {
  if (typeof entry === "string") return command(entry);
  if (!entry || typeof entry !== "object" || typeof entry.command !== "string") return null;
  return {
    command: entry.command,
    title: typeof entry.title === "string" ? entry.title : humanizeIdentifier(entry.command),
    category: typeof entry.category === "string" ? entry.category : "Nexus",
    icon: typeof entry.icon === "string" ? entry.icon : undefined,
  };
}

function normalizeLanguageContribution(entry) {
  if (typeof entry === "string") return language(entry, [humanizeIdentifier(entry)], []);
  if (!entry || typeof entry !== "object" || typeof entry.id !== "string") return null;
  return language(entry.id, entry.aliases, entry.extensions, entry.configuration);
}

function normalizeThemeContribution(entry) {
  if (!entry || typeof entry !== "object" || typeof entry.id !== "string") return null;
  return theme(
    entry.id,
    typeof entry.label === "string" ? entry.label : humanizeIdentifier(entry.id),
    typeof entry.uiTheme === "string" ? entry.uiTheme : "vs-dark",
    typeof entry.path === "string" ? entry.path : undefined,
  );
}

function normalizeViewContribution(entry) {
  if (typeof entry === "string") return view(entry);
  if (!entry || typeof entry !== "object" || typeof entry.id !== "string") return null;
  return view(
    entry.id,
    typeof entry.name === "string" ? entry.name : humanizeIdentifier(entry.id),
    typeof entry.container === "string" ? entry.container : "nexus.activitybar",
    typeof entry.when === "string" ? entry.when : undefined,
  );
}

function normalizeNamedContribution(entry, fieldName) {
  if (typeof entry === "string") return { [fieldName]: entry, label: humanizeIdentifier(entry) };
  if (!entry || typeof entry !== "object" || typeof entry[fieldName] !== "string") return null;
  return {
    ...entry,
    label: typeof entry.label === "string" ? entry.label : humanizeIdentifier(entry[fieldName]),
  };
}

function normalizeFormatterContribution(entry) {
  if (typeof entry === "string") return { language: entry, kind: "document" };
  if (!entry || typeof entry !== "object" || typeof entry.language !== "string") return null;
  return {
    language: entry.language,
    kind: typeof entry.kind === "string" ? entry.kind : "document",
    priority: typeof entry.priority === "number" ? entry.priority : 0,
  };
}

function normalizeContributionArray(value, normalizer) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => normalizer(entry)).filter(Boolean);
}

function normalizeContributes(contributes = {}) {
  const source = contributes && typeof contributes === "object" ? contributes : {};
  const normalized = {
    commands: normalizeContributionArray(source.commands, normalizeCommandContribution),
    languages: normalizeContributionArray(source.languages, normalizeLanguageContribution),
    themes: normalizeContributionArray(source.themes, normalizeThemeContribution),
    views: normalizeContributionArray(source.views, normalizeViewContribution),
    iconThemes: normalizeContributionArray(source.iconThemes, (entry) =>
      normalizeNamedContribution(entry, "id"),
    ),
    formatters: normalizeContributionArray(source.formatters, normalizeFormatterContribution),
    problemMatchers: normalizeContributionArray(source.problemMatchers, (entry) =>
      normalizeNamedContribution(entry, "name"),
    ),
    debugAdapters: normalizeContributionArray(source.debugAdapters, (entry) =>
      normalizeNamedContribution(entry, "type"),
    ),
    configuration: normalizeContributionArray(source.configuration, (entry) =>
      normalizeNamedContribution(entry, "id"),
    ),
  };

  return Object.fromEntries(
    Object.entries(normalized).filter(([, entries]) => entries.length > 0),
  );
}

function getContributionLabel(point) {
  return CONTRIBUTION_POINT_LABELS[point] || humanizeIdentifier(point);
}

function getContributionItemLabel(point, entry) {
  if (!entry || typeof entry !== "object") return "";
  if (point === "commands") return entry.title || entry.command || "";
  if (point === "languages") return entry.aliases?.[0] || entry.id || "";
  if (point === "themes") return entry.label || entry.id || "";
  if (point === "views") return entry.name || entry.id || "";
  if (point === "formatters") return entry.language || "";
  if (point === "problemMatchers") return entry.label || entry.name || "";
  return entry.label || entry.id || entry.name || entry.type || "";
}

export function summarizeExtensionContributions(contributes = {}) {
  return Object.entries(contributes)
    .filter(([, entries]) => Array.isArray(entries) && entries.length > 0)
    .map(([point, entries]) => ({
      point,
      label: getContributionLabel(point),
      count: entries.length,
      items: entries.map((entry) => getContributionItemLabel(point, entry)).filter(Boolean),
      primary: CORE_CONTRIBUTION_POINTS.includes(point),
    }));
}

export function formatContributionPreview(summary, limit = 2) {
  if (!summary) return "";
  const items = summary.items.slice(0, limit).join(", ");
  const suffix = summary.count > limit ? ` +${summary.count - limit}` : "";
  return items ? `${items}${suffix}` : `${summary.count} entries`;
}

export function describeActivationEvent(event) {
  if (event === "*") {
    return {
      id: event,
      type: "startup",
      label: "Every startup",
      detail: "Loads before the workbench is ready.",
      valid: true,
    };
  }

  if (event === "onStartupFinished") {
    return {
      id: event,
      type: "startup",
      label: "Startup finished",
      detail: "Loads after the editor shell is interactive.",
      valid: true,
    };
  }

  if (event === "onSave") {
    return {
      id: event,
      type: "document",
      label: "On save",
      detail: "Loads when a document save is requested.",
      valid: true,
    };
  }

  const [prefix, ...rest] = String(event || "").split(":");
  const value = rest.join(":");

  if (prefix === "onLanguage" && value) {
    return {
      id: event,
      type: "language",
      label: `Language: ${value}`,
      detail: `Loads when ${value} content is opened.`,
      valid: true,
    };
  }

  if (prefix === "onCommand" && value) {
    return {
      id: event,
      type: "command",
      label: `Command: ${value}`,
      detail: "Loads before the command is executed.",
      valid: true,
    };
  }

  if (prefix === "workspaceContains" && value) {
    return {
      id: event,
      type: "workspace",
      label: `Workspace: ${value}`,
      detail: "Loads when the workspace contains this file or glob.",
      valid: true,
    };
  }

  if (prefix === "onView" && value) {
    return {
      id: event,
      type: "view",
      label: `View: ${value}`,
      detail: "Loads when the contributed view is opened.",
      valid: true,
    };
  }

  if (prefix === "onDebug" && value) {
    return {
      id: event,
      type: "debug",
      label: `Debug: ${value}`,
      detail: "Loads when this debug adapter is requested.",
      valid: true,
    };
  }

  if (prefix === "onTaskType" && value) {
    return {
      id: event,
      type: "task",
      label: `Task: ${value}`,
      detail: "Loads when this task type is resolved.",
      valid: true,
    };
  }

  if (prefix === "onUri" && value) {
    return {
      id: event,
      type: "uri",
      label: `URI: ${value}`,
      detail: "Loads when this URI authority is opened.",
      valid: true,
    };
  }

  return {
    id: event,
    type: "unknown",
    label: String(event || "unknown"),
    detail: "Unknown activation event.",
    valid: false,
  };
}

function createContributionLookup(contributes) {
  return {
    commands: new Set((contributes.commands || []).map((entry) => entry.command)),
    languages: new Set((contributes.languages || []).map((entry) => entry.id)),
    themes: new Set((contributes.themes || []).map((entry) => entry.id)),
    views: new Set((contributes.views || []).map((entry) => entry.id)),
  };
}

function validateActivationBindings(manifest, diagnostics) {
  const lookup = createContributionLookup(manifest.contributes || {});

  for (const event of manifest.activationEvents || []) {
    const activation = describeActivationEvent(event);
    const value = String(event || "").split(":").slice(1).join(":");
    if (!activation.valid || !value) continue;

    if (activation.type === "command" && !lookup.commands.has(value)) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          "manifest.activationEvents.command_missing",
          `Activation command '${value}' is not contributed.`,
          "The command may still be registered at runtime, but it is hidden from the command palette manifest.",
        ),
      );
    }

    if (activation.type === "language" && !lookup.languages.has(value)) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          "manifest.activationEvents.language_missing",
          `Activation language '${value}' is not contributed.`,
          "Add a language contribution or use a workspace/command activation event.",
        ),
      );
    }

    if (activation.type === "view" && !lookup.views.has(value)) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          "manifest.activationEvents.view_missing",
          `Activation view '${value}' is not contributed.`,
          "Add a view contribution so activation can be planned from the UI.",
        ),
      );
    }
  }
}

function validateExtensionManifest(manifest) {
  const diagnostics = [];

  if (!manifest || typeof manifest !== "object") {
    return [createDiagnostic("error", "manifest.invalid", "Manifest is not an object.")];
  }

  for (const field of ["name", "displayName", "publisher", "version"]) {
    if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
      diagnostics.push(
        createDiagnostic("error", `manifest.${field}`, `Manifest field '${field}' is required.`),
      );
    }
  }

  if (!Array.isArray(manifest.activationEvents)) {
    diagnostics.push(
      createDiagnostic("error", "manifest.activationEvents", "activationEvents must be an array."),
    );
  } else {
    for (const event of manifest.activationEvents) {
      const activation = describeActivationEvent(event);
      if (!activation.valid) {
        diagnostics.push(
          createDiagnostic(
            "warning",
            "manifest.activationEvents.unknown",
            `Unknown activation event '${event}'.`,
            "The extension can still be installed, but activation cannot be planned.",
          ),
        );
      }
    }
  }

  const contributes = manifest.contributes;
  if (!contributes || typeof contributes !== "object" || Array.isArray(contributes)) {
    diagnostics.push(
      createDiagnostic("error", "manifest.contributes", "contributes must be an object."),
    );
  } else {
    for (const point of CORE_CONTRIBUTION_POINTS) {
      const entries = contributes[point];
      if (entries !== undefined && !Array.isArray(entries)) {
        diagnostics.push(
          createDiagnostic("error", `manifest.contributes.${point}`, `${point} must be an array.`),
        );
      }
    }

    for (const entry of contributes.commands || []) {
      if (typeof entry.command !== "string" || typeof entry.title !== "string") {
        diagnostics.push(
          createDiagnostic(
            "error",
            "manifest.contributes.commands",
            "Command contributions require command and title.",
          ),
        );
      }
    }

    for (const entry of contributes.languages || []) {
      if (typeof entry.id !== "string") {
        diagnostics.push(
          createDiagnostic(
            "error",
            "manifest.contributes.languages",
            "Language contributions require an id.",
          ),
        );
      }
    }

    for (const entry of contributes.themes || []) {
      if (
        typeof entry.id !== "string" ||
        typeof entry.label !== "string" ||
        typeof entry.uiTheme !== "string"
      ) {
        diagnostics.push(
          createDiagnostic(
            "error",
            "manifest.contributes.themes",
            "Theme contributions require id, label and uiTheme.",
          ),
        );
      }
    }

    for (const entry of contributes.views || []) {
      if (typeof entry.id !== "string" || typeof entry.name !== "string") {
        diagnostics.push(
          createDiagnostic(
            "error",
            "manifest.contributes.views",
            "View contributions require id and name.",
          ),
        );
      }
    }

    validateActivationBindings(manifest, diagnostics);
  }

  return diagnostics;
}

const createManifest = ({
  id,
  name,
  displayName,
  publisher,
  version,
  description,
  category,
  source = "marketplace",
  icon = "NX",
  iconColor = "#7c8cff",
  verified = false,
  featured = false,
  rating = 4.6,
  downloads = "0",
  tags = [],
  capabilities = [],
  activationEvents = [],
  contributes = {},
  repository,
  localPath,
  updateAvailable = false,
  bundled = false,
}) => {
  const normalizedActivationEvents = toStringArray(activationEvents);
  const normalizedContributes = normalizeContributes(contributes);
  const manifest = {
    manifestVersion: 1,
    name,
    displayName: displayName || name,
    publisher,
    version,
    description,
    categories: [category],
    engines: { nexusCode: ">=1.0.0" },
    activationEvents: normalizedActivationEvents,
    contributes: normalizedContributes,
  };
  const manifestDiagnostics = validateExtensionManifest(manifest);

  return {
    id,
    name,
    displayName: displayName || name,
    publisher,
    version,
    description,
    category,
    source,
    icon,
    iconColor,
    verified,
    featured,
    rating,
    downloads,
    tags: toStringArray(tags),
    capabilities: toStringArray(capabilities),
    activationEvents: normalizedActivationEvents,
    activationSummary: normalizedActivationEvents.map(describeActivationEvent),
    contributes: normalizedContributes,
    contributionSummary: summarizeExtensionContributions(normalizedContributes),
    repository,
    localPath,
    updateAvailable,
    bundled,
    manifest,
    manifestDiagnostics,
    manifestErrors: manifestDiagnostics.filter((diagnostic) => diagnostic.level === "error"),
    manifestWarnings: manifestDiagnostics.filter((diagnostic) => diagnostic.level === "warning"),
  };
};

export const EXTENSION_CATALOG = [
  createManifest({
    id: "nexus-theme-core",
    name: "nexus.theme-core",
    displayName: "Nexus Theme Core",
    publisher: "Nexus",
    version: "1.4.0",
    description: "Native tokens for Nexus Code, editor chrome and syntax skins.",
    category: "theme",
    source: "bundled",
    icon: "NC",
    iconColor: "#7c8cff",
    verified: true,
    featured: true,
    rating: 5,
    downloads: "Bundled",
    tags: ["theme", "tokens", "zed"],
    capabilities: ["Theme", "Icon theme", "Workbench colors"],
    activationEvents: ["onStartupFinished", "onView:nexus.theme.preview"],
    bundled: true,
    contributes: {
      themes: [
        theme("nexus-dark", "Nexus Dark", "vs-dark", "./themes/nexus-dark.json"),
        theme("nexus-contrast", "Nexus Contrast", "vs-dark", "./themes/nexus-contrast.json"),
      ],
      iconThemes: [{ id: "nexus-minimal", label: "Nexus Minimal" }],
      views: [view("nexus.theme.preview", "Theme Preview", "nexus.explorer")],
    },
  }),
  createManifest({
    id: "prettier",
    name: "prettier.formatter",
    displayName: "Prettier",
    publisher: "Prettier",
    version: "3.2.5",
    description: "Opinionated formatter for web, markdown and config files.",
    category: "formatter",
    source: "marketplace",
    icon: "PR",
    iconColor: "#f97316",
    verified: true,
    featured: true,
    rating: 4.9,
    downloads: "2.1M",
    tags: ["format", "javascript", "markdown"],
    capabilities: ["Format document", "Format on save", "Config discovery"],
    activationEvents: ["onLanguage:javascript", "onLanguage:typescript", "onSave"],
    contributes: {
      commands: [command("prettier.formatDocument", "Format Document", "Format")],
      formatters: ["javascript", "typescript", "css", "json", "markdown"],
      languages: [
        language("javascript", ["JavaScript"], [".js", ".jsx"]),
        language("typescript", ["TypeScript"], [".ts", ".tsx"]),
        language("markdown", ["Markdown"], [".md", ".mdx"]),
      ],
    },
  }),
  createManifest({
    id: "eslint",
    name: "microsoft.eslint",
    displayName: "ESLint",
    publisher: "Microsoft",
    version: "2.4.4",
    description: "Project-aware linting, quick fixes and problem reporting.",
    category: "diagnostics",
    source: "marketplace",
    icon: "ES",
    iconColor: "#a78bfa",
    verified: true,
    featured: true,
    rating: 4.8,
    downloads: "1.8M",
    tags: ["lint", "javascript", "typescript"],
    capabilities: ["Diagnostics", "Code actions", "Workspace config"],
    activationEvents: ["workspaceContains:.eslintrc", "onLanguage:javascript"],
    contributes: {
      commands: [
        command("eslint.fixAll", "Fix All Auto-Fixable Problems", "ESLint"),
        command("eslint.restart", "Restart ESLint Server", "ESLint"),
      ],
      languages: [
        language("javascript", ["JavaScript"], [".js", ".jsx"]),
        language("typescript", ["TypeScript"], [".ts", ".tsx"]),
      ],
      problemMatchers: [{ name: "eslint", label: "ESLint" }],
      views: [view("eslint.problems", "ESLint Problems", "nexus.problems")],
    },
  }),
  createManifest({
    id: "gitlens",
    name: "gitkraken.gitlens",
    displayName: "GitLens",
    publisher: "GitKraken",
    version: "14.9.0",
    description: "Blame, history, commit graph and authorship context.",
    category: "git",
    source: "marketplace",
    icon: "GL",
    iconColor: "#f59e0b",
    verified: true,
    featured: true,
    rating: 4.9,
    downloads: "1.5M",
    tags: ["git", "blame", "history"],
    capabilities: ["SCM decorations", "Blame annotations", "Commit graph"],
    activationEvents: ["onStartupFinished", "workspaceContains:.git", "onView:gitlens.graph"],
    contributes: {
      commands: [
        command("gitlens.openGraph", "Open Commit Graph", "GitLens"),
        command("gitlens.toggleBlame", "Toggle File Blame", "GitLens"),
      ],
      views: [
        view("gitlens.graph", "Commit Graph", "source-control"),
        view("gitlens.timeline", "File Timeline", "timeline"),
      ],
    },
    updateAvailable: true,
  }),
  createManifest({
    id: "nexus-ai-workflows",
    name: "nexus.ai-workflows",
    displayName: "Nexus AI Workflows",
    publisher: "Nexus Labs",
    version: "0.9.8",
    description: "Agent commands, patch review prompts and workspace summaries.",
    category: "ai",
    source: "local",
    icon: "AI",
    iconColor: "#22d3ee",
    verified: true,
    featured: true,
    rating: 4.9,
    downloads: "Local",
    tags: ["agent", "review", "commands"],
    capabilities: ["Command palette", "Workspace context", "Patch summaries"],
    activationEvents: ["onCommand:nexus.ai.review", "onCommand:nexus.ai.summarize"],
    localPath: ".nexus/extensions/nexus-ai-workflows/manifest.json",
    contributes: {
      commands: [
        command("nexus.ai.review", "Review Current Patch", "Nexus AI"),
        command("nexus.ai.summarize", "Summarize Workspace", "Nexus AI"),
        command("nexus.ai.explain", "Explain Selection", "Nexus AI"),
      ],
      views: [view("nexus.ai.activity", "AI Activity", "nexus.activitybar")],
    },
  }),
  createManifest({
    id: "tailwind-intellisense",
    name: "tailwindlabs.tailwind-intellisense",
    displayName: "Tailwind CSS IntelliSense",
    publisher: "Tailwind Labs",
    version: "0.10.5",
    description: "Class completion, lint hints and design token previews.",
    category: "tools",
    source: "marketplace",
    icon: "TW",
    iconColor: "#06b6d4",
    verified: true,
    rating: 4.9,
    downloads: "980K",
    tags: ["tailwind", "css", "autocomplete"],
    capabilities: ["Completions", "Hover preview", "CSS diagnostics"],
    activationEvents: ["workspaceContains:tailwind.config.js", "onLanguage:css"],
    contributes: {
      languages: [language("css", ["CSS"], [".css"]), language("html", ["HTML"], [".html"])],
      commands: [command("tailwind.sortSelection", "Sort Tailwind Classes", "Tailwind")],
      views: [view("tailwind.tokens", "Tailwind Tokens", "nexus.explorer")],
    },
  }),
  createManifest({
    id: "docker",
    name: "microsoft.docker",
    displayName: "Docker",
    publisher: "Microsoft",
    version: "1.29.2",
    description: "Container files, compose helpers and local runtime actions.",
    category: "runtime",
    source: "marketplace",
    icon: "DK",
    iconColor: "#2496ed",
    verified: true,
    rating: 4.6,
    downloads: "740K",
    tags: ["docker", "containers", "devops"],
    capabilities: ["Dockerfile syntax", "Compose tasks", "Container explorer"],
    activationEvents: ["workspaceContains:Dockerfile", "workspaceContains:compose.yaml"],
    contributes: {
      languages: [
        language("dockerfile", ["Dockerfile"], ["Dockerfile"]),
        language("compose", ["Compose"], [".yaml", ".yml"]),
      ],
      commands: [command("docker.compose.up", "Compose Up", "Docker")],
      views: [view("docker.containers", "Containers", "nexus.runtime")],
    },
  }),
  createManifest({
    id: "error-lens",
    name: "usernamehw.error-lens",
    displayName: "Error Lens",
    publisher: "usernamehw",
    version: "3.16.0",
    description: "Inline emphasis for warnings, errors and info diagnostics.",
    category: "diagnostics",
    source: "marketplace",
    icon: "EL",
    iconColor: "#ef4444",
    rating: 4.8,
    downloads: "620K",
    tags: ["errors", "warnings", "diagnostics"],
    capabilities: ["Inline diagnostics", "Severity styling"],
    activationEvents: ["onStartupFinished"],
    contributes: {
      commands: [command("errorLens.toggle", "Toggle Error Lens", "Diagnostics")],
      views: [view("errorLens.overview", "Diagnostic Emphasis", "nexus.problems")],
    },
  }),
  createManifest({
    id: "material-icons",
    name: "pkief.material-icon-theme",
    displayName: "Material Icon Theme",
    publisher: "Philipp Kief",
    version: "5.1.0",
    description: "File and folder icon contribution pack.",
    category: "theme",
    source: "marketplace",
    icon: "MI",
    iconColor: "#4caf50",
    rating: 4.9,
    downloads: "1.2M",
    tags: ["icons", "theme", "files"],
    capabilities: ["File icons", "Folder icons"],
    activationEvents: ["onStartupFinished"],
    contributes: {
      iconThemes: [{ id: "material-icons", label: "Material Icon Theme" }],
      commands: [command("materialIcons.activate", "Activate Material Icons", "Theme")],
    },
  }),
  createManifest({
    id: "rest-client",
    name: "humao.rest-client",
    displayName: "REST Client",
    publisher: "Huachao Mao",
    version: "0.25.1",
    description: "HTTP request files with response previews inside the editor.",
    category: "tools",
    source: "marketplace",
    icon: "RC",
    iconColor: "#10b981",
    rating: 4.7,
    downloads: "430K",
    tags: ["http", "rest", "api"],
    capabilities: ["HTTP runner", "Response preview", "Environment files"],
    activationEvents: ["onLanguage:http", "onCommand:rest.sendRequest"],
    contributes: {
      commands: [
        command("rest.sendRequest", "Send Request", "REST"),
        command("rest.rerunLastRequest", "Rerun Last Request", "REST"),
      ],
      languages: [language("http", ["HTTP"], [".http", ".rest"])],
      views: [view("rest.responses", "REST Responses", "nexus.activitybar")],
    },
  }),
  createManifest({
    id: "live-share",
    name: "microsoft.live-share",
    displayName: "Live Share",
    publisher: "Microsoft",
    version: "1.0.5931",
    description: "Shared sessions, terminals and collaborative debugging.",
    category: "collaboration",
    source: "marketplace",
    icon: "LS",
    iconColor: "#3b82f6",
    verified: true,
    rating: 4.5,
    downloads: "860K",
    tags: ["collaboration", "pairing", "sharing"],
    capabilities: ["Shared editing", "Shared terminal", "Session links"],
    activationEvents: ["onCommand:liveshare.start"],
    contributes: {
      commands: [
        command("liveshare.start", "Start Collaboration Session", "Live Share"),
        command("liveshare.join", "Join Collaboration Session", "Live Share"),
      ],
      views: [view("liveshare.sessions", "Live Sessions", "nexus.activitybar")],
    },
  }),
  createManifest({
    id: "rainbow-brackets",
    name: "2gua.rainbow-brackets",
    displayName: "Rainbow Brackets",
    publisher: "2gua",
    version: "0.0.6",
    description: "Readable bracket colorization for dense source files.",
    category: "theme",
    source: "marketplace",
    icon: "RB",
    iconColor: "#ec4899",
    rating: 4.6,
    downloads: "390K",
    tags: ["brackets", "colors", "readability"],
    capabilities: ["Bracket colors", "Editor decoration"],
    activationEvents: ["onLanguage:javascript", "onLanguage:typescript", "onLanguage:json"],
    contributes: {
      commands: [command("rainbowBrackets.toggle", "Toggle Rainbow Brackets", "Theme")],
      languages: [
        language("javascript", ["JavaScript"], [".js", ".jsx"]),
        language("typescript", ["TypeScript"], [".ts", ".tsx"]),
        language("json", ["JSON"], [".json"]),
      ],
      themes: [theme("rainbow-brackets-dark", "Rainbow Brackets Dark", "vs-dark")],
    },
  }),
  createManifest({
    id: "code-spell",
    name: "streetsidesoftware.code-spell-checker",
    displayName: "Code Spell Checker",
    publisher: "Street Side Software",
    version: "3.0.1",
    description: "Spelling checker for source code, comments and markdown.",
    category: "diagnostics",
    source: "marketplace",
    icon: "SC",
    iconColor: "#22c55e",
    rating: 4.7,
    downloads: "510K",
    tags: ["spelling", "linting", "comments"],
    capabilities: ["Spelling diagnostics", "Dictionaries", "Quick fixes"],
    activationEvents: ["onLanguage:markdown", "onLanguage:javascript", "onLanguage:typescript"],
    contributes: {
      commands: [command("cspell.addWord", "Add Word to Workspace Dictionary", "Spelling")],
      languages: [
        language("markdown", ["Markdown"], [".md", ".mdx"]),
        language("javascript", ["JavaScript"], [".js", ".jsx"]),
        language("typescript", ["TypeScript"], [".ts", ".tsx"]),
      ],
      problemMatchers: [{ name: "cspell", label: "Code Spell Checker" }],
    },
  }),
  createManifest({
    id: "workspace-manifest-tools",
    name: "local.workspace-manifest-tools",
    displayName: "Workspace Manifest Tools",
    publisher: "Local Workspace",
    version: "0.3.2",
    description: "Local manifest inspector for plugin authors.",
    category: "tools",
    source: "local",
    icon: "LM",
    iconColor: "#f43f5e",
    rating: 4.7,
    downloads: "Local",
    tags: ["manifest", "local", "plugins"],
    capabilities: ["Manifest validation", "Contribution explorer", "Local reload"],
    activationEvents: ["workspaceContains:.nexus/extensions", "onCommand:extensions.validateManifest"],
    localPath: ".nexus/extensions/workspace-manifest-tools/manifest.json",
    contributes: {
      commands: [
        command("extensions.reloadLocal", "Reload Local Extensions", "Extensions"),
        command("extensions.validateManifest", "Validate Extension Manifest", "Extensions"),
      ],
      views: [view("extensions.manifestInspector", "Manifest Inspector", "nexus.activitybar")],
    },
  }),
];

const EXTENSION_BY_ID = new Map(EXTENSION_CATALOG.map((extension) => [extension.id, extension]));

function readJsonStorage(key) {
  if (!hasStorage()) return { found: false, value: null, error: null };
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return { found: false, value: null, error: null };
    return { found: true, value: JSON.parse(raw), error: null };
  } catch (error) {
    return { found: true, value: null, error: getErrorMessage(error) };
  }
}

function writeJsonStorage(key, value, level = "error") {
  if (!hasStorage()) {
    return createDiagnostic(
      level,
      "storage.unavailable",
      "localStorage is not available.",
      "Extension changes are kept in memory only.",
    );
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return null;
  } catch (error) {
    return createDiagnostic(
      level,
      "storage.write_failed",
      `Could not write ${key}.`,
      getErrorMessage(error),
    );
  }
}

function getExtensionContributionPoints(extension) {
  return extension.contributionSummary.map((summary) => summary.point).sort();
}

function getRecordLastError(extension, raw) {
  const persistedError = normalizeOptionalString(raw.lastError);
  if (persistedError) return persistedError;
  return extension.manifestErrors[0]?.message || null;
}

function normalizeDisabledReason(extension, raw, installed, enabled, requestedEnabled) {
  if (!installed || enabled) return null;
  const persistedReason = normalizeOptionalString(raw.disabledReason);
  if (persistedReason) return persistedReason;
  if (extension.manifestErrors.length > 0) return "manifest_error";
  return requestedEnabled ? "runtime_error" : "user";
}

function createDefaultRecords() {
  return DEFAULT_INSTALLED_IDS.reduce((records, id) => {
    const extension = EXTENSION_BY_ID.get(id);
    if (!extension) return records;
    records[id] = normalizeKnownRecord(extension, {
      installed: true,
      enabled: true,
      installedAt: "bundled",
      source: extension.source,
      version: extension.version,
    });
    return records;
  }, {});
}

export function createDefaultExtensionRecords() {
  return createDefaultRecords();
}

function inferInstalled(rawRecord) {
  if (rawRecord === true) return true;
  if (!rawRecord || typeof rawRecord !== "object") return false;
  return rawRecord.installed === true || (rawRecord.installed !== false && rawRecord.enabled === true);
}

function normalizeKnownRecord(extension, rawRecord) {
  const installed = inferInstalled(rawRecord);
  const raw = rawRecord && typeof rawRecord === "object" ? rawRecord : {};
  const requestedEnabled = raw.enabled !== false;
  const enabled = installed ? requestedEnabled && !extension.manifestErrors.length : false;

  return {
    schemaVersion: EXTENSION_REGISTRY_VERSION,
    installed,
    enabled,
    installedAt: normalizeTimestamp(raw.installedAt),
    source: extension.source,
    version: extension.version,
    disabledReason: normalizeDisabledReason(extension, raw, installed, enabled, requestedEnabled),
    lastError: installed ? getRecordLastError(extension, raw) : null,
    lastActivatedAt: normalizeTimestamp(raw.lastActivatedAt),
    activationEvents: extension.activationEvents,
    contributionPoints: getExtensionContributionPoints(extension),
    manifestVersion: extension.manifest.manifestVersion,
    localPath: extension.localPath || normalizeOptionalString(raw.localPath),
    updatedAt: normalizeTimestamp(raw.updatedAt),
  };
}

function normalizeUnknownRecord(id, rawRecord, diagnostics, registrySource) {
  if (!inferInstalled(rawRecord)) return null;
  const raw = rawRecord && typeof rawRecord === "object" ? rawRecord : {};
  diagnostics.push(
    createDiagnostic(
      "warning",
      "manifest.missing",
      `Installed extension '${id}' has no catalog manifest.`,
      `Kept from ${registrySource}; disable activation until a local manifest is available.`,
    ),
  );

  return {
    schemaVersion: EXTENSION_REGISTRY_VERSION,
    installed: true,
    enabled: false,
    installedAt: normalizeTimestamp(raw.installedAt) || registrySource,
    source: normalizeOptionalString(raw.source) || "local",
    version: normalizeOptionalString(raw.version) || "0.0.0",
    missingManifest: true,
    disabledReason: "manifest_missing",
    lastError: normalizeOptionalString(raw.lastError) || "Manifest missing",
    lastActivatedAt: normalizeTimestamp(raw.lastActivatedAt),
    activationEvents: toStringArray(raw.activationEvents),
    contributionPoints: toStringArray(raw.contributionPoints),
    manifestVersion: 0,
    localPath: normalizeOptionalString(raw.localPath),
    updatedAt: normalizeTimestamp(raw.updatedAt),
  };
}

function normalizeRecordMap(rawRecords, registrySource, diagnostics) {
  const normalized = {};
  const source = rawRecords && typeof rawRecords === "object" && !Array.isArray(rawRecords) ? rawRecords : {};

  for (const [id, rawRecord] of Object.entries(source)) {
    const extension = EXTENSION_BY_ID.get(id);
    if (extension) {
      normalized[id] = normalizeKnownRecord(extension, rawRecord);
      continue;
    }

    const unknownRecord = normalizeUnknownRecord(id, rawRecord, diagnostics, registrySource);
    if (unknownRecord) normalized[id] = unknownRecord;
  }

  return normalized;
}

function normalizeLegacyIds(ids, registrySource, diagnostics) {
  const normalized = {};

  for (const id of ids) {
    const extension = EXTENSION_BY_ID.get(id);
    if (extension) {
      normalized[id] = normalizeKnownRecord(extension, {
        installed: true,
        enabled: !extension.manifestErrors.length,
        installedAt: registrySource,
        source: extension.source,
        version: extension.version,
        lastError: null,
      });
      continue;
    }

    const unknownRecord = normalizeUnknownRecord(id, true, diagnostics, registrySource);
    if (unknownRecord) normalized[id] = unknownRecord;
  }

  return normalized;
}

function migratePersistedRegistry(value, registrySource, diagnostics, migrations) {
  if (Array.isArray(value)) {
    migrations.push(
      createDiagnostic(
        "info",
        "storage.migrated_legacy_array",
        `Legacy extension list migrated to registry v${EXTENSION_REGISTRY_VERSION}.`,
        `${value.length} installed id(s) imported from ${registrySource}.`,
      ),
    );
    return normalizeLegacyIds(toStringArray(value), registrySource, diagnostics);
  }

  if (!value || typeof value !== "object") return null;

  const legacyInstalledIds = Array.isArray(value.installed)
    ? value.installed
    : Array.isArray(value.extensions)
      ? value.extensions
      : null;

  if (legacyInstalledIds) {
    const records = normalizeLegacyIds(toStringArray(legacyInstalledIds), registrySource, diagnostics);
    const disabledIds = new Set(
      toStringArray(value.disabled || value.disabledExtensions || value.paused),
    );

    for (const id of disabledIds) {
      if (!records[id]) continue;
      records[id] = {
        ...records[id],
        enabled: false,
        disabledReason: "legacy_disabled",
      };
    }

    migrations.push(
      createDiagnostic(
        "info",
        "storage.migrated_legacy_object",
        `Legacy extension object migrated to registry v${EXTENSION_REGISTRY_VERSION}.`,
        `${Object.keys(records).length} extension record(s) imported from ${registrySource}.`,
      ),
    );
    return records;
  }

  const versionNumber = Number(value.version);
  const version = Number.isFinite(versionNumber) ? versionNumber : 0;
  const rawRecords =
    value.records && typeof value.records === "object" && !Array.isArray(value.records)
      ? value.records
      : value;

  if (version > EXTENSION_REGISTRY_VERSION) {
    diagnostics.push(
      createDiagnostic(
        "warning",
        "storage.newer_schema",
        `Registry schema v${version} is newer than this client.`,
        "Known fields were preserved where possible.",
      ),
    );
  }

  if (version !== EXTENSION_REGISTRY_VERSION) {
    migrations.push(
      createDiagnostic(
        "info",
        "storage.normalized_schema",
        `Extension registry normalized to v${EXTENSION_REGISTRY_VERSION}.`,
        version ? `Previous schema was v${version}.` : `Previous storage came from ${registrySource}.`,
      ),
    );
  }

  return normalizeRecordMap(rawRecords, registrySource, diagnostics);
}

export function loadExtensionRegistryState() {
  const diagnostics = [];
  const migrations = [];

  if (!hasStorage()) {
    diagnostics.push(
      createDiagnostic(
        "warning",
        "storage.unavailable",
        "localStorage is unavailable.",
        "Using bundled defaults for this session.",
      ),
    );
    return {
      records: createDefaultRecords(),
      diagnostics,
      migrations,
      needsPersist: false,
      sourceKey: "memory",
      storageAvailable: false,
      storageHealth: "unavailable",
    };
  }

  const current = readJsonStorage(EXTENSIONS_STORAGE_KEY);
  if (current.error) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "storage.parse_current",
        "Extension registry could not be parsed.",
        current.error,
      ),
    );
  } else if (current.found) {
    const records = migratePersistedRegistry(current.value, EXTENSIONS_STORAGE_KEY, diagnostics, migrations);
    if (records) {
      return {
        records,
        diagnostics,
        migrations,
        needsPersist: migrations.length > 0,
        sourceKey: EXTENSIONS_STORAGE_KEY,
        storageAvailable: true,
        storageHealth: migrations.length > 0 ? "migrated" : "ok",
      };
    }
  }

  const legacy = readJsonStorage(LEGACY_EXTENSIONS_STORAGE_KEY);
  if (legacy.error) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "storage.parse_legacy",
        "Legacy extension list could not be parsed.",
        legacy.error,
      ),
    );
  } else if (legacy.found) {
    const records = migratePersistedRegistry(
      legacy.value,
      LEGACY_EXTENSIONS_STORAGE_KEY,
      diagnostics,
      migrations,
    );
    if (records) {
      return {
        records,
        diagnostics,
        migrations,
        needsPersist: true,
        sourceKey: LEGACY_EXTENSIONS_STORAGE_KEY,
        storageAvailable: true,
        storageHealth: current.error || legacy.error ? "degraded" : "migrated",
      };
    }
  }

  const usingDefaultsAfterError = Boolean(current.error || legacy.error);

  return {
    records: createDefaultRecords(),
    diagnostics,
    migrations,
    needsPersist: !usingDefaultsAfterError,
    sourceKey: "defaults",
    storageAvailable: true,
    storageHealth: usingDefaultsAfterError ? "degraded" : "default",
  };
}

export function loadExtensionRegistry() {
  return loadExtensionRegistryState().records;
}

function normalizeRecordsForSave(records) {
  const source = records && typeof records === "object" && !Array.isArray(records) ? records : {};
  return normalizeRecordMap(source, "runtime", []);
}

export function saveExtensionRegistry(records) {
  const normalized = normalizeRecordsForSave(records);
  const payload = {
    version: EXTENSION_REGISTRY_VERSION,
    records: normalized,
    updatedAt: new Date().toISOString(),
  };
  const primaryError = writeJsonStorage(EXTENSIONS_STORAGE_KEY, payload);
  const legacyError = writeJsonStorage(
    LEGACY_EXTENSIONS_STORAGE_KEY,
    getInstalledExtensionIds(normalized),
    "warning",
  );

  if (primaryError) {
    return {
      ok: false,
      diagnostics: [primaryError, legacyError].filter(Boolean),
    };
  }

  return {
    ok: true,
    diagnostics: legacyError ? [legacyError] : [],
    persistedAt: payload.updatedAt,
  };
}

export function getInstalledExtensionIds(records) {
  return Object.entries(records || {})
    .filter(([, record]) => record?.installed)
    .map(([id]) => id);
}

export function getEnabledExtensionIds(records) {
  return Object.entries(records || {})
    .filter(([, record]) => record?.installed && record?.enabled)
    .map(([id]) => id);
}

function createMissingManifestExtension(id, record) {
  const manifest = {
    manifestVersion: 1,
    name: id,
    displayName: id,
    publisher: "Unknown",
    version: record?.version || "0.0.0",
    description: "Installed record exists, but no extension manifest was found.",
    categories: ["tools"],
    engines: { nexusCode: ">=1.0.0" },
    activationEvents: [],
    contributes: {},
  };
  const manifestErrors = [
    createDiagnostic(
      "error",
      "manifest.missing",
      "Manifest missing.",
      "Remove the record or add a local extension manifest.",
    ),
  ];

  return {
    id,
    name: id,
    displayName: id,
    publisher: "Unknown",
    version: manifest.version,
    description: manifest.description,
    category: "tools",
    source: record?.source || "local",
    icon: "??",
    iconColor: "#f87171",
    verified: false,
    featured: false,
    rating: 0,
    downloads: "Local",
    tags: ["missing-manifest", "local"],
    capabilities: ["Manifest missing"],
    activationEvents: [],
    activationSummary: [],
    contributes: {},
    contributionSummary: [],
    localPath: record?.localPath,
    updateAvailable: false,
    bundled: false,
    manifest,
    manifestDiagnostics: manifestErrors,
    manifestErrors,
    manifestWarnings: [],
    installed: true,
    enabled: false,
    installedAt: record?.installedAt || null,
    disabledReason: record?.disabledReason || "manifest_missing",
    lastError: record?.lastError || "Manifest missing",
    lastActivatedAt: record?.lastActivatedAt || null,
    health: "error",
    searchableText: `${id} missing manifest local`.toLowerCase(),
  };
}

export function resolveExtensions(records) {
  const resolved = EXTENSION_CATALOG.map((extension) => {
    const record = normalizeKnownRecord(extension, records?.[extension.id]);
    const searchableText = [
      extension.displayName,
      extension.name,
      extension.publisher,
      extension.description,
      extension.category,
      extension.source,
      ...extension.tags,
      ...extension.capabilities,
      ...extension.activationEvents,
      ...extension.contributionSummary.flatMap((summary) => [
        summary.label,
        ...summary.items,
      ]),
    ]
      .join(" ")
      .toLowerCase();

    return {
      ...extension,
      installed: record.installed,
      enabled: record.enabled,
      installedAt: record.installedAt,
      disabledReason: record.disabledReason,
      lastError: record.lastError,
      lastActivatedAt: record.lastActivatedAt,
      contributionPoints: record.contributionPoints,
      health: extension.manifestErrors.length > 0 ? "error" : extension.manifestWarnings.length > 0 ? "warning" : "ok",
      searchableText,
    };
  });

  const missingManifestExtensions = Object.entries(records || {})
    .filter(([id, record]) => record?.installed && !EXTENSION_BY_ID.has(id))
    .map(([id, record]) => createMissingManifestExtension(id, record));

  return [...resolved, ...missingManifestExtensions];
}

export function filterExtensions(
  extensions,
  { query = "", category = "all", source = "all", state = "all", contribution = "all" },
) {
  const normalizedQuery = query.trim().toLowerCase();
  return extensions.filter((extension) => {
    if (category !== "all" && extension.category !== category) return false;
    if (source !== "all" && extension.source !== source) return false;
    if (state === "installed" && !extension.installed) return false;
    if (state === "enabled" && (!extension.installed || !extension.enabled)) return false;
    if (state === "disabled" && (!extension.installed || extension.enabled)) return false;
    if (state === "available" && extension.installed) return false;
    if (state === "updates" && (!extension.installed || !extension.updateAvailable)) return false;
    if (state === "errors" && extension.health !== "error") return false;
    if (
      contribution !== "all" &&
      (!Array.isArray(extension.contributes?.[contribution]) ||
        extension.contributes[contribution].length === 0)
    ) {
      return false;
    }
    if (normalizedQuery && !extension.searchableText.includes(normalizedQuery)) return false;
    return true;
  });
}

export function getExtensionStats(records) {
  const installed = getInstalledExtensionIds(records);
  const enabled = getEnabledExtensionIds(records);
  const contributions = collectExtensionContributions(records);
  const activationPlan = collectExtensionActivationPlan(records);
  const updates = EXTENSION_CATALOG.filter(
    (extension) => records?.[extension.id]?.installed && extension.updateAvailable,
  );
  const unknownInstalled = Object.entries(records || {}).filter(
    ([id, record]) => record?.installed && !EXTENSION_BY_ID.has(id),
  );
  const invalidInstalled = EXTENSION_CATALOG.filter(
    (extension) => records?.[extension.id]?.installed && extension.manifestErrors.length > 0,
  ).length;
  const local = EXTENSION_CATALOG.filter((extension) => extension.source === "local").length;

  return {
    total: EXTENSION_CATALOG.length + unknownInstalled.length,
    installed: installed.length,
    enabled: enabled.length,
    disabled: Math.max(installed.length - enabled.length, 0),
    updates: updates.length,
    local: local + unknownInstalled.length,
    errors: invalidInstalled + unknownInstalled.length,
    commands: contributions.commands?.length || 0,
    views: contributions.views?.length || 0,
    languages: contributions.languages?.length || 0,
    themes: contributions.themes?.length || 0,
    activationEvents: activationPlan.events.length,
  };
}

export function installExtension(records, extensionId) {
  const extension = EXTENSION_BY_ID.get(extensionId);
  if (!extension || extension.manifestErrors.length > 0) return records;
  return {
    ...records,
    [extensionId]: normalizeKnownRecord(extension, {
      installed: true,
      enabled: true,
      installedAt: new Date().toISOString(),
      source: extension.source,
      version: extension.version,
      lastError: null,
      updatedAt: new Date().toISOString(),
    }),
  };
}

export function uninstallExtension(records, extensionId) {
  const extension = EXTENSION_BY_ID.get(extensionId);
  const current = records?.[extensionId] || {};
  return {
    ...records,
    [extensionId]: {
      schemaVersion: EXTENSION_REGISTRY_VERSION,
      installed: false,
      enabled: false,
      installedAt: null,
      disabledReason: "uninstalled",
      source: extension?.source || current.source || "local",
      version: extension?.version || current.version || "0.0.0",
      lastError: null,
      lastActivatedAt: null,
      activationEvents: extension?.activationEvents || toStringArray(current.activationEvents),
      contributionPoints: extension
        ? getExtensionContributionPoints(extension)
        : toStringArray(current.contributionPoints),
      manifestVersion: extension?.manifest?.manifestVersion || current.manifestVersion || 0,
      localPath: extension?.localPath || normalizeOptionalString(current.localPath),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function setExtensionEnabled(records, extensionId, enabled) {
  const extension = EXTENSION_BY_ID.get(extensionId);
  if (!extension || extension.manifestErrors.length > 0) return records;
  const current = normalizeKnownRecord(extension, records?.[extensionId]);
  if (!current.installed) return records;
  return {
    ...records,
    [extensionId]: {
      ...current,
      enabled: Boolean(enabled),
      disabledReason: enabled ? null : "user",
      lastError: enabled ? null : current.lastError,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function collectExtensionContributions(records) {
  const contributions = {};
  for (const extension of EXTENSION_CATALOG) {
    const record = normalizeKnownRecord(extension, records?.[extension.id]);
    if (!record.installed || !record.enabled || extension.manifestErrors.length > 0) continue;

    for (const [point, entries] of Object.entries(extension.contributes)) {
      if (!Array.isArray(entries) || entries.length === 0) continue;
      contributions[point] ||= [];
      contributions[point].push(
        ...entries.map((entry) => ({
          ...entry,
          extensionId: extension.id,
          extensionName: extension.displayName,
        })),
      );
    }
  }
  return contributions;
}

export function collectExtensionActivationPlan(records) {
  const events = [];
  const byType = {};

  for (const extension of EXTENSION_CATALOG) {
    const record = normalizeKnownRecord(extension, records?.[extension.id]);
    if (!record.installed || !record.enabled || extension.manifestErrors.length > 0) continue;

    for (const activation of extension.activationSummary) {
      if (!activation.valid) continue;
      const eventEntry = {
        ...activation,
        extensionId: extension.id,
        extensionName: extension.displayName,
      };
      events.push(eventEntry);
      byType[activation.type] ||= [];
      byType[activation.type].push(eventEntry);
    }
  }

  return { events, byType };
}

export function getExtensionRuntimeOverview(records) {
  const contributions = collectExtensionContributions(records);
  const activation = collectExtensionActivationPlan(records);
  const contributionPoints = EXTENSION_RUNTIME_CONTRIBUTION_POINTS.map(({ point, label }) => {
    const entries = contributions[point] || [];
    const extensionNames = [...new Set(entries.map((entry) => entry.extensionName))];
    return {
      point,
      label,
      count: entries.length,
      extensions: extensionNames,
      items: entries.map((entry) => getContributionItemLabel(point, entry)).filter(Boolean),
    };
  });

  return {
    contributionPoints,
    activation,
    enabledExtensionCount: getEnabledExtensionIds(records).length,
  };
}

export function createExtensionRuntimeSnapshot(records) {
  const stats = getExtensionStats(records);
  const runtime = getExtensionRuntimeOverview(records);
  const contributions = collectExtensionContributions(records);
  const installed = getInstalledExtensionIds(records);
  const enabled = getEnabledExtensionIds(records);

  return {
    version: EXTENSION_REGISTRY_VERSION,
    generatedAt: new Date().toISOString(),
    installed,
    enabled,
    stats,
    activation: runtime.activation.events.map((event) => ({
      id: event.id,
      type: event.type,
      label: event.label,
      detail: event.detail,
      extensionId: event.extensionId,
      extensionName: event.extensionName,
    })),
    contributions: Object.fromEntries(
      Object.entries(contributions).map(([point, entries]) => [
        point,
        entries.map((entry) => ({
          ...entry,
          extensionId: entry.extensionId,
          extensionName: entry.extensionName,
        })),
      ]),
    ),
    summary: runtime.contributionPoints.map((point) => ({
      point: point.point,
      label: point.label,
      count: point.count,
      extensions: point.extensions,
      items: point.items.slice(0, 12),
    })),
  };
}

export function createExtensionEventDetail(records) {
  const resolved = resolveExtensions(records);
  const enabledExtensions = resolved.filter((extension) => extension.installed && extension.enabled);

  return {
    installed: getInstalledExtensionIds(records),
    enabled: getEnabledExtensionIds(records),
    stats: getExtensionStats(records),
    registry: records,
    activation: enabledExtensions.map((extension) => ({
      id: extension.id,
      displayName: extension.displayName,
      events: extension.activationSummary,
    })),
    contributions: collectExtensionContributions(records),
    runtime: getExtensionRuntimeOverview(records),
    snapshot: createExtensionRuntimeSnapshot(records),
    diagnostics: resolved.flatMap((extension) =>
      extension.manifestDiagnostics.map((diagnostic) => ({
        ...diagnostic,
        extensionId: extension.id,
        extensionName: extension.displayName,
      })),
    ),
  };
}
