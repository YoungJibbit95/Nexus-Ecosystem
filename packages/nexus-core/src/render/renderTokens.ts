import type { RenderProfile } from "./renderProfile";

export type MotionTokenInput = {
  quickMs?: number;
  regularMs?: number;
  hoverEase?: string;
  pressEase?: string;
  settleEase?: string;
  hoverLiftPx?: number;
  hoverScale?: number;
  pressScale?: number;
  hoverExtraScale?: number;
};

export type RenderTokenMap = Record<string, string>;

export const buildRenderTokens = (
  profile: RenderProfile,
  motion?: MotionTokenInput,
): RenderTokenMap => {
  const tokens: RenderTokenMap = {
    "--nx-render-tier": profile.tier,
    "--nx-render-budget-scale": String(profile.budgetScale),
    "--nx-render-frame-budget-ms": String(profile.frameBudgetMs),
    "--nx-render-max-dynamic": String(profile.maxDynamicSurfaces),
    "--nx-render-max-shader": String(profile.maxShaderSurfaces),
    "--nx-render-max-liquid-bursts": String(profile.maxLiquidBursts),
    "--nx-render-max-backdrop": String(profile.maxBackdropSurfaces),
    "--nx-render-low-power": profile.lowPowerMode ? "1" : "0",
    "--nx-render-motion-reduced": profile.reducedMotion ? "1" : "0",
  };

  if (typeof motion?.quickMs === "number") {
    tokens["--nx-motion-quick"] = `${Math.max(20, Math.round(motion.quickMs))}ms`;
  }
  if (typeof motion?.regularMs === "number") {
    tokens["--nx-motion-regular"] = `${Math.max(30, Math.round(motion.regularMs))}ms`;
  }
  if (motion?.hoverEase) {
    tokens["--nx-motion-hover-ease"] = motion.hoverEase;
  }
  if (motion?.pressEase) {
    tokens["--nx-motion-press-ease"] = motion.pressEase;
  }
  if (motion?.settleEase) {
    tokens["--nx-motion-settle-ease"] = motion.settleEase;
  }
  if (typeof motion?.hoverLiftPx === "number") {
    tokens["--nx-hover-lift"] = `${motion.hoverLiftPx}px`;
  }
  if (typeof motion?.hoverScale === "number") {
    tokens["--nx-hover-scale"] = `${motion.hoverScale}`;
  }
  if (typeof motion?.pressScale === "number") {
    tokens["--nx-press-scale"] = `${motion.pressScale}`;
  }
  if (typeof motion?.hoverExtraScale === "number") {
    tokens["--nx-hover-extra-scale"] = `${motion.hoverExtraScale}`;
  }

  return tokens;
};

export const commitRenderTokens = (
  target: HTMLElement | null | undefined,
  tokens: RenderTokenMap,
): void => {
  if (!target) return;
  for (const [key, value] of Object.entries(tokens)) {
    target.style.setProperty(key, value);
  }
};

