export type RenderPlatform = "desktop" | "mobile";

export type RenderTier =
  | "desktop-performance"
  | "desktop-balanced"
  | "mobile-performance"
  | "mobile-balanced"
  | "mobile-constrained";

export type RenderProfileContext = {
  platform: RenderPlatform;
  lowPowerMode?: boolean;
  reducedMotion?: boolean;
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
};

export type RenderProfile = {
  platform: RenderPlatform;
  tier: RenderTier;
  lowPowerMode: boolean;
  reducedMotion: boolean;
  budgetScale: number;
  frameBudgetMs: number;
  maxDynamicSurfaces: number;
  maxShaderSurfaces: number;
  maxLiquidBursts: number;
  maxBackdropSurfaces: number;
};

const DEFAULT_DESKTOP_PROFILE: RenderProfile = {
  platform: "desktop",
  tier: "desktop-balanced",
  lowPowerMode: false,
  reducedMotion: false,
  budgetScale: 0.88,
  frameBudgetMs: 16.6,
  maxDynamicSurfaces: 18,
  maxShaderSurfaces: 2,
  maxLiquidBursts: 4,
  maxBackdropSurfaces: 12,
};

const DEFAULT_MOBILE_PROFILE: RenderProfile = {
  platform: "mobile",
  tier: "mobile-balanced",
  lowPowerMode: false,
  reducedMotion: false,
  budgetScale: 0.72,
  frameBudgetMs: 16.6,
  maxDynamicSurfaces: 10,
  maxShaderSurfaces: 1,
  maxLiquidBursts: 3,
  maxBackdropSurfaces: 8,
};

const mergeProfile = (
  base: RenderProfile,
  patch: Partial<RenderProfile>,
): RenderProfile => ({
  ...base,
  ...patch,
  platform: base.platform,
});

export const resolveRenderProfile = (
  context: RenderProfileContext,
): RenderProfile => {
  const platform: RenderPlatform =
    context.platform === "mobile" ? "mobile" : "desktop";
  const lowPowerMode = Boolean(context.lowPowerMode);
  const reducedMotion = Boolean(context.reducedMotion);
  const cores = Math.max(1, Math.floor(context.hardwareConcurrency ?? 8));
  const memoryGb = Math.max(1, Math.floor(context.deviceMemoryGb ?? 8));

  const constrained = lowPowerMode || reducedMotion || cores <= 4 || memoryGb <= 4;
  const highHeadroom = cores >= (platform === "mobile" ? 8 : 10) && memoryGb >= 8;

  if (platform === "desktop") {
    if (constrained) {
      return mergeProfile(DEFAULT_DESKTOP_PROFILE, {
        tier: "desktop-balanced",
        lowPowerMode,
        reducedMotion,
        budgetScale: 0.66,
        frameBudgetMs: 16.6,
        maxDynamicSurfaces: 12,
        maxShaderSurfaces: 1,
        maxLiquidBursts: 2,
        maxBackdropSurfaces: 8,
      });
    }

    if (highHeadroom) {
      return mergeProfile(DEFAULT_DESKTOP_PROFILE, {
        tier: "desktop-performance",
        lowPowerMode,
        reducedMotion,
        budgetScale: 1.06,
        frameBudgetMs: 16.6,
        maxDynamicSurfaces: 24,
        maxShaderSurfaces: 4,
        maxLiquidBursts: 7,
        maxBackdropSurfaces: 16,
      });
    }

    return mergeProfile(DEFAULT_DESKTOP_PROFILE, {
      lowPowerMode,
      reducedMotion,
    });
  }

  if (constrained) {
    return mergeProfile(DEFAULT_MOBILE_PROFILE, {
      tier: "mobile-constrained",
      lowPowerMode,
      reducedMotion,
      budgetScale: 0.5,
      frameBudgetMs: 20,
      maxDynamicSurfaces: 6,
      maxShaderSurfaces: 1,
      maxLiquidBursts: 1,
      maxBackdropSurfaces: 5,
    });
  }

  if (highHeadroom) {
    return mergeProfile(DEFAULT_MOBILE_PROFILE, {
      tier: "mobile-performance",
      lowPowerMode,
      reducedMotion,
      budgetScale: 0.84,
      frameBudgetMs: 16.6,
      maxDynamicSurfaces: 14,
      maxShaderSurfaces: 2,
      maxLiquidBursts: 4,
      maxBackdropSurfaces: 10,
    });
  }

  return mergeProfile(DEFAULT_MOBILE_PROFILE, {
    lowPowerMode,
    reducedMotion,
  });
};

