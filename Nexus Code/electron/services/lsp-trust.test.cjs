const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { createRequire } = require('node:module');

test('server availability lookup is independent of managed LSP session callbacks', async () => {
  const filename = path.join(__dirname,'lspProcessService.cjs');
  const nativeRequire = createRequire(filename), module = { exports: {} }, failures = [];
  vm.runInNewContext(fs.readFileSync(filename,'utf8'), {
    module, Buffer, setTimeout, clearTimeout, process: { platform: process.platform, env: {} },
    require: name => name === 'child_process' ? { spawn(_command,args) {
      const proc = new EventEmitter(); proc.stdout = new EventEmitter(); proc.kill = () => {};
      setImmediate(() => {
        try { proc.stdout.emit('data',Buffer.from(path.join(__dirname,args[0]))); } catch (error) { failures.push(error.message); }
        proc.emit('close',0);
      }); return proc;
    } } : nativeRequire(name),
  });
  const statuses = await module.exports.createLspProcessService().listServerStatus();
  assert.deepEqual(failures,[]);
  assert.ok(statuses.length > 0 && statuses.every(status => status.available));
});

test('LSP rechecks its permit after availability lookup and before every message', async () => {
  const filename = path.join(__dirname,'lspProcessService.cjs');
  const nativeRequire = createRequire(filename);
  let spawned = 0, stopped = 0, trusted = true;
  const children = [];
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename,'utf8'), {
    module, Buffer, setTimeout, clearTimeout,
    process: { platform: process.platform, env: { NEXUS_LSP_TYPESCRIPT: `"${process.execPath}"` } },
    require: name => {
      if (name === 'child_process') return { spawn() {
        spawned++; const proc = new EventEmitter(); proc.stdout = new EventEmitter(); proc.stderr = new EventEmitter(); proc.stdin = { write() {} }; children.push(proc); return proc;
      } };
      if (name === './safeProcessEnv.cjs') return { createSanitizedProcessEnv: () => ({}) };
      if (name === './stopProcessTree.cjs') return { stopProcessTree: () => { stopped++; } };
      return nativeRequire(name);
    },
  });
  const permit = () => { if (!trusted) throw new Error('WORKSPACE_TRUST_REQUIRED'); };
  const service = module.exports.createLspProcessService({ authorize: permit });
  const pending = service.startSession({ languageId:'javascript',workspaceRoot:__dirname,assertPermit:permit });
  trusted = false;
  await assert.rejects(pending,/WORKSPACE_TRUST_REQUIRED/);
  assert.equal(spawned,0);
  trusted = true;
  const session = await service.startSession({ languageId:'javascript',workspaceRoot:__dirname,assertPermit:permit });
  assert.equal(spawned,1);
  service.notify(session.sessionId,'initialized',{});
  trusted = false;
  assert.throws(() => service.notify(session.sessionId,'initialized',{}),/WORKSPACE_TRUST_REQUIRED/);
  await assert.rejects(service.request(session.sessionId,'initialize',{}),/WORKSPACE_TRUST_REQUIRED/);
  service.dispose(); assert.equal(stopped,1); assert.equal(service.listSessions().length,0);
  trusted = true;
  const previousSpawns = spawned;
  const concurrent = await Promise.all([1,2].map(() => service.startSession({ languageId:'javascript',workspaceRoot:__dirname,assertPermit:permit })));
  assert.equal(concurrent[0].sessionId,concurrent[1].sessionId);
  assert.equal(spawned - previousSpawns,1,'concurrent starts must share one managed child');
  service.dispose(); assert.equal(stopped,2);
  const oldChild = children.at(-1);
  await service.startSession({ languageId:'javascript',workspaceRoot:__dirname,assertPermit:permit });
  oldChild.emit('close',0);
  assert.equal(service.listSessions().length,1,'late close must not unregister a replacement session');
  service.dispose(); assert.equal(stopped,3);
});
