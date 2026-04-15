import type { SurfaceMotionRuntime } from "./surfaceMotionRuntime";

export type InteractiveSurfaceState = {
  hovered: boolean;
  focused: boolean;
  selected: boolean;
  pressed?: boolean;
  alignRight?: boolean;
};

export type InteractiveHighlightMotion = {
  visible: boolean;
  animate: {
    opacity: number | number[];
    scale: number | number[];
  };
  transition: {
    type?: "spring" | "tween";
    duration: number;
    delay?: number;
    times?: number[];
    stiffness?: number;
    damping?: number;
    mass?: number;
    ease: [number, number, number, number] | "linear" | "easeIn" | "easeOut" | "easeInOut";
  };
};

export type InteractiveContentMotion = {
  animate: {
    x: number | number[];
    scale: number | number[];
  };
  transition: {
    type?: "spring" | "tween";
    duration: number;
    stiffness?: number;
    damping?: number;
    mass?: number;
    ease: [number, number, number, number] | "linear" | "easeIn" | "easeOut" | "easeInOut";
  };
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const resolveSpringBase = (runtime: SurfaceMotionRuntime) => {
  const transition = runtime.transition;
  if ("type" in transition && transition.type === "spring") {
    return {
      stiffness: clamp(transition.stiffness ?? 300, 220, 480),
      damping: clamp(transition.damping ?? 26, 16, 44),
      mass: clamp(transition.mass ?? 0.9, 0.56, 1.2),
    };
  }

  return runtime.complexity === "rich"
    ? { stiffness: 352, damping: 24, mass: 0.74 }
    : runtime.complexity === "standard"
      ? { stiffness: 334, damping: 25, mass: 0.78 }
      : { stiffness: 312, damping: 28, mass: 0.84 };
};

const resolveTweenDuration = (runtime: SurfaceMotionRuntime, factor = 1): number =>
  Math.max(0.08, (runtime.timings.quickMs / 1000) * factor);

export const resolveInteractiveHighlightMotion = (
  runtime: SurfaceMotionRuntime,
  state: InteractiveSurfaceState,
): InteractiveHighlightMotion => {
  const visible = state.hovered || state.focused || state.selected;
  const baseDuration = Math.max(0.12, runtime.timings.transformMs / 1000);
  const springBase = resolveSpringBase(runtime);

  if (!visible) {
    const hiddenScale =
      runtime.capability === "static-safe" || runtime.complexity === "none"
        ? 1
        : 0.95;
    return {
      visible: false,
      animate: {
        opacity: 0,
        scale: hiddenScale,
      },
      transition:
        runtime.capability === "static-safe" || runtime.complexity === "none"
          ? {
              type: "tween",
              duration: resolveTweenDuration(runtime, 0.76),
              ease: runtime.timings.framerEase,
            }
          : {
              type: "spring",
              duration: resolveTweenDuration(runtime, 1.02),
              stiffness: clamp(springBase.stiffness * 1.04, 240, 520),
              damping: clamp(springBase.damping * 1.08, 18, 52),
              mass: clamp(springBase.mass, 0.6, 1.2),
              ease: runtime.timings.framerEase,
            },
    };
  }

  const baseOpacity = state.selected ? 0.76 : state.focused ? 0.62 : 0.5;
  const opacity =
    runtime.capability === "static-safe" ? Math.max(0.34, baseOpacity * 0.8) : baseOpacity;
  const baseScale = state.selected ? 1.01 : 1;
  const scale =
    runtime.capability === "static-safe"
      ? 1
      : runtime.complexity === "minimal"
        ? baseScale
        : clamp(baseScale, 1, 1.02);
  const overshootScale =
    runtime.complexity === "rich"
      ? clamp(scale + 0.05, 1.01, 1.07)
      : runtime.complexity === "standard"
        ? clamp(scale + 0.04, 1.008, 1.06)
        : clamp(scale + 0.02, 1.004, 1.035);

  return {
    visible: true,
    animate: {
      opacity:
        runtime.capability === "static-safe" || runtime.complexity === "minimal"
          ? opacity
          : [0, clamp(opacity * 1.08, 0, 1), opacity],
      scale:
        runtime.capability === "static-safe" || runtime.complexity === "minimal"
          ? scale
          : [0.96, overshootScale, scale],
    },
    transition:
      runtime.capability === "static-safe" || runtime.complexity === "minimal"
        ? {
            type: "tween",
            duration: Math.max(0.1, baseDuration * 0.92),
            ease: runtime.timings.framerEase,
          }
        : {
            type: "spring",
            duration: Math.max(0.2, baseDuration * 1.24),
            times: [0, 0.66, 1],
            stiffness:
              runtime.complexity === "rich"
                ? clamp(springBase.stiffness * 1.14, 270, 560)
                : clamp(springBase.stiffness * 1.08, 250, 520),
            damping:
              runtime.complexity === "rich"
                ? clamp(springBase.damping * 0.9, 16, 42)
                : clamp(springBase.damping * 0.96, 18, 44),
            mass:
              runtime.complexity === "rich"
                ? clamp(springBase.mass * 0.88, 0.56, 1.12)
                : clamp(springBase.mass * 0.94, 0.6, 1.16),
            ease: runtime.timings.framerEase,
          },
  };
};

export const resolveInteractiveContentMotion = (
  runtime: SurfaceMotionRuntime,
  state: InteractiveSurfaceState,
): InteractiveContentMotion => {
  const baseDuration = Math.max(0.1, runtime.timings.transformMs / 1000);
  const springBase = resolveSpringBase(runtime);
  const springTransition =
    runtime.capability === "static-safe" || runtime.complexity === "minimal"
      ? {
          type: "tween" as const,
          duration: Math.max(0.09, baseDuration * 0.88),
          ease: runtime.timings.framerEase,
        }
      : {
          type: "spring" as const,
          duration: Math.max(0.16, baseDuration * 1.04),
          stiffness:
            runtime.complexity === "rich"
              ? clamp(springBase.stiffness * 1.08, 260, 540)
              : clamp(springBase.stiffness * 1.02, 240, 510),
          damping:
            runtime.complexity === "rich"
              ? clamp(springBase.damping * 0.92, 16, 40)
              : clamp(springBase.damping, 18, 42),
          mass:
            runtime.complexity === "rich"
              ? clamp(springBase.mass * 0.9, 0.56, 1.1)
              : clamp(springBase.mass * 0.96, 0.6, 1.14),
          ease: runtime.timings.framerEase,
        };
  if (!runtime.allowHover || runtime.capability === "static-safe") {
    return {
      animate: {
        x: 0,
        scale: state.pressed ? 0.992 : 1,
      },
      transition: springTransition,
    };
  }

  const hoverActive = state.hovered && !state.pressed;
  const horizontalShift =
    runtime.complexity === "rich" ? 0.55 : runtime.complexity === "standard" ? 0.35 : 0;
  const hoverX = state.alignRight ? -horizontalShift : horizontalShift;
  const scaleTarget = state.pressed
    ? clamp(runtime.pressScale, 0.985, 0.997)
    : hoverActive
      ? clamp(runtime.hoverScale + 0.008, 1.003, 1.02)
      : 1;
  const scaleOvershoot =
    runtime.complexity === "rich"
      ? clamp(scaleTarget + 0.012, 1.004, 1.035)
      : runtime.complexity === "standard"
        ? clamp(scaleTarget + 0.008, 1.003, 1.028)
        : clamp(scaleTarget + 0.004, 1.002, 1.02);
  const animateScale =
    hoverActive && (runtime.complexity === "rich" || runtime.complexity === "standard")
      ? [1, scaleOvershoot, scaleTarget]
      : scaleTarget;
  const animateX =
    hoverActive && runtime.complexity === "rich"
      ? [0, hoverX * 1.06, hoverX]
      : hoverActive
        ? hoverX
        : 0;

  return {
    animate: { x: animateX, scale: animateScale },
    transition: springTransition,
  };
};
