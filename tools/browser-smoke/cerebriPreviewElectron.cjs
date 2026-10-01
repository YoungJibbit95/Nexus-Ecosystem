const { app, BrowserWindow } = require('electron')
const { writeFile, mkdir } = require('node:fs/promises')
const path = require('node:path')
app.setPath('userData', process.env.NEXUS_CEREBRI_N2_PROFILE)
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-background-timer-throttling')
const timeout = setTimeout(() => { console.error('Cerebri local browser smoke timed out'); app.exit(1) }, 120000)
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1280, height: 1200, webPreferences: { partition: 'persist:cerebri-n2', contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } })
  const stages = []
  window.webContents.on('console-message', (_event, _level, message) => { if (/error|Error|failed/.test(message)) console.error(message) })
  try {
    for (const stage of ['workflow', 'reload']) {
      await window.loadURL(`${process.env.NEXUS_CEREBRI_N2_URL}?stage=${stage}&capture=${process.env.NEXUS_CEREBRI_N2_IMAGES ? '1' : '0'}`)
      window.webContents.focus()
      if (process.env.NEXUS_CEREBRI_N2_IMAGES) {
        await mkdir(process.env.NEXUS_CEREBRI_N2_IMAGES, { recursive: true })
        for (const checkpoint of stage === 'workflow' ? ['preview', 'acknowledged'] : []) {
          await window.webContents.executeJavaScript(`new Promise(resolve => { const poll = () => window.cerebriN2Checkpoint === '${checkpoint}' ? resolve(true) : window.cerebriN2Result ? resolve(false) : setTimeout(poll, 20); poll() })`)
          await writeFile(path.join(process.env.NEXUS_CEREBRI_N2_IMAGES, checkpoint + '.png'), (await window.webContents.capturePage()).toPNG())
          await window.webContents.executeJavaScript('window.cerebriN2Continue = true')
        }
      }
      const result = await window.webContents.executeJavaScript('new Promise(resolve => { const poll = () => window.cerebriN2Result ? resolve(window.cerebriN2Result) : setTimeout(poll, 20); poll() })')
      stages.push(result); console.log(JSON.stringify(result, null, 2))
      if (!result.ok) throw new Error(result.error)
    }
    const result = { ok: true, runtime: { electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node, platform: process.platform }, stages }
    if (process.env.NEXUS_CEREBRI_N2_RESULT) await writeFile(process.env.NEXUS_CEREBRI_N2_RESULT, JSON.stringify(result, null, 2))
    clearTimeout(timeout); window.destroy(); app.exit(0)
  } catch (error) {
    if (process.env.NEXUS_CEREBRI_N2_RESULT) await writeFile(process.env.NEXUS_CEREBRI_N2_RESULT, JSON.stringify({ ok: false, stages, error: String(error) }, null, 2))
    console.error(error); clearTimeout(timeout); app.exit(1)
  }
})
