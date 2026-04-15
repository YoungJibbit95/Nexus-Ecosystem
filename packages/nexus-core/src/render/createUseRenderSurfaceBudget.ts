import { useEffect, useRef, useState } from "react";
import type {
  BudgetPriority,
  InteractionState,
  RenderSurfaceDecision,
  SurfaceMotionClass,
  VisibilityState,
} from "./effectBudget";
import type { EffectClass, SurfaceClass } from "./surfaceRecipes";
import type { RenderCoordinator } from "./renderCoordinator";

export type UseRenderSurfaceBudgetOptions = {
  id?: string;
  surfaceClass: SurfaceClass;
  effectClass: EffectClass;
  interactionState?: InteractionState;
  visibilityState?: VisibilityState;
  budgetPriority?: BudgetPriority;
  prefersShader?: boolean;
  prefersBurst?: boolean;
  areaHint?: number;
  motionClassHint?: SurfaceMotionClass;
  transformOwnerHint?: "surface" | "child" | "none";
  filterOwnerHint?: "surface" | "child" | "none";
  opacityOwnerHint?: "surface" | "child" | "none";
};

const createDefaultDecision = (id: string): RenderSurfaceDecision => ({
  id,
  mode: "static",
  dynamic: false,
  shader: false,
  burst: false,
  priorityScore: 0,
  reason: "uninitialized",
  motionCapability: "static-safe",
  animationComplexity: "none",
  surfaceMotionClass: "content",
  interruptPolicy: "settle-before-interrupt",
  degradationLevel: "static-safe",
  ownerHints: {
    transformOwner: "surface",
    filterOwner: "none",
    opacityOwner: "surface",
  },
});

const createIdFactory = (prefix: string) => {
  let seq = 0;
  return () => {
    seq += 1;
    return `${prefix}-${seq}`;
  };
};

const isSameDecision = (
  a: RenderSurfaceDecision,
  b: RenderSurfaceDecision,
): boolean =>
  a.id === b.id &&
  a.mode === b.mode &&
  a.dynamic === b.dynamic &&
  a.shader === b.shader &&
  a.burst === b.burst &&
  a.priorityScore === b.priorityScore &&
  a.reason === b.reason &&
  a.motionCapability === b.motionCapability &&
  a.animationComplexity === b.animationComplexity &&
  a.surfaceMotionClass === b.surfaceMotionClass &&
  a.interruptPolicy === b.interruptPolicy &&
  a.degradationLevel === b.degradationLevel &&
  a.ownerHints.transformOwner === b.ownerHints.transformOwner &&
  a.ownerHints.filterOwner === b.ownerHints.filterOwner &&
  a.ownerHints.opacityOwner === b.ownerHints.opacityOwner;

export const createUseRenderSurfaceBudget = (opts: {
  getRenderCoordinator: () => RenderCoordinator;
  idPrefix: string;
  initialVisibility?: VisibilityState;
}) => {
  const createId = createIdFactory(opts.idPrefix);
  const initialVisibility = opts.initialVisibility ?? "visible";

  return function useRenderSurfaceBudget(
    options: UseRenderSurfaceBudgetOptions,
  ): RenderSurfaceDecision {
    const {
      id,
      surfaceClass,
      effectClass,
      interactionState = "idle",
      visibilityState = initialVisibility,
      budgetPriority = "normal",
      prefersShader = false,
      prefersBurst = false,
      areaHint,
      motionClassHint,
      transformOwnerHint,
      filterOwnerHint,
      opacityOwnerHint,
    } = options;

    const surfaceIdRef = useRef<string>(id || createId());
    const [decision, setDecision] = useState<RenderSurfaceDecision>(() =>
      createDefaultDecision(surfaceIdRef.current),
    );
    const registrationRef = useRef<ReturnType<
      ReturnType<typeof opts.getRenderCoordinator>["registerSurface"]
    > | null>(null);

    useEffect(() => {
      const coordinator = opts.getRenderCoordinator();
      const registration = coordinator.registerSurface({
        id: surfaceIdRef.current,
        surfaceClass,
        effectClass,
        interactionState,
        visibilityState,
        budgetPriority,
        prefersShader,
        prefersBurst,
        areaHint,
        motionClassHint,
        transformOwnerHint,
        filterOwnerHint,
        opacityOwnerHint,
      });
      registrationRef.current = registration;
      const initial = registration.getDecision();
      if (initial) {
        setDecision((prev) => (isSameDecision(prev, initial) ? prev : initial));
      }
      const unsubscribe = registration.subscribe((nextDecision) => {
        setDecision((prev) =>
          isSameDecision(prev, nextDecision) ? prev : nextDecision,
        );
      });
      return () => {
        unsubscribe();
        registration.unregister();
        registrationRef.current = null;
      };
    }, []);

    useEffect(() => {
      registrationRef.current?.update({
        surfaceClass,
        effectClass,
        interactionState,
        visibilityState,
        budgetPriority,
        prefersShader,
        prefersBurst,
        areaHint,
        motionClassHint,
        transformOwnerHint,
        filterOwnerHint,
        opacityOwnerHint,
      });
    }, [
      areaHint,
      budgetPriority,
      effectClass,
      interactionState,
      prefersBurst,
      prefersShader,
      surfaceClass,
      visibilityState,
      motionClassHint,
      transformOwnerHint,
      filterOwnerHint,
      opacityOwnerHint,
    ]);

    return decision;
  };
};
