import { getElements } from "./control/dom.js";
import { bindControlEvents } from "./control/events.js";
import { parseErrorMessage } from "./control/helpers.js";
import { createCore } from "./control/core.js";
import {
  hasStoredBaseUrl,
  createInitialState,
  persistApiSettings,
  persistToken,
} from "./control/state.js";
import { createWorkspaceActions } from "./control/workspace.js";

const state = createInitialState();
state.hasStoredBaseUrl = hasStoredBaseUrl;

const el = getElements();
const core = createCore({ state, el });

const workspace = createWorkspaceActions({
  state,
  el,
  apiRequest: core.apiRequest,
  setStatus: core.setStatus,
  parseErrorMessage,
});

const ensureSession = async () => {
  const valid = await core.ensureSession();
  if (!valid) {
    persistToken(state);
  }
  return valid;
};

bindControlEvents({
  state,
  el,
  core,
  workspace,
  persistApiSettings,
  persistToken,
  ensureSession,
});

const bootstrap = async () => {
  await core.loadRuntimeConfig();
  persistApiSettings(state);
  core.initApiSettingsUi();
  await core.runBootstrapHandshake({ force: true });

  const hasSession = await ensureSession();
  if (!hasSession) {
    core.setStatus("Bitte einloggen, um das Ecosystem zu verwalten.");
    return;
  }

  try {
    await workspace.refreshWorkspace();
    await core.runBootstrapHandshake({ force: true });
    core.setStatus(
      `Eingeloggt als ${state.session.username} (${state.session.role})`,
      "success",
    );
  } catch (error) {
    core.setStatus(
      `Daten konnten nicht geladen werden: ${parseErrorMessage(error)}`,
      "error",
    );
  }
};

bootstrap();
