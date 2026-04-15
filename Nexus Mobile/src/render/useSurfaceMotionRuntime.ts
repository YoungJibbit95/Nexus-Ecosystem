import { useMemo } from "react";
import {
  resolveSurfaceMotionRuntime,
  type MotionFamily,
  type RenderSurfaceDecision,
} from "@nexus/core";
import { buildMotionRuntime } from "../lib/motionEngine";
import { useTheme } from "../store/themeStore";

export const useSurfaceMotionRuntime = (
  decision: RenderSurfaceDecision,
  opts?: { family?: MotionFamily },
) => {
  const theme = useTheme();
  const runtime = useMemo(
    () =>
      buildMotionRuntime(theme, {
        degradationLevel: decision.degradationLevel as any,
      }),
    [decision.degradationLevel, theme],
  );

  return useMemo(
    () =>
      resolveSurfaceMotionRuntime({
        decision,
        runtime,
        family: opts?.family,
      }),
    [decision, opts?.family, runtime],
  );
};

