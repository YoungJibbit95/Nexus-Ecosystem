import { createApiCore } from "./core/api-core.js";
import { createRuntimeCore } from "./core/runtime-core.js";
import { createStatusCore } from "./core/status-core.js";
import { createUiCore } from "./core/ui-core.js";

export const createCore = ({ state, el }) => {
  const statusCore = createStatusCore({ el });
  const apiCore = createApiCore({ state });
  const runtimeCore = createRuntimeCore({
    state,
    el,
    setBootstrapInfo: statusCore.setBootstrapInfo,
    apiRequest: apiCore.apiRequest,
  });
  const uiCore = createUiCore({
    state,
    el,
    apiRequest: apiCore.apiRequest,
    getCapabilities: apiCore.getCapabilities,
    getRole: apiCore.getRole,
    updateApiUrlInputLock: runtimeCore.updateApiUrlInputLock,
  });

  return {
    ...statusCore,
    ...apiCore,
    ...runtimeCore,
    ...uiCore,
  };
};
