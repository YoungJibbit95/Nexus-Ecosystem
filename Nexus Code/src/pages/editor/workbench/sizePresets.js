import {
  BOTTOM_PANEL_SIZE_ALIASES,
  BOTTOM_PANEL_SIZE_SEQUENCE,
  BOTTOM_PANEL_SIZES,
  DEFAULT_WORKBENCH_LAYOUT,
  SIDE_PANEL_SIZE_ALIASES,
  SIDE_PANEL_SIZE_SEQUENCE,
  SIDE_PANEL_SIZES,
  WORKBENCH_CUSTOM_PRESET_ID,
  WORKBENCH_CUSTOM_SIZE_LIMITS,
  WORKBENCH_LAYOUT_PRESETS,
  WORKBENCH_RESPONSIVE_LAYOUT_LIMITS,
  WORKBENCH_ZONES,
  normalizeCustomPixelSize,
  normalizePresetId,
  normalizeRegistryId,
} from "./layoutConfig.js";
import { normalizeWorkbenchLayout } from "./layoutNormalization.js";

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
  const style = compact
    ? panelSize.compactStyle || panelSize.style
    : panelSize.style || panelSize.compactStyle;
  return { ...style };
}

export function getWorkbenchDockCustomStyle(layout = {}, dockId, options = {}) {
  if (options.compact) return null;
  const normalized = normalizeWorkbenchLayout(layout);

  if (dockId === WORKBENCH_ZONES.bottomPanel || dockId === "bottom") {
    const height = normalized.customBottomPanelHeight;
    if (!height) return null;
    const { min, max } = WORKBENCH_CUSTOM_SIZE_LIMITS.bottom;
    const cssHeight = `clamp(${min}px, ${height}px, min(${max}px, calc(100vh - 8rem)))`;
    return {
      height: cssHeight,
      flex: `0 0 ${cssHeight}`,
      minHeight: `${min}px`,
      maxHeight: `min(${max}px, calc(100vh - 8rem))`,
    };
  }

  const width = normalized.customSidePanelWidth;
  if (!width) return null;
  const { min, max } = WORKBENCH_CUSTOM_SIZE_LIMITS.side;
  const cssWidth = `clamp(${min}px, ${width}px, min(${max}px, calc(100vw - 10rem)))`;
  return {
    width: cssWidth,
    flex: `0 0 ${cssWidth}`,
    minWidth: `${min}px`,
    maxWidth: `min(${max}px, calc(100vw - 10rem))`,
  };
}

export function getWorkbenchLayoutPreset(
  presetId = DEFAULT_WORKBENCH_LAYOUT.presetId,
  fallbackId = DEFAULT_WORKBENCH_LAYOUT.presetId,
) {
  const normalizedPresetId = normalizePresetId(presetId);
  if (WORKBENCH_LAYOUT_PRESETS[normalizedPresetId]) {
    return WORKBENCH_LAYOUT_PRESETS[normalizedPresetId];
  }

  const normalizedFallbackId = normalizePresetId(fallbackId);
  return (
    WORKBENCH_LAYOUT_PRESETS[normalizedFallbackId] ||
    WORKBENCH_LAYOUT_PRESETS[DEFAULT_WORKBENCH_LAYOUT.presetId]
  );
}

export function getWorkbenchLayoutPresetOptions() {
  return Object.values(WORKBENCH_LAYOUT_PRESETS).map((preset) => ({ ...preset }));
}

export function normalizeWorkbenchViewportNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

export function isResponsiveCompactViewport({
  compact = false,
  viewportWidth,
  viewportHeight,
} = {}) {
  const width = normalizeWorkbenchViewportNumber(viewportWidth);
  const height = normalizeWorkbenchViewportNumber(viewportHeight);
  return Boolean(
    compact ||
      (width !== null && width < WORKBENCH_RESPONSIVE_LAYOUT_LIMITS.narrowWidth) ||
      (height !== null && height < WORKBENCH_RESPONSIVE_LAYOUT_LIMITS.shortHeight),
  );
}

export function getResponsiveSidePanelSizeId(sizeId, options = {}) {
  const normalizedId = normalizeRegistryId(
    sizeId,
    SIDE_PANEL_SIZES,
    DEFAULT_WORKBENCH_LAYOUT.sidePanelSize,
    SIDE_PANEL_SIZE_ALIASES,
  );
  if (!isResponsiveCompactViewport(options)) return normalizedId;

  const width = normalizeWorkbenchViewportNumber(options.viewportWidth);
  if (width !== null && width < WORKBENCH_RESPONSIVE_LAYOUT_LIMITS.compactWidth) {
    return "focus";
  }

  return normalizedId === "wide" ? "comfortable" : normalizedId;
}

export function getResponsiveBottomPanelSizeId(sizeId, options = {}) {
  const normalizedId = normalizeRegistryId(
    sizeId,
    BOTTOM_PANEL_SIZES,
    DEFAULT_WORKBENCH_LAYOUT.bottomPanelSize,
    BOTTOM_PANEL_SIZE_ALIASES,
  );
  if (!isResponsiveCompactViewport(options)) return normalizedId;

  const height = normalizeWorkbenchViewportNumber(options.viewportHeight);
  if (height !== null && height < WORKBENCH_RESPONSIVE_LAYOUT_LIMITS.shortHeight) {
    return "focus";
  }

  if (
    normalizedId === "wide" &&
    (height === null || height < WORKBENCH_RESPONSIVE_LAYOUT_LIMITS.roomyHeight)
  ) {
    return "comfortable";
  }

  return normalizedId;
}

export function getResponsiveWorkbenchLayout(layout = {}, options = {}) {
  const normalized = normalizeWorkbenchLayout(layout);
  const sidePanelSize = getResponsiveSidePanelSizeId(
    normalized.sidePanelSize,
    options,
  );
  const bottomPanelSize = getResponsiveBottomPanelSizeId(
    normalized.bottomPanelSize,
    options,
  );

  if (
    sidePanelSize === normalized.sidePanelSize &&
    bottomPanelSize === normalized.bottomPanelSize
  ) {
    return normalized;
  }

  return {
    ...normalized,
    sidePanelSize,
    bottomPanelSize,
  };
}

export function getWorkbenchLayoutSizeState(layout = {}, options = {}) {
  const normalized = options.responsive
    ? getResponsiveWorkbenchLayout(layout, options)
    : normalizeWorkbenchLayout(layout);
  const preset = WORKBENCH_LAYOUT_PRESETS[normalized.presetId] || null;

  return {
    layout: normalized,
    presetId: normalized.presetId,
    preset,
    isCustom:
      normalized.presetId === WORKBENCH_CUSTOM_PRESET_ID ||
      !preset ||
      preset.sidePanelSize !== normalized.sidePanelSize ||
      preset.bottomPanelSize !== normalized.bottomPanelSize,
    sidePanelSizeId: normalized.sidePanelSize,
    bottomPanelSizeId: normalized.bottomPanelSize,
    sidePanelSize: getSidePanelSize(normalized.sidePanelSize),
    bottomPanelSize: getBottomPanelSize(normalized.bottomPanelSize),
  };
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
    const bottomPanelSize = normalizeRegistryId(
      sizeId,
      BOTTOM_PANEL_SIZES,
      normalized.bottomPanelSize,
      BOTTOM_PANEL_SIZE_ALIASES,
    );
    if (
      bottomPanelSize === normalized.bottomPanelSize &&
      !normalized.customBottomPanelHeight
    ) {
      return normalized;
    }

    return normalizeWorkbenchLayout({
      ...normalized,
      presetId: WORKBENCH_CUSTOM_PRESET_ID,
      bottomPanelSize,
      customBottomPanelHeight: null,
    });
  }

  const sidePanelSize = normalizeRegistryId(
    sizeId,
    SIDE_PANEL_SIZES,
    normalized.sidePanelSize,
    SIDE_PANEL_SIZE_ALIASES,
  );
  if (sidePanelSize === normalized.sidePanelSize && !normalized.customSidePanelWidth) {
    return normalized;
  }

  return normalizeWorkbenchLayout({
    ...normalized,
    presetId: WORKBENCH_CUSTOM_PRESET_ID,
    sidePanelSize,
    customSidePanelWidth: null,
  });
}

export function setWorkbenchDockCustomSize(layout, dockId, pixelSize) {
  const normalized = normalizeWorkbenchLayout(layout);

  if (dockId === WORKBENCH_ZONES.bottomPanel || dockId === "bottom") {
    const customBottomPanelHeight = normalizeCustomPixelSize(
      pixelSize,
      WORKBENCH_CUSTOM_SIZE_LIMITS.bottom,
    );
    if (customBottomPanelHeight === normalized.customBottomPanelHeight) {
      return normalized;
    }
    return normalizeWorkbenchLayout({
      ...normalized,
      presetId: WORKBENCH_CUSTOM_PRESET_ID,
      customBottomPanelHeight,
    });
  }

  const customSidePanelWidth = normalizeCustomPixelSize(
    pixelSize,
    WORKBENCH_CUSTOM_SIZE_LIMITS.side,
  );
  if (customSidePanelWidth === normalized.customSidePanelWidth) {
    return normalized;
  }
  return normalizeWorkbenchLayout({
    ...normalized,
    presetId: WORKBENCH_CUSTOM_PRESET_ID,
    customSidePanelWidth,
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
  const preset = getWorkbenchLayoutPreset(presetId);

  return normalizeWorkbenchLayout({
    ...layout,
    presetId: preset.id,
    sidePanelSize: preset.sidePanelSize,
    bottomPanelSize: preset.bottomPanelSize,
  });
}
