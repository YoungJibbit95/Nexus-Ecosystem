const drafts = new Set<() => void>()
const subscribers = new Set<() => void>()
let generation = 0

/** Application state replacement flushes drafts before capture, then invalidates old sessions. */
export const draftRegistry = {
  register(flush: () => void) { drafts.add(flush); return () => { drafts.delete(flush) } },
  flush() { drafts.forEach(flush => flush()) },
  invalidate() { generation++; subscribers.forEach(listener => listener()) },
  getGeneration: () => generation,
  subscribe(listener: () => void) { subscribers.add(listener); return () => { subscribers.delete(listener) } },
}
