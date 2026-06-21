export type CanvasGridModePreference = "dots" | "lines" | "none";
export type CanvasLayoutModePreference = "mindmap" | "timeline" | "board";

export interface CanvasUiPreferences {
  version: 1;
  gridMode: CanvasGridModePreference;
  showMiniMap: boolean;
  snapToGrid: boolean;
  layoutMode: CanvasLayoutModePreference;
  showSidebar: boolean;
  showProjectPanel: boolean;
}

const GRID_MODES = new Set<CanvasGridModePreference>(["dots", "lines", "none"]);
const LAYOUT_MODES = new Set<CanvasLayoutModePreference>(["mindmap", "timeline", "board"]);

export const DEFAULT_CANVAS_UI_PREFERENCES: CanvasUiPreferences = {
  version: 1,
  gridMode: "dots",
  showMiniMap: true,
  snapToGrid: true,
  layoutMode: "mindmap",
  showSidebar: false,
  showProjectPanel: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object");

export function normalizeCanvasUiPreferences(
  value: unknown,
  fallback: Partial<CanvasUiPreferences> = {},
): CanvasUiPreferences {
  const defaults = { ...DEFAULT_CANVAS_UI_PREFERENCES, ...fallback };
  if (!isRecord(value)) return defaults;

  const gridMode = GRID_MODES.has(value.gridMode as CanvasGridModePreference)
    ? (value.gridMode as CanvasGridModePreference)
    : defaults.gridMode;
  const layoutMode = LAYOUT_MODES.has(value.layoutMode as CanvasLayoutModePreference)
    ? (value.layoutMode as CanvasLayoutModePreference)
    : defaults.layoutMode;

  return {
    version: 1,
    gridMode,
    showMiniMap: typeof value.showMiniMap === "boolean" ? value.showMiniMap : defaults.showMiniMap,
    snapToGrid: typeof value.snapToGrid === "boolean" ? value.snapToGrid : defaults.snapToGrid,
    layoutMode,
    showSidebar: typeof value.showSidebar === "boolean" ? value.showSidebar : defaults.showSidebar,
    showProjectPanel:
      typeof value.showProjectPanel === "boolean" ? value.showProjectPanel : defaults.showProjectPanel,
  };
}

export function loadCanvasUiPreferences(
  storageKey: string,
  fallback: Partial<CanvasUiPreferences> = {},
): CanvasUiPreferences {
  try {
    if (typeof globalThis.localStorage === "undefined") {
      return normalizeCanvasUiPreferences(null, fallback);
    }
    const raw = globalThis.localStorage.getItem(storageKey);
    if (!raw) return normalizeCanvasUiPreferences(null, fallback);
    return normalizeCanvasUiPreferences(JSON.parse(raw), fallback);
  } catch {
    return normalizeCanvasUiPreferences(null, fallback);
  }
}

export function saveCanvasUiPreferences(storageKey: string, prefs: CanvasUiPreferences) {
  try {
    if (typeof globalThis.localStorage === "undefined") return;
    globalThis.localStorage.setItem(storageKey, JSON.stringify(normalizeCanvasUiPreferences(prefs)));
  } catch {
    // Ignore quota/security errors; canvas interaction must never fail because UI prefs cannot persist.
  }
}

export function shouldRenderCanvasMiniMap({
  userPreference,
  width,
  height,
  isMobile = false,
  nodeCount,
}: {
  userPreference: boolean;
  width: number;
  height: number;
  isMobile?: boolean;
  nodeCount: number;
}) {
  if (!userPreference || nodeCount <= 0) return false;
  if (isMobile && Math.min(width, height) < 700) return false;
  if (width < 760 || height < 460) return false;
  return true;
}