export type MatrixRow = {
  view: string
  main: boolean
  mobile: boolean
  code: boolean
  codeMobile: boolean
  control: boolean
}

export const viewMatrix: MatrixRow[] = [
  { view: 'dashboard', main: true, mobile: true, code: false, codeMobile: false, control: true },
  { view: 'today-layer', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'quick-capture', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'workspace-handoff', main: true, mobile: true, code: false, codeMobile: false, control: true },
  { view: 'notes', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'code', main: true, mobile: true, code: true, codeMobile: true, control: false },
  { view: 'tasks', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'reminders', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'canvas', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'files', main: true, mobile: true, code: true, codeMobile: true, control: false },
  { view: 'flux', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'devtools', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'settings', main: true, mobile: true, code: true, codeMobile: true, control: true },
  { view: 'info', main: true, mobile: true, code: false, codeMobile: false, control: true },
  { view: 'command-palette', main: true, mobile: true, code: true, codeMobile: true, control: false },
  { view: 'terminal', main: true, mobile: true, code: true, codeMobile: true, control: false },
  { view: 'render-diagnostics', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'live-sync', main: false, mobile: false, code: false, codeMobile: false, control: true },
  { view: 'paywalls', main: true, mobile: true, code: false, codeMobile: false, control: true },
  { view: 'explorer', main: false, mobile: false, code: true, codeMobile: true, control: false },
  { view: 'search', main: false, mobile: false, code: true, codeMobile: true, control: false },
  { view: 'git', main: false, mobile: false, code: true, codeMobile: true, control: false },
  { view: 'debug', main: false, mobile: false, code: true, codeMobile: true, control: false },
  { view: 'extensions', main: false, mobile: false, code: true, codeMobile: true, control: false },
  { view: 'problems', main: false, mobile: false, code: true, codeMobile: true, control: false },
]
