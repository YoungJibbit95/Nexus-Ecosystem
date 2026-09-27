type Draft = { content: string; revision: number }
type Write = (content: string) => Promise<unknown> | unknown
type SaveResult = { ok: boolean; current: boolean; revision: number; error?: string }

/** File identity and requested bytes are captured before scheduling or awaiting IO. */
export function createDocumentSaveQueue(options: {
  onSaved?: (id: string, revision: number) => void
  onError?: (id: string, message: string) => void
  schedule?: typeof setTimeout
  cancel?: typeof clearTimeout
} = {}) {
  const drafts = new Map<string, Draft>()
  const scheduled = new Map<string, { timer: ReturnType<typeof setTimeout>; write: Write }>()
  const running = new Map<string, Promise<SaveResult>>()
  const schedule = options.schedule ?? setTimeout
  const cancel = options.cancel ?? clearTimeout
  let revision = 0
  const unschedule = (id: string) => { const job = scheduled.get(id); if (job) cancel(job.timer); scheduled.delete(id) }
  const save = (id: string, write: Write): Promise<SaveResult> => {
    unschedule(id)
    const draft = drafts.get(id)
    if (!draft) return Promise.resolve({ ok: true, current: true, revision: 0 })
    const previous = running.get(id)
    const work = async (): Promise<SaveResult> => {
      if (previous) await previous
      // A removed document must not be re-created by a queued write.
      if (!drafts.has(id)) return { ok: false, current: false, revision: draft.revision }
      try {
        const result = await write(draft.content)
        if (result === false) throw new Error('File write was not acknowledged')
        const current = drafts.get(id)?.revision === draft.revision
        if (current) options.onSaved?.(id, draft.revision)
        return { ok: true, current, revision: draft.revision }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        options.onError?.(id, message)
        return { ok: false, current: drafts.get(id)?.revision === draft.revision, revision: draft.revision, error: message }
      }
    }
    const promise = work().finally(() => { if (running.get(id) === promise) running.delete(id) })
    running.set(id, promise)
    return promise
  }
  return {
    edit(id: string, content: string) { const draft = { content, revision: ++revision }; drafts.set(id, draft); return draft },
    get: (id: string) => drafts.get(id),
    entries: () => [...drafts.entries()],
    save,
    schedule(id: string, write: Write, ms: number) {
      unschedule(id)
      scheduled.set(id, { write, timer: schedule(() => { void save(id, write) }, ms) })
    },
    flush: (id: string) => { const job = scheduled.get(id); return job ? save(id, job.write) : running.get(id) },
    flushAll: () => Promise.all([...scheduled.entries()].map(([id, job]) => save(id, job.write))),
    forget(id: string) { unschedule(id); drafts.delete(id) },
  }
}
