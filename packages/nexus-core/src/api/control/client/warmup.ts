import type { NexusViewAccessResult } from '../../types'
import type { NexusViewWarmupOptions, NexusViewWarmupResult } from '../options'
import { clamp, normalizeViewId } from '../utils'

const uniqueNormalizedViews = (viewIds: string[]) => {
  const seen = new Set<string>()
  const out: string[] = []

  viewIds.forEach((candidate) => {
    const normalized = normalizeViewId(candidate)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    out.push(normalized)
  })

  return out
}

const mapLimit = async <T, R>(
  values: T[],
  limitRaw: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> => {
  if (values.length === 0) return []

  const limit = clamp(Math.floor(limitRaw), 1, 16)
  const out = new Array<R>(values.length)
  let nextIndex = 0

  const worker = async () => {
    while (true) {
      const index = nextIndex
      nextIndex += 1
      if (index >= values.length) return
      // eslint-disable-next-line no-await-in-loop
      out[index] = await mapper(values[index], index)
    }
  }

  const workers = Array.from({ length: Math.min(limit, values.length) }, () => worker())
  await Promise.all(workers)
  return out
}

export const warmupViewAccess = async (
  client: any,
  viewIds: string[],
  options: NexusViewWarmupOptions = {},
): Promise<NexusViewWarmupResult> => {
  const checkedViews = uniqueNormalizedViews(viewIds || [])
  const checkedAt = new Date().toISOString()
  const startedAt = Date.now()

  if (checkedViews.length === 0) {
    return {
      appId: client.appId,
      checkedViews,
      allowedViews: [],
      blockedViews: [],
      resultByView: {},
      durationMs: 0,
      checkedAt,
    }
  }

  const checks = await mapLimit<string, { viewId: string; result: NexusViewAccessResult }>(
    checkedViews,
    options.concurrency ?? 4,
    async (viewId) => ({
      viewId,
      result: await client.validateViewAccess(viewId, {
        userId: options.userId,
        username: options.username,
        userTier: options.userTier,
        forceRefresh: options.forceRefresh === true,
      }),
    }),
  )

  const allowedViews: string[] = []
  const blockedViews: string[] = []
  const resultByView: Record<string, NexusViewAccessResult> = {}

  checks.forEach(({ viewId, result }) => {
    resultByView[viewId] = result
    if (result.allowed) {
      allowedViews.push(viewId)
      return
    }
    blockedViews.push(viewId)
  })

  return {
    appId: client.appId,
    checkedViews,
    allowedViews,
    blockedViews,
    resultByView,
    durationMs: Date.now() - startedAt,
    checkedAt,
  }
}
