import test from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnProcess, spawnProcessSync, spawnNpmSync } from './lib/process-utils.mjs'

const win = process.platform === 'win32'
const script = '@echo off\r\necho stdout:%1:%2\r\necho stderr:%1:%2 1>&2\r\nexit /b 7\r\n'
async function fixture(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'Nexus batch ü & '))
  try { await run(directory) }
  finally {
    const absolute = path.resolve(directory)
    assert.ok(absolute.startsWith(path.resolve(os.tmpdir()) + path.sep + 'Nexus batch ü & '))
    await fs.rm(absolute, { recursive: true, force: true })
  }
}
for (const extension of ['bat','cmd']) {
  test(`Windows literal ${extension} path keeps whitespace/Unicode/ampersand and ordinary argv`, { skip: !win }, () => fixture(async directory => {
    const command = path.join(directory, `echo ü & fixture.${extension}`)
    await fs.writeFile(command, script)
    const result = spawnProcessSync(command, ['first','second'], { encoding: 'utf8' })
    assert.equal(result.error, undefined); assert.equal(result.status, 7)
    assert.match(result.stdout, /stdout:first:second/); assert.match(result.stderr, /stderr:first:second/)
    assert.equal(await fs.readFile(command,'utf8'), script)
    const explicit = spawnProcessSync(command, ['first','second'], { encoding: 'utf8', shell: true })
    assert.equal(explicit.status, 7); assert.match(explicit.stdout, /stdout:first:second/)
  }))
}
test('Windows async batch invocation uses the same literal path boundary', { skip: !win }, () => fixture(async directory => {
  const command = path.join(directory,'async ü & fixture.bat'); await fs.writeFile(command,script)
  const child = spawnProcess(command,['first','second']), output = [], errors = []
  child.stdout.on('data',chunk=>output.push(chunk)); child.stderr.on('data',chunk=>errors.push(chunk))
  const status = await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve)})
  assert.equal(status,7); assert.match(Buffer.concat(output).toString(),/stdout:first:second/); assert.match(Buffer.concat(errors).toString(),/stderr:first:second/)
}))
test('Windows EINVAL fallback quotes only the literal batch executable path', { skip: !win }, () => fixture(async directory => {
  const command = path.join(directory,'fallback fixture.bat'); await fs.writeFile(command,script)
  const result = spawnProcessSync(command,['first','second'],{encoding:'utf8',shell:false})
  assert.equal(result.status,7); assert.match(result.stdout,/stdout:first:second/)
}))
test('explicit shell false executable preserves real argv boundaries and nonzero status', () => {
  const result = spawnProcessSync(process.execPath,['-e','process.stdout.write(JSON.stringify(process.argv.slice(1)));process.stderr.write("expected stderr");process.exitCode=11','two words','ü & value'],{encoding:'utf8',shell:false})
  assert.equal(result.status,11); assert.deepEqual(JSON.parse(result.stdout),['two words','ü & value']); assert.equal(result.stderr,'expected stderr')
})
test('ordinary npm invocation remains executable without rewriting npm arguments', () => {
  const result = spawnNpmSync(['--version'],{encoding:'utf8'})
  assert.equal(result.status,0); assert.match(result.stdout.trim(),/^\d+\.\d+\.\d+$/)
})
test('an executable with an explicit custom shell keeps its existing helper behavior', { skip: !win }, () => {
  const result = spawnProcessSync(process.execPath,['--version'],{encoding:'utf8',shell:'pwsh'})
  assert.equal(result.status,0); assert.equal(result.stdout.trim(),process.version)
})
test('npm execPath invocation uses the existing npm CLI through Node', async t => {
  const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js')
  try { await fs.access(npmCli) } catch { t.skip('No known installed npm CLI path'); return }
  const helper = new URL('./lib/process-utils.mjs',import.meta.url).href
  const code = 'const m=await import(process.argv[1]);const r=m.spawnNpmSync(["--version"],{encoding:"utf8"});process.stdout.write(r.stdout||"");process.stderr.write(r.stderr||"");process.exitCode=r.status??1'
  const result = spawnProcessSync(process.execPath,['--input-type=module','-e',code,helper],{encoding:'utf8',shell:false,env:{...process.env,npm_execpath:npmCli}})
  assert.equal(result.status,0); assert.match(result.stdout.trim(),/^\d+\.\d+\.\d+$/)
})
