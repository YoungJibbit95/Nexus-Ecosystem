export const NEXUS_CODE_APP_ID = "code";
export const NEXUS_CODE_CHANNEL = "production";
export const DEFAULT_CONTROL_API_BASE_URL = "https://nexus-api.cloud";

const AUTH_LIMITED_CONTROL_CODES = new Set(["HTTP_401", "HTTP_403"]);
const OFFLINE_CONTROL_CODES = new Set([
  "NO_BASE_URL",
  "TIMEOUT",
  "NETWORK",
  "NETWORK_ERROR",
  "OFFLINE",
  "HTTP_408",
  "HTTP_425",
  "HTTP_429",
  "HTTP_500",
  "HTTP_502",
  "HTTP_503",
  "HTTP_504",
]);

const SOURCE_LABELS = {
  account: "Account",
  access: "Zugriff",
  auth: "Auth",
  catalog: "API-Katalog",
  layout: "Layout",
  release: "Release",
  control: "Control API",
};

const CONTROL_STATUS_COPY = {
  active: {
    title: "Nexus Session aktiv",
    message: "Account und lokale Session sind bereit.",
  },
  online: {
    title: "Control API verbunden",
    message: "Live Katalog, Layout und Release sind aktiv.",
  },
  limited: {
    title: "Account-Gate aktiv",
    message: "Nexus Code wartet auf eine gueltige Auth- oder Tier-Validierung.",
  },
  offline: {
    title: "Control API nicht erreichbar",
    message: "Die Nexus API antwortet gerade nicht. Die Workbench bleibt gesperrt.",
  },
  degraded: {
    title: "Control Bootstrap eingeschraenkt",
    message: "Die API-Antwort konnte nicht vollstaendig validiert werden.",
  },
};

export const normalizeControlErrorCode = (errorCodeRaw) =>
  String(errorCodeRaw || "INVALID_PAYLOAD").trim().toUpperCase() || "INVALID_PAYLOAD";

const normalizeControlMode = (modeRaw) => {
  const mode = String(modeRaw || "").trim().toLowerCase();
  if (["active", "online", "limited", "offline", "degraded"].includes(mode)) return mode;
  return "degraded";
};

const splitDetail = (detailRaw) => {
  const raw = String(detailRaw || "").trim();
  const [sourceRaw, ...codeParts] = raw.split(":");
  const hasSource = codeParts.length > 0;
  const source = hasSource ? sourceRaw.trim().toLowerCase() : "control";
  const codeRaw = hasSource ? codeParts.join(":") : raw;
  return {
    raw,
    source,
    sourceLabel: SOURCE_LABELS[source] || sourceRaw || SOURCE_LABELS.control,
    code: normalizeControlErrorCode(codeRaw),
  };
};

const buildDetailCopy = ({ raw, source, sourceLabel, code }) => {
  if (code === "SESSION_REQUIRED") {
    return {
      title: "Nexus Login erforderlich",
      detail: "Melde dich mit deinem Nexus Account an. Ohne gueltige Session wird die Workbench nicht gerendert.",
    };
  }
  if (code === "SESSION_CLEARED") {
    return {
      title: "Session entfernt",
      detail: "Die gespeicherte Session wurde geloescht. Melde dich erneut an, um Nexus Code zu starten.",
    };
  }
  if (code === "SESSION_UPDATED" || code === "SESSION_SAVED" || code === "SESSION_REFRESHED") {
    return {
      title: "Session gespeichert",
      detail: "Die Account-Daten wurden aktualisiert. Nexus Code prueft die API erneut.",
    };
  }
  if (raw.toUpperCase().startsWith("CONTROL_API_BOOTSTRAP_FAILED")) {
    return {
      title: "Bootstrap fehlgeschlagen",
      detail: "Katalog, Layout oder Release konnten nicht live validiert werden. Die Workbench bleibt im Account-Gate.",
    };
  }
  if (code === "HTTP_400" || code === "HTTP_422" || code === "INVALID_PAYLOAD") {
    return {
      title: `${sourceLabel} hat die Anfrage abgelehnt`,
      detail:
        source === "auth"
          ? "Die Login-Anfrage passt nicht zum API-Contract. Pruefe Endpoint, Username/E-Mail und Passwort."
          : "Die API meldet eine ungueltige Anfrage oder ein unerwartetes Payload-Format.",
    };
  }
  if (code === "HTTP_401") {
    return {
      title: "Session nicht autorisiert",
      detail: "Die API hat Token oder Login abgelehnt. Entferne die gespeicherte Session und melde dich neu an.",
    };
  }
  if (code === "HTTP_403") {
    return {
      title: "Zugriff nicht erlaubt",
      detail: "Der Account ist authentifiziert, hat aber nicht den noetigen Tier oder View-Zugriff.",
    };
  }
  if (code === "HTTP_429") {
    return {
      title: "API Rate Limit erreicht",
      detail: "Die API bremst weitere Requests. Warte kurz und versuche es erneut.",
    };
  }
  if (code === "TIMEOUT") {
    return {
      title: "API Timeout",
      detail: "Die Nexus API hat nicht rechtzeitig geantwortet. Verbindung oder Endpoint pruefen.",
    };
  }
  if (code === "NETWORK" || code === "NETWORK_ERROR" || code === "OFFLINE") {
    return {
      title: "API nicht erreichbar",
      detail: "Der Renderer erreicht die Nexus API nicht. Netzwerk, VPN oder lokalen Endpoint pruefen.",
    };
  }
  if (code === "EMPTY_BUNDLE") {
    return {
      title: "Release-Bundle leer",
      detail: "Der Release-Monitor hat keine Katalog-, Layout- oder Release-Daten geliefert.",
    };
  }
  if (code === "PARTIAL_BUNDLE") {
    return {
      title: "Release-Bundle unvollstaendig",
      detail: "Ein Teil von Katalog, Layout oder Release fehlt. Nexus Code wartet auf ein vollstaendiges Bundle.",
    };
  }
  if (code === "SUBSCRIBE_FAILED") {
    return {
      title: "Release-Monitor nicht gestartet",
      detail: "Der Live-Release-Monitor konnte nicht eingerichtet werden. Bootstrap bleibt vorsichtig gesperrt.",
    };
  }
  if (code === "VIEW_VALIDATION_DENIED" || code === "PAYWALL_BLOCKED") {
    return {
      title: "Editor-Zugriff gesperrt",
      detail: "Die API hat den Editor-View fuer diesen Account nicht freigegeben.",
    };
  }
  return {
    title: `${sourceLabel}: ${code}`,
    detail: "Nexus Code hat den Bootstrap vorsichtig gestoppt, bis dieser Status geklaert ist.",
  };
};

export const describeControlStatusDetail = (detailRaw) => {
  const parsed = splitDetail(detailRaw);
  if (!parsed.raw) return null;
  const copy = buildDetailCopy(parsed);
  return {
    ...parsed,
    ...copy,
  };
};

export const formatControlStatusDetails = (detailsRaw = []) =>
  (Array.isArray(detailsRaw) ? detailsRaw : [detailsRaw])
    .map(describeControlStatusDetail)
    .filter(Boolean);

export const isOfflineBootstrapResourceError = (errorCodeRaw) =>
  OFFLINE_CONTROL_CODES.has(normalizeControlErrorCode(errorCodeRaw));

export const classifyControlBootstrapIssue = (errorCodeRaw) => {
  const errorCode = normalizeControlErrorCode(errorCodeRaw);
  if (AUTH_LIMITED_CONTROL_CODES.has(errorCode)) return "limited";
  if (isOfflineBootstrapResourceError(errorCode)) return "offline";
  return "fatal";
};

export const isRecoverableBootstrapIssue = (errorCodeRaw) =>
  classifyControlBootstrapIssue(errorCodeRaw) !== "fatal";

export const summarizeBootstrapMode = (issues) => {
  if (!Array.isArray(issues) || issues.length === 0) return "online";
  const modes = new Set(issues.map((issue) => issue.mode));
  if (modes.has("limited")) return "limited";
  if (modes.size === 1 && modes.has("offline")) return "offline";
  return "degraded";
};

export const buildControlStatus = (mode, details, fallbackReason = "") => {
  const safeMode = normalizeControlMode(mode);
  const safeDetails = Array.isArray(details) ? details.filter(Boolean) : [];
  const copy = CONTROL_STATUS_COPY[safeMode] || CONTROL_STATUS_COPY.degraded;
  const detailSummaries = formatControlStatusDetails(safeDetails);
  const reason = fallbackReason || detailSummaries[0]?.detail || "";

  return {
    mode: safeMode,
    title: copy.title,
    message: [copy.message, reason].filter(Boolean).join(" "),
    details: safeMode === "online" ? [] : safeDetails,
    detailSummaries: safeMode === "online" ? [] : detailSummaries,
  };
};

export const formatBootstrapIssues = (issues) =>
  issues.map((issue) => `${issue.resource}:${issue.errorCode}`);

export const collectBootstrapIssues = ({ catalogResult, layoutResult, releaseResult }) =>
  [
    ["catalog", catalogResult?.errorCode, catalogResult?.item],
    ["layout", layoutResult?.errorCode, layoutResult?.item],
    ["release", releaseResult?.errorCode, releaseResult?.item],
  ]
    .filter(([, errorCode, item]) => Boolean(errorCode) || !item)
    .map(([resource, errorCode]) => ({
      resource: String(resource),
      errorCode: normalizeControlErrorCode(errorCode),
      mode: classifyControlBootstrapIssue(errorCode),
    }));

export const classifyViewAccessDegradation = (reasonRaw, currentMode) => {
  const reason = String(reasonRaw || "").trim().toUpperCase();
  if (!reason) return null;
  if (reason.includes("HTTP_401") || reason.includes("HTTP_403")) return "limited";
  if (
    reason.includes("OFFLINE")
    || reason.includes("TIMEOUT")
    || reason.includes("HTTP_408")
    || reason.includes("HTTP_425")
    || reason.includes("HTTP_429")
    || reason.includes("HTTP_500")
    || reason.includes("HTTP_502")
    || reason.includes("HTTP_503")
    || reason.includes("HTTP_504")
  ) {
    return "offline";
  }
  if (reason.includes("HTTP_400") || reason.includes("HTTP_422")) return "degraded";
  if (reason.includes("NETWORK") && currentMode !== "online") return "degraded";
  return null;
};

export const buildStatusFromConnectionTest = (result) => {
  if (result?.mode === "online") return buildControlStatus("online", []);
  const mode = result?.mode || "degraded";
  return buildControlStatus(mode, result?.details || [], result?.message || "");
};
