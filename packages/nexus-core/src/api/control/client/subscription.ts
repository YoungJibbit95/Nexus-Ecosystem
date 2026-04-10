import type { NexusReleaseSubscriptionOptions } from '../options'
import { NexusControlError, clamp, normalizeReleaseChannel } from '../utils'
import { fetchCurrentRelease, fetchLiveBundle } from './fetch-v2'

export const subscribeReleaseUpdates = (
  client: any,
  options: NexusReleaseSubscriptionOptions = {},
  listener: (event: any) => void,
) => {
  const appId = options.appId || client.appId
  const channel = normalizeReleaseChannel(options.channel, client.defaultReleaseChannel)
  const pollIntervalMs = clamp(Math.floor(options.pollIntervalMs ?? client.releasePollIntervalMs), 2_000, 120_000)
  // Keep poll requests fresh while avoiding duplicate reads during bootstrap/live-sync overlap.
  const cacheTtlMs = clamp(
    Math.floor(options.cacheTtlMs ?? Math.min(Math.max(pollIntervalMs - 250, 1_500), 20_000)),
    0,
    120_000,
  )
  const immediate = options.immediate !== false
  let active = true
  let lastReleaseId: string | null = null
  let lastBundle: any = null
  let hasHydratedBundle = false
  let polling = false

  const poll = async () => {
    if (!active || polling) return
    polling = true

    try {
      const releaseResult = await fetchCurrentRelease(client, {
        appId,
        channel,
        forceRefresh: false,
        cacheTtlMs,
      })
      const polledRelease = releaseResult.item || null
      const polledReleaseId = polledRelease?.id || null
      const shouldRefreshBundle = !hasHydratedBundle || (
        Boolean(polledReleaseId) && polledReleaseId !== lastReleaseId
      )

      if (shouldRefreshBundle) {
        const previousReleaseId = lastReleaseId
        const bundle = await fetchLiveBundle(client, {
          appId,
          channel,
          forceRefresh: false,
          cacheTtlMs,
        })
        const releaseId = bundle.release?.id || polledReleaseId || previousReleaseId || null
        const changed = hasHydratedBundle
          ? releaseId !== previousReleaseId
          : true

        lastReleaseId = releaseId
        lastBundle = bundle
        hasHydratedBundle = true

        listener({
          appId,
          channel,
          releaseId,
          changed,
          bundle,
          fetchedAt: Date.now(),
        })
        return
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
          release: polledRelease || lastBundle?.release || null,
        },
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
          release: lastBundle?.release || null,
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
