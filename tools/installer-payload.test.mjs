import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { generateKeyPairSync } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { prepareInstallerPayload, validateInstallerPayload, createInstallerRecipe, collectInstallerDistribution, validateInstallerDistribution } from './lib/installer-payload.mjs'
import { validateExistingRelease, validateInstallerPublication } from './lib/installer-publication.mjs'

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-package-policy-')))
  const repoRoot = path.join(root, 'repository'); fs.mkdirSync(repoRoot)
  const app = path.join(repoRoot, 'Nexus Code')
  for (const directory of ['dist', 'electron', 'assets/icons', 'build']) fs.mkdirSync(path.join(app, directory), { recursive: true })
  fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({name:'nexus-code',main:'electron/main.cjs',version:'1.0.0',scripts:{postinstall:'never execute'},build:{afterPack:'./evil.cjs'}}))
  fs.writeFileSync(path.join(app, 'package-lock.json'), JSON.stringify({packages:{'node_modules/electron':{version:'42.11.3'}}}))
  fs.writeFileSync(path.join(app,'dist/index.html'),'<html>fixture</html>')
  fs.writeFileSync(path.join(app,'electron/main.cjs'),"require('electron');require('node:fs');require('./preload.cjs');")
  fs.writeFileSync(path.join(app,'electron/preload.cjs'),"require('electron');")
  for(const file of ['assets/icons/NexusCodeLogo.ico','assets/icons/NexusCodeLogo.icns','assets/icons/512x512.png','build/entitlements.mac.plist'])fs.writeFileSync(path.join(app,file),'fixture-resource')
  t.after(()=>{
    const entries=[]
    const inventory = file => {
      assert.ok(file===root||file.startsWith(root+path.sep))
      const stat=fs.lstatSync(file)
      if(stat.isDirectory()&&!stat.isSymbolicLink())for(const item of fs.readdirSync(file))inventory(path.join(file,item))
      entries.push({file,directory:stat.isDirectory()&&!stat.isSymbolicLink()})
    }
    inventory(root)
    for(const {file,directory} of entries)if(directory)fs.rmdirSync(file);else fs.unlinkSync(file)
  })
  const options={repoRoot,app:'Nexus Code',output:path.join(root,'payload')}
  const prepare=()=>prepareInstallerPayload(options)
  const validate=()=>validateInstallerPayload({...options,payload:options.output})
  return{root,app,options,prepare,validate}
}

test('static payload discards executable packaging metadata and recipe preserves signing and architecture',t=>{
  const f=fixture(t);f.prepare();assert.equal(f.validate().definition.version,'1.0.0')
  const metadata=JSON.parse(fs.readFileSync(path.join(f.options.output,'app/package.json')))
  assert.equal(metadata.scripts,undefined);assert.equal(metadata.build,undefined);assert.equal(metadata.dependencies,undefined)
  const windows=createInstallerRecipe({...f.options,payload:f.options.output,project:path.join(f.root,'win-project'),target:'win',arch:'x64',signed:true})
  assert.equal(windows.config.win.forceCodeSigning,true)
  assert.equal(windows.config.forceCodeSigning,true)
  assert.equal(windows.config.npmRebuild,false);assert.equal(windows.config.nodeGypRebuild,false);assert.equal(windows.config.extends,null)
  assert.deepEqual(windows.args.slice(-2),['--publish','never'])
  assert.equal(windows.args.includes('--prepackaged'),false)
  const mac=createInstallerRecipe({...f.options,payload:f.options.output,project:path.join(f.root,'mac-project'),target:'mac',arch:'arm64',signed:true})
  assert.deepEqual(mac.config.mac.target,[{target:'dmg',arch:['arm64']}])
  assert.equal(mac.config.mac.identity,undefined);assert.equal(mac.config.mac.hardenedRuntime,true)
  assert.equal(mac.config.forceCodeSigning,true)
  const linux=createInstallerRecipe({...f.options,payload:f.options.output,project:path.join(f.root,'linux-project'),target:'linux',arch:'x64'})
  assert.deepEqual(linux.config.linux.target,['AppImage','deb'])
  assert.equal(linux.config.linux.maintainer,metadata.author)
  assert.equal(metadata.homepage,'https://nexusproject.dev')
})

test('unexpected data, links, missing modules and external native dependencies fail closed',t=>{
  const f=fixture(t)
  fs.writeFileSync(path.join(f.app,'electron/main.cjs'),"require('unbundled-dependency')")
  assert.throws(f.prepare,/Unbundled native dependency/)
  assert.throws(()=>prepareInstallerPayload({...f.options,output:f.app}),/outside the checkout/)
})

test('artifact script/config injection is rejected even with an updated manifest digest',t=>{
  const f=fixture(t);f.prepare()
  fs.writeFileSync(path.join(f.options.output,'app/electron-builder.cjs'),"throw new Error('must not execute')")
  assert.throws(f.validate,/packaging\/dependency configuration/)
  fs.unlinkSync(path.join(f.options.output,'app/electron-builder.cjs'))
  const packageFile=path.join(f.options.output,'app/package.json')
  const metadata=JSON.parse(fs.readFileSync(packageFile));metadata.scripts={postinstall:'never execute'}
  fs.writeFileSync(packageFile,JSON.stringify(metadata))
  assert.throws(f.validate,/digest mismatch/)
  const manifestFile=path.join(f.options.output,'manifest.json')
  const manifest=JSON.parse(fs.readFileSync(manifestFile)),entry=manifest.files.find(file=>file.path==='package.json'),bytes=fs.readFileSync(packageFile)
  entry.size=bytes.length;entry.sha256=createHash('sha256').update(bytes).digest('hex')
  fs.writeFileSync(manifestFile,JSON.stringify(manifest))
  assert.throws(f.validate,/Artifact package scripts\/configuration\/metadata forbidden/)
})

test('artifact nested junction and root alias cannot expose files outside payload',t=>{
  const f=fixture(t);f.prepare()
  const outside=path.join(f.root,'outside');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'fixture.txt'),'outside synthetic data')
  const link=path.join(f.options.output,'app/dist/escape');fs.symlinkSync(outside,link,process.platform==='win32'?'junction':'dir')
  assert.throws(f.validate,/links/)
  fs.unlinkSync(link)
  const alias=path.join(f.root,'alias');fs.symlinkSync(f.options.output,alias,process.platform==='win32'?'junction':'dir')
  assert.throws(()=>validateInstallerPayload({...f.options,payload:alias}),/root links/)
})

test('payload byte tampering and version disagreement fail before packaging',t=>{
  const f=fixture(t);f.prepare()
  fs.writeFileSync(path.join(f.options.output,'app/dist/index.html'),'tampered')
  assert.throws(f.validate,/digest mismatch/)
  const manifest=JSON.parse(fs.readFileSync(path.join(f.options.output,'manifest.json')));manifest.appVersion='2.0.0'
  fs.writeFileSync(path.join(f.options.output,'manifest.json'),JSON.stringify(manifest))
  assert.throws(f.validate,/provenance\/version mismatch/)
})

test('distribution handoff accepts only expected nonempty installer files',t=>{
  const f=fixture(t), directory=path.join(f.root,'release');fs.mkdirSync(directory)
  fs.writeFileSync(path.join(directory,'Nexus_Code_User_Setup_1.0.0.exe'),'synthetic installer')
  fs.writeFileSync(path.join(directory,'packaging.env'),'synthetic forbidden file')
  const options={...f.options,directory,target:'win',arch:'x64',output:path.join(f.root,'distribution')}
  assert.throws(()=>validateInstallerDistribution(options),/Unexpected/)
  collectInstallerDistribution(options)
  assert.deepEqual(validateInstallerDistribution({...options,directory:options.output}),['Nexus_Code_User_Setup_1.0.0.exe'])
  fs.writeFileSync(path.join(options.output,'Nexus_Code_User_Setup_1.0.0.exe'),'')
  assert.throws(()=>validateInstallerDistribution({...options,directory:options.output}),/nonempty/)
})

test('publication requires an existing lightweight or annotated tag at the exact workflow commit',()=>{
  const sha='a'.repeat(40),options={tag:'v1.0.0',repository:'example/project',sha}
  const lightweight=args=>args[0]==='release'?'{}':JSON.stringify({object:{type:'commit',sha}})
  assert.equal(validateExistingRelease({...options,gh:lightweight}),'v1.0.0')
  const annotated=args=>args[0]==='release'?'{}':JSON.stringify({object:args[1].includes('/git/ref/')?{type:'tag',sha:'b'.repeat(40)}:{type:'commit',sha}})
  assert.equal(validateExistingRelease({...options,gh:annotated}),'v1.0.0')
  assert.throws(()=>validateExistingRelease({...options,sha:'c'.repeat(40),gh:lightweight}),/workflow commit/)
  assert.throws(()=>validateExistingRelease({...options,tag:'--clobber',gh:()=>{throw Error('must not call')}}),/explicit release target/)
  assert.throws(()=>validateExistingRelease({...options,gh:()=>{throw Error('missing release')}}),/missing release/)
})

test('complete signed publication handoff succeeds and missing, altered or mismatched assets fail closed',t=>{
  const f=fixture(t),main=path.join(f.options.repoRoot,'Nexus Main');fs.mkdirSync(main)
  fs.writeFileSync(path.join(main,'package.json'),JSON.stringify({name:'nexus',main:'electron-main.cjs',version:'6.0.0'}))
  fs.writeFileSync(path.join(main,'package-lock.json'),JSON.stringify({packages:{'node_modules/electron':{version:'42.11.9'}}}))
  const output=path.join(f.root,'publication');fs.mkdirSync(output)
  const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'})
  for(const [app,slug,version] of [['Main','nexus-main','6.0.0'],['Code','nexus-code','1.0.0']]){
    for(const [target,arch] of [['mac','arm64'],['mac','x64'],['win','x64'],['linux','x64']]){
      const prefix=`${slug}-${target}-${arch}`,group=path.join(f.root,prefix);fs.mkdirSync(group)
      const base=`Nexus_${app}_${version}_${arch}`
      const names=target==='win'?[`Nexus_${app}_User_Setup_${version}.exe`]:target==='mac'?[`${base}.dmg`]:[`${base}.AppImage`,`${base}.deb`]
      for(const name of names)fs.writeFileSync(path.join(group,name),'synthetic installer')
      const result=spawnSync(process.execPath,[fileURLToPath(new URL('./generate-installer-checksums.mjs',import.meta.url)), '--dir',group,'--output-prefix',prefix,'--require-signature'],{
        env:{SystemRoot:process.env.SystemRoot||'',NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_PEM:privateKey.export({type:'pkcs8',format:'pem'})},encoding:'utf8',windowsHide:true,
      })
      assert.equal(result.status,0,result.stderr)
      for(const name of fs.readdirSync(group))fs.copyFileSync(path.join(group,name),path.join(output,name))
    }
  }
  const validate=()=>validateInstallerPublication({repoRoot:f.options.repoRoot,directory:output})
  assert.equal(validate().length,34)
  const file=path.join(output,'Nexus_Code_User_Setup_1.0.0.exe'),original=fs.readFileSync(file)
  fs.writeFileSync(file,'changed fixture');assert.throws(validate,/checksum mismatch/);fs.writeFileSync(file,original)
  const metadataFile=path.join(output,'nexus-code-win-x64-SHA256SUMS.metadata.json'),metadata=JSON.parse(fs.readFileSync(metadataFile))
  metadata.artifacts[0].fileName='Nexus_Main_User_Setup_6.0.0.exe';fs.writeFileSync(metadataFile,JSON.stringify(metadata))
  assert.throws(validate,/artifact set mismatch/)
  fs.unlinkSync(file);assert.throws(validate,/Incomplete/)
})
