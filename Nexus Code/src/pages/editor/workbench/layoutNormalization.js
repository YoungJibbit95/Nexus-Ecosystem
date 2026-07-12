import {
  BOTTOM_PANEL_SIZE_ALIASES,
  BOTTOM_PANEL_SIZES,
  DEFAULT_PANEL_PLACEMENTS,
  DEFAULT_PANEL_ZONES,
  DEFAULT_WORKBENCH_LAYOUT,
  MAX_PANEL_ID_BUCKET_SCAN,
  MAX_PANEL_ID_LOOKUP_DEPTH,
  SIDE_PANEL_SIZE_ALIASES,
  SIDE_PANEL_SIZES,
  WORKBENCH_CUSTOM_SIZE_LIMITS,
  WORKBENCH_DOCK_LEGACY_STORAGE_KEYS,
  WORKBENCH_DOCK_STORAGE_KEY,
  WORKBENCH_DOCK_VERSION,
  WORKBENCH_DOCK_ZONE_SEQUENCE,
  WORKBENCH_LAYOUT_PRESETS,
  WORKBENCH_PANEL_IDS,
  WORKBENCH_PANEL_PLACEMENTS,
  cloneZonePanelIds,
  createEmptyZonePanelIds,
  createPanelPlacementsFromZones,
  getDefaultSideSnapZone,
  getStorage,
  hasPanelId,
  isObject,
  normalizeCustomPixelSize,
  normalizePanelId,
  normalizePanelPlacement,
  normalizePanelZone,
  normalizePresetId,
  normalizeRegistryId,
  normalizeSnapZone,
} from "./layoutConfig.js";

function createObjectFromPairArray(value) {
  if (!Array.isArray(value)) return null;

  const source = {};
  for (const item of value.slice(0, MAX_PANEL_ID_BUCKET_SCAN)) {
    if (Array.isArray(item) && typeof item[0] === "string") {
      source[item[0]] = item[1];
      continue;
    }
    if (isObject(item) && typeof item.key === "string") {
      source[item.key] = item.value;
    }
  }

  return Object.keys(source).length > 0 ? source : null;
}

function getObjectSource(value) {
  return isObject(value) ? value : createObjectFromPairArray(value) || {};
}

function pushPanelIds(panelIds, candidates) {
  for (const candidateId of candidates) {
    if (panelIds.length >= MAX_PANEL_ID_BUCKET_SCAN) break;
    panelIds.push(candidateId);
  }
}

function getPanelIdsFromObject(value, depth, seenValues) {
  if (seenValues.has(value)) return [];
  seenValues.add(value);

  const panelIds = [];
  const knownFields = [
    value.panelIds,
    value.panels,
    value.items,
    value.ids,
    value.panelId,
    value.panel,
    value.id,
    value.key,
    value.children,
    value.value,
  ];

  for (const field of knownFields) {
    pushPanelIds(
      panelIds,
      getPanelIdsFromUnknown(field, depth + 1, seenValues),
    );
  }

  if (panelIds.length === 0) {
    for (const [key, enabled] of Object.entries(value)) {
      if (panelIds.length >= MAX_PANEL_ID_BUCKET_SCAN) break;

      if (enabled === true || enabled === "true") {
        pushPanelIds(panelIds, getPanelIdsFromUnknown(key, depth + 1, seenValues));
      } else if (Array.isArray(enabled) || isObject(enabled)) {
        pushPanelIds(
          panelIds,
          getPanelIdsFromUnknown(enabled, depth + 1, seenValues),
        );
      }
    }
  }

  seenValues.delete(value);
  return panelIds.slice(0, MAX_PANEL_ID_BUCKET_SCAN);
}

function getPanelIdsFromUnknown(
  value,
  depth = 0,
  seenValues = new Set(),
) {
  if (depth > MAX_PANEL_ID_LOOKUP_DEPTH) return [];

  const panelId = normalizePanelId(value);
  if (panelId) return [panelId];

  if (Array.isArray(value)) {
    if (seenValues.has(value)) return [];
    seenValues.add(value);

    const panelIds = [];
    for (const item of value) {
      if (panelIds.length >= MAX_PANEL_ID_BUCKET_SCAN) break;
      pushPanelIds(
        panelIds,
        getPanelIdsFromUnknown(item, depth + 1, seenValues),
      );
    }

    seenValues.delete(value);
    return panelIds.slice(0, MAX_PANEL_ID_BUCKET_SCAN);
  }

  if (isObject(value)) {
    return getPanelIdsFromObject(value, depth, seenValues);
  }

  return [];
}

function getPanelIdsFromZoneBucket(bucket) {
  return getPanelIdsFromUnknown(bucket).slice(0, MAX_PANEL_ID_BUCKET_SCAN);
}

function getZoneRecordSnapZone(record) {
  if (Array.isArray(record)) {
    return normalizeSnapZone(record[0], null);
  }
  if (!isObject(record)) return null;
  return normalizeSnapZone(
    record.zone ||
      record.snapZone ||
      record.snap ||
      record.placement ||
      record.id ||
      record.key ||
      record.name,
    null,
  );
}

function getZoneRecordBucket(record) {
  if (Array.isArray(record)) return record[1];
  if (!isObject(record)) return null;
  return (
    record.panelIds ||
    record.panels ||
    record.items ||
    record.ids ||
    record.bucket ||
    record.value ||
    record
  );
}

function isZoneBucketSource(value) {
  if (Array.isArray(value)) {
    return value.some((record) => Boolean(getZoneRecordSnapZone(record)));
  }
  if (!isObject(value)) return false;
  return Object.entries(value).some(([zone, bucket]) => {
    const normalizedZone = normalizeSnapZone(zone, null);
    return Boolean(
      normalizedZone &&
      (Array.isArray(bucket) || isObject(bucket) || typeof bucket === "string"),
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
    (candidate) =>
      (isObject(candidate) || Array.isArray(candidate)) &&
      !isZoneBucketSource(candidate),
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
  if (Array.isArray(source)) {
    for (const item of source.slice(0, MAX_PANEL_ID_BUCKET_SCAN)) {
      if (Array.isArray(item) && normalizePanelId(item[0]) === panelId) {
        return { found: true, value: item[1] };
      }
      if (!isObject(item)) continue;
      const itemPanelId = normalizePanelId(
        item.panelId || item.panel || item.id || item.key,
      );
      if (itemPanelId === panelId) {
        return {
          found: true,
          value:
            item.zone ||
            item.snapZone ||
            item.snap ||
            item.placement ||
            item.value,
        };
      }
    }
    return { found: false, value: undefined };
  }

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
  const source = value || {};
  const placementSource = legacyPlacements || {};

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

function addPanelIdsToZone(zonePanelIds, zone, panelIds) {
  const remainingSlots = Math.max(
    0,
    MAX_PANEL_ID_BUCKET_SCAN - zonePanelIds[zone].length,
  );
  if (!remainingSlots) return;
  zonePanelIds[zone].push(...panelIds.slice(0, remainingSlots));
}

function getZoneBucketsBySnapZone(value) {
  const bucketsByZone = createEmptyZonePanelIds();

  if (Array.isArray(value)) {
    for (const record of value.slice(0, MAX_PANEL_ID_BUCKET_SCAN)) {
      const zone = getZoneRecordSnapZone(record);
      if (!zone) continue;
      addPanelIdsToZone(
        bucketsByZone,
        zone,
        getPanelIdsFromZoneBucket(getZoneRecordBucket(record)),
      );
    }
    return bucketsByZone;
  }

  if (!isObject(value)) return bucketsByZone;

  for (const [rawZone, bucket] of Object.entries(value)) {
    const zone = normalizeSnapZone(rawZone, null);
    if (!zone) continue;
    addPanelIdsToZone(
      bucketsByZone,
      zone,
      getPanelIdsFromZoneBucket(bucket),
    );
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

export function getWorkbenchLayoutPresetSeed(presetId) {
  return (
    WORKBENCH_LAYOUT_PRESETS[presetId] ||
    WORKBENCH_LAYOUT_PRESETS[DEFAULT_WORKBENCH_LAYOUT.presetId]
  );
}

function createFallbackWorkbenchLayout() {
  return {
    ...DEFAULT_WORKBENCH_LAYOUT,
    panelZones: { ...DEFAULT_WORKBENCH_LAYOUT.panelZones },
    zonePanelIds: cloneZonePanelIds(DEFAULT_WORKBENCH_LAYOUT.zonePanelIds),
    panelPlacements: { ...DEFAULT_WORKBENCH_LAYOUT.panelPlacements },
  };
}

export function normalizeWorkbenchLayout(layout = {}) {
  try {
    const source = getObjectSource(layout);
    const presetId = normalizePresetId(source.presetId);
    const preset = getWorkbenchLayoutPresetSeed(presetId);
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
      customSidePanelWidth: normalizeCustomPixelSize(
        source.customSidePanelWidth,
        WORKBENCH_CUSTOM_SIZE_LIMITS.side,
      ),
      customBottomPanelHeight: normalizeCustomPixelSize(
        source.customBottomPanelHeight,
        WORKBENCH_CUSTOM_SIZE_LIMITS.bottom,
      ),
      bottomPanelPlacement: WORKBENCH_PANEL_PLACEMENTS.bottom,
      panelZones,
      zonePanelIds,
      panelPlacements: createPanelPlacementsFromZones(panelZones),
    };
  } catch {
    return createFallbackWorkbenchLayout();
  }
}

export function getDefaultWorkbenchLayout() {
  return normalizeWorkbenchLayout();
}

export function resetWorkbenchLayout(layout, options = {}) {
  if (arguments.length === 0) {
    return getDefaultWorkbenchLayout();
  }

  const safeOptions = isObject(options) ? options : {};
  if (!safeOptions.preservePanelZones) {
    return getDefaultWorkbenchLayout();
  }

  const normalized = normalizeWorkbenchLayout(layout);
  const resetLayout = getDefaultWorkbenchLayout();
  return normalizeWorkbenchLayout({
    ...resetLayout,
    panelZones: normalized.panelZones,
    zonePanelIds: normalized.zonePanelIds,
    panelPlacements: normalized.panelPlacements,
  });
}

export function resetWorkbenchLayoutSizes(
  layout = {},
  presetId = DEFAULT_WORKBENCH_LAYOUT.presetId,
) {
  const normalized = normalizeWorkbenchLayout(layout);
  const preset = getWorkbenchLayoutPresetSeed(normalizePresetId(presetId));
  return normalizeWorkbenchLayout({
    ...normalized,
    presetId: preset.id,
    sidePanelSize: preset.sidePanelSize,
    bottomPanelSize: preset.bottomPanelSize,
  });
}

export function resetWorkbenchLayoutToPreset(
  presetId = DEFAULT_WORKBENCH_LAYOUT.presetId,
) {
  const preset = getWorkbenchLayoutPresetSeed(normalizePresetId(presetId));
  return normalizeWorkbenchLayout({
    ...DEFAULT_WORKBENCH_LAYOUT,
    presetId: preset.id,
    sidePanelSize: preset.sidePanelSize,
    bottomPanelSize: preset.bottomPanelSize,
  });
}

export function resetWorkbenchDockSizes() {
  return getDefaultWorkbenchLayout();
}

function parseStoredLayout(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isObject(parsed) || Array.isArray(parsed) ? parsed : null;
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

  const storedLayout = readStoredLayout(storage, WORKBENCH_DOCK_STORAGE_KEY);
  if (storedLayout) {
    const normalized = normalizeWorkbenchLayout(storedLayout);
    persistMigratedWorkbenchLayout(storage, normalized);
    return normalized;
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
