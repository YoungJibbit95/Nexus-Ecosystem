export const EXTENSION_CORE_CONTRIBUTION_POINTS = [
  "commands",
  "views",
  "languages",
  "themes",
  "keybindings",
  "snippets",
];

export const EXTENSION_RUNTIME_CONTRIBUTION_POINTS = [
  { point: "commands", label: "Commands" },
  { point: "views", label: "Views" },
  { point: "languages", label: "Languages" },
  { point: "themes", label: "Themes" },
  { point: "keybindings", label: "Keybindings" },
  { point: "snippets", label: "Snippets" },
];

const CONTRIBUTION_POINT_LABELS = {
  commands: "Commands",
  languages: "Languages",
  themes: "Themes",
  views: "Views",
  keybindings: "Keybindings",
  snippets: "Snippets",
  iconThemes: "Icon themes",
  formatters: "Formatters",
  problemMatchers: "Problem matchers",
  debugAdapters: "Debug adapters",
  configuration: "Settings",
};

function toStringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}

export function createExtensionDiagnostic(level, code, message, detail) {
  return { level, code, message, detail: detail || "" };
}

function humanizeIdentifier(value) {
  return String(value || "")
    .split(/[._:-]/)
    .filter(Boolean)
    .slice(-2)
    .join(" ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function command(commandId, title, category = "Nexus") {
  return { command: commandId, title: title || humanizeIdentifier(commandId), category };
}

export function language(id, aliases, extensions, configuration) {
  return {
    id,
    aliases: toStringArray(aliases),
    extensions: toStringArray(extensions),
    configuration,
  };
}

export function theme(id, label, uiTheme, path) {
  return { id, label, uiTheme, path };
}

export function view(id, name, container = "nexus.activitybar", when) {
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
    when: typeof entry.when === "string" ? entry.when : undefined,
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

function normalizeKeybindingContribution(entry) {
  if (
    !entry ||
    typeof entry !== "object" ||
    typeof entry.command !== "string" ||
    typeof entry.key !== "string"
  ) {
    return null;
  }
  return {
    command: entry.command,
    key: entry.key,
    mac: typeof entry.mac === "string" ? entry.mac : undefined,
    win: typeof entry.win === "string" ? entry.win : undefined,
    linux: typeof entry.linux === "string" ? entry.linux : undefined,
    when: typeof entry.when === "string" ? entry.when : undefined,
  };
}

function normalizeSnippetContribution(entry) {
  if (
    !entry ||
    typeof entry !== "object" ||
    typeof entry.language !== "string" ||
    typeof entry.path !== "string"
  ) {
    return null;
  }
  return {
    language: entry.language,
    path: entry.path,
  };
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

export function normalizeExtensionContributes(contributes = {}) {
  const source =
    contributes && typeof contributes === "object" && !Array.isArray(contributes)
      ? contributes
      : {};
  const normalized = {
    commands: normalizeContributionArray(source.commands, normalizeCommandContribution),
    languages: normalizeContributionArray(source.languages, normalizeLanguageContribution),
    themes: normalizeContributionArray(source.themes, normalizeThemeContribution),
    views: normalizeContributionArray(source.views, normalizeViewContribution),
    keybindings: normalizeContributionArray(source.keybindings, normalizeKeybindingContribution),
    snippets: normalizeContributionArray(source.snippets, normalizeSnippetContribution),
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

export function getExtensionContributionLabel(point) {
  return CONTRIBUTION_POINT_LABELS[point] || humanizeIdentifier(point);
}

export function getExtensionContributionItemLabel(point, entry) {
  if (!entry || typeof entry !== "object") return "";
  if (point === "commands") return entry.title || entry.command || "";
  if (point === "languages") return entry.aliases?.[0] || entry.id || "";
  if (point === "themes") return entry.label || entry.id || "";
  if (point === "views") return entry.name || entry.id || "";
  if (point === "keybindings") return entry.key || entry.command || "";
  if (point === "snippets") return `${entry.language}${entry.path ? `: ${entry.path}` : ""}`;
  if (point === "formatters") return entry.language || "";
  if (point === "problemMatchers") return entry.label || entry.name || "";
  return entry.label || entry.id || entry.name || entry.type || "";
}

export function summarizeExtensionContributions(contributes = {}) {
  return Object.entries(contributes)
    .filter(([, entries]) => Array.isArray(entries) && entries.length > 0)
    .map(([point, entries]) => ({
      point,
      label: getExtensionContributionLabel(point),
      count: entries.length,
      items: entries.map((entry) => getExtensionContributionItemLabel(point, entry)).filter(Boolean),
      primary: EXTENSION_CORE_CONTRIBUTION_POINTS.includes(point),
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
        createExtensionDiagnostic(
          "warning",
          "manifest.activationEvents.command_missing",
          `Activation command '${value}' is not contributed.`,
          "The command may still be registered at runtime, but it is hidden from the command palette manifest.",
        ),
      );
    }

    if (activation.type === "language" && !lookup.languages.has(value)) {
      diagnostics.push(
        createExtensionDiagnostic(
          "warning",
          "manifest.activationEvents.language_missing",
          `Activation language '${value}' is not contributed.`,
          "Add a language contribution or use a workspace/command activation event.",
        ),
      );
    }

    if (activation.type === "view" && !lookup.views.has(value)) {
      diagnostics.push(
        createExtensionDiagnostic(
          "warning",
          "manifest.activationEvents.view_missing",
          `Activation view '${value}' is not contributed.`,
          "Add a view contribution so activation can be planned from the UI.",
        ),
      );
    }
  }
}

export function validateExtensionManifest(manifest) {
  const diagnostics = [];

  if (!manifest || typeof manifest !== "object") {
    return [createExtensionDiagnostic("error", "manifest.invalid", "Manifest is not an object.")];
  }

  for (const field of ["name", "displayName", "publisher", "version"]) {
    if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
      diagnostics.push(
        createExtensionDiagnostic("error", `manifest.${field}`, `Manifest field '${field}' is required.`),
      );
    }
  }

  if (!Array.isArray(manifest.activationEvents)) {
    diagnostics.push(
      createExtensionDiagnostic("error", "manifest.activationEvents", "activationEvents must be an array."),
    );
  } else {
    for (const event of manifest.activationEvents) {
      const activation = describeActivationEvent(event);
      if (!activation.valid) {
        diagnostics.push(
          createExtensionDiagnostic(
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
      createExtensionDiagnostic("error", "manifest.contributes", "contributes must be an object."),
    );
  } else {
    for (const point of EXTENSION_CORE_CONTRIBUTION_POINTS) {
      const entries = contributes[point];
      if (entries !== undefined && !Array.isArray(entries)) {
        diagnostics.push(
          createExtensionDiagnostic("error", `manifest.contributes.${point}`, `${point} must be an array.`),
        );
      }
    }

    for (const entry of contributes.commands || []) {
      if (typeof entry.command !== "string" || typeof entry.title !== "string") {
        diagnostics.push(
          createExtensionDiagnostic(
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
          createExtensionDiagnostic(
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
          createExtensionDiagnostic(
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
          createExtensionDiagnostic(
            "error",
            "manifest.contributes.views",
            "View contributions require id and name.",
          ),
        );
      }
    }

    for (const entry of contributes.keybindings || []) {
      if (typeof entry.command !== "string" || typeof entry.key !== "string") {
        diagnostics.push(
          createExtensionDiagnostic(
            "error",
            "manifest.contributes.keybindings",
            "Keybinding contributions require command and key.",
          ),
        );
      }
    }

    for (const entry of contributes.snippets || []) {
      if (typeof entry.language !== "string" || typeof entry.path !== "string") {
        diagnostics.push(
          createExtensionDiagnostic(
            "error",
            "manifest.contributes.snippets",
            "Snippet contributions require language and path.",
          ),
        );
      }
    }

    validateActivationBindings(manifest, diagnostics);
  }

  return diagnostics;
}

export function buildExtensionHostSummary({ extensions, records, stats, runtime, storageHealth }) {
  const resolved = Array.isArray(extensions) ? extensions : [];
  const enabled = resolved.filter((extension) => extension.installed && extension.enabled);
  const blocked = resolved.filter((extension) => extension.lifecycleState?.id === "blocked");
  const warnings = resolved.filter(
    (extension) => extension.manifestWarnings?.length > 0 && extension.manifestErrors?.length === 0,
  );
  const activePoints = (runtime?.contributionPoints || []).filter((point) => point.count > 0);
  const activationTypes = Object.entries(runtime?.activation?.byType || {})
    .filter(([, entries]) => entries.length > 0)
    .map(([type, entries]) => ({ type, count: entries.length }));

  return {
    state: blocked.length > 0 ? "degraded" : enabled.length > 0 ? "ready" : "idle",
    storageHealth: storageHealth || "default",
    installedCount: stats?.installed || 0,
    enabledCount: enabled.length,
    blockedCount: blocked.length,
    warningCount: warnings.length,
    activationEventCount: stats?.activationEvents || 0,
    activeContributionPointCount: activePoints.length,
    contributionCount: activePoints.reduce((total, point) => total + point.count, 0),
    activePoints,
    activationTypes,
    enabledIds: enabled.map((extension) => extension.id),
    installedIds: Object.entries(records || {})
      .filter(([, record]) => record?.installed)
      .map(([id]) => id),
  };
}
