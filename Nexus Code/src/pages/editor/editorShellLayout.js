import {
  getBottomPanelSize,
  getSidePanelSize,
} from "./workbenchLayoutModel";

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
  issues: {
    title: "Issues",
    detail: "GitHub Aufgaben",
  },
  prs: {
    title: "Pull Requests",
    detail: "Reviews und Merge-Flows",
  },
  projects: {
    title: "Projects",
    detail: "GitHub Boards",
  },
  terminal: {
    title: "Terminal",
    detail: "Workspace shell",
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
  bottomHeight: "h-[clamp(13rem,30vh,19rem)]",
  compactBottomHeight: "h-[min(17rem,42vh)]",
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
      "shadow-2xl",
    ].join(" ");
  }

  return [
    "relative",
    "shrink-0",
  ].join(" ");
}

export function getSidePanelStyle({ compact = false, size } = {}) {
  const panelSize = getSidePanelSize(size);
  if (compact) {
    return {
      width: panelSize.compactWidth,
      maxWidth: "calc(100vw - 3.25rem)",
    };
  }

  return {
    width: panelSize.width,
    minWidth: panelSize.minWidth,
    maxWidth: panelSize.maxWidth,
  };
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

export function getBottomPanelClassName({ compact = false, size } = {}) {
  const panelSize = getBottomPanelSize(size);
  const heightClass = compact
    ? panelSize.compactClassName
    : panelSize.className;
  return `nx-code-bottom-panel ${heightClass} min-h-0 overflow-hidden`;
}
