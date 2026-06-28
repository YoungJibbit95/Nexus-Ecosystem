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
  compactWidth: "w-[min(24rem,calc(100vw-3.5rem))]",
  desktopWidth: "w-[clamp(18rem,24vw,23rem)]",
  desktopMinWidth: "min-w-[18rem]",
  desktopMaxWidth: "max-w-[23rem]",
  bottomHeight: "h-[clamp(15rem,34vh,22.5rem)]",
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

export function getSidePanelClassName({ compact, side = "left" }) {
  const compactEdge = side === "right" ? "right-14" : "left-14";
  if (compact) {
    return [
      "absolute top-0 bottom-0",
      compactEdge,
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

export function getBottomPanelClassName() {
  return `${PANEL_BOUNDS.bottomHeight} min-h-0 overflow-hidden`;
}
