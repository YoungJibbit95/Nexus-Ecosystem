const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
app.setPath('userData', process.env.NEXUS_REMINDER_TIME_PROFILE)
app.disableHardwareAcceleration()
app.on('window-all-closed', () => {})
const timeout = setTimeout(() => { console.error('Reminder time UI smoke timed out'); app.exit(1) }, 90000)
app.whenReady().then(async () => {
  const results = []
  try {
    for (const zone of ['Europe/Berlin']) {
      console.log(`[reminder-time-ui] opening ${zone}`)
      const window = new BrowserWindow({ show: false, webPreferences: { partition: `reminder-time-${zone}-${process.pid}`, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } })
      window.webContents.on('console-message', (event) => {
        if (event.level >= 2 && event.message) console.log(`[reminder-renderer] ${event.message}`)
      })
      await window.loadURL('about:blank')
      window.webContents.debugger.attach('1.3')
      console.log('[reminder-time-ui] debugger attached')
      await window.webContents.debugger.sendCommand('Emulation.setTimezoneOverride', { timezoneId: zone })
      console.log('[reminder-time-ui] time zone applied')
      const phases=process.env.NEXUS_REMINDER_TIME_PHASE==='before'?['before']:['after','restart']
      for(const phase of phases) {
      await window.loadURL(`${process.env.NEXUS_REMINDER_TIME_URL}?phase=${phase}`)
      console.log('[reminder-time-ui] page loaded')
      const result = await window.webContents.executeJavaScript(`new Promise(resolve => { const check = () => window.reminderTimeTestResult ? resolve(window.reminderTimeTestResult) : setTimeout(check, 20); check() })`)
      results.push(result)
      if (!result.ok) throw new Error(result.error)
      console.log(`[reminder-time-ui] ${zone}: ${result.results.length} probes, ${result.checks.length} assertions passed`)
      }
      window.destroy()
    }
    fs.writeFileSync(process.env.NEXUS_REMINDER_TIME_RESULTS, JSON.stringify(results, null, 2))
    clearTimeout(timeout)
    app.exit(0)
  } catch (error) {
    fs.writeFileSync(process.env.NEXUS_REMINDER_TIME_RESULTS, JSON.stringify(results, null, 2))
    console.error(error)
    clearTimeout(timeout)
    app.exit(1)
  }
})
