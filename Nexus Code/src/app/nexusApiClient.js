import {
  NEXUS_CODE_APP_ID,
  NEXUS_CODE_CHANNEL,
  classifyControlBootstrapIssue,
  normalizeControlErrorCode,
} from "./controlStatus.js";
import {
  ACCOUNT_AUTH_MODES,
  normalizeAccountSession,
  normalizeNexusApiEndpoint,
  normalizeNexusUserTier,
} from "./accountSession.js";

const CONNECTION_TEST_TIMEOUT_MS = 4_500;
const LOGIN_TIMEOUT_MS = 8_000;
const CODE_DEVICE_LABEL = "Nexus Code";

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

const isRecord = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));

const readJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const buildApiErrorMessage = (payload, fallback) => {
  if (isRecord(payload)) {
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
  }
  return fallback;
};

const parseAuthEnvelope = (payload) => {
  const candidate = isRecord(payload) && isRecord(payload.item) ? payload.item : payload;
  if (!isRecord(candidate)) {
    throw new Error("Auth response has no usable object payload.");
  }

  const token = typeof candidate.token === "string" ? candidate.token.trim() : "";
  const expiresAt = Number(candidate.expiresAt || 0);
  const user = isRecord(candidate.user) ? candidate.user : {};

  if (!token) throw new Error("Auth response did not include a session token.");
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("Auth response did not include a valid expiration.");
  }

  const username = typeof user.username === "string" ? user.username : "";
  const userId = typeof user.id === "string" ? user.id : username;
  if (!username && !userId) {
    throw new Error("Auth response did not include a user identity.");
  }

  return {
    token,
    expiresAt,
    userId,
    username,
    role: typeof user.role === "string" ? user.role : "",
    email: typeof user.email === "string" ? user.email : "",
    userTier: normalizeNexusUserTier(user.requestedTier),
  };
};

const parseSessionEnvelope = (payload) => {
  const candidate =
    isRecord(payload) && isRecord(payload.item)
      ? payload.item
      : isRecord(payload) && isRecord(payload.session)
        ? payload.session
        : payload;

  if (!isRecord(candidate)) return null;
  const username = typeof candidate.username === "string" ? candidate.username : "";
  const userId = typeof candidate.id === "string" ? candidate.id : username;
  if (!username && !userId) return null;

  return {
    userId,
    username,
    role: typeof candidate.role === "string" ? candidate.role : "",
    email: typeof candidate.email === "string" ? candidate.email : "",
    userTier: normalizeNexusUserTier(candidate.paymentTier || candidate.requestedTier),
    expiresAt: Number.isFinite(Number(candidate.expiresAt))
      ? Number(candidate.expiresAt)
      : null,
  };
};

const fetchSessionProfile = async (baseUrl, token) => {
  const response = await withAbortTimeout(
    `${baseUrl}/api/v1/session`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Nexus-App-Id": NEXUS_CODE_APP_ID,
      },
    },
    LOGIN_TIMEOUT_MS,
  );
  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(buildApiErrorMessage(payload, `Session profile failed with HTTP ${response.status}.`));
  }
  return parseSessionEnvelope(payload);
};

export const loginNexusCodeSession = async ({
  endpoint,
  identifier,
  password,
  rememberSession = true,
} = {}) => {
  const baseUrl = normalizeNexusApiEndpoint(endpoint);
  const username = String(identifier || "").trim();
  const secret = String(password || "");

  if (!username) throw new Error("Username oder E-Mail fehlt.");
  if (secret.length < 8) throw new Error("Passwort muss mindestens 8 Zeichen haben.");

  try {
    const response = await withAbortTimeout(
      `${baseUrl}/auth/login`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Nexus-App-Id": NEXUS_CODE_APP_ID,
        },
        body: JSON.stringify({
          username,
          identifier: username,
          password: secret,
          rememberSession: rememberSession === true,
          source: "nexus-code",
          deviceLabel: CODE_DEVICE_LABEL,
        }),
      },
      LOGIN_TIMEOUT_MS,
    );
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      const errorCode = normalizeControlErrorCode(`HTTP_${response.status}`);
      return {
        ok: false,
        mode: toConnectionMode(errorCode),
        status: response.status,
        message: buildApiErrorMessage(payload, "Login wurde von der API abgelehnt."),
        details: [`auth:${errorCode}`],
      };
    }

    const authSession = parseAuthEnvelope(payload);
    let profile = null;
    try {
      profile = await fetchSessionProfile(baseUrl, authSession.token);
    } catch {
      profile = null;
    }

    const session = normalizeAccountSession({
      endpoint: baseUrl,
      authMode: ACCOUNT_AUTH_MODES.nexus,
      ...authSession,
      ...(profile || {}),
      token: authSession.token,
      expiresAt: profile?.expiresAt || authSession.expiresAt,
    });

    return {
      ok: true,
      mode: "online",
      status: response.status,
      message: "Nexus Code Session aktiv.",
      details: [`auth:HTTP_${response.status}`],
      session,
    };
  } catch (error) {
    const errorCode = error?.name === "AbortError" ? "TIMEOUT" : "NETWORK";
    return {
      ok: false,
      mode: toConnectionMode(errorCode),
      status: 0,
      message: error?.message || "Login konnte die Nexus API nicht erreichen.",
      details: [`auth:${errorCode}`],
    };
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
