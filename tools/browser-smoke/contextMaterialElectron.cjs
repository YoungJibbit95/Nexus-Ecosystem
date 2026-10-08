const { app, BrowserWindow } = require('electron')
const { writeFile } = require('node:fs/promises')
const path = require('node:path')
app.setPath('userData', process.env.NEXUS_CONTEXT_PROFILE)
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
const evidence = process.env.NEXUS_CONTEXT_EVIDENCE
const timeout = setTimeout(() => { console.error('Context qualification timed out'); app.exit(1) }, 240000)
app.whenReady().then(async () => {
  const window = new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}}), visuals=[]
  window.webContents.on('console-message', (event, level, message) => { if(level>=2 || event.level==='error')console.error(message || event.message) })
  window.webContents.on('render-process-gone',(_event,details)=>console.error('Renderer exited: '+JSON.stringify(details)))
  window.webContents.on('did-fail-load',(_event,code,description)=>console.error(`Page load failed: ${code} ${description}`))
  const run = source => window.webContents.executeJavaScript(source)
  const screenshot = async name => {
    await run('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    await new Promise(resolve=>setTimeout(resolve,600))
    const paint=new Promise(resolve=>window.webContents.once('paint',(_event,_rect,image)=>resolve(image)))
    window.webContents.invalidate();await writeFile(path.join(evidence,name+'.png'),(await paint).toPNG())
  }
  try {
    console.log('Loading isolated context fixture')
    await window.loadURL(process.env.NEXUS_CONTEXT_URL);window.webContents.focus()
    console.log('Context page loaded')
    window.webContents.debugger.attach('1.3')
    window.webContents.debugger.on('message',(_event,method,params)=>{if(method==='Runtime.exceptionThrown')console.error(JSON.stringify(params.exceptionDetails))})
    await window.webContents.debugger.sendCommand('Runtime.enable')
    await window.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true})
    await run('new Promise((resolve,reject)=>{let attempts=0;const poll=()=>window.contextReady?window.contextReady.then(resolve,reject):++attempts<1600?setTimeout(poll,25):reject(new Error("Context module failed to initialize"));poll()})')
    console.log('Context fixture ready')
    await run('window.contextInteractions()')
    console.log('Context interactions passed')
    for(const [name,width,zoom,variant] of [['desktop',1440,1,'dark'],['1280',1280,1,'dark'],['1024',1024,1,'dark'],['narrow',760,1,'dark'],['zoom200',1440,2,'dark'],['custom-light',1280,1,'custom-light'],['reduced-motion',1280,1,'dark'],['many',1280,1,'many']]) {
      window.setSize(width,1000);window.webContents.setZoomFactor(zoom)
      await run(`new Promise(resolve=>{const poll=()=>Math.abs(innerWidth-${width/zoom})<=1?requestAnimationFrame(()=>requestAnimationFrame(resolve)):setTimeout(poll,20);poll()})`)
      await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:name==='reduced-motion'?'reduce':'no-preference'}]})
      for(const view of ['tasks','notes','canvas','files']) {
        await run(`window.contextVisual(${JSON.stringify(view)},${JSON.stringify(variant)})`);await new Promise(resolve=>setTimeout(resolve,500))
        await run('window.contextReveal()')
        const geometry=await run('window.contextGeometry()');visuals.push({name,zoom,...geometry});await screenshot(`${view}-${name}`)
        if(!geometry.surfaces||geometry.clipped.length||geometry.small.length||geometry.documentOverflow)throw new Error(`Layout ${view}/${name}: ${JSON.stringify(geometry)}`)
        if(name==='reduced-motion'&&!geometry.reducedMotion)throw new Error('OS reduced motion not enabled')
      }
    }
    for(const variant of ['missing','none']){await run(`window.contextVisual('tasks','${variant}')`);await screenshot(`tasks-${variant}`)}
    for(const view of ['notes','canvas','files']){await run(`window.contextVisual('${view}','zero')`);await screenshot(`${view}-zero`)}
    await run('window.contextFocus()')
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
    const focus=await run('({name:document.activeElement?.getAttribute("aria-label"),visible:document.activeElement?.matches(":focus-visible"),outline:getComputedStyle(document.activeElement).outlineWidth})')
    if(!focus.name?.startsWith('Aufgabe öffnen:')||!focus.visible||focus.outline!=='3px')throw new Error('Context keyboard focus: '+JSON.stringify(focus))
    await screenshot('notes-native-focus');await run('window.contextFailure()')
    const checks=await run('window.contextChecks')
    await writeFile(path.join(evidence,'context-results.json'),JSON.stringify({ok:true,checks,visuals,focus},null,2))
    console.log(JSON.stringify({ok:true,checks:checks.length,visuals:visuals.length,evidence}));clearTimeout(timeout);window.destroy();app.exit(0)
  } catch(error) {
    await screenshot('failure').catch(()=>{})
    await writeFile(path.join(evidence,'context-results.json'),JSON.stringify({ok:false,error:String(error),checks:await run('window.contextChecks').catch(()=>[]),visuals},null,2))
    console.error(error);clearTimeout(timeout);app.exit(1)
  }
})
