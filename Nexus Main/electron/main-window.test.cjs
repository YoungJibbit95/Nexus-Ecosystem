'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const sourceRequire = createRequire(path.join(__dirname, 'main-window.cjs'));
const isolated = { exports: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'main-window.cjs'), 'utf8'), {
  module: isolated, __dirname, process, URL,
  require: name => name === 'electron' ? {} : sourceRequire(name),
});
const { isAllowedNavigation, isAllowedExternalUrl } = isolated.exports;

test('production navigation confines lexical and canonical files to dist', t => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-navigation-')));
  const dist = path.join(base, 'dist');
  const outside = path.join(base, 'outside');
  fs.mkdirSync(dist); fs.mkdirSync(outside);
  const index = path.join(dist, 'index.html');
  const other = path.join(outside, 'index.html');
  fs.writeFileSync(index, '<!doctype html>'); fs.writeFileSync(other, '<!doctype html>');
  const link = path.join(dist, 'escape');
  fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  t.after(() => {
    assert.equal(path.dirname(base), fs.realpathSync(os.tmpdir()));
    assert.equal(fs.lstatSync(link).isSymbolicLink(), true);
    fs.unlinkSync(link);
    for (const file of [index, other]) { assert.equal(fs.lstatSync(file).isFile(), true); fs.unlinkSync(file); }
    fs.rmdirSync(dist); fs.rmdirSync(outside); fs.rmdirSync(base);
  });
  const url = pathToFileURL(index).href;
  assert.equal(isAllowedNavigation(`${url}?notes=1#/workspace`, false, index), true);
  for (const denied of [pathToFileURL(other).href, `${pathToFileURL(dist).href}/../outside/index.html`,
    pathToFileURL(path.join(link, 'index.html')).href, 'file://attacker.invalid/share/index.html',
    'https://example.invalid', 'file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,test']) {
    assert.equal(isAllowedNavigation(denied, false, index), false, denied);
  }
});

test('development navigation binds the exact loopback origin without credentials', () => {
  assert.equal(isAllowedNavigation('http://localhost:5173/notes?q=1#route', true), true);
  for (const url of ['http://localhost:51730', 'https://localhost:5173', 'http://user@localhost:5173',
    'http://localhost:5173@attacker.invalid', 'file:///tmp/index.html']) assert.equal(isAllowedNavigation(url, true), false);
});

test('external browsing accepts validated HTTPS only and rejects userinfo', () => {
  assert.equal(isAllowedExternalUrl('https://nexusproject.dev/help'), true);
  for (const url of ['http://nexusproject.dev', 'https://user:pass@example.invalid', 'file:///tmp/a', 'javascript:alert(1)', 'invalid']) {
    assert.equal(isAllowedExternalUrl(url), false);
  }
});
