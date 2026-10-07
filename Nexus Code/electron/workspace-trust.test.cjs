const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { createRequire } = require('node:module');

async function harness(t) {
  const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-trust-ipc-')));
  const root = path.join(fixture, 'workspace'); fs.mkdirSync(root);
  const profile = path.join(fixture, 'profile'); fs.mkdirSync(profile);
  t.after(() => {
    const remove = target => {
      assert.ok(target === fixture || target.startsWith(`${fixture}${path.sep}`));
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink()) fs.unlinkSync(target);
      else if (stat.isDirectory()) { for (const name of fs.readdirSync(target)) remove(path.join(target, name)); fs.rmdirSync(target); }
      else fs.unlinkSync(target);
    }; remove(fixture);
  });
  const handlers = new Map(), listeners = new Map(), sent = [], children = [], windowActions = [];
  let window, ready, response = 0, pendingDialog = null, pendingPath = null, stopped = 0, starts = 0;
  const sender = { isDestroyed: () => false, mainFrame: {}, on() {}, setWindowOpenHandler() {}, send: (...args) => sent.push(args) };
  class Window {
    constructor() { window = this; this.webContents = sender; }
    isDestroyed() { return false; } on() {} once() {} loadFile() { return Promise.resolve(); }
    isMaximized() { return false; }
    minimize() { windowActions.push('minimize'); } maximize() { windowActions.push('maximize'); } close() { windowActions.push('close'); }
  }
  const event = { sender, senderFrame: sender.mainFrame };
  const realRequire = createRequire(path.join(__dirname, 'main.cjs'));
  const electron = {
    app: { isPackaged: true, getPath: () => profile, whenReady: () => ({ then: cb => { ready = cb; } }), on() {}, requestSingleInstanceLock: () => true },
    BrowserWindow: Window, Menu: { setApplicationMenu() {} },
    ipcMain: { handle: (channel, cb) => handlers.set(channel, cb), on: (channel, cb) => listeners.set(channel, cb) },
    session: { defaultSession: { setPermissionRequestHandler() {}, setPermissionCheckHandler() {}, webRequest: { onHeadersReceived() {} } } },
    dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: [root] }), showMessageBox: async () => pendingDialog ? pendingDialog : ({ response }) },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'main.cjs'), 'utf8'), {
    __dirname, Buffer, URL, console: { info() {}, warn() {}, error() {} }, setTimeout: () => 1, clearTimeout() {},
    process: { platform: process.platform, arch: 'x64', pid: 321, env: {} },
    require: name => {
      if (name === 'electron') return electron;
      if (name === 'fs') return { promises: { ...fs.promises, realpath: async target => {
        if (pendingPath) { const wait = pendingPath; pendingPath = null; await wait; }
        return fs.promises.realpath(target);
      } } };
      if (name === 'child_process') return { spawn: () => { const proc = new EventEmitter(); proc.stdout = new EventEmitter(); proc.stderr = new EventEmitter(); proc.stdin = { write() {} }; children.push(proc); return proc; } };
      if (name === './services/stopProcessTree.cjs') return { stopProcessTree: proc => { stopped++; proc.killed = true; } };
      if (name === './services/lspProcessService.cjs') return { createLspProcessService: () => ({ dispose() { stopped++; }, startSession({ assertPermit }) { assertPermit(); starts++; return {}; } }) };
      if (name === './services/gitService.cjs') return { createGitService: ({ getContext }) => ({ status: cwd => { getContext(cwd); return { files: [] }; } }) };
      if (['./services/secureTokenStore.cjs','./services/githubAuthService.cjs','./services/githubService.cjs'].includes(name)) {
        return { createSecureTokenStore: () => ({}), createGithubAuthService: () => ({}), createGithubService: () => ({}) };
      }
      return realRequire(name);
    },
  });
  ready();
  const call = (channel, ...args) => handlers.get(channel)(event, ...args);
  await call('dialog:open-folder');
  return { root, call, handlers, listeners, event, sent, children, window, windowActions, get stopped() { return stopped; }, get starts() { return starts; },
    confirm(value) { response = value; }, delayDialog(promise) { pendingDialog = promise; }, delayPath(promise) { pendingPath = promise; } };
}

test('native trust decision gates execution while allowing ordinary editing', async t => {
  const h = await harness(t);
  assert.equal((await h.call('workspace:trust-status', h.root)).data.trusted, false);
  await h.call('fs:write-file', path.join(h.root, 'allowed.txt'), 'editing works');
  assert.equal(await h.call('fs:read-file', path.join(h.root, 'allowed.txt')), 'editing works');
  assert.equal((await h.call('system:open-terminal', h.root)).ok, false);
  assert.equal((await h.call('git:status', h.root)).ok, true);
  assert.equal((await h.call('lsp:start', { workspacePath: h.root, languageId: 'javascript' })).ok, false);
  await h.listeners.get('terminal:run')(h.event, { id: 1, cwd: h.root, command: 'echo test' });
  assert.equal(h.children.length, 0); assert.equal(h.starts, 0);
  assert.equal((await h.call('workspace:request-trust', h.root)).data.trusted, false);
  h.confirm(1);
  assert.equal((await h.call('workspace:request-trust', h.root)).data.trusted, true);
  assert.equal((await h.call('git:status', h.root)).ok, true);
  assert.equal((await h.call('lsp:start', { workspacePath: h.root, languageId: 'javascript' })).ok, true);
  await h.listeners.get('terminal:run')(h.event, { id: 2, cwd: h.root, command: 'echo test' });
  assert.equal(h.children.length, 1);
  assert.equal((await h.call('workspace:revoke-trust', h.root)).data.trusted, false);
  assert.equal(h.stopped, 2);
});

test('a dangling file symlink cannot create a file outside the selected root', async t => {
  const h = await harness(t);
  const outside = path.join(path.dirname(h.root), 'not-authorized.txt');
  const link = path.join(h.root, 'linked.txt');
  fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'file');
  await assert.rejects(h.call('fs:write-file', link, 'blocked'), /symbolic link/);
  assert.equal(fs.existsSync(outside), false);
});

test('forged/missing/subframe sender cannot pick or request/change trust', async t => {
  const h = await harness(t); h.confirm(1);
  for (const event of [{}, { sender: h.event.sender }, { sender: {}, senderFrame: h.event.senderFrame }, { sender: h.event.sender, senderFrame: {} }]) {
    await assert.rejects(h.handlers.get('dialog:open-folder')(event), /untrusted IPC sender/);
    for (const channel of ['workspace:trust-status','workspace:request-trust','workspace:revoke-trust']) {
      await assert.rejects(h.handlers.get(channel)(event, h.root), /untrusted IPC sender/);
    }
  }
  assert.equal((await h.call('workspace:trust-status', h.root)).data.trusted, false);
});

test('revoke defeats an outstanding approval and a delayed terminal start', async t => {
  const h = await harness(t);
  let approve; h.delayDialog(new Promise(resolve => { approve = resolve; }));
  const grant = h.call('workspace:request-trust', h.root);
  await new Promise(resolve => setImmediate(resolve));
  await h.call('workspace:revoke-trust', h.root);
  approve({ response: 1 });
  assert.equal((await grant).ok, false);
  h.delayDialog(null); h.confirm(1); await h.call('workspace:request-trust', h.root);
  let resume; h.delayPath(new Promise(resolve => { resume = resolve; }));
  const run = h.listeners.get('terminal:run')(h.event, { id: 3, cwd: h.root, command: 'echo test' });
  await h.call('workspace:revoke-trust', h.root);
  resume(); await run;
  assert.equal(h.children.length, 0);
});

test('concurrent terminal starts never leave an unmanaged child after revoke', async t => {
  const h = await harness(t); h.confirm(1); await h.call('workspace:request-trust', h.root);
  await Promise.all([1,2].map(() => h.listeners.get('terminal:run')(h.event, { id: 4, cwd: h.root, command: 'echo test' })));
  assert.equal(h.children.length,2);
  await h.call('workspace:revoke-trust', h.root);
  assert.equal(h.children.every(proc => proc.killed),true);
});

test('all registered native channels reject other windows, subframes and stale senders before dispatch', async t => {
  const h = await harness(t); h.confirm(1); await h.call('workspace:request-trust', h.root);
  const oldFrame = h.event.senderFrame;
  const cases = [
    null, {}, { sender: h.event.sender }, { sender: { isDestroyed: () => false }, senderFrame: oldFrame },
    { sender: h.event.sender, senderFrame: {} },
  ];
  const check = async event => {
    for (const [channel, callback] of h.handlers) {
      await assert.rejects(async () => callback(event, h.root, {}), /untrusted IPC sender/, channel);
    }
    const before = [h.children.length, h.sent.length, h.stopped, h.starts, h.windowActions.length];
    for (const callback of h.listeners.values()) {
      await callback(event, { id: 99, cwd: h.root, command: 'echo unauthorized', input: 'x' });
    }
    assert.deepEqual([h.children.length,h.sent.length,h.stopped,h.starts,h.windowActions.length],before);
  };
  for (const event of cases) await check(event);
  h.event.sender.mainFrame = {}; await check({ sender: h.event.sender, senderFrame: oldFrame });
  h.event.senderFrame = h.event.sender.mainFrame;
  h.event.sender.isDestroyed = () => true; await check(h.event);
  h.event.sender.isDestroyed = () => false; h.window.isDestroyed = () => true; await check(h.event);
  h.window.isDestroyed = () => false;
  assert.equal(await h.call('window:is-maximized'), false);
  await h.listeners.get('window:minimize')(h.event); assert.deepEqual(h.windowActions,['minimize']);
});

test('sender registration preserves valid results and handles unavailable/replaced windows and listener failures', async t => {
  const { createTrustedIpc } = require('./services/ipcSecurity.cjs');
  let current = null; const handlers = new Map(), listeners = new Map(), calls = [], errors = [];
  t.mock.method(console,'error',message=>errors.push(message));
  const ipc = createTrustedIpc({ handle:(name,cb)=>handlers.set(name,cb), on:(name,cb)=>listeners.set(name,cb) },()=>current);
  const sender = { isDestroyed:()=>false, mainFrame:{} };
  const event = { sender, senderFrame:sender.mainFrame }, answer = { ok:true, data:{id:7} };
  ipc.handle('fixture:query',(received,...args)=>{calls.push([received,...args]);return answer;});
  ipc.on('fixture:event',async()=>{throw new Error('synthetic-sensitive-payload');});
  await assert.rejects(handlers.get('fixture:query')(event),/untrusted IPC sender/);
  await listeners.get('fixture:event')(event); assert.equal(errors.length,0);
  current = { isDestroyed:()=>false, webContents:sender };
  assert.equal(await handlers.get('fixture:query')(event,'payload'),answer);
  assert.deepEqual(calls,[[event,'payload']]);
  await listeners.get('fixture:event')(event);
  assert.deepEqual(errors,['Native IPC listener failed: fixture:event']);
  current = { isDestroyed:()=>false, webContents:{isDestroyed:()=>false,mainFrame:{}} };
  await assert.rejects(handlers.get('fixture:query')(event),/untrusted IPC sender/);
  assert.equal(calls.length,1);
});
