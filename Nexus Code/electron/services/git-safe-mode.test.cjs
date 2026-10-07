const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { deflateSync } = require('node:zlib');
const { createGitService } = require('./gitService.cjs');
const { createSanitizedProcessEnv } = require('./safeProcessEnv.cjs');
const { runProcess } = require('./processRunner.cjs');

function fixture(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'nexus-git-safe-')));
  t.after(() => {
    const remove = target => {
      assert.ok(target === dir || target.startsWith(`${dir}${path.sep}`));
      const stat=fs.lstatSync(target);
      if(stat.isSymbolicLink()) fs.unlinkSync(target);
      else if(stat.isDirectory()) {for(const name of fs.readdirSync(target)) remove(path.join(target,name));fs.rmdirSync(target);}
      else fs.unlinkSync(target);
    }; remove(dir);
  });
  const root=path.join(dir,'workspace');fs.mkdirSync(root);
  const nullFile=process.platform==='win32'?'NUL':'/dev/null';
  const syntheticHome=path.join(dir,'home');fs.mkdirSync(syntheticHome);
  const env=createSanitizedProcessEnv({HOME:syntheticHome,USERPROFILE:syntheticHome,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:nullFile,GIT_CONFIG_SYSTEM:nullFile},{allowExtra:false});
  const git=(...args)=>execFileSync('git',['-C',root,...args],{env,windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  git('init');git('config','user.name','Synthetic Security Fixture');git('config','user.email','fixture@example.invalid');
  git('config','commit.gpgSign','false');git('config','core.hooksPath',path.join(root,'.git/hooks').replace(/\\/g,'/'));
  fs.writeFileSync(path.join(root,'tracked.txt'),'before\n');git('add','tracked.txt');git('commit','-m','fixture');
  fs.writeFileSync(path.join(root,'tracked.txt'),'after\n');
  let trusted=false,revision=0,selectedRoot=root,contextHook=()=>{};
  const service=createGitService({getContext:()=>{contextHook();return {root:selectedRoot,trusted,revision};},getSecurityDirectory:()=>path.join(dir,'profile/secure'),environment:env});
  const marker=path.join(dir,'helper-markers.jsonl'),helper=path.join(dir,'helper.cjs');
  fs.writeFileSync(helper,`require('fs').appendFileSync(${JSON.stringify(marker)},JSON.stringify({kind:process.argv[2],secretPresent:!!process.env.NEXUS_SYNTHETIC_GIT_SECRET})+'\\n');process.stdout.write('converted\\n');`);
  const helperCommand=kind=>`"${process.execPath.replace(/\\/g,'/')}" "${helper.replace(/\\/g,'/')}" ${kind}`;
  return {dir,root,env,git,service,marker,helperCommand,trust(value){trusted=value;revision++;},select(value){selectedRoot=value;revision++;},onContext(callback){contextHook=callback;}};
}

test('safe status/diff/log disable fsmonitor/textconv while retaining real Git data',async t=>{
  const f=fixture(t);
  f.git('config','core.fsmonitor',f.helperCommand('fsmonitor'));
  f.git('config','diff.fixture.textconv',f.helperCommand('textconv'));
  f.env.GIT_CONFIG_COUNT='1';f.env.GIT_CONFIG_KEY_0='core.fsmonitor';f.env.GIT_CONFIG_VALUE_0=f.helperCommand('injected-config');
  f.env.GIT_EXTERNAL_DIFF=f.helperCommand('external-diff');
  fs.writeFileSync(path.join(f.root,'.gitattributes'),'*.txt diff=fixture\n');
  const status=await f.service.status(f.root);
  assert.ok(status.files.some(file=>file.path==='tracked.txt'));
  const diff=await f.service.diff(f.root);assert.match(diff.diff,/-before/);assert.match(diff.diff,/\+after/);
  assert.equal((await f.service.log(f.root)).commits.length,1);
  assert.ok((await f.service.branch(f.root)).branches.length>0);
  assert.equal(fs.existsSync(f.marker),false);
  // Positive control: the same disposable textconv helper executes without policy.
  delete f.env.GIT_EXTERNAL_DIFF;delete f.env.GIT_CONFIG_COUNT;delete f.env.GIT_CONFIG_KEY_0;delete f.env.GIT_CONFIG_VALUE_0;
  f.git('-c','core.fsmonitor=false','diff');
  assert.match(fs.readFileSync(f.marker,'utf8'),/textconv/);
});

test('untrusted mutation is denied before hooks; trusted commit gets sanitized environment',async t=>{
  const f=fixture(t);
  for(const [name,kind] of [['pre-commit','commit'],['post-checkout','checkout']]) {
    fs.writeFileSync(path.join(f.root,'.git/hooks',name),`#!/bin/sh\n${f.helperCommand(kind)}\n`,{mode:0o755});
  }
  await assert.rejects(f.service.stage(f.root,{paths:['tracked.txt']}),/WORKSPACE_TRUST_REQUIRED/);
  await assert.rejects(f.service.unstage(f.root,{all:true}),/WORKSPACE_TRUST_REQUIRED/);
  await assert.rejects(f.service.commit(f.root,{message:'blocked'}),/WORKSPACE_TRUST_REQUIRED/);
  await assert.rejects(f.service.branch(f.root,{action:'switch',name:'other'}),/WORKSPACE_TRUST_REQUIRED/);
  assert.equal(fs.existsSync(f.marker),false);
  f.env.NEXUS_SYNTHETIC_GIT_SECRET='synthetic-only';
  f.env.NEXUS_CODE_CHILD_ENV_ALLOW='NEXUS_SYNTHETIC_GIT_SECRET';
  f.trust(true);
  await f.service.stage(f.root,{paths:['tracked.txt']});
  const result=await f.service.commit(f.root,{message:'trusted fixture'});assert.match(result.hash,/^[0-9a-f]{40}$/);
  const marker=JSON.parse(fs.readFileSync(f.marker,'utf8').trim());
  assert.equal(marker.kind,'commit');assert.equal(marker.secretPresent,false);
});

test('clean/process filters and includes fail closed without helper execution',async t=>{
  const f=fixture(t);
  f.git('config','filter.fixture.clean',f.helperCommand('clean'));
  fs.writeFileSync(path.join(f.root,'.gitattributes'),'*.txt filter=fixture\n');
  await assert.rejects(f.service.status(f.root),/GIT_SAFE_MODE_UNSUPPORTED_CONFIG/);
  await assert.rejects(f.service.diff(f.root),/GIT_SAFE_MODE_UNSUPPORTED_CONFIG/);
  f.git('config','--remove-section','filter.fixture');
  f.git('config','filter.fixture.process',f.helperCommand('process'));
  await assert.rejects(f.service.status(f.root),/GIT_SAFE_MODE_UNSUPPORTED_CONFIG/);
  f.git('config','--remove-section','filter.fixture');
  f.git('config','include.path',path.join(f.dir,'absent-config'));
  await assert.rejects(f.service.status(f.root),/GIT_SAFE_MODE_UNSUPPORTED_CONFIG/);
  assert.equal(fs.existsSync(f.marker),false);
});

test('trusted commit with includes reports its successful mutation accurately',async t=>{
  const f=fixture(t);f.trust(true);
  f.git('config','include.path',path.join(f.dir,'absent-config'));
  f.git('config','filter.fixture.required','false');
  await f.service.stage(f.root,{paths:['tracked.txt']});
  const before=f.git('rev-parse','HEAD').trim();
  const committed=await f.service.commit(f.root,{message:'trusted included config'});
  const after=f.git('rev-parse','HEAD').trim();
  assert.notEqual(after,before);assert.equal(committed.hash,after);
});

test('revoked post-commit metadata does not misreport a completed commit as failure',async t=>{
  const f=fixture(t);f.trust(true);await f.service.stage(f.root,{paths:['tracked.txt']});
  let calls=0;f.onContext(()=>{if(++calls===3)f.trust(false);});
  const committed=await f.service.commit(f.root,{message:'completed before revoke'});
  assert.equal(committed.hash,null);assert.equal(committed.metadataUnavailable,true);
  assert.equal(f.git('log','-1','--format=%s').trim(),'completed before revoke');
});

test('parent discovery and gitdir/commondir escapes fail closed',async t=>{
  const f=fixture(t),child=path.join(f.root,'child');fs.mkdirSync(child);f.select(child);
  await assert.rejects(f.service.status(child),/GIT_WORKSPACE_BOUNDARY/);
  const outside=path.join(f.dir,'outside');fs.mkdirSync(outside);f.select(outside);
  fs.writeFileSync(path.join(outside,'.git'),`gitdir: ${path.join(f.root,'.git')}\n`);
  await assert.rejects(f.service.status(outside),/GIT_WORKSPACE_BOUNDARY/);
  f.select(f.root);fs.writeFileSync(path.join(f.root,'.git/commondir'),'../../outside\n');
  await assert.rejects(f.service.status(f.root),/GIT_WORKSPACE_BOUNDARY/);
});

test('nested refs/object junctions cannot expose an outside repository',async t=>{
  const f=fixture(t),outside=path.join(f.dir,'outside-metadata');fs.mkdirSync(outside);
  const object=(type,body)=>{
    const bytes=Buffer.from(`${type} ${Buffer.byteLength(body)}\0${body}`);
    const hash=createHash('sha1').update(bytes).digest('hex');
    const prefix=path.join(outside,'objects',hash.slice(0,2));fs.mkdirSync(prefix,{recursive:true});
    fs.writeFileSync(path.join(prefix,hash.slice(2)),deflateSync(bytes));return hash;
  };
  const tree=object('tree','');
  const commit=object('commit',`tree ${tree}\nauthor Fixture <fixture@example.invalid> 1 +0000\ncommitter Fixture <fixture@example.invalid> 1 +0000\n\nSYNTHETIC OUTSIDE DATA\n`);
  const heads=path.join(outside,'heads');fs.mkdirSync(heads);fs.writeFileSync(path.join(heads,'review'),`${commit}\n`);
  fs.renameSync(path.join(f.root,'.git/refs/heads'),path.join(f.root,'.git/refs/original-heads'));
  fs.symlinkSync(heads,path.join(f.root,'.git/refs/heads'),process.platform==='win32'?'junction':'dir');
  fs.writeFileSync(path.join(f.root,'.git/HEAD'),'ref: refs/heads/review\n');
  for(const prefix of fs.readdirSync(path.join(outside,'objects'))) {
    const target=path.join(f.root,'.git/objects',prefix);
    if(fs.existsSync(target))fs.renameSync(target,path.join(f.dir,`original-${prefix}`));
    fs.symlinkSync(path.join(outside,'objects',prefix),target,process.platform==='win32'?'junction':'dir');
  }
  await assert.rejects(f.service.log(f.root),/GIT_WORKSPACE_BOUNDARY/);
});

test('trust change during preflight rejects the pending inspection',async t=>{
  const f=fixture(t);
  const pending=f.service.status(f.root);f.trust(true);
  await assert.rejects(pending,/Workspace trust changed/);
});

test('missing promisor objects cannot trigger network transport or external helpers',async t=>{
  const f=fixture(t);
  const blob=f.git('rev-parse','HEAD:tracked.txt').trim();
  fs.unlinkSync(path.join(f.root,'.git/objects',blob.slice(0,2),blob.slice(2)));
  f.git('config','remote.origin.promisor','true');
  f.git('config','remote.origin.url',`ext::${f.helperCommand('network')}`);
  f.git('config','protocol.ext.allow','always');
  await assert.rejects(f.service.diff(f.root));
  assert.equal(fs.existsSync(f.marker),false);
});

test('explicit process environment never reintroduces omitted values',async()=>{
  process.env.NEXUS_SYNTHETIC_RUNNER_SECRET='synthetic-only';
  try {
    const result=await runProcess(process.execPath,['-e',"process.stdout.write(String(!!process.env.NEXUS_SYNTHETIC_RUNNER_SECRET))"],{env:{}});
    assert.equal(result.stdout,'false');
    await assert.rejects(runProcess(process.execPath,['-e','process.exit(0)']),/explicit process environment/);
  } finally {delete process.env.NEXUS_SYNTHETIC_RUNNER_SECRET;}
});
