// Opt-in measurements: synthetic probes only; no implicit qualification or transport winner.
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createHost } from './host.mjs'
import { exchange, hello, echo, result } from './client.mjs'
import { differentUserProbe } from './os-user-probe.mjs'
import { browserProbe } from './browser-probe.mjs'

const args = process.argv.slice(2)
const options = {}
for (let index = 0; index < args.length; index += 2) {
  if (!['--output', '--browser'].includes(args[index]) || !args[index + 1] || options[args[index]]) throw new Error('Use --output <evidence.json> [--browser <absolute native binary>]')
  options[args[index]] = args[index + 1]
}
if (!options['--output']) throw new Error('Explicit evidence output required')
const destination = path.resolve(options['--output'])
if (!destination.split(path.sep).includes('.workspace-maintenance')) throw new Error('Evidence must be under .workspace-maintenance/<date>/')
const report = {
  experiment: 'D01-E1', version: 1, sourceCommit: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).stdout.trim(),
  measuredAt: new Date().toISOString(), platform: process.platform, osRelease: os.release(), arch: process.arch,
  node: process.version, syntheticOnly: true, transportDecision: null, candidates: [],
  limitations: ['No installed Electron/Python qualification', 'No product authentication, pairing, domain operations or persistent credentials', 'No sleep/wake or installer lifecycle qualification', 'No controlled DNS-rebinding experiment; native browser execution only when explicitly selected'],
}
const sourceDirectory = path.dirname(fileURLToPath(import.meta.url))
const sourceFiles = []
async function inventory(directory, relative = '') {
  for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : 1)) {
    const file = path.join(directory, entry.name), name = `${relative}${entry.name}`
    if (entry.isDirectory()) await inventory(file, `${name}/`)
    else if (entry.isFile() && /\.(?:mjs|cs|csproj|Config)$/.test(entry.name)) {
      const source = new TextDecoder('utf-8', { fatal: true }).decode(await fs.readFile(file)).replaceAll('\r\n', '\n')
      sourceFiles.push({ path: name, sha256: createHash('sha256').update(source, 'utf8').digest('hex') })
    }
  }
}
await inventory(sourceDirectory)
report.sourceFiles = sourceFiles
report.sourceSha256 = createHash('sha256').update(sourceFiles.map(entry => `${entry.sha256}  ${entry.path}\n`).join('')).digest('hex')
report.scopedWorktreeDirty = Boolean(spawnSync('git', ['status', '--porcelain', '--', 'tools/experiments/d01-e1', '.github/workflows/d01-e1-transport-experiment.yml'], { encoding: 'utf8', windowsHide: true }).stdout.trim())
for (const candidate of ['uds', 'pipe', 'loopback']) {
  if (candidate === 'uds' && process.platform !== 'darwin' || candidate === 'pipe' && (process.platform !== 'win32' || !process.env.D01_E1_PIPE_HOST)) {
    report.candidates.push({ candidate, status: 'NOT VERIFIED', reason: candidate === 'uds' ? 'Native macOS required' : 'Native Windows and explicitly built helper required' })
    continue
  }
  let host
  try {
    const started = performance.now()
    host = await createHost({ candidate })
    const setupMs = performance.now() - started
    const h = result(await exchange(host.descriptor, hello(host.descriptor)))
    assert.equal(h.ok, true)
    const latencies = []
    for (let seq = 1; seq <= 30; seq++) {
      const message = echo(host.descriptor, h.session, seq)
      const before = performance.now()
      const response = result(await exchange(host.descriptor, message))
      latencies.push(performance.now() - before)
      assert.equal(response.ok, true); assert.equal(response.payload, message.payload)
    }
    assert.equal(result(await exchange(host.descriptor, echo(host.descriptor, h.session, 30))).ok, false)
    assert.equal(result(await exchange(host.descriptor, { ...hello(host.descriptor), token: '0'.repeat(64) })).ok, false)
    latencies.sort((a, b) => a - b)
    const sorted = latencies.map(value => Number(value.toFixed(4)))
    report.candidates.push({
      candidate, status: 'VERIFIED: native synthetic process probes only',
      security: { ...host.security, replayRejected: true, wrongCredentialRejected: true, productPeerIdentity: 'NOT VERIFIED', actualDifferentOsUser: differentUserProbe(host.descriptor), remoteMachineProbe: 'NOT VERIFIED', ...(candidate === 'loopback' ? { browserExecution: await browserProbe(host, options['--browser'], path.dirname(destination)) } : {}) },
      reliability: { echoSamples: 30, oneRequestPerConnection: true, allEchoesMatched: true, replayRejected: true },
      latency: { unit: 'ms', samplesSorted: sorted, min: sorted[0], median: sorted[14], p95: sorted[28], max: sorted[29], hostSetupMs: Number(setupMs.toFixed(4)), meaning: 'Local host setup and sequential fresh-connection round trips, NOT installed application startup or a cross-platform ranking' },
      packaging: { sourceOutsideProductRoots: true, installedElectronPython: 'NOT VERIFIED', signedNotarizedInstaller: 'NOT VERIFIED' },
      dependencies: candidate === 'pipe' ? ['Node >=24', '.NET 8 SDK to build, .NET 8 runtime to execute', 'Win32 security APIs'] : ['Node >=24 built-ins'],
      maintainability: candidate === 'pipe' ? 'Separate Windows ACL/handle helper; two runtimes and a bounded stdio bridge' : candidate === 'uds' ? 'Private directory and socket lifecycle; requires native macOS evidence' : 'HTTP parser plus mandatory Host/Origin/token/header limits; larger browser-facing boundary',
    })
  } catch (error) {
    report.candidates.push({ candidate, status: 'FAIL', reason: error.message })
    process.exitCode = 1
  } finally { await host?.close() }
}
await fs.mkdir(path.dirname(destination), { recursive: true })
await fs.writeFile(destination, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ experiment: report.experiment, platform: report.platform, candidates: report.candidates.map(({ candidate, status }) => ({ candidate, status })), output: destination, transportDecision: null }))
