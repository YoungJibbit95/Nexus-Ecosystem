import type { View } from "../components/Sidebar";
import { getFallbackViewsForApp } from "@nexus/core";
import { isOfflineControlErrorCode } from "@nexus/api";
import { VIEW_IDS } from "./viewPreload";

export const CONTROL_API_BASE_URL = "https://nexus-api.cloud";
export const MAIN_BOOT_PRELOAD_TIMEOUT_MS = 6_000;
export const MAIN_BOOT_PRELOAD_TIMEOUT_LOW_POWER_MS = 8_500;
export const MAIN_BOOT_VIEW_WARMUP_TIMEOUT_MS = 2_800;
export const MAIN_BOOT_VIEW_WARMUP_TIMEOUT_LOW_POWER_MS = 4_200;
export const MAIN_WALKTHROUGH_STORAGE_KEY = "nx-main-walkthrough-v1";

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

export const MAIN_CORE_FALLBACK_VIEWS: View[] = getFallbackViewsForApp("main")
  .map((candidate) => candidate as View)
  .filter((candidate) => VIEW_IDS.includes(candidate));
export const MAIN_SAFE_STARTUP_VIEWS: View[] =
  MAIN_CORE_FALLBACK_VIEWS.length > 0 ? MAIN_CORE_FALLBACK_VIEWS : VIEW_IDS;
export const MAIN_CRITICAL_PRELOAD_VIEWS: View[] = [
  "dashboard",
  "notes",
  "tasks",
  "settings",
  "reminders",
];
export const MAIN_BOOT_PRIORITY_VIEWS: View[] = [
  "dashboard",
  "notes",
  "tasks",
  "settings",
  "reminders",
  "files",
];
export const MAIN_HEAVY_PRELOAD_VIEW_SET = new Set<View>([
  "code",
  "canvas",
  "devtools",
]);
export const MAIN_PERSISTENT_VIEW_CACHE: View[] = [
  "dashboard",
  "notes",
  "tasks",
  "settings",
  "files",
  "canvas",
  "code",
];

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
