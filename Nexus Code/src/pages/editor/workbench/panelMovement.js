import {
  DEFAULT_PANEL_ZONES,
  WORKBENCH_CUSTOM_PRESET_ID,
  WORKBENCH_DOCK_ZONE_SEQUENCE,
  WORKBENCH_PANEL_PLACEMENTS,
  WORKBENCH_SNAP_ZONES,
  cloneZonePanelIds,
  getDefaultSideSnapZone,
  getDropTargetSnapZone,
  getPlacementForSnapZone,
  isObject,
  normalizePanelId,
  normalizeSnapZone,
} from "./layoutConfig.js";
import { normalizeWorkbenchLayout } from "./layoutNormalization.js";

export function getWorkbenchPanelSnapZone(panelId, layout) {
  const normalizedPanelId = normalizePanelId(panelId);
  if (!normalizedPanelId) return WORKBENCH_SNAP_ZONES.hidden;
  const normalized = normalizeWorkbenchLayout(layout);
  return normalized.panelZones[normalizedPanelId] || DEFAULT_PANEL_ZONES[normalizedPanelId];
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

export function getWorkbenchPanelIdsForPlacement(layout, placement) {
  const normalized = normalizeWorkbenchLayout(layout);
  return WORKBENCH_DOCK_ZONE_SEQUENCE.flatMap((zone) => {
    if (getPlacementForSnapZone(zone) !== placement) return [];
    return normalized.zonePanelIds[zone] || [];
  });
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
