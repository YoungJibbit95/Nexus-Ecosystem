import type { EffectClass, SurfaceClass } from "./surfaceRecipes";

export type ToolbarSceneMode = "island" | "full-width" | "spotlight";
export type ToolbarSlot =
  | "brandSlot"
  | "navSlot"
  | "statusSlot"
  | "utilitySlot"
  | "overflowSlot"
  | "commandSlot";

export type ToolbarSceneContext = {
  mode: ToolbarSceneMode;
  width: number;
  expanded: boolean;
  compact: boolean;
  platform: "desktop" | "mobile";
};

export type ToolbarSlotSpec = {
  visible: boolean;
  priority: number;
  collapseRank: number;
};

export type ToolbarSceneSpec = {
  mode: ToolbarSceneMode;
  surfaceClass: SurfaceClass;
  effectClass: EffectClass;
  primaryActionFamily: "navigation" | "command";
  utilityActionFamily: "utility" | "compact-utility";
  statusFamily: "cluster" | "inline" | "none";
  overflowFamily: "menu" | "sheet";
  slots: Record<ToolbarSlot, ToolbarSlotSpec>;
  maxVisibleNavActions: number;
  maxVisibleUtilityActions: number;
};

const slot = (
  visible: boolean,
  priority: number,
  collapseRank: number,
): ToolbarSlotSpec => ({
  visible,
  priority,
  collapseRank,
});

export const resolveToolbarSceneSpec = (
  context: ToolbarSceneContext,
): ToolbarSceneSpec => {
  const { mode, width, expanded, compact, platform } = context;
  const narrow = width <= (platform === "mobile" ? 540 : 760);

  if (mode === "spotlight") {
    return {
      mode,
      surfaceClass: "toolbar-surface",
      effectClass: "status-highlight",
      primaryActionFamily: "command",
      utilityActionFamily: "compact-utility",
      statusFamily: "none",
      overflowFamily: platform === "mobile" ? "sheet" : "menu",
      slots: {
        brandSlot: slot(!compact, 90, 5),
        navSlot: slot(false, 0, 10),
        statusSlot: slot(false, 0, 10),
        utilitySlot: slot(!narrow, 34, 4),
        overflowSlot: slot(true, 40, 2),
        commandSlot: slot(true, 100, 1),
      },
      maxVisibleNavActions: 0,
      maxVisibleUtilityActions: narrow ? 1 : 2,
    };
  }

  if (mode === "full-width") {
    return {
      mode,
      surfaceClass: "toolbar-surface",
      effectClass: "backdrop",
      primaryActionFamily: "navigation",
      utilityActionFamily: "utility",
      statusFamily: "inline",
      overflowFamily: platform === "mobile" ? "sheet" : "menu",
      slots: {
        brandSlot: slot(true, 100, 6),
        navSlot: slot(true, 92, 1),
        statusSlot: slot(!narrow, 62, 3),
        utilitySlot: slot(true, 76, 2),
        overflowSlot: slot(true, 50, 4),
        commandSlot: slot(!compact, 40, 5),
      },
      maxVisibleNavActions: narrow ? 5 : 8,
      maxVisibleUtilityActions: narrow ? 2 : 4,
    };
  }

  return {
    mode: "island",
    surfaceClass: "toolbar-surface",
    effectClass: expanded ? "refractive-edge" : "backdrop",
    primaryActionFamily: "navigation",
    utilityActionFamily: "compact-utility",
    statusFamily: expanded ? "cluster" : "inline",
    overflowFamily: platform === "mobile" ? "sheet" : "menu",
    slots: {
      brandSlot: slot(true, 100, 6),
      navSlot: slot(expanded, 90, 2),
      statusSlot: slot(true, 72, 3),
      utilitySlot: slot(true, 80, 1),
      overflowSlot: slot(true, 44, 4),
      commandSlot: slot(true, 84, 0),
    },
    maxVisibleNavActions: expanded ? (compact ? 5 : 8) : 0,
    maxVisibleUtilityActions: expanded ? (compact ? 2 : 3) : 2,
  };
};

