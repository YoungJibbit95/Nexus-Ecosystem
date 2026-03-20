import { apiPanelMarkup } from './sections/api-panel.js'
import { authPanelMarkup } from './sections/auth-panel.js'
import { topbarMarkup } from './sections/topbar.js'
import { workspaceMarkup } from './workspace/index.js'

export const shellMarkup = () => `
  <div class="page-bg"></div>
  <main class="app-shell">
    ${topbarMarkup()}
    ${apiPanelMarkup()}
    ${authPanelMarkup()}
    ${workspaceMarkup()}
  </main>
`

export const renderShell = (root) => {
  if (!root) {
    throw new Error('CONTROL_ROOT_MISSING')
  }

  root.innerHTML = shellMarkup()
}
