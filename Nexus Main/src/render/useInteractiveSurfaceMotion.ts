import { useMemo } from "react";
import type {
  BudgetPriority,
  EffectClass,
  MotionFamily,
  SurfaceClass,
  VisibilityState,
} from "@nexus/core";
import {
  resolveInteractiveContentMotion,
  resolveInteractiveHighlightMotion,
} from "@nexus/core";
import { useRenderSurfaceBudget } from "./useRenderSurfaceBudget";
import { useSurfaceMotionRuntime } from "./useSurfaceMotionRuntime";

export type InteractiveSurfaceMotionOptions = {
  id: string;
  hovered: boolean;
  focused?: boolean;
  selected?: boolean;
  pressed?: boolean;
  alignRight?: boolean;
  surfaceClass?: SurfaceClass;
  effectClass?: EffectClass;
  budgetPriority?: BudgetPriority;
  visibilityState?: VisibilityState;
  areaHint?: number;
  family?: MotionFamily;
};

export const useInteractiveSurfaceMotion = (
  options: InteractiveSurfaceMotionOptions,
) => {
  const {
    id,
    hovered,
    focused = false,
    selected = false,
    pressed = false,
    alignRight = false,
    surfaceClass = "utility-surface",
    effectClass = "status-highlight",
    budgetPriority = selected ? "high" : "normal",
    visibilityState = "visible",
    areaHint = 64,
    family = "micro",
  } = options;

  const interactionState = selected
    ? "active"
    : focused
      ? "focused"
      : hovered
        ? "hovered"
        : "idle";

  const decision = useRenderSurfaceBudget({
    id,
    surfaceClass,
    effectClass,
    interactionState,
    visibilityState,
    budgetPriority,
    areaHint,
    motionClassHint: family,
    transformOwnerHint: "surface",
    filterOwnerHint: "none",
    opacityOwnerHint: "surface",
  });

  const runtime = useSurfaceMotionRuntime(decision, { family });

  const highlight = useMemo(
    () =>
      resolveInteractiveHighlightMotion(runtime, {
        hovered,
        focused,
        selected,
        pressed,
        alignRight,
      }),
    [alignRight, focused, hovered, pressed, runtime, selected],
  );

  const content = useMemo(
    () =>
      resolveInteractiveContentMotion(runtime, {
        hovered,
        focused,
        selected,
        pressed,
        alignRight,
      }),
    [alignRight, focused, hovered, pressed, runtime, selected],
  );

  return { decision, runtime, highlight, content };
};
