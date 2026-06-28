import {
  NEXUS_CODE_APP_ID,
  NEXUS_CODE_CHANNEL,
  classifyControlBootstrapIssue,
  normalizeControlErrorCode,
} from "./controlStatus";
import { normalizeNexusApiEndpoint } from "./accountSession";

const CONNECTION_TEST_TIMEOUT_MS = 4_500;
const toConnectionMode = (errorCode) => {
  const mode = classifyControlBootstrapIssue(errorCode);
  return mode === "fatal" ? "degraded" : mode;
};

const withAbortTimeout = async (url, init, timeoutMs = CONNECTION_TEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
};

export const testNexusApiConnection = async ({
  endpoint,
  token,
  appId = NEXUS_CODE_APP_ID,
  channel = NEXUS_CODE_CHANNEL,
} = {}) => {
  const baseUrl = normalizeNexusApiEndpoint(endpoint);
  const url = `${baseUrl}/api/v2/releases/current?appId=${encodeURIComponent(appId)}&channel=${encodeURIComponent(channel)}`;
  const headers = {
    Accept: "application/json",
    "X-Nexus-App-Id": appId,
  };
  if (token) headers.Authorization = `Bearer ${String(token).trim()}`;

  try {
    const response = await withAbortTimeout(url, {
      method: "GET",
      headers,
    });
    if (response.ok) {
      return {
        ok: true,
        mode: "online",
        status: response.status,
        message: "Connection test succeeded.",
        details: [`release:HTTP_${response.status}`],
      };
    }

    const errorCode = normalizeControlErrorCode(`HTTP_${response.status}`);
    return {
      ok: false,
      mode: toConnectionMode(errorCode),
      status: response.status,
      message: response.status === 401 || response.status === 403
        ? "Auth fehlt oder wurde abgelehnt."
        : "Remote API hat den Test abgelehnt.",
      details: [`release:${errorCode}`],
    };
  } catch (error) {
    const errorCode = error?.name === "AbortError" ? "TIMEOUT" : "NETWORK";
    return {
      ok: false,
      mode: toConnectionMode(errorCode),
      status: 0,
      message: errorCode === "TIMEOUT"
        ? "Connection test timed out."
        : "Connection test could not reach the API.",
      details: [`release:${errorCode}`],
    };
  }
};
