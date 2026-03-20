import { bindManagementEvents } from './events/management-events.js'
import { bindSessionEvents } from './events/session-events.js'
import { bindTabEvents } from './events/tab-events.js'
import { bindV2AndGuideEvents } from './events/v2-guide-events.js'

export const bindControlEvents = ({
  state,
  el,
  core,
  workspace,
  persistApiSettings,
  persistToken,
  ensureSession,
}) => {
  bindSessionEvents({
    state,
    el,
    core,
    workspace,
    persistApiSettings,
    persistToken,
    ensureSession,
  })

  bindManagementEvents({
    state,
    el,
    core,
    workspace,
  })

  bindV2AndGuideEvents({
    el,
    core,
    workspace,
  })

  bindTabEvents({
    el,
    activateTab: core.activateTab,
  })
}
