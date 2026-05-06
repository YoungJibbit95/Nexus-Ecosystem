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
  Activity,
} from "lucide-react";
import {
  getFallbackViewsForApp,
  getNexusViewManifest,
  orderViewsForNavigation,
  type NexusViewId,
} from "@nexus/core";

export type View = NexusViewId | "diagnostics";

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

const IS_DEV = (import.meta as any).env?.DEV;

const MAIN_VIEW_ICON_MAP: Record<NexusViewId, LucideIcon> = {
  dashboard: BarChart3,
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

const PRELOAD_PRIORITY: Record<View, number> = {
  dashboard: 0,
  notes: 1,
  tasks: 2,
  reminders: 3,
  settings: 4,
  files: 5,
  info: 6,
  flux: 7,
  canvas: 8,
  code: 9,
  devtools: 10,
  diagnostics: 11,
};

const HEAVY_VIEWS = new Set<View>(["code", "canvas", "devtools"]);

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
  ...(IS_DEV ? (["diagnostics"] as View[]) : []),
];

export const MAIN_VIEW_REGISTRY: Record<View, MainViewRegistryItem> = {
  dashboard: buildCoreRegistryItem("dashboard"),
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
  diagnostics: {
    id: "diagnostics",
    icon: Activity,
    label: "Diagnostics",
    color: "#64d2ff",
    group: "developer",
    category: "system",
    preloadPriority: PRELOAD_PRIORITY.diagnostics,
    heavy: false,
    devOnly: true,
  },
};

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
  (viewId) => ["dashboard", "notes", "tasks", "settings", "reminders"].includes(viewId),
);

export const MAIN_BOOT_PRIORITY_VIEW_IDS: View[] = MAIN_PRELOAD_PRIORITY.filter(
  (viewId) =>
    ["dashboard", "notes", "tasks", "settings", "reminders", "files"].includes(viewId),
);

export const MAIN_PERSISTENT_VIEW_CACHE_IDS: View[] = MAIN_PRELOAD_PRIORITY.filter(
  (viewId) =>
    ["dashboard", "notes", "tasks", "settings", "files", "canvas", "code"].includes(viewId),
);

export const MAIN_PRIMARY_VIEW_ITEMS = MAIN_PRELOAD_PRIORITY
  .map(getMainViewRegistryItem)
  .filter((item) => item.group === "main" || item.group === "developer")
  .filter((item) => !item.devOnly || IS_DEV);

export const MAIN_FOOTER_VIEW_ITEMS = MAIN_PRELOAD_PRIORITY
  .map(getMainViewRegistryItem)
  .filter((item) => item.group === "footer")
  .filter((item) => !item.devOnly || IS_DEV);

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
