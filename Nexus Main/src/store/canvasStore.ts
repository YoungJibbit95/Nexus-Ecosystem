import { createWithEqualityFn as create } from 'zustand/traditional'
import { persist } from 'zustand/middleware'
import { genId } from '../lib/utils'
import { createIndexedDbStorage } from './persistence/indexedDbStorage'

// ─── TYPES ───

export type NodeType =
  | 'text'
  | 'markdown'
  | 'checklist'
  | 'image'
  | 'code'
  | 'note'
  | 'codefile'
  | 'task'
  | 'reminder'
  | 'goal'
  | 'milestone'
  | 'decision'
  | 'risk'
  | 'project'

export type CanvasNodeStatus = 'todo' | 'doing' | 'blocked' | 'done'
export type CanvasNodePriority = 'low' | 'mid' | 'high' | 'critical'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface CanvasNode {
  id: string
  type: NodeType
  title: string
  x: number
  y: number
  width: number
  height: number
  nodeScale?: number       // scales frame + content together (node-local zoom)
  content: string          // text / markdown / code content, or image URL
  color?: string           // optional accent color override
  items?: ChecklistItem[]  // checklist items
  codeLang?: string        // language for code nodes
  linkedNoteId?: string
  linkedCodeId?: string
  linkedTaskId?: string
  linkedReminderId?: string
  status?: CanvasNodeStatus
  priority?: CanvasNodePriority
  progress?: number
  dueDate?: string
  owner?: string
  tags?: string[]
  effort?: number
  lane?: string
  icon?: string
}

export interface CanvasConnection {
  id: string
  fromId: string
  toId: string
  color?: string
  label?: string
}

export interface Canvas {
  id: string
  name: string
  nodes: CanvasNode[]
  connections: CanvasConnection[]
  created: string
  updated: string
}

export interface Viewport {
  panX: number
  panY: number
  zoom: number
}

export interface CanvasHistoryState {
  past: Canvas[]
  future: Canvas[]
  lastGroupKey: string | null
  lastMutationAt: number
}

// ─── STORE INTERFACE ───

interface CanvasStore {
  canvases: Canvas[]
  activeCanvasId: string | null
  viewport: Viewport
  /** Session-only content history. Deliberately excluded from persistence. */
  canvasHistory: Record<string, CanvasHistoryState>

  // Canvas CRUD
  addCanvas: (name?: string) => void
  deleteCanvas: (id: string) => void
  setActiveCanvas: (id: string) => void
  renameCanvas: (id: string, name: string) => void

  // Node CRUD
  addNode: (type: NodeType, x?: number, y?: number) => void
  updateNode: (id: string, p: Partial<CanvasNode>) => void
  deleteNode: (id: string) => void
  moveNode: (id: string, x: number, y: number) => void
  resizeNode: (id: string, width: number, height: number) => void

  // Connection CRUD
  addConnection: (fromId: string, toId: string) => void
  deleteConnection: (id: string) => void
  updateConnection: (id: string, p: Partial<CanvasConnection>) => void

  // Viewport
  setPan: (x: number, y: number) => void
  setZoom: (z: number) => void
  resetViewport: () => void

  // Content history (viewport is intentionally excluded)
  undo: () => void
  redo: () => void

  // Checklist helpers
  addChecklistItem: (nodeId: string, text: string) => void
  toggleChecklistItem: (nodeId: string, itemId: string) => void
  deleteChecklistItem: (nodeId: string, itemId: string) => void

  // Derived
  getActiveCanvas: () => Canvas | undefined
}

const now = () => new Date().toISOString()
const HISTORY_LIMIT = 50
const HISTORY_COALESCE_MS = 700

const DEFAULT_NODE_SIZES: Record<NodeType, { w: number; h: number }> = {
  text: { w: 260, h: 160 },
  markdown: { w: 320, h: 240 },
  checklist: { w: 260, h: 200 },
  image: { w: 300, h: 260 },
  code: { w: 360, h: 240 },
  note: { w: 360, h: 280 },
  codefile: { w: 400, h: 320 },
  task: { w: 280, h: 220 },
  reminder: { w: 280, h: 180 },
  goal: { w: 320, h: 230 },
  milestone: { w: 320, h: 220 },
  decision: { w: 320, h: 230 },
  risk: { w: 320, h: 230 },
  project: { w: 380, h: 260 },
}

const DEFAULT_NODE_TITLES: Record<NodeType, string> = {
  text: 'Text',
  markdown: 'Markdown',
  checklist: 'Checklist',
  image: 'Image',
  code: 'Code',
  note: 'Notiz',
  codefile: 'Code-Datei',
  task: 'Task',
  reminder: 'Reminder',
  goal: 'Goal',
  milestone: 'Milestone',
  decision: 'Decision',
  risk: 'Risk',
  project: 'Project',
}

const DEFAULT_NODE_COLORS: Record<NodeType, string> = {
  text: '#5B8CFF',
  markdown: '#7D6BFF',
  checklist: '#30D158',
  image: '#64D2FF',
  code: '#4E8BFF',
  note: '#58C4FF',
  codefile: '#1A7BFF',
  task: '#32D74B',
  reminder: '#FF9F0A',
  goal: '#FFD60A',
  milestone: '#FF6B35',
  decision: '#AF52DE',
  risk: '#FF453A',
  project: '#00C7BE',
}

const VALID_NODE_STATUSES = new Set<CanvasNodeStatus>(['todo', 'doing', 'blocked', 'done'])
const VALID_NODE_PRIORITIES = new Set<CanvasNodePriority>(['low', 'mid', 'high', 'critical'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object')

const isNodeType = (value: unknown): value is NodeType =>
  typeof value === 'string' && value in DEFAULT_NODE_SIZES

const clampNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

const normalizeViewport = (viewport: Partial<Viewport> | undefined): Viewport => ({
  panX: clampNumber(viewport?.panX, 0, -500_000, 500_000),
  panY: clampNumber(viewport?.panY, 0, -500_000, 500_000),
  zoom: clampNumber(viewport?.zoom, 1, 0.15, 3),
})

const normalizeString = (value: unknown, fallback = '', maxLength = 80_000) => {
  const text = typeof value === 'string' ? value : value == null ? fallback : String(value)
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

const normalizeColor = (value: unknown, fallback: string) => {
  const text = normalizeString(value, fallback, 32).trim()
  return /^#[0-9a-f]{3,8}$/i.test(text) ? text : fallback
}

const normalizeChecklistItems = (value: unknown): ChecklistItem[] | undefined => {
  if (!Array.isArray(value)) return undefined
  return value
    .filter(isRecord)
    .slice(0, 240)
    .map((item, index) => ({
      id: normalizeString(item.id, `item-${index}`, 96),
      text: normalizeString(item.text, '', 1_000),
      done: Boolean(item.done),
    }))
}

const normalizeTags = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined
  return value
    .map((entry) => normalizeString(entry, '', 80).trim())
    .filter(Boolean)
    .slice(0, 40)
}

const normalizeCanvasNode = (value: unknown, index = 0): CanvasNode | null => {
  if (!isRecord(value)) return null
  const type = isNodeType(value.type) ? value.type : 'text'
  const size = DEFAULT_NODE_SIZES[type]
  const node: CanvasNode = {
    id: normalizeString(value.id, `node-${index}-${genId()}`, 120),
    type,
    title: normalizeString(value.title, DEFAULT_NODE_TITLES[type], 240),
    x: clampNumber(value.x, index * 32, -100_000, 100_000),
    y: clampNumber(value.y, index * 28, -100_000, 100_000),
    width: clampNumber(value.width, size.w, 120, 1_600),
    height: clampNumber(value.height, size.h, 80, 1_400),
    nodeScale: clampNumber(value.nodeScale, 1, 0.25, 2.5),
    content: normalizeString(value.content, '', 120_000),
    color: normalizeColor(value.color, DEFAULT_NODE_COLORS[type]),
  }

  const items = normalizeChecklistItems(value.items)
  if (items) node.items = items
  if (typeof value.codeLang === 'string') node.codeLang = normalizeString(value.codeLang, '', 40)
  if (typeof value.linkedNoteId === 'string') node.linkedNoteId = value.linkedNoteId
  if (typeof value.linkedCodeId === 'string') node.linkedCodeId = value.linkedCodeId
  if (typeof value.linkedTaskId === 'string') node.linkedTaskId = value.linkedTaskId
  if (typeof value.linkedReminderId === 'string') node.linkedReminderId = value.linkedReminderId
  if (VALID_NODE_STATUSES.has(value.status as CanvasNodeStatus)) {
    node.status = value.status as CanvasNodeStatus
  }
  if (VALID_NODE_PRIORITIES.has(value.priority as CanvasNodePriority)) {
    node.priority = value.priority as CanvasNodePriority
  }
  if (value.progress != null) node.progress = clampNumber(value.progress, 0, 0, 100)
  if (typeof value.dueDate === 'string') node.dueDate = value.dueDate
  if (typeof value.owner === 'string') node.owner = normalizeString(value.owner, '', 120)
  const tags = normalizeTags(value.tags)
  if (tags) node.tags = tags
  if (value.effort != null) node.effort = clampNumber(value.effort, 0, 0, 10_000)
  if (typeof value.lane === 'string') node.lane = normalizeString(value.lane, '', 80)
  if (typeof value.icon === 'string') node.icon = normalizeString(value.icon, '', 24)
  return node
}

const normalizeCanvasNodes = (value: unknown): CanvasNode[] => {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  return value
    .map((entry, index) => normalizeCanvasNode(entry, index))
    .filter((node): node is CanvasNode => Boolean(node))
    .map((node) => {
      if (!seenIds.has(node.id)) {
        seenIds.add(node.id)
        return node
      }
      const uniqueId = `${node.id}-${genId()}`
      seenIds.add(uniqueId)
      return { ...node, id: uniqueId }
    })
}

const normalizeCanvasConnections = (
  value: unknown,
  nodeIds: Set<string>,
): CanvasConnection[] => {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value
    .filter(isRecord)
    .map((entry, index) => {
      const fromId = normalizeString(entry.fromId, '', 120)
      const toId = normalizeString(entry.toId, '', 120)
      if (!nodeIds.has(fromId) || !nodeIds.has(toId) || fromId === toId) return null
      const pairKey = `${fromId}->${toId}`
      if (seen.has(pairKey)) return null
      seen.add(pairKey)
      const connection: CanvasConnection = {
        id: normalizeString(entry.id, `conn-${index}-${genId()}`, 120),
        fromId,
        toId,
      }
      if (typeof entry.color === 'string') connection.color = normalizeColor(entry.color, '#64D2FF')
      if (typeof entry.label === 'string') connection.label = normalizeString(entry.label, '', 120)
      return connection
    })
    .filter((entry): entry is CanvasConnection => Boolean(entry))
}

const sanitizeCanvasSnapshot = (value: unknown): Canvas | null => {
  if (!isRecord(value)) return null
  const nodes = normalizeCanvasNodes(value.nodes)
  const nodeIds = new Set(nodes.map((node) => node.id))
  return {
    id: normalizeString(value.id, genId(), 120),
    name: normalizeString(value.name, 'Canvas', 180),
    nodes,
    connections: normalizeCanvasConnections(value.connections, nodeIds),
    created: normalizeString(value.created, now(), 80),
    updated: normalizeString(value.updated, now(), 80),
  }
}

const emptyCanvasHistory = (): CanvasHistoryState => ({
  past: [],
  future: [],
  lastGroupKey: null,
  lastMutationAt: 0,
})

const checkpointCanvasHistory = (
  state: CanvasStore,
  canvas: Canvas,
  groupKey: string,
  coalesceMs = 0,
): Record<string, CanvasHistoryState> => {
  const current = state.canvasHistory[canvas.id] ?? emptyCanvasHistory()
  const mutationAt = Date.now()
  const shouldCoalesce =
    coalesceMs > 0 &&
    current.lastGroupKey === groupKey &&
    mutationAt - current.lastMutationAt <= coalesceMs

  if (shouldCoalesce) {
    return {
      ...state.canvasHistory,
      [canvas.id]: {
        ...current,
        future: [],
        lastMutationAt: mutationAt,
      },
    }
  }

  const snapshot = sanitizeCanvasSnapshot(canvas)
  if (!snapshot) return state.canvasHistory
  return {
    ...state.canvasHistory,
    [canvas.id]: {
      past: [...current.past, snapshot].slice(-HISTORY_LIMIT),
      future: [],
      lastGroupKey: groupKey,
      lastMutationAt: mutationAt,
    },
  }
}

const mutateCanvasWithHistory = (
  state: CanvasStore,
  canvasId: string | null,
  groupKey: string,
  coalesceMs: number,
  mutate: (canvas: Canvas) => Canvas,
): CanvasStore => {
  if (!canvasId) return state
  const canvasIndex = state.canvases.findIndex((canvas) => canvas.id === canvasId)
  if (canvasIndex < 0) return state
  const canvas = state.canvases[canvasIndex]
  const nextCanvas = mutate(canvas)
  if (nextCanvas === canvas) return state

  const canvases = state.canvases.slice()
  canvases[canvasIndex] = nextCanvas
  return {
    ...state,
    canvases,
    canvasHistory: checkpointCanvasHistory(state, canvas, groupKey, coalesceMs),
  }
}

type QueuedNodePatch = {
  canvasId: string
  nodeId: string
  patch: Partial<CanvasNode>
}

const queuedNodePatches = new Map<string, QueuedNodePatch>()
let queuedNodePatchHandle: number | null = null
let flushQueuedNodePatchesNow: (() => void) | null = null

const scheduleQueuedNodePatchFlush = (set: (updater: (state: CanvasStore) => CanvasStore) => void) => {
  if (queuedNodePatchHandle !== null) return

  const flush = () => {
    queuedNodePatchHandle = null
    flushQueuedNodePatchesNow = null
    if (queuedNodePatches.size === 0) return
    const queued = Array.from(queuedNodePatches.values())
    queuedNodePatches.clear()

    set((state) => {
      if (queued.length === 0) return state

      const patchByCanvas = new Map<string, Map<string, Partial<CanvasNode>>>()
      queued.forEach((entry) => {
        if (!patchByCanvas.has(entry.canvasId)) {
          patchByCanvas.set(entry.canvasId, new Map())
        }
        const map = patchByCanvas.get(entry.canvasId)!
        const existing = map.get(entry.nodeId) || {}
        map.set(entry.nodeId, { ...existing, ...entry.patch })
      })

      let nextState = state
      for (const canvas of state.canvases) {
        const patchByNode = patchByCanvas.get(canvas.id)
        if (!patchByNode || patchByNode.size === 0) continue
        const groupKey = `node:update:${Array.from(patchByNode.keys()).sort().join(',')}`
        nextState = mutateCanvasWithHistory(
          nextState,
          canvas.id,
          groupKey,
          HISTORY_COALESCE_MS,
          (currentCanvas) => {
            let changed = false
            const nextNodes = currentCanvas.nodes.map((node) => {
              const patch = patchByNode.get(node.id)
              if (!patch) return node
              const normalized = normalizeCanvasNode({ ...node, ...patch }) ?? node
              changed = changed || normalized !== node
              return normalized
            })
            return changed
              ? { ...currentCanvas, nodes: nextNodes, updated: now() }
              : currentCanvas
          },
        )
      }
      return nextState
    })
  }

  flushQueuedNodePatchesNow = flush

  if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
    queuedNodePatchHandle = window.requestAnimationFrame(flush)
    return
  }
  queuedNodePatchHandle = globalThis.setTimeout(flush, 16) as unknown as number
}

const enqueueNodePatch = (
  set: (updater: (state: CanvasStore) => CanvasStore) => void,
  get: () => CanvasStore,
  nodeId: string,
  patch: Partial<CanvasNode>,
) => {
  const canvasId = get().activeCanvasId
  if (!canvasId) return
  const queueKey = `${canvasId}::${nodeId}`
  const existing = queuedNodePatches.get(queueKey)
  queuedNodePatches.set(queueKey, {
    canvasId,
    nodeId,
    patch: { ...(existing?.patch || {}), ...patch },
  })
  scheduleQueuedNodePatchFlush(set)
}

const sanitizePersistedCanvases = (value: unknown): Canvas[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry: any) => {
      const nodes = normalizeCanvasNodes(entry.nodes)
      const nodeIds = new Set(nodes.map((node) => node.id))
      return {
        id: typeof entry.id === 'string' ? entry.id : genId(),
        name: normalizeString(entry.name, 'Canvas', 180),
        nodes,
        connections: normalizeCanvasConnections(entry.connections, nodeIds),
        created: typeof entry.created === 'string' ? entry.created : now(),
        updated: typeof entry.updated === 'string' ? entry.updated : now(),
      }
    })
}

const buildDefaultCanvas = (): Canvas => ({
  id: 'canvas-welcome',
  name: '🚀 Nexus Canvas Walkthrough',
  created: now(),
  updated: now(),
  nodes: [
    {
      id: 'canvas-node-project',
      type: 'project',
      title: 'Nexus Workspace Setup',
      x: 120,
      y: 80,
      width: 380,
      height: 260,
      color: '#5E5CE6',
      status: 'doing',
      priority: 'high',
      progress: 36,
      owner: 'you',
      dueDate: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10),
      content: 'Ziel: Workspace aufsetzen, Team onboarden und Roadmap visualisieren.',
    },
    {
      id: 'canvas-node-note',
      type: 'markdown',
      title: 'Quick Guide',
      x: -320,
      y: 70,
      width: 360,
      height: 280,
      color: '#64D2FF',
      content:
        '```nexus-list\nZoom | Pinch oder Ctrl/Cmd + Scroll\nPan | Drag auf Hintergrund\nMagic Builder | Cmd/Ctrl + M\n```\n\n' +
        '```nexus-steps\nCanvas öffnen | Überblick gewinnen\nTemplate nutzen | Struktur erzeugen\nNodes verfeinern | Inhalte präzisieren\n```',
    },
    {
      id: 'canvas-node-checklist',
      type: 'checklist',
      title: 'Kickoff Checklist',
      x: 520,
      y: 120,
      width: 280,
      height: 220,
      color: '#30D158',
      items: [
        { id: 'item-1', text: 'Workspace-Ordner wählen', done: false },
        { id: 'item-2', text: 'Notes Guide lesen', done: true },
        { id: 'item-3', text: 'Dashboard Layout anpassen', done: false },
      ],
      content: '',
    },
    {
      id: 'canvas-node-risk',
      type: 'risk',
      title: 'Performance Risk',
      x: 150,
      y: 390,
      width: 330,
      height: 220,
      color: '#FF453A',
      status: 'blocked',
      priority: 'critical',
      content:
        '```nexus-alert\nwarning\nLag im Built-Modus immer mit Profiling prüfen (TTI, Input Delay, View Switch).\n```',
    },
  ],
  connections: [
    { id: 'conn-1', fromId: 'canvas-node-project', toId: 'canvas-node-note' },
    { id: 'conn-2', fromId: 'canvas-node-project', toId: 'canvas-node-checklist' },
    { id: 'conn-3', fromId: 'canvas-node-project', toId: 'canvas-node-risk' },
  ],
})

// ─── STORE ───

export const useCanvas = create<CanvasStore>()(
  persist((set, get) => ({

    canvases: [buildDefaultCanvas()],
    activeCanvasId: 'canvas-welcome',
    viewport: { panX: 0, panY: 0, zoom: 1 },
    canvasHistory: {},

    // ─── Canvas CRUD ───

    addCanvas: (name = 'Neues Canvas') => {
      const c: Canvas = {
        id: genId(),
        name,
        nodes: [],
        connections: [],
        created: now(),
        updated: now(),
      }
      set(s => ({
        canvases: [c, ...s.canvases],
        activeCanvasId: c.id,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      }))
    },

    deleteCanvas: (id) => set(s => {
      const remaining = s.canvases.filter(c => c.id !== id)
      const { [id]: _removedHistory, ...canvasHistory } = s.canvasHistory
      return {
        canvases: remaining,
        canvasHistory,
        activeCanvasId: s.activeCanvasId === id
          ? (remaining[0]?.id ?? null)
          : s.activeCanvasId,
      }
    }),

    setActiveCanvas: (id) => set(s => (
      s.canvases.some(c => c.id === id)
        ? {
          activeCanvasId: id,
          viewport: { panX: 0, panY: 0, zoom: 1 },
        }
        : s
    )),

    renameCanvas: (id, name) => set(s => mutateCanvasWithHistory(
      s,
      id,
      'canvas:rename',
      1_000,
      (canvas) => canvas.name === name
        ? canvas
        : { ...canvas, name: normalizeString(name, '', 180), updated: now() },
    )),

    // ─── Node CRUD ───

    addNode: (type, x, y) => {
      const nodeType = isNodeType(type) ? type : 'text'
      const sz = DEFAULT_NODE_SIZES[nodeType]
      const vp = normalizeViewport(get().viewport)
      // Place node near center of visible area if no position given
      const nx = x ?? (-vp.panX + 400) / vp.zoom + Math.random() * 40 - 20
      const ny = y ?? (-vp.panY + 300) / vp.zoom + Math.random() * 40 - 20
      const defaultProps: Partial<CanvasNode> = (() => {
        if (nodeType === 'checklist') return { items: [] }
        if (nodeType === 'code') return { content: '// code here...', codeLang: 'javascript' }
        if (nodeType === 'goal') return { status: 'todo', progress: 25, priority: 'mid', content: 'Worum geht es bei diesem Ziel?' }
        if (nodeType === 'milestone') return { status: 'todo', progress: 0, content: 'Definition of done, Scope, Deliverables' }
        if (nodeType === 'decision') return { status: 'todo', priority: 'mid', content: 'Option A vs Option B\nKriterien:\n- Impact\n- Risiko\n- Aufwand' }
        if (nodeType === 'risk') return { status: 'blocked', priority: 'high', content: 'Risiko:\nEintrittswahrscheinlichkeit:\nMitigation:' }
        if (nodeType === 'project') return { status: 'doing', progress: 10, priority: 'mid', content: 'Projektziel, Scope, Stakeholder, KPI' }
        return {}
      })()
      const node: CanvasNode = {
        id: genId(),
        type: nodeType,
        title: DEFAULT_NODE_TITLES[nodeType],
        x: nx,
        y: ny,
        width: sz.w,
        height: sz.h,
        nodeScale: 1,
        content: '',
        color: DEFAULT_NODE_COLORS[nodeType],
        ...defaultProps,
      }
      set(s => mutateCanvasWithHistory(
        s,
        s.activeCanvasId,
        'node:add',
        0,
        (canvas) => ({ ...canvas, nodes: [...canvas.nodes, node], updated: now() }),
      ))
    },

    updateNode: (id, p) => {
      enqueueNodePatch(set, get, id, p)
    },

    deleteNode: (id) => set(s => mutateCanvasWithHistory(
      s,
      s.activeCanvasId,
      'node:delete',
      0,
      (canvas) => canvas.nodes.some((node) => node.id === id)
        ? {
          ...canvas,
          nodes: canvas.nodes.filter(node => node.id !== id),
          connections: canvas.connections.filter(conn => conn.fromId !== id && conn.toId !== id),
          updated: now(),
        }
        : canvas,
    )),

    moveNode: (id, x, y) => set(s => mutateCanvasWithHistory(
      s,
      s.activeCanvasId,
      'nodes:move',
      HISTORY_COALESCE_MS,
      (canvas) => {
        const node = canvas.nodes.find(entry => entry.id === id)
        if (!node) return canvas
        const nextX = clampNumber(x, node.x, -100_000, 100_000)
        const nextY = clampNumber(y, node.y, -100_000, 100_000)
        if (nextX === node.x && nextY === node.y) return canvas
        return {
          ...canvas,
          nodes: canvas.nodes.map(entry => entry.id === id
            ? { ...entry, x: nextX, y: nextY }
            : entry),
          updated: now(),
        }
      },
    )),

    resizeNode: (id, width, height) => set(s => mutateCanvasWithHistory(
      s,
      s.activeCanvasId,
      'nodes:resize',
      HISTORY_COALESCE_MS,
      (canvas) => {
        const node = canvas.nodes.find(entry => entry.id === id)
        if (!node) return canvas
        const nextWidth = clampNumber(width, node.width, 120, 1_600)
        const nextHeight = clampNumber(height, node.height, 80, 1_400)
        if (nextWidth === node.width && nextHeight === node.height) return canvas
        return {
          ...canvas,
          nodes: canvas.nodes.map(entry => entry.id === id
            ? { ...entry, width: nextWidth, height: nextHeight }
            : entry),
          updated: now(),
        }
      },
    )),

    // ─── Connection CRUD ───

    addConnection: (fromId, toId) => {
      if (fromId === toId) return
      // Prevent duplicate connections
      const canvas = get().getActiveCanvas()
      if (!canvas) return
      const nodeIds = new Set(canvas.nodes.map((node) => node.id))
      if (!nodeIds.has(fromId) || !nodeIds.has(toId)) return
      if (canvas.connections.some(c => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId))) return

      const conn: CanvasConnection = { id: genId(), fromId, toId }
      set(s => mutateCanvasWithHistory(
        s,
        s.activeCanvasId,
        'connection:add',
        0,
        (current) => ({
          ...current,
          connections: [...current.connections, conn],
          updated: now(),
        }),
      ))
    },

    deleteConnection: (id) => set(s => mutateCanvasWithHistory(
      s,
      s.activeCanvasId,
      'connection:delete',
      0,
      (canvas) => canvas.connections.some(conn => conn.id === id)
        ? {
          ...canvas,
          connections: canvas.connections.filter(conn => conn.id !== id),
          updated: now(),
        }
        : canvas,
    )),

    updateConnection: (id, p) => set(s => mutateCanvasWithHistory(
      s,
      s.activeCanvasId,
      `connection:update:${id}`,
      HISTORY_COALESCE_MS,
      (canvas) => canvas.connections.some(conn => conn.id === id)
        ? {
          ...canvas,
          connections: canvas.connections.map(conn => conn.id === id ? { ...conn, ...p } : conn),
          updated: now(),
        }
        : canvas,
    )),

    // ─── Viewport ───

    setPan: (panX, panY) => set({
      viewport: normalizeViewport({
        ...get().viewport,
        panX,
        panY,
      }),
    }),
    setZoom: (zoom) => set({
      viewport: normalizeViewport({
        ...get().viewport,
        zoom,
      }),
    }),
    resetViewport: () => set({ viewport: { panX: 0, panY: 0, zoom: 1 } }),

    undo: () => {
      flushQueuedNodePatchesNow?.()
      set(state => {
        const canvasId = state.activeCanvasId
        if (!canvasId) return state
        const history = state.canvasHistory[canvasId]
        const current = state.canvases.find(canvas => canvas.id === canvasId)
        const previous = history?.past[history.past.length - 1]
        if (!current || !previous) return state
        const restored = sanitizeCanvasSnapshot(previous)
        const currentSnapshot = sanitizeCanvasSnapshot(current)
        if (!restored || !currentSnapshot) return state
        return {
          ...state,
          canvases: state.canvases.map(canvas => canvas.id === canvasId ? restored : canvas),
          canvasHistory: {
            ...state.canvasHistory,
            [canvasId]: {
              past: history.past.slice(0, -1),
              future: [currentSnapshot, ...history.future].slice(0, HISTORY_LIMIT),
              lastGroupKey: null,
              lastMutationAt: 0,
            },
          },
        }
      })
    },

    redo: () => {
      flushQueuedNodePatchesNow?.()
      set(state => {
        const canvasId = state.activeCanvasId
        if (!canvasId) return state
        const history = state.canvasHistory[canvasId]
        const current = state.canvases.find(canvas => canvas.id === canvasId)
        const next = history?.future[0]
        if (!current || !next) return state
        const restored = sanitizeCanvasSnapshot(next)
        const currentSnapshot = sanitizeCanvasSnapshot(current)
        if (!restored || !currentSnapshot) return state
        return {
          ...state,
          canvases: state.canvases.map(canvas => canvas.id === canvasId ? restored : canvas),
          canvasHistory: {
            ...state.canvasHistory,
            [canvasId]: {
              past: [...history.past, currentSnapshot].slice(-HISTORY_LIMIT),
              future: history.future.slice(1),
              lastGroupKey: null,
              lastMutationAt: 0,
            },
          },
        }
      })
    },

    // ─── Checklist Helpers ───

    addChecklistItem: (nodeId, text) => set(s => mutateCanvasWithHistory(
      s,
      s.activeCanvasId,
      'checklist:add',
      0,
      (canvas) => canvas.nodes.some(node => node.id === nodeId)
        ? {
          ...canvas,
          nodes: canvas.nodes.map(node => node.id === nodeId
            ? { ...node, items: [...(node.items || []), { id: genId(), text, done: false }] }
            : node),
          updated: now(),
        }
        : canvas,
    )),

    toggleChecklistItem: (nodeId, itemId) => set(s => mutateCanvasWithHistory(
      s,
      s.activeCanvasId,
      'checklist:toggle',
      0,
      (canvas) => canvas.nodes.some(node =>
        node.id === nodeId && (node.items || []).some(item => item.id === itemId))
        ? {
          ...canvas,
          nodes: canvas.nodes.map(node => node.id === nodeId
            ? { ...node, items: (node.items || []).map(item => item.id === itemId ? { ...item, done: !item.done } : item) }
            : node),
          updated: now(),
        }
        : canvas,
    )),

    deleteChecklistItem: (nodeId, itemId) => set(s => mutateCanvasWithHistory(
      s,
      s.activeCanvasId,
      'checklist:delete',
      0,
      (canvas) => canvas.nodes.some(node =>
        node.id === nodeId && (node.items || []).some(item => item.id === itemId))
        ? {
          ...canvas,
          nodes: canvas.nodes.map(node => node.id === nodeId
            ? { ...node, items: (node.items || []).filter(item => item.id !== itemId) }
            : node),
          updated: now(),
        }
        : canvas,
    )),

    // ─── Derived ───

    getActiveCanvas: () => get().canvases.find(c => c.id === get().activeCanvasId),

  }), {
    name: 'nx-canvas-v1',
    storage: createIndexedDbStorage<CanvasStore>({
      dbName: 'nexus-main-state-v1',
      storeName: 'persist',
      debounceMs: 4_200,
      idleTimeoutMs: 2_000,
      flushBudgetMs: 12,
      segmentStateKeys: ['canvases', 'activeCanvasId'],
    }),
    partialize: (state) => ({
      canvases: state.canvases,
      activeCanvasId: state.activeCanvasId,
    }),
    merge: (persistedState, currentState) => {
      const persisted = (persistedState || {}) as Partial<CanvasStore>
      const rawCanvases = (persisted as any).canvases
      const canvases = Array.isArray(rawCanvases)
        ? sanitizePersistedCanvases(rawCanvases)
        : currentState.canvases
      const preferredActive =
        typeof persisted.activeCanvasId === 'string' ? persisted.activeCanvasId : null
      const hasPreferredActive = preferredActive
        ? canvases.some((canvas) => canvas.id === preferredActive)
        : false
      return {
        ...currentState,
        ...persisted,
        canvases,
        canvasHistory: currentState.canvasHistory,
        activeCanvasId: hasPreferredActive
          ? preferredActive
          : (canvases[0]?.id ?? null),
        viewport: currentState.viewport,
      }
    },
  })
)
