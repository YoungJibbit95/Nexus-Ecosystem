// Central toolbar layout tokens.
// Edit these values to reposition/resize Island and Spotlight UI without touching component JSX.
export const TOOLBAR_LAYOUT_CONFIG = {
  spotlight: {
    anchorX: "50%",
    translateX: "-50%",
    panelTopPx: 76,
    panelWidth: "min(640px, 78vw)",
  },
  fullWidth: {
    height: 44,
    logoOffset: { x: 0, y: 0 },
    actionButtonOffset: {
      terminal: { x: 0, y: 0 },
      search: { x: 0, y: 0 },
    },
  },
  island: {
    collapsedWidth: "min(620px, 96vw)",
    expandedWidth: "min(1260px, 99vw)",
    collapsedHeight: 56,
    expandedHeight: 58,
    glassPaddingCollapsed: "0 16px",
    glassPaddingExpanded: "0 14px 0 16px",
    glassGapCollapsed: 10,
    glassGapExpanded: 8,
    collapsedContentGap: 10,
    expandedViewRailGapCompact: 10,
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
