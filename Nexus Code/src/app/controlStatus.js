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

export const normalizeControlErrorCode = (errorCodeRaw) =>
  String(errorCodeRaw || "INVALID_PAYLOAD").trim().toUpperCase() || "INVALID_PAYLOAD";

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
  const safeDetails = Array.isArray(details) ? details.filter(Boolean) : [];
  if (mode === "online") {
    return {
      mode: "online",
      title: "Control API verbunden",
      message: "Live Katalog, Layout und Release sind aktiv.",
      details: [],
    };
  }

  const title = mode === "limited"
    ? "Control API limited"
    : mode === "offline"
      ? "Control API offline"
      : "Control API degraded";
  const message = mode === "limited"
    ? "Hosted Auth ist nicht verfuegbar. Nexus Code startet mit lokalen Runtime-Daten."
    : mode === "offline"
      ? "Hosted Control ist nicht erreichbar. Nexus Code startet mit lokalen Runtime-Daten."
      : "Control Bootstrap ist eingeschraenkt. Nexus Code nutzt lokale Fallback-Daten.";

  return {
    mode,
    title,
    message: fallbackReason ? `${message} ${fallbackReason}` : message,
    details: safeDetails,
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
  if (reason.includes("NETWORK") && currentMode !== "online") return "degraded";
  return null;
};

export const buildStatusFromConnectionTest = (result) => {
  if (result?.mode === "online") return buildControlStatus("online", []);
  const mode = result?.mode || "degraded";
  return buildControlStatus(mode, result?.details || [], result?.message || "");
};
