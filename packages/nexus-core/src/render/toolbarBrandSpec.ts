import type { ToolbarSceneMode } from "./toolbarSceneSpec";

export type ToolbarBrandContext = {
  mode: ToolbarSceneMode;
  width: number;
  compact: boolean;
  expanded: boolean;
  platform: "desktop" | "mobile";
};

export type ToolbarBrandSpec = {
  mode: ToolbarSceneMode;
  monogram: string;
  wordmark: string;
  iconSize: number;
  logoSize: number;
  gap: number;
  paddingX: number;
  radius: number;
  showWordmark: boolean;
  showDescriptor: boolean;
  descriptor: string;
};

export const resolveToolbarBrandSpec = (
  context: ToolbarBrandContext,
): ToolbarBrandSpec => {
  const { mode, width, compact, expanded, platform } = context;

  if (mode === "spotlight") {
    return {
      mode,
      monogram: "NX",
      wordmark: "Nexus Search",
      iconSize: 11,
      logoSize: compact ? 22 : 24,
      gap: 7,
      paddingX: compact ? 8 : 10,
      radius: compact ? 8 : 10,
      showWordmark: !compact,
      showDescriptor: !compact && width > (platform === "mobile" ? 460 : 640),
      descriptor: "Command Focus",
    };
  }

  if (mode === "full-width") {
    return {
      mode,
      monogram: "NX",
      wordmark: "Nexus Workspace",
      iconSize: compact ? 11 : 12,
      logoSize: compact ? 24 : 28,
      gap: compact ? 8 : 10,
      paddingX: compact ? 8 : 11,
      radius: compact ? 8 : 10,
      showWordmark: true,
      showDescriptor: width > (platform === "mobile" ? 620 : 900),
      descriptor: "Work Rail",
    };
  }

  return {
    mode,
    monogram: "NX",
    wordmark: expanded ? "Nexus Dock" : "Nexus",
    iconSize: compact ? 10 : 11,
    logoSize: compact ? 24 : 26,
    gap: compact ? 7 : 9,
    paddingX: compact ? 8 : 10,
    radius: compact ? 8 : 10,
    showWordmark: true,
    showDescriptor: expanded && width > (platform === "mobile" ? 760 : 980),
    descriptor: "Command Dock",
  };
};

