import { build } from 'vite';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(project,'package.json'));
const root = path.resolve(project,'../.test-artifacts/nexus-code/foundation-native');
fs.mkdirSync(root,{recursive:true});
const run = fs.mkdtempSync(path.join(root,'run-'));
await build({configFile:false,root:project,logLevel:'warn',build:{
  outDir:run,emptyOutDir:false,minify:false,
  lib:{entry:path.join(project,'src/platform/platform.ts'),name:'NexusFoundation',formats:['iife'],fileName:()=> 'adapter.js'},
}});
const env = {...process.env,NEXUS_FOUNDATION_NATIVE_RUN:run};
delete env.ELECTRON_RUN_AS_NODE;
const code = await new Promise((resolve,reject)=>{
  const child = spawn(process.execPath,[require.resolve('electron/cli.js'),path.join(project,'scripts/foundation-native-harness.cjs')],{env,stdio:'inherit',windowsHide:true});
  child.once('error',reject);child.once('exit',resolve);
});
console.log(`[foundation-native] result ${path.join(run,'summary.json')}`);
if (code !== 0) process.exitCode=1;
