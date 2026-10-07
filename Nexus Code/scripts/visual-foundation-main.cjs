const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = process.env.NEXUS_CODE_FOUNDATION_VISUAL_OUTPUT;
app.setPath('userData', path.join(output, 'profile'));
const results = [];
const errors = [];
let win;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = script => win.webContents.executeJavaScript(script, true);
async function until(script) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await evaluate(script)) return;
    await delay(50);
  }
  throw new Error(`Timed out: ${script}`);
}
async function capture(name) {
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  win.webContents.invalidate();
  // The first capture can contain the previous compositor frame after a hidden-window resize.
  await win.webContents.capturePage();
  await delay(120);
  fs.writeFileSync(path.join(output, `${name}.png`), (await win.webContents.capturePage()).toPNG());
}
async function click(selector) {
  const rect = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({block:'nearest'}); const r=el.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}; })()`);
  win.webContents.sendInputEvent({ type: 'mouseDown', ...rect, button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', ...rect, button: 'left', clickCount: 1 });
  await delay(100);
}
async function type(selector, text) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'A', modifiers: ['control'] });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'A', modifiers: ['control'] });
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Backspace' });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Backspace' });
  if (text) await win.webContents.insertText(text);
}
function key(keyCode) {
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
}
const timeout = setTimeout(() => { console.error('Visual foundation timed out'); app.exit(1); }, 180000);
app.whenReady().then(async () => {
  win = new BrowserWindow({ width: 1440, height: 900, useContentSize: true, show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  await win.loadURL(process.env.NEXUS_CODE_FOUNDATION_VISUAL_URL);
  await until('Boolean(window.foundationFixture && document.querySelector(".cm-content"))');
  // Keep the loaded hidden fixture focusable without stealing desktop focus.
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true });
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{name:'prefers-reduced-motion', value:'no-preference'}] });
  await type('input[aria-label="Search files"]', 'semantic');
  await until('document.querySelectorAll(".nx-panel-match").length > 0');
  await click('button[title="Ersten Treffer oeffnen"]');
  assert.equal(await evaluate('window.foundationFixture.events.at(-1)?.kind'), 'file');
  await evaluate('document.querySelector(".nx-code-problems-panel [role=listbox]").focus()');
  key('Down');
  await until('document.querySelector("[role=option][data-active=true]").textContent.includes("fixture 1:")');
  key('Enter');
  await until('window.foundationFixture.events.some(event => event.kind === "problem")');
  assert.equal(await evaluate('window.foundationFixture.events.at(-1).id'), 'problem-1');
  const rowBefore = await evaluate('document.querySelector("[role=option]").getBoundingClientRect().toJSON()');
  win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(rowBefore.x + 30),y:Math.round(rowBefore.y + 10)});
  await delay(180);
  const rowAfter = await evaluate('document.querySelector("[role=option]").getBoundingClientRect().toJSON()');
  assert.deepEqual(rowAfter, rowBefore, 'hover must not move the diagnostic row');
  results.push({ check: 'search opens file and Problems keyboard dispatches correct diagnostic', pass: true });

  const scenarios = [
    { id: 'desktop', width: 1440, height: 900 }, { id: 'compact', width: 1280, height: 720 },
    { id: 'small', width: 1024, height: 768 }, { id: 'minimum', width: 900, height: 600 },
    { id: 'zoom-200', width: 1440, height: 900, zoom: 2 },
    { id: 'custom-dark', width: 1440, height: 900, settings: { custom_surface: '#151e28', custom_input_surface: '#101820', primary_accent: '#24c4ac' } },
    { id: 'custom-light-panels', width: 1280, height: 720, settings: { custom_surface: '#f4f1ec', custom_input_surface: '#ffffff', primary_accent: '#b22f4a' } },
    { id: 'reduced-motion', width: 900, height: 600, reduced: true, states: true },
    { id: 'empty', width: 900, height: 600, empty: true },
  ];
  for (const scenario of scenarios) {
    win.setContentSize(scenario.width, scenario.height);
    win.webContents.setZoomFactor(scenario.zoom || 1);
    await evaluate(`window.foundationFixture.configure(${JSON.stringify(scenario)})`);
    await evaluate(`document.documentElement.classList.toggle('reduce-motion', ${Boolean(scenario.reduced)})`);
    await delay(350);
    await evaluate(`document.querySelector('input[aria-label="Search files"]').focus()`);
    key('Tab');
    await delay(50);
    const metrics = await evaluate(`(() => {
      const panel=document.querySelector('.nx-v2-panel');
      const focus=getComputedStyle(document.activeElement);
      return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
        panelColor:getComputedStyle(panel).backgroundColor,
        focusWidth:focus.outlineWidth,focusStyle:focus.outlineStyle,focused:document.activeElement.outerHTML.slice(0,400),
        reduced:document.querySelector('[data-fixture]').dataset.reduced,
        spinner:document.querySelector('.nx-panel-spinner') ? getComputedStyle(document.querySelector('.nx-panel-spinner')).animationName : null,
        bodyScroll:[...document.querySelectorAll('.nx-editor-panel-body')].map(el=>({client:el.clientHeight,scroll:el.scrollHeight})),
        clippedControls:[...document.querySelectorAll('.nx-v2-panel header button, .nx-v2-panel header input')].filter(el => {
          const r=el.getBoundingClientRect(),p=el.closest('.nx-v2-panel').getBoundingClientRect();return r.width > 0 && (r.left < p.left - 1 || r.right > p.right + 1);
        }).map(el=>el.title || el.getAttribute('aria-label'))};
    })()`);
    assert.ok(metrics.scrollWidth <= metrics.width + 1, `${scenario.id}: page overflow`);
    assert.equal(metrics.clippedControls.length, 0, `${scenario.id}: clipped controls ${metrics.clippedControls}`);
    assert.equal(metrics.focusStyle, 'solid', `${scenario.id}: focus style ${JSON.stringify(metrics)}`);
    assert.equal(metrics.focusWidth, '2px', `${scenario.id}: focus width`);
    if (!scenario.states) assert.ok(metrics.bodyScroll[1].client >= 48, `${scenario.id}: diagnostic body must remain usable`);
    if (scenario.reduced) { assert.equal(metrics.reduced, 'true'); assert.equal(metrics.spinner, 'none'); }
    await capture(scenario.id);
    results.push({ ...scenario, pass: true, metrics });
  }
  // Runtime preference changes must reach the hook without a parent rerender.
  await evaluate('document.documentElement.classList.remove("reduce-motion")');
  await until('document.querySelector("[data-fixture]").dataset.reduced === "false"');
  // Chromium media emulation separately proves the OS media-query path.
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{name:'prefers-reduced-motion', value:'reduce'}] });
  await until('document.querySelector("[data-fixture]").dataset.reduced === "true"');
  await evaluate('window.foundationFixture.configure({states:true})');
  await until('getComputedStyle(document.querySelector(".nx-panel-spinner")).animationName === "none"');
  await until('document.querySelector(".nx-panel-result-group") && getComputedStyle(document.querySelector(".nx-panel-result-group")).opacity === "1"');
  await capture('system-reduced-motion');
  await click('.nx-panel-section-toggle[aria-expanded="true"]');
  await until('!document.querySelector(".nx-panel-spinner")');
  results.push({ check: 'runtime app preference, system reduced motion and section collapse', pass: true });
  assert.equal(errors.length, 0, errors.join('\n'));
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ pass: true, results, errors }, null, 2));
  console.log(`Visual foundation: ${results.length} checks passed; screenshots in ${output}`);
  clearTimeout(timeout); app.exit(0);
}).catch(async error => {
  console.error(error);
  if (win && !win.isDestroyed()) await capture('failure').catch(() => {});
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ pass: false, error: error.stack, results, errors }, null, 2));
  clearTimeout(timeout); app.exit(1);
});
