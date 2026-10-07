const { app, BrowserWindow } = require('electron')
const { writeFile } = require('node:fs/promises')
const path = require('node:path')
app.setPath('userData', process.env.NEXUS_PRODUCT_PROFILE)
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
const evidence = process.env.NEXUS_PRODUCT_EVIDENCE
const timeout = setTimeout(() => { console.error('Product qualification timed out'); app.exit(1) }, 180000)
app.whenReady().then(async () => {
  const window = new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}})
  const visuals = []
  window.webContents.on('console-message', event => { if (event.level === 'error') console.error(event.message) })
  const run = source => window.webContents.executeJavaScript(source)
  const screenshot = async name => {
    await run('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    // Chromium's offscreen compositor may still hold the previous view after a
    // React commit or zoom change. Let that frame settle before requesting paint.
    await new Promise(resolve => setTimeout(resolve, 600))
    const paint = new Promise(resolve => window.webContents.once('paint', (_event,_rect,image) => resolve(image)))
    window.webContents.invalidate()
    await writeFile(path.join(evidence,name + '.png'),(await paint).toPNG())
  }
  try {
    await window.loadURL(process.env.NEXUS_PRODUCT_URL); window.webContents.focus()
    await run('new Promise((resolve, reject) => { const poll = () => window.productReady ? window.productReady.then(resolve, reject) : setTimeout(poll, 25); poll() })'); await run('window.productInteractions()')
    for (const [name,width,zoom,variant] of [['desktop',1440,1,'dark'],['1280',1280,1,'dark'],['1024',1024,1,'dark'],['narrow',760,1,'dark'],['zoom200',1440,2,'dark'],['custom-light',1280,1,'custom-light'],['reduced-motion',1280,1,'dark'],['empty',1280,1,'empty'],['non-urgent',1280,1,'non-urgent']]) {
      window.setSize(width,1000); window.webContents.setZoomFactor(zoom)
      if (name === 'reduced-motion') {
        window.webContents.debugger.attach('1.3')
        await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{name:'prefers-reduced-motion',value:'reduce'}] })
      }
      for (const view of ['dashboard','flux']) {
        await run(`window.productVisual(${JSON.stringify(view)},${JSON.stringify(variant)})`)
        await new Promise(resolve => setTimeout(resolve,600))
        const geometry = await run('window.productGeometry()'); visuals.push({name,zoom,...geometry})
        if (name === 'reduced-motion' && !geometry.reducedMotion) throw new Error('Reduced motion was not active')
        await screenshot(`${view}-${name}`)
        if (geometry.clipped.length || geometry.smallTargets || geometry.documentOverflow) throw new Error(`Layout failure ${view}/${name}: ${JSON.stringify(geometry)}`)
      }
    }
    // Offscreen rendering has no OS foreground window; focus emulation lets Chromium
    // process trusted keyboard/pointer input without stealing the user's desktop focus.
    await window.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true})
    const hover = await run('window.productStates()')
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
    await run('new Promise((resolve,reject) => { let attempts=0; const poll=()=>document.activeElement?.tagName==="SELECT" && document.activeElement.matches(":focus-visible") ? resolve() : ++attempts<100 ? setTimeout(poll,10) : reject(new Error("Native Flux Tab focus is not visible: " + document.activeElement?.outerHTML)); poll() })')
    await window.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',...hover})
    await new Promise(resolve => setTimeout(resolve,100))
    const states = await run('({focusOutline:getComputedStyle(document.activeElement).outlineWidth,selected:document.querySelector("[data-product-overview=flux] [aria-pressed=true]")?.textContent,hover:document.querySelector("[data-product-overview=flux] header button")?.matches(":hover")})')
    if (states.focusOutline !== '3px' || !states.selected || !states.hover) throw new Error('Missing product interaction state: '+JSON.stringify(states))
    await screenshot('flux-focus-hover-selected')
    const agenda = []
    for (const [name,width,zoom] of [['desktop',1440,1],['1024',1024,1],['zoom200',1440,2]]) {
      window.setSize(width,1000); window.webContents.setZoomFactor(zoom)
      await run(`new Promise(resolve => { const poll=()=>Math.abs(innerWidth-${width/zoom})<=1 ? requestAnimationFrame(()=>requestAnimationFrame(resolve)) : setTimeout(poll,20); poll() })`)
      agenda.push({name,zoom,...await run('window.productAgenda()')}); await screenshot('agenda-handoff-'+name)
    }
    window.setSize(1280,1000); window.webContents.setZoomFactor(1)
    for (const view of ['dashboard','flux']) {
      await run(`window.productProjectionFailure('${view}')`); await screenshot(view+'-projection-failure')
      await run(`window.productProjectionRecovery('${view}')`)
    }
    await run('window.productFailure()'); await screenshot('flux-storage-failure')
    for (const kind of ['loading','error']) { const text = await run(`window.productStatus('${kind}')`); if (!text.includes(kind==='loading'?'geladen':'nicht vollständig')) throw new Error('Missing '+kind+' state'); await screenshot('product-'+kind) }
    const checks = await run('window.productChecks')
    await writeFile(path.join(evidence,'product-results.json'),JSON.stringify({ok:true,checks,visuals,states,agenda},null,2))
    console.log(JSON.stringify({ok:true,checks:checks.length,visuals:visuals.length,evidence}))
    clearTimeout(timeout); window.destroy(); app.exit(0)
  } catch(error) { await screenshot('failure').catch(()=>{}); await writeFile(path.join(evidence,'product-results.json'),JSON.stringify({ok:false,error:String(error),checks:await run('window.productChecks').catch(()=>[]),visuals},null,2)); console.error(error); clearTimeout(timeout); app.exit(1) }
})
