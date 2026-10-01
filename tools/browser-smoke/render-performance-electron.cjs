const { app, BrowserWindow } = require('electron')
const fs = require('node:fs/promises')
app.setPath('userData', process.env.NEXUS_RENDER_PROFILE)
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.on('window-all-closed', () => {})
const timeout = setTimeout(() => { console.error('Production performance fixture timed out'); app.exit(1) }, 90000)
app.whenReady().then(async () => {
  const results = { runtime: { electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node }, fixture: {}, cold: [] }
  const partition = `render-main-${process.pid}`
  const fixturePartition = `render-fixture-${process.pid}`
  const session = require('electron').session.fromPartition(partition)
  let blockedExternal = 0
  const isolate = (details, callback) => {
    const allow = details.url.startsWith(process.env.NEXUS_RENDER_BASE) || details.url.startsWith('data:') || details.url.startsWith('blob:')
    if (!allow) blockedExternal++
    callback({ cancel: !allow })
  }
  session.webRequest.onBeforeRequest(isolate)
  require('electron').session.fromPartition(fixturePartition).webRequest.onBeforeRequest(isolate)
  const open = (storagePartition = partition) => new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { offscreen: true, partition: storagePartition, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } })
  try {
    const fixture = open(fixturePartition)
    await fixture.loadURL(process.env.NEXUS_RENDER_BASE + '/fixture/index.html')
    await fixture.webContents.executeJavaScript("new Promise((resolve,reject) => { const check=()=>window.performanceFixtureError ? reject(new Error(window.performanceFixtureError)) : window.performanceFixtureReady ? resolve() : setTimeout(check,20);check() })")
    results.fixture.instrumentedProductionReact = true
    results.fixture.active = await fixture.webContents.executeJavaScript('window.measureDashboard(true)')
    results.fixture.hidden = await fixture.webContents.executeJavaScript('window.measureDashboard(false)')
    results.fixture.retention = await fixture.webContents.executeJavaScript('window.verifyDashboardRetention ? window.verifyDashboardRetention() : null')
    if (process.env.NEXUS_RENDER_EXPECT_FIXED === 'true') {
      const hidden = results.fixture.hidden, retention = results.fixture.retention
      if (hidden.commits !== 0 || hidden.surfaces.some(surface => surface.visibilityState !== 'hidden' || surface.dynamic)) throw new Error('Hidden Dashboard still renders on unrelated navigation or retains a dynamic surface')
      if (!retention.retainedWhileHidden || !retention.retainedAfterReveal || retention.relevantUpdateCommits < 1 || retention.scrollTop <= 0 || retention.scrollTop !== retention.revealedScrollTop) throw new Error('Hidden Dashboard lost relevant content updates or scroll state')
    }
    fixture.destroy()
    for (let attempt = 0; attempt < 3; attempt++) {
      await session.clearCache()
      const window = open(), started = Date.now()
      await window.loadURL(process.env.NEXUS_RENDER_BASE + '/main/index.html')
      const ready = await window.webContents.executeJavaScript("new Promise(resolve => { const start=Date.now();const check=()=>{const dashboard=document.querySelector('.nx-dashboard-v6');if(dashboard || Date.now()-start>25000) resolve({dashboard:!!dashboard,body:document.body.innerText.slice(0,250),navigation:performance.getEntriesByType('navigation')[0]?.toJSON(),resources:performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/main/')).map(entry=>({name:entry.name,duration:entry.duration,transferSize:entry.transferSize,encodedBodySize:entry.encodedBodySize}))});else setTimeout(check,25)};check() })")
      results.cold.push({ attempt, elapsedMs: Date.now() - started, ...ready })
      if (!ready.dashboard) throw new Error('Actual production Main Dashboard did not become ready')
      if (attempt === 0) {
        await fs.writeFile(process.env.NEXUS_RENDER_SCREENSHOT, (await window.webContents.capturePage(undefined, { stayHidden: true })).toPNG())
        await window.webContents.executeJavaScript("document.querySelector('[aria-label=\"Rundgang schließen\"]')?.click();new Promise(resolve=>setTimeout(resolve,250))")
        await fs.writeFile(process.env.NEXUS_RENDER_SCREENSHOT.replace(/\.png$/, '-dashboard.png'), (await window.webContents.capturePage(undefined, { stayHidden: true })).toPNG())
      }
      window.destroy()
    }
    results.blockedExternalRequests = blockedExternal
    await fs.writeFile(process.env.NEXUS_RENDER_RESULTS, JSON.stringify(results, null, 2))
    console.log(JSON.stringify({ fixture: results.fixture, cold: results.cold.map(({attempt, elapsedMs, dashboard, body})=>({attempt,elapsedMs,dashboard,body})), blockedExternalRequests: blockedExternal }, null, 2))
    clearTimeout(timeout); app.exit(0)
  } catch (error) { console.error(error); clearTimeout(timeout); app.exit(1) }
})
