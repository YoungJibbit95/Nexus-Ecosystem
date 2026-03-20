<<<<<<< HEAD
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
=======
<<<<<<< HEAD
import { getElements } from './control/dom.js'
import { bindControlEvents } from './control/events.js'
import { parseErrorMessage } from './control/helpers.js'
import { createCore } from './control/core.js'
import { hasStoredBaseUrl, createInitialState, persistApiSettings, persistToken } from './control/state.js'
import { createWorkspaceActions } from './control/workspace.js'
>>>>>>> e252fb1 (Update website)

const state = createInitialState();
state.hasStoredBaseUrl = hasStoredBaseUrl;

<<<<<<< HEAD
const el = getElements();
const core = createCore({ state, el });
=======
const el = getElements()
const core = createCore({ state, el })
=======
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
>>>>>>> f0559a4 (api url changed to real site)
>>>>>>> e252fb1 (Update website)

const workspace = createWorkspaceActions({
  state,
  el,
  apiRequest: core.apiRequest,
  setStatus: core.setStatus,
  parseErrorMessage,
<<<<<<< HEAD
});
=======
<<<<<<< HEAD
})
>>>>>>> e252fb1 (Update website)

const ensureSession = async () => {
  const valid = await core.ensureSession();
  if (!valid) {
    persistToken(state);
  }
<<<<<<< HEAD
  return valid;
};
=======
  return valid
}
=======
});

const ensureSession = async () => {
  const valid = await core.ensureSession();
  if (!valid) {
    persistToken(state);
  }
  return valid;
};
>>>>>>> f0559a4 (api url changed to real site)
>>>>>>> e252fb1 (Update website)

bindControlEvents({
  state,
  el,
  core,
  workspace,
  persistApiSettings,
  persistToken,
  ensureSession,
<<<<<<< HEAD
});
=======
<<<<<<< HEAD
})
>>>>>>> e252fb1 (Update website)

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

<<<<<<< HEAD
bootstrap();
=======
bootstrap()
=======
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
>>>>>>> f0559a4 (api url changed to real site)
>>>>>>> e252fb1 (Update website)
