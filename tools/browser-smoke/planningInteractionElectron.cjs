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
          await window.webContents.executeJavaScript('new Promise(resolve => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(resolve)), 350))')
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
        const popupControls = "Array.from(document.querySelector('.nx-agenda-editor').querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')).filter(element => element.checkVisibility() && element.getClientRects().length > 0)"
        await window.webContents.executeJavaScript(`(${popupControls}).at(-1).focus()`)
        result.evidence.popupKeyboard = { before: await window.webContents.executeJavaScript('document.activeElement?.outerHTML') }
        window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Tab' }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Tab' })
        await window.webContents.executeJavaScript(`new Promise((resolve, reject) => { let tries = 0; const poll = () => document.activeElement === (${popupControls})[0] ? resolve() : ++tries < 100 ? setTimeout(poll, 10) : reject(new Error('Entry drawer Tab did not wrap to first control')); poll() })`)
        window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Tab', modifiers: ['shift'] }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Tab', modifiers: ['shift'] })
        await window.webContents.executeJavaScript(`new Promise((resolve, reject) => { let tries = 0; const poll = () => document.activeElement === (${popupControls}).at(-1) ? resolve() : ++tries < 100 ? setTimeout(poll, 10) : reject(new Error('Entry drawer Shift-Tab did not wrap to last control')); poll() })`)
        result.checks.push('Native Tab and Shift-Tab retain keyboard focus within the entry drawer')
        window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' })
        await window.webContents.executeJavaScript("new Promise((resolve, reject) => { let tries = 0; const poll = () => document.querySelector('.nx-agenda-editor-layer')?.hidden ? resolve() : ++tries < 200 ? setTimeout(poll, 25) : reject(new Error('Native Escape did not close the entry drawer')); poll() })")
        await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        if (!await window.webContents.executeJavaScript("document.querySelector('.nx-agenda-workspace') && document.activeElement?.hasAttribute('data-agenda-open-editor')")) throw new Error('Closing the entry drawer did not retain Agenda and restore launcher focus')
        result.checks.push('Native Escape closes the entry drawer, keeps the Agenda workspace and returns focus to its launcher')
        await window.webContents.executeJavaScript("Array.from(document.querySelector('[aria-label=\"Kalenderansicht\"]').querySelectorAll('button')).find(button => button.textContent.trim() === 'Tag').click()")
        await window.webContents.executeJavaScript("new Promise(resolve => { const poll = () => document.querySelector('.nx-calendar-timeline-panel') ? resolve() : setTimeout(poll, 10); poll() })")
        await window.webContents.executeJavaScript("Array.from(document.querySelector('[aria-label=\"Kalenderansicht\"]').querySelectorAll('button')).find(button => button.textContent.trim() === 'Agenda').click()")
        await window.webContents.executeJavaScript("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
        if (!await window.webContents.executeJavaScript("document.querySelector('.nx-agenda-editor-layer')?.hidden && document.querySelector('.nx-agenda-columns')?.checkVisibility()")) throw new Error('Returning to Agenda reopened a consumed editor or import request')
        result.checks.push('Returning to Agenda keeps consumed entry and import requests closed')
        window.webContents.setZoomFactor(1); window.setContentSize(1440, 1100)
        await window.webContents.executeJavaScript("new Promise(resolve => { const poll = () => innerWidth === 1440 ? setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(resolve)), 350) : setTimeout(poll, 10); poll() })")
        if (process.env.NEXUS_PLANNING_SCREENSHOTS) await writeFile(path.join(process.env.NEXUS_PLANNING_SCREENSHOTS, 'agenda-complete.png'), (await window.webContents.capturePage()).toPNG())
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
