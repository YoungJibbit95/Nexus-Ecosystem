import type { Theme } from "../store/themeStore";

export type MotionProfile = "minimal" | "balanced" | "expressive" | "cinematic";

type MotionSpring = {
  type: "spring";
  stiffness: number;
  damping: number;
  mass: number;
};

type MotionTransition = MotionSpring | { duration: number; ease: string };

export type MotionRuntime = {
  profile: MotionProfile;
  reduced: boolean;
  quickMs: number;
  regularMs: number;
  hoverEase: string;
  pressEase: string;
  settleEase: string;
  spring: MotionSpring;
  hoverSpring: MotionSpring;
  hoverLiftPx: number;
  hoverScale: number;
  hoverExtraScale: number;
  pressScale: number;
  pageInitial: false | Record<string, number>;
  pageAnimate: Record<string, number>;
  pageExit: undefined | Record<string, number>;
  pageTransition: MotionTransition;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const isMotionProfile = (value: unknown): value is MotionProfile =>
  value === "minimal" ||
  value === "balanced" ||
  value === "expressive" ||
  value === "cinematic";

export function resolveMotionProfile(
  theme: Theme,
  opts?: { lowPowerMode?: boolean },
): MotionProfile {
  const requested = (theme.qol as any)?.motionProfile;
  if (isMotionProfile(requested)) return requested;
  if ((opts?.lowPowerMode ?? false) || theme.qol?.reducedMotion) return "minimal";
  if (theme.animations?.glowPulse || (theme.animations as any)?.floatEffect) {
    return "cinematic";
  }
  if ((theme.visual?.animationSpeed ?? 1) >= 1.25) return "expressive";
  return "balanced";
}

export function buildMotionRuntime(
  theme: Theme,
  opts?: { lowPowerMode?: boolean },
): MotionRuntime {
  const profile = resolveMotionProfile(theme, opts);
  const reduced = profile === "minimal" || theme.qol?.reducedMotion;
  const speed = clamp(theme.visual?.animationSpeed ?? 1, 0.1, 3);

  if (reduced) {
    const ms = Math.max(80, Math.round(120 / speed));
    return {
      profile,
      reduced: true,
      quickMs: ms,
      regularMs: ms,
      hoverEase: "ease-out",
      pressEase: "ease-out",
      settleEase: "ease-out",
      spring: { type: "spring", stiffness: 260, damping: 36, mass: 1 },
      hoverSpring: { type: "spring", stiffness: 260, damping: 36, mass: 1 },
      hoverLiftPx: 0,
      hoverScale: 1,
      hoverExtraScale: 0,
      pressScale: 0.99,
      pageInitial: false,
      pageAnimate: { opacity: 1 },
      pageExit: undefined,
      pageTransition: { duration: ms / 1000, ease: "easeOut" },
    };
  }

  const profileMap: Record<
    Exclude<MotionProfile, "minimal">,
    {
      quickBase: number;
      regularBase: number;
      hoverLiftPx: number;
      hoverScale: number;
      hoverExtraScale: number;
      pressScale: number;
      hoverEase: string;
      pressEase: string;
      settleEase: string;
      spring: MotionSpring;
      hoverSpring: MotionSpring;
      pageInitial: Record<string, number>;
      pageExit: Record<string, number>;
    }
  > = {
    balanced: {
      quickBase: 170,
      regularBase: 210,
      hoverLiftPx: 2.5,
      hoverScale: 1.007,
      hoverExtraScale: 0.006,
      pressScale: 0.985,
      hoverEase: "cubic-bezier(0.2, 0.86, 0.3, 1)",
      pressEase: "cubic-bezier(0.25, 1, 0.5, 1)",
      settleEase: "cubic-bezier(0.22, 1, 0.36, 1)",
      spring: { type: "spring", stiffness: 280, damping: 28, mass: 1 },
      hoverSpring: { type: "spring", stiffness: 250, damping: 20, mass: 0.92 },
      pageInitial: { opacity: 0, y: 8 },
      pageExit: { opacity: 0, y: -8 },
    },
    expressive: {
      quickBase: 190,
      regularBase: 230,
      hoverLiftPx: 4,
      hoverScale: 1.012,
      hoverExtraScale: 0.007,
      pressScale: 0.978,
      hoverEase: "cubic-bezier(0.18, 0.94, 0.24, 1.02)",
      pressEase: "cubic-bezier(0.2, 1, 0.38, 1)",
      settleEase: "cubic-bezier(0.18, 1, 0.28, 1)",
      spring: { type: "spring", stiffness: 300, damping: 25, mass: 0.95 },
      hoverSpring: { type: "spring", stiffness: 270, damping: 19, mass: 0.88 },
      pageInitial: { opacity: 0, y: 12, scale: 0.995 },
      pageExit: { opacity: 0, y: -10, scale: 1.005 },
    },
    cinematic: {
      quickBase: 210,
      regularBase: 255,
      hoverLiftPx: 5,
      hoverScale: 1.016,
      hoverExtraScale: 0.008,
      pressScale: 0.972,
      hoverEase: "cubic-bezier(0.14, 0.95, 0.18, 1.05)",
      pressEase: "cubic-bezier(0.18, 1, 0.35, 1)",
      settleEase: "cubic-bezier(0.16, 1, 0.22, 1)",
      spring: { type: "spring", stiffness: 315, damping: 23, mass: 0.92 },
      hoverSpring: { type: "spring", stiffness: 285, damping: 17, mass: 0.84 },
      pageInitial: { opacity: 0, y: 14, scale: 0.992 },
      pageExit: { opacity: 0, y: -12, scale: 1.008 },
    },
  };

  const cfg = profileMap[profile as Exclude<MotionProfile, "minimal">];
  const quickMs = Math.max(95, Math.round(cfg.quickBase / speed));
  const regularMs = Math.max(125, Math.round(cfg.regularBase / speed));

  return {
    profile,
    reduced: false,
    quickMs,
    regularMs,
    hoverEase: cfg.hoverEase,
    pressEase: cfg.pressEase,
    settleEase: cfg.settleEase,
    spring: cfg.spring,
    hoverSpring: cfg.hoverSpring,
    hoverLiftPx: cfg.hoverLiftPx,
    hoverScale: cfg.hoverScale,
    hoverExtraScale: cfg.hoverExtraScale,
    pressScale: cfg.pressScale,
    pageInitial: theme.animations?.pageTransitions ? cfg.pageInitial : false,
    pageAnimate: { opacity: 1, y: 0, scale: 1 },
    pageExit: theme.animations?.pageTransitions ? cfg.pageExit : undefined,
    pageTransition: cfg.spring,
  };
}

export function applyMotionProfile(
  theme: Pick<Theme, "setQOL" | "setAnimations" | "setVisual">,
  profile: MotionProfile,
): void {
  if (profile === "minimal") {
    theme.setQOL({ reducedMotion: true, motionProfile: "minimal" } as any);
    theme.setVisual({ animationSpeed: 0.9 });
    theme.setAnimations({
      entryAnimations: false,
      pageTransitions: false,
      hoverLift: false,
      rippleClick: false,
      glowPulse: false,
      smoothTransitions: true,
    });
    return;
  }

  if (profile === "balanced") {
    theme.setQOL({ reducedMotion: false, motionProfile: "balanced" } as any);
    theme.setVisual({ animationSpeed: 1 });
    theme.setAnimations({
      entryAnimations: true,
      pageTransitions: true,
      hoverLift: true,
      rippleClick: true,
      glowPulse: false,
      smoothTransitions: true,
    });
    return;
  }

  if (profile === "expressive") {
    theme.setQOL({ reducedMotion: false, motionProfile: "expressive" } as any);
    theme.setVisual({ animationSpeed: 1.2 });
    theme.setAnimations({
      entryAnimations: true,
      pageTransitions: true,
      hoverLift: true,
      rippleClick: true,
      glowPulse: true,
      smoothTransitions: true,
    });
    return;
  }

  theme.setQOL({ reducedMotion: false, motionProfile: "cinematic" } as any);
  theme.setVisual({ animationSpeed: 1.35 });
  theme.setAnimations({
    entryAnimations: true,
    pageTransitions: true,
    hoverLift: true,
    rippleClick: true,
    glowPulse: true,
    smoothTransitions: true,
    floatEffect: true,
  } as any);
}
