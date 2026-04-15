import type { View } from "../components/Sidebar";
import { getFallbackViewsForApp } from "@nexus/core";
import { isOfflineControlErrorCode } from "@nexus/api";
import { VIEW_IDS } from "./viewPreload";

export const CONTROL_API_BASE_URL = "https://nexus-api.cloud";
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

