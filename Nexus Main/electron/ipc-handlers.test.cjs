'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const temporaryRoot = (fs.realpathSync.native || fs.realpathSync)(os.tmpdir());
const fixtureBase = fs.mkdtempSync(path.join(temporaryRoot, 'nexus-ipc-security-'));
const allowedRoot = path.join(fixtureBase, 'allowed');
const outsideRoot = path.join(fixtureBase, 'outside');
fs.mkdirSync(allowedRoot, { recursive: true });
fs.mkdirSync(outsideRoot, { recursive: true });
process.env.NEXUS_ALLOWED_FS_ROOTS = allowedRoot;

const {
  assertAllowedPath,
  assertTrustedSender,
} = nativeFixture(allowedRoot).exports;

test.after(() => {
  const relative = path.relative(temporaryRoot, fixtureBase);
  assert.ok(relative.startsWith('nexus-ipc-security-') && !relative.includes(path.sep));
  const links = [];
  const inventory = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (fs.lstatSync(target).isSymbolicLink()) links.push(target);
      else if (entry.isDirectory()) inventory(target);
    }
  };
  inventory(fixtureBase);
  for (const link of links) fs.unlinkSync(link);
  fs.rmSync(fixtureBase, { recursive: true, force: true });
});

test('filesystem authorization permits missing children below the canonical root', () => {
  const result = assertAllowedPath(path.join(allowedRoot, 'nested', 'file.txt'), {
    allowMissing: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value, path.join(allowedRoot, 'nested', 'file.txt'));
});

test('filesystem authorization rejects a junction that escapes the configured root', (context) => {
  const junction = path.join(allowedRoot, 'escape');
  try {
    fs.symlinkSync(outsideRoot, junction, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    context.skip(`symlinks are unavailable in this environment: ${error?.code || error}`);
    return;
  }
  fs.writeFileSync(path.join(outsideRoot, 'secret.txt'), 'outside');

  const existing = assertAllowedPath(path.join(junction, 'secret.txt'));
  const missing = assertAllowedPath(path.join(junction, 'new.txt'), { allowMissing: true });
  assert.equal(existing.ok, false);
  assert.equal(missing.ok, false);
});

test('IPC authorization accepts only the main window and its main frame', () => {
  const mainFrame = {};
  const webContents = { mainFrame };
  const win = { isDestroyed: () => false, webContents };
  const getMainWindow = () => win;

  assert.equal(assertTrustedSender({ sender: webContents, senderFrame: mainFrame }, getMainWindow), win);
  assert.throws(
    () => assertTrustedSender({ sender: {}, senderFrame: mainFrame }, getMainWindow),
    /untrusted IPC sender/,
  );
  assert.throws(
    () => assertTrustedSender({ sender: webContents, senderFrame: {} }, getMainWindow),
    /main renderer frame/,
  );
  assert.throws(() => assertTrustedSender({ sender: webContents }, getMainWindow), /main renderer frame/);
});

function nativeFixture(roots = '', pick = async () => ({ canceled: true })) {
  const handlers = new Map();
  const frame = {};
  const win = { webContents: { mainFrame: frame }, isDestroyed: () => false };
  let currentWindow = win;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'ipc-handlers.cjs'), 'utf8'), {
    require: (name) => name === 'electron' ? {
      ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
      dialog: { showOpenDialog: pick }, Notification: {},
    } : require(name),
    module, process: { env: { NEXUS_ALLOWED_FS_ROOTS: roots } }, Buffer,
  });
  module.exports.registerIpcHandlers(() => currentWindow);
  const event = { sender: win.webContents, senderFrame: frame };
  return {
    handlers, event, exports: module.exports,
    call: (channel, ...args) => handlers.get(channel)(event, ...args),
    replaceWindow: () => { currentWindow = { webContents: { mainFrame: {} }, isDestroyed: () => false }; },
  };
}

test('the archive view exposes no native snippet execution authority', () => {
  const fixture = nativeFixture();
  assert.equal(fixture.handlers.has('code:execute'), false);
  const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.cjs'), 'utf8');
  assert.doesNotMatch(preload, /code:execute/);
});

test('native picker grants only a canonical selected root for this session', async () => {
  const file = path.join(outsideRoot, 'selected.txt');
  fs.writeFileSync(file, 'existing workspace');
  let selection = { canceled: true, filePaths: [] };
  let picks = 0;
  const fixture = nativeFixture('', async () => { picks += 1; return selection; });
  for (const [channel, args] of [
    ['fs:read', [file]], ['fs:readDir', [outsideRoot]],
    ['fs:write', [path.join(outsideRoot, 'new.txt'), 'denied']],
  ]) {
    assert.equal((await fixture.call(channel, ...args)).code, 'WORKSPACE_ACCESS_REQUIRED');
  }
  assert.equal((await fixture.call('fs:pickDirectory')).canceled, true);
  assert.equal((await fixture.call('fs:read', file)).ok, false);
  assert.throws(() => fixture.handlers.get('fs:pickDirectory')({ sender: {}, senderFrame: {} }), /untrusted/);
  assert.equal(picks, 1);
  selection = { canceled: false, filePaths: [outsideRoot] };
  const selected = await fixture.call('fs:pickDirectory');
  assert.equal(selected.path, fs.realpathSync(outsideRoot));
  assert.equal((await fixture.call('fs:read', file)).data, 'existing workspace');
  assert.equal((await fixture.call('fs:readDir', outsideRoot)).ok, true);
  const child = path.join(outsideRoot, 'new', 'nested.txt');
  assert.equal((await fixture.call('fs:write', child, 'snapshot')).ok, true);
  assert.equal(fs.readFileSync(child, 'utf8'), 'snapshot');
  assert.equal((await fixture.call('fs:write', path.join(allowedRoot, 'denied.txt'), 'denied')).ok, false);
  assert.equal((await nativeFixture().call('fs:read', file)).code, 'WORKSPACE_ACCESS_REQUIRED');
});

test('missing administrator roots and stale picker owners cannot grant access', async () => {
  const absent = path.join(fixtureBase, 'missing-admin-root');
  const fixture = nativeFixture(absent);
  fs.mkdirSync(absent);
  assert.equal((await fixture.call('fs:write', path.join(absent, 'new.txt'), 'denied')).ok, false);
  const invalidFileRoot = path.join(outsideRoot, 'not-a-directory.txt');
  fs.writeFileSync(invalidFileRoot, 'file');
  assert.equal((await nativeFixture(invalidFileRoot).call('fs:read', invalidFileRoot)).ok, false);
  let resolve;
  const stale = nativeFixture('', () => new Promise((done) => { resolve = done; }));
  const result = stale.call('fs:pickDirectory');
  stale.replaceWindow();
  resolve({ canceled: false, filePaths: [outsideRoot] });
  assert.equal((await result).ok, false);
});
