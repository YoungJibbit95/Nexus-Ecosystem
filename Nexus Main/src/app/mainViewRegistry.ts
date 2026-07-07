import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Code2,
  Columns,
  FileText,
  GitBranch,
  HardDrive,
  Info,
  Settings,
  Wrench,
  Zap,
  CalendarDays,
  Flag,
  Activity,
} from "lucide-react";
import {
  getFallbackViewsForApp,
  getNexusViewManifest,
  orderViewsForNavigation,
  type NexusViewId,
} from "@nexus/core";

export type View = NexusViewId | "feature-flags" | "diagnostics";

export type MainViewRegistryGroup = "main" | "footer" | "developer";

export type MainViewRegistryItem = {
  id: View;
  icon: LucideIcon;
  label: string;
  color: string;
  group: MainViewRegistryGroup;
  category: string;
  preloadPriority: number;
  heavy: boolean;
  devOnly?: boolean;
};

export const MAIN_DEVELOPMENT_ONLY_VIEWS_ENABLED = import.meta.env.DEV;
export const MAIN_DIAGNOSTICS_ENABLED = MAIN_DEVELOPMENT_ONLY_VIEWS_ENABLED;
export const MAIN_FEATURE_FLAGS_VIEW_ID = ["feature", "flags"].join("-") as Extract<
  View,
  "feature-flags"
>;
export const MAIN_DIAGNOSTICS_VIEW_ID = "diagnostics" as Extract<View, "diagnostics">;

export const isMainDevelopmentOnlyViewsEnabled = () => MAIN_DEVELOPMENT_ONLY_VIEWS_ENABLED;
export const isMainDiagnosticsEnabled = () => MAIN_DIAGNOSTICS_ENABLED;

const MAIN_VIEW_ICON_MAP: Record<NexusViewId, LucideIcon> = {
  dashboard: BarChart3,
  calendar: CalendarDays,
  notes: FileText,
  code: Code2,
  tasks: Columns,
  reminders: Bell,
  canvas: GitBranch,
  files: HardDrive,
  flux: Zap,
  settings: Settings,
  info: Info,
  devtools: Wrench,
};

const PRELOAD_PRIORITY: Record<NexusViewId, number> = {
  dashboard: 0,
  calendar: 1,
  notes: 2,
  tasks: 3,
  reminders: 4,
  settings: 5,
  files: 6,
  info: 7,
  flux: 8,
  canvas: 9,
  code: 10,
  devtools: 11,
};

const HEAVY_VIEWS = new Set<View>(["code", "canvas", "devtools"]);
const getDevelopmentPreloadPriority = (viewId: View) =>
  viewId === MAIN_DIAGNOSTICS_VIEW_ID ? 13 : 12;

const toRegistryGroup = (viewId: NexusViewId): MainViewRegistryGroup => {
  const manifest = getNexusViewManifest(viewId);
  if (manifest?.navigationGroup === "developer") return "developer";
  if (manifest?.navigationGroup === "support") return "footer";
  return "main";
};

const buildCoreRegistryItem = (viewId: NexusViewId): MainViewRegistryItem => {
  const manifest = getNexusViewManifest(viewId);
  return {
    id: viewId,
    icon: MAIN_VIEW_ICON_MAP[viewId],
    label: manifest?.navLabel ?? viewId,
    color: manifest?.accent ?? "#64d2ff",
    group: toRegistryGroup(viewId),
    category: manifest?.category ?? "workspace",
    preloadPriority: PRELOAD_PRIORITY[viewId],
    heavy: HEAVY_VIEWS.has(viewId),
  };
};

export const MAIN_CORE_VIEW_IDS: NexusViewId[] = orderViewsForNavigation(
  getFallbackViewsForApp("main"),
);

export const MAIN_VIEW_IDS: View[] = [
  ...MAIN_CORE_VIEW_IDS,
  ...(import.meta.env.DEV
    ? ([MAIN_FEATURE_FLAGS_VIEW_ID, MAIN_DIAGNOSTICS_VIEW_ID] as View[])
    : []),
];

const MAIN_CORE_VIEW_REGISTRY: Record<NexusViewId, MainViewRegistryItem> = {
  dashboard: buildCoreRegistryItem("dashboard"),
  calendar: buildCoreRegistryItem("calendar"),
  notes: buildCoreRegistryItem("notes"),
  code: buildCoreRegistryItem("code"),
  tasks: buildCoreRegistryItem("tasks"),
  reminders: buildCoreRegistryItem("reminders"),
  canvas: buildCoreRegistryItem("canvas"),
  files: buildCoreRegistryItem("files"),
  flux: buildCoreRegistryItem("flux"),
  settings: buildCoreRegistryItem("settings"),
  info: buildCoreRegistryItem("info"),
  devtools: buildCoreRegistryItem("devtools"),
};

const MAIN_DEVELOPMENT_VIEW_REGISTRY: Partial<Record<View, MainViewRegistryItem>> =
  import.meta.env.DEV
    ? {
        [MAIN_FEATURE_FLAGS_VIEW_ID]: {
          id: MAIN_FEATURE_FLAGS_VIEW_ID,
          icon: Flag,
          label: ["Feature", "Flags"].join(" "),
          color: "#30d158",
          group: "developer",
          category: "system",
          preloadPriority: getDevelopmentPreloadPriority(MAIN_FEATURE_FLAGS_VIEW_ID),
          heavy: false,
          devOnly: true,
        },
        [MAIN_DIAGNOSTICS_VIEW_ID]: {
          id: MAIN_DIAGNOSTICS_VIEW_ID,
          icon: Activity,
          label: "Diagnostics",
          color: "#64d2ff",
          group: "developer",
          category: "system",
          preloadPriority: getDevelopmentPreloadPriority(MAIN_DIAGNOSTICS_VIEW_ID),
          heavy: false,
          devOnly: true,
        },
      }
    : {};

export const MAIN_VIEW_REGISTRY = {
  ...MAIN_CORE_VIEW_REGISTRY,
  ...MAIN_DEVELOPMENT_VIEW_REGISTRY,
} as Record<View, MainViewRegistryItem>;

export const getMainViewRegistryItem = (viewId: View) =>
  MAIN_VIEW_REGISTRY[viewId] ?? MAIN_VIEW_REGISTRY.dashboard;

export const MAIN_PRELOAD_PRIORITY: View[] = [...MAIN_VIEW_IDS].sort(
  (a, b) =>
    getMainViewRegistryItem(a).preloadPriority -
    getMainViewRegistryItem(b).preloadPriority,
);

export const MAIN_HEAVY_PRELOAD_VIEW_SET = new Set<View>(
  MAIN_PRELOAD_PRIORITY.filter((viewId) => getMainViewRegistryItem(viewId).heavy),
);

export const MAIN_CRITICAL_PRELOAD_VIEW_IDS: View[] = MAIN_PRELOAD_PRIORITY.filter(
  (viewId) => ["dashboard", "calendar", "notes", "tasks", "settings", "reminders"].includes(viewId),
);

export const MAIN_BOOT_PRIORITY_VIEW_IDS: View[] = MAIN_PRELOAD_PRIORITY.filter(
  (viewId) =>
    ["dashboard", "calendar", "notes", "tasks", "settings", "reminders", "files"].includes(viewId),
);

export const MAIN_PERSISTENT_VIEW_CACHE_IDS: View[] = MAIN_PRELOAD_PRIORITY.filter(
  (viewId) =>
    ["dashboard", "calendar", "notes", "tasks", "settings", "files", "canvas", "code"].includes(viewId),
);

export const MAIN_PRIMARY_VIEW_ITEMS = MAIN_PRELOAD_PRIORITY
  .map(getMainViewRegistryItem)
  .filter((item) => item.group === "main" || item.group === "developer")
  .filter((item) => !item.devOnly || MAIN_DIAGNOSTICS_ENABLED);

export const MAIN_FOOTER_VIEW_ITEMS = MAIN_PRELOAD_PRIORITY
  .map(getMainViewRegistryItem)
  .filter((item) => item.group === "footer")
  .filter((item) => !item.devOnly || MAIN_DIAGNOSTICS_ENABLED);

export const normalizeMainViews = (views: readonly string[]): View[] => {
  const allowed = new Set(MAIN_VIEW_IDS);
  const seen = new Set<View>();
  const result: View[] = [];
  for (const candidate of views) {
    if (!allowed.has(candidate as View) || seen.has(candidate as View)) continue;
    seen.add(candidate as View);
    result.push(candidate as View);
  }
  return result;
};
