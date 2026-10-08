const { app, BrowserWindow } = require('electron')
const { writeFile } = require('node:fs/promises')
const path = require('node:path')
app.setPath('userData', process.env.NEXUS_MOBILE_ORIENTATION_PROFILE)
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
const evidence=process.env.NEXUS_MOBILE_ORIENTATION_EVIDENCE
const timeout=setTimeout(()=>{console.error('Mobile qualification timed out');app.exit(1)},300000)
app.whenReady().then(async()=>{
  const window=new BrowserWindow({show:false,width:390,height:844,webPreferences:{offscreen:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}}),visuals=[]
  // Keep qualification local and deterministic; product's system-font fallback is supported.
  window.webContents.session.webRequest.onBeforeRequest({urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']},(_details,callback)=>callback({cancel:true}))
  window.webContents.on('console-message',(event,level,message)=>{if(level>=2||event.level==='error')console.error(message||event.message)})
  const run=source=>window.webContents.executeJavaScript(source)
  const screenshot=async name=>{await run('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await new Promise(resolve=>setTimeout(resolve,350));const paint=new Promise(resolve=>window.webContents.once('paint',(_event,_rect,image)=>resolve(image)));window.webContents.invalidate();await writeFile(path.join(evidence,name+'.png'),(await paint).toPNG())}
  try {
    await window.loadURL(process.env.NEXUS_MOBILE_ORIENTATION_URL);window.webContents.focus();window.webContents.debugger.attach('1.3')
    await window.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true})
    await run('new Promise((resolve,reject)=>{let n=0;const poll=()=>window.mobileReady?window.mobileReady.then(resolve,reject):++n<1000?setTimeout(poll,25):reject(new Error("Mobile module failed to initialize"));poll()})')
    console.log('Mobile fixture ready');await run('window.mobileInteractions()');console.log('Mobile interactions passed')
    const performance=await run('window.mobilePerformance()')
    for(const [name,width,height,zoom,variant] of [['phone',390,844,1,'current'],['small',320,568,1,'suggestion'],['large',430,932,1,'long'],['landscape',844,390,1,'current'],['tablet',1024,768,1,'current'],['custom',390,844,1,'custom'],['reduced',390,844,1,'current'],['large-text',780,1200,2,'long'],['keyboard-height',390,430,1,'current']]) {
      window.setSize(width,height);window.webContents.setZoomFactor(zoom)
      await run(`new Promise(resolve=>{const poll=()=>Math.abs(innerWidth-${width/zoom})<=1?requestAnimationFrame(()=>requestAnimationFrame(resolve)):setTimeout(poll,20);poll()})`)
      await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:name==='reduced'?'reduce':'no-preference'}]})
      for(const view of ['dashboard','flux','calendar','notes','canvas']) {
        await run(`window.mobileVisual(${JSON.stringify(view)},${JSON.stringify(variant)})`)
        const geometry=await run('window.mobileGeometry()');visuals.push({name,zoom,...geometry});await screenshot(`${view}-${name}`)
        if(!geometry.surfaces||geometry.small.length||geometry.clipped.length||geometry.documentOverflow)throw new Error(`Layout ${view}/${name}: ${JSON.stringify(geometry)}`)
        if(name==='reduced'&&!geometry.reducedMotion)throw new Error('Reduced motion missing')
      }
    }
    window.setSize(390,844);window.webContents.setZoomFactor(1)
    for(const [view,variant] of [['dashboard','empty'],['dashboard','error'],['flux','no-matches'],['flux','error'],['tasks','current']]){await run(`window.mobileVisual('${view}','${variant}')`);await screenshot(`${view}-${variant}`)}
    await run('window.mobileFocus()')
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
    const focus=await run('({inside:!!document.activeElement?.closest("[role=dialog]"),placeholder:document.activeElement?.getAttribute("placeholder")})')
    if(!focus.inside)throw new Error('Task dialog loses keyboard focus: '+JSON.stringify(focus))
    await screenshot('task-keyboard-focus')
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
    await run('new Promise(resolve=>setTimeout(resolve,400))')
    const returned=await run('({closed:!document.querySelector(".nx-mobile-v6-view-shell[data-active=true] [role=dialog]"),visible:document.activeElement?.checkVisibility(),inView:!!document.activeElement?.closest(".nx-mobile-v6-view-shell[data-active=true]")})')
    if(!returned.closed||!returned.visible||!returned.inView)throw new Error('Dialog Escape/focus return: '+JSON.stringify(returned))
    const checks=await run('window.mobileChecks')
    // iOS WebKit uses the product's single-active-layer host instead of cached hidden layers.
    window.webContents.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148')
    await window.loadURL(process.env.NEXUS_MOBILE_ORIENTATION_URL)
    await run('new Promise((resolve,reject)=>{const poll=()=>window.mobileReady?window.mobileReady.then(resolve,reject):setTimeout(poll,25);poll()})')
    await run('window.mobileInteractions()');const singleActiveChecks=await run('window.mobileChecks')
    await writeFile(path.join(evidence,'mobile-results.json'),JSON.stringify({ok:true,checks,singleActiveChecks,visuals,performance,focus,returned},null,2))
    console.log(JSON.stringify({ok:true,checks:checks.length,visuals:visuals.length,performance,evidence}));clearTimeout(timeout);window.destroy();app.exit(0)
  } catch(error) {
    await screenshot('failure').catch(()=>{});await writeFile(path.join(evidence,'mobile-results.json'),JSON.stringify({ok:false,error:String(error),checks:await run('window.mobileChecks').catch(()=>[]),visuals},null,2));console.error(error);clearTimeout(timeout);app.exit(1)
  }
})
