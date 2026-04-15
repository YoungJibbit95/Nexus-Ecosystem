import {
  createRenderRuntimeBridge,
  type MotionTokenInput,
  type RenderCoordinator,
  type RenderCoordinatorDiagnostics,
  type RenderProfile,
} from "@nexus/core";

const runtimeBridge = createRenderRuntimeBridge({
  platform: "mobile",
  fallbackHardwareConcurrency: 6,
  fallbackDeviceMemoryGb: 4,
});

export const getRenderCoordinator = (): RenderCoordinator =>
  runtimeBridge.getCoordinator();

export const configureRenderRuntime = (opts: {
  lowPowerMode: boolean;
  reducedMotion: boolean;
  motion?: MotionTokenInput;
}): RenderProfile => runtimeBridge.configureRuntime(opts);

export const readRenderDiagnostics = (): RenderCoordinatorDiagnostics =>
  runtimeBridge.readDiagnostics();

export const subscribeRenderDiagnostics = (
  listener: (diagnostics: RenderCoordinatorDiagnostics) => void,
  _intervalMs = 600,
): (() => void) => runtimeBridge.subscribeDiagnostics(listener);
