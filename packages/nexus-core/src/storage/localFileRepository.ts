export type LocalFile = { id: string; content?: string; [key: string]: unknown }
export type FileStorageStatus = {
  queuedRevision: number
  durableRevision: number
  error: string | null
  blocked: boolean
}
export type FileCommitResult = { ok: boolean; revision: number; error?: string }

const SNAPSHOT_KEY = 'nexus-code-files-snapshot-v3'
const LEGACY_KEY = 'nexus-code-files'
const INDEX_KEY = 'nexus-code-files-index-v2'
const CONTENT_PREFIX = 'nexus-code-file-content-v2:'

function normalizeFiles(value: unknown): LocalFile[] {
  if (!Array.isArray(value)) throw new Error('File snapshot must contain an array')
  const ids = new Set<string>()
  return value.map(file => {
    if (!file || typeof file !== 'object' || typeof file.id !== 'string' || !file.id || ids.has(file.id)) {
      throw new Error('File snapshot contains invalid or duplicate identities')
    }
    ids.add(file.id)
    if (file.content !== undefined && typeof file.content !== 'string') throw new Error('Invalid file content')
    return { ...file, content: file.content ?? '' }
  })
}

/** One atomic localStorage record owns the file index and all content.
 * Legacy representations are read without cleanup; failed writes remain pending.
 * Native workspace IO is deliberately outside this repository.
 */
export function createLocalFileRepository(options: {
  storage: () => Storage | undefined
  debounceMs?: number
  schedule?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>
  cancel?: (handle: ReturnType<typeof setTimeout>) => void
}) {
  const schedule = options.schedule ?? setTimeout
  const cancel = options.cancel ?? clearTimeout
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { serialized: string; revision: number } | undefined
  let status: FileStorageStatus = { queuedRevision: 0, durableRevision: 0, error: null, blocked: false }
  const listeners = new Set<() => void>()
  const update = (patch: Partial<FileStorageStatus>) => {
    status = { ...status, ...patch }
    listeners.forEach(listener => listener())
  }
  const report = (error: unknown, blocked = false) => {
    const message = error instanceof Error ? error.message : String(error)
    update({ error: message, blocked: status.blocked || blocked })
    return message
  }
  const read = (storage: Storage, key: string): unknown => {
    const raw = storage.getItem(key)
    return raw === null ? undefined : JSON.parse(raw)
  }

  const flush = (): FileCommitResult => {
    if (timer !== undefined) cancel(timer)
    timer = undefined
    if (status.blocked) return { ok: false, revision: status.durableRevision, error: status.error ?? 'Storage is read-only' }
    if (!pending) return { ok: true, revision: status.durableRevision }
    try {
      const storage = options.storage()
      if (!storage) throw new Error('Local file storage is unavailable')
      // setItem either replaces the complete record or throws, retaining the previous value.
      storage.setItem(SNAPSHOT_KEY, pending.serialized)
      const revision = pending.revision
      pending = undefined
      update({ durableRevision: revision, error: null })
      return { ok: true, revision }
    } catch (error) {
      return { ok: false, revision: status.durableRevision, error: report(error) }
    }
  }

  const save = (files: unknown): FileCommitResult => {
    if (status.blocked) return { ok: false, revision: status.durableRevision, error: status.error ?? 'Storage is read-only' }
    try {
      // Freeze the requested bytes before any later editor mutation.
      const serialized = JSON.stringify({ schema: 'nexus-code-files', version: 3, files: normalizeFiles(files) })
      const revision = status.queuedRevision + 1
      pending = { serialized, revision }
      update({ queuedRevision: revision })
      if (timer !== undefined) cancel(timer)
      timer = schedule(flush, options.debounceMs ?? 2600)
      return { ok: true, revision }
    } catch (error) {
      return { ok: false, revision: status.durableRevision, error: report(error) }
    }
  }

  const load = (): LocalFile[] | null => {
    try {
      const storage = options.storage()
      if (!storage) throw new Error('Local file storage is unavailable')
      const selected = read(storage, SNAPSHOT_KEY) as { schema?: string; version?: number; files?: unknown } | undefined
      if (selected !== undefined) {
        if (selected?.schema !== 'nexus-code-files' || selected.version !== 3) throw new Error('Unsupported file snapshot version')
        return normalizeFiles(selected.files)
      }
      const index = read(storage, INDEX_KEY)
      const legacy = read(storage, LEGACY_KEY)
      let files: LocalFile[] | null = null
      if (index !== undefined) {
        const legacyById = new Map(Array.isArray(legacy) ? legacy.filter(Boolean).map(file => [file.id, file]) : [])
        if (!Array.isArray(index)) throw new Error('Invalid legacy file index')
        files = normalizeFiles(index.map(meta => {
          if (!meta || typeof meta !== 'object') throw new Error('Invalid legacy file metadata')
          const stored = read(storage, CONTENT_PREFIX + meta.id)
          const content = stored ?? meta.content ?? legacyById.get(meta.id)?.content
          // Empty strings are valid; missing bytes must not become a successful empty save.
          if (content === undefined && !meta.isFolder && meta.type !== 'folder') throw new Error(`Missing content for file ${meta.id}`)
          return { ...meta, content: content ?? '' }
        }))
      } else if (legacy !== undefined) files = normalizeFiles(legacy)
      if (files !== null) {
        save(files)
        flush()
      }
      return files
    } catch (error) {
      report(error, true)
      return null
    }
  }

  return {
    load, save, flush,
    getStatus: () => status,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener) },
    dispose: () => { const result = flush(); listeners.clear(); return result },
  }
}
