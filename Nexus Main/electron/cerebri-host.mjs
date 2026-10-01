// N1 trusted-host seam. Deliberately not registered in Electron/preload or product UI.
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { realpath } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const REVIEWED_CEREBRI_SOURCE = '1e1ecd6a2b38fde70c7d6ba8f6573404089334ac'
export const REVIEWED_NODE_MODULES = Object.freeze({
  'index.mjs': 'fed60240ce5954a251cb4c9be2da8f5cb9542ef064b45339e2cc409948053770',
  'integration.mjs': '2be76f3709b70ddcdc7d145e4bd84a1bcbcf1f95e50a2264e3a393f653a902b7',
})
export class CerebriHostError extends Error {
  constructor(code) { super(`Cerebri host: ${code}`); this.name = 'CerebriHostError'; this.code = code }
}
export async function artifactSha256(filename) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filename)) hash.update(chunk)
  return hash.digest('hex')
}
function checkAbort(signal) { if (signal.aborted) throw new CerebriHostError('aborted') }

/**
 * All configuration/functions are host-owned, never IPC payloads. A future collector
 * must establish read/plan permission and coverage, then supply a synchronous freshness
 * key. The shipped application has neither collector nor channel and stays disabled.
 * consumer is the pure shared module's createSuggestionOwner factory, injected by a
 * trusted composition root; this file contains no alternate planner or decoder.
 */
export function createCerebriHost({ consumer, enabled = false, platform = 'desktop', configuration, capture, currentFreshnessKey }) {
  configuration = configuration ? Object.freeze({ ...configuration }) : undefined
  let busy = false
  let loaded
  const withBridge = async (signal, fn) => {
    checkAbort(signal)
    if (busy) throw new CerebriHostError('busy') // one active call, no unbounded queue
    busy = true
    try {
      if (!configuration || configuration.sourceSha !== REVIEWED_CEREBRI_SOURCE
        || !path.isAbsolute(configuration.binary ?? '') || !path.isAbsolute(configuration.nodeModule ?? '')
        || !/^[0-9a-f]{64}$/.test(configuration.binarySha256 ?? '')
        || !Number.isInteger(configuration.timeoutMs) || configuration.timeoutMs < 1 || configuration.timeoutMs > 60000) throw new CerebriHostError('artifact_mismatch')
      const binary = await realpath(configuration.binary)
      const module = await realpath(configuration.nodeModule)
      if (path.basename(module) !== 'index.mjs') throw new CerebriHostError('artifact_mismatch')
      const hashes = await Promise.all([
        artifactSha256(binary), artifactSha256(module), artifactSha256(path.join(path.dirname(module), 'integration.mjs')),
      ])
      checkAbort(signal)
      if (hashes[0] !== configuration.binarySha256 || hashes[1] !== REVIEWED_NODE_MODULES['index.mjs'] || hashes[2] !== REVIEWED_NODE_MODULES['integration.mjs']) throw new CerebriHostError('artifact_mismatch')
      loaded ??= await import(pathToFileURL(module).href)
      checkAbort(signal)
      return await fn(loaded, { binary, timeoutMs: configuration.timeoutMs, signal })
    } catch (error) {
      if (error instanceof CerebriHostError || (error?.name === 'CerebriBridgeError' && typeof error.code === 'string')) throw error
      throw new CerebriHostError('bridge_unavailable')
    } finally { busy = false }
  }
  return consumer({ enabled, platform, capture, currentFreshnessKey, port: {
    describe: signal => withBridge(signal, (bridge, options) => bridge.describeIntegration(options)),
    suggest: (request, signal) => withBridge(signal, (bridge, options) => bridge.suggest(request, options)),
  } })
}
