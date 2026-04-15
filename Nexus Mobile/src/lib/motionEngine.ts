import type { Theme } from "../store/themeStore";
import {
  applyMotionProfile as applyMotionProfileCore,
  buildMotionFamilyMap as buildMotionFamilyMapCore,
  buildMotionRuntime as buildMotionRuntimeCore,
  getMotionFamilyRuntime as getMotionFamilyRuntimeCore,
  resolveMotionChoreography as resolveMotionChoreographyCore,
  resolveMotionProfile as resolveMotionProfileCore,
  type MotionCapability,
  type MotionChoreography,
  type MotionDegradationLevel,
  type MotionFamily,
  type MotionFamilyRuntime,
  type MotionProfile,
  type MotionRuntime,
} from "@nexus/core";

export type {
  MotionProfile,
  MotionRuntime,
  MotionFamily,
  MotionFamilyRuntime,
  MotionDegradationLevel,
  MotionChoreography,
  MotionCapability,
};

export const resolveMotionProfile = (
  theme: Theme,
  opts?: { lowPowerMode?: boolean },
): MotionProfile => resolveMotionProfileCore(theme, opts);

export const buildMotionRuntime = (
  theme: Theme,
  opts?: { lowPowerMode?: boolean; degradationLevel?: MotionDegradationLevel },
): MotionRuntime => buildMotionRuntimeCore(theme, opts);

export const getMotionFamilyRuntime = (
  runtime: MotionRuntime,
  family: MotionFamily,
): MotionFamilyRuntime => getMotionFamilyRuntimeCore(runtime, family);

export const buildMotionFamilyMap = (
  runtime: MotionRuntime,
): Record<MotionFamily, MotionFamilyRuntime> =>
  buildMotionFamilyMapCore(runtime);

export const resolveMotionChoreography = (
  runtime: MotionRuntime,
  family: MotionFamily,
): MotionChoreography => resolveMotionChoreographyCore(runtime, family);

export const applyMotionProfile = (
  theme: Pick<Theme, "setQOL" | "setAnimations" | "setVisual">,
  profile: MotionProfile,
): void => {
  applyMotionProfileCore(
    theme as unknown as {
      setQOL: (patch: Record<string, unknown>) => void;
      setAnimations: (patch: Record<string, unknown>) => void;
      setVisual: (patch: Record<string, unknown>) => void;
    },
    profile,
  );
};
