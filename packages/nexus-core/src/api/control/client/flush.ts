import { abortableFetch, now, sleep } from '../utils'
import { requeue, shouldRetryStatus } from './common'

export const pushEvent = (client: any, event: any) => {
  client.queue.push(event)
  if (client.queue.length > client.maxQueueSize) {
    client.queue.splice(0, client.queue.length - client.maxQueueSize)
  }
}

export const flushBatchWithRetry = async (client: any, payload: any, headers: Record<string, string>) => {
  let attempt = 0
  let delayMs = client.flushRetryBaseMs

  while (attempt <= client.maxFlushRetries) {
    try {
      const response = await abortableFetch(`${client.baseUrl}/api/v1/events/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }, client.requestTimeoutMs)

      if (response.ok) {
        return { ok: true, reason: 'ok' }
      }

      const statusReason = `http-${response.status}`
      if (attempt >= client.maxFlushRetries || !shouldRetryStatus(client, response.status)) {
        return { ok: false, reason: statusReason }
      }
    } catch (error) {
      const reason = (error as Error | undefined)?.name === 'AbortError' ? 'timeout' : 'network'
      if (attempt >= client.maxFlushRetries) {
        return { ok: false, reason }
      }
    }

    const jitter = Math.floor(Math.random() * 80)
    await sleep(delayMs + jitter)
    delayMs = Math.min(4_000, delayMs * 2)
    attempt += 1
  }

  return { ok: false, reason: 'unknown' }
}

export const flush = async (client: any) => {
  if (client.flushing || client.queue.length === 0 || !client.baseUrl) return
  client.flushing = true

  const batch = client.queue.splice(0, client.maxBatchSize)
  const payload = {
    appId: client.appId,
    appVersion: client.appVersion,
    sentAt: now(),
    events: batch,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Nexus-App-Id': client.appId,
  }

  if (client.token) {
    headers.Authorization = `Bearer ${client.token}`
  }

  if (client.ingestKey) {
    headers['X-Nexus-Ingest-Key'] = client.ingestKey
  }

  try {
    const result = await flushBatchWithRetry(client, payload, headers)
    if (!result.ok) {
      requeue(client, batch)
      if (client.debug) {
        console.warn(`[NexusAPI:${client.appId}] control flush failed (${result.reason})`) // eslint-disable-line no-console
      }
    }
  } finally {
    client.flushing = false
  }
}
