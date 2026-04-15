import type { RenderProfile } from "./renderProfile";
import {
  resolveSurfaceRecipe,
  type EffectClass,
  type SurfaceClass,
} from "./surfaceRecipes";

export type InteractionState = "idle" | "hovered" | "active" | "focused";
export type VisibilityState = "visible" | "occluded" | "hidden";
export type BudgetPriority =
  | "critical"
  | "high"
  | "normal"
  | "low"
  | "background";

export type MotionCapability =
  | "full"
  | "rich-reduced"
  | "composed-light"
  | "critical-only"
  | "static-safe";

export type AnimationComplexity =
  | "rich"
  | "standard"
  | "light"
  | "minimal"
  | "none";

export type SurfaceMotionClass =
  | "navigation"
  | "toolbar"
  | "sheet"
  | "command"
  | "status"
  | "micro"
  | "hero"
  | "content";

export type InterruptPolicy =
  | "interruptible"
  | "settle-before-interrupt"
  | "non-interruptible-exit";

export type RenderSurfaceState = {
  id: string;
  surfaceClass: SurfaceClass;
  effectClass: EffectClass;
  interactionState: InteractionState;
  visibilityState: VisibilityState;
  budgetPriority: BudgetPriority;
  prefersShader?: boolean;
  prefersBurst?: boolean;
  areaHint?: number;
  updatedAt: number;
  lastInteractionAt?: number;
  motionClassHint?: SurfaceMotionClass;
  transformOwnerHint?: "surface" | "child" | "none";
  filterOwnerHint?: "surface" | "child" | "none";
  opacityOwnerHint?: "surface" | "child" | "none";
};

export type RenderSurfaceMode =
  | "static"
  | "backdrop"
  | "live-composited"
  | "burst-animated"
  | "shader-active";

export type RenderSurfaceDecision = {
  id: string;
  mode: RenderSurfaceMode;
  dynamic: boolean;
  shader: boolean;
  burst: boolean;
  priorityScore: number;
  reason: string;
  motionCapability: MotionCapability;
  animationComplexity: AnimationComplexity;
  surfaceMotionClass: SurfaceMotionClass;
  interruptPolicy: InterruptPolicy;
  degradationLevel: MotionCapability;
  ownerHints: {
    transformOwner: "surface" | "child" | "none";
    filterOwner: "surface" | "child" | "none";
    opacityOwner: "surface" | "child" | "none";
  };
};

export type EffectBudgetPolicyState = {
  id: string;
  lastMode: RenderSurfaceMode;
  lastModeChangeAt: number;
  lastPromotedAt: number;
  lastDemotedAt: number;
  shaderCooldownUntil: number;
  burstCooldownUntil: number;
  stableSince: number;
  lastDecisionReason: string;
  lastUpdatedAt: number;
};

export type EffectBudgetAllocationDiagnostics = {
  allocationDurationMs: number;
  consideredSurfaces: number;
  grantedDynamic: number;
  grantedShader: number;
  grantedBurst: number;
  grantedBackdrop: number;
  heldByDemotionGrace: number;
  heldByCooldown: number;
  heldByPromoteStability: number;
};

export type EffectBudgetAllocationOptions = {
  frameNowMs?: number;
  previousDecisions?: Map<string, RenderSurfaceDecision>;
  previousPolicyState?: Map<string, EffectBudgetPolicyState>;
};

export type EffectBudgetAllocationResult = {
  decisions: Map<string, RenderSurfaceDecision>;
  policyState: Map<string, EffectBudgetPolicyState>;
  diagnostics: EffectBudgetAllocationDiagnostics;
};

const PRIORITY_WEIGHT: Record<BudgetPriority, number> = {
  critical: 100,
  high: 78,
  normal: 56,
  low: 34,
  background: 16,
};

const INTERACTION_WEIGHT: Record<InteractionState, number> = {
  active: 24,
  focused: 20,
  hovered: 14,
  idle: 0,
};

const VISIBILITY_WEIGHT: Record<VisibilityState, number> = {
  visible: 14,
  occluded: -8,
  hidden: -1000,
};

const EFFECT_WEIGHT: Record<EffectClass, number> = {
  "shader-burst": 12,
  "liquid-interactive": 10,
  "refractive-edge": 7,
  "status-highlight": 6,
  backdrop: 4,
  static: 0,
};

const PROMOTE_STABILITY_WINDOW_MS = 180;
const DEMOTE_GRACE_WINDOW_MS = 260;
const SHADER_COOLDOWN_MS = 480;
const BURST_COOLDOWN_MS = 260;

const nowMs = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const resolveSurfaceMotionClass = (entry: RenderSurfaceState): SurfaceMotionClass => {
  if (entry.motionClassHint) return entry.motionClassHint;
  if (entry.surfaceClass === "toolbar-surface") return "toolbar";
  if (entry.surfaceClass === "modal-surface") return "sheet";
  if (entry.surfaceClass === "hero-surface") return "hero";
  if (entry.surfaceClass === "liquid-element") return "micro";
  if (
    entry.effectClass === "shader-burst" ||
    entry.effectClass === "liquid-interactive"
  ) {
    return "command";
  }
  if (entry.surfaceClass === "shell-surface") return "navigation";
  if (entry.surfaceClass === "utility-surface") return "status";
  return "content";
};

const resolveMotionComplexity = (
  mode: RenderSurfaceMode,
  profile: RenderProfile,
): AnimationComplexity => {
  if (mode === "static") return "none";
  if (profile.reducedMotion) {
    if (mode === "shader-active") return "minimal";
    if (mode === "burst-animated") return "minimal";
    return "light";
  }
  if (profile.lowPowerMode) {
    if (mode === "shader-active") return "standard";
    if (mode === "burst-animated") return "light";
    return "light";
  }
  if (mode === "shader-active") return "rich";
  if (mode === "burst-animated") return "standard";
  if (mode === "live-composited" || mode === "backdrop") return "light";
  return "none";
};

const resolveMotionCapability = (
  complexity: AnimationComplexity,
  profile: RenderProfile,
): MotionCapability => {
  if (complexity === "none") return "static-safe";
  if (complexity === "minimal") return "critical-only";
  if (complexity === "light") return "composed-light";
  if (profile.reducedMotion || profile.lowPowerMode) return "rich-reduced";
  return "full";
};

const resolveInterruptPolicy = (
  motionClass: SurfaceMotionClass,
  complexity: AnimationComplexity,
): InterruptPolicy => {
  if (complexity === "none") return "settle-before-interrupt";
  if (motionClass === "sheet" || motionClass === "hero") {
    return "non-interruptible-exit";
  }
  if (complexity === "minimal") return "settle-before-interrupt";
  return "interruptible";
};

const computePriorityScore = (
  entry: RenderSurfaceState,
  frameNowMs: number,
): number => {
  const recencyMs = Math.max(
    0,
    frameNowMs - (entry.lastInteractionAt ?? entry.updatedAt),
  );
  const recencyBoost = recencyMs < 2_000 ? 8 : recencyMs < 6_000 ? 4 : 0;
  const areaPenalty =
    typeof entry.areaHint === "number" && entry.areaHint > 0
      ? Math.min(8, Math.log10(entry.areaHint + 1))
      : 0;
  return (
    PRIORITY_WEIGHT[entry.budgetPriority] +
    INTERACTION_WEIGHT[entry.interactionState] +
    VISIBILITY_WEIGHT[entry.visibilityState] +
    EFFECT_WEIGHT[entry.effectClass] +
    recencyBoost -
    areaPenalty
  );
};

const createDecision = (
  entry: RenderSurfaceState,
  profile: RenderProfile,
  mode: RenderSurfaceMode,
  score: number,
  reason: string,
): RenderSurfaceDecision => {
  const motionClass = resolveSurfaceMotionClass(entry);
  const complexity = resolveMotionComplexity(mode, profile);
  const capability = resolveMotionCapability(complexity, profile);
  const shader = mode === "shader-active";
  const burst = mode === "burst-animated";
  const dynamic = mode !== "static";
  return {
    id: entry.id,
    mode,
    dynamic,
    shader,
    burst,
    priorityScore: score,
    reason,
    motionCapability: capability,
    animationComplexity: complexity,
    surfaceMotionClass: motionClass,
    interruptPolicy: resolveInterruptPolicy(motionClass, complexity),
    degradationLevel: capability,
    ownerHints: {
      transformOwner: entry.transformOwnerHint ?? "surface",
      filterOwner:
        entry.filterOwnerHint ?? (shader || mode === "backdrop" ? "surface" : "none"),
      opacityOwner: entry.opacityOwnerHint ?? "surface",
    },
  };
};

const createPolicyState = (
  entry: RenderSurfaceState,
  decision: RenderSurfaceDecision,
  frameNowMs: number,
): EffectBudgetPolicyState => ({
  id: entry.id,
  lastMode: decision.mode,
  lastModeChangeAt: frameNowMs,
  lastPromotedAt: decision.dynamic ? frameNowMs : 0,
  lastDemotedAt: decision.dynamic ? 0 : frameNowMs,
  shaderCooldownUntil: 0,
  burstCooldownUntil: 0,
  stableSince: frameNowMs,
  lastDecisionReason: decision.reason,
  lastUpdatedAt: frameNowMs,
});

const applyPolicy = (
  entry: RenderSurfaceState,
  profile: RenderProfile,
  candidate: RenderSurfaceDecision,
  score: number,
  frameNowMs: number,
  previousDecision: RenderSurfaceDecision | undefined,
  previousPolicy: EffectBudgetPolicyState | undefined,
  counters: {
    heldByDemotionGrace: number;
    heldByCooldown: number;
    heldByPromoteStability: number;
  },
): {
  decision: RenderSurfaceDecision;
  policy: EffectBudgetPolicyState;
} => {
  let decision = candidate;
  const policy =
    previousPolicy ?? createPolicyState(entry, candidate, frameNowMs);

  if (decision.shader && policy.shaderCooldownUntil > frameNowMs) {
    decision = createDecision(
      entry,
      profile,
      "live-composited",
      score,
      "shader-cooldown-hold",
    );
    counters.heldByCooldown += 1;
  }

  if (decision.burst && policy.burstCooldownUntil > frameNowMs) {
    decision = createDecision(
      entry,
      profile,
      "live-composited",
      score,
      "burst-cooldown-hold",
    );
    counters.heldByCooldown += 1;
  }

  const stableForMs = Math.max(0, frameNowMs - Math.max(entry.updatedAt, entry.lastInteractionAt ?? entry.updatedAt));
  const promotion = decision.dynamic && !Boolean(previousDecision?.dynamic);
  if (
    promotion &&
    entry.interactionState === "idle" &&
    stableForMs < PROMOTE_STABILITY_WINDOW_MS
  ) {
    decision = createDecision(
      entry,
      profile,
      "static",
      score,
      "promote-stability-wait",
    );
    counters.heldByPromoteStability += 1;
  }

  const demotion = !decision.dynamic && Boolean(previousDecision?.dynamic);
  if (
    demotion &&
    entry.visibilityState !== "hidden" &&
    frameNowMs - policy.lastModeChangeAt < DEMOTE_GRACE_WINDOW_MS &&
    previousDecision
  ) {
    decision = {
      ...previousDecision,
      id: entry.id,
      priorityScore: score,
      reason: "demote-grace-hold",
    };
    counters.heldByDemotionGrace += 1;
  }

  const nextPolicy: EffectBudgetPolicyState = {
    ...policy,
    id: entry.id,
    lastMode: decision.mode,
    lastDecisionReason: decision.reason,
    lastUpdatedAt: frameNowMs,
  };

  if (entry.interactionState !== "idle") {
    nextPolicy.stableSince = frameNowMs;
  }

  if (!previousDecision) {
    nextPolicy.lastModeChangeAt = frameNowMs;
    nextPolicy.lastPromotedAt = decision.dynamic ? frameNowMs : 0;
    nextPolicy.lastDemotedAt = decision.dynamic ? 0 : frameNowMs;
    return { decision, policy: nextPolicy };
  }

  if (previousDecision.mode !== decision.mode) {
    nextPolicy.lastModeChangeAt = frameNowMs;
  }

  if (decision.dynamic && !previousDecision.dynamic) {
    nextPolicy.lastPromotedAt = frameNowMs;
  }
  if (!decision.dynamic && previousDecision.dynamic) {
    nextPolicy.lastDemotedAt = frameNowMs;
  }

  if (previousDecision.shader && !decision.shader) {
    nextPolicy.shaderCooldownUntil = frameNowMs + SHADER_COOLDOWN_MS;
  }
  if (previousDecision.burst && !decision.burst) {
    nextPolicy.burstCooldownUntil = frameNowMs + BURST_COOLDOWN_MS;
  }

  return { decision, policy: nextPolicy };
};

type BudgetCounters = {
  dynamic: number;
  shader: number;
  burst: number;
  backdrop: number;
};

const createCandidateDecision = (
  entry: RenderSurfaceState,
  profile: RenderProfile,
  score: number,
  counters: BudgetCounters,
): RenderSurfaceDecision => {
  if (entry.visibilityState === "hidden") {
    return createDecision(entry, profile, "static", score, "hidden");
  }

  // Occluded surfaces should degrade aggressively unless actively interacted with.
  if (entry.visibilityState === "occluded" && entry.interactionState === "idle") {
    const wantsBackdrop =
      entry.effectClass === "backdrop" ||
      entry.effectClass === "refractive-edge" ||
      entry.surfaceClass === "shell-surface" ||
      entry.surfaceClass === "panel-surface" ||
      entry.surfaceClass === "toolbar-surface";
    if (wantsBackdrop && counters.backdrop < profile.maxBackdropSurfaces) {
      return createDecision(entry, profile, "backdrop", score, "occluded-backdrop");
    }
    return createDecision(entry, profile, "static", score, "occluded-idle");
  }

  const recipe = resolveSurfaceRecipe(
    entry.surfaceClass,
    entry.effectClass,
    profile,
  );

  if (!recipe.dynamicEligible || entry.effectClass === "static") {
    return createDecision(
      entry,
      profile,
      "static",
      score,
      "static-recipe-or-motion-reduced",
    );
  }

  const wantsShader =
    recipe.shaderEligible &&
    (entry.prefersShader ||
      entry.effectClass === "shader-burst" ||
      entry.effectClass === "liquid-interactive");
  if (wantsShader && counters.shader < profile.maxShaderSurfaces) {
    return createDecision(entry, profile, "shader-active", score, "shader-slot-allocated");
  }

  const wantsBurst =
    recipe.burstEligible &&
    (entry.prefersBurst ||
      entry.interactionState === "active" ||
      entry.interactionState === "focused" ||
      entry.interactionState === "hovered");
  if (wantsBurst && counters.burst < profile.maxLiquidBursts) {
    return createDecision(entry, profile, "burst-animated", score, "burst-slot-allocated");
  }

  const wantsBackdrop =
    entry.effectClass === "backdrop" ||
    entry.effectClass === "refractive-edge" ||
    entry.surfaceClass === "shell-surface" ||
    entry.surfaceClass === "panel-surface" ||
    entry.surfaceClass === "toolbar-surface";
  if (wantsBackdrop && counters.backdrop < profile.maxBackdropSurfaces) {
    return createDecision(entry, profile, "backdrop", score, "backdrop-budget-allocated");
  }

  if (counters.dynamic < profile.maxDynamicSurfaces) {
    return createDecision(
      entry,
      profile,
      "live-composited",
      score,
      "dynamic-budget-allocated",
    );
  }

  return createDecision(entry, profile, "static", score, "budget-capped");
};

export const allocateEffectBudget = (
  surfaces: RenderSurfaceState[],
  profile: RenderProfile,
  options: EffectBudgetAllocationOptions = {},
): EffectBudgetAllocationResult => {
  const allocationStartedAt = nowMs();
  const frameNow = options.frameNowMs ?? allocationStartedAt;
  const previousDecisions = options.previousDecisions ?? new Map<string, RenderSurfaceDecision>();
  const previousPolicyState =
    options.previousPolicyState ?? new Map<string, EffectBudgetPolicyState>();
  const decisions = new Map<string, RenderSurfaceDecision>();
  const policyState = new Map<string, EffectBudgetPolicyState>();

  const counters: BudgetCounters = {
    dynamic: 0,
    shader: 0,
    burst: 0,
    backdrop: 0,
  };

  const heldCounters = {
    heldByDemotionGrace: 0,
    heldByCooldown: 0,
    heldByPromoteStability: 0,
  };

  if (!Array.isArray(surfaces) || surfaces.length === 0) {
    return {
      decisions,
      policyState,
      diagnostics: {
        allocationDurationMs: Number((nowMs() - allocationStartedAt).toFixed(3)),
        consideredSurfaces: 0,
        grantedDynamic: 0,
        grantedShader: 0,
        grantedBurst: 0,
        grantedBackdrop: 0,
        heldByDemotionGrace: 0,
        heldByCooldown: 0,
        heldByPromoteStability: 0,
      },
    };
  }

  const ranked = surfaces
    .map((entry) => ({
      entry,
      score: computePriorityScore(entry, frameNow),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.entry.updatedAt - a.entry.updatedAt;
    });

  for (const { entry, score } of ranked) {
    const candidate = createCandidateDecision(entry, profile, score, counters);
    const previousDecision = previousDecisions.get(entry.id);
    const previousPolicy = previousPolicyState.get(entry.id);
    const { decision, policy } = applyPolicy(
      entry,
      profile,
      candidate,
      score,
      frameNow,
      previousDecision,
      previousPolicy,
      heldCounters,
    );

    decisions.set(entry.id, decision);
    policyState.set(entry.id, policy);

    if (decision.dynamic) counters.dynamic += 1;
    if (decision.shader) counters.shader += 1;
    if (decision.burst) counters.burst += 1;
    if (decision.mode === "backdrop") counters.backdrop += 1;
  }

  return {
    decisions,
    policyState,
    diagnostics: {
      allocationDurationMs: Number((nowMs() - allocationStartedAt).toFixed(3)),
      consideredSurfaces: surfaces.length,
      grantedDynamic: counters.dynamic,
      grantedShader: counters.shader,
      grantedBurst: counters.burst,
      grantedBackdrop: counters.backdrop,
      heldByDemotionGrace: heldCounters.heldByDemotionGrace,
      heldByCooldown: heldCounters.heldByCooldown,
      heldByPromoteStability: heldCounters.heldByPromoteStability,
    },
  };
};
