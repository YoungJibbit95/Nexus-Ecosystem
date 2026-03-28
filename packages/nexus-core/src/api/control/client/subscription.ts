import type { NexusReleaseSubscriptionOptions } from '../options'
import { NexusControlError, clamp, normalizeReleaseChannel } from '../utils'
import { fetchLiveBundle } from './fetch-v2'

export const subscribeReleaseUpdates = (
  client: any,
  options: NexusReleaseSubscriptionOptions = {},
  listener: (event: any) => void,
) => {
  const appId = options.appId || client.appId
  const channel = normalizeReleaseChannel(options.channel, client.defaultReleaseChannel)
  const pollIntervalMs = clamp(Math.floor(options.pollIntervalMs ?? client.releasePollIntervalMs), 2_000, 120_000)
  const immediate = options.immediate !== false
  let active = true
  let lastReleaseId: string | null = null
  let polling = false

  const poll = async () => {
    if (!active || polling) return
    polling = true

    try {
      const bundle = await fetchLiveBundle(client, {
        appId,
        channel,
        forceRefresh: true,
        cacheTtlMs: 0,
      })
      const releaseId = bundle.release?.id || null
      const changed = Boolean(releaseId && releaseId !== lastReleaseId)
      if (releaseId) {
        lastReleaseId = releaseId
      }

      listener({
        appId,
        channel,
        releaseId,
        changed,
        bundle,
        fetchedAt: Date.now(),
      })
    } catch (error) {
      const errorCode = error instanceof NexusControlError
        ? error.code
        : ((error as Error | undefined)?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK')
      if (client.debug) {
        console.warn(`[NexusAPI:${client.appId}] release poll failed (${errorCode})`) // eslint-disable-line no-console
      }
      listener({
        appId,
        channel,
        releaseId: lastReleaseId,
        changed: false,
        bundle: {
          appId,
          channel,
          catalog: null,
          layoutSchema: null,
          release: null,
        },
        fetchedAt: Date.now(),
        errorCode,
      })
    } finally {
      polling = false
    }
  }

  if (immediate) {
    void poll()
  }

  const timer = setInterval(() => {
    void poll()
  }, pollIntervalMs)

  return () => {
    active = false
    clearInterval(timer)
  }
}
