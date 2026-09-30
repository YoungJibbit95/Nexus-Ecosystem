const { app, BrowserWindow } = require('electron')
const { writeFile } = require('node:fs/promises')
app.setPath('userData', process.env.NEXUS_CAPTURE_PROFILE)
app.disableHardwareAcceleration()
app.on('window-all-closed', () => {})
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
const timeout = setTimeout(() => { console.error('Application capture timed out'); app.exit(1) }, 240000)
app.whenReady().then(async () => {
  const stages = []
  try {
    for (const client of ['main','mobile']) {
      const window = new BrowserWindow({ show: false, width: 1440, height: 1100, webPreferences: { partition: 'persist:application-capture', contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } })
      for (const phase of ['forms','accessibility','fault','reload']) {
        if (phase === 'forms' || phase === 'reload') await window.loadURL(`${process.env[client === 'main' ? 'NEXUS_CAPTURE_MAIN_URL' : 'NEXUS_CAPTURE_MOBILE_URL']}?client=${client}`)
        if (phase === 'accessibility') window.setContentSize(390, 844)
        await window.webContents.executeJavaScript('new Promise(resolve => { const poll = () => window.runApplicationCapture ? resolve() : setTimeout(poll, 25); poll() })')
        const result = await window.webContents.executeJavaScript(`window.runApplicationCapture(${JSON.stringify(phase)}).catch(error => ({ ok:false,error:String(error),stack:error.stack,body:document.body.innerText.slice(0,1000) }))`)
        stages.push(result); console.log(JSON.stringify(result, null, 2))
        if (result.ok === false) throw new Error(result.error)
        if (phase === 'accessibility') window.setContentSize(1440, 1100)
      }
      window.destroy()
    }
    await writeFile(process.env.NEXUS_CAPTURE_RESULTS, JSON.stringify({ ok: true, stages }, null, 2)); clearTimeout(timeout); app.exit(0)
  } catch (error) { await writeFile(process.env.NEXUS_CAPTURE_RESULTS, JSON.stringify({ ok:false,stages,error:String(error) }, null, 2)); console.error(error); clearTimeout(timeout); app.exit(1) }
})
