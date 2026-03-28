import { abortableFetch, now } from '../utils'
import { requeue } from './common'

const estimateEventBytes = (event: unknown) => {
  try {
    return Math.max(24, JSON.stringify(event).length)
  } catch {
    return 256
  }
}

const estimateQueueBytes = (events: unknown[]) => events.reduce<number>((total, event) => total + estimateEventBytes(event), 0)

const trimQueueToLimits = (client: any) => {
  while (client.queue.length > client.maxQueueSize) {
    client.queue.shift()
  }

  if (!client.maxQueueBytes || client.maxQueueBytes <= 0 || client.queue.length === 0) return
  let currentBytes = estimateQueueBytes(client.queue)
  while (client.queue.length > 0 && currentBytes > client.maxQueueBytes) {
    client.queue.shift()
    currentBytes = estimateQueueBytes(client.queue)
  }
}

export const pushEvent = (client: any, event: any) => {
  if (estimateEventBytes(event) > Math.floor(client.maxQueueBytes * 0.5)) {
    return
  }

  client.queue.push(event)
  trimQueueToLimits(client)
}

export const flushBatchWithRetry = async (client: any, payload: any, headers: Record<string, string>) => {
  try {
    const response = await abortableFetch(`${client.baseUrl}/api/v1/events/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }, client.requestTimeoutMs)

    if (response.ok) {
      return { ok: true, reason: 'ok' }
    }
    return { ok: false, reason: `http-${response.status}` }
  } catch (error) {
    return {
      ok: false,
      reason: (error as Error | undefined)?.name === 'AbortError' ? 'timeout' : 'network',
    }
  }
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
