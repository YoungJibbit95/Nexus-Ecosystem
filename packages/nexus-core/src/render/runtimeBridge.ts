import {
  buildRenderTokens,
  commitRenderTokens,
} from "./renderTokens";
import {
  createRenderCoordinator,
  type RenderCoordinator,
  type RenderCoordinatorDiagnostics,
} from "./renderCoordinator";
import {
  resolveRenderProfile,
  type RenderProfile,
  type RenderProfileContext,
} from "./renderProfile";
import type { MotionTokenInput } from "./renderTokens";

export type RenderRuntimeBridgeOptions = {
  platform: RenderProfileContext["platform"];
  fallbackHardwareConcurrency: number;
  fallbackDeviceMemoryGb: number;
  tokenTarget?: () => HTMLElement | null;
};

export type RenderRuntimeBridge = {
  getCoordinator: () => RenderCoordinator;
  configureRuntime: (opts: {
    lowPowerMode: boolean;
    reducedMotion: boolean;
    motion?: MotionTokenInput;
  }) => RenderProfile;
  readDiagnostics: () => RenderCoordinatorDiagnostics;
  subscribeDiagnostics: (
    listener: (diagnostics: RenderCoordinatorDiagnostics) => void,
  ) => () => void;
};

export const createRenderRuntimeBridge = (
  options: RenderRuntimeBridgeOptions,
): RenderRuntimeBridge => {
  const {
    platform,
    fallbackHardwareConcurrency,
    fallbackDeviceMemoryGb,
    tokenTarget,
  } = options;
  let coordinator: RenderCoordinator | null = null;
  let visibilityBridgeInstalled = false;

  const readDeviceContext = () => {
    if (typeof navigator === "undefined") {
      return {
        hardwareConcurrency: fallbackHardwareConcurrency,
        deviceMemoryGb: fallbackDeviceMemoryGb,
      };
    }
    return {
      hardwareConcurrency: Number(
        navigator.hardwareConcurrency || fallbackHardwareConcurrency,
      ),
      deviceMemoryGb: Number(
        (navigator as any).deviceMemory || fallbackDeviceMemoryGb,
      ),
    };
  };

  const getCoordinatorInternal = (): RenderCoordinator => {
    if (coordinator) return coordinator;
    const device = readDeviceContext();
    coordinator = createRenderCoordinator({
      platform,
      hardwareConcurrency: device.hardwareConcurrency,
      deviceMemoryGb: device.deviceMemoryGb,
    });
    return coordinator;
  };

  const installVisibilityBridge = () => {
    if (visibilityBridgeInstalled || typeof document === "undefined") return;
    visibilityBridgeInstalled = true;
    const instance = getCoordinatorInternal();
    const sync = () => {
      instance.setAppVisibility(document.visibilityState !== "hidden");
    };
    document.addEventListener("visibilitychange", sync, { passive: true });
    sync();
  };

  const getCoordinator = (): RenderCoordinator => {
    installVisibilityBridge();
    return getCoordinatorInternal();
  };

  const configureRuntime = (opts: {
    lowPowerMode: boolean;
    reducedMotion: boolean;
    motion?: MotionTokenInput;
  }): RenderProfile => {
    const device = readDeviceContext();
    const profile = resolveRenderProfile({
      platform,
      lowPowerMode: opts.lowPowerMode,
      reducedMotion: opts.reducedMotion,
      hardwareConcurrency: device.hardwareConcurrency,
      deviceMemoryGb: device.deviceMemoryGb,
    });

    const instance = getCoordinator();
    instance.configureProfile(profile);

    if (typeof document !== "undefined") {
      const tokens = buildRenderTokens(profile, opts.motion);
      const target = tokenTarget ? tokenTarget() : document.documentElement;
      commitRenderTokens(target ?? document.documentElement, tokens);
      const root = target ?? document.documentElement;
      root.setAttribute("data-nx-render-tier", profile.tier);
      root.setAttribute("data-nx-low-power", profile.lowPowerMode ? "1" : "0");
      root.setAttribute(
        "data-nx-motion-reduced",
        profile.reducedMotion ? "1" : "0",
      );
    }

    return profile;
  };

  const readDiagnostics = (): RenderCoordinatorDiagnostics =>
    getCoordinator().getDiagnostics();

  const subscribeDiagnostics = (
    listener: (diagnostics: RenderCoordinatorDiagnostics) => void,
  ): (() => void) => getCoordinator().subscribeDiagnostics(listener);

  return {
    getCoordinator,
    configureRuntime,
    readDiagnostics,
    subscribeDiagnostics,
  };
};
