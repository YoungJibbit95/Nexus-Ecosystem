const { app, BrowserWindow } = require('electron')
const { writeFile, mkdir } = require('node:fs/promises')
const path = require('node:path')
app.setPath('userData', process.env.NEXUS_PLANNING_PROFILE)
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
const timeout = setTimeout(() => { console.error('Planning interaction smoke timed out'); app.exit(1) }, 120000)
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1440, height: 1100, webPreferences: { partition: 'persist:planning-smoke', contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } })
  const stages = []
  try {
    for (const stage of ['forms', 'agenda-clarity', 'agenda-accessibility', 'reload', 'fault', 'reload', 'inject-unsupported', 'unsupported']) {
      if (stage === 'agenda-accessibility') window.setContentSize(390, 844)
      await window.loadURL(`${process.env.NEXUS_PLANNING_URL}?stage=${stage}`)
      window.webContents.focus()
      if (stage === 'agenda-clarity') {
        await window.webContents.executeJavaScript('new Promise(resolve => { const poll = () => window.planningAgendaDisclosureReady || window.planningInteractionResult ? resolve() : setTimeout(poll, 25); poll() })')
        if (!await window.webContents.executeJavaScript('Boolean(window.planningInteractionResult)')) {
          await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
          if (process.env.NEXUS_PLANNING_SCREENSHOTS) { await mkdir(process.env.NEXUS_PLANNING_SCREENSHOTS, { recursive: true }); await writeFile(path.join(process.env.NEXUS_PLANNING_SCREENSHOTS, 'agenda-default.png'), (await window.webContents.capturePage()).toPNG()) }
          window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' }); window.webContents.sendInputEvent({ type: 'char', keyCode: '\r' }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Return' })
          await window.webContents.executeJavaScript('window.resumePlanningAgendaDisclosure()')
        }
      }
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
      if (stage === 'agenda-clarity') {
        result.evidence.viewports = []
        for (const [name, width, height, zoom] of [['desktop', 1440, 1100, 1], ['narrow', 720, 900, 1], ['zoom200', 1440, 1100, 2]]) {
          window.setContentSize(width, height)
          await window.webContents.executeJavaScript(`new Promise((resolve, reject) => { let tries = 0; const poll = () => Math.abs(innerWidth - ${width / window.webContents.getZoomFactor()}) <= 1 ? resolve() : ++tries < 200 ? setTimeout(poll, 25) : reject(new Error('Calendar window resize was not applied')); poll() })`)
          window.webContents.setZoomFactor(zoom)
          await window.webContents.executeJavaScript(`new Promise((resolve, reject) => { let tries = 0; const poll = () => Math.abs(innerWidth - ${width / zoom}) <= 1 ? requestAnimationFrame(() => requestAnimationFrame(resolve)) : ++tries < 200 ? setTimeout(poll, 25) : reject(new Error('Calendar browser zoom was not applied')); poll() })`)
          result.evidence.viewports.push({ name, zoom, ...await window.webContents.executeJavaScript('window.verifyPlanningAgendaViewport()') })
          await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
          if (process.env.NEXUS_PLANNING_SCREENSHOTS) await writeFile(path.join(process.env.NEXUS_PLANNING_SCREENSHOTS, `agenda-${name}.png`), (await window.webContents.capturePage()).toPNG())
        }
        result.checks.push('Main Agenda has no horizontal overflow at desktop/narrow widths and actual browser zoom 200%')
        const popupControls = "Array.from(document.querySelector('.nx-calendar-agenda-dialog').querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [href], [tabindex]:not([tabindex=\"-1\"])')).filter(element => element.checkVisibility() && element.getClientRects().length > 0)"
        await window.webContents.executeJavaScript(`(${popupControls}).at(-1).focus()`)
        result.evidence.popupKeyboard = { before: await window.webContents.executeJavaScript('document.activeElement?.outerHTML') }
        window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Tab' }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Tab' })
        if (!await window.webContents.executeJavaScript(`document.activeElement === (${popupControls})[0]`)) throw new Error(`Agenda popup Tab did not wrap to first control: ${await window.webContents.executeJavaScript('document.activeElement?.outerHTML')}`)
        window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Tab', modifiers: ['shift'] }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Tab', modifiers: ['shift'] })
        if (!await window.webContents.executeJavaScript(`document.activeElement === (${popupControls}).at(-1)`)) throw new Error('Agenda popup Shift-Tab did not wrap to last control')
        result.checks.push('Native Tab and Shift-Tab retain keyboard focus within the Agenda popup')
        window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' })
        await window.webContents.executeJavaScript("new Promise((resolve, reject) => { let tries = 0; const poll = () => !document.querySelector('.nx-calendar-agenda-dialog') ? resolve() : ++tries < 200 ? setTimeout(poll, 25) : reject(new Error('Native Escape did not close Agenda popup')); poll() })")
        await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        if (!await window.webContents.executeJavaScript("document.querySelector('.nx-calendar-timeline-panel') && document.activeElement?.textContent.trim() === 'Agenda'")) throw new Error('Closing Agenda popup did not restore Calendar and launcher focus')
        result.checks.push('Native Escape closes Agenda, restores the previous Calendar mode and returns focus to its launcher')
        window.webContents.setZoomFactor(1); window.setContentSize(1440, 1100)
      }
      if (stage === 'agenda-accessibility') { result.checks.push('Native Tab/Shift-Tab move through actual Agenda form fields'); window.setContentSize(1440, 1100) }
    }
    if (process.env.NEXUS_PLANNING_RESULT) await writeFile(process.env.NEXUS_PLANNING_RESULT, JSON.stringify({ ok: true, stages }, null, 2))
    clearTimeout(timeout); window.destroy(); app.exit(0)
  } catch (error) {
    if (process.env.NEXUS_PLANNING_RESULT) await writeFile(process.env.NEXUS_PLANNING_RESULT, JSON.stringify({ ok: false, stages, error: String(error) }, null, 2))
    console.error(error); clearTimeout(timeout); app.exit(1)
  }
})
