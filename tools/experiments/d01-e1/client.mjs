// Synthetic probe controller, not a product client. Python handoff is specified separately.
import net from 'node:net'
import http from 'node:http'
import { randomBytes } from 'node:crypto'
import { frame } from './framing.mjs'
import { encode, VERSION, MAX_FRAME, DEADLINE_MS } from './protocol.mjs'

export function exchange(descriptor, document, headers = {}) {
  const bytes = Buffer.isBuffer(document) ? document : encode(document)
  if (descriptor.candidate === 'loopback') return new Promise((resolve, reject) => {
    const url = new URL(descriptor.endpoint)
    const request = http.request(url, { method: 'POST', agent: false, headers: { 'Content-Type': 'application/json', 'Content-Length': bytes.length, 'X-Nexus-Experiment-Token': descriptor.token, ...headers } }, response => {
      const chunks = []; let size = 0
      response.on('data', chunk => { size += chunk.length; if (size > MAX_FRAME) response.destroy(new Error('Response too large')); else chunks.push(chunk) })
      response.once('error', reject)
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, bytes: Buffer.concat(chunks) }))
    })
    request.setTimeout(DEADLINE_MS + 1000, () => request.destroy(new Error('Probe timeout')))
    request.once('error', reject); request.end(bytes)
  })
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(descriptor.endpoint)
    const chunks = []; let size = 0, expected = null
    const deadline = setTimeout(() => socket.destroy(new Error('Probe timeout')), DEADLINE_MS + 1000)
    socket.once('error', reject)
    socket.once('close', () => { clearTimeout(deadline); if (expected === null || size < expected + 4) reject(new Error('Truncated response')) })
    socket.once('connect', () => socket.write(frame(bytes)))
    socket.on('data', chunk => {
      size += chunk.length
      if (size > MAX_FRAME + 4) return socket.destroy(new Error('Response too large'))
      chunks.push(chunk)
      const data = Buffer.concat(chunks)
      if (expected === null && data.length >= 4) expected = data.readUInt32BE()
      if (expected !== null && (!expected || expected > MAX_FRAME)) return socket.destroy(new Error('Invalid response frame'))
      if (expected !== null && data.length >= expected + 4) {
        clearTimeout(deadline); socket.destroy()
        resolve({ status: 200, headers: {}, bytes: data.subarray(4, expected + 4) })
      }
    })
  })
}

export const hello = descriptor => ({ version: VERSION, id: 1, method: 'experiment.hello', instance: descriptor.instance, token: descriptor.token, nonce: randomBytes(16).toString('hex') })
export const echo = (descriptor, session, seq = 1, payload = 'synthetic:0123456789abcdef') => ({ version: VERSION, id: seq + 1, method: 'experiment.echo', instance: descriptor.instance, token: descriptor.token, session, seq, payload })
export const result = response => JSON.parse(response.bytes.toString('utf8'))
