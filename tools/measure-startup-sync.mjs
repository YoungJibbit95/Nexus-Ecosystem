import { performance } from 'node:perf_hooks'

const CONTROL_URL = 'https://nexus-api.cloud'
const APP_ID = process.env.NEXUS_MEASURE_APP_ID || 'main'
const CHANNEL = process.env.NEXUS_MEASURE_CHANNEL || 'production'
const REQUEST_TIMEOUT_MS = 4_000
const RETRY_MAX = 2
const RETRY_BASE_MS = 220
const RETRY_MAX_MS = 2_500

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const withTimeoutFetch = async (url, init = {}) => {
  const abort = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = abort
    ? setTimeout(() => {
      abort.abort()
    }, REQUEST_TIMEOUT_MS)
    : null

  try {
    return await fetch(url, { ...init, signal: abort?.signal })
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const shouldRetryStatus = (status) => [408, 425, 429, 500, 502, 503, 504].includes(status)
const retryDelay = (attempt) => {
  const exp = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * (2 ** attempt))
  const jitter = Math.floor(Math.random() * Math.max(16, Math.floor(exp * 0.35)))
  return Math.min(RETRY_MAX_MS, exp + jitter)
}

const createTrackedRequester = ({ dedupe = false, retrySafe = false } = {}) => {
  let networkRequests = 0
  const inflight = new Map()

  const doFetch = async (url) => {
    const key = `GET:${url}`
    if (dedupe && inflight.has(key)) return inflight.get(key)

    const run = (async () => {
      let attempt = 0
      while (true) {
        networkRequests += 1
        try {
          const res = await withTimeoutFetch(url, { method: 'GET', headers: { accept: 'application/json' } })
          if (retrySafe && !res.ok && shouldRetryStatus(res.status) && attempt < RETRY_MAX) {
            // eslint-disable-next-line no-await-in-loop
            await sleep(retryDelay(attempt))
            attempt += 1
            continue
          }

          const contentType = String(res.headers.get('content-type') || '').toLowerCase()
          let jsonOk = false
          if (contentType.includes('application/json') || contentType.includes('+json')) {
            try {
              await res.json()
              jsonOk = true
            } catch {
              jsonOk = false
            }
          }

          return { ok: res.ok, status: res.status, jsonOk }
        } catch (error) {
          const timeout = (error && error.name === 'AbortError')
          if (retrySafe && timeout && attempt < RETRY_MAX) {
            // eslint-disable-next-line no-await-in-loop
            await sleep(retryDelay(attempt))
            attempt += 1
            continue
          }
          return { ok: false, status: 0, jsonOk: false }
        }
      }
    })().finally(() => {
      inflight.delete(key)
    })

    if (dedupe) inflight.set(key, run)
    return run
  }

  return {
    fetchGet: doFetch,
    getNetworkRequests: () => networkRequests,
  }
}

const startupUrls = [
  `${CONTROL_URL}/api/v2/features/catalog?appId=${encodeURIComponent(APP_ID)}&channel=${encodeURIComponent(CHANNEL)}`,
  `${CONTROL_URL}/api/v2/layout/schema?appId=${encodeURIComponent(APP_ID)}&channel=${encodeURIComponent(CHANNEL)}`,
  `${CONTROL_URL}/api/v2/releases/current?appId=${encodeURIComponent(APP_ID)}&channel=${encodeURIComponent(CHANNEL)}`,
]

const runStartupScenario = async (requester) => {
  const started = performance.now()
  await Promise.all([
    requester.fetchGet(startupUrls[0]),
    requester.fetchGet(startupUrls[1]),
    requester.fetchGet(startupUrls[2]),
    requester.fetchGet(startupUrls[0]),
    requester.fetchGet(startupUrls[1]),
    requester.fetchGet(startupUrls[2]),
  ])
  return performance.now() - started
}

const runSyncScenario = async (requester) => {
  const releaseUrl = startupUrls[2]
  const started = performance.now()
  await Promise.all(Array.from({ length: 8 }, () => requester.fetchGet(releaseUrl)))
  return performance.now() - started
}

const run = async () => {
  console.log('Startup/Sync Performance Measurement')
  console.log('====================================')
  console.log(`target=${CONTROL_URL} appId=${APP_ID} channel=${CHANNEL}`)

  const baselineRequester = createTrackedRequester({ dedupe: false, retrySafe: false })
  const baselineStartupMs = await runStartupScenario(baselineRequester)
  const baselineSyncMs = await runSyncScenario(baselineRequester)
  const baselineRequests = baselineRequester.getNetworkRequests()

  const optimizedRequester = createTrackedRequester({ dedupe: true, retrySafe: true })
  const optimizedStartupMs = await runStartupScenario(optimizedRequester)
  const optimizedSyncMs = await runSyncScenario(optimizedRequester)
  const optimizedRequests = optimizedRequester.getNetworkRequests()

  const startupDelta = baselineStartupMs - optimizedStartupMs
  const syncDelta = baselineSyncMs - optimizedSyncMs
  const requestDelta = baselineRequests - optimizedRequests

  console.log('\nBaseline')
  console.log(`- startupMs=${baselineStartupMs.toFixed(2)}`)
  console.log(`- syncMs=${baselineSyncMs.toFixed(2)}`)
  console.log(`- networkRequests=${baselineRequests}`)

  console.log('\nOptimized')
  console.log(`- startupMs=${optimizedStartupMs.toFixed(2)}`)
  console.log(`- syncMs=${optimizedSyncMs.toFixed(2)}`)
  console.log(`- networkRequests=${optimizedRequests}`)

  console.log('\nDelta (baseline - optimized)')
  console.log(`- startupMs=${startupDelta.toFixed(2)}`)
  console.log(`- syncMs=${syncDelta.toFixed(2)}`)
  console.log(`- networkRequests=${requestDelta}`)
}

run().catch((error) => {
  console.error('measurement failed:')
  console.error(error?.message || error)
  process.exit(1)
})
