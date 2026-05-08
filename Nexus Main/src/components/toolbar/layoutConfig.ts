// Central toolbar layout tokens.
// Edit these values to reposition/resize Island and Spotlight UI without touching component JSX.
export const TOOLBAR_LAYOUT_CONFIG = {
  spotlight: {
    anchorX: "45%",
    translateX: "-50%",
    panelTopPx: 66,
    panelWidth: "min(640px, 78vw)",
  },
  fullWidth: {
    height: 36,
    logoOffset: { x: 0, y: 0 },
    actionButtonOffset: {
      terminal: { x: 0, y: 0 },
      search: { x: 0, y: 0 },
    },
  },
  island: {
    collapsedWidth: "min(540px, 94vw)",
    expandedWidth: "min(1120px, 98vw)",
    collapsedHeight: 46,
    expandedHeight: 48,
    glassPaddingCollapsed: "0 12px",
    glassPaddingExpanded: "0 10px 0 12px",
    glassGapCollapsed: 8,
    glassGapExpanded: 6,
    collapsedContentGap: 8,
    expandedViewRailGapCompact: 8,
    expandedViewRailGapRegular: 5,
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
