const { app, BrowserWindow, session } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
app.setPath('userData', process.env.NEXUS_INTERACTION_PROFILE)
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.on('window-all-closed', () => {})
const timeout = setTimeout(() => { console.error('Production interaction timed out'); app.exit(1) }, 120000)
const fixture = JSON.parse(process.env.NEXUS_INTERACTION_FIXTURE)
const init = `(() => {
  localStorage.setItem('nx-app-v3::__snapshot-v1', JSON.stringify({format:'nexus-persist',formatVersion:1,value:{state:${JSON.stringify(fixture)},version:0}}));
  window.__interaction = { longTasks:[], eventTiming:[], supported:PerformanceObserver.supportedEntryTypes, actions:[] };
  for (const type of ['longtask','event']) if (PerformanceObserver.supportedEntryTypes.includes(type)) {
    try { new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__interaction[type === 'longtask' ? 'longTasks' : 'eventTiming'].push(entry.toJSON()) }).observe({type,buffered:true,...(type === 'event' ? {durationThreshold:16} : {})}) } catch(error) {window.__interaction[type+'Error']=String(error)}
  }
  document.addEventListener('input', event => {
    const pending = window.__interaction.pending; if (!pending || event.target !== pending.element) return;
    const valueTime = performance.now(), value = event.target.value;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const sample = {index:pending.index,control:pending.control,action:pending.action,expected:pending.expected,armTime:pending.started,inputTime:valueTime,secondFrameTime:performance.now(),armToValueMs:valueTime-pending.started,armToSecondFrameMs:performance.now()-pending.started,valueAtInput:value,valueAtSecondFrame:pending.element.value,trusted:event.isTrusted,inputType:event.inputType};
      window.__interaction.actions.push(sample); window.__interaction.pending = null; pending.resolve(sample);
    }));
  }, true);
  window.__armInteraction = (selector,control,action,index,expected) => {
    const element = document.querySelector(selector), bounds = element?.getBoundingClientRect();
    if (!element || bounds.width <= 0 || bounds.height <= 0 || bounds.top < 0 || bounds.bottom > innerHeight) throw new Error('Measured control is not visible: '+selector);
    element.focus(); window.__interaction.awaited = new Promise(resolve => {window.__interaction.pending={element,control,action,index,expected,started:performance.now(),resolve}});
    return {value:element.value,bounds:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},font:getComputedStyle(element).fontSize};
  };
})()`
const quantile = (values, percent) => { const ordered = [...values].sort((a,b)=>a-b); return ordered[Math.max(0,Math.ceil(percent*ordered.length)-1)] }
const summaries = actions => Object.fromEntries([...new Set(actions.map(action=>action.control))].map(control => { const samples=actions.filter(action=>action.control===control); return [control,{count:samples.length,armToValueMs:{median:quantile(samples.map(sample=>sample.armToValueMs),.5),p95:quantile(samples.map(sample=>sample.armToValueMs),.95),max:Math.max(...samples.map(sample=>sample.armToValueMs))},armToSecondFrameMs:{median:quantile(samples.map(sample=>sample.armToSecondFrameMs),.5),p95:quantile(samples.map(sample=>sample.armToSecondFrameMs),.95),max:Math.max(...samples.map(sample=>sample.armToSecondFrameMs))}}] }))
const waitForSelectorSource = selector => { const safeSelector = JSON.stringify(selector).replace(/[<>\u2028\u2029]/g, char => ({'<':'\\u003C','>':'\\u003E','\u2028':'\\u2028','\u2029':'\\u2029'}[char])); return `new Promise((resolve,reject) => {const start=Date.now();const poll=()=>{const result=document.querySelector(${safeSelector});if(result)resolve(result);else if(Date.now()-start>20000)reject(new Error('Actual production control not ready'));else setTimeout(poll,25)};poll()})` }
app.whenReady().then(async () => {
  const results = {runtime:{electron:process.versions.electron,chromium:process.versions.chrome,embeddedNode:process.versions.node},window:{width:1440,height:1000,show:false,offscreen:true,frameRate:60,hardwareAcceleration:false,externalNetwork:'denied'},fixture:{notes:5,tasks:3,source:'Identical persisted browser snapshot; actual normal production entry/module graph'},runs:[]}
  try {
    for (const name of JSON.parse(process.env.NEXUS_INTERACTION_NAMES || '["before","final"]')) {
      const storage = `production-interaction-${name}-${process.pid}`, isolated = session.fromPartition(storage)
      let denied = 0
      isolated.webRequest.onBeforeRequest((details, callback) => {const allow = details.url.startsWith(process.env.NEXUS_INTERACTION_BASE+'/') || details.url.startsWith('data:') || details.url.startsWith('blob:');if(!allow)denied++;callback({cancel:!allow})})
      console.log(`Opening immutable ${name} production entry`)
      const window = new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{partition:storage,offscreen:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}})
      window.webContents.setFrameRate(60)
      window.webContents.startPainting()
      window.webContents.on('paint', () => {})
      // Create the initial renderer before issuing Page-domain commands. This
      // neutral page contains no product code; observers still precede product load.
      await window.loadURL('about:blank')
      window.webContents.debugger.attach('1.3')
      console.log(`${name}: debugger attached`)
      await window.webContents.debugger.sendCommand('Page.enable')
      await window.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:init})
      console.log(`${name}: startup observer registered before load`)
      await window.loadURL(`${process.env.NEXUS_INTERACTION_BASE}/${name}/index.html`)
      console.log(`${name}: normal entry loaded`)
      await window.webContents.executeJavaScript(waitForSelectorSource('.nx-dashboard-v6'))
      console.log(`${name}: actual Dashboard ready`)
      const startupEnd = await window.webContents.executeJavaScript('performance.now()')
      await window.webContents.executeJavaScript("document.querySelector('[aria-label=\"Rundgang schließen\"]')?.click()")
      const run = {name,startupEnd,controls:[],actions:[],navigation:await window.webContents.executeJavaScript('performance.getEntriesByType("navigation")[0]?.toJSON()')}
      results.runs.push(run)
      for (const [view,selector,control] of [['Notizen','.nx-v6-view-shell[data-view="notes"][data-active="true"] textarea','notes-editor'],['Tasks','.nx-v6-view-shell[data-view="tasks"][data-active="true"] input[placeholder="Search tasks..."]','tasks-search']]) {
        console.log(`${name}: navigating to actual ${view} control`)
        await window.webContents.executeJavaScript(`(() => {const button=[...document.querySelectorAll('.nx-sidebar-nav-row')].find(button=>button.innerText.trim().split(/\\s+/)[0]===${JSON.stringify(view)} || button.title===${JSON.stringify(view)});if(!button)throw new Error('Actual navigation not found: ${view}');button.click()})()`)
        await window.webContents.executeJavaScript(waitForSelectorSource(selector))
        console.log(`${name}: ${control} DOM ready`)
        await window.webContents.executeJavaScript(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'});document.querySelector(${JSON.stringify(selector)}).focus()`)
        await window.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
        let expected = await window.webContents.executeJavaScript(`document.querySelector(${JSON.stringify(selector)}).value`)
        for (let index=0;index<20;index++) {
          const action=index%2===0?'type-p':'backspace', key=index%2===0?'P':'Backspace'; expected=index%2===0?expected+'p':expected.slice(0,-1)
          if(index===0)await window.webContents.executeJavaScript(`{const e=document.querySelector(${JSON.stringify(selector)});e.setSelectionRange?.(e.value.length,e.value.length)}`)
          const context = await window.webContents.executeJavaScript(`window.__armInteraction(${JSON.stringify(selector)},${JSON.stringify(control)},${JSON.stringify(action)},${index},${JSON.stringify(expected)})`)
          if(index===0)run.controls.push({control,selector,context})
          window.webContents.focus();window.webContents.sendInputEvent({type:'keyDown',keyCode:key})
          if(index%2===0)window.webContents.sendInputEvent({type:'char',keyCode:'p'})
          window.webContents.sendInputEvent({type:'keyUp',keyCode:key})
          const sample = await window.webContents.executeJavaScript('Promise.race([window.__interaction.awaited,new Promise((_,reject)=>setTimeout(()=>reject(new Error("Native input event was not observed")),5000))])')
          if (!sample.trusted || sample.valueAtInput!==expected || sample.valueAtSecondFrame!==expected) throw new Error('Native production input was not accepted: '+JSON.stringify(sample))
          run.actions.push(sample)
          if(index===19)console.log(`${name}: ${control} accepted 20 native inputs`)
        }
        await fs.writeFile(path.join(process.env.NEXUS_INTERACTION_OUTPUT,`${name}-${control}.png`),(await window.webContents.capturePage(undefined,{stayHidden:true})).toPNG())
      }
      const measured = await window.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({supported:window.__interaction.supported,longTasks:window.__interaction.longTasks,eventTiming:window.__interaction.eventTiming,observerErrors:[window.__interaction.longtaskError,window.__interaction.eventError].filter(Boolean),fixture:JSON.parse(localStorage.getItem("nx-app-v3::__snapshot-v1")).value.state}))))')
      if(measured.fixture.notes.length!==5 || measured.fixture.tasks.length!==3)throw new Error('Production hydration changed the identical five-note/three-task fixture')
      run.summary=summaries(run.actions);run.observerSupport=measured.supported;run.observerErrors=measured.observerErrors;run.longTasks=measured.longTasks;run.startupLongTasks=measured.longTasks.filter(entry=>entry.startTime<startupEnd);run.eventTiming=measured.eventTiming;run.blockedExternalRequests=denied
      console.log(JSON.stringify({name,summary:run.summary,longTasks:run.longTasks.length,startupLongTasks:run.startupLongTasks.length,eventTiming:run.eventTiming.length,blockedExternalRequests:denied},null,2))
      await fs.writeFile(path.join(process.env.NEXUS_INTERACTION_OUTPUT,`${name}-tasks.png`),(await window.webContents.capturePage(undefined,{stayHidden:true})).toPNG())
      window.destroy()
    }
    await fs.writeFile(path.join(process.env.NEXUS_INTERACTION_OUTPUT,'browser-results.json'),JSON.stringify({ok:true,...results},null,2));clearTimeout(timeout);app.exit(0)
  } catch(error) {await fs.writeFile(path.join(process.env.NEXUS_INTERACTION_OUTPUT,'browser-results.json'),JSON.stringify({ok:false,...results,error:String(error),stack:error.stack},null,2));console.error(error);clearTimeout(timeout);app.exit(1)}
})
