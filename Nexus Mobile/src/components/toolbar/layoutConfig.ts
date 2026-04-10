// Central toolbar layout tokens for Nexus Mobile.
// Edit here to move Spotlight/Island pieces without searching in component markup.
export const MOBILE_TOOLBAR_LAYOUT = {
  spotlight: {
    anchorX: "30%",
    translateX: "-30%",
    panelTopPx: 68,
    panelWidth: "min(560px, 82vw)",
    overlayPanelWidth: "min(520px, 80vw)",
  },
  island: {
    logoOffset: { x: 0, y: 0 },
    brandOffset: { x: 0, y: 0 },
    statusOffset: { x: 0, y: 0 },
    actionButtonOffset: {
      terminal: { x: 0, y: 0 },
      search: { x: 0, y: 0 },
    },
  },
} as const;

export const MOBILE_SPOTLIGHT_POP_TRANSITION = {
  type: "spring",
  stiffness: 420,
  damping: 30,
  mass: 0.82,
} as const;
