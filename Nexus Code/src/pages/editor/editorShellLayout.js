export const PANEL_META = {
  explorer: {
    title: "Explorer",
    detail: "Workspace files",
  },
  search: {
    title: "Suche",
    detail: "Projektweit finden",
  },
  problems: {
    title: "Problems",
    detail: "Diagnose und Hinweise",
  },
  git: {
    title: "Git",
    detail: "Source control",
  },
  debug: {
    title: "Debug",
    detail: "Run state",
  },
  extensions: {
    title: "Extensions",
    detail: "IDE Module",
  },
  account: {
    title: "Account",
    detail: "Nexus API & Login",
  },
};

export const PANEL_BOUNDS = {
  railWidth: "w-14",
  compactWidth: "w-[min(22rem,calc(100vw-3.25rem))]",
  desktopWidth: "w-[clamp(18rem,24vw,23rem)]",
  desktopMinWidth: "min-w-[18rem]",
  desktopMaxWidth: "max-w-[23rem]",
  bottomHeight: "h-[clamp(14rem,32vh,21rem)]",
  compactBottomHeight: "h-[min(18rem,42vh)]",
};

export function getPanelMeta(panelId) {
  return PANEL_META[panelId] || {
    title: "Panel",
    detail: "Workspace",
  };
}

export function getShellModeLabel({ showSettings, zenMode, activePanel }) {
  if (showSettings) return "Settings";
  if (zenMode) return "Zen";
  if (activePanel) return getPanelMeta(activePanel).title;
  return "Focus";
}

export function getSidePanelClassName({ compact }) {
  if (compact) {
    return [
      "relative",
      "h-full",
      "shrink-0",
      PANEL_BOUNDS.compactWidth,
      "shadow-2xl",
    ].join(" ");
  }

  return [
    "relative",
    PANEL_BOUNDS.desktopWidth,
    PANEL_BOUNDS.desktopMinWidth,
    PANEL_BOUNDS.desktopMaxWidth,
  ].join(" ");
}

export function getRailClassName(side = "left") {
  const borderClass = side === "right" ? "border-l" : "border-r";
  return [
    "nx-code-rail",
    PANEL_BOUNDS.railWidth,
    "relative z-40 h-full min-h-0 overflow-visible flex flex-col",
    `${borderClass} border-white/5 shrink-0 nexus-panel-surface`,
  ].join(" ");
}

export function getMainEditorClassName() {
  return [
    "nx-code-main",
    "min-w-0 flex-1",
    "flex flex-col min-h-0 bg-transparent",
  ].join(" ");
}

export function getBottomPanelClassName({ compact = false } = {}) {
  const heightClass = compact
    ? PANEL_BOUNDS.compactBottomHeight
    : PANEL_BOUNDS.bottomHeight;
  return `nx-code-bottom-panel ${heightClass} min-h-0 overflow-hidden`;
}
