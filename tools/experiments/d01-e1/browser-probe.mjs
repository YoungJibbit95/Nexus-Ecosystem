// Optional real, explicitly selected Chromium/Edge binary; never uses a personal profile.
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { hello } from './client.mjs'

export async function browserProbe(host, binary, evidenceDirectory) {
  if (!binary) return { status: 'NOT VERIFIED', reason: 'No explicitly selected native Chromium/Edge binary' }
  if (!path.isAbsolute(binary)) throw new Error('Browser executable must be an absolute path')
  await fs.access(binary)
  await fs.mkdir(evidenceDirectory, { recursive: true })
  const profile = await fs.mkdtemp(path.join(evidenceDirectory, 'browser-profile-'))
  const descriptor = host.descriptor
  // Give the adversarial page the synthetic short-lived token as a stronger negative control.
  // It must still be rejected by Origin/preflight. Never persist the source or captured DOM.
  const script = `
const endpoint=${JSON.stringify(descriptor.endpoint)},token=${JSON.stringify(descriptor.token)},message=${JSON.stringify(JSON.stringify(hello(descriptor)))};
const attempts=[];
async function run(name,options){try{const response=await fetch(endpoint,{...options,signal:AbortSignal.timeout(1500)});attempts.push({name,readable:response.ok})}catch{attempts.push({name,readable:false})}}
Promise.all([
 run('cors-json-known-token',{method:'POST',headers:{'Content-Type':'application/json','X-Nexus-Experiment-Token':token},body:message}),
 run('simple-post-no-token',{method:'POST',headers:{'Content-Type':'text/plain'},body:'synthetic:00'}),
 run('browser-get',{method:'GET'})
]).then(()=>{document.querySelector('#result').textContent=btoa(JSON.stringify(attempts))});`
  const attacker = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; connect-src http://127.0.0.1:*" })
    res.end(`<!doctype html><pre id="result">PENDING</pre><script>${script}</script>`)
  })
  await new Promise((resolve, reject) => { attacker.once('error', reject); attacker.listen(0, '127.0.0.1', resolve) })
  const before = host.counters
  try {
    let captured
    try { captured = await new Promise((resolve, reject) => {
      const child = spawn(binary, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-background-networking', `--user-data-dir=${profile}`, '--dump-dom', '--virtual-time-budget=4000', `http://127.0.0.1:${attacker.address().port}/`], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
      const chunks = []; let size = 0
      const timeout = setTimeout(() => { child.kill(); reject(new Error('Native browser probe timeout')) }, 20_000)
      child.stdout.on('data', chunk => { size += chunk.length; if (size > 262144) { child.kill(); reject(new Error('Browser output bound exceeded')) } else chunks.push(chunk) })
      child.once('error', error => { clearTimeout(timeout); reject(error) })
      child.once('exit', code => { clearTimeout(timeout); if (code !== 0) reject(new Error('Native browser did not exit successfully')); else resolve(Buffer.concat(chunks).toString('utf8')) })
    }) } catch (error) {
      if (host.counters.accepted !== before.accepted) throw new Error('Browser reached the experiment protocol without completed evidence')
      return { status: 'NOT VERIFIED', reason: error.message, acceptedProtocolCalls: 0, note: 'Native browser attempt did not complete; HTTP negative probes are separate evidence.' }
    }
    const match = /<pre id="result">([A-Za-z0-9+/=]+)<\/pre>/.exec(captured)
    if (!match || match[1] === 'PENDING') {
      if (host.counters.accepted !== before.accepted) throw new Error('Browser crossed the experiment boundary')
      return { status: 'NOT VERIFIED', reason: 'Native browser did not provide completed evidence', acceptedProtocolCalls: 0 }
    }
    const attempts = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'))
    if (attempts.length !== 3 || attempts.some(attempt => attempt.readable) || host.counters.accepted !== before.accepted) throw new Error('Browser request crossed the experiment boundary')
    return { status: 'VERIFIED: native browser negative probes only', attempts, hostRequestsObserved: host.counters.httpRequests - before.httpRequests, hostRejectionsObserved: host.counters.httpRejected - before.httpRejected, acceptedProtocolCalls: 0, note: 'Browser/PNA may block before the host. Controlled DNS rebinding remains NOT VERIFIED; caches retained only under the evidence directory.' }
  } finally {
    attacker.closeAllConnections()
    await new Promise(resolve => attacker.close(resolve))
  }
}
