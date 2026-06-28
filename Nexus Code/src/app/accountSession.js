import { DEFAULT_CONTROL_API_BASE_URL } from "./controlStatus";

export const ACCOUNT_SESSION_STORAGE_KEY = "nexus-code.account-session.v1";

export const createEmptyAccountSession = () => ({
  endpoint: DEFAULT_CONTROL_API_BASE_URL,
  token: "",
  userId: "",
  username: "",
  userTier: "free",
  savedAt: null,
});

const VALID_USER_TIERS = new Set(["free", "pro", "lifetime", "lifetime_pro"]);

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
  const tier = String(sessionRaw.userTier || "free").trim().toLowerCase();
  return {
    endpoint: normalizeNexusApiEndpoint(sessionRaw.endpoint),
    token: String(sessionRaw.token || "").trim(),
    userId: String(sessionRaw.userId || "").trim().slice(0, 80),
    username: String(sessionRaw.username || "").trim().slice(0, 80),
    userTier: VALID_USER_TIERS.has(tier) ? tier : "free",
    savedAt: sessionRaw.savedAt || null,
  };
};

export const loadNexusAccountSession = () => {
  if (typeof window === "undefined") return createEmptyAccountSession();
  try {
    const stored = window.localStorage.getItem(ACCOUNT_SESSION_STORAGE_KEY);
    if (!stored) return createEmptyAccountSession();
    return normalizeAccountSession(JSON.parse(stored));
  } catch {
    return createEmptyAccountSession();
  }
};

export const saveNexusAccountSession = (sessionRaw) => {
  const session = normalizeAccountSession({
    ...sessionRaw,
    savedAt: new Date().toISOString(),
  });
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCOUNT_SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
};

export const clearNexusAccountSession = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCOUNT_SESSION_STORAGE_KEY);
  }
  return createEmptyAccountSession();
};

export const getAccountSessionState = (sessionRaw) => {
  const session = normalizeAccountSession(sessionRaw);
  const hasToken = session.token.length > 0;
  const hasIdentity = Boolean(session.userId || session.username);
  return {
    hasToken,
    hasIdentity,
    isConfigured: hasToken || hasIdentity || session.endpoint !== DEFAULT_CONTROL_API_BASE_URL,
  };
};
