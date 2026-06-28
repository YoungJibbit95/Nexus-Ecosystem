export const WORKBENCH_DOCK_STORAGE_KEY = "nexus-code.workbench-layout.v1";
export const WORKBENCH_LAYOUT_STORAGE_KEY = WORKBENCH_DOCK_STORAGE_KEY;
export const WORKBENCH_DOCK_VERSION = 2;
export const WORKBENCH_CUSTOM_PRESET_ID = "custom";

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
  "focus",
  "comfortable",
  "wide",
]);

const SIDE_PANEL_SIZE_ALIASES = Object.freeze({
  slim: "focus",
  compact: "comfortable",
  standard: "wide",
});

export const SIDE_PANEL_SIZES = Object.freeze({
  focus: Object.freeze({
    id: "focus",
    label: "F",
    title: "Fokus",
    width: "clamp(13.75rem, 15vw, 15.75rem)",
    minWidth: "13.75rem",
    maxWidth: "15.75rem",
    compactWidth: "min(17rem, calc(100vw - 3.25rem))",
  }),
  comfortable: Object.freeze({
    id: "comfortable",
    label: "C",
    title: "Comfortable",
    width: "clamp(15rem, 18vw, 18rem)",
    minWidth: "15rem",
    maxWidth: "18rem",
    compactWidth: "min(19rem, calc(100vw - 3.25rem))",
  }),
  wide: Object.freeze({
    id: "wide",
    label: "W",
    title: "Wide",
    width: "clamp(16.5rem, 20vw, 20.25rem)",
    minWidth: "16.5rem",
    maxWidth: "20.25rem",
    compactWidth: "min(21rem, calc(100vw - 3.25rem))",
  }),
});

export const BOTTOM_PANEL_SIZE_SEQUENCE = Object.freeze([
  "focus",
  "comfortable",
  "wide",
]);

const BOTTOM_PANEL_SIZE_ALIASES = Object.freeze({
  compact: "focus",
  default: "comfortable",
  tall: "wide",
});

export const BOTTOM_PANEL_SIZES = Object.freeze({
  focus: Object.freeze({
    id: "focus",
    label: "F",
    title: "Fokus",
    className: "h-[clamp(10rem,23vh,14rem)] shrink-0",
    compactClassName: "h-[min(13rem,34vh)] shrink-0",
    style: Object.freeze({
      flex: "0 0 clamp(10rem, 23vh, 14rem)",
      minHeight: "10rem",
      maxHeight: "14rem",
    }),
    compactStyle: Object.freeze({
      flex: "0 0 min(13rem, 34vh)",
      minHeight: "9.5rem",
      maxHeight: "13rem",
    }),
  }),
  comfortable: Object.freeze({
    id: "comfortable",
    label: "C",
    title: "Comfortable",
    className: "h-[clamp(12rem,28vh,17rem)] shrink-0",
    compactClassName: "h-[min(15.5rem,40vh)] shrink-0",
    style: Object.freeze({
      flex: "0 0 clamp(12rem, 28vh, 17rem)",
      minHeight: "12rem",
      maxHeight: "17rem",
    }),
    compactStyle: Object.freeze({
      flex: "0 0 min(15.5rem, 40vh)",
      minHeight: "11rem",
      maxHeight: "15.5rem",
    }),
  }),
  wide: Object.freeze({
    id: "wide",
    label: "W",
    title: "Wide",
    className: "h-[clamp(14rem,34vh,21rem)] shrink-0",
    compactClassName: "h-[min(18rem,46vh)] shrink-0",
    style: Object.freeze({
      flex: "0 0 clamp(14rem, 34vh, 21rem)",
      minHeight: "14rem",
      maxHeight: "21rem",
    }),
    compactStyle: Object.freeze({
      flex: "0 0 min(18rem, 46vh)",
      minHeight: "12.5rem",
      maxHeight: "18rem",
    }),
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

export const WORKBENCH_LAYOUT_PRESETS = Object.freeze({
  focus: Object.freeze({
    id: "focus",
    label: "Focus",
    title: "Fokus",
    sidePanelSize: "focus",
    bottomPanelSize: "focus",
  }),
  comfortable: Object.freeze({
    id: "comfortable",
    label: "Comfort",
    title: "Comfortable",
    sidePanelSize: "comfortable",
    bottomPanelSize: "comfortable",
  }),
  wide: Object.freeze({
    id: "wide",
    label: "Wide",
    title: "Wide",
    sidePanelSize: "wide",
    bottomPanelSize: "wide",
  }),
});

export const WORKBENCH_DOCK_PRESETS = WORKBENCH_LAYOUT_PRESETS;

const WORKBENCH_PRESET_ALIASES = Object.freeze({
  compact: "focus",
  balanced: "comfortable",
  roomy: "wide",
});

export const DEFAULT_WORKBENCH_LAYOUT = Object.freeze({
  version: WORKBENCH_DOCK_VERSION,
  presetId: "comfortable",
  sidePanelSize: "comfortable",
  bottomPanelSize: "comfortable",
  bottomPanelPlacement: WORKBENCH_PANEL_PLACEMENTS.bottom,
  panelPlacements: DEFAULT_PANEL_PLACEMENTS,
});

const SIDE_PANEL_IDS = Object.freeze(
  Object.entries(DEFAULT_PANEL_PLACEMENTS)
    .filter(([, placement]) => placement === WORKBENCH_PANEL_PLACEMENTS.side)
    .map(([panelId]) => panelId),
);

const BOTTOM_PANEL_IDS = Object.freeze(
  Object.entries(DEFAULT_PANEL_PLACEMENTS)
    .filter(([, placement]) => placement === WORKBENCH_PANEL_PLACEMENTS.bottom)
    .map(([panelId]) => panelId),
);

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeRegistryId(value, registry, fallback, aliases = {}) {
  const resolved = aliases[value] || value;
  return Object.prototype.hasOwnProperty.call(registry, resolved)
    ? resolved
    : fallback;
}

function normalizePresetId(value) {
  if (value === WORKBENCH_CUSTOM_PRESET_ID) return WORKBENCH_CUSTOM_PRESET_ID;
  return normalizeRegistryId(
    value,
    WORKBENCH_LAYOUT_PRESETS,
    DEFAULT_WORKBENCH_LAYOUT.presetId,
    WORKBENCH_PRESET_ALIASES,
  );
}

function normalizePanelPlacement(value, fallback = WORKBENCH_PANEL_PLACEMENTS.side) {
  return value === WORKBENCH_PANEL_PLACEMENTS.bottom
    ? WORKBENCH_PANEL_PLACEMENTS.bottom
    : fallback;
}

function normalizePanelPlacements(value) {
  const source = isObject(value) ? value : {};
  return Object.entries(DEFAULT_PANEL_PLACEMENTS).reduce((acc, [panelId, fallback]) => {
    acc[panelId] = normalizePanelPlacement(source[panelId], fallback);
    return acc;
  }, {});
}

function getPresetSeed(presetId) {
  return WORKBENCH_LAYOUT_PRESETS[presetId] || WORKBENCH_LAYOUT_PRESETS[DEFAULT_WORKBENCH_LAYOUT.presetId];
}

export function normalizeWorkbenchLayout(layout = {}) {
  const source = isObject(layout) ? layout : {};
  const presetId = normalizePresetId(source.presetId);
  const preset = getPresetSeed(presetId);

  return {
    ...DEFAULT_WORKBENCH_LAYOUT,
    ...source,
    version: WORKBENCH_DOCK_VERSION,
    presetId,
    sidePanelSize: normalizeRegistryId(
      source.sidePanelSize || preset.sidePanelSize,
      SIDE_PANEL_SIZES,
      preset.sidePanelSize,
      SIDE_PANEL_SIZE_ALIASES,
    ),
    bottomPanelSize: normalizeRegistryId(
      source.bottomPanelSize || preset.bottomPanelSize,
      BOTTOM_PANEL_SIZES,
      preset.bottomPanelSize,
      BOTTOM_PANEL_SIZE_ALIASES,
    ),
    bottomPanelPlacement: WORKBENCH_PANEL_PLACEMENTS.bottom,
    panelPlacements: normalizePanelPlacements(source.panelPlacements),
  };
}

export function loadWorkbenchLayoutFromStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return normalizeWorkbenchLayout();
  }

  try {
    const raw = window.localStorage.getItem(WORKBENCH_DOCK_STORAGE_KEY);
    return normalizeWorkbenchLayout(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeWorkbenchLayout();
  }
}

export function saveWorkbenchLayoutToStorage(layout) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      WORKBENCH_DOCK_STORAGE_KEY,
      JSON.stringify(normalizeWorkbenchLayout(layout)),
    );
  } catch {
    // Non-critical: layout preferences should never block editor rendering.
  }
}

export function getSidePanelSize(sizeId) {
  const normalizedId = normalizeRegistryId(
    sizeId,
    SIDE_PANEL_SIZES,
    DEFAULT_WORKBENCH_LAYOUT.sidePanelSize,
    SIDE_PANEL_SIZE_ALIASES,
  );
  return SIDE_PANEL_SIZES[normalizedId];
}

export function getSidePanelSizeOptions() {
  return SIDE_PANEL_SIZE_SEQUENCE.map((sizeId) => getSidePanelSize(sizeId));
}

export function getBottomPanelSize(sizeId) {
  const normalizedId = normalizeRegistryId(
    sizeId,
    BOTTOM_PANEL_SIZES,
    DEFAULT_WORKBENCH_LAYOUT.bottomPanelSize,
    BOTTOM_PANEL_SIZE_ALIASES,
  );
  return BOTTOM_PANEL_SIZES[normalizedId];
}

export function getBottomPanelSizeOptions() {
  return BOTTOM_PANEL_SIZE_SEQUENCE.map((sizeId) => getBottomPanelSize(sizeId));
}

export function getBottomPanelStyle({ compact = false, size } = {}) {
  const panelSize = getBottomPanelSize(size);
  return compact ? panelSize.compactStyle : panelSize.style;
}

export function getWorkbenchLayoutPresetOptions() {
  return Object.values(WORKBENCH_LAYOUT_PRESETS);
}

function getNextSizeId(sequence, currentId, registry, aliases) {
  const normalizedId = normalizeRegistryId(currentId, registry, sequence[0], aliases);
  const currentIndex = sequence.indexOf(normalizedId);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % sequence.length;
  return sequence[nextIndex];
}

export function getNextSidePanelSize(sizeId) {
  return getNextSizeId(
    SIDE_PANEL_SIZE_SEQUENCE,
    sizeId,
    SIDE_PANEL_SIZES,
    SIDE_PANEL_SIZE_ALIASES,
  );
}

export function getNextBottomPanelSize(sizeId) {
  return getNextSizeId(
    BOTTOM_PANEL_SIZE_SEQUENCE,
    sizeId,
    BOTTOM_PANEL_SIZES,
    BOTTOM_PANEL_SIZE_ALIASES,
  );
}

export function setWorkbenchDockSize(layout, dockId, sizeId) {
  const normalized = normalizeWorkbenchLayout(layout);
  if (dockId === WORKBENCH_ZONES.bottomPanel || dockId === "bottom") {
    return normalizeWorkbenchLayout({
      ...normalized,
      presetId: WORKBENCH_CUSTOM_PRESET_ID,
      bottomPanelSize: sizeId,
    });
  }

  return normalizeWorkbenchLayout({
    ...normalized,
    presetId: WORKBENCH_CUSTOM_PRESET_ID,
    sidePanelSize: sizeId,
  });
}

export function cycleWorkbenchDockSize(layout, dockId) {
  const normalized = normalizeWorkbenchLayout(layout);
  if (dockId === WORKBENCH_ZONES.bottomPanel || dockId === "bottom") {
    return setWorkbenchDockSize(
      normalized,
      WORKBENCH_ZONES.bottomPanel,
      getNextBottomPanelSize(normalized.bottomPanelSize),
    );
  }

  return setWorkbenchDockSize(
    normalized,
    WORKBENCH_ZONES.sidePanel,
    getNextSidePanelSize(normalized.sidePanelSize),
  );
}

export function applyWorkbenchLayoutPreset(layout, presetId) {
  const normalizedPresetId = normalizePresetId(presetId);
  const preset = WORKBENCH_LAYOUT_PRESETS[normalizedPresetId];
  if (!preset) return normalizeWorkbenchLayout(layout);

  return normalizeWorkbenchLayout({
    ...layout,
    presetId: normalizedPresetId,
    sidePanelSize: preset.sidePanelSize,
    bottomPanelSize: preset.bottomPanelSize,
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

function getBottomPanelId(panelId, fallback = "terminal") {
  return BOTTOM_PANEL_IDS.includes(panelId) ? panelId : fallback;
}

export function createWorkbenchDockState(state = {}) {
  const bottomTab = getBottomPanelId(state.bottomTab, "terminal");
  return {
    activePanel: state.activePanel || null,
    bottomTab,
    bottomPanelOpen: Boolean(state.bottomPanelOpen),
  };
}

export function openWorkbenchDockPanel(state, panelId, layout) {
  const current = createWorkbenchDockState(state);
  const placement = getWorkbenchPanelPlacement(panelId, layout);

  if (placement === WORKBENCH_PANEL_PLACEMENTS.bottom) {
    return {
      ...current,
      activePanel: null,
      bottomTab: getBottomPanelId(panelId),
      bottomPanelOpen: true,
      dockTarget: WORKBENCH_ZONES.bottomPanel,
      sidebarRequired: false,
    };
  }

  return {
    ...current,
    activePanel: panelId,
    dockTarget: WORKBENCH_ZONES.sidePanel,
    sidebarRequired: true,
  };
}

export function toggleWorkbenchDockPanel(state, panelId, layout) {
  const current = createWorkbenchDockState(state);
  const placement = getWorkbenchPanelPlacement(panelId, layout);

  if (placement === WORKBENCH_PANEL_PLACEMENTS.bottom) {
    const nextBottomTab = getBottomPanelId(panelId);
    const shouldClose = current.bottomPanelOpen && current.bottomTab === nextBottomTab;
    return {
      ...current,
      activePanel: null,
      bottomTab: nextBottomTab,
      bottomPanelOpen: !shouldClose,
      dockTarget: WORKBENCH_ZONES.bottomPanel,
      sidebarRequired: false,
    };
  }

  if (current.activePanel === panelId) {
    return closeWorkbenchSideDock(current);
  }

  return openWorkbenchDockPanel(current, panelId, layout);
}

export function closeWorkbenchBottomDock(state = {}) {
  const current = createWorkbenchDockState(state);
  return {
    ...current,
    bottomPanelOpen: false,
    dockTarget: WORKBENCH_ZONES.bottomPanel,
    sidebarRequired: false,
  };
}

export function closeWorkbenchSideDock(state = {}) {
  const current = createWorkbenchDockState(state);
  return {
    ...current,
    activePanel: null,
    dockTarget: WORKBENCH_ZONES.sidePanel,
    sidebarRequired: false,
  };
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
  const bottomPanelPlacement = bottomPanel
    ? getWorkbenchPanelPlacement(bottomPanel, normalized)
    : null;

  return {
    activityBar: {
      dockId: WORKBENCH_ZONES.activityBar,
      zone: WORKBENCH_ZONES.activityBar,
      side,
      order: side === "right" ? 40 : 0,
      canDrop: false,
      accepts: SIDE_PANEL_IDS,
    },
    sidePanel: {
      dockId: WORKBENCH_ZONES.sidePanel,
      zone: WORKBENCH_ZONES.sidePanel,
      panelId: sidePanelPlacement === WORKBENCH_PANEL_PLACEMENTS.side ? activePanel : null,
      placement: WORKBENCH_PANEL_PLACEMENTS.side,
      side,
      order: side === "right" ? 30 : 5,
      size: normalized.sidePanelSize,
      axis: "horizontal",
      canDrop: true,
      accepts: SIDE_PANEL_IDS,
    },
    editor: {
      dockId: WORKBENCH_ZONES.editor,
      zone: WORKBENCH_ZONES.editor,
      order: 20,
      canDrop: true,
      accepts: ["editor"],
    },
    bottomPanel: {
      dockId: WORKBENCH_ZONES.bottomPanel,
      zone: WORKBENCH_ZONES.bottomPanel,
      panelId: bottomPanelPlacement === WORKBENCH_PANEL_PLACEMENTS.bottom ? bottomPanel : null,
      placement: normalized.bottomPanelPlacement,
      order: 50,
      size: normalized.bottomPanelSize,
      axis: "vertical",
      canDrop: true,
      accepts: BOTTOM_PANEL_IDS,
    },
  };
}
