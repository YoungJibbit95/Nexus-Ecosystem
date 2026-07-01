import { DEFAULT_CONTROL_API_BASE_URL } from "./controlStatus.js";

export const ACCOUNT_SESSION_STORAGE_KEY = "nexus-code.account-session.v1";

export const ACCOUNT_AUTH_MODES = {
  signedOut: "signed_out",
  nexus: "nexus",
  local: "local",
};

export const createEmptyAccountSession = () => ({
  authMode: ACCOUNT_AUTH_MODES.signedOut,
  endpoint: DEFAULT_CONTROL_API_BASE_URL,
  token: "",
  userId: "",
  username: "",
  role: "",
  email: "",
  userTier: "free",
  expiresAt: null,
  savedAt: null,
});

const VALID_USER_TIERS = new Set(["free", "pro", "lifetime", "lifetime_pro"]);
const VALID_AUTH_MODES = new Set(Object.values(ACCOUNT_AUTH_MODES));
const ELEVATED_ACCOUNT_ROLES = new Set(["admin", "owner", "developer"]);

const normalizeAuthMode = (modeRaw) => {
  const mode = String(modeRaw || ACCOUNT_AUTH_MODES.signedOut).trim().toLowerCase();
  return VALID_AUTH_MODES.has(mode) ? mode : ACCOUNT_AUTH_MODES.signedOut;
};

export const normalizeNexusUserTier = (tierRaw) => {
  const tier = String(tierRaw || "free").trim().toLowerCase();
  if (tier === "paid") return "pro";
  if (tier === "premium") return "pro";
  if (tier === "lifetime-pro") return "lifetime_pro";
  return VALID_USER_TIERS.has(tier) ? tier : "free";
};

const resolveSessionUserTier = (tierRaw, roleRaw) => {
  const tier = normalizeNexusUserTier(tierRaw);
  const role = String(roleRaw || "").trim().toLowerCase();
  if (tier === "free" && (role === "admin" || role === "owner")) return "lifetime_pro";
  if (tier === "free" && ELEVATED_ACCOUNT_ROLES.has(role)) return "pro";
  return tier;
};

export const normalizeNexusApiEndpoint = (endpointRaw) => {
  const fallback = DEFAULT_CONTROL_API_BASE_URL;
  const raw = String(endpointRaw || "").trim();
  if (!raw) return fallback;

  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase();
    const isHosted = parsed.protocol === "https:" && hostname === "nexus-api.cloud";
    const isLoopback = (parsed.protocol === "http:" || parsed.protocol === "https:")
      && ["localhost", "127.0.0.1", "::1"].includes(hostname);
    if (!isHosted && !isLoopback) return fallback;
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return fallback;
    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${pathname === "/" ? "" : pathname}`;
  } catch {
    return fallback;
  }
};

export const normalizeAccountSession = (sessionRaw = {}) => {
  let authMode = normalizeAuthMode(sessionRaw.authMode);
  const token = String(sessionRaw.token || "").trim();
  const userId = String(sessionRaw.userId || "").trim().slice(0, 80);
  const username = String(sessionRaw.username || "").trim().slice(0, 80);
  if (authMode === ACCOUNT_AUTH_MODES.signedOut && token && (userId || username)) {
    authMode = ACCOUNT_AUTH_MODES.nexus;
  }
  return {
    authMode,
    endpoint: normalizeNexusApiEndpoint(sessionRaw.endpoint),
    token,
    userId,
    username,
    role: String(sessionRaw.role || "").trim().slice(0, 80),
    email: String(sessionRaw.email || "").trim().slice(0, 160),
    userTier: resolveSessionUserTier(sessionRaw.userTier, sessionRaw.role),
    expiresAt: Number.isFinite(Number(sessionRaw.expiresAt))
      ? Number(sessionRaw.expiresAt)
      : null,
    savedAt: sessionRaw.savedAt || null,
  };
};

export const createLocalAccountSession = (sessionRaw = {}) =>
  normalizeAccountSession({
    endpoint: DEFAULT_CONTROL_API_BASE_URL,
    token: "",
    userId: sessionRaw.userId || "local-workspace",
    username: sessionRaw.username || "Local Workspace",
    role: "local",
    userTier: "free",
    authMode: ACCOUNT_AUTH_MODES.local,
    savedAt: sessionRaw.savedAt || new Date().toISOString(),
  });

export const canStartWithAccountSession = (sessionRaw) => {
  const session = normalizeAccountSession(sessionRaw);
  if (session.authMode === ACCOUNT_AUTH_MODES.local) return true;
  if (session.authMode !== ACCOUNT_AUTH_MODES.nexus) return false;
  if (!session.token || (!session.userId && !session.username)) return false;
  if (session.expiresAt && Date.now() >= session.expiresAt - 15_000) return false;
  return true;
};

export const loadNexusAccountSession = () => {
  if (typeof window === "undefined") return createLocalAccountSession();
  try {
    const stored = window.localStorage.getItem(ACCOUNT_SESSION_STORAGE_KEY);
    if (!stored) return createLocalAccountSession();
    const session = normalizeAccountSession(JSON.parse(stored));
    return canStartWithAccountSession(session) ? session : createLocalAccountSession();
  } catch {
    return createLocalAccountSession();
  }
};

export const saveNexusAccountSession = (sessionRaw) => {
  const normalizedSession = normalizeAccountSession({
    ...sessionRaw,
    savedAt: new Date().toISOString(),
  });
  const session = canStartWithAccountSession(normalizedSession)
    ? normalizedSession
    : createLocalAccountSession({ savedAt: normalizedSession.savedAt });
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCOUNT_SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
};

export const clearNexusAccountSession = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCOUNT_SESSION_STORAGE_KEY);
  }
  return createLocalAccountSession();
};

export const getAccountSessionState = (sessionRaw) => {
  const session = normalizeAccountSession(sessionRaw);
  const isLocal = session.authMode === ACCOUNT_AUTH_MODES.local;
  const isSignedOut = session.authMode === ACCOUNT_AUTH_MODES.signedOut;
  const hasToken = session.token.length > 0;
  const hasIdentity = Boolean(session.userId || session.username);
  const isExpired = Boolean(session.expiresAt && Date.now() >= session.expiresAt - 15_000);
  return {
    authMode: session.authMode,
    isLocal,
    isSignedOut,
    hasToken,
    hasIdentity,
    isExpired,
    canStartWorkbench: canStartWithAccountSession(session),
    isConfigured: !isSignedOut || hasToken || hasIdentity || session.endpoint !== DEFAULT_CONTROL_API_BASE_URL,
  };
};
