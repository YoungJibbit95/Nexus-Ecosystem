import {
  getMotionFamilyRuntime,
  resolveMotionChoreography,
  type MotionFamily,
  type MotionFamilyRuntime,
  type MotionRuntime,
} from "../motion/motionEngine";
import type {
  AnimationComplexity,
  MotionCapability,
  RenderSurfaceDecision,
  SurfaceMotionClass,
} from "./effectBudget";

const SURFACE_TO_FAMILY: Record<SurfaceMotionClass, MotionFamily> = {
  navigation: "navigation",
  toolbar: "toolbar",
  sheet: "sheet",
  command: "command",
  status: "status",
  micro: "micro",
  hero: "hero",
  content: "content",
};

const COMPLEXITY_WEIGHT: Record<AnimationComplexity, number> = {
  rich: 1,
  standard: 0.9,
  light: 0.76,
  minimal: 0.58,
  none: 0.4,
};

const CAPABILITY_WEIGHT: Record<MotionCapability, number> = {
  full: 1,
  "rich-reduced": 0.92,
  "composed-light": 0.8,
  "critical-only": 0.62,
  "static-safe": 0.52,
};

const estimateTransitionDurationMs = (
  transition: MotionFamilyRuntime["transition"],
  complexity: AnimationComplexity,
  capability: MotionCapability,
): number => {
  if ("duration" in transition) {
    return Math.round(transition.duration * 1000);
  }
  const springBase =
    210 -
    Math.min(80, Math.round((transition.damping ?? 24) * 1.2)) +
    Math.min(48, Math.round((transition.mass ?? 1) * 22));
  return Math.round(
    springBase *
      COMPLEXITY_WEIGHT[complexity] *
      CAPABILITY_WEIGHT[capability],
  );
};

const resolveCssEase = (
  transition: MotionFamilyRuntime["transition"],
): string => {
  if ("ease" in transition && typeof transition.ease === "string") {
    return transition.ease;
  }
  return "cubic-bezier(0.22, 1, 0.36, 1)";
};

export type SurfaceMotionRuntime = {
  family: MotionFamily;
  capability: MotionCapability;
  complexity: AnimationComplexity;
  transition: MotionFamilyRuntime["transition"];
  initial: MotionFamilyRuntime["initial"];
  animate: MotionFamilyRuntime["animate"];
  exit: MotionFamilyRuntime["exit"];
  hoverLiftPx: number;
  hoverScale: number;
  pressScale: number;
  allowHover: boolean;
  allowEntry: boolean;
  allowStagger: boolean;
  interruptPolicy: ReturnType<typeof resolveMotionChoreography>["interruptPolicy"];
  choreographyPattern: ReturnType<typeof resolveMotionChoreography>["pattern"];
  timings: {
    transformMs: number;
    materialMs: number;
    quickMs: number;
    regularMs: number;
    settleMs: number;
    materialDelayMs: number;
    easing: string;
    framerEase: [number, number, number, number] | "linear" | "easeIn" | "easeOut" | "easeInOut";
  };
  framer: {
    transformTransition: {
      duration: number;
      ease: [number, number, number, number] | "linear" | "easeIn" | "easeOut" | "easeInOut";
    };
    materialTransition: {
      duration: number;
      delay: number;
      ease: [number, number, number, number] | "linear" | "easeIn" | "easeOut" | "easeInOut";
    };
  };
  css: {
    transformTransition: string;
    materialTransition: string;
    panelTransition: string;
  };
};

const parseFramerEase = (
  value: string,
): [number, number, number, number] | "linear" | "easeIn" | "easeOut" | "easeInOut" => {
  const trimmed = String(value || "").trim();
  if (
    trimmed === "linear" ||
    trimmed === "easeIn" ||
    trimmed === "easeOut" ||
    trimmed === "easeInOut"
  ) {
    return trimmed;
  }
  const match = /^\s*cubic-bezier\(\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*\)\s*$/i.exec(
    trimmed,
  );
  if (!match) {
    return [0.22, 1, 0.36, 1];
  }
  const values = match.slice(1).map((entry) => Number(entry));
  if (values.some((entry) => !Number.isFinite(entry))) {
    return [0.22, 1, 0.36, 1];
  }
  return values as [number, number, number, number];
};

export const resolveSurfaceMotionRuntime = (options: {
  decision: RenderSurfaceDecision;
  runtime: MotionRuntime;
  family?: MotionFamily;
}): SurfaceMotionRuntime => {
  const { decision, runtime } = options;
  const family =
    options.family || SURFACE_TO_FAMILY[decision.surfaceMotionClass] || "content";
  const familyRuntime = getMotionFamilyRuntime(runtime, family);
  const choreography = resolveMotionChoreography(runtime, family);

  const baseMs = estimateTransitionDurationMs(
    familyRuntime.transition,
    decision.animationComplexity,
    decision.motionCapability,
  );
  const quickMs = Math.max(70, Math.round(baseMs * 0.66));
  const regularMs = Math.max(95, Math.round(baseMs * 0.9));
  const settleMs = Math.max(120, Math.round(baseMs * 1.14));
  const materialDelayMs =
    decision.animationComplexity === "rich" || decision.animationComplexity === "standard"
      ? 16
      : decision.animationComplexity === "light"
        ? 10
        : 0;
  const materialMs = Math.max(85, Math.round(settleMs * 0.92));
  const easing = resolveCssEase(familyRuntime.transition);
  const framerEase = parseFramerEase(easing);

  const transformTransition = `transform ${quickMs}ms ${easing}`;
  const materialTransition = `box-shadow ${materialMs}ms ${easing} ${materialDelayMs}ms, border-color ${quickMs}ms ${easing}, background ${materialMs}ms ${easing} ${materialDelayMs}ms, opacity ${quickMs}ms ${easing}`;

  return {
    family,
    capability: decision.motionCapability,
    complexity: decision.animationComplexity,
    transition: familyRuntime.transition,
    initial: familyRuntime.initial,
    animate: familyRuntime.animate,
    exit: familyRuntime.exit,
    hoverLiftPx: familyRuntime.hoverLiftPx,
    hoverScale: familyRuntime.hoverScale,
    pressScale: familyRuntime.pressScale,
    allowHover:
      decision.animationComplexity !== "none" &&
      decision.animationComplexity !== "minimal",
    allowEntry: decision.animationComplexity !== "none",
    allowStagger:
      decision.animationComplexity === "rich" ||
      decision.animationComplexity === "standard",
    interruptPolicy: choreography.interruptPolicy,
    choreographyPattern: choreography.pattern,
    timings: {
      transformMs: quickMs,
      materialMs,
      quickMs,
      regularMs,
      settleMs,
      materialDelayMs,
      easing,
      framerEase,
    },
    framer: {
      transformTransition: {
        duration: Math.max(0.08, quickMs / 1000),
        ease: framerEase,
      },
      materialTransition: {
        duration: Math.max(0.1, materialMs / 1000),
        delay: Math.max(0, materialDelayMs / 1000),
        ease: framerEase,
      },
    },
    css: {
      transformTransition,
      materialTransition,
      panelTransition: `${materialTransition}, ${transformTransition}`,
    },
  };
};
