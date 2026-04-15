import {
  createUseRenderSurfaceBudget,
  type UseRenderSurfaceBudgetOptions,
} from "@nexus/core";
import { getRenderCoordinator } from "./renderRuntime";

const useBudget = createUseRenderSurfaceBudget({
  getRenderCoordinator,
  idPrefix: "main-surface",
  initialVisibility: "visible",
});

export const useRenderSurfaceBudget = (
  options: UseRenderSurfaceBudgetOptions,
) => useBudget(options);
