export type KnowledgeNoteLike = {
  id: string
  title: string
  content: string
  tags?: string[]
  created?: string
  updated?: string
  pinned?: boolean
}

export type NoteHeading = {
  id: string
  level: number
  text: string
  line: number
  index: number
}

export type NoteLinkEdge = {
  sourceId: string
  sourceTitle: string
  targetTitle: string
  targetId?: string
}

export type NoteSearchResult<T extends KnowledgeNoteLike> = {
  note: T
  score: number
  reason: string
  preview: string
}

export type NoteKnowledgeGraph<T extends KnowledgeNoteLike> = {
  notesById: Map<string, T>
  titleToId: Map<string, string>
  outgoingByNoteId: Map<string, NoteLinkEdge[]>
  incomingByNoteId: Map<string, NoteLinkEdge[]>
  unresolvedByNoteId: Map<string, NoteLinkEdge[]>
}

const normalizeText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const toSlug = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const countOccurrences = (text: string, query: string) => {
  if (!query || !text) return 0
  let count = 0
  let cursor = 0
  while (cursor < text.length) {
    const idx = text.indexOf(query, cursor)
    if (idx === -1) break
    count += 1
    cursor = idx + query.length
  }
  return count
}

const buildPreview = (content: string, rawQuery: string, maxLength = 110) => {
  const normalizedQuery = normalizeText(rawQuery)
  const plain = String(content || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return 'Leer'
  if (!normalizedQuery) return plain.slice(0, maxLength)

  const lc = normalizeText(plain)
  const idx = lc.indexOf(normalizedQuery)
  if (idx === -1) return plain.slice(0, maxLength)

  const start = Math.max(0, idx - 26)
  const end = Math.min(plain.length, idx + normalizedQuery.length + 54)
  const snippet = plain.slice(start, end)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < plain.length ? '…' : ''
  return `${prefix}${snippet}${suffix}`
}

export const extractWikiTargets = (content: string): string[] => {
  const normalized = String(content || '')
  const regex = /\[\[([^\]]+)\]\]/g
  const targets = new Set<string>()
  let match: RegExpExecArray | null = null
  while (true) {
    match = regex.exec(normalized)
    if (!match) break
    const raw = String(match[1] || '')
    const [targetChunk] = raw.split('|')
    const [targetTitle] = targetChunk.split('#')
    const title = targetTitle.trim()
    if (title) targets.add(title)
  }
  return Array.from(targets)
}

export const extractHeadings = (content: string, maxDepth = 6): NoteHeading[] => {
  const rows = String(content || '').split('\n')
  const headings: NoteHeading[] = []
  let offset = 0
  rows.forEach((row, index) => {
    const match = row.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (match) {
      const level = Math.min(match[1].length, 6)
      if (level <= maxDepth) {
        const text = match[2].trim()
        headings.push({
          id: `h-${index + 1}-${toSlug(text) || 'section'}`,
          level,
          text,
          line: index + 1,
          index: offset,
        })
      }
    }
    offset += row.length + 1
  })
  return headings
}

export const rankNotesForQuery = <T extends KnowledgeNoteLike>(
  notes: T[],
  query: string,
  limit = 24,
): NoteSearchResult<T>[] => {
  const q = normalizeText(query)
  if (!q) {
    return [...notes]
      .sort((a, b) => {
        const aPinned = a.pinned ? 1 : 0
        const bPinned = b.pinned ? 1 : 0
        if (aPinned !== bPinned) return bPinned - aPinned
        return new Date(b.updated || b.created || 0).getTime() - new Date(a.updated || a.created || 0).getTime()
      })
      .slice(0, limit)
      .map((note) => ({
        note,
        score: 0,
        reason: 'recent',
        preview: buildPreview(note.content, ''),
      }))
  }

  const ranked = notes
    .map((note) => {
      const title = normalizeText(note.title)
      const tags = (note.tags || []).map(normalizeText)
      const content = normalizeText(note.content)
      const links = extractWikiTargets(note.content).map(normalizeText)

      let score = 0
      let reason = 'content'

      if (title === q) {
        score += 620
        reason = 'exact-title'
      } else if (title.startsWith(q)) {
        score += 470
        reason = 'title-prefix'
      } else if (title.includes(q)) {
        score += 330
        reason = 'title'
      }

      const tagHit = tags.find((tag) => tag === q || tag.startsWith(q) || tag.includes(q))
      if (tagHit) {
        score += tagHit === q ? 240 : 170
        if (reason === 'content') reason = 'tag'
      }

      const linkHit = links.find((link) => link === q || link.startsWith(q) || link.includes(q))
      if (linkHit) {
        score += 160
        if (reason === 'content') reason = 'wikilink'
      }

      const contentOcc = countOccurrences(content, q)
      if (contentOcc > 0) {
        score += Math.min(120, 48 + contentOcc * 12)
      }

      const recencyBoost = Math.max(
        0,
        36 - Math.floor((Date.now() - new Date(note.updated || note.created || 0).getTime()) / (1000 * 60 * 60 * 24)),
      )
      score += recencyBoost
      if (note.pinned) score += 45

      return {
        note,
        score,
        reason,
        preview: buildPreview(note.content, query),
      }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return ranked
}

export const buildNoteKnowledgeGraph = <T extends KnowledgeNoteLike>(notes: T[]): NoteKnowledgeGraph<T> => {
  const notesById = new Map<string, T>()
  const titleToId = new Map<string, string>()
  const outgoingByNoteId = new Map<string, NoteLinkEdge[]>()
  const incomingByNoteId = new Map<string, NoteLinkEdge[]>()
  const unresolvedByNoteId = new Map<string, NoteLinkEdge[]>()

  const ordered = [...notes].sort((a, b) => {
    const aPinned = a.pinned ? 1 : 0
    const bPinned = b.pinned ? 1 : 0
    if (aPinned !== bPinned) return bPinned - aPinned
    return new Date(b.updated || b.created || 0).getTime() - new Date(a.updated || a.created || 0).getTime()
  })

  ordered.forEach((note) => {
    notesById.set(note.id, note)
    const normalizedTitle = normalizeText(note.title)
    if (normalizedTitle && !titleToId.has(normalizedTitle)) {
      titleToId.set(normalizedTitle, note.id)
    }
  })

  ordered.forEach((note) => {
    const targets = extractWikiTargets(note.content)
    const edges: NoteLinkEdge[] = targets.map((targetTitle) => {
      const targetId = titleToId.get(normalizeText(targetTitle))
      return {
        sourceId: note.id,
        sourceTitle: note.title,
        targetTitle,
        targetId,
      }
    })
    outgoingByNoteId.set(note.id, edges)
    unresolvedByNoteId.set(
      note.id,
      edges.filter((edge) => !edge.targetId),
    )

    edges.forEach((edge) => {
      if (!edge.targetId) return
      const incoming = incomingByNoteId.get(edge.targetId) || []
      incoming.push(edge)
      incomingByNoteId.set(edge.targetId, incoming)
    })
  })

  return {
    notesById,
    titleToId,
    outgoingByNoteId,
    incomingByNoteId,
    unresolvedByNoteId,
  }
}

export const resolveRelatedNotes = <T extends KnowledgeNoteLike>(
  noteId: string,
  graph: NoteKnowledgeGraph<T>,
  maxItems = 6,
): T[] => {
  const base = graph.notesById.get(noteId)
  if (!base) return []

  const baseTags = new Set((base.tags || []).map(normalizeText).filter(Boolean))
  const outgoingIds = new Set(
    (graph.outgoingByNoteId.get(noteId) || [])
      .map((edge) => edge.targetId)
      .filter((value): value is string => Boolean(value)),
  )
  const incomingIds = new Set(
    (graph.incomingByNoteId.get(noteId) || [])
      .map((edge) => edge.sourceId)
      .filter(Boolean),
  )

  const candidates: Array<{ note: T; score: number }> = []
  graph.notesById.forEach((candidate) => {
    if (candidate.id === noteId) return
    let score = 0
    if (outgoingIds.has(candidate.id)) score += 200
    if (incomingIds.has(candidate.id)) score += 180
    const candidateTags = (candidate.tags || []).map(normalizeText)
    const sharedTags = candidateTags.filter((tag) => baseTags.has(tag)).length
    if (sharedTags > 0) score += sharedTags * 60
    if (score === 0) return
    candidates.push({ note: candidate, score })
  })

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map((entry) => entry.note)
}
