import type { View } from "../components/Sidebar";
import { getFallbackViewsForApp } from "@nexus/core";
import { isOfflineControlErrorCode } from "@nexus/api";
import { VIEW_IDS } from "./viewPreload";

const DEFAULT_CONTROL_API_BASE_URL = "https://nexus-api.cloud";
const HARD_BOOT_FAILURE_CODES = new Set(["HTTP_401", "HTTP_403"]);
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

export const CONTROL_API_BASE_URL = DEFAULT_CONTROL_API_BASE_URL;
export const MOBILE_LAST_KNOWN_VIEWS_STORAGE_KEY =
  "nx-mobile-last-known-startup-views-v1";
export const MOBILE_BOOT_BLOCK_BUDGET_MS = 6_500;
export const MOBILE_BOOT_BLOCK_BUDGET_LOW_POWER_MS = 8_500;
export const MOBILE_BOOT_PRIORITY_VIEWS: View[] = [
  "dashboard",
  "notes",
  "tasks",
  "settings",
  "reminders",
  "files",
];
export const MOBILE_HEAVY_PRELOAD_VIEWS = new Set<View>([
  "code",
  "canvas",
  "devtools",
]);
export const MOBILE_PERSISTENT_VIEW_CACHE: View[] = [
  "dashboard",
  "notes",
  "tasks",
  "settings",
  "files",
  "canvas",
  "code",
];

export const isOfflineBootstrapResourceError = (errorCodeRaw: unknown) =>
  isOfflineControlErrorCode(String(errorCodeRaw || "INVALID_PAYLOAD"));

export const resolveControlApiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  const raw = String(
    env.VITE_NEXUS_CONTROL_API_BASE_URL ||
      env.VITE_CONTROL_API_BASE_URL ||
      env.VITE_NEXUS_API_BASE_URL ||
      DEFAULT_CONTROL_API_BASE_URL,
  ).trim();
  if (!raw) return DEFAULT_CONTROL_API_BASE_URL;
  return raw.replace(/\/+$/, "");
};

export const isRecoverableBootstrapResourceError = (errorCodeRaw: unknown) => {
  const code = String(errorCodeRaw || "INVALID_PAYLOAD")
    .trim()
    .toUpperCase();
  if (!code) return true;
  if (isOfflineControlErrorCode(code)) return true;
  if (RECOVERABLE_BOOT_FAILURE_CODES.has(code)) return true;
  if (HARD_BOOT_FAILURE_CODES.has(code)) return false;
  if (code.includes("TIMEOUT") || code.includes("ABORT")) return true;
  if (/^HTTP_5\d{2}$/.test(code)) return true;
  return false;
};

export const describeBootstrapFailureKind = (errorCodeRaw: unknown) => {
  const code = String(errorCodeRaw || "INVALID_PAYLOAD")
    .trim()
    .toUpperCase();
  if (isOfflineControlErrorCode(code)) return "offline";
  if (code === "TIMEOUT" || code.includes("TIMEOUT")) return "timeout";
  if (code === "NETWORK") return "network";
  if (code.includes("ABORT")) return "timeout";
  if (HARD_BOOT_FAILURE_CODES.has(code)) return "auth";
  if (RECOVERABLE_BOOT_FAILURE_CODES.has(code)) return "payload";
  if (/^HTTP_5\d{2}$/.test(code)) return "server";
  if (/^HTTP_4\d{2}$/.test(code)) return "client";
  return "unknown";
};

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

export const isLowPowerDevice = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const cores = Number(navigator.hardwareConcurrency || 8);
  const memory = Number((navigator as any).deviceMemory || 8);
  return Boolean(reducedMotion) || cores <= 4 || memory <= 4;
};

export const isLikelyIOSRuntime = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isiOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadDesktopMode =
    navigator.platform === "MacIntel" && Number(navigator.maxTouchPoints || 0) > 1;
  return isiOSDevice || iPadDesktopMode;
};

export const shouldPrewarmHeavyMobileViews = (opts: {
  lowPowerMode: boolean;
}) => {
  // iOS WebKit is prone to early pressure when multiple heavy chunks/surfaces
  // are prewarmed before first interactive paint.
  if (opts.lowPowerMode) return false;
  if (isLikelyIOSRuntime()) return false;
  return true;
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

const MOBILE_CORE_FALLBACK_VIEWS: View[] = getFallbackViewsForApp("mobile")
  .map((candidate) => candidate as View)
  .filter((candidate) => VIEW_IDS.includes(candidate));
export const MOBILE_SAFE_STARTUP_VIEWS: View[] =
  MOBILE_CORE_FALLBACK_VIEWS.length > 0 ? MOBILE_CORE_FALLBACK_VIEWS : VIEW_IDS;

export const readLastKnownMobileStartupViews = (): View[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MOBILE_LAST_KNOWN_VIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => String(entry || "").toLowerCase() as View)
      .filter((entry) => VIEW_IDS.includes(entry));
  } catch {
    return [];
  }
};

export const writeLastKnownMobileStartupViews = (views: View[]) => {
  if (typeof window === "undefined") return;
  try {
    const sanitized = views.filter((candidate) => VIEW_IDS.includes(candidate));
    window.localStorage.setItem(
      MOBILE_LAST_KNOWN_VIEWS_STORAGE_KEY,
      JSON.stringify(sanitized.slice(0, 16)),
    );
  } catch {
    // best-effort only
  }
};
