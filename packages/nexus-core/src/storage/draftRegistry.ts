type DraftFlush = { flush: () => void; phase: 'draft' | 'store' }
const drafts = new Set<DraftFlush>()
const subscribers = new Set<() => void>()
let generation = 0

/** Application state replacement flushes drafts before capture, then invalidates old sessions. */
export const draftRegistry = {
  register(flush: () => void, options: { phase?: 'draft' | 'store' } = {}) {
    const entry: DraftFlush = { flush, phase: options.phase ?? 'draft' }
    drafts.add(entry)
    return () => { drafts.delete(entry) }
  },
  // Editor drafts may enqueue store patches. Drain those patches only afterwards,
  // independent of module/mount registration order, before capturing a generation.
  flush() {
    for (const phase of ['draft', 'store'] as const) {
      for (const entry of [...drafts]) if (entry.phase === phase && drafts.has(entry)) entry.flush()
    }
  },
  invalidate() { generation++; subscribers.forEach(listener => listener()) },
  getGeneration: () => generation,
  subscribe(listener: () => void) { subscribers.add(listener); return () => { subscribers.delete(listener) } },
}
