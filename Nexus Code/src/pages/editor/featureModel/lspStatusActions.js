import { getLanguageCapabilities, LANGUAGE_IDS, normalizeLanguageId } from "../../../ide/languages/languageIds.js";

const ACTIVE_LSP_STATES = new Set(["available", "ready", "running", "started"]);
const PENDING_LSP_STATES = new Set(["initializing", "pending", "starting"]);
const FALLBACK_LSP_STATES = new Set([
  "disabled",
  "idle",
  "missing",
  "unavailable",
  "unsupported",
]);

const LSP_FEATURE_LABELS = Object.freeze({
  completion: "Completion",
  hover: "Hover",
  diagnostics: "Diagnostics",
  definition: "Definition",
  formatting: "Formatting",
  codeActions: "Code actions",
  rename: "Rename",
});

function normalizeLspState(value, fallback = "idle") {
  const state = String(value || "")
    .trim()
    .toLowerCase();
  if (!state) return fallback;
  if (state === "error" || state === "failed" || state === "stopped") {
    return "unavailable";
  }
  return state;
}

function getCompactLspServerLabel(label) {
  const value = String(label || "").trim();
  if (!value) return "LSP";
  if (/pyright/i.test(value)) return "Pyright";
  if (/typescript/i.test(value)) return "TS LSP";
  const firstWord = value.split(/\s+/).find(Boolean);
  return firstWord || "LSP";
}

function getLspStatusText(state, serverLabel = "LSP") {
  const label = getCompactLspServerLabel(serverLabel);
  if (state === "missing") return `${label} missing`;
  if (state === "unsupported") return "LSP unsupported";
  if (state === "disabled") return `${label} off`;
  if (state === "unavailable") return `${label} fallback`;
  if (state === "idle") return `${label} idle`;
  if (PENDING_LSP_STATES.has(state)) return `${label} starting`;
  if (ACTIVE_LSP_STATES.has(state)) return `${label} running`;
  return `${label} ${state}`;
}

function getFeatureMap(languageCapabilities, runtimeStatus = null) {
  const lspFeatures = languageCapabilities?.lsp?.features || {};
  const runtimeFeatures = runtimeStatus?.features || runtimeStatus?.serverFeatures || {};
  return Object.fromEntries(
    Object.keys(LSP_FEATURE_LABELS).map((key) => {
      if (Object.prototype.hasOwnProperty.call(runtimeFeatures, key)) {
        return [key, runtimeFeatures[key] === true];
      }
      return [key, lspFeatures[key] === true];
    }),
  );
}

function getEnabledSetting(settings, key, fallback = true) {
  return settings?.[key] === undefined ? fallback : settings[key] !== false;
}

function createLspBaseStatus({
  hasBridge,
  hasWorkspace,
  isLargeFile,
  languageCapabilities,
  lspEnabled,
  runtimeStatus,
}) {
  const server = languageCapabilities.lsp;
  const runtimeState = normalizeLspState(
    runtimeStatus?.state || runtimeStatus?.status,
    runtimeStatus ? "running" : "ready",
  );
  const runtimeMissing =
    runtimeStatus?.missing === true ||
    runtimeState === "missing" ||
    (runtimeStatus?.available === false && runtimeStatus?.canStart === false);

  if (!lspEnabled) {
    return {
      state: "disabled",
      message: "Language server support is disabled in settings.",
      canStart: false,
    };
  }
  if (!languageCapabilities.lspReady || !server.configured) {
    return {
      state: "unsupported",
      message: `No language server is configured for ${languageCapabilities.label}.`,
      canStart: false,
    };
  }
  if (isLargeFile) {
    return {
      state: "disabled",
      message: "Large file mode keeps LSP disabled for editor stability.",
      canStart: false,
    };
  }
  if (!hasWorkspace) {
    return {
      state: "idle",
      message: "Open a workspace folder to start the language server.",
      canStart: false,
    };
  }
  if (!hasBridge) {
    return {
      state: "unavailable",
      message: "Electron LSP bridge is unavailable. Local completions remain active.",
      canStart: false,
    };
  }
  if (runtimeStatus) {
    return {
      ...runtimeStatus,
      state: runtimeMissing ? "missing" : runtimeState,
      message:
        runtimeStatus.message ||
        (runtimeMissing
          ? `${server.label || languageCapabilities.label} is not available.`
          : `${server.label || languageCapabilities.label} is ${runtimeState}.`),
      canStart:
        runtimeStatus.canStart !== false &&
        !runtimeMissing &&
        !FALLBACK_LSP_STATES.has(runtimeState),
    };
  }
  return {
    state: "ready",
    message: `${server.label || languageCapabilities.label} is ready to start.`,
    canStart: true,
  };
}

export function createEditorLanguageFeatureModel(options = {}) {
  const languageCapabilities = getLanguageCapabilities(options.languageId);
  const settings = options.settings || {};
  const lspEnabled = options.lspEnabled ?? getEnabledSetting(settings, "lsp_enabled");
  const autocompleteEnabled =
    options.autocompleteEnabled ?? getEnabledSetting(settings, "autocomplete_enabled");
  const snippetsEnabled =
    autocompleteEnabled &&
    (options.snippetsEnabled ?? getEnabledSetting(settings, "autocomplete_snippets"));
  const localWordsEnabled =
    autocompleteEnabled &&
    (options.localWordsEnabled ?? getEnabledSetting(settings, "autocomplete_local_words"));
  const languageHintsEnabled =
    autocompleteEnabled &&
    (options.languageHintsEnabled ?? getEnabledSetting(settings, "autocomplete_language_hints"));
  const lspCompletionEnabled =
    autocompleteEnabled &&
    lspEnabled &&
    (options.lspCompletionEnabled ?? getEnabledSetting(settings, "autocomplete_lsp"));
  const hasWorkspace = options.hasWorkspace ?? true;
  const hasBridge = options.hasBridge ?? true;
  const isLargeFile = options.isLargeFile === true;
  const runtimeStatus = options.runtimeStatus || null;
  const features = getFeatureMap(languageCapabilities, runtimeStatus);
  const baseStatus = createLspBaseStatus({
    hasBridge,
    hasWorkspace,
    isLargeFile,
    languageCapabilities,
    lspEnabled,
    runtimeStatus,
  });
  const state = normalizeLspState(baseStatus.state);
  const active = ACTIVE_LSP_STATES.has(state);
  const pending = PENDING_LSP_STATES.has(state);
  const fallbackActive = FALLBACK_LSP_STATES.has(state) || (!active && !pending);
  const supportedFeatureNames = Object.entries(features)
    .filter(([, enabled]) => enabled)
    .map(([key]) => LSP_FEATURE_LABELS[key]);
  const supportedFeatureIds = Object.entries(features)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
  const activeFeatureIds = active ? supportedFeatureIds : [];
  const activeFeatureCount = active ? supportedFeatureNames.length : 0;
  const featureCount = supportedFeatureNames.length;
  const serverLabel = languageCapabilities.lsp.label || languageCapabilities.label;
  const envName = baseStatus.envName || languageCapabilities.lsp.envName;
  const installHint = baseStatus.installHint || languageCapabilities.lsp.installHint;
  const statusText = getLspStatusText(state, serverLabel);
  const message = baseStatus.message || "";
  const runtimeDetails = [
    envName ? `Env: ${envName}` : "",
    baseStatus.envOverride ? "Env override active" : "",
    baseStatus.path ? `PATH: ${baseStatus.path}` : "",
    baseStatus.source ? `Source: ${baseStatus.source}` : "",
    runtimeStatus?.features || runtimeStatus?.serverFeatures
      ? "Capabilities from server initialize"
      : "",
  ];
  const lspTitle = [
    `${languageCapabilities.label}: ${serverLabel}`,
    statusText,
    message,
    ...runtimeDetails,
    installHint && fallbackActive ? installHint : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const completionSources = [
    {
      id: "lsp",
      label: "LSP",
      enabled: lspCompletionEnabled,
      available: lspCompletionEnabled && active && features.completion,
      fallback: lspCompletionEnabled && (!active || !features.completion),
    },
    {
      id: "snippets",
      label: "Snippets",
      enabled: snippetsEnabled,
      available: snippetsEnabled,
      fallback: false,
    },
    {
      id: "local",
      label: "Local words",
      enabled: localWordsEnabled,
      available: localWordsEnabled,
      fallback: false,
    },
    {
      id: "language",
      label: "Language hints",
      enabled: languageHintsEnabled,
      available: languageHintsEnabled,
      fallback: false,
    },
  ];
  const availableCompletionLabels = completionSources
    .filter((source) => source.available)
    .map((source) => source.label);

  return {
    language: {
      id: languageCapabilities.id,
      label: languageCapabilities.label,
      editorGrammarId: languageCapabilities.editorGrammarId,
    },
    lsp: {
      ...baseStatus,
      state,
      label: serverLabel,
      message,
      statusText,
      shortText: statusText,
      title: lspTitle,
      serverLabel,
      envName,
      installHint,
      envOverride: baseStatus.envOverride === true,
      path: baseStatus.path || baseStatus.resolvedPath || null,
      source: baseStatus.source || null,
      configured: languageCapabilities.lsp.configured,
      enabled: lspEnabled,
      active,
      pending,
      fallbackActive,
      features,
      supportedFeatureIds,
      activeFeatureIds,
      featureCount,
      activeFeatureCount,
    },
    completions: {
      enabled: autocompleteEnabled,
      sources: completionSources,
      availableLabels: availableCompletionLabels,
      shortText: availableCompletionLabels.length
        ? `Complete ${availableCompletionLabels.join("+")}`
        : "Complete off",
      title: `Completion sources: ${
        availableCompletionLabels.length ? availableCompletionLabels.join(", ") : "none"
      }`,
    },
    actions: Object.fromEntries(
      Object.entries(features).map(([key, supported]) => [
        key,
        {
          label: LSP_FEATURE_LABELS[key],
          supported,
          active: supported && active,
          fallback: supported && !active,
        },
      ]),
    ),
    capabilityBadge: languageCapabilities.lsp.configured
      ? `Tools ${activeFeatureCount}/${featureCount}`
      : "",
    capabilityTitle: [
      `${languageCapabilities.label} LSP capabilities`,
      supportedFeatureNames.join(", ") || "No LSP features configured",
      fallbackActive && installHint ? installHint : "",
    ]
      .filter(Boolean)
      .join(" | "),
  };
}

export const EDITOR_LSP_FEATURE_IDS = Object.freeze({
  goToDefinition: "go-to-definition",
  renameSymbol: "rename-symbol",
  formatDocument: "format-document",
  codeActions: "code-actions",
});

const EDITOR_LSP_FEATURE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: EDITOR_LSP_FEATURE_IDS.goToDefinition,
    label: "Go to Definition",
    featureName: "definition",
    commandId: "editor.goToDefinition",
    lspMethod: "getDefinition",
    resultKind: "locations",
    shortcut: "F12",
    requiresPosition: true,
  }),
  Object.freeze({
    id: EDITOR_LSP_FEATURE_IDS.renameSymbol,
    label: "Rename Symbol",
    featureName: "rename",
    commandId: "editor.renameSymbol",
    lspMethod: "renameSymbol",
    resultKind: "workspace-edit",
    shortcut: "F2",
    requiresPosition: true,
    requiresNewName: true,
  }),
  Object.freeze({
    id: EDITOR_LSP_FEATURE_IDS.formatDocument,
    label: "Format Document",
    featureName: "formatting",
    commandId: "editor.formatDocument",
    lspMethod: "formatDocument",
    resultKind: "text-edits",
    shortcut: "Shift+Alt+F",
  }),
  Object.freeze({
    id: EDITOR_LSP_FEATURE_IDS.codeActions,
    label: "Code Actions",
    featureName: "codeActions",
    commandId: "editor.codeActions",
    lspMethod: "getCodeActions",
    resultKind: "code-actions",
    shortcut: "Mod+.",
    requiresRange: true,
  }),
]);

function getEditorLspFeatureDefinition(featureId) {
  const normalized = String(featureId || "").trim();
  return EDITOR_LSP_FEATURE_DEFINITIONS.find((feature) => feature.id === normalized) || null;
}

export function createEditorLspActionStatus(status = {}) {
  const featureId = String(status.featureId || "").trim();
  const state = String(status.state || "idle").trim() || "idle";
  const tone =
    status.tone ||
    (state === "failed"
      ? "text-red-400"
      : state === "applied"
        ? "text-emerald-300"
        : state === "available" || state === "external"
          ? "text-sky-300"
          : state === "unavailable"
            ? "text-amber-400"
            : "text-gray-500");
  const definition = getEditorLspFeatureDefinition(featureId);
  const featureLabel = status.label || definition?.label || "LSP action";
  const text = status.text || (state === "idle" ? "" : featureLabel);

  return Object.freeze({
    state,
    featureId,
    featureLabel,
    text,
    title: status.title || text || featureLabel,
    tone,
    dataState: `${featureId || "none"}:${state}`,
  });
}

export function normalizeEditorFeaturePosition(position) {
  if (!position || typeof position !== "object") return null;
  const rawLine = position.lineNumber ?? position.line;
  const rawColumn =
    position.column ??
    (position.character === undefined ? undefined : Number(position.character) + 1);
  const lineNumber = Math.max(1, Math.round(Number(rawLine || 0)));
  const column = Math.max(1, Math.round(Number(rawColumn || 0)));
  if (!Number.isFinite(lineNumber) || !Number.isFinite(column)) return null;
  return { lineNumber, column };
}

export function normalizeEditorFeatureRange(range) {
  if (!range || typeof range !== "object") return null;
  if (range.startLineNumber !== undefined || range.endLineNumber !== undefined) {
    const startLineNumber = Math.max(1, Math.round(Number(range.startLineNumber || 0)));
    const startColumn = Math.max(1, Math.round(Number(range.startColumn || 0)));
    const endLineNumber = Math.max(
      startLineNumber,
      Math.round(Number(range.endLineNumber || startLineNumber)),
    );
    const endColumn = Math.max(1, Math.round(Number(range.endColumn || startColumn)));
    if (
      !Number.isFinite(startLineNumber) ||
      !Number.isFinite(startColumn) ||
      !Number.isFinite(endLineNumber) ||
      !Number.isFinite(endColumn)
    ) {
      return null;
    }
    return { startLineNumber, startColumn, endLineNumber, endColumn };
  }

  const start = normalizeEditorFeaturePosition(range.start);
  const end = normalizeEditorFeaturePosition(range.end || range.start);
  if (!start || !end) return null;
  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: Math.max(start.lineNumber, end.lineNumber),
    endColumn: end.column,
  };
}

function getEditorFeatureUnavailableReason(options) {
  if (options.lspEnabled === false) return "LSP disabled";
  if (options.isLargeFile) return "Large file mode";
  if (options.lspReadyLanguage === false) return "Unsupported language";
  if (options.hasWorkspace === false) return "No workspace";
  if (options.hasLspBridge === false) return "LSP bridge unavailable";
  if (!options.canUseLsp) return "LSP unavailable";
  if (!options.documentUri && !options.hasDocument) return "No open LSP document";
  return "";
}

function resolveEditorLspFeatureSupport(options = {}) {
  const languageId = normalizeLanguageId(options.languageId, LANGUAGE_IDS.PLAINTEXT);
  const languageCapabilities = getLanguageCapabilities(languageId);
  const declaredFeatures = languageCapabilities.lsp?.features || {};
  const runtimeFeatures =
    options.serverFeatures ||
    options.lspFeatures ||
    options.features ||
    options.runtimeStatus?.features ||
    {};

  return Object.fromEntries(
    Object.keys(LSP_FEATURE_LABELS).map((key) => {
      if (runtimeFeatures && Object.prototype.hasOwnProperty.call(runtimeFeatures, key)) {
        return [key, runtimeFeatures[key] === true];
      }
      return [key, declaredFeatures[key] === true];
    }),
  );
}

export function createEditorLspFeatureContracts(options = {}) {
  const disabledReason = getEditorFeatureUnavailableReason(options);
  const support = resolveEditorLspFeatureSupport(options);
  const position = normalizeEditorFeaturePosition(options.position);
  const range = normalizeEditorFeatureRange(options.range);
  const newName = String(options.newName || "").trim();

  return EDITOR_LSP_FEATURE_DEFINITIONS.map((definition) => {
    const supported = support[definition.featureName] === true;
    const missing = [
      definition.requiresPosition && !position ? "position" : "",
      definition.requiresRange && !range ? "range" : "",
      definition.requiresNewName && !newName ? "newName" : "",
    ].filter(Boolean);
    const featureReason = supported ? "" : `${definition.label} unsupported`;
    const effectiveDisabledReason = disabledReason || featureReason;
    const enabled = !effectiveDisabledReason;
    return Object.freeze({
      ...definition,
      languageId: normalizeLanguageId(options.languageId, LANGUAGE_IDS.PLAINTEXT),
      supported,
      enabled,
      ready: enabled && missing.length === 0,
      disabledReason: effectiveDisabledReason,
      pendingReason: missing.length ? `Missing ${missing.join(", ")}` : "",
      missing,
      ui: Object.freeze({
        label: definition.label,
        shortcut: definition.shortcut || "",
        dataState: `${definition.id}:${enabled ? (missing.length ? "pending" : "ready") : "disabled"}`,
        title: [
          definition.label,
          definition.shortcut ? `Shortcut ${definition.shortcut}` : "",
          effectiveDisabledReason || (missing.length ? `Missing ${missing.join(", ")}` : "Ready"),
        ]
          .filter(Boolean)
          .join(" | "),
      }),
    });
  });
}

export function getEditorLspFeatureContract(featureId, options = {}) {
  const definition = getEditorLspFeatureDefinition(featureId);
  if (!definition) return null;
  return createEditorLspFeatureContracts(options).find((feature) => feature.id === definition.id) || null;
}

export function createEditorLspFeatureRequest(featureId, payload = {}) {
  const contract = getEditorLspFeatureContract(featureId, payload);
  if (!contract) {
    return {
      featureId: String(featureId || ""),
      ready: false,
      disabledReason: "Unknown editor feature",
      missing: ["feature"],
    };
  }

  const position = normalizeEditorFeaturePosition(payload.position);
  const range = normalizeEditorFeatureRange(payload.range);
  const newName = String(payload.newName || "").trim();
  const missing = [
    contract.requiresPosition && !position ? "position" : "",
    contract.requiresRange && !range ? "range" : "",
    contract.requiresNewName && !newName ? "newName" : "",
  ].filter(Boolean);

  return Object.freeze({
    featureId: contract.id,
    label: contract.label,
    commandId: contract.commandId,
    lspMethod: contract.lspMethod,
    resultKind: contract.resultKind,
    featureName: contract.featureName,
    shortcut: contract.shortcut || "",
    supported: contract.supported,
    documentUri: payload.documentUri || "",
    languageId: normalizeLanguageId(payload.languageId, LANGUAGE_IDS.PLAINTEXT),
    position,
    range,
    diagnostics: Array.isArray(payload.diagnostics) ? payload.diagnostics.slice(0, 50) : [],
    newName,
    options: payload.options && typeof payload.options === "object" ? { ...payload.options } : {},
    ready: contract.enabled && missing.length === 0,
    disabledReason: contract.disabledReason,
    pendingReason: missing.length ? `Missing ${missing.join(", ")}` : "",
    missing,
    ui: contract.ui,
  });
}
