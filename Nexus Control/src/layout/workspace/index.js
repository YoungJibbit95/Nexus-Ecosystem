import { auditTabMarkup } from './audit.js'
import { buildTabMarkup } from './build.js'
import { commandsTabMarkup } from './commands.js'
import { dashboardTabMarkup } from './dashboard.js'
import { devicesTabMarkup } from './devices.js'
import { guidesTabMarkup } from './guides.js'
import { liveSyncTabMarkup } from './livesync.js'
import { workspaceNavMarkup } from './nav-tabs.js'
import { paywallsTabMarkup } from './paywalls.js'
import { policiesTabMarkup } from './policies.js'
import { settingsTabMarkup } from './settings.js'

export const workspaceMarkup = () => `
  <section id="workspace" class="workspace hidden">
    ${workspaceNavMarkup()}
    ${dashboardTabMarkup()}
    ${buildTabMarkup()}
    ${liveSyncTabMarkup()}
    ${settingsTabMarkup()}
    ${commandsTabMarkup()}
    ${policiesTabMarkup()}
    ${paywallsTabMarkup()}
    ${devicesTabMarkup()}
    ${auditTabMarkup()}
    ${guidesTabMarkup()}
  </section>
`
