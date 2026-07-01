import {
  LSP_READY_LANGUAGE_IDS,
  getLanguageCapabilities,
} from "../../ide/languages/languageIds.js";

const DEFAULT_RETRY_DELAY_MS = 5_000;

function cleanText(value) {
  return String(value ?? "").trim();
}

function cleanNullableText(value) {
  const text = cleanText(value);
  return text || null;
}

function normalizeStatusState(server = {}) {
  return cleanText(server.state || server.status || (server.available ? "available" : "unchecked"))
    .toLowerCase();
}

function formatRetryDelay(value) {
  const delay = Number(value);
  if (!Number.isFinite(delay) || delay <= 0) return "sofort";
  if (delay < 1_000) return `${Math.round(delay)} ms`;
  return `${Math.round(delay / 1_000)} s`;
}

function createFallbackServer(languageId) {
  const capabilities = getLanguageCapabilities(languageId);
  return {
    languageId: capabilities.id,
    languageLabel: capabilities.label,
    label: capabilities.lsp.label || capabilities.label,
    command: "",
    args: [],
    envName: capabilities.lsp.envName,
    envOverride: false,
    source: "default",
    available: false,
    missing: false,
    path: null,
    resolvedPath: null,
    state: "unchecked",
    status: "unchecked",
    canStart: false,
    canRetry: false,
    retryable: false,
    retryDelayMs: null,
    installHint: capabilities.lsp.installHint,
    message: "Statuscheck noch nicht ausgefuehrt.",
    fallback: true,
  };
}

function getServerRecords(servers, options = {}) {
  const provided = Array.isArray(servers) ? servers.filter(Boolean) : [];
  if (provided.length > 0 || options.includeFallback === false) return provided;
  return LSP_READY_LANGUAGE_IDS.map(createFallbackServer);
}

function getLanguageLabel(server = {}) {
  return (
    cleanNullableText(server.languageLabel) ||
    getLanguageCapabilities(server.languageId).label ||
    cleanNullableText(server.languageId) ||
    "Language"
  );
}

function getServerLabel(server = {}) {
  return cleanNullableText(server.label) || getLanguageLabel(server);
}

function getCommandText(server = {}) {
  const command = cleanText(server.command);
  const args = Array.isArray(server.args)
    ? server.args.map(cleanText).filter(Boolean)
    : [];
  return [command, ...args].filter(Boolean).join(" ");
}

function getStatusTone(server = {}, state, bridgeAvailable) {
  if (bridgeAvailable === false) return "info";
  if (state === "unsupported") return "muted";
  if (state === "error" || state === "stderr") return "error";
  if (server.available === true) return "good";
  if (state === "missing" || server.missing === true) return "warn";
  if (state === "unchecked" || state === "starting") return "info";
  return "info";
}

function getStatusLabel(server = {}, state, bridgeAvailable) {
  if (bridgeAvailable === false) return "Bridge offen";
  if (state === "unsupported") return "Nicht konfiguriert";
  if (state === "error" || state === "stderr") return "Fehler";
  if (server.available === true) return state === "running" ? "Laeuft" : "Bereit";
  if (state === "missing" || server.missing === true) return "Setup noetig";
  if (state === "starting") return "Startet";
  return "Status offen";
}

function getStatusDescription(server = {}, state, bridgeAvailable) {
  if (bridgeAvailable === false) {
    return "Electron-Bridge ist fuer den PATH-Status nicht erreichbar.";
  }
  if (server.available === true) {
    return server.envOverride
      ? "Server wurde ueber Env-Override aufgeloest."
      : "Server wurde im aktuellen Prozess-PATH erkannt.";
  }
  if (state === "unsupported") return "Fuer diese Sprache gibt es keinen gefuehrten Server.";
  if (state === "unchecked") return "Status aktualisieren prueft PATH und Overrides.";
  return cleanNullableText(server.message) || "Server fehlt im PATH oder Override.";
}

function createPathDiagnostic(server = {}, state) {
  const commandText = getCommandText(server);
  const resolvedPath = cleanNullableText(server.resolvedPath || server.path);
  if (server.available === true) {
    return {
      label: server.envOverride ? "Override erkannt" : "PATH erkannt",
      value: resolvedPath || commandText || "Command ist startbereit.",
      tone: "good",
    };
  }
  if (state === "unsupported") {
    return {
      label: "PATH nicht genutzt",
      value: "Keine Server-Konfiguration fuer diese Sprache.",
      tone: "muted",
    };
  }
  if (state === "unchecked") {
    return {
      label: "PATH ausstehend",
      value: commandText || "Status aktualisieren startet den PATH-Check.",
      tone: "info",
    };
  }
  return {
    label: server.envOverride ? "Override nicht gefunden" : "PATH nicht gefunden",
    value: commandText || getServerLabel(server),
    tone: "warn",
  };
}

function createEnvDiagnostic(server = {}) {
  const envName = cleanNullableText(server.envName);
  if (!envName) {
    return {
      label: "Env-Var",
      value: "Kein Override fuer diesen Server hinterlegt.",
      code: null,
      tone: "muted",
    };
  }
  return {
    label: server.envOverride ? "Env-Override aktiv" : "Env-Override optional",
    value: server.envOverride
      ? `${envName} steuert den Server-Command.`
      : `${envName} kann einen eigenen Server-Command setzen.`,
    code: envName,
    tone: server.envOverride ? "good" : "info",
  };
}

function createSetupDiagnostic(server = {}, state) {
  if (server.available === true) {
    return {
      label: "Setup",
      value: "Keine Installation aus Settings. Datei oeffnen startet den Server bei Bedarf.",
      tone: "good",
    };
  }
  if (state === "unsupported") {
    return {
      label: "Setup",
      value: "Keine gefuehrte Installation fuer diese Sprache.",
      tone: "muted",
    };
  }
  return {
    label: "Install-Hint",
    value:
      cleanNullableText(server.installHint) ||
      `Installiere ${getServerLabel(server)} oder setze die passende Env-Var.`,
    tone: "warn",
  };
}

function createRetryDiagnostic(server = {}, state, bridgeAvailable) {
  if (bridgeAvailable === false) {
    return "Nexus Code als Electron-App starten, dann Status aktualisieren.";
  }
  if (state === "unchecked") {
    return "Status aktualisieren prueft PATH und Env-Overrides im Electron-Prozess.";
  }
  if (server.available === true) {
    return "Refresh prueft PATH erneut; Runtime-Start passiert beim Oeffnen einer Datei.";
  }
  if (server.canRetry === false || server.retryable === false) {
    return "Kein automatischer Retry hinterlegt; pruefe Sprache und Workspace.";
  }
  const delay = formatRetryDelay(server.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
  return `Nach Installation oder Env-Aenderung Status aktualisieren; Runtime-Retry wartet ${delay}.`;
}

function createLastDiagnostic(server = {}) {
  const parts = [
    cleanNullableText(server.lastError || server.message),
    server.lastExitCode === undefined || server.lastExitCode === null
      ? null
      : `Exit ${server.lastExitCode}`,
    cleanNullableText(server.lastState) ? `Last state ${server.lastState}` : null,
  ].filter(Boolean);
  return parts.join(" | ");
}

export function createLspSetupRow(server = {}, options = {}) {
  const state = normalizeStatusState(server);
  const bridgeAvailable = options.bridgeAvailable;
  const statusTone = getStatusTone(server, state, bridgeAvailable);
  const path = createPathDiagnostic(server, state);
  const env = createEnvDiagnostic(server);
  const setup = createSetupDiagnostic(server, state);
  const commandText = getCommandText(server);
  const lastDiagnostic = createLastDiagnostic(server);
  const checkedAt = cleanNullableText(server.checkedAt);

  return {
    id: cleanNullableText(server.languageId) || getServerLabel(server),
    languageId: cleanNullableText(server.languageId) || "unknown",
    languageLabel: getLanguageLabel(server),
    serverLabel: getServerLabel(server),
    commandText,
    state,
    available: server.available === true,
    missing: server.missing === true || state === "missing",
    envOverride: server.envOverride === true,
    statusTone,
    statusLabel: getStatusLabel(server, state, bridgeAvailable),
    statusDescription: getStatusDescription(server, state, bridgeAvailable),
    actionHint: createRetryDiagnostic(server, state, bridgeAvailable),
    lastDiagnostic,
    checkedAt,
    path,
    env,
    setup,
    details: [path, env, setup],
  };
}

export function createLspSetupModel(servers = [], options = {}) {
  const rows = getServerRecords(servers, options).map((server) =>
    createLspSetupRow(server, options),
  );
  const readyCount = rows.filter((row) => row.available).length;
  const missingCount = rows.filter((row) => row.missing && row.state !== "unchecked").length;
  const setupNeededCount = rows.filter(
    (row) => row.statusTone === "warn" || row.statusTone === "error",
  ).length;
  const overrideCount = rows.filter((row) => row.envOverride).length;
  const retryableCount = rows.filter((row) =>
    /Runtime-Retry|Status aktualisieren/.test(row.actionHint),
  ).length;
  const bridgeAvailable = options.bridgeAvailable !== false;
  const loading = options.loading === true;
  const error = cleanNullableText(options.error);
  const total = rows.length;

  const state = !bridgeAvailable
    ? "unavailable"
    : loading
      ? "loading"
      : error
        ? "error"
        : total === 0
          ? "empty"
          : setupNeededCount > 0
            ? "attention"
            : "ready";

  const headline = total > 0
    ? `${readyCount}/${total} Server bereit`
    : "Keine LSP-Server gemeldet";
  const captionParts = [
    overrideCount > 0 ? `${overrideCount} Env-Override aktiv` : "Env-Overrides optional",
    setupNeededCount > 0
      ? `${setupNeededCount} Setup-Hinweise offen`
      : "Keine Auto-Installation",
    retryableCount > 0 ? `${retryableCount} Retry-Hinweise` : null,
  ].filter(Boolean);

  return {
    rows,
    summary: {
      state,
      total,
      readyCount,
      missingCount,
      setupNeededCount,
      overrideCount,
      retryableCount,
      headline,
      caption: captionParts.join(" | "),
      message: error || (
        !bridgeAvailable
          ? "Electron-LSP-Bridge nicht verfuegbar; PATH-Erkennung ist erst in der App sichtbar."
          : loading
            ? "PATH, Env-Overrides und Serverstatus werden geprueft."
            : "PATH-Erkennung, Env-Overrides und Retry-Hinweise je Sprache."
      ),
    },
  };
}
