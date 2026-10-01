import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserPlatform, createTestPlatform, getRendererPlatform } from './platform.ts';
import { normalizePlatformError, requirePlatformData } from './errors.ts';
test('browser/missing and partial bridges expose truthful capabilities', async () => {
  const browser = createBrowserPlatform();
  assert.equal(browser.kind,'browser');
  assert.equal(browser.workspace.capability.state,'unavailable');
  assert.equal((await browser.workspace.writeFile('/file','content')).error.code,'UNAVAILABLE');
  const partial = createTestPlatform({readFile:async () => ''});
  assert.equal(partial.kind,'test');
  assert.equal(partial.workspace.capability.state,'degraded');
  assert.deepEqual(await partial.workspace.readFile('/empty'),{ok:true,data:''});
});
test('workspace adapter preserves arguments, picker cancellation, bytes and receiver', async () => {
  const calls = [];
  const native = {marker:true,openFolder:async () => null,
    readDir:async () => [{name:'empty',path:'/root/empty',isDirectory:false,size:null,modified:null}],
    writeFile:async function (...args) { assert.equal(this.marker,true); calls.push(args); return true; }};
  const platform = createTestPlatform(native);
  assert.deepEqual(await platform.workspace.openFolder(),{ok:true,data:null});
  assert.equal((await platform.workspace.readDir('/root')).data[0].name,'empty');
  assert.equal(requirePlatformData(await platform.workspace.writeFile('/root/file','Grüße 東京\r\n')),true);
  assert.deepEqual(calls,[['/root/file','Grüße 東京\r\n']]);
});
test('throws, denied/oversize failures and malformed successes normalize once without leaking details', async () => {
  const platform = createTestPlatform({
    readFile:() => { throw new Error('Path outside selected workspace C:\\private\\file token=ghp_ABC'); },
    writeFile:() => { throw new Error('File content is too large'); }, readDir:async () => [{name:'missing other fields'}],
  });
  const denied = await platform.workspace.readFile('/outside');
  assert.equal(denied.error.code,'PERMISSION_DENIED');
  assert.equal(denied.error.operation,'workspace.readFile');
  assert.doesNotMatch(JSON.stringify(denied),/private|ghp_|ABC|outside selected/);
  assert.throws(() => requirePlatformData(denied),/not permitted/);
  assert.equal((await platform.workspace.writeFile('/f','x')).error.code,'RESOURCE_LIMIT');
  assert.equal((await platform.workspace.readDir('/root')).error.code,'INVALID_RESPONSE');
  assert.equal(normalizePlatformError('git.status',new Error('timed out token=secret')).retryable,true);
  assert.equal(normalizePlatformError('workspace.readFile',new Error('Bitte zuerst einen Workspace-Ordner auswaehlen.')).code,'PERMISSION_DENIED');
});
test('native envelopes stay distinct from fire-and-forget runner dispatch', async () => {
  const calls=[];
  const platform=createTestPlatform({
    gitStatus:async repo => ({ok:true,data:{branch:'main',repo}}),
    gitDiff:async () => ({ok:false,error:'Authentication required token=secret'}),
    githubGetViewer:async () => ({data:{login:'wrong envelope'}}),
    lspRequest:async payload => ({ok:true,data:payload.params}),
    terminalRun:payload => calls.push(payload),
  });
  assert.equal((await platform.git.status('/r')).data.branch,'main');
  assert.equal((await platform.git.diff('/r')).error.code,'AUTH_REQUIRED');
  assert.equal((await platform.github.getViewer()).error.code,'INVALID_RESPONSE');
  assert.deepEqual((await platform.lsp.request({sessionId:'fixture',method:'textDocument/hover',params:{uri:'fixture'}})).data,{uri:'fixture'});
  assert.deepEqual(await platform.terminal.run({id:1,command:'node runner.cjs',cwd:'/r'}),{ok:true,data:undefined});
  assert.equal(calls.length,1); // dispatch acknowledgment, not process success
});
test('subscriptions filter invalid payloads and dispose once, ignoring late events', () => {
  let listener; let disposed=0;
  const platform=createTestPlatform({onMaximized:callback => {listener=callback;return () => disposed++;}});
  const events=[]; const result=platform.window.onMaximized(value => events.push(value));
  listener('invalid'); listener(true);
  assert.deepEqual(events,[true]);
  requirePlatformData(result)(); requirePlatformData(result)(); listener(false);
  assert.equal(disposed,1); assert.deepEqual(events,[true]);
  assert.equal(createTestPlatform({onMaximized:() => undefined}).window.onMaximized(() => {}).error.code,'INVALID_RESPONSE');
});
test('renderer selection never treats a browser fixture object as production Electron', () => {
  const previous=globalThis.window;
  try { globalThis.window={electronAPI:{readFile:()=> 'demo'}}; assert.equal(getRendererPlatform().kind,'browser'); }
  finally { if(previous === undefined) delete globalThis.window; else globalThis.window=previous; }
});
test('false or missing filesystem acknowledgments cannot clear a dirty save', async () => {
  for (const response of [false,undefined,'true']) {
    const result=await createTestPlatform({writeFile:async()=>response}).workspace.writeFile('/file','new revision');
    assert.equal(result.ok,false);assert.equal(result.error.code,'INVALID_RESPONSE');
  }
});

test('subscription teardown errors are safe results and still suppress late events', () => {
  let listener; const seen=[];
  const port=createTestPlatform({onMaximized:callback=>{listener=callback;return()=>{throw new Error('private token=secret');};}}).window;
  const dispose=requirePlatformData(port.onMaximized(value=>seen.push(value)));
  const result=dispose(); assert.equal(result.ok,false);
  assert.doesNotMatch(JSON.stringify(result),/private|secret|token=/);
  listener(true); assert.deepEqual(seen,[]); assert.equal(dispose().ok,true);
});

test('GitHub device-flow compatibility accepts both existing string and options payloads', async () => {
  const calls=[];
  const port=createTestPlatform({githubPollDeviceFlow:async flow=>{calls.push(flow);return {ok:true,data:{status:'pending'}};}}).github;
  assert.equal((await port.pollDeviceFlow('fixture-code')).ok,true);
  assert.equal((await port.pollDeviceFlow({deviceCode:'fixture-code'})).ok,true);
  assert.deepEqual(calls,['fixture-code',{deviceCode:'fixture-code'}]);
});
