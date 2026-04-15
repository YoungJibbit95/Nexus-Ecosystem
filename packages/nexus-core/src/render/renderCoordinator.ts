import {
  allocateEffectBudget,
  type EffectBudgetPolicyState,
  type RenderSurfaceDecision,
  type RenderSurfaceState,
} from "./effectBudget";
import {
  resolveRenderProfile,
  type RenderProfile,
  type RenderProfileContext,
} from "./renderProfile";
import { evaluateRenderInvariantViolations } from "./renderInvariants";

type SurfaceListener = (decision: RenderSurfaceDecision) => void;
type DiagnosticsListener = (diagnostics: RenderCoordinatorDiagnostics) => void;

export type RenderSurfaceDebugSnapshot = {
  id: string;
  surfaceClass: RenderSurfaceState["surfaceClass"];
  effectClass: RenderSurfaceState["effectClass"];
  visibilityState: RenderSurfaceState["visibilityState"];
  interactionState: RenderSurfaceState["interactionState"];
  budgetPriority: RenderSurfaceState["budgetPriority"];
  areaHint: number;
  mode: RenderSurfaceDecision["mode"];
  dynamic: boolean;
  shader: boolean;
  burst: boolean;
  reason: string;
  priorityScore: number;
  motionCapability: RenderSurfaceDecision["motionCapability"];
  animationComplexity: RenderSurfaceDecision["animationComplexity"];
  surfaceMotionClass: RenderSurfaceDecision["surfaceMotionClass"];
  interruptPolicy: RenderSurfaceDecision["interruptPolicy"];
  ownerHints: RenderSurfaceDecision["ownerHints"];
};

export type RenderCoordinatorDiagnostics = {
  phase: "idle" | "measure" | "resolve" | "allocate" | "commit" | "cleanup";
  tier: RenderProfile["tier"];
  platform: RenderProfile["platform"];
  lowPowerMode: boolean;
  reducedMotion: boolean;
  registeredSurfaces: number;
  visibleSurfaces: number;
  dynamicSurfaces: number;
  shaderSurfaces: number;
  burstSurfaces: number;
  frameBudgetMs: number;
  lagPressure: number;
  effectiveDynamicBudget: number;
  effectiveShaderBudget: number;
  effectiveBurstBudget: number;
  effectiveBackdropBudget: number;
  lastCommitMs: number;
  lastFrameStartedAt: number;
  lastCommitDurationMs: number;
  allocationDurationMs: number;
  resolveDurationMs: number;
  listenerNotifyDurationMs: number;
  droppedFrameEstimate: number;
  invariantViolations: number;
  surfaces: RenderSurfaceDebugSnapshot[];
};

export type RenderSurfaceRegistration = {
  id: string;
  update: (
    patch: Partial<Omit<RenderSurfaceState, "id" | "updatedAt">>,
  ) => void;
  subscribe: (listener: SurfaceListener) => () => void;
  getDecision: () => RenderSurfaceDecision | null;
  unregister: () => void;
};

const nowMs = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const createSurfaceId = (() => {
  let seq = 0;
  return () => {
    seq += 1;
    return `nx-surface-${seq}`;
  };
})();

const scheduleAnimationFrame = (cb: () => void): number => {
  if (typeof requestAnimationFrame === "function") {
    return requestAnimationFrame(cb);
  }
  return setTimeout(cb, 16) as unknown as number;
};

const cancelAnimationFrameSafe = (handle: number) => {
  if (typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(handle);
    return;
  }
  clearTimeout(handle);
};

const isRenderProfile = (
  value: RenderProfile | RenderProfileContext,
): value is RenderProfile =>
  typeof (value as RenderProfile).tier === "string" &&
  typeof (value as RenderProfile).frameBudgetMs === "number";

const INTERACTION_WEIGHT: Record<RenderSurfaceState["interactionState"], number> = {
  idle: 0,
  hovered: 1,
  focused: 2,
  active: 3,
};

const INTERACTION_FREEZE_MS = 200;

export class RenderCoordinator {
  private profile: RenderProfile;
  private surfaces = new Map<string, RenderSurfaceState>();
  private decisions = new Map<string, RenderSurfaceDecision>();
  private policyState = new Map<string, EffectBudgetPolicyState>();
  private listeners = new Map<string, Set<SurfaceListener>>();
  private diagnosticsListeners = new Set<DiagnosticsListener>();
  private interactionFreeze = new Map<
    string,
    { state: RenderSurfaceState["interactionState"]; until: number }
  >();
  private queued = false;
  private rafHandle = 0;
  private appVisible = true;
  private phase: RenderCoordinatorDiagnostics["phase"] = "idle";
  private lastFrameStartedAt = 0;
  private lastCommitDurationMs = 0;
  private allocationDurationMs = 0;
  private resolveDurationMs = 0;
  private listenerNotifyDurationMs = 0;
  private droppedFrameEstimate = 0;
  private lagPressure = 0;
  private effectiveProfileSnapshot: Pick<
    RenderProfile,
    "maxDynamicSurfaces" | "maxShaderSurfaces" | "maxLiquidBursts" | "maxBackdropSurfaces"
  >;
  private invariantViolations = 0;
  private surfaceDebugSnapshots: RenderSurfaceDebugSnapshot[] = [];

  constructor(profileContext: RenderProfileContext) {
    this.profile = resolveRenderProfile(profileContext);
    this.effectiveProfileSnapshot = {
      maxDynamicSurfaces: this.profile.maxDynamicSurfaces,
      maxShaderSurfaces: this.profile.maxShaderSurfaces,
      maxLiquidBursts: this.profile.maxLiquidBursts,
      maxBackdropSurfaces: this.profile.maxBackdropSurfaces,
    };
  }

  configureProfile(profileInput: RenderProfile | RenderProfileContext): void {
    this.profile = isRenderProfile(profileInput)
      ? profileInput
      : resolveRenderProfile(profileInput);
    this.schedule();
  }

  setAppVisibility(visible: boolean): void {
    if (this.appVisible === visible) return;
    this.appVisible = visible;
    this.schedule();
  }

  registerSurface(
    state: Omit<RenderSurfaceState, "id" | "updatedAt"> & { id?: string },
  ): RenderSurfaceRegistration {
    const id = state.id || createSurfaceId();
    const frameNow = nowMs();
    const nextState: RenderSurfaceState = {
      ...state,
      id,
      updatedAt: frameNow,
      lastInteractionAt: state.lastInteractionAt ?? frameNow,
      visibilityState: state.visibilityState ?? "visible",
      areaHint:
        typeof state.areaHint === "number" && state.areaHint > 0
          ? state.areaHint
          : 1,
    };

    this.surfaces.set(id, nextState);
    this.schedule();

    return {
      id,
      update: (patch) => this.updateSurface(id, patch),
      subscribe: (listener) => this.subscribe(id, listener),
      getDecision: () => this.decisions.get(id) ?? null,
      unregister: () => this.unregisterSurface(id),
    };
  }

  updateSurface(
    id: string,
    patch: Partial<Omit<RenderSurfaceState, "id" | "updatedAt">>,
  ): void {
    const prev = this.surfaces.get(id);
    if (!prev) return;
    const frameNow = nowMs();
    const nextInteraction =
      patch.interactionState ?? prev.interactionState;
    const interactionChanged = nextInteraction !== prev.interactionState;
    this.surfaces.set(id, {
      ...prev,
      ...patch,
      areaHint:
        typeof patch.areaHint === "number"
          ? patch.areaHint > 0
            ? patch.areaHint
            : prev.areaHint
          : prev.areaHint,
      updatedAt: frameNow,
      lastInteractionAt: interactionChanged
        ? frameNow
        : patch.lastInteractionAt ?? prev.lastInteractionAt,
    });
    this.schedule();
  }

  unregisterSurface(id: string): void {
    this.surfaces.delete(id);
    this.decisions.delete(id);
    this.policyState.delete(id);
    this.listeners.delete(id);
    this.interactionFreeze.delete(id);
    this.schedule();
  }

  getDecision(id: string): RenderSurfaceDecision | null {
    return this.decisions.get(id) ?? null;
  }

  getDiagnostics(): RenderCoordinatorDiagnostics {
    const decisions = Array.from(this.decisions.values());
    return {
      phase: this.phase,
      tier: this.profile.tier,
      platform: this.profile.platform,
      lowPowerMode: this.profile.lowPowerMode,
      reducedMotion: this.profile.reducedMotion,
      registeredSurfaces: this.surfaces.size,
      visibleSurfaces: Array.from(this.surfaces.values()).filter(
        (entry) => entry.visibilityState !== "hidden",
      ).length,
      dynamicSurfaces: decisions.filter((entry) => entry.dynamic).length,
      shaderSurfaces: decisions.filter((entry) => entry.shader).length,
      burstSurfaces: decisions.filter((entry) => entry.burst).length,
      frameBudgetMs: this.profile.frameBudgetMs,
      lagPressure: this.lagPressure,
      effectiveDynamicBudget: this.effectiveProfileSnapshot.maxDynamicSurfaces,
      effectiveShaderBudget: this.effectiveProfileSnapshot.maxShaderSurfaces,
      effectiveBurstBudget: this.effectiveProfileSnapshot.maxLiquidBursts,
      effectiveBackdropBudget: this.effectiveProfileSnapshot.maxBackdropSurfaces,
      lastCommitMs: this.lastCommitDurationMs,
      lastFrameStartedAt: this.lastFrameStartedAt,
      lastCommitDurationMs: this.lastCommitDurationMs,
      allocationDurationMs: this.allocationDurationMs,
      resolveDurationMs: this.resolveDurationMs,
      listenerNotifyDurationMs: this.listenerNotifyDurationMs,
      droppedFrameEstimate: this.droppedFrameEstimate,
      invariantViolations: this.invariantViolations,
      surfaces: this.surfaceDebugSnapshots,
    };
  }

  subscribeDiagnostics(listener: DiagnosticsListener): () => void {
    this.diagnosticsListeners.add(listener);
    listener(this.getDiagnostics());
    return () => {
      this.diagnosticsListeners.delete(listener);
    };
  }

  private subscribe(id: string, listener: SurfaceListener): () => void {
    const set = this.listeners.get(id) ?? new Set<SurfaceListener>();
    set.add(listener);
    this.listeners.set(id, set);
    return () => {
      const current = this.listeners.get(id);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) this.listeners.delete(id);
    };
  }

  private schedule(): void {
    if (this.queued) return;
    this.queued = true;
    this.rafHandle = scheduleAnimationFrame(() => this.runPipeline());
  }

  private resolveSurfaces(
    surfaces: RenderSurfaceState[],
    frameNow: number,
  ): RenderSurfaceState[] {
    return surfaces.map((entry) => {
      const visibilityState = this.appVisible ? entry.visibilityState : "hidden";
      const previousFreeze = this.interactionFreeze.get(entry.id);
      const incomingWeight = INTERACTION_WEIGHT[entry.interactionState];
      const frozenWeight = previousFreeze
        ? INTERACTION_WEIGHT[previousFreeze.state]
        : -1;
      let interactionState = entry.interactionState;

      if (interactionState !== "idle" && visibilityState !== "hidden") {
        this.interactionFreeze.set(entry.id, {
          state: interactionState,
          until: frameNow + INTERACTION_FREEZE_MS,
        });
      } else if (
        previousFreeze &&
        previousFreeze.until > frameNow &&
        visibilityState !== "hidden" &&
        frozenWeight > incomingWeight
      ) {
        interactionState = previousFreeze.state;
      } else if (!previousFreeze || previousFreeze.until <= frameNow) {
        this.interactionFreeze.delete(entry.id);
      }

      if (visibilityState === "hidden") {
        interactionState = "idle";
      }

      return {
        ...entry,
        visibilityState,
        interactionState,
        areaHint:
          typeof entry.areaHint === "number" && entry.areaHint > 0
            ? entry.areaHint
            : 1,
      };
    });
  }

  private notifyDiagnostics(): void {
    if (this.diagnosticsListeners.size === 0) return;
    const snapshot = this.getDiagnostics();
    this.diagnosticsListeners.forEach((listener) => listener(snapshot));
  }

  private runPipeline(): void {
    this.queued = false;
    if (this.rafHandle) {
      cancelAnimationFrameSafe(this.rafHandle);
      this.rafHandle = 0;
    }

    const frameStartedAt = nowMs();
    const frameDelta =
      this.lastFrameStartedAt > 0 ? frameStartedAt - this.lastFrameStartedAt : 0;
    if (frameDelta > this.profile.frameBudgetMs * 1.8) {
      this.droppedFrameEstimate += 1;
    } else {
      this.droppedFrameEstimate = Math.max(0, this.droppedFrameEstimate - 0.3);
    }
    this.lagPressure = Math.min(1, this.droppedFrameEstimate / 10);
    this.lastFrameStartedAt = frameStartedAt;

    this.phase = "measure";
    const measuredSurfaces = Array.from(this.surfaces.values());

    this.phase = "resolve";
    const resolveStartedAt = nowMs();
    const resolvedSurfaces = this.resolveSurfaces(measuredSurfaces, frameStartedAt);
    const violations = evaluateRenderInvariantViolations(resolvedSurfaces);
    this.resolveDurationMs = Number((nowMs() - resolveStartedAt).toFixed(3));
    this.invariantViolations = violations.length;

    this.phase = "allocate";
    const effectiveProfile =
      this.lagPressure <= 0.04
        ? this.profile
        : {
            ...this.profile,
            maxDynamicSurfaces: Math.max(
              4,
              Math.round(this.profile.maxDynamicSurfaces * (1 - this.lagPressure * 0.45)),
            ),
            maxShaderSurfaces: Math.max(
              1,
              Math.round(this.profile.maxShaderSurfaces * (1 - this.lagPressure * 0.5)),
            ),
            maxLiquidBursts: Math.max(
              1,
              Math.round(this.profile.maxLiquidBursts * (1 - this.lagPressure * 0.55)),
            ),
            maxBackdropSurfaces: Math.max(
              3,
              Math.round(this.profile.maxBackdropSurfaces * (1 - this.lagPressure * 0.35)),
            ),
          };
    this.effectiveProfileSnapshot = {
      maxDynamicSurfaces: effectiveProfile.maxDynamicSurfaces,
      maxShaderSurfaces: effectiveProfile.maxShaderSurfaces,
      maxLiquidBursts: effectiveProfile.maxLiquidBursts,
      maxBackdropSurfaces: effectiveProfile.maxBackdropSurfaces,
    };
    const allocation = allocateEffectBudget(resolvedSurfaces, effectiveProfile, {
      frameNowMs: frameStartedAt,
      previousDecisions: this.decisions,
      previousPolicyState: this.policyState,
    });
    this.allocationDurationMs = allocation.diagnostics.allocationDurationMs;
    this.policyState = allocation.policyState;
    const nextDecisions = allocation.decisions;

    this.phase = "commit";
    const commitStartedAt = nowMs();
    const changedIds = new Set<string>();
    for (const [id, next] of nextDecisions.entries()) {
      const prev = this.decisions.get(id);
      if (
        !prev ||
        prev.mode !== next.mode ||
        prev.dynamic !== next.dynamic ||
        prev.shader !== next.shader ||
        prev.burst !== next.burst ||
        prev.reason !== next.reason ||
        prev.motionCapability !== next.motionCapability ||
        prev.animationComplexity !== next.animationComplexity
      ) {
        changedIds.add(id);
      }
      this.decisions.set(id, next);
    }

    for (const [id] of this.decisions) {
      if (!nextDecisions.has(id)) {
        this.decisions.delete(id);
        this.policyState.delete(id);
        this.interactionFreeze.delete(id);
        changedIds.add(id);
      }
    }

    const surfaceById = new Map<string, RenderSurfaceState>();
    resolvedSurfaces.forEach((surface) => {
      surfaceById.set(surface.id, surface);
    });
    this.surfaceDebugSnapshots = Array.from(nextDecisions.values())
      .map((decision) => {
        const surface = surfaceById.get(decision.id);
        if (!surface) return null;
        return {
          id: decision.id,
          surfaceClass: surface.surfaceClass,
          effectClass: surface.effectClass,
          visibilityState: surface.visibilityState,
          interactionState: surface.interactionState,
          budgetPriority: surface.budgetPriority,
          areaHint: Math.max(1, Math.round(surface.areaHint ?? 1)),
          mode: decision.mode,
          dynamic: decision.dynamic,
          shader: decision.shader,
          burst: decision.burst,
          reason: decision.reason,
          priorityScore: decision.priorityScore,
          motionCapability: decision.motionCapability,
          animationComplexity: decision.animationComplexity,
          surfaceMotionClass: decision.surfaceMotionClass,
          interruptPolicy: decision.interruptPolicy,
          ownerHints: decision.ownerHints,
        } satisfies RenderSurfaceDebugSnapshot;
      })
      .filter((entry): entry is RenderSurfaceDebugSnapshot => entry !== null)
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 120);

    const listenerStartedAt = nowMs();
    for (const id of changedIds) {
      const listeners = this.listeners.get(id);
      const decision = this.decisions.get(id);
      if (!listeners || !decision) continue;
      listeners.forEach((listener) => listener(decision));
    }
    this.listenerNotifyDurationMs = Number((nowMs() - listenerStartedAt).toFixed(3));

    this.lastCommitDurationMs = Number((nowMs() - commitStartedAt).toFixed(3));

    this.phase = "cleanup";
    this.notifyDiagnostics();
    this.phase = "idle";
  }
}

export const createRenderCoordinator = (
  context: RenderProfileContext,
): RenderCoordinator => new RenderCoordinator(context);
