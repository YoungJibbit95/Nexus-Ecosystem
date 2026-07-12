import {
  WORKBENCH_PANEL_IDS,
  WORKBENCH_PANEL_PLACEMENTS,
  WORKBENCH_SIDE_SNAP_ZONES,
  WORKBENCH_SNAP_ZONES,
  WORKBENCH_VISIBLE_SNAP_ZONES,
  WORKBENCH_ZONES,
  getPlacementForSnapZone,
  hasPanelId,
  isObject,
  normalizePanelId,
  normalizeSnapZone,
} from "./layoutConfig.js";
import { normalizeWorkbenchLayout } from "./layoutNormalization.js";
import {
  getWorkbenchPanelIdsForPlacement,
  getWorkbenchPanelSnapZone,
  getWorkbenchZonePanelIds,
} from "./panelMovement.js";

function getVisibleSnapZones(snapZone) {
  if (!snapZone) {
    return [...WORKBENCH_VISIBLE_SNAP_ZONES];
  }
  if (snapZone === WORKBENCH_PANEL_PLACEMENTS.side) {
    return [...WORKBENCH_SIDE_SNAP_ZONES];
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
  const safeState = isObject(state) ? state : {};
  const normalized = normalizeWorkbenchLayout(layout);
  const activePanel = getVisiblePanelId({
    layout: normalized,
    panelId: safeState.activePanel,
    snapZone: WORKBENCH_PANEL_PLACEMENTS.side,
    fallback: null,
    defaultToFirst: false,
  });
  const bottomTab = getVisiblePanelId({
    layout: normalized,
    panelId: safeState.bottomTab,
    snapZone: WORKBENCH_SNAP_ZONES.bottom,
    fallback: "terminal",
  });

  return {
    activePanel,
    bottomTab: bottomTab || getBottomPanelId(safeState.bottomTab, "terminal"),
    bottomPanelOpen: Boolean(
      safeState.bottomPanelOpen &&
      bottomTab &&
      getWorkbenchPanelSnapZone(bottomTab, normalized) === WORKBENCH_SNAP_ZONES.bottom,
    ),
  };
}

export function createWorkbenchDockState(state = {}, layout) {
  const safeState = isObject(state) ? state : {};
  if (layout !== undefined) {
    return normalizeWorkbenchDockState(safeState, layout);
  }

  const bottomTab = getBottomPanelId(safeState.bottomTab, "terminal");
  return {
    activePanel: hasPanelId(safeState.activePanel) ? safeState.activePanel : null,
    bottomTab,
    bottomPanelOpen: Boolean(safeState.bottomPanelOpen),
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
      accepts: getWorkbenchPanelIdsForPlacement(
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
      accepts: getWorkbenchPanelIdsForPlacement(
        normalized,
        WORKBENCH_PANEL_PLACEMENTS.bottom,
      ),
    },
  };
}
