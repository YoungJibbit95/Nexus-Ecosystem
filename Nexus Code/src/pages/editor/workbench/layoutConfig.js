export const WORKBENCH_DOCK_STORAGE_KEY_V1 = "nexus-code.workbench-layout.v1";
export const WORKBENCH_DOCK_STORAGE_KEY_V2 = "nexus-code.workbench-layout.v2";
export const WORKBENCH_DOCK_STORAGE_KEY = "nexus-code.workbench-layout.v3";
export const WORKBENCH_LAYOUT_STORAGE_KEY = WORKBENCH_DOCK_STORAGE_KEY;
export const WORKBENCH_DOCK_LEGACY_STORAGE_KEYS = Object.freeze([
  WORKBENCH_DOCK_STORAGE_KEY_V2,
  WORKBENCH_DOCK_STORAGE_KEY_V1,
]);
export const WORKBENCH_DOCK_VERSION = 3;
export const WORKBENCH_CUSTOM_PRESET_ID = "custom";

export const WORKBENCH_SNAP_ZONES = Object.freeze({
  left: "left",
  right: "right",
  bottom: "bottom",
  hidden: "hidden",
});

export const WORKBENCH_SIDE_SNAP_ZONES = Object.freeze([
  WORKBENCH_SNAP_ZONES.left,
  WORKBENCH_SNAP_ZONES.right,
]);

export const WORKBENCH_VISIBLE_SNAP_ZONES = Object.freeze([
  WORKBENCH_SNAP_ZONES.left,
  WORKBENCH_SNAP_ZONES.right,
  WORKBENCH_SNAP_ZONES.bottom,
]);

export const WORKBENCH_DOCK_ZONE_SEQUENCE = Object.freeze([
  ...WORKBENCH_VISIBLE_SNAP_ZONES,
  WORKBENCH_SNAP_ZONES.hidden,
]);

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

export const MAX_PANEL_ID_LOOKUP_DEPTH = 8;
export const MAX_PANEL_ID_BUCKET_SCAN = WORKBENCH_PANEL_IDS.length * 4;

export const SIDE_PANEL_SIZE_SEQUENCE = Object.freeze([
  "focus",
  "comfortable",
  "wide",
]);

export const SIDE_PANEL_SIZE_ALIASES = Object.freeze({
  narrow: "focus",
  slim: "focus",
  compact: "comfortable",
  default: "comfortable",
  standard: "wide",
  roomy: "wide",
});

export const SIDE_PANEL_SIZES = Object.freeze({
  focus: Object.freeze({
    id: "focus",
    label: "F",
    title: "Fokus",
    width: "clamp(12.5rem, 14vw, 14.5rem)",
    minWidth: "12.5rem",
    maxWidth: "14.5rem",
    compactWidth: "min(15.5rem, calc(100vw - 3.25rem))",
    style: Object.freeze({
      width: "clamp(12.5rem, 14vw, 14.5rem)",
      flex: "0 0 clamp(12.5rem, 14vw, 14.5rem)",
      minWidth: "12.5rem",
      maxWidth: "14.5rem",
    }),
    compactStyle: Object.freeze({
      width: "min(15.5rem, calc(100vw - 3.25rem))",
      flex: "0 0 min(15.5rem, calc(100vw - 3.25rem))",
      minWidth: "min(11.5rem, calc(100vw - 3.25rem))",
      maxWidth: "calc(100vw - 3.25rem)",
    }),
  }),
  comfortable: Object.freeze({
    id: "comfortable",
    label: "C",
    title: "Comfortable",
    width: "clamp(14rem, 16.5vw, 16.75rem)",
    minWidth: "14rem",
    maxWidth: "16.75rem",
    compactWidth: "min(17rem, calc(100vw - 3.25rem))",
    style: Object.freeze({
      width: "clamp(14rem, 16.5vw, 16.75rem)",
      flex: "0 0 clamp(14rem, 16.5vw, 16.75rem)",
      minWidth: "14rem",
      maxWidth: "16.75rem",
    }),
    compactStyle: Object.freeze({
      width: "min(17rem, calc(100vw - 3.25rem))",
      flex: "0 0 min(17rem, calc(100vw - 3.25rem))",
      minWidth: "min(12rem, calc(100vw - 3.25rem))",
      maxWidth: "calc(100vw - 3.25rem)",
    }),
  }),
  wide: Object.freeze({
    id: "wide",
    label: "W",
    title: "Wide",
    width: "clamp(15.5rem, 19vw, 18.75rem)",
    minWidth: "15.5rem",
    maxWidth: "18.75rem",
    compactWidth: "min(18.5rem, calc(100vw - 3.25rem))",
    style: Object.freeze({
      width: "clamp(15.5rem, 19vw, 18.75rem)",
      flex: "0 0 clamp(15.5rem, 19vw, 18.75rem)",
      minWidth: "15.5rem",
      maxWidth: "18.75rem",
    }),
    compactStyle: Object.freeze({
      width: "min(18.5rem, calc(100vw - 3.25rem))",
      flex: "0 0 min(18.5rem, calc(100vw - 3.25rem))",
      minWidth: "min(12.5rem, calc(100vw - 3.25rem))",
      maxWidth: "calc(100vw - 3.25rem)",
    }),
  }),
});

export const BOTTOM_PANEL_SIZE_SEQUENCE = Object.freeze([
  "focus",
  "comfortable",
  "wide",
]);

export const BOTTOM_PANEL_SIZE_ALIASES = Object.freeze({
  compact: "focus",
  default: "comfortable",
  tall: "wide",
});

export const BOTTOM_PANEL_SIZES = Object.freeze({
  focus: Object.freeze({
    id: "focus",
    label: "F",
    title: "Fokus",
    className: "h-[clamp(9rem,22vh,13.5rem)] shrink-0",
    compactClassName: "h-[clamp(7.5rem,30vh,12rem)] shrink-0",
    style: Object.freeze({
      height: "clamp(9rem, 22vh, 13.5rem)",
      flex: "0 0 clamp(9rem, 22vh, 13.5rem)",
      minHeight: "min(9rem, 32vh)",
      maxHeight: "min(13.5rem, calc(100vh - 7rem))",
    }),
    compactStyle: Object.freeze({
      height: "clamp(7.5rem, 30vh, 12rem)",
      flex: "0 0 clamp(7.5rem, 30vh, 12rem)",
      minHeight: "min(7.5rem, 30vh)",
      maxHeight: "min(12rem, calc(100vh - 6rem))",
    }),
  }),
  comfortable: Object.freeze({
    id: "comfortable",
    label: "C",
    title: "Comfortable",
    className: "h-[clamp(10.5rem,27vh,16.5rem)] shrink-0",
    compactClassName: "h-[clamp(8.5rem,34vh,14rem)] shrink-0",
    style: Object.freeze({
      height: "clamp(10.5rem, 27vh, 16.5rem)",
      flex: "0 0 clamp(10.5rem, 27vh, 16.5rem)",
      minHeight: "min(10.5rem, 36vh)",
      maxHeight: "min(16.5rem, calc(100vh - 7rem))",
    }),
    compactStyle: Object.freeze({
      height: "clamp(8.5rem, 34vh, 14rem)",
      flex: "0 0 clamp(8.5rem, 34vh, 14rem)",
      minHeight: "min(8.5rem, 32vh)",
      maxHeight: "min(14rem, calc(100vh - 6rem))",
    }),
  }),
  wide: Object.freeze({
    id: "wide",
    label: "W",
    title: "Wide",
    className: "h-[clamp(12rem,32vh,20rem)] shrink-0",
    compactClassName: "h-[clamp(9.5rem,38vh,16rem)] shrink-0",
    style: Object.freeze({
      height: "clamp(12rem, 32vh, 20rem)",
      flex: "0 0 clamp(12rem, 32vh, 20rem)",
      minHeight: "min(12rem, 40vh)",
      maxHeight: "min(20rem, calc(100vh - 7rem))",
    }),
    compactStyle: Object.freeze({
      height: "clamp(9.5rem, 38vh, 16rem)",
      flex: "0 0 clamp(9.5rem, 38vh, 16rem)",
      minHeight: "min(9.5rem, 34vh)",
      maxHeight: "min(16rem, calc(100vh - 6rem))",
    }),
  }),
});

export const WORKBENCH_CUSTOM_SIZE_LIMITS = Object.freeze({
  side: Object.freeze({
    min: 200,
    max: 560,
  }),
  bottom: Object.freeze({
    min: 144,
    max: 430,
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

export function getPlacementForSnapZone(zone) {
  if (zone === WORKBENCH_SNAP_ZONES.bottom) {
    return WORKBENCH_PANEL_PLACEMENTS.bottom;
  }
  if (zone === WORKBENCH_SNAP_ZONES.hidden) {
    return WORKBENCH_PANEL_PLACEMENTS.hidden;
  }
  return WORKBENCH_PANEL_PLACEMENTS.side;
}

export function createPanelPlacementsFromZones(panelZones) {
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

export function createEmptyZonePanelIds() {
  return WORKBENCH_DOCK_ZONE_SEQUENCE.reduce((acc, zone) => {
    acc[zone] = [];
    return acc;
  }, {});
}

export function cloneZonePanelIds(zonePanelIds) {
  return WORKBENCH_DOCK_ZONE_SEQUENCE.reduce((acc, zone) => {
    acc[zone] = [...(zonePanelIds?.[zone] || [])];
    return acc;
  }, {});
}

export function freezeZonePanelIds(zonePanelIds) {
  return Object.freeze(
    WORKBENCH_DOCK_ZONE_SEQUENCE.reduce((acc, zone) => {
      acc[zone] = Object.freeze([...(zonePanelIds[zone] || [])]);
      return acc;
    }, {}),
  );
}

export function createZonePanelIdsFromZones(panelZones) {
  const zonePanelIds = createEmptyZonePanelIds();
  for (const panelId of WORKBENCH_PANEL_IDS) {
    const zone = panelZones[panelId] || DEFAULT_PANEL_ZONES[panelId];
    zonePanelIds[zone].push(panelId);
  }
  return zonePanelIds;
}

export const DEFAULT_ZONE_PANEL_IDS = freezeZonePanelIds(
  createZonePanelIdsFromZones(DEFAULT_PANEL_ZONES),
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

export const WORKBENCH_PRESET_ALIASES = Object.freeze({
  compact: "focus",
  balanced: "comfortable",
  roomy: "wide",
});

export const WORKBENCH_RESPONSIVE_LAYOUT_LIMITS = Object.freeze({
  compactWidth: 720,
  narrowWidth: 980,
  shortHeight: 560,
  roomyHeight: 720,
});

export const DEFAULT_WORKBENCH_LAYOUT = Object.freeze({
  version: WORKBENCH_DOCK_VERSION,
  presetId: "comfortable",
  sidePanelSize: "comfortable",
  bottomPanelSize: "comfortable",
  customSidePanelWidth: null,
  customBottomPanelHeight: null,
  bottomPanelPlacement: WORKBENCH_PANEL_PLACEMENTS.bottom,
  panelZones: DEFAULT_PANEL_ZONES,
  zonePanelIds: DEFAULT_ZONE_PANEL_IDS,
  panelPlacements: DEFAULT_PANEL_PLACEMENTS,
});

export const SNAP_ZONE_ALIASES = Object.freeze({
  side: WORKBENCH_SNAP_ZONES.left,
  "side-panel": WORKBENCH_SNAP_ZONES.left,
  sidePanel: WORKBENCH_SNAP_ZONES.left,
  sidepanel: WORKBENCH_SNAP_ZONES.left,
  sidebar: WORKBENCH_SNAP_ZONES.left,
  "dock-left": WORKBENCH_SNAP_ZONES.left,
  "left-panel": WORKBENCH_SNAP_ZONES.left,
  "left-sidebar": WORKBENCH_SNAP_ZONES.left,
  leftPanel: WORKBENCH_SNAP_ZONES.left,
  leftpanel: WORKBENCH_SNAP_ZONES.left,
  leftSidebar: WORKBENCH_SNAP_ZONES.left,
  leftsidebar: WORKBENCH_SNAP_ZONES.left,
  "dock-right": WORKBENCH_SNAP_ZONES.right,
  "right-panel": WORKBENCH_SNAP_ZONES.right,
  "right-sidebar": WORKBENCH_SNAP_ZONES.right,
  rightPanel: WORKBENCH_SNAP_ZONES.right,
  rightpanel: WORKBENCH_SNAP_ZONES.right,
  rightSidebar: WORKBENCH_SNAP_ZONES.right,
  rightsidebar: WORKBENCH_SNAP_ZONES.right,
  "dock-bottom": WORKBENCH_SNAP_ZONES.bottom,
  "bottom-dock": WORKBENCH_SNAP_ZONES.bottom,
  "bottom-panel": WORKBENCH_SNAP_ZONES.bottom,
  "panel-bottom": WORKBENCH_SNAP_ZONES.bottom,
  bottomDock: WORKBENCH_SNAP_ZONES.bottom,
  bottomdock: WORKBENCH_SNAP_ZONES.bottom,
  bottomPanel: WORKBENCH_SNAP_ZONES.bottom,
  bottompanel: WORKBENCH_SNAP_ZONES.bottom,
  panel: WORKBENCH_SNAP_ZONES.left,
  hide: WORKBENCH_SNAP_ZONES.hidden,
  hidden: WORKBENCH_SNAP_ZONES.hidden,
  none: WORKBENCH_SNAP_ZONES.hidden,
  off: WORKBENCH_SNAP_ZONES.hidden,
});

export function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function hasPanelId(panelId) {
  return WORKBENCH_PANEL_IDS.includes(panelId);
}

export function normalizePanelId(panelId, fallback = null) {
  const normalized =
    typeof panelId === "string" ? panelId.trim().toLowerCase() : panelId;
  return hasPanelId(normalized) ? normalized : fallback;
}

export function normalizeLookupValue(value) {
  return typeof value === "string" ? value.trim() : value;
}

export function getAliasValue(value, aliases) {
  const normalized = normalizeLookupValue(value);
  if (Object.prototype.hasOwnProperty.call(aliases, normalized)) {
    return aliases[normalized];
  }
  if (typeof normalized !== "string") return normalized;

  const lower = normalized.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(aliases, lower)) {
    return aliases[lower];
  }

  const dashed = lower.replace(/[\s_]+/g, "-");
  if (Object.prototype.hasOwnProperty.call(aliases, dashed)) {
    return aliases[dashed];
  }

  return lower;
}

export function normalizeRegistryId(value, registry, fallback, aliases = {}) {
  const resolved = getAliasValue(value, aliases);
  return Object.prototype.hasOwnProperty.call(registry, resolved)
    ? resolved
    : fallback;
}

export function normalizePresetId(value) {
  if (normalizeLookupValue(value)?.toLowerCase?.() === WORKBENCH_CUSTOM_PRESET_ID) {
    return WORKBENCH_CUSTOM_PRESET_ID;
  }
  return normalizeRegistryId(
    value,
    WORKBENCH_LAYOUT_PRESETS,
    DEFAULT_WORKBENCH_LAYOUT.presetId,
    WORKBENCH_PRESET_ALIASES,
  );
}

export function isWorkbenchSnapZone(value) {
  return WORKBENCH_DOCK_ZONE_SEQUENCE.includes(value);
}

export function isSideWorkbenchSnapZone(value) {
  return WORKBENCH_SIDE_SNAP_ZONES.includes(value);
}

export function isVisibleWorkbenchSnapZone(value) {
  return WORKBENCH_VISIBLE_SNAP_ZONES.includes(value);
}

export function normalizeSnapZone(value, fallback = WORKBENCH_SNAP_ZONES.left) {
  const resolved = getAliasValue(value, SNAP_ZONE_ALIASES);
  return isWorkbenchSnapZone(resolved) ? resolved : fallback;
}

export function getDefaultSideSnapZone(panelId) {
  return DEFAULT_PANEL_ZONES[panelId] === WORKBENCH_SNAP_ZONES.right
    ? WORKBENCH_SNAP_ZONES.right
    : WORKBENCH_SNAP_ZONES.left;
}

export function normalizePanelZone(panelId, value) {
  const fallback = DEFAULT_PANEL_ZONES[panelId] || WORKBENCH_SNAP_ZONES.left;
  if (normalizeLookupValue(value)?.toLowerCase?.() === WORKBENCH_PANEL_PLACEMENTS.side) {
    return getDefaultSideSnapZone(panelId);
  }
  return normalizeSnapZone(value, fallback);
}

export function getDropTargetSnapZone(panelId, value, fallback = null) {
  if (normalizeLookupValue(value)?.toLowerCase?.() === WORKBENCH_PANEL_PLACEMENTS.side) {
    return getDefaultSideSnapZone(panelId);
  }
  return normalizeSnapZone(value, fallback);
}

export function normalizePanelPlacement(
  value,
  fallback = WORKBENCH_PANEL_PLACEMENTS.side,
) {
  const normalized = normalizeLookupValue(value)?.toLowerCase?.();
  if (normalized === WORKBENCH_PANEL_PLACEMENTS.side) {
    return WORKBENCH_PANEL_PLACEMENTS.side;
  }
  if (normalized === WORKBENCH_PANEL_PLACEMENTS.bottom) {
    return WORKBENCH_PANEL_PLACEMENTS.bottom;
  }
  if (normalized === WORKBENCH_PANEL_PLACEMENTS.hidden) {
    return WORKBENCH_PANEL_PLACEMENTS.hidden;
  }
  const snapZone = normalizeSnapZone(value, null);
  if (snapZone === WORKBENCH_SNAP_ZONES.bottom) {
    return WORKBENCH_PANEL_PLACEMENTS.bottom;
  }
  if (snapZone === WORKBENCH_SNAP_ZONES.hidden) {
    return WORKBENCH_PANEL_PLACEMENTS.hidden;
  }
  if (isSideWorkbenchSnapZone(snapZone)) {
    return WORKBENCH_PANEL_PLACEMENTS.side;
  }
  return fallback;
}

export function normalizeCustomPixelSize(value, limits) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
  return Math.round(Math.max(limits.min, Math.min(limits.max, numberValue)));
}
