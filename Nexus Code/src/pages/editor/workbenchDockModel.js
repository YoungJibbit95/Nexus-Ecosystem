export const WORKBENCH_DOCK_STORAGE_KEY_V1 = "nexus-code.workbench-layout.v1";
export const WORKBENCH_DOCK_STORAGE_KEY = "nexus-code.workbench-layout.v2";
export const WORKBENCH_LAYOUT_STORAGE_KEY = WORKBENCH_DOCK_STORAGE_KEY;
export const WORKBENCH_DOCK_LEGACY_STORAGE_KEYS = Object.freeze([
  WORKBENCH_DOCK_STORAGE_KEY_V1,
]);
export const WORKBENCH_DOCK_VERSION = 2;
export const WORKBENCH_CUSTOM_PRESET_ID = "custom";

export const WORKBENCH_SNAP_ZONES = Object.freeze({
  left: "left",
  right: "right",
  bottom: "bottom",
  hidden: "hidden",
});

export const WORKBENCH_ZONES = Object.freeze({
  activityBar: "activity-bar",
  sidePanel: "side-panel",
  editor: "editor",
  bottomPanel: "bottom-panel",
  left: WORKBENCH_SNAP_ZONES.left,
  right: WORKBENCH_SNAP_ZONES.right,
  bottom: WORKBENCH_SNAP_ZONES.bottom,
  hidden: WORKBENCH_SNAP_ZONES.hidden,
});

export const WORKBENCH_PANEL_PLACEMENTS = Object.freeze({
  side: "side",
  bottom: "bottom",
  hidden: "hidden",
});

export const WORKBENCH_PANEL_IDS = Object.freeze([
  "explorer",
  "search",
  "git",
  "issues",
  "prs",
  "projects",
  "extensions",
  "account",
  "debug",
  "problems",
  "terminal",
]);

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

export const DEFAULT_PANEL_ZONES = Object.freeze({
  explorer: WORKBENCH_SNAP_ZONES.left,
  search: WORKBENCH_SNAP_ZONES.left,
  git: WORKBENCH_SNAP_ZONES.left,
  issues: WORKBENCH_SNAP_ZONES.right,
  prs: WORKBENCH_SNAP_ZONES.right,
  projects: WORKBENCH_SNAP_ZONES.right,
  extensions: WORKBENCH_SNAP_ZONES.left,
  account: WORKBENCH_SNAP_ZONES.left,
  debug: WORKBENCH_SNAP_ZONES.left,
  problems: WORKBENCH_SNAP_ZONES.bottom,
  terminal: WORKBENCH_SNAP_ZONES.bottom,
});

function getPlacementForSnapZone(zone) {
  if (zone === WORKBENCH_SNAP_ZONES.bottom) {
    return WORKBENCH_PANEL_PLACEMENTS.bottom;
  }
  if (zone === WORKBENCH_SNAP_ZONES.hidden) {
    return WORKBENCH_PANEL_PLACEMENTS.hidden;
  }
  return WORKBENCH_PANEL_PLACEMENTS.side;
}

function createPanelPlacementsFromZones(panelZones) {
  return WORKBENCH_PANEL_IDS.reduce((acc, panelId) => {
    acc[panelId] = getPlacementForSnapZone(
      panelZones[panelId] || DEFAULT_PANEL_ZONES[panelId],
    );
    return acc;
  }, {});
}

export const DEFAULT_PANEL_PLACEMENTS = Object.freeze(
  createPanelPlacementsFromZones(DEFAULT_PANEL_ZONES),
);

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
  panelZones: DEFAULT_PANEL_ZONES,
  panelPlacements: DEFAULT_PANEL_PLACEMENTS,
});

const SNAP_ZONE_ALIASES = Object.freeze({
  "side-panel": WORKBENCH_SNAP_ZONES.left,
  leftPanel: WORKBENCH_SNAP_ZONES.left,
  leftSidebar: WORKBENCH_SNAP_ZONES.left,
  rightPanel: WORKBENCH_SNAP_ZONES.right,
  rightSidebar: WORKBENCH_SNAP_ZONES.right,
  "bottom-panel": WORKBENCH_SNAP_ZONES.bottom,
  panel: WORKBENCH_SNAP_ZONES.left,
  none: WORKBENCH_SNAP_ZONES.hidden,
  off: WORKBENCH_SNAP_ZONES.hidden,
});

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getStorage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

function hasPanelId(panelId) {
  return WORKBENCH_PANEL_IDS.includes(panelId);
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

function getDefaultSideSnapZone(panelId) {
  return DEFAULT_PANEL_ZONES[panelId] === WORKBENCH_SNAP_ZONES.right
    ? WORKBENCH_SNAP_ZONES.right
    : WORKBENCH_SNAP_ZONES.left;
}

function normalizeSnapZone(value, fallback = WORKBENCH_SNAP_ZONES.left) {
  const resolved = SNAP_ZONE_ALIASES[value] || value;
  if (
    resolved === WORKBENCH_SNAP_ZONES.left ||
    resolved === WORKBENCH_SNAP_ZONES.right ||
    resolved === WORKBENCH_SNAP_ZONES.bottom ||
    resolved === WORKBENCH_SNAP_ZONES.hidden
  ) {
    return resolved;
  }
  return fallback;
}

function normalizePanelZone(panelId, value) {
  const fallback = DEFAULT_PANEL_ZONES[panelId] || WORKBENCH_SNAP_ZONES.left;
  if (value === WORKBENCH_PANEL_PLACEMENTS.side) {
    return getDefaultSideSnapZone(panelId);
  }
  return normalizeSnapZone(value, fallback);
}

function normalizePanelPlacement(value, fallback = WORKBENCH_PANEL_PLACEMENTS.side) {
  if (value === WORKBENCH_PANEL_PLACEMENTS.side) {
    return WORKBENCH_PANEL_PLACEMENTS.side;
  }
  if (value === WORKBENCH_PANEL_PLACEMENTS.bottom) {
    return WORKBENCH_PANEL_PLACEMENTS.bottom;
  }
  if (value === WORKBENCH_PANEL_PLACEMENTS.hidden) {
    return WORKBENCH_PANEL_PLACEMENTS.hidden;
  }
  return fallback;
}

function normalizePanelZones(value, legacyPlacements) {
  const source = isObject(value) ? value : {};
  const placementSource = isObject(legacyPlacements) ? legacyPlacements : {};

  return WORKBENCH_PANEL_IDS.reduce((acc, panelId) => {
    if (Object.prototype.hasOwnProperty.call(source, panelId)) {
      acc[panelId] = normalizePanelZone(panelId, source[panelId]);
      return acc;
    }

    if (Object.prototype.hasOwnProperty.call(placementSource, panelId)) {
      const placement = normalizePanelPlacement(
        placementSource[panelId],
        DEFAULT_PANEL_PLACEMENTS[panelId],
      );
      acc[panelId] = placement === WORKBENCH_PANEL_PLACEMENTS.side
        ? getDefaultSideSnapZone(panelId)
        : normalizePanelZone(panelId, placement);
      return acc;
    }

    acc[panelId] = DEFAULT_PANEL_ZONES[panelId];
    return acc;
  }, {});
}

function getPresetSeed(presetId) {
  return (
    WORKBENCH_LAYOUT_PRESETS[presetId] ||
    WORKBENCH_LAYOUT_PRESETS[DEFAULT_WORKBENCH_LAYOUT.presetId]
  );
}

function getPanelZonesSource(source) {
  if (isObject(source.panelZones)) return source.panelZones;
  if (isObject(source.panelSnapZones)) return source.panelSnapZones;
  if (isObject(source.snapZones)) return source.snapZones;
  return null;
}

export function normalizeWorkbenchLayout(layout = {}) {
  const source = isObject(layout) ? layout : {};
  const presetId = normalizePresetId(source.presetId);
  const preset = getPresetSeed(presetId);
  const panelZones = normalizePanelZones(
    getPanelZonesSource(source),
    source.panelPlacements,
  );

  return {
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
    panelZones,
    panelPlacements: createPanelPlacementsFromZones(panelZones),
  };
}

export function getDefaultWorkbenchLayout() {
  return normalizeWorkbenchLayout();
}

export function resetWorkbenchLayout() {
  return getDefaultWorkbenchLayout();
}

function parseStoredLayout(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readStoredLayout(storage, key) {
  try {
    return parseStoredLayout(storage.getItem(key));
  } catch {
    return null;
  }
}

function persistMigratedWorkbenchLayout(storage, layout) {
  try {
    storage.setItem(WORKBENCH_DOCK_STORAGE_KEY, JSON.stringify(layout));
    for (const legacyKey of WORKBENCH_DOCK_LEGACY_STORAGE_KEYS) {
      storage.removeItem(legacyKey);
    }
  } catch {
    // Non-critical: layout preferences should never block editor rendering.
  }
}

export function loadWorkbenchLayoutFromStorage() {
  const storage = getStorage();
  if (!storage) {
    return normalizeWorkbenchLayout();
  }

  const storedV2 = readStoredLayout(storage, WORKBENCH_DOCK_STORAGE_KEY);
  if (storedV2) {
    return normalizeWorkbenchLayout(storedV2);
  }

  for (const legacyKey of WORKBENCH_DOCK_LEGACY_STORAGE_KEYS) {
    const legacyLayout = readStoredLayout(storage, legacyKey);
    if (legacyLayout) {
      const migrated = normalizeWorkbenchLayout(legacyLayout);
      persistMigratedWorkbenchLayout(storage, migrated);
      return migrated;
    }
  }

  return normalizeWorkbenchLayout();
}

export function saveWorkbenchLayoutToStorage(layout) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(
      WORKBENCH_DOCK_STORAGE_KEY,
      JSON.stringify(normalizeWorkbenchLayout(layout)),
    );
    for (const legacyKey of WORKBENCH_DOCK_LEGACY_STORAGE_KEYS) {
      storage.removeItem(legacyKey);
    }
  } catch {
    // Non-critical: layout preferences should never block editor rendering.
  }
}

export function resetWorkbenchLayoutStorage() {
  const resetLayout = getDefaultWorkbenchLayout();
  const storage = getStorage();
  if (!storage) return resetLayout;

  try {
    storage.removeItem(WORKBENCH_DOCK_STORAGE_KEY);
    for (const legacyKey of WORKBENCH_DOCK_LEGACY_STORAGE_KEYS) {
      storage.removeItem(legacyKey);
    }
  } catch {
    // Reset should still return an in-memory default if storage is unavailable.
  }

  return resetLayout;
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

export function getWorkbenchPanelSnapZone(panelId, layout) {
  if (!hasPanelId(panelId)) return WORKBENCH_SNAP_ZONES.hidden;
  const normalized = normalizeWorkbenchLayout(layout);
  return normalized.panelZones[panelId] || DEFAULT_PANEL_ZONES[panelId];
}

export function setWorkbenchPanelSnapZone(layout, panelId, snapZone) {
  if (!hasPanelId(panelId)) return normalizeWorkbenchLayout(layout);
  const normalized = normalizeWorkbenchLayout(layout);
  const panelZones = {
    ...normalized.panelZones,
    [panelId]: normalizePanelZone(panelId, snapZone),
  };

  return normalizeWorkbenchLayout({
    ...normalized,
    presetId: WORKBENCH_CUSTOM_PRESET_ID,
    panelZones,
  });
}

export function hideWorkbenchPanel(layout, panelId) {
  return setWorkbenchPanelSnapZone(
    layout,
    panelId,
    WORKBENCH_SNAP_ZONES.hidden,
  );
}

export function getWorkbenchPanelPlacement(panelId, layout) {
  return getPlacementForSnapZone(getWorkbenchPanelSnapZone(panelId, layout));
}

export function setWorkbenchPanelPlacement(layout, panelId, placement) {
  if (placement === WORKBENCH_PANEL_PLACEMENTS.bottom) {
    return setWorkbenchPanelSnapZone(layout, panelId, WORKBENCH_SNAP_ZONES.bottom);
  }
  if (placement === WORKBENCH_PANEL_PLACEMENTS.hidden) {
    return setWorkbenchPanelSnapZone(layout, panelId, WORKBENCH_SNAP_ZONES.hidden);
  }
  return setWorkbenchPanelSnapZone(
    layout,
    panelId,
    getDefaultSideSnapZone(panelId),
  );
}

function getPanelIdsForPlacement(layout, placement) {
  const normalized = normalizeWorkbenchLayout(layout);
  return WORKBENCH_PANEL_IDS.filter(
    (panelId) => getPlacementForSnapZone(normalized.panelZones[panelId]) === placement,
  );
}

function getBottomPanelId(panelId, fallback = "terminal") {
  return hasPanelId(panelId) ? panelId : fallback;
}

export function createWorkbenchDockState(state = {}) {
  const bottomTab = getBottomPanelId(state.bottomTab, "terminal");
  return {
    activePanel: hasPanelId(state.activePanel) ? state.activePanel : null,
    bottomTab,
    bottomPanelOpen: Boolean(state.bottomPanelOpen),
  };
}

export function openWorkbenchDockPanel(state, panelId, layout) {
  const current = createWorkbenchDockState(state);
  if (!hasPanelId(panelId)) return current;

  const snapZone = getWorkbenchPanelSnapZone(panelId, layout);
  const placement = getPlacementForSnapZone(snapZone);

  if (placement === WORKBENCH_PANEL_PLACEMENTS.hidden) {
    return {
      ...current,
      activePanel: null,
      dockTarget: WORKBENCH_ZONES.hidden,
      snapZone,
      sidebarRequired: false,
    };
  }

  if (placement === WORKBENCH_PANEL_PLACEMENTS.bottom) {
    return {
      ...current,
      activePanel: null,
      bottomTab: getBottomPanelId(panelId),
      bottomPanelOpen: true,
      dockTarget: WORKBENCH_ZONES.bottomPanel,
      snapZone,
      sidebarRequired: false,
    };
  }

  return {
    ...current,
    activePanel: panelId,
    dockTarget: WORKBENCH_ZONES.sidePanel,
    snapZone,
    sidebarRequired: true,
  };
}

export function toggleWorkbenchDockPanel(state, panelId, layout) {
  const current = createWorkbenchDockState(state);
  if (!hasPanelId(panelId)) return current;

  const snapZone = getWorkbenchPanelSnapZone(panelId, layout);
  const placement = getPlacementForSnapZone(snapZone);

  if (placement === WORKBENCH_PANEL_PLACEMENTS.hidden) {
    return openWorkbenchDockPanel(current, panelId, layout);
  }

  if (placement === WORKBENCH_PANEL_PLACEMENTS.bottom) {
    const nextBottomTab = getBottomPanelId(panelId);
    const shouldClose = current.bottomPanelOpen && current.bottomTab === nextBottomTab;
    return {
      ...current,
      activePanel: null,
      bottomTab: nextBottomTab,
      bottomPanelOpen: !shouldClose,
      dockTarget: WORKBENCH_ZONES.bottomPanel,
      snapZone,
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

function getSideSlotSide(activePanel, fallbackSide, layout) {
  if (!activePanel) return fallbackSide;
  const snapZone = getWorkbenchPanelSnapZone(activePanel, layout);
  if (snapZone === WORKBENCH_SNAP_ZONES.right) {
    return WORKBENCH_SNAP_ZONES.right;
  }
  return WORKBENCH_SNAP_ZONES.left;
}

export function getWorkbenchSlots({
  sidebarSide = "left",
  activePanel = null,
  bottomPanel = null,
  layout,
} = {}) {
  const railSide = sidebarSide === "right" ? "right" : "left";
  const normalized = normalizeWorkbenchLayout(layout);
  const sidePanelSnapZone = activePanel
    ? getWorkbenchPanelSnapZone(activePanel, normalized)
    : null;
  const bottomPanelSnapZone = bottomPanel
    ? getWorkbenchPanelSnapZone(bottomPanel, normalized)
    : null;
  const sidePanelPlacement = activePanel
    ? getPlacementForSnapZone(sidePanelSnapZone)
    : null;
  const bottomPanelPlacement = bottomPanel
    ? getPlacementForSnapZone(bottomPanelSnapZone)
    : null;
  const side = getSideSlotSide(activePanel, railSide, normalized);

  return {
    activityBar: {
      dockId: WORKBENCH_ZONES.activityBar,
      zone: WORKBENCH_ZONES.activityBar,
      side: railSide,
      order: railSide === "right" ? 40 : 0,
      canDrop: false,
      accepts: WORKBENCH_PANEL_IDS.filter(
        (panelId) =>
          getWorkbenchPanelSnapZone(panelId, normalized) !== WORKBENCH_SNAP_ZONES.hidden,
      ),
    },
    sidePanel: {
      dockId: WORKBENCH_ZONES.sidePanel,
      zone: WORKBENCH_ZONES.sidePanel,
      snapZone: sidePanelSnapZone || side,
      panelId: sidePanelPlacement === WORKBENCH_PANEL_PLACEMENTS.side ? activePanel : null,
      placement: WORKBENCH_PANEL_PLACEMENTS.side,
      side,
      order: side === "right" ? 30 : 5,
      size: normalized.sidePanelSize,
      axis: "horizontal",
      canDrop: true,
      accepts: getPanelIdsForPlacement(
        normalized,
        WORKBENCH_PANEL_PLACEMENTS.side,
      ),
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
      snapZone: WORKBENCH_SNAP_ZONES.bottom,
      panelId: bottomPanelPlacement === WORKBENCH_PANEL_PLACEMENTS.bottom ? bottomPanel : null,
      placement: WORKBENCH_PANEL_PLACEMENTS.bottom,
      order: 50,
      size: normalized.bottomPanelSize,
      axis: "vertical",
      canDrop: true,
      accepts: getPanelIdsForPlacement(
        normalized,
        WORKBENCH_PANEL_PLACEMENTS.bottom,
      ),
    },
  };
}
