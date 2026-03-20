import { renderShell } from './layout/shell.js'

const root = document.getElementById('control-root')
renderShell(root)

await import('./app.js')
