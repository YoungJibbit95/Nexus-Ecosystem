const { app, BrowserWindow } = require('electron')
const { writeFile } = require('node:fs/promises')
app.setPath('userData', process.env.NEXUS_TASK_INTERACTION_PROFILE)
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
const timeout = setTimeout(() => { console.error('Task interaction smoke timed out'); app.exit(1) }, 90000)
app.whenReady().then(async () => {
  const offscreen = process.env.NEXUS_TASK_INTERACTION_STAGE === 'visual'
  const window = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { offscreen, partition: `task-interaction-${process.pid}`, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } })
  try {
    await window.loadURL(`${process.env.NEXUS_TASK_INTERACTION_URL}?stage=${process.env.NEXUS_TASK_INTERACTION_STAGE || 'after'}`)
    window.webContents.focus()
    const result = await window.webContents.executeJavaScript('new Promise(resolve => { const poll = () => window.taskInteractionResult ? resolve(window.taskInteractionResult) : setTimeout(poll, 25); poll() })')
    if (process.env.NEXUS_TASK_INTERACTION_RESULT) await writeFile(process.env.NEXUS_TASK_INTERACTION_RESULT, JSON.stringify(result, null, 2))
    if (process.env.NEXUS_TASK_INTERACTION_SCREENSHOT) {
      if (offscreen) {
        const painted = new Promise(resolve => window.webContents.once('paint', (_event, _rect, image) => resolve(image)))
        window.webContents.invalidate()
        await writeFile(process.env.NEXUS_TASK_INTERACTION_SCREENSHOT, (await painted).toPNG())
      } else await writeFile(process.env.NEXUS_TASK_INTERACTION_SCREENSHOT, (await window.webContents.capturePage(undefined, { stayHidden: true })).toPNG())
    }
    console.log(JSON.stringify(result, null, 2))
    if (!result.ok) throw new Error(result.error)
    clearTimeout(timeout)
    window.destroy()
    app.exit(0)
  } catch (error) { console.error(error); clearTimeout(timeout); app.exit(1) }
})
