export type MotionProfile = "minimal" | "balanced" | "expressive" | "cinematic";

export type MotionFamily =
  | "navigation"
  | "toolbar"
  | "sheet"
  | "command"
  | "status"
  | "micro"
  | "hero"
  | "content";

export type MotionDegradationLevel =
  | "full"
  | "rich-reduced"
  | "composed-light"
  | "critical-only"
  | "static-safe";

type MotionSpring = {
  type: "spring";
  stiffness: number;
  damping: number;
  mass: number;
};

type MotionTransition = MotionSpring | { duration: number; ease: any };

type ThemeLike = {
  qol?: {
    reducedMotion?: boolean;
    motionProfile?: unknown;
  };
  animations?: {
    glowPulse?: boolean;
    floatEffect?: boolean;
    pageTransitions?: boolean;
    entryAnimations?: boolean;
    hoverLift?: boolean;
    rippleClick?: boolean;
    smoothTransitions?: boolean;
  };
  visual?: {
    animationSpeed?: number;
  };
};

type MotionProfileSetterThemeLike = {
  setQOL: (patch: Record<string, unknown>) => void;
  setAnimations: (patch: Record<string, unknown>) => void;
  setVisual: (patch: Record<string, unknown>) => void;
};

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
  degradationLevel: MotionDegradationLevel;
};

export type MotionFamilyRuntime = {
  family: MotionFamily;
  transition: MotionTransition;
  initial: false | Record<string, number>;
  animate: Record<string, number>;
  exit?: Record<string, number>;
  hoverLiftPx: number;
  hoverScale: number;
  pressScale: number;
  complexity: "rich" | "standard" | "light" | "minimal" | "none";
};

export type MotionChoreography = {
  family: MotionFamily;
  pattern:
    | "stagger"
    | "cascade"
    | "settle"
    | "handoff"
    | "interruptible-enter"
    | "non-interruptible-exit";
  staggerMs: number;
  cascadeMs: number;
  settleMs: number;
  interruptPolicy: "interruptible" | "settle-before-interrupt" | "non-interruptible-exit";
};

export type MaterialSettleTransition = {
  family: MotionFamily;
  transform: {
    durationMs: number;
    ease: string;
  };
  material: {
    durationMs: number;
    delayMs: number;
    ease: string;
  };
  opacity: {
    durationMs: number;
    delayMs: number;
    ease: string;
  };
};

export type SheetDetent = "collapsed" | "mid" | "expanded";

export type SheetDetentTransition = {
  from: SheetDetent;
  to: SheetDetent;
  velocity: number;
  durationMs: number;
  ease: string;
  allowRubberBand: boolean;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const isMotionProfile = (value: unknown): value is MotionProfile =>
  value === "minimal" ||
  value === "balanced" ||
  value === "expressive" ||
  value === "cinematic";

const normalizeDegradationLevel = (
  value: MotionDegradationLevel | undefined,
): MotionDegradationLevel => {
  if (
    value === "full" ||
    value === "rich-reduced" ||
    value === "composed-light" ||
    value === "critical-only" ||
    value === "static-safe"
  ) {
    return value;
  }
  return "full";
};

export function resolveMotionProfile(
  theme: ThemeLike,
  opts?: { lowPowerMode?: boolean },
): MotionProfile {
  const requested = theme.qol?.motionProfile;
  if (isMotionProfile(requested)) return requested;
  if ((opts?.lowPowerMode ?? false) || theme.qol?.reducedMotion) return "minimal";
  if (theme.animations?.glowPulse || theme.animations?.floatEffect) {
    return "cinematic";
  }
  if ((theme.visual?.animationSpeed ?? 1) >= 1.25) return "expressive";
  return "balanced";
}

const applyDegradationToRuntime = (
  runtime: MotionRuntime,
  degradationLevel: MotionDegradationLevel,
): MotionRuntime => {
  if (degradationLevel === "full") return runtime;
  if (degradationLevel === "rich-reduced") {
    return {
      ...runtime,
      regularMs: Math.round(runtime.regularMs * 0.94),
      quickMs: Math.round(runtime.quickMs * 0.92),
      hoverLiftPx: runtime.hoverLiftPx * 0.8,
      hoverExtraScale: runtime.hoverExtraScale * 0.65,
      degradationLevel,
    };
  }
  if (degradationLevel === "composed-light") {
    return {
      ...runtime,
      regularMs: Math.round(runtime.regularMs * 0.84),
      quickMs: Math.round(runtime.quickMs * 0.82),
      hoverLiftPx: runtime.hoverLiftPx * 0.45,
      hoverScale: 1 + (runtime.hoverScale - 1) * 0.5,
      hoverExtraScale: runtime.hoverExtraScale * 0.4,
      pressScale: Math.min(0.995, runtime.pressScale + 0.01),
      degradationLevel,
    };
  }
  if (degradationLevel === "critical-only") {
    return {
      ...runtime,
      regularMs: Math.max(90, Math.round(runtime.regularMs * 0.72)),
      quickMs: Math.max(75, Math.round(runtime.quickMs * 0.7)),
      hoverLiftPx: 0,
      hoverScale: 1,
      hoverExtraScale: 0,
      pressScale: 0.992,
      pageInitial: false,
      pageExit: undefined,
      pageTransition: { duration: 0.12, ease: "easeOut" },
      degradationLevel,
    };
  }
  return {
    ...runtime,
    reduced: true,
    quickMs: 95,
    regularMs: 95,
    hoverLiftPx: 0,
    hoverScale: 1,
    hoverExtraScale: 0,
    pressScale: 0.995,
    pageInitial: false,
    pageExit: undefined,
    pageTransition: { duration: 0.1, ease: "easeOut" },
    degradationLevel: "static-safe",
  };
};

export function buildMotionRuntime(
  theme: ThemeLike,
  opts?: { lowPowerMode?: boolean; degradationLevel?: MotionDegradationLevel },
): MotionRuntime {
  const degradationLevel = normalizeDegradationLevel(opts?.degradationLevel);
  const profile = resolveMotionProfile(theme, opts);
  const reduced = profile === "minimal" || theme.qol?.reducedMotion;
  const speed = clamp(theme.visual?.animationSpeed ?? 1, 0.1, 3);

  if (reduced) {
    const ms = Math.max(80, Math.round(120 / speed));
    return applyDegradationToRuntime(
      {
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
        degradationLevel,
      },
      degradationLevel,
    );
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

  return applyDegradationToRuntime(
    {
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
      degradationLevel,
    },
    degradationLevel,
  );
}

export function getMotionFamilyRuntime(
  runtime: MotionRuntime,
  family: MotionFamily,
): MotionFamilyRuntime {
  if (runtime.degradationLevel === "static-safe") {
    return {
      family,
      transition: { duration: 0.1, ease: "easeOut" },
      initial: false,
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0 },
      hoverLiftPx: 0,
      hoverScale: 1,
      pressScale: 0.995,
      complexity: "none",
    };
  }

  if (runtime.reduced || runtime.degradationLevel === "critical-only") {
    return {
      family,
      transition: { duration: Math.max(0.08, runtime.quickMs / 1000), ease: "easeOut" },
      initial: false,
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0 },
      hoverLiftPx: 0,
      hoverScale: 1,
      pressScale: 0.99,
      complexity: "minimal",
    };
  }

  const familyMap: Record<
    MotionFamily,
    {
      durationFactor: number;
      hoverLiftFactor: number;
      hoverScaleAdd: number;
      pressScale: number;
      initial?: Record<string, number> | false;
      exit?: Record<string, number>;
      useSpring?: boolean;
      complexity: "rich" | "standard" | "light";
    }
  > = {
    navigation: {
      durationFactor: 1,
      hoverLiftFactor: 1,
      hoverScaleAdd: 0.002,
      pressScale: runtime.pressScale,
      initial: runtime.pageInitial,
      exit: runtime.pageExit,
      useSpring: true,
      complexity: "standard",
    },
    toolbar: {
      durationFactor: 0.85,
      hoverLiftFactor: 0.65,
      hoverScaleAdd: 0.0015,
      pressScale: Math.min(0.99, runtime.pressScale + 0.005),
      initial: { opacity: 0, y: 6, scale: 0.996 },
      exit: { opacity: 0, y: -6, scale: 1.004 },
      useSpring: true,
      complexity: "standard",
    },
    sheet: {
      durationFactor: 1.08,
      hoverLiftFactor: 0.2,
      hoverScaleAdd: 0,
      pressScale: Math.min(0.995, runtime.pressScale + 0.01),
      initial: { opacity: 0, y: 12, scale: 0.996 },
      exit: { opacity: 0, y: 8, scale: 0.998 },
      useSpring: false,
      complexity: "light",
    },
    command: {
      durationFactor: 0.92,
      hoverLiftFactor: 0.5,
      hoverScaleAdd: 0.0025,
      pressScale: runtime.pressScale,
      initial: { opacity: 0, y: 8, scale: 0.994 },
      exit: { opacity: 0, y: -8, scale: 1.002 },
      useSpring: true,
      complexity: "standard",
    },
    status: {
      durationFactor: 0.72,
      hoverLiftFactor: 0.3,
      hoverScaleAdd: 0.001,
      pressScale: Math.min(0.995, runtime.pressScale + 0.012),
      initial: { opacity: 0 },
      exit: { opacity: 0 },
      useSpring: false,
      complexity: "light",
    },
    micro: {
      durationFactor: 0.62,
      hoverLiftFactor: 0.45,
      hoverScaleAdd: 0.0012,
      pressScale: Math.min(0.995, runtime.pressScale + 0.01),
      initial: false,
      exit: undefined,
      useSpring: false,
      complexity: "light",
    },
    hero: {
      durationFactor: 1.15,
      hoverLiftFactor: 1.12,
      hoverScaleAdd: 0.003,
      pressScale: runtime.pressScale,
      initial: { opacity: 0, y: 14, scale: 0.992 },
      exit: { opacity: 0, y: -10, scale: 1.006 },
      useSpring: true,
      complexity: "rich",
    },
    content: {
      durationFactor: 0.92,
      hoverLiftFactor: 0.28,
      hoverScaleAdd: 0.0008,
      pressScale: Math.min(0.996, runtime.pressScale + 0.012),
      initial: { opacity: 0, y: 6 },
      exit: { opacity: 0, y: -4 },
      useSpring: false,
      complexity: "light",
    },
  };

  const cfg = familyMap[family];
  const durationSec = Math.max(0.1, (runtime.regularMs * cfg.durationFactor) / 1000);
  const complexity =
    runtime.degradationLevel === "full"
      ? cfg.complexity
      : runtime.degradationLevel === "rich-reduced"
        ? cfg.complexity === "rich"
          ? "standard"
          : cfg.complexity
        : "light";

  return {
    family,
    transition: cfg.useSpring
      ? runtime.spring
      : { duration: durationSec, ease: runtime.settleEase },
    initial: cfg.initial ?? runtime.pageInitial,
    animate: runtime.pageAnimate,
    exit: cfg.exit ?? runtime.pageExit,
    hoverLiftPx: runtime.hoverLiftPx * cfg.hoverLiftFactor,
    hoverScale: runtime.hoverScale + cfg.hoverScaleAdd,
    pressScale: cfg.pressScale,
    complexity,
  };
}

export function buildMotionFamilyMap(
  runtime: MotionRuntime,
): Record<MotionFamily, MotionFamilyRuntime> {
  return {
    navigation: getMotionFamilyRuntime(runtime, "navigation"),
    toolbar: getMotionFamilyRuntime(runtime, "toolbar"),
    sheet: getMotionFamilyRuntime(runtime, "sheet"),
    command: getMotionFamilyRuntime(runtime, "command"),
    status: getMotionFamilyRuntime(runtime, "status"),
    micro: getMotionFamilyRuntime(runtime, "micro"),
    hero: getMotionFamilyRuntime(runtime, "hero"),
    content: getMotionFamilyRuntime(runtime, "content"),
  };
}

export const resolveMotionChoreography = (
  runtime: MotionRuntime,
  family: MotionFamily,
): MotionChoreography => {
  const familyRuntime = getMotionFamilyRuntime(runtime, family);
  const baseMs = Math.max(90, runtime.regularMs);
  const complexity = familyRuntime.complexity;
  const settleMs =
    complexity === "rich"
      ? Math.round(baseMs * 0.95)
      : complexity === "standard"
        ? Math.round(baseMs * 0.78)
        : complexity === "light"
          ? Math.round(baseMs * 0.64)
          : Math.round(baseMs * 0.52);
  const staggerMs = complexity === "rich" ? 46 : complexity === "standard" ? 34 : 22;
  const cascadeMs = complexity === "rich" ? 62 : complexity === "standard" ? 48 : 30;
  const interruptPolicy =
    complexity === "none"
      ? "settle-before-interrupt"
      : family === "sheet"
        ? "non-interruptible-exit"
        : "interruptible";
  const pattern =
    family === "navigation"
      ? "handoff"
      : family === "hero"
        ? "cascade"
        : family === "status"
          ? "settle"
          : "stagger";
  return {
    family,
    pattern,
    staggerMs,
    cascadeMs,
    settleMs,
    interruptPolicy,
  };
};

export const resolveMaterialSettleTransition = (
  runtime: MotionRuntime,
  family: MotionFamily,
): MaterialSettleTransition => {
  const familyRuntime = getMotionFamilyRuntime(runtime, family);
  const baseMs =
    "duration" in familyRuntime.transition
      ? Math.round(familyRuntime.transition.duration * 1000)
      : runtime.regularMs;

  const transformMs = Math.max(90, Math.round(baseMs * 0.84));
  const settleDelay =
    runtime.degradationLevel === "full"
      ? 18
      : runtime.degradationLevel === "rich-reduced"
        ? 12
        : runtime.degradationLevel === "composed-light"
          ? 8
          : 0;
  const materialMs = Math.max(95, Math.round(baseMs * 0.92));
  const opacityMs = Math.max(75, Math.round(baseMs * 0.66));
  const ease = runtime.settleEase || "cubic-bezier(0.22, 1, 0.36, 1)";

  return {
    family,
    transform: { durationMs: transformMs, ease },
    material: { durationMs: materialMs, delayMs: settleDelay, ease },
    opacity: {
      durationMs: opacityMs,
      delayMs: Math.max(0, settleDelay - 4),
      ease,
    },
  };
};

export const resolveSheetDetentTransition = (options: {
  runtime: MotionRuntime;
  from: SheetDetent;
  to: SheetDetent;
  velocity?: number;
}): SheetDetentTransition => {
  const { runtime, from, to } = options;
  const velocity = Math.max(-5, Math.min(5, options.velocity ?? 0));
  const direction = to === from ? 0 : to === "expanded" ? 1 : to === "collapsed" ? -1 : 0;
  const velocityBias = Math.max(0.78, 1 - Math.min(0.3, Math.abs(velocity) * 0.07));
  const familyRuntime = getMotionFamilyRuntime(runtime, "sheet");
  const baseMs =
    "duration" in familyRuntime.transition
      ? Math.round(familyRuntime.transition.duration * 1000)
      : runtime.regularMs;
  const durationMs = Math.max(
    105,
    Math.round(baseMs * (direction === 0 ? 0.72 : 0.92) * velocityBias),
  );
  const ease =
    direction === 0
      ? "cubic-bezier(0.22, 1, 0.36, 1)"
      : direction > 0
        ? "cubic-bezier(0.16, 1, 0.3, 1)"
        : "cubic-bezier(0.2, 0.8, 0.28, 1)";

  return {
    from,
    to,
    velocity,
    durationMs,
    ease,
    allowRubberBand:
      runtime.degradationLevel === "full" ||
      runtime.degradationLevel === "rich-reduced",
  };
};

export const resolveStaggerWindow = (
  runtime: MotionRuntime,
  count: number,
  opts?: { maxItems?: number },
): { itemDelayMs: number; maxAnimatedItems: number; totalMs: number } => {
  const maxItems = Math.max(1, opts?.maxItems ?? 10);
  const safeCount = Math.max(0, Math.min(count, maxItems));
  const baseDelay =
    runtime.degradationLevel === "full"
      ? 28
      : runtime.degradationLevel === "rich-reduced"
        ? 22
        : runtime.degradationLevel === "composed-light"
          ? 16
          : 10;
  const speedScale = Math.max(0.68, Math.min(1.35, 170 / Math.max(runtime.quickMs, 90)));
  const itemDelayMs = Math.max(8, Math.round(baseDelay / speedScale));
  const totalMs = safeCount <= 1 ? 0 : (safeCount - 1) * itemDelayMs;

  return {
    itemDelayMs,
    maxAnimatedItems: safeCount,
    totalMs,
  };
};

export function applyMotionProfile(
  theme: MotionProfileSetterThemeLike,
  profile: MotionProfile,
): void {
  if (profile === "minimal") {
    theme.setQOL({ reducedMotion: true, motionProfile: "minimal" });
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
    theme.setQOL({ reducedMotion: false, motionProfile: "balanced" });
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
    theme.setQOL({ reducedMotion: false, motionProfile: "expressive" });
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

  theme.setQOL({ reducedMotion: false, motionProfile: "cinematic" });
  theme.setVisual({ animationSpeed: 1.35 });
  theme.setAnimations({
    entryAnimations: true,
    pageTransitions: true,
    hoverLift: true,
    rippleClick: true,
    glowPulse: true,
    smoothTransitions: true,
    floatEffect: true,
  });
}
