const { app, BrowserWindow, session } = require('electron')
const fs = require('node:fs/promises'), path = require('node:path')
const fixture = require(process.env.NEXUS_B02_FIXTURE)
app.setPath('userData', fixture.profile); app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-background-timer-throttling'); app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.on('window-all-closed', () => {})
const views = { dashboard: 'Dashboard', calendar: 'Calendar', notes: 'Notizen', code: 'Code', tasks: 'Tasks', reminders: 'Reminders', canvas: 'Canvas', files: 'Dateien', flux: 'Flux', settings: 'Settings', info: 'Info', devtools: 'DevTools' }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const timeout = setTimeout(() => { console.error('Production view matrix timed out'); app.exit(1) }, 180000)
app.whenReady().then(async () => {
  const result = { runtime: { electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node, platform: process.platform }, probes: [], blocked: [], errors: [], permissionsDenied: [], navigationFailures: [], policyBoundaries: [], scrollProbes: [] }
  await fs.mkdir(path.join(fixture.evidence, 'screenshots'), { recursive: true })
  try {
    for (const client of fixture.clients || ['main', 'mobile']) for (const mode of ['dark', 'light']) {
      const storage = session.fromPartition(`b02-${client}-${mode}-${process.pid}`), origin = fixture.urls[client]
      storage.webRequest.onBeforeRequest((details, callback) => { const allow = details.url.startsWith(origin + '/') || details.url.startsWith('data:') || details.url.startsWith('blob:'); if (!allow) result.blocked.push({ client, mode, resourceType: details.resourceType, url: details.url.split('?')[0] }); callback({ cancel: !allow }) })
      storage.setPermissionRequestHandler((_contents, permission, callback) => { result.permissionsDenied.push({ client, mode, permission }); callback(false) })
      storage.setPermissionCheckHandler(() => false)
      const window = new BrowserWindow({ show: false, width: client === 'main' ? 1440 : 390, height: client === 'main' ? 1000 : 844,
        webPreferences: { offscreen: true, partition: storage.getPartition?.() || `b02-${client}-${mode}-${process.pid}`, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } })
      window.webContents.setZoomFactor(1)
      window.webContents.on('console-message', (_event, level, message) => { if (level >= 2 && result.errors.length < 100) result.errors.push({ client, mode, message: message.slice(0, 500) }) })
      await window.loadURL(origin + '/seed.html')
      await window.webContents.executeJavaScript(`(() => {
        const snapshot = state => JSON.stringify({format:'nexus-persist',formatVersion:1,value:{state,version:0}});
        localStorage.setItem('nx-theme-v5::__snapshot-v1',snapshot(${JSON.stringify(fixture.themes[client][mode])}));
        localStorage.setItem('nx-main-walkthrough-v2','complete');
        localStorage.setItem('nx-app-v3::__snapshot-v1',snapshot({notes:[{id:'b02-note',title:'Synthetic field note',content:'# Local visual check\\n\\nThis synthetic note has a short paragraph, a list, and an internal Task link.\\n\\n- Review view layout\\n- Preserve content',tags:['synthetic'],created:'2026-09-30T00:00:00Z',updated:'2026-09-30T00:00:00Z',dirty:false}],openNoteIds:['b02-note'],activeNoteId:'b02-note',codes:[],openCodeIds:[],tasks:[{id:'b02-task',title:'Synthetic scheduled review',desc:'Local fixture only',status:'todo',priority:'mid',tags:['synthetic'],subtasks:[],created:'2026-09-30T00:00:00Z',updated:'2026-09-30T00:00:00Z',durationMinutes:30}],reminders:[],folders:[],activities:[]}));
        localStorage.setItem('nexus-${client}-planning-v1::__snapshot-v1',snapshot({format:'nexus-planning',schemaVersion:1,generation:'synthetic-b02',revision:0,events:[],blocks:[],durations:{},availability:null,receipts:{}}));
      })()`)
      await window.loadURL(origin + '/index.html')
      const boot = await window.webContents.executeJavaScript(`new Promise(resolve => {const start=Date.now();const poll=()=>{const active=document.querySelector('[data-view="dashboard"][data-active="true"]');if(active || Date.now()-start>30000)resolve({ready:!!active,body:document.body.innerText.slice(0,1000),viewport:{width:innerWidth,height:innerHeight}});else setTimeout(poll,25)};poll()})`)
      if (!boot.ready) { result.navigationFailures.push({ client, mode, reason: 'normal product boot not ready', boot }); await fs.writeFile(path.join(fixture.evidence, 'screenshots', `${client}-${mode}-boot.png`), (await window.webContents.capturePage(undefined, { stayHidden: true })).toPNG()); window.destroy(); continue }
      const navSelector = '.nx-sidebar-nav-row,.nx-mobile-tab-chip,.nx-mobile-nav-button,.nx-mobile-nav-more-item'
      async function clickSelector(selector, text = null) {
        const point = await window.webContents.executeJavaScript(`new Promise(resolve => {const start=Date.now();const poll=()=>{const el=Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(el=>${text ? `el.textContent.includes(${JSON.stringify(text)}) || el.title===${JSON.stringify(text)}` : 'true'});if(!el || el.disabled)return resolve(null);el.scrollIntoView({block:'nearest',inline:'center'});const r=el.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2),hit=document.elementFromPoint(x,y);if(hit && el.contains(hit))resolve({x,y,width:innerWidth,height:innerHeight});else if(Date.now()-start>1500)resolve(null);else setTimeout(poll,50)};poll()})`)
        if (!point || point.x < 0 || point.y < 0 || point.x >= point.width || point.y >= point.height) return false
        const p = { x: Math.round(point.x * window.webContents.getZoomFactor()), y: Math.round(point.y * window.webContents.getZoomFactor()) }
        window.webContents.sendInputEvent({ type: 'mouseMove', ...p }); window.webContents.sendInputEvent({ type: 'mouseDown', ...p, button: 'left', clickCount: 1 }); window.webContents.sendInputEvent({ type: 'mouseUp', ...p, button: 'left', clickCount: 1 }); await pause(150); return true
      }
      if (client === 'mobile') await clickSelector('.nx-mobile-nav-button', 'More')
      const nav = await window.webContents.executeJavaScript(`Array.from(document.querySelectorAll(${JSON.stringify(navSelector)})).map(el=>({text:el.textContent.trim(),title:el.title,disabled:el.disabled}))`)
      if (client === 'mobile') { await clickSelector('[aria-label="Mehr-Menü schließen"]'); await pause(750) }
      const labels = client === 'mobile' ? { ...views, dashboard: 'Home', calendar: 'Agenda', notes: 'Notes', files: 'Files' } : views
      const reachable = Object.entries(labels).filter(([id, label]) => (!fixture.views || fixture.views.includes(id)) && nav.some(item => item.text.includes(label) || item.title === label))
      if (!reachable.length) throw new Error('No real product navigation controls discovered for ' + client)
      async function navigate(id, label) {
        if (client === 'mobile' && !['dashboard', 'notes', 'tasks', 'reminders'].includes(id)) { await clickSelector('.nx-mobile-nav-button', 'More'); await pause(750) }
        if (!await clickSelector(navSelector, label)) { result.navigationFailures.push({ client, mode, id, reason: 'real navigation control not visible/reachable' }); return false }
        const outcome = await window.webContents.executeJavaScript(`new Promise(resolve=>{const start=Date.now();const poll=()=>{const el=document.querySelector('[data-view="${id}"][data-active="true"]');if(el && !el.textContent.includes('Lade View'))resolve('reached');else if(document.body.innerText.includes('Serverseitige Account-Funktionen haben \u0060${id}\u0060 fuer diese Sitzung nicht freigegeben'))resolve('policy-denied');else if(Date.now()-start>8000)resolve('failed');else setTimeout(poll,25)};poll()})`)
        if (outcome === 'policy-denied') {
          const screenshot = `${client}-${mode}-${id}-policy-denied.png`
          await pause(150); await fs.writeFile(path.join(fixture.evidence, 'screenshots', screenshot), (await window.webContents.capturePage(undefined, { stayHidden: true })).toPNG())
          result.policyBoundaries.push({ client, mode, requestedView: id, screenshot, body: await window.webContents.executeJavaScript('document.body.innerText.slice(0,900)') })
          console.log(`[b02] ${client}/${mode}/${id} existing account policy denied`); return false
        }
        const ok = outcome === 'reached'
        if (!ok) result.navigationFailures.push({ client, mode, id, reason: 'actual click did not reveal requested normal product view', body: await window.webContents.executeJavaScript('document.body.innerText.slice(0,600)') })
        return ok
      }
      async function capture(id, zoom) {
        await window.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); await pause(150)
        if (id === 'flux') await pause(1200)
        const probe = await window.webContents.executeJavaScript(`(() => {const root=document.querySelector('[data-view="${id}"][data-active="true"]'),rect=root.getBoundingClientRect(),visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0};return {view:'${id}',viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},root:{x:rect.x,y:rect.y,width:rect.width,height:rect.height,scrollWidth:root.scrollWidth,clientWidth:root.clientWidth},theme:JSON.parse(localStorage.getItem('nx-theme-v5::__snapshot-v1')).value.state.mode,reducedMotion:document.documentElement.classList.contains('reduce-motion'),fontSize:getComputedStyle(document.documentElement).fontSize,bodyText:root.innerText.slice(0,1800),buttons:Array.from(root.querySelectorAll('button')).filter(visible).slice(0,50).map(el=>({text:el.textContent.trim(),label:el.getAttribute('aria-label'),disabled:el.disabled})),scrollContainers:Array.from(root.querySelectorAll('*')).filter(el=>visible(el)&&(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2)).slice(0,15).map(el=>({className:String(el.className),overflowX:getComputedStyle(el).overflowX,overflowY:getComputedStyle(el).overflowY,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}))}})()`)
        const filename = `${client}-${mode}-${id}-${zoom === 2 ? 'zoom200' : 'normal'}.png`
        probe.textSamples = await window.webContents.executeJavaScript(`(() => {
          const root=document.querySelector('[data-view="${id}"][data-active="true"]');
          const selectors=['h1','#code-archive-title','.nx-info-hero h1','input[placeholder="Titel..."]','.nx-mobile-file-list-copy','.nx-notes-workbar','.nx-notes-title-input','.nx-notes-format-toolbar','.nx-flux-source-caption','.nx-flux-low-activity strong','.nx-flux-low-activity','.nx-flux-metric-card > div','.nx-flux-metric-card > div > div'];
          return selectors.flatMap(selector=>Array.from(root.querySelectorAll(selector)).slice(0,selector.includes('metric-card')?12:3).map(el=>{
            const style=getComputedStyle(el),r=el.getBoundingClientRect();
            const ancestors=[];for(let node=el;node && ancestors.length<12;node=node.parentElement){const s=getComputedStyle(node);ancestors.push({className:String(node.className),color:s.color,background:s.backgroundColor,backgroundImage:s.backgroundImage,opacity:s.opacity,transform:s.transform,filter:s.filter})}
            return {selector,text:(el.value||el.textContent).slice(0,160),color:style.color,background:style.backgroundColor,opacity:style.opacity,width:r.width,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,ancestors};
          }));
        })()`)
        if(id==='flux') probe.animationSamples=await window.webContents.executeJavaScript(`document.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime,target:String(a.effect?.target?.className||'')})).slice(0,30)`)
        if(id==='settings') probe.presetSamples = await window.webContents.executeJavaScript(`Array.from(document.querySelectorAll('[data-view="settings"][data-active="true"] button')).filter(el=>['Focus','Balanced','Cinematic'].some(label=>el.textContent.startsWith(label))).map(el=>({text:el.textContent.slice(0,100),color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundImage}))`)
        if (client === 'mobile') probe.actionWidths = await window.webContents.executeJavaScript(`Array.from(document.querySelectorAll('[data-view="${id}"][data-active="true"] .nx-mobile-v6-action')).map(el=>({text:el.textContent,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth}))`)
        await fs.writeFile(path.join(fixture.evidence, 'screenshots', filename), (await window.webContents.capturePage(undefined, { stayHidden: true })).toPNG())
        result.probes.push({ client, mode, zoomFactor: zoom, themePreset: mode === 'dark' ? 'macOS Dark' : 'Light Clean', screenshot: filename, navigationInventory: nav, ...probe }); console.log(`[b02] ${client}/${mode}/${id} zoom=${zoom}`)
      }
      async function scrollProbe(id, selector, axis, suffix) {
        const before = await window.webContents.executeJavaScript(`(() => {const el=document.querySelector('[data-view="${id}"][data-active="true"] ${selector}'),r=el.getBoundingClientRect();return {x:r.x+Math.min(r.width/2,40),y:r.y+Math.min(r.height/2,12),left:el.scrollLeft,top:el.scrollTop,width:el.clientWidth,height:el.clientHeight,scrollWidth:el.scrollWidth,scrollHeight:el.scrollHeight}})()`)
        window.webContents.sendInputEvent({type:'mouseWheel',x:Math.round(before.x*2),y:Math.round(before.y*2),deltaX:axis==='x'?-500:0,deltaY:axis==='y'?-700:0,canScroll:true}); await pause(450)
        const after = await window.webContents.executeJavaScript(`(() => {const el=document.querySelector('[data-view="${id}"][data-active="true"] ${selector}');return {left:el.scrollLeft,top:el.scrollTop}})()`)
        const screenshot=`${client}-${mode}-${id}-zoom200-${suffix}.png`
        await fs.writeFile(path.join(fixture.evidence,'screenshots',screenshot),(await window.webContents.capturePage(undefined,{stayHidden:true})).toPNG())
        const moved=axis==='x'?after.left>before.left:after.top>before.top
        result.scrollProbes.push({client,mode,view:id,selector,axis,before,after,moved,screenshot})
        if(!moved) result.navigationFailures.push({client,mode,id,reason:'normal browser wheel did not reach overflowed '+suffix})
      }
      for (const [id, label] of reachable) if (await navigate(id, label)) await capture(id, 1)
      // Ordinary browser zoom doubles text and the surrounding layout. It is not
      // font-only scaling. Mobile Agenda form coverage is delegated separately.
      for (const id of client === 'main' ? ['dashboard', 'calendar', 'notes', 'files'] : ['dashboard', 'notes', 'files']) {
        window.webContents.setZoomFactor(1)
        await window.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); await pause(150)
        if (reachable.some(([candidate]) => candidate === id) && await navigate(id, labels[id])) {
          window.webContents.setZoomFactor(2); await capture(id, 2)
          if(client==='mobile') {
            await scrollProbe(id,'.nx-mobile-v6-actions','x','actions-scrolled')
            if(id==='files') await scrollProbe(id,'.nx-mobile-files-screen','y','items-scrolled')
          }
        }
      }
      window.destroy()
    }
    result.ok = result.navigationFailures.length === 0
    await fs.writeFile(path.join(fixture.evidence, 'browser-results.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify({ probes: result.probes.length, failures: result.navigationFailures, blocked: result.blocked.length, errors: result.errors.length }, null, 2))
    clearTimeout(timeout); app.exit(result.ok ? 0 : 1)
  } catch (error) { result.ok = false; result.error = String(error.stack || error); await fs.writeFile(path.join(fixture.evidence, 'browser-results.json'), JSON.stringify(result, null, 2)); console.error(error); clearTimeout(timeout); app.exit(1) }
})
