'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const fixtureBase = fs.mkdtempSync(path.join(process.cwd(), '.tmp-ipc-security-'));
const allowedRoot = path.join(fixtureBase, 'allowed');
const outsideRoot = path.join(fixtureBase, 'outside');
fs.mkdirSync(allowedRoot, { recursive: true });
fs.mkdirSync(outsideRoot, { recursive: true });
process.env.NEXUS_ALLOWED_FS_ROOTS = allowedRoot;

const {
  assertAllowedPath,
  assertTrustedSender,
} = require('./ipc-handlers.cjs');

test.after(() => {
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
});
