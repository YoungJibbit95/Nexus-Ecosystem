const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const os = require('node:os')
app.setPath('userData', path.join(os.tmpdir(), `nexus-persistence-test-${process.pid}`))
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.disableHardwareAcceleration()
const timeout = setTimeout(() => { console.error('Persistence browser smoke timed out'); app.exit(1) }, 60000)
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { partition: `persistence-test-${process.pid}`, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } })
  try {
    for (const stage of (process.env.NEXUS_PERSISTENCE_SMOKE_STAGES || 'write,reload,handoff-main,handoff-main-reload,handoff-main-rollback-fail,handoff-main-recover,handoff-main-loose,handoff-mobile,handoff-mobile-reload,handoff-mobile-interrupt,handoff-mobile-recover,characterize-empty,empty-reload').split(',')) {
      await window.loadURL(`${process.env.NEXUS_PERSISTENCE_SMOKE_URL}?stage=${stage}`)
      const result = await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
        const check = () => window.persistenceTestResult ? resolve(window.persistenceTestResult) : setTimeout(check, 20);
        check();
      })`)
      if (!result.ok) throw new Error(result.error)
      console.log(`[persistence-browser] ${stage}: ${result.checks.join('; ')}`)
    }
    clearTimeout(timeout)
    app.exit(0)
  } catch (error) { console.error(error); clearTimeout(timeout); app.exit(1) }
})
