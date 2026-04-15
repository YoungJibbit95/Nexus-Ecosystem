import type { RenderProfile } from "./renderProfile";

export type SurfaceClass =
  | "shell-surface"
  | "panel-surface"
  | "modal-surface"
  | "toolbar-surface"
  | "ios-surface"
  | "liquid-element"
  | "hero-surface"
  | "utility-surface";

export type EffectClass =
  | "static"
  | "backdrop"
  | "refractive-edge"
  | "liquid-interactive"
  | "shader-burst"
  | "status-highlight";

export type SurfaceRecipe = {
  surfaceClass: SurfaceClass;
  effectClass: EffectClass;
  blurBudget: number;
  saturationBudget: number;
  radiusLadder: "soft" | "regular" | "bold";
  shadowLadder: "flat" | "ambient" | "elevated";
  dynamicEligible: boolean;
  shaderEligible: boolean;
  burstEligible: boolean;
};

const SURFACE_BASE: Record<
  SurfaceClass,
  Omit<
    SurfaceRecipe,
    "surfaceClass" | "effectClass" | "dynamicEligible" | "shaderEligible" | "burstEligible"
  >
> = {
  "shell-surface": {
    blurBudget: 0.8,
    saturationBudget: 0.88,
    radiusLadder: "soft",
    shadowLadder: "flat",
  },
  "panel-surface": {
    blurBudget: 1,
    saturationBudget: 1,
    radiusLadder: "regular",
    shadowLadder: "ambient",
  },
  "modal-surface": {
    blurBudget: 1.2,
    saturationBudget: 1.06,
    radiusLadder: "bold",
    shadowLadder: "elevated",
  },
  "toolbar-surface": {
    blurBudget: 1.15,
    saturationBudget: 1.08,
    radiusLadder: "regular",
    shadowLadder: "ambient",
  },
  "ios-surface": {
    blurBudget: 1.1,
    saturationBudget: 1.14,
    radiusLadder: "regular",
    shadowLadder: "ambient",
  },
  "liquid-element": {
    blurBudget: 0.95,
    saturationBudget: 1.18,
    radiusLadder: "soft",
    shadowLadder: "ambient",
  },
  "hero-surface": {
    blurBudget: 1.3,
    saturationBudget: 1.2,
    radiusLadder: "bold",
    shadowLadder: "elevated",
  },
  "utility-surface": {
    blurBudget: 0.75,
    saturationBudget: 0.95,
    radiusLadder: "soft",
    shadowLadder: "flat",
  },
};

const EFFECT_CAPABILITY: Record<
  EffectClass,
  Pick<SurfaceRecipe, "dynamicEligible" | "shaderEligible" | "burstEligible">
> = {
  static: {
    dynamicEligible: false,
    shaderEligible: false,
    burstEligible: false,
  },
  backdrop: {
    dynamicEligible: true,
    shaderEligible: false,
    burstEligible: false,
  },
  "refractive-edge": {
    dynamicEligible: true,
    shaderEligible: false,
    burstEligible: true,
  },
  "liquid-interactive": {
    dynamicEligible: true,
    shaderEligible: true,
    burstEligible: true,
  },
  "shader-burst": {
    dynamicEligible: true,
    shaderEligible: true,
    burstEligible: true,
  },
  "status-highlight": {
    dynamicEligible: true,
    shaderEligible: false,
    burstEligible: true,
  },
};

const TIER_SCALE: Record<RenderProfile["tier"], number> = {
  "desktop-performance": 1.1,
  "desktop-balanced": 1,
  "mobile-performance": 0.95,
  "mobile-balanced": 0.82,
  "mobile-constrained": 0.66,
};

export const resolveSurfaceRecipe = (
  surfaceClass: SurfaceClass,
  effectClass: EffectClass,
  profile: RenderProfile,
): SurfaceRecipe => {
  const base = SURFACE_BASE[surfaceClass] ?? SURFACE_BASE["panel-surface"];
  const capability = EFFECT_CAPABILITY[effectClass] ?? EFFECT_CAPABILITY.backdrop;
  const tierScale = TIER_SCALE[profile.tier] ?? 1;

  return {
    surfaceClass,
    effectClass,
    blurBudget: Number((base.blurBudget * tierScale).toFixed(3)),
    saturationBudget: Number((base.saturationBudget * tierScale).toFixed(3)),
    radiusLadder: base.radiusLadder,
    shadowLadder: base.shadowLadder,
    dynamicEligible: capability.dynamicEligible && !profile.reducedMotion,
    shaderEligible:
      capability.shaderEligible &&
      !profile.lowPowerMode &&
      !profile.reducedMotion &&
      profile.maxShaderSurfaces > 0,
    burstEligible: capability.burstEligible && !profile.reducedMotion,
  };
};

