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

export const WORKBENCH_DOCK_ZONE_SEQUENCE = Object.freeze([
  WORKBENCH_SNAP_ZONES.left,
  WORKBENCH_SNAP_ZONES.right,
  WORKBENCH_SNAP_ZONES.bottom,
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

export const SIDE_PANEL_SIZE_SEQUENCE = Object.freeze([
  "focus",
  "comfortable",
  "wide",
]);

const SIDE_PANEL_SIZE_ALIASES = Object.freeze({
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
  }),
  comfortable: Object.freeze({
    id: "comfortable",
    label: "C",
    title: "Comfortable",
    width: "clamp(14rem, 16.5vw, 16.75rem)",
    minWidth: "14rem",
    maxWidth: "16.75rem",
    compactWidth: "min(17rem, calc(100vw - 3.25rem))",
  }),
  wide: Object.freeze({
    id: "wide",
    label: "W",
    title: "Wide",
    width: "clamp(15.5rem, 19vw, 18.75rem)",
    minWidth: "15.5rem",
    maxWidth: "18.75rem",
    compactWidth: "min(18.5rem, calc(100vw - 3.25rem))",
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
    className: "h-[clamp(9.5rem,22vh,13.5rem)] shrink-0",
    compactClassName: "h-[min(12.5rem,34vh)] shrink-0",
    style: Object.freeze({
      flex: "0 0 clamp(9.5rem, 22vh, 13.5rem)",
      minHeight: "9.5rem",
      maxHeight: "13.5rem",
    }),
    compactStyle: Object.freeze({
      flex: "0 0 min(12.5rem, 34vh)",
      minHeight: "9rem",
      maxHeight: "12.5rem",
    }),
  }),
  comfortable: Object.freeze({
    id: "comfortable",
    label: "C",
    title: "Comfortable",
    className: "h-[clamp(11.5rem,27vh,16.5rem)] shrink-0",
    compactClassName: "h-[min(15rem,40vh)] shrink-0",
    style: Object.freeze({
      flex: "0 0 clamp(11.5rem, 27vh, 16.5rem)",
      minHeight: "11.5rem",
      maxHeight: "16.5rem",
    }),
    compactStyle: Object.freeze({
      flex: "0 0 min(15rem, 40vh)",
      minHeight: "10.5rem",
      maxHeight: "15rem",
    }),
  }),
  wide: Object.freeze({
    id: "wide",
    label: "W",
    title: "Wide",
    className: "h-[clamp(13.25rem,32vh,20rem)] shrink-0",
    compactClassName: "h-[min(17.25rem,46vh)] shrink-0",
    style: Object.freeze({
      flex: "0 0 clamp(13.25rem, 32vh, 20rem)",
      minHeight: "13.25rem",
      maxHeight: "20rem",
    }),
    compactStyle: Object.freeze({
      flex: "0 0 min(17.25rem, 46vh)",
      minHeight: "12rem",
      maxHeight: "17.25rem",
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

function createEmptyZonePanelIds() {
  return WORKBENCH_DOCK_ZONE_SEQUENCE.reduce((acc, zone) => {
    acc[zone] = [];
    return acc;
  }, {});
}

function freezeZonePanelIds(zonePanelIds) {
  return Object.freeze(
    WORKBENCH_DOCK_ZONE_SEQUENCE.reduce((acc, zone) => {
      acc[zone] = Object.freeze([...(zonePanelIds[zone] || [])]);
      return acc;
    }, {}),
  );
}

function createZonePanelIdsFromZones(panelZones) {
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
  zonePanelIds: DEFAULT_ZONE_PANEL_IDS,
  panelPlacements: DEFAULT_PANEL_PLACEMENTS,
});

const SNAP_ZONE_ALIASES = Object.freeze({
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

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

function hasPanelId(panelId) {
  return WORKBENCH_PANEL_IDS.includes(panelId);
}

function normalizePanelId(panelId, fallback = null) {
  const normalized =
    typeof panelId === "string" ? panelId.trim().toLowerCase() : panelId;
  return hasPanelId(normalized) ? normalized : fallback;
}

function normalizeLookupValue(value) {
  return typeof value === "string" ? value.trim() : value;
}

function getAliasValue(value, aliases) {
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

function normalizeRegistryId(value, registry, fallback, aliases = {}) {
  const resolved = getAliasValue(value, aliases);
  return Object.prototype.hasOwnProperty.call(registry, resolved)
    ? resolved
    : fallback;
}

function normalizePresetId(value) {
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

function getDefaultSideSnapZone(panelId) {
  return DEFAULT_PANEL_ZONES[panelId] === WORKBENCH_SNAP_ZONES.right
    ? WORKBENCH_SNAP_ZONES.right
    : WORKBENCH_SNAP_ZONES.left;
}

function normalizeSnapZone(value, fallback = WORKBENCH_SNAP_ZONES.left) {
  const resolved = getAliasValue(value, SNAP_ZONE_ALIASES);
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
  if (normalizeLookupValue(value)?.toLowerCase?.() === WORKBENCH_PANEL_PLACEMENTS.side) {
    return getDefaultSideSnapZone(panelId);
  }
  return normalizeSnapZone(value, fallback);
}

function getDropTargetSnapZone(panelId, value, fallback = null) {
  if (normalizeLookupValue(value)?.toLowerCase?.() === WORKBENCH_PANEL_PLACEMENTS.side) {
    return getDefaultSideSnapZone(panelId);
  }
  return normalizeSnapZone(value, fallback);
}

function normalizePanelPlacement(value, fallback = WORKBENCH_PANEL_PLACEMENTS.side) {
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
  if (snapZone === WORKBENCH_SNAP_ZONES.left || snapZone === WORKBENCH_SNAP_ZONES.right) {
    return WORKBENCH_PANEL_PLACEMENTS.side;
  }
  return fallback;
}

function getPanelIdsFromUnknown(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => getPanelIdsFromUnknown(item));
  }
  const panelId = normalizePanelId(value);
  if (panelId) return [panelId];
  return [];
}

function getPanelIdsFromZoneBucket(bucket) {
  if (Array.isArray(bucket) || typeof bucket === "string") {
    return getPanelIdsFromUnknown(bucket);
  }
  if (!isObject(bucket)) return [];

  const knownFields = [
    bucket.panelIds,
    bucket.panels,
    bucket.items,
    bucket.ids,
    bucket.panelId,
    bucket.id,
  ];
  const fieldPanelIds = knownFields.flatMap((field) => getPanelIdsFromUnknown(field));
  if (fieldPanelIds.length > 0) return fieldPanelIds;

  return Object.entries(bucket)
    .filter(([, enabled]) => enabled === true || isObject(enabled))
    .flatMap(([key]) => getPanelIdsFromUnknown(key));
}

function isZoneBucketSource(value) {
  if (!isObject(value)) return false;
  return Object.entries(value).some(([zone, bucket]) => {
    const normalizedZone = normalizeSnapZone(zone, null);
    return Boolean(
      normalizedZone &&
      (Array.isArray(bucket) || isObject(bucket) || typeof bucket === "string")
    );
  });
}

function getPanelZoneMapSource(source) {
  const candidates = [
    source.panelZones,
    source.panelSnapZones,
    source.snapZones,
  ];
  return candidates.find(
    (candidate) => isObject(candidate) && !isZoneBucketSource(candidate),
  ) || null;
}

function getZonePanelIdsSource(source) {
  const candidates = [
    source.zonePanelIds,
    source.panelIdsByZone,
    source.panelsByZone,
    source.zones,
    source.panelZones,
    source.panelSnapZones,
    source.snapZones,
  ];
  return candidates.find(isZoneBucketSource) || null;
}

function getPanelValue(source, panelId) {
  if (!isObject(source)) return { found: false, value: undefined };
  if (Object.prototype.hasOwnProperty.call(source, panelId)) {
    return { found: true, value: source[panelId] };
  }

  for (const [key, value] of Object.entries(source)) {
    if (normalizePanelId(key) === panelId) {
      return { found: true, value };
    }
  }

  return { found: false, value: undefined };
}

function normalizePanelZones(value, legacyPlacements) {
  const source = isObject(value) ? value : {};
  const placementSource = isObject(legacyPlacements) ? legacyPlacements : {};

  return WORKBENCH_PANEL_IDS.reduce((acc, panelId) => {
    const zoneValue = getPanelValue(source, panelId);
    if (zoneValue.found) {
      acc[panelId] = normalizePanelZone(panelId, zoneValue.value);
      return acc;
    }

    const placementValue = getPanelValue(placementSource, panelId);
    if (placementValue.found) {
      const placement = normalizePanelPlacement(
        placementValue.value,
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

function addPanelIdToZone(zonePanelIds, zone, panelId, seenPanelIds) {
  const normalizedPanelId = normalizePanelId(panelId);
  if (!normalizedPanelId || seenPanelIds.has(normalizedPanelId)) return;
  zonePanelIds[zone].push(normalizedPanelId);
  seenPanelIds.add(normalizedPanelId);
}

function getZoneBucketsBySnapZone(value) {
  const bucketsByZone = createEmptyZonePanelIds();
  if (!isObject(value)) return bucketsByZone;

  for (const [rawZone, bucket] of Object.entries(value)) {
    const zone = normalizeSnapZone(rawZone, null);
    if (!zone) continue;
    bucketsByZone[zone].push(...getPanelIdsFromZoneBucket(bucket));
  }

  return bucketsByZone;
}

function normalizeZonePanelIds(value, panelZones) {
  const zonePanelIds = createEmptyZonePanelIds();
  const seenPanelIds = new Set();
  const bucketsByZone = getZoneBucketsBySnapZone(value);

  for (const zone of WORKBENCH_DOCK_ZONE_SEQUENCE) {
    for (const panelId of bucketsByZone[zone]) {
      addPanelIdToZone(zonePanelIds, zone, panelId, seenPanelIds);
    }
  }

  for (const panelId of WORKBENCH_PANEL_IDS) {
    const zone = panelZones[panelId] || DEFAULT_PANEL_ZONES[panelId];
    addPanelIdToZone(zonePanelIds, zone, panelId, seenPanelIds);
  }

  return zonePanelIds;
}

function createPanelZonesFromZonePanelIds(zonePanelIds) {
  return WORKBENCH_DOCK_ZONE_SEQUENCE.reduce((acc, zone) => {
    for (const panelId of zonePanelIds[zone] || []) {
      if (hasPanelId(panelId)) {
        acc[panelId] = zone;
      }
    }
    return acc;
  }, {});
}

function normalizePanelLayout(source) {
  const panelZones = normalizePanelZones(
    getPanelZoneMapSource(source),
    source.panelPlacements,
  );
  const zonePanelIds = normalizeZonePanelIds(
    getZonePanelIdsSource(source),
    panelZones,
  );

  return {
    panelZones: createPanelZonesFromZonePanelIds(zonePanelIds),
    zonePanelIds,
  };
}

function getPresetSeed(presetId) {
  return (
    WORKBENCH_LAYOUT_PRESETS[presetId] ||
    WORKBENCH_LAYOUT_PRESETS[DEFAULT_WORKBENCH_LAYOUT.presetId]
  );
}

export function normalizeWorkbenchLayout(layout = {}) {
  try {
    const source = isObject(layout) ? layout : {};
    const presetId = normalizePresetId(source.presetId);
    const preset = getPresetSeed(presetId);
    const { panelZones, zonePanelIds } = normalizePanelLayout(source);

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
      zonePanelIds,
      panelPlacements: createPanelPlacementsFromZones(panelZones),
    };
  } catch {
    return {
      ...DEFAULT_WORKBENCH_LAYOUT,
      panelZones: { ...DEFAULT_WORKBENCH_LAYOUT.panelZones },
      zonePanelIds: cloneZonePanelIds(DEFAULT_WORKBENCH_LAYOUT.zonePanelIds),
      panelPlacements: { ...DEFAULT_WORKBENCH_LAYOUT.panelPlacements },
    };
  }
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
  return compact
    ? panelSize.compactStyle || panelSize.style
    : panelSize.style || panelSize.compactStyle;
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
  const normalizedPanelId = normalizePanelId(panelId);
  if (!normalizedPanelId) return WORKBENCH_SNAP_ZONES.hidden;
  const normalized = normalizeWorkbenchLayout(layout);
  return normalized.panelZones[normalizedPanelId] || DEFAULT_PANEL_ZONES[normalizedPanelId];
}

function cloneZonePanelIds(zonePanelIds) {
  return WORKBENCH_DOCK_ZONE_SEQUENCE.reduce((acc, zone) => {
    acc[zone] = [...(zonePanelIds[zone] || [])];
    return acc;
  }, {});
}

function clampInsertIndex(index, length) {
  if (!Number.isFinite(index)) return length;
  return Math.max(0, Math.min(Math.trunc(index), length));
}

function insertPanelId(panelIds, panelId, options = {}) {
  const withoutPanel = panelIds.filter((candidateId) => candidateId !== panelId);
  let insertIndex = withoutPanel.length;
  const beforePanelId = normalizePanelId(options.beforePanelId);
  const afterPanelId = normalizePanelId(options.afterPanelId);

  if (beforePanelId) {
    const beforeIndex = withoutPanel.indexOf(beforePanelId);
    if (beforeIndex !== -1) insertIndex = beforeIndex;
  } else if (afterPanelId) {
    const afterIndex = withoutPanel.indexOf(afterPanelId);
    if (afterIndex !== -1) insertIndex = afterIndex + 1;
  } else if (options.index !== undefined) {
    insertIndex = clampInsertIndex(Number(options.index), withoutPanel.length);
  }

  return [
    ...withoutPanel.slice(0, insertIndex),
    panelId,
    ...withoutPanel.slice(insertIndex),
  ];
}

export function getWorkbenchZonePanelIds(layout, snapZone) {
  const normalized = normalizeWorkbenchLayout(layout);
  if (snapZone === WORKBENCH_PANEL_PLACEMENTS.side) {
    return [
      ...normalized.zonePanelIds[WORKBENCH_SNAP_ZONES.left],
      ...normalized.zonePanelIds[WORKBENCH_SNAP_ZONES.right],
    ];
  }

  const zone = normalizeSnapZone(snapZone, null);
  if (!zone) return [];
  return [...(normalized.zonePanelIds[zone] || [])];
}

export function movePanelToZone(layout, panelId, snapZone, options = {}) {
  const normalized = normalizeWorkbenchLayout(layout);
  const normalizedPanelId = normalizePanelId(panelId);
  if (!normalizedPanelId) return normalized;

  const currentZone =
    normalized.panelZones[normalizedPanelId] || DEFAULT_PANEL_ZONES[normalizedPanelId];
  const targetZone = getDropTargetSnapZone(normalizedPanelId, snapZone, null);
  if (!targetZone) return normalized;
  const originalZonePanelIds = cloneZonePanelIds(normalized.zonePanelIds);
  const zonePanelIds = cloneZonePanelIds(normalized.zonePanelIds);
  const beforePanelId = normalizePanelId(options.beforePanelId);
  const afterPanelId = normalizePanelId(options.afterPanelId);
  const insertOptions = { ...options };

  if (
    targetZone === currentZone &&
    (beforePanelId === normalizedPanelId || afterPanelId === normalizedPanelId)
  ) {
    insertOptions.index = originalZonePanelIds[targetZone].indexOf(normalizedPanelId);
    delete insertOptions.beforePanelId;
    delete insertOptions.afterPanelId;
  }

  for (const zone of WORKBENCH_DOCK_ZONE_SEQUENCE) {
    zonePanelIds[zone] = zonePanelIds[zone].filter(
      (candidateId) => candidateId !== normalizedPanelId,
    );
  }

  zonePanelIds[targetZone] = insertPanelId(
    zonePanelIds[targetZone] || [],
    normalizedPanelId,
    insertOptions,
  );

  return normalizeWorkbenchLayout({
    ...normalized,
    presetId: WORKBENCH_CUSTOM_PRESET_ID,
    zonePanelIds,
  });
}

function normalizeDropRequest(panelOrRequest, snapZone, options = {}) {
  if (isObject(panelOrRequest)) {
    return {
      ...panelOrRequest,
      snapZone:
        panelOrRequest.snapZone ||
        panelOrRequest.targetZone ||
        panelOrRequest.zone,
    };
  }
  return {
    ...options,
    panelId: panelOrRequest,
    snapZone,
  };
}

export function getLayoutDropPreview(
  layout,
  panelOrRequest,
  snapZone,
  options = {},
) {
  const normalized = normalizeWorkbenchLayout(layout);
  const request = normalizeDropRequest(panelOrRequest, snapZone, options);
  const panelId = normalizePanelId(request.panelId);

  if (!panelId) {
    return {
      canDrop: false,
      reason: "invalid-panel",
      layout: normalized,
    };
  }

  const sourceZone = normalized.panelZones[panelId] || DEFAULT_PANEL_ZONES[panelId];
  const targetZone = getDropTargetSnapZone(panelId, request.snapZone, null);

  if (!targetZone) {
    return {
      canDrop: false,
      reason: "invalid-zone",
      panelId,
      sourceZone,
      layout: normalized,
    };
  }

  const previewLayout = movePanelToZone(normalized, panelId, targetZone, request);
  const targetPanelIds = getWorkbenchZonePanelIds(previewLayout, targetZone);

  return {
    canDrop: true,
    panelId,
    sourceZone,
    targetZone,
    sourcePlacement: getPlacementForSnapZone(sourceZone),
    targetPlacement: getPlacementForSnapZone(targetZone),
    insertIndex: targetPanelIds.indexOf(panelId),
    isMove: sourceZone !== targetZone,
    layout: previewLayout,
    zonePanelIds: previewLayout.zonePanelIds,
    targetPanelIds,
  };
}

export function setWorkbenchPanelSnapZone(layout, panelId, snapZone) {
  return movePanelToZone(layout, panelId, snapZone);
}

export function hideWorkbenchPanel(layout, panelId) {
  return setWorkbenchPanelSnapZone(
    layout,
    panelId,
    WORKBENCH_SNAP_ZONES.hidden,
  );
}

export function getWorkbenchPanelPlacement(panelId, layout) {
  return getPlacementForSnapZone(getWorkbenchPanelSnapZone(normalizePanelId(panelId), layout));
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
  return WORKBENCH_DOCK_ZONE_SEQUENCE.flatMap((zone) => {
    if (getPlacementForSnapZone(zone) !== placement) return [];
    return normalized.zonePanelIds[zone] || [];
  });
}

function getVisibleSnapZones(snapZone) {
  if (!snapZone) {
    return [
      WORKBENCH_SNAP_ZONES.left,
      WORKBENCH_SNAP_ZONES.right,
      WORKBENCH_SNAP_ZONES.bottom,
    ];
  }
  if (snapZone === WORKBENCH_PANEL_PLACEMENTS.side) {
    return [
      WORKBENCH_SNAP_ZONES.left,
      WORKBENCH_SNAP_ZONES.right,
    ];
  }

  const normalizedZone = normalizeSnapZone(snapZone, null);
  if (!normalizedZone || normalizedZone === WORKBENCH_SNAP_ZONES.hidden) {
    return [];
  }
  return [normalizedZone];
}

function getFirstPanelIdInZones(layout, zones) {
  for (const zone of zones) {
    const panelId = getWorkbenchZonePanelIds(layout, zone)[0];
    if (panelId) return panelId;
  }
  return null;
}

function isPanelInZones(panelId, layout, zones) {
  if (!hasPanelId(panelId)) return false;
  const zone = getWorkbenchPanelSnapZone(panelId, layout);
  return zones.includes(zone);
}

function uniquePanelIds(panelIds) {
  const seen = new Set();
  return panelIds.filter((panelId) => {
    if (!hasPanelId(panelId) || seen.has(panelId)) return false;
    seen.add(panelId);
    return true;
  });
}

function normalizeFocusDirection(direction) {
  if (typeof direction === "number") {
    if (direction > 0) return 1;
    if (direction < 0) return -1;
    return 0;
  }

  const normalized = typeof direction === "string"
    ? direction.trim().toLowerCase()
    : "";
  if (["next", "forward", "after", "right", "down"].includes(normalized)) {
    return 1;
  }
  if (["previous", "prev", "back", "backward", "before", "left", "up"].includes(normalized)) {
    return -1;
  }
  return 0;
}

function getDockTargetForPlacement(placement) {
  if (placement === WORKBENCH_PANEL_PLACEMENTS.bottom) {
    return WORKBENCH_ZONES.bottomPanel;
  }
  if (placement === WORKBENCH_PANEL_PLACEMENTS.hidden) {
    return WORKBENCH_ZONES.hidden;
  }
  return WORKBENCH_ZONES.sidePanel;
}

export function getFocusableWorkbenchPanelIds(layout, snapZone = null) {
  const normalized = normalizeWorkbenchLayout(layout);
  const zones = getVisibleSnapZones(snapZone);
  if (!zones.length) return [];

  return uniquePanelIds(
    zones.flatMap((zone) => normalized.zonePanelIds[zone] || []),
  );
}

export function getNextFocusableWorkbenchPanelId({
  layout,
  panelId = null,
  snapZone = null,
  direction = 1,
  wrap = true,
  fallback = null,
} = {}) {
  const panelIds = getFocusableWorkbenchPanelIds(layout, snapZone);
  if (!panelIds.length) return null;

  const normalizedPanelId = normalizePanelId(panelId);
  const normalizedFallback = normalizePanelId(fallback);
  const currentIndex = normalizedPanelId
    ? panelIds.indexOf(normalizedPanelId)
    : -1;

  if (currentIndex === -1) {
    return normalizedFallback && panelIds.includes(normalizedFallback)
      ? normalizedFallback
      : panelIds[0];
  }

  const step = normalizeFocusDirection(direction) || 1;
  const nextIndex = currentIndex + step;
  if (nextIndex >= 0 && nextIndex < panelIds.length) {
    return panelIds[nextIndex];
  }

  if (!wrap) return normalizedPanelId;
  return panelIds[(nextIndex + panelIds.length) % panelIds.length];
}

export function getVisiblePanelId({
  layout,
  panelId = null,
  activePanel = null,
  bottomPanel = null,
  bottomTab = null,
  bottomPanelOpen = false,
  snapZone = null,
  fallback = "explorer",
  defaultToFirst = true,
} = {}) {
  const normalized = normalizeWorkbenchLayout(layout);
  const visibleZones = getVisibleSnapZones(snapZone);
  if (!visibleZones.length) return null;

  const candidates = [
    panelId,
    activePanel,
    bottomPanelOpen ? bottomPanel || bottomTab : null,
    fallback,
  ];

  for (const candidateId of candidates) {
    if (isPanelInZones(candidateId, normalized, visibleZones)) {
      return candidateId;
    }
  }

  return defaultToFirst ? getFirstPanelIdInZones(normalized, visibleZones) : null;
}

export function getWorkbenchPanelFocusTarget({
  layout,
  state = {},
  panelId = null,
  snapZone = null,
  direction = 0,
  wrap = true,
  fallback = "explorer",
} = {}) {
  const normalized = normalizeWorkbenchLayout(layout);
  const safeState = isObject(state) ? state : {};
  const currentState = createWorkbenchDockState(safeState, normalized);
  const focusDirection = normalizeFocusDirection(direction);
  const focusablePanelIds = getFocusableWorkbenchPanelIds(normalized, snapZone);
  const visiblePanelRequest = {
    layout: normalized,
    activePanel: currentState.activePanel,
    bottomPanel: safeState.bottomPanel || currentState.bottomTab,
    bottomTab: currentState.bottomTab,
    bottomPanelOpen: currentState.bottomPanelOpen,
    snapZone,
    fallback,
  };
  let targetPanelId = normalizePanelId(panelId);

  if (focusDirection) {
    const currentPanelId = targetPanelId || getVisiblePanelId({
      ...visiblePanelRequest,
      defaultToFirst: false,
    });
    targetPanelId = getNextFocusableWorkbenchPanelId({
      layout: normalized,
      panelId: currentPanelId,
      snapZone,
      direction: focusDirection,
      wrap,
      fallback,
    });
  } else if (!targetPanelId) {
    targetPanelId = getVisiblePanelId({
      ...visiblePanelRequest,
      defaultToFirst: true,
    });
  }

  if (!targetPanelId) {
    return {
      canFocus: false,
      reason: "no-focusable-panel",
      panelId: null,
      snapZone: null,
      placement: null,
      dockTarget: null,
      sidebarRequired: false,
      state: currentState,
      panelIds: focusablePanelIds,
      layout: normalized,
    };
  }

  const targetSnapZone = getWorkbenchPanelSnapZone(targetPanelId, normalized);
  const placement = getPlacementForSnapZone(targetSnapZone);
  const dockTarget = getDockTargetForPlacement(placement);

  if (placement === WORKBENCH_PANEL_PLACEMENTS.hidden) {
    return {
      canFocus: false,
      reason: "hidden-panel",
      panelId: targetPanelId,
      snapZone: targetSnapZone,
      placement,
      dockTarget,
      sidebarRequired: false,
      state: currentState,
      panelIds: focusablePanelIds,
      layout: normalized,
    };
  }

  if (!focusablePanelIds.includes(targetPanelId)) {
    return {
      canFocus: false,
      reason: "panel-outside-zone",
      panelId: targetPanelId,
      snapZone: targetSnapZone,
      placement,
      dockTarget,
      sidebarRequired: false,
      state: currentState,
      panelIds: focusablePanelIds,
      layout: normalized,
    };
  }

  const nextState = openWorkbenchDockPanel(currentState, targetPanelId, normalized);
  return {
    canFocus: true,
    reason: null,
    panelId: targetPanelId,
    snapZone: targetSnapZone,
    placement,
    dockTarget: nextState.dockTarget || dockTarget,
    sidebarRequired: Boolean(nextState.sidebarRequired),
    state: nextState,
    panelIds: focusablePanelIds,
    layout: normalized,
  };
}

function getBottomPanelId(panelId, fallback = "terminal") {
  return hasPanelId(panelId) ? panelId : fallback;
}

export function normalizeWorkbenchDockState(state = {}, layout) {
  const normalized = normalizeWorkbenchLayout(layout);
  const activePanel = getVisiblePanelId({
    layout: normalized,
    panelId: state.activePanel,
    snapZone: WORKBENCH_PANEL_PLACEMENTS.side,
    fallback: null,
    defaultToFirst: false,
  });
  const bottomTab = getVisiblePanelId({
    layout: normalized,
    panelId: state.bottomTab,
    snapZone: WORKBENCH_SNAP_ZONES.bottom,
    fallback: "terminal",
  });

  return {
    activePanel,
    bottomTab: bottomTab || getBottomPanelId(state.bottomTab, "terminal"),
    bottomPanelOpen: Boolean(
      state.bottomPanelOpen &&
      bottomTab &&
      getWorkbenchPanelSnapZone(bottomTab, normalized) === WORKBENCH_SNAP_ZONES.bottom,
    ),
  };
}

export function createWorkbenchDockState(state = {}, layout) {
  if (layout !== undefined) {
    return normalizeWorkbenchDockState(state, layout);
  }

  const bottomTab = getBottomPanelId(state.bottomTab, "terminal");
  return {
    activePanel: hasPanelId(state.activePanel) ? state.activePanel : null,
    bottomTab,
    bottomPanelOpen: Boolean(state.bottomPanelOpen),
  };
}

export function openWorkbenchDockPanel(state, panelId, layout) {
  const current = createWorkbenchDockState(state, layout);
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
  const current = createWorkbenchDockState(state, layout);
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
