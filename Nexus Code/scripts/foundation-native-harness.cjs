// Actual compiled Wave 1 adapters over production preload/main. No account bypass.
const {app,dialog} = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.NEXUS_FOUNDATION_NATIVE_RUN;
if (!root) throw new Error('Run through run-foundation-native.mjs');
const workspace = path.join(root,'workspace with spaces');
const outside = path.join(root,'outside');
fs.mkdirSync(workspace);fs.mkdirSync(outside);
fs.writeFileSync(path.join(outside,'private.txt'),'outside fixture');
app.setPath('userData',path.join(root,'profile'));
dialog.showOpenDialog = async()=>({canceled:false,filePaths:[workspace]});
const results=[];
const started=performance.now();
function finish(error) {
  clearTimeout(watchdog);
  fs.writeFileSync(path.join(root,'summary.json'),JSON.stringify({
    ok:!error,results,error:error?.message,runtime:process.versions,
    productionLoginBypass:false,fixtureRoot:root,durationMs:performance.now()-started,
    limits:'Disposable Windows production bridge, signed-out account gate; no authenticated workbench/live GitHub/LSP/PTY/install acceptance.',
  },null,2)+'\n');
  app.exit(error?1:0);
}
const watchdog=setTimeout(()=>finish(new Error('Foundation native timeout')),60000);
async function check(id,task) {await task();results.push({id,passed:true});console.log(`[foundation-native] ok ${id}`);}
app.once('browser-window-created',(_event,window)=>{
  window.webContents.once('did-finish-load',async()=>{
    const evaluate=code=>window.webContents.executeJavaScript(code);
    const call=(group,operation,...args)=>evaluate(`window.foundationPlatform[${JSON.stringify(group)}][${JSON.stringify(operation)}](...${JSON.stringify(args)})`);
    try {
      await evaluate(fs.readFileSync(path.join(root,'adapter.js'),'utf8'));
      await evaluate('window.foundationPlatform = NexusFoundation.getRendererPlatform(); undefined');
      await check('production-account-gate-and-real-capabilities',async()=>{
        let state;
        for(let attempt=0;attempt<80;attempt++) {
          state=await evaluate(`({text:document.body.innerText,editor:!!document.querySelector('[data-editor-engine]'),kind:foundationPlatform.kind,workspace:foundationPlatform.workspace.capability.state})`);
          if(/Nexus Account|Nexus Code anmelden/.test(state.text)) break;
          await new Promise(resolve=>setTimeout(resolve,100));
        }
        assert.match(state.text,/Nexus Account|Nexus Code anmelden/);
        assert.equal(state.editor,false);assert.equal(state.kind,'electron');assert.equal(state.workspace,'available');
      });
      await check('denial-normalizes-before-root-registration',async()=>{
        const result=await call('workspace','readFile',path.join(outside,'private.txt'));
        assert.equal(result.ok,false);assert.equal(result.error.code,'PERMISSION_DENIED');
        assert.doesNotMatch(JSON.stringify(result),/private\.txt|outside fixture|[A-Z]:\\/);
      });
      await check('root-selection-bytes-directory-and-acknowledgment',async()=>{
        assert.deepEqual(await call('workspace','openFolder'),{ok:true,data:fs.realpathSync(workspace)});
        const file=path.join(workspace,'unicode.txt');const text='Grüße 東京\r\nnext\n';
        assert.deepEqual(await call('workspace','writeFile',file,text),{ok:true,data:true});
        assert.equal(fs.readFileSync(file,'utf8'),text);
        assert.deepEqual(await call('workspace','readFile',file),{ok:true,data:text});
        assert.equal((await call('workspace','readDir',workspace)).data.some(entry=>entry.name==='unicode.txt'),true);
        const empty=path.join(workspace,'empty.txt');await call('workspace','writeFile',empty,'');
        assert.deepEqual(await call('workspace','readFile',empty),{ok:true,data:''});
      });
      await check('protected-traversal-and-symlink-denials-stay-enforced',async()=>{
        for(const result of [
          await call('workspace','writeFile',path.join(outside,'blocked.txt'),'blocked'),
          await call('workspace','mkdir',path.join(workspace,'.git')),
        ]) {assert.equal(result.ok,false);assert.equal(result.error.code,'PERMISSION_DENIED');}
        const link=path.join(workspace,'escape');fs.symlinkSync(outside,link,process.platform==='win32'?'junction':'dir');
        assert.equal((await call('workspace','readFile',path.join(link,'private.txt'))).error.code,'PERMISSION_DENIED');
        assert.equal(fs.existsSync(path.join(outside,'blocked.txt')),false);
      });
      await check('rename-delete-and-directory-shapes-use-native-disk',async()=>{
        const old=path.join(workspace,'empty.txt');const renamed=path.join(workspace,'renamed.txt');
        assert.equal((await call('workspace','rename',old,renamed)).data,true);
        assert.equal(fs.existsSync(old),false);assert.equal(fs.existsSync(renamed),true);
        assert.equal((await call('workspace','delete',renamed)).data,true);assert.equal(fs.existsSync(renamed),false);
      });
      await check('window-query-and-offline-service-envelopes',async()=>{
        assert.equal(typeof (await call('window','isMaximized')).data,'boolean');
        assert.equal((await call('lsp','list')).ok,true);
        assert.equal((await call('github','getAuthStatus')).ok,true);
        const git=await call('git','status',outside);assert.equal(git.ok,false);
        assert.doesNotMatch(JSON.stringify(git),/private\.txt|[A-Z]:\\/);
      });
      await check('real-runner-through-adapter-subscriptions-with-spaced-path',async()=>{
        const runner=path.join(workspace,'runner.cjs');
        fs.writeFileSync(runner,`process.stdout.write('adapter-stdout'); process.stderr.write('adapter-stderr'); process.stdin.once('data',data=>{process.stdout.write('input:'+data.toString().trim());process.exit(7);});setTimeout(()=>process.exit(9),5000);`);
        const result=await evaluate(`new Promise((resolve,reject)=>{
          const port=foundationPlatform.terminal;const output=[];let sent=false;let offOutput,offExit;
          const timer=setTimeout(()=>{cleanup();reject(new Error('Runner timeout'));},10000);
          function cleanup(){clearTimeout(timer);offOutput?.();offExit?.();}
          const subscribedOutput=port.onOutput(71,entry=>{output.push(entry);if(!sent&&entry.text.includes('adapter-stdout')){sent=true;void port.input({id:71,input:'fixture-input\\n'});}});
          const subscribedExit=port.onExit(71,code=>{cleanup();resolve({output,code});});
          if(!subscribedOutput.ok||!subscribedExit.ok){cleanup();reject(new Error('Subscription unavailable'));return;}
          offOutput=subscribedOutput.data;offExit=subscribedExit.data;
          void port.run({id:71,command:${JSON.stringify(`node "${runner}"`)},cwd:${JSON.stringify(workspace)}}).then(result=>{if(!result.ok){cleanup();reject(new Error(result.error.message));}});
        })`);
        const output=result.output.map(entry=>entry.text).join('\n');
        assert.match(output,/adapter-stdout/);assert.match(output,/adapter-stderr/);assert.match(output,/input:fixture-input/);assert.equal(result.code,7);
      });
      finish();
    } catch(error) {console.error(error);finish(error);}
  });
});
require(path.join(__dirname,'../electron/main.cjs'));
