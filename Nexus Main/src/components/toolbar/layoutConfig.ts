// Central toolbar layout tokens.
// Edit these values to reposition/resize Island and Spotlight UI without touching component JSX.
export const TOOLBAR_LAYOUT_CONFIG = {
  spotlight: {
    anchorX: "30%",
    translateX: "-30%",
    panelTopPx: 74,
    panelWidth: "min(620px, 72vw)",
  },
  island: {
    collapsedWidth: "min(560px, 95vw)",
    expandedWidth: "min(1100px, 98vw)",
    collapsedHeight: 54,
    expandedHeight: 68,
    glassPaddingCollapsed: "0 16px",
    glassPaddingExpanded: "0 14px 0 16px",
    glassGapCollapsed: 10,
    glassGapExpanded: 8,
    collapsedContentGap: 10,
    expandedViewRailGapCompact: 4,
    expandedViewRailGapRegular: 6,
    logoOffset: { x: 0, y: 0 },
    brandOffset: { x: 0, y: 0 },
    statusOffset: { x: 0, y: 0 },
    actionButtonOffset: {
      terminal: { x: 0, y: 0 },
      search: { x: 0, y: 0 },
    },
  },
} as const;

export const SPOTLIGHT_POP_TRANSITION = {
  type: "spring",
  stiffness: 420,
  damping: 30,
  mass: 0.82,
} as const;
