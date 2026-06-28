export const WORKBENCH_LAYOUT_STORAGE_KEY = "nexus-code.workbench-layout.v1";

export const WORKBENCH_ZONES = Object.freeze({
  activityBar: "activity-bar",
  sidePanel: "side-panel",
  editor: "editor",
  bottomPanel: "bottom-panel",
});

export const WORKBENCH_PANEL_PLACEMENTS = Object.freeze({
  side: "side",
  bottom: "bottom",
});

export const SIDE_PANEL_SIZE_SEQUENCE = Object.freeze([
  "slim",
  "compact",
  "standard",
]);

export const SIDE_PANEL_SIZES = Object.freeze({
  slim: Object.freeze({
    id: "slim",
    label: "S",
    title: "Schmal",
    width: "clamp(15.5rem, 17vw, 17rem)",
    minWidth: "15.5rem",
    maxWidth: "17rem",
    compactWidth: "min(18rem, calc(100vw - 3.25rem))",
  }),
  compact: Object.freeze({
    id: "compact",
    label: "M",
    title: "Kompakt",
    width: "clamp(16.75rem, 20vw, 19.5rem)",
    minWidth: "16.75rem",
    maxWidth: "19.5rem",
    compactWidth: "min(20rem, calc(100vw - 3.25rem))",
  }),
  standard: Object.freeze({
    id: "standard",
    label: "L",
    title: "Standard",
    width: "clamp(18rem, 22vw, 21.5rem)",
    minWidth: "18rem",
    maxWidth: "21.5rem",
    compactWidth: "min(22rem, calc(100vw - 3.25rem))",
  }),
});

export const BOTTOM_PANEL_SIZE_SEQUENCE = Object.freeze([
  "compact",
  "default",
  "tall",
]);

export const BOTTOM_PANEL_SIZES = Object.freeze({
  compact: Object.freeze({
    id: "compact",
    label: "Compact",
    className: "h-[clamp(11rem,26vh,16rem)]",
    compactClassName: "h-[min(15rem,38vh)]",
  }),
  default: Object.freeze({
    id: "default",
    label: "Default",
    className: "h-[clamp(13rem,30vh,19rem)]",
    compactClassName: "h-[min(17rem,42vh)]",
  }),
  tall: Object.freeze({
    id: "tall",
    label: "Tall",
    className: "h-[clamp(15rem,38vh,23rem)]",
    compactClassName: "h-[min(20rem,48vh)]",
  }),
});

export const DEFAULT_PANEL_PLACEMENTS = Object.freeze({
  explorer: WORKBENCH_PANEL_PLACEMENTS.side,
  search: WORKBENCH_PANEL_PLACEMENTS.side,
  git: WORKBENCH_PANEL_PLACEMENTS.side,
  debug: WORKBENCH_PANEL_PLACEMENTS.side,
  extensions: WORKBENCH_PANEL_PLACEMENTS.side,
  account: WORKBENCH_PANEL_PLACEMENTS.side,
  terminal: WORKBENCH_PANEL_PLACEMENTS.bottom,
  problems: WORKBENCH_PANEL_PLACEMENTS.bottom,
});

export const DEFAULT_WORKBENCH_LAYOUT = Object.freeze({
  version: 1,
  sidePanelSize: "compact",
  bottomPanelSize: "default",
  bottomPanelPlacement: WORKBENCH_PANEL_PLACEMENTS.bottom,
  panelPlacements: DEFAULT_PANEL_PLACEMENTS,
});

export const WORKBENCH_LAYOUT_PRESETS = Object.freeze({
  compact: Object.freeze({
    sidePanelSize: "slim",
    bottomPanelSize: "compact",
  }),
  balanced: Object.freeze({
    sidePanelSize: "compact",
    bottomPanelSize: "default",
  }),
  roomy: Object.freeze({
    sidePanelSize: "standard",
    bottomPanelSize: "tall",
  }),
});

function normalizeSize(value, registry, fallback) {
  return Object.prototype.hasOwnProperty.call(registry, value) ? value : fallback;
}

export function normalizeWorkbenchLayout(layout = {}) {
  const source = layout && typeof layout === "object" ? layout : {};
  const sourcePlacements =
    source.panelPlacements && typeof source.panelPlacements === "object"
      ? source.panelPlacements
      : {};

  return {
    ...DEFAULT_WORKBENCH_LAYOUT,
    ...source,
    version: DEFAULT_WORKBENCH_LAYOUT.version,
    sidePanelSize: normalizeSize(
      source.sidePanelSize,
      SIDE_PANEL_SIZES,
      DEFAULT_WORKBENCH_LAYOUT.sidePanelSize,
    ),
    bottomPanelSize: normalizeSize(
      source.bottomPanelSize,
      BOTTOM_PANEL_SIZES,
      DEFAULT_WORKBENCH_LAYOUT.bottomPanelSize,
    ),
    bottomPanelPlacement: WORKBENCH_PANEL_PLACEMENTS.bottom,
    panelPlacements: {
      ...DEFAULT_PANEL_PLACEMENTS,
      ...sourcePlacements,
    },
  };
}

export function loadWorkbenchLayoutFromStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return normalizeWorkbenchLayout();
  }

  try {
    const raw = window.localStorage.getItem(WORKBENCH_LAYOUT_STORAGE_KEY);
    return normalizeWorkbenchLayout(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeWorkbenchLayout();
  }
}

export function saveWorkbenchLayoutToStorage(layout) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      WORKBENCH_LAYOUT_STORAGE_KEY,
      JSON.stringify(normalizeWorkbenchLayout(layout)),
    );
  } catch {
    // Non-critical: layout preferences should never block editor rendering.
  }
}

export function getSidePanelSize(sizeId) {
  return SIDE_PANEL_SIZES[sizeId] || SIDE_PANEL_SIZES[DEFAULT_WORKBENCH_LAYOUT.sidePanelSize];
}

export function getSidePanelSizeOptions() {
  return SIDE_PANEL_SIZE_SEQUENCE.map((sizeId) => getSidePanelSize(sizeId));
}

export function getBottomPanelSize(sizeId) {
  return BOTTOM_PANEL_SIZES[sizeId] || BOTTOM_PANEL_SIZES[DEFAULT_WORKBENCH_LAYOUT.bottomPanelSize];
}

export function getNextSidePanelSize(sizeId) {
  const currentIndex = SIDE_PANEL_SIZE_SEQUENCE.indexOf(sizeId);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % SIDE_PANEL_SIZE_SEQUENCE.length;
  return SIDE_PANEL_SIZE_SEQUENCE[nextIndex];
}

export function getNextBottomPanelSize(sizeId) {
  const currentIndex = BOTTOM_PANEL_SIZE_SEQUENCE.indexOf(sizeId);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % BOTTOM_PANEL_SIZE_SEQUENCE.length;
  return BOTTOM_PANEL_SIZE_SEQUENCE[nextIndex];
}

export function applyWorkbenchLayoutPreset(layout, presetId) {
  const preset = WORKBENCH_LAYOUT_PRESETS[presetId];
  if (!preset) return normalizeWorkbenchLayout(layout);
  return normalizeWorkbenchLayout({
    ...layout,
    ...preset,
  });
}

export function getWorkbenchPanelPlacement(panelId, layout) {
  const normalized = normalizeWorkbenchLayout(layout);
  return (
    normalized.panelPlacements[panelId] ||
    DEFAULT_PANEL_PLACEMENTS[panelId] ||
    WORKBENCH_PANEL_PLACEMENTS.side
  );
}

export function getWorkbenchSlots({
  sidebarSide = "left",
  activePanel = null,
  bottomPanel = null,
  layout,
} = {}) {
  const side = sidebarSide === "right" ? "right" : "left";
  const normalized = normalizeWorkbenchLayout(layout);
  const sidePanelPlacement = activePanel
    ? getWorkbenchPanelPlacement(activePanel, normalized)
    : null;

  return {
    activityBar: {
      zone: WORKBENCH_ZONES.activityBar,
      side,
      order: side === "right" ? 40 : 0,
    },
    sidePanel: {
      zone: WORKBENCH_ZONES.sidePanel,
      panelId: sidePanelPlacement === WORKBENCH_PANEL_PLACEMENTS.side ? activePanel : null,
      placement: WORKBENCH_PANEL_PLACEMENTS.side,
      side,
      order: side === "right" ? 30 : 5,
      size: normalized.sidePanelSize,
    },
    editor: {
      zone: WORKBENCH_ZONES.editor,
      order: 20,
    },
    bottomPanel: {
      zone: WORKBENCH_ZONES.bottomPanel,
      panelId: bottomPanel,
      placement: normalized.bottomPanelPlacement,
      order: 50,
      size: normalized.bottomPanelSize,
    },
  };
}
