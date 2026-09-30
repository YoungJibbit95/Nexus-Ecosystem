const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
app.setPath('userData', process.env.NEXUS_EXCHANGE_PROFILE)
app.disableHardwareAcceleration()
app.on('window-all-closed', () => {})
const timer = setTimeout(() => app.exit(1), 120000)
app.whenReady().then(async () => {
  const outputs = []
  const open = async url => {
    const window = new BrowserWindow({ show: false, webPreferences: { partition: 'persist:exchange-fixture', contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } })
    await window.loadURL(url)
    await window.webContents.executeJavaScript("new Promise(resolve => { const check = () => window.exchangeReady ? resolve() : setTimeout(check, 20); check() })")
    return window
  }
  const run = async (window, phase, input) => {
    const result = await window.webContents.executeJavaScript(`window.runExchange(${JSON.stringify(phase)}, ${JSON.stringify(input ?? null)})`)
    outputs.push({ phase, checks: result.checks })
    console.log(`[planning-exchange] ${phase}: ${result.checks.length} assertions passed`)
    return result.exchange
  }
  let main, mobile
  try {
    main = await open(process.env.NEXUS_EXCHANGE_MAIN_URL)
    const original = await run(main, 'source')
    mobile = await open(process.env.NEXUS_EXCHANGE_MOBILE_URL)
    const returned = await run(mobile, 'mobile', original)
    await run(main, 'return', returned)
    await run(main, 'planning-fault')
    main.destroy(); main = await open(process.env.NEXUS_EXCHANGE_MAIN_URL)
    await run(main, 'delivery-fault')
    main.destroy(); main = await open(process.env.NEXUS_EXCHANGE_MAIN_URL)
    await run(main, 'delivery-double-fault')
    main.destroy(); main = await open(process.env.NEXUS_EXCHANGE_MAIN_URL)
    await run(main, 'recover')
    fs.writeFileSync(process.env.NEXUS_EXCHANGE_RESULTS, JSON.stringify(outputs, null, 2))
    clearTimeout(timer); app.exit(0)
  } catch (error) {
    fs.writeFileSync(process.env.NEXUS_EXCHANGE_RESULTS, JSON.stringify({ outputs, error: String(error), stack: error.stack }, null, 2))
    console.error(error); clearTimeout(timer); app.exit(1)
  }
})
