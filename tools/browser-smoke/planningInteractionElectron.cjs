const { app, BrowserWindow } = require('electron')
const { writeFile } = require('node:fs/promises')
app.setPath('userData', process.env.NEXUS_PLANNING_PROFILE)
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
const timeout = setTimeout(() => { console.error('Planning interaction smoke timed out'); app.exit(1) }, 120000)
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1440, height: 1100, webPreferences: { partition: 'persist:planning-smoke', contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } })
  const stages = []
  try {
    for (const stage of ['forms', 'agenda-accessibility', 'reload', 'fault', 'reload', 'inject-unsupported', 'unsupported']) {
      if (stage === 'agenda-accessibility') window.setContentSize(390, 844)
      await window.loadURL(`${process.env.NEXUS_PLANNING_URL}?stage=${stage}`)
      window.webContents.focus()
      if (stage === 'agenda-accessibility') {
        await window.webContents.executeJavaScript('new Promise(resolve => { const poll = () => window.planningAgendaKeyboardReady || window.planningInteractionResult ? resolve() : setTimeout(poll, 25); poll() })')
        if (!await window.webContents.executeJavaScript('Boolean(window.planningInteractionResult)')) {
          window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Tab' }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Tab' })
          const tabbed = await window.webContents.executeJavaScript('document.activeElement?.getAttribute("aria-label") === "Aufgabenfrist"')
          if (!tabbed) throw new Error('Native Agenda Tab did not focus the next deadline field')
          window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Tab', modifiers: ['shift'] }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Tab', modifiers: ['shift'] })
          const returned = await window.webContents.executeJavaScript('document.activeElement?.getAttribute("aria-label") === "Planungstitel"')
          if (!returned) throw new Error('Native Agenda Shift-Tab did not return to title')
          window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' }); window.webContents.sendInputEvent({ type: 'char', keyCode: '\r' }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Return' })
          await window.webContents.executeJavaScript('window.resumePlanningAgendaKeyboard()')
        }
      }
      const result = await window.webContents.executeJavaScript('new Promise(resolve => { const poll = () => window.planningInteractionResult ? resolve(window.planningInteractionResult) : setTimeout(poll, 25); poll() })')
      stages.push(result)
      console.log(JSON.stringify(result, null, 2))
      if (!result.ok) throw new Error(result.error)
      if (stage === 'agenda-accessibility') { result.checks.push('Native Tab/Shift-Tab move through actual Agenda form fields'); window.setContentSize(1440, 1100) }
    }
    if (process.env.NEXUS_PLANNING_RESULT) await writeFile(process.env.NEXUS_PLANNING_RESULT, JSON.stringify({ ok: true, stages }, null, 2))
    clearTimeout(timeout); window.destroy(); app.exit(0)
  } catch (error) {
    if (process.env.NEXUS_PLANNING_RESULT) await writeFile(process.env.NEXUS_PLANNING_RESULT, JSON.stringify({ ok: false, stages, error: String(error) }, null, 2))
    console.error(error); clearTimeout(timeout); app.exit(1)
  }
})
