export type PersistedValue<T> = { state: T; version?: number }
export type Snapshot = { format: 'nexus-persist'; formatVersion: 1; value: PersistedValue<unknown> | null }
export const snapshotKey = (name: string) => `${name}::__snapshot-v1`
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function decode(value: unknown): unknown {
  return typeof value === 'string' ? JSON.parse(value) : value
}

function persisted<T>(value: unknown): PersistedValue<T> {
  if (!isRecord(value) || !isRecord(value.state) ||
      (value.version !== undefined && (!Number.isInteger(value.version) || Number(value.version) < 0))) {
    throw new Error('Invalid persisted state; existing data has been retained')
  }
  return value as PersistedValue<T>
}

export function encodeSnapshot<T>(value: PersistedValue<T> | null): string {
  if (value !== null) persisted(value)
  return JSON.stringify({ format: 'nexus-persist', formatVersion: 1, value })
}

export function readSnapshot<T>(raw: unknown): PersistedValue<T> | null {
  const envelope = decode(raw)
  if (!isRecord(envelope) || envelope.format !== 'nexus-persist' || envelope.formatVersion !== 1) {
    throw new Error('Unsupported persisted snapshot; existing data has been retained')
  }
  return envelope.value === null ? null : persisted<T>(envelope.value)
}

export function legacyKeys(name: string, segments: string[]) {
  return [snapshotKey(name), name, `${name}::__meta`, ...segments.map(key => `${name}::${key}`)]
}

/** Old segmented and monolithic representations remain readable, never deleted by migration. */
export function readLegacy<T>(name: string, segments: string[], values: Map<string, unknown>): PersistedValue<T> | null {
  if (values.has(snapshotKey(name))) return readSnapshot<T>(values.get(snapshotKey(name)))
  const state: Record<string, unknown> = {}
  const meta = values.has(`${name}::__meta`) ? decode(values.get(`${name}::__meta`)) : undefined
  if (meta !== undefined && (!isRecord(meta) || typeof meta.version !== 'number')) throw new Error('Invalid legacy state metadata')
  let hasSegments = meta !== undefined
  for (const key of segments) {
    if (!values.has(`${name}::${key}`)) continue
    state[key] = decode(values.get(`${name}::${key}`))
    hasSegments = true
  }
  if (segments.length && hasSegments) return { state: state as T, version: isRecord(meta) ? Number(meta.version) : 0 }
  return values.has(name) ? persisted<T>(decode(values.get(name))) : null
}
