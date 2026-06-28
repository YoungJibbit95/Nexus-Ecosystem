import type { View } from "../components/Sidebar";
import { isOfflineControlErrorCode, normalizeControlBaseUrl } from "@nexus/api";
import { VIEW_IDS } from "./viewPreload";
import {
  MAIN_BOOT_PRIORITY_VIEW_IDS,
  MAIN_CORE_VIEW_IDS,
  MAIN_CRITICAL_PRELOAD_VIEW_IDS,
  MAIN_HEAVY_PRELOAD_VIEW_SET as MAIN_REGISTRY_HEAVY_PRELOAD_VIEW_SET,
  MAIN_PERSISTENT_VIEW_CACHE_IDS,
  isMainDiagnosticsEnabled,
} from "./mainViewRegistry";

export const CONTROL_API_BASE_URL = "https://nexus-api.cloud";
export const MAIN_RUNTIME_CHANNEL_STORAGE_KEY = "nx-main-runtime-channel-v1";
export const MAIN_BOOT_PRELOAD_TIMEOUT_MS = 6_000;
export const MAIN_BOOT_PRELOAD_TIMEOUT_LOW_POWER_MS = 8_500;
export const MAIN_BOOT_VIEW_WARMUP_TIMEOUT_MS = 2_800;
export const MAIN_BOOT_VIEW_WARMUP_TIMEOUT_LOW_POWER_MS = 4_200;
export const MAIN_WALKTHROUGH_STORAGE_KEY = "nx-main-walkthrough-v2";

const HARD_BOOT_FAILURE_CODES = new Set([
  "HTTP_401",
  "HTTP_403",
  "INGEST_UNAUTHORIZED",
  "UNAUTHORIZED",
  "INVALID_CREDENTIALS",
  "DEVICE_NOT_VERIFIED",
  "DEVICE_ID_REQUIRED",
]);

const RECOVERABLE_BOOT_FAILURE_CODES = new Set([
  "INVALID_PAYLOAD",
  "INVALID_JSON",
  "INVALID_SCHEMA",
  "PARSE_ERROR",
  "EMPTY_PAYLOAD",
  "MISSING_PAYLOAD",
  "TIMEOUT",
  "NETWORK",
  "ABORTED",
  "ABORT_ERR",
  "NO_BASE_URL",
  "HTTP_404",
]);

export type MainRuntimeChannel = "production" | "canary" | "dev";

export type MainRuntimeChannelConfig = {
  channel: MainRuntimeChannel;
  liveSyncChannel: "production" | "staging";
  label: string;
  apiBaseUrl: string;
  source: "stable-default" | "env" | "local-override";
  overrideAllowed: boolean;
  requiresSignedManifest: boolean;
  warning: string | null;
};

const normalizeApiBaseUrl = (value: unknown) =>
  normalizeControlBaseUrl(String(value || ""), "");

const resolveFirstApiBaseUrl = (...values: unknown[]) => {
  for (const value of values) {
    const normalized = normalizeApiBaseUrl(value);
    if (normalized) return normalized;
  }
  return "";
};

const normalizeRuntimeChannel = (value: unknown): MainRuntimeChannel | null => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "production" || raw === "stable") return "production";
  if (raw === "canary" || raw === "staging") return "canary";
  if (raw === "dev" || raw === "local") return "dev";
  return null;
};

const readRuntimeChannelOverride = () => {
  if (typeof window === "undefined") return null;
  try {
    return normalizeRuntimeChannel(window.localStorage.getItem(MAIN_RUNTIME_CHANNEL_STORAGE_KEY));
  } catch {
    return null;
  }
};

export const resolveMainRuntimeChannelConfig = (
  env: Record<string, unknown> = ((import.meta as any).env || {}) as Record<string, unknown>,
): MainRuntimeChannelConfig => {
  const overrideAllowed =
    isMainDiagnosticsEnabled() ||
    String(env.VITE_NEXUS_ALLOW_RUNTIME_CHANNEL_OVERRIDE || "").trim() === "1";
  const localOverride = overrideAllowed ? readRuntimeChannelOverride() : null;
  const envChannel = normalizeRuntimeChannel(env.VITE_NEXUS_RUNTIME_CHANNEL);
  const requestedChannel = localOverride || envChannel || "production";

  if (requestedChannel === "production") {
    return {
      channel: "production",
      liveSyncChannel: "production",
      label: "Stable",
      apiBaseUrl: CONTROL_API_BASE_URL,
      source: localOverride ? "local-override" : envChannel ? "env" : "stable-default",
      overrideAllowed,
      requiresSignedManifest: false,
      warning: null,
    };
  }

  if (!overrideAllowed) {
    return {
      channel: "production",
      liveSyncChannel: "production",
      label: "Stable",
      apiBaseUrl: CONTROL_API_BASE_URL,
      source: "stable-default",
      overrideAllowed,
      requiresSignedManifest: false,
      warning: "Runtime channel override ignored outside dev/admin context.",
    };
  }

  if (requestedChannel === "canary") {
    const apiBaseUrl = resolveFirstApiBaseUrl(
      env.VITE_NEXUS_CANARY_CONTROL_API_BASE_URL,
      env.VITE_NEXUS_STAGING_CONTROL_API_BASE_URL,
      env.VITE_NEXUS_CONTROL_URL,
    ) ||
      CONTROL_API_BASE_URL;
    return {
      channel: "canary",
      liveSyncChannel: "staging",
      label: "Canary",
      apiBaseUrl,
      source: localOverride ? "local-override" : "env",
      overrideAllowed,
      requiresSignedManifest: true,
      warning:
        apiBaseUrl === CONTROL_API_BASE_URL
          ? "Canary channel has no staging API configured and falls back to production API."
          : null,
    };
  }

  const apiBaseUrl = resolveFirstApiBaseUrl(
    env.VITE_NEXUS_DEV_CONTROL_API_BASE_URL,
    env.VITE_NEXUS_CONTROL_API_BASE_URL,
    env.VITE_CONTROL_API_BASE_URL,
    env.VITE_NEXUS_CONTROL_URL,
  ) ||
    "http://127.0.0.1:4399";
  return {
    channel: "dev",
    liveSyncChannel: "staging",
    label: "Dev",
    apiBaseUrl,
    source: localOverride ? "local-override" : "env",
    overrideAllowed,
    requiresSignedManifest: false,
    warning: "Dev channel can use local or staging APIs and must stay visibly marked.",
  };
};

export const isLowPowerDevice = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const cores = Number(navigator.hardwareConcurrency || 8);
  const memory = Number((navigator as any).deviceMemory || 8);
  return Boolean(reducedMotion) || cores <= 4 || memory <= 4;
};

export const isOfflineBootstrapResourceError = (errorCodeRaw: unknown) =>
  isOfflineControlErrorCode(String(errorCodeRaw || "INVALID_PAYLOAD"));

export const normalizeBootstrapErrorCode = (errorCodeRaw: unknown) =>
  String(errorCodeRaw || "INVALID_PAYLOAD")
    .trim()
    .toUpperCase();

export const isHardBootstrapResourceError = (errorCodeRaw: unknown) =>
  HARD_BOOT_FAILURE_CODES.has(normalizeBootstrapErrorCode(errorCodeRaw));

export const isRecoverableBootstrapResourceError = (errorCodeRaw: unknown) => {
  const code = normalizeBootstrapErrorCode(errorCodeRaw);
  if (!code) return true;
  if (isOfflineControlErrorCode(code)) return true;
  if (RECOVERABLE_BOOT_FAILURE_CODES.has(code)) return true;
  if (HARD_BOOT_FAILURE_CODES.has(code)) return false;
  if (code.includes("TIMEOUT") || code.includes("ABORT")) return true;
  if (/^HTTP_5\d{2}$/.test(code)) return true;
  return false;
};

export const describeBootstrapFailureKind = (errorCodeRaw: unknown) => {
  const code = normalizeBootstrapErrorCode(errorCodeRaw);
  if (isOfflineControlErrorCode(code)) return "offline";
  if (code === "TIMEOUT" || code.includes("TIMEOUT") || code.includes("ABORT")) {
    return "timeout";
  }
  if (code === "NETWORK") return "network";
  if (HARD_BOOT_FAILURE_CODES.has(code)) return "auth";
  if (RECOVERABLE_BOOT_FAILURE_CODES.has(code)) return "payload";
  if (/^HTTP_5\d{2}$/.test(code)) return "server";
  if (/^HTTP_4\d{2}$/.test(code)) return "client";
  return "unknown";
};

export const withTimeoutResult = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<{ timedOut: true } | { timedOut: false; value: T }> => {
  let timeoutHandle: number | null = null;
  const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
    timeoutHandle = window.setTimeout(() => resolve({ timedOut: true }), timeoutMs);
  });

  try {
    const result = await Promise.race([
      promise.then((value) => ({ timedOut: false as const, value })),
      timeoutPromise,
    ]);
    return result;
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }
};

export const MAIN_CORE_FALLBACK_VIEWS: View[] = MAIN_CORE_VIEW_IDS
  .map((candidate) => candidate as View)
  .filter((candidate) => VIEW_IDS.includes(candidate));

export const withDevDiagnosticsView = (views: View[]): View[] => {
  const baseViews = views.filter((candidate) => candidate !== "diagnostics");
  if (!isMainDiagnosticsEnabled()) return baseViews;
  return [...baseViews, "diagnostics"];
};

export const MAIN_SAFE_STARTUP_VIEWS: View[] =
  withDevDiagnosticsView(
    MAIN_CORE_FALLBACK_VIEWS.length > 0 ? MAIN_CORE_FALLBACK_VIEWS : VIEW_IDS,
  );
export const MAIN_CRITICAL_PRELOAD_VIEWS: View[] = MAIN_CRITICAL_PRELOAD_VIEW_IDS;
export const MAIN_BOOT_PRIORITY_VIEWS: View[] = MAIN_BOOT_PRIORITY_VIEW_IDS;
export const MAIN_HEAVY_PRELOAD_VIEW_SET = MAIN_REGISTRY_HEAVY_PRELOAD_VIEW_SET;
export const MAIN_PERSISTENT_VIEW_CACHE: View[] = MAIN_PERSISTENT_VIEW_CACHE_IDS;

export const mergeUniqueViews = (...groups: View[][]): View[] => {
  const ordered = groups.flat();
  const seen = new Set<View>();
  const result: View[] = [];
  for (const viewId of ordered) {
    if (seen.has(viewId)) continue;
    seen.add(viewId);
    result.push(viewId);
  }
  return result;
};
