import type {
  AnimationComplexity,
  MotionCapability,
  RenderSurfaceState,
  SurfaceMotionClass,
} from "./effectBudget";

export type TransformOwner = "surface" | "child" | "none";
export type PropertyOwner = "surface" | "child" | "none";

export type RenderMotionOwnership = {
  transformOwner: TransformOwner;
  filterOwner: PropertyOwner;
  opacityOwner: PropertyOwner;
};

export type RenderInvariantViolationCode =
  | "BOUNDS_INTEGRITY_MISSING_AREA_HINT"
  | "TRANSFORM_OWNER_CONFLICT"
  | "FILTER_OWNER_CONFLICT"
  | "OPACITY_OWNER_CONFLICT"
  | "HIDDEN_WITH_ACTIVE_INTERACTION"
  | "MOTION_CLASS_MISMATCH";

export type RenderInvariantViolation = {
  id: string;
  code: RenderInvariantViolationCode;
  severity: "info" | "warning" | "critical";
  message: string;
};

export const RENDER_MOTION_OWNERSHIP_SPEC = {
  renderEngineOwns: [
    "renderTier",
    "budgetAllocation",
    "surfaceCapabilities",
    "visibilityNormalization",
    "diagnostics",
  ],
  motionEngineOwns: [
    "motionFamilies",
    "timingProfiles",
    "springProfiles",
    "choreographyRules",
    "degradationBehavior",
  ],
  componentOwns: [
    "consumingResolvedCapability",
    "renderingFinalStyles",
    "forwardingInteractionSignals",
  ],
} as const;

const DEFAULT_OWNERSHIP: RenderMotionOwnership = {
  transformOwner: "surface",
  filterOwner: "surface",
  opacityOwner: "surface",
};

const VALID_MOTION_CLASS: Record<
  RenderSurfaceState["surfaceClass"],
  SurfaceMotionClass[]
> = {
  "shell-surface": ["navigation", "status", "content"],
  "panel-surface": ["content", "status", "sheet"],
  "modal-surface": ["sheet", "command", "hero"],
  "toolbar-surface": ["toolbar", "command", "status"],
  "ios-surface": ["content", "hero", "status"],
  "liquid-element": ["micro", "command", "status"],
  "hero-surface": ["hero", "navigation", "content"],
  "utility-surface": ["micro", "status", "command"],
};

const isInteractiveState = (state: RenderSurfaceState["interactionState"]) =>
  state === "active" || state === "focused";

const resolveOwnership = (
  surface: RenderSurfaceState,
): RenderMotionOwnership => ({
  transformOwner: surface.transformOwnerHint ?? DEFAULT_OWNERSHIP.transformOwner,
  filterOwner: surface.filterOwnerHint ?? DEFAULT_OWNERSHIP.filterOwner,
  opacityOwner: surface.opacityOwnerHint ?? DEFAULT_OWNERSHIP.opacityOwner,
});

export const evaluateRenderInvariantViolations = (
  surfaces: RenderSurfaceState[],
): RenderInvariantViolation[] => {
  if (!Array.isArray(surfaces) || surfaces.length === 0) return [];
  const violations: RenderInvariantViolation[] = [];

  for (const surface of surfaces) {
    const ownership = resolveOwnership(surface);

    if (!surface.areaHint || surface.areaHint <= 0) {
      violations.push({
        id: surface.id,
        code: "BOUNDS_INTEGRITY_MISSING_AREA_HINT",
        severity: "warning",
        message:
          "Surface has no valid areaHint; bounds and budget heuristics may drift.",
      });
    }

    if (ownership.transformOwner === "surface" && surface.transformOwnerHint === "child") {
      violations.push({
        id: surface.id,
        code: "TRANSFORM_OWNER_CONFLICT",
        severity: "critical",
        message:
          "Conflicting transform owner hints detected (surface and child).",
      });
    }

    if (ownership.filterOwner === "surface" && surface.filterOwnerHint === "child") {
      violations.push({
        id: surface.id,
        code: "FILTER_OWNER_CONFLICT",
        severity: "warning",
        message: "Conflicting filter owner hints detected (surface and child).",
      });
    }

    if (ownership.opacityOwner === "surface" && surface.opacityOwnerHint === "child") {
      violations.push({
        id: surface.id,
        code: "OPACITY_OWNER_CONFLICT",
        severity: "warning",
        message: "Conflicting opacity owner hints detected (surface and child).",
      });
    }

    if (surface.visibilityState === "hidden" && isInteractiveState(surface.interactionState)) {
      violations.push({
        id: surface.id,
        code: "HIDDEN_WITH_ACTIVE_INTERACTION",
        severity: "critical",
        message:
          "Hidden surface reports active/focused interaction; visibility and interaction state are inconsistent.",
      });
    }

    if (surface.motionClassHint) {
      const validSet = VALID_MOTION_CLASS[surface.surfaceClass] ?? [];
      if (!validSet.includes(surface.motionClassHint)) {
        violations.push({
          id: surface.id,
          code: "MOTION_CLASS_MISMATCH",
          severity: "info",
          message:
            `motionClassHint '${surface.motionClassHint}' is atypical for surfaceClass '${surface.surfaceClass}'.`,
        });
      }
    }
  }

  return violations;
};

export const resolveDefaultMotionCapability = (
  complexity: AnimationComplexity,
): MotionCapability => {
  if (complexity === "rich" || complexity === "standard") return "full";
  if (complexity === "light") return "composed-light";
  if (complexity === "minimal") return "critical-only";
  return "static-safe";
};
