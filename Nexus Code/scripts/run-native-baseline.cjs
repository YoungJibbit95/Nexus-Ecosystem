// Wave 0 characterization: real production preload/main, disposable profile/files.
// Run after build: node node_modules/electron/cli.js scripts/run-native-baseline.cjs
const { app, dialog } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.resolve(projectRoot, '../.test-artifacts/nexus-code/native-baseline');
fs.mkdirSync(outputRoot, { recursive: true });
const fixtureRoot = fs.mkdtempSync(path.join(outputRoot, 'run-'));
const workspace = path.join(fixtureRoot, 'workspace');
const outside = path.join(fixtureRoot, 'outside');
fs.mkdirSync(workspace);
fs.mkdirSync(outside);
fs.writeFileSync(path.join(outside, 'private.txt'), 'outside workspace');
const profile = path.join(fixtureRoot, 'profile');
fs.mkdirSync(profile);
app.setPath('userData', profile);
// Only the native picker is substituted; all path registration and IPC are real.
dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [workspace] });
const results = [];
const started = performance.now();
const watchdog = setTimeout(() => {
  fs.writeFileSync(path.join(outputRoot, 'summary.json'), JSON.stringify({
    ok: false, error: 'Native baseline timed out', results,
  }, null, 2));
  app.exit(1);
}, 60_000);

const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function check(id, task) {
  const before = performance.now();
  await task();
  results.push({ id, passed: true, durationMs: +(performance.now() - before).toFixed(2) });
  console.log(`[native-baseline] ok ${id}`);
}

app.once('browser-window-created', (_event, window) => {
  window.webContents.once('did-finish-load', async () => {
    const evaluate = (code) => window.webContents.executeJavaScript(code);
    const call = (method, ...args) => evaluate(
      `window.electronAPI[${JSON.stringify(method)}](...${JSON.stringify(args)})`,
    );
    try {
      await check('production-account-gate-no-workbench', async () => {
        let state;
        for (let attempt = 0; attempt < 80; attempt++) {
          state = await evaluate(`({ text: document.body.innerText, editor: !!document.querySelector('[data-editor-engine]'), bridge: !!window.electronAPI })`);
          if (state.text.includes('Nexus Account') || state.text.includes('Nexus Code anmelden')) break;
          await pause(100);
        }
        assert.match(state.text, /Nexus Account|Nexus Code anmelden/);
        assert.equal(state.editor, false);
        assert.equal(state.bridge, true);
        window.showInactive();
        for (const [width, height] of [[1920,1080],[1440,900],[1280,720],[1024,768],[900,600]]) {
          window.setContentSize(width, height, false);
          await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
          await pause(250);
          fs.writeFileSync(path.join(outputRoot, `production-account-gate-${width}x${height}.png`), (await window.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true })).toPNG());
        }
      });
      await check('filesystem-denied-before-workspace-selection', async () => {
        await assert.rejects(call('readFile', path.join(outside, 'private.txt')), /workspace|selected/i);
      });
      await check('workspace-selection-registers-canonical-root', async () => {
        assert.equal(await call('openFolder'), fs.realpathSync(workspace));
      });
      const unicodePath = path.join(workspace, 'unicode.txt');
      const content = 'Grüße 東京\r\nsecond line\n';
      await check('acknowledged-write-preserves-empty-unicode-and-line-endings', async () => {
        assert.equal(await call('writeFile', unicodePath, content), true);
        assert.equal(fs.readFileSync(unicodePath, 'utf8'), content);
        assert.equal(await call('readFile', unicodePath), content);
        const empty = path.join(workspace, 'empty.txt');
        await call('writeFile', empty, '');
        assert.equal(await call('readFile', empty), '');
      });
      await check('filesystem-traversal-and-protected-metadata-denied', async () => {
        await assert.rejects(call('readFile', path.join(workspace, '../outside/private.txt')), /outside|workspace/i);
        await assert.rejects(call('mkdir', path.join(workspace, '.git')), /protected/i);
        fs.mkdirSync(path.join(workspace, '.git'));
        await assert.rejects(call('writeFile', path.join(workspace, '.git/config'), 'blocked'), /protected/i);
        await assert.rejects(call('writeFile', path.join(outside, 'injected.txt'), 'blocked'), /outside|workspace/i);
        assert.equal(fs.existsSync(path.join(outside, 'injected.txt')), false);
      });
      await check('filesystem-symlink-escape-denied', async () => {
        const link = path.join(workspace, 'escape');
        fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
        await assert.rejects(call('readFile', path.join(link, 'private.txt')), /outside|workspace/i);
        const entries = await call('readDir', workspace);
        assert.equal(entries.some(entry => entry.name === 'escape'), false);
      });
      await check('filesystem-rename-delete-use-real-disk', async () => {
        const renamed = path.join(workspace, 'renamed.txt');
        await call('rename', unicodePath, renamed);
        assert.equal(await call('readFile', renamed), content);
        assert.equal(fs.existsSync(unicodePath), false);
        await call('delete', renamed);
        assert.equal(fs.existsSync(renamed), false);
      });
      await check('git-status-stage-commit-real-disposable-repository', async () => {
        const git = (...args) => execFileSync('git', args, { cwd: workspace, windowsHide: true, encoding: 'utf8' });
        git('init');
        git('config', 'user.name', 'Nexus baseline fixture');
        git('config', 'user.email', 'baseline@example.invalid');
        const status = await call('gitStatus', workspace);
        assert.equal(status.ok, true, JSON.stringify(status));
        assert.equal(status.data.files.some(file => file.path === 'empty.txt'), true);
        const staged = await call('gitStage', workspace, { paths: ['empty.txt'] });
        assert.equal(staged.ok, true, JSON.stringify(staged));
        const committed = await call('gitCommit', workspace, { message: 'Wave 0 fixture' });
        assert.equal(committed.ok, true, JSON.stringify(committed));
        assert.match(git('log', '-1', '--format=%s'), /Wave 0 fixture/);
      });
      const runner = path.join(workspace, 'runner.cjs');
      fs.writeFileSync(runner, `process.stdout.write('native-stdout'); process.stderr.write('native-stderr'); process.stdin.once('data', data => { process.stdout.write('stdin:' + data.toString().trim()); process.exit(7); }); setTimeout(() => process.exit(9), 5000);`);
      async function verifyTerminal(command, sessionId) {
        const terminalResult = await evaluate(`new Promise((resolve, reject) => {
          const output = []; const api = window.electronAPI; let sent = false;
          const timer = setTimeout(() => { cleanup(); reject(new Error('terminal timeout')); }, 10000);
          const offOutput = api.onTerminalOutput(${sessionId}, entry => {
            output.push(entry);
            if (!sent && String(entry.text).includes('native-stdout')) { sent = true; api.terminalInput({id: ${sessionId}, input: 'fixture-input\\n'}); }
          });
          const offExit = api.onTerminalExit(${sessionId}, code => { cleanup(); resolve({output, code}); });
          function cleanup() { clearTimeout(timer); offOutput(); offExit(); }
          api.terminalRun({id: ${sessionId}, command: ${JSON.stringify(command)}, cwd: ${JSON.stringify(workspace)}});
        })`);
        const output = terminalResult.output.map(entry => entry.text).join('\n');
        assert.match(output, /native-stdout/);
        assert.match(output, /native-stderr/);
        assert.match(output, /stdin:fixture-input/);
        assert.equal(terminalResult.code, 7);
      }
      // Retain a reproduced failure as a red gate, then still verify the simple path.
      await check('terminal-quoted-absolute-path-stdout-stderr-stdin-exit', () => verifyTerminal(`node "${runner}"`, 41))
        .catch(error => {
          results.push({ id: 'terminal-quoted-absolute-path-stdout-stderr-stdin-exit', passed: false, error: error.message });
          console.error('[native-baseline] failed quoted-path terminal:', error.message);
        });
      await check('terminal-relative-path-stdout-stderr-stdin-exit', () => verifyTerminal('node runner.cjs', 42));
      const ok = results.every(result => result.passed);
      const summary = { ok, runtime: process.versions, profileIsolation: true,
        productionLoginBypass: false, fixtureRoot, results,
        durationMs: +(performance.now() - started).toFixed(2),
        limits: 'No authenticated workbench, restart/crash durability, PTY, real LSP or GitHub network acceptance.' };
      fs.writeFileSync(path.join(outputRoot, 'summary.json'), JSON.stringify(summary, null, 2));
      clearTimeout(watchdog);
      app.exit(ok ? 0 : 1);
    } catch (error) {
      console.error(error);
      fs.writeFileSync(path.join(outputRoot, 'summary.json'), JSON.stringify({ ok: false, results, error: error.message }, null, 2));
      clearTimeout(watchdog);
      app.exit(1);
    }
  });
});
require(path.join(projectRoot, 'electron/main.cjs'));
