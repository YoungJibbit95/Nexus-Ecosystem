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
export type ProjectStatus = 'idea' | 'backlog' | 'todo' | 'doing' | 'review' | 'done' | 'blocked'
export type ProjectPriority = 'low' | 'mid' | 'high' | 'critical'

export interface CanvasProjectMeta {
  status?: ProjectStatus
  priority?: ProjectPriority
  owner?: string
  dueDate?: string
  estimate?: number
  progress?: number
  tags?: string[]
  milestone?: string
  blockedReason?: string
}

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
  pm?: CanvasProjectMeta
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

// ─── STORE INTERFACE ───

interface CanvasStore {
  canvases: Canvas[]
  activeCanvasId: string | null
  viewport: Viewport

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

  // Checklist helpers
  addChecklistItem: (nodeId: string, text: string) => void
  toggleChecklistItem: (nodeId: string, itemId: string) => void
  deleteChecklistItem: (nodeId: string, itemId: string) => void

  // Derived
  getActiveCanvas: () => Canvas | undefined
}

const now = () => new Date().toISOString()

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

const VALID_PROJECT_STATUSES = new Set<ProjectStatus>([
  'idea',
  'backlog',
  'todo',
  'doing',
  'review',
  'done',
  'blocked',
])
const VALID_PROJECT_PRIORITIES = new Set<ProjectPriority>(['low', 'mid', 'high', 'critical'])

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

const normalizeProjectMeta = (value: unknown): CanvasProjectMeta | undefined => {
  if (!isRecord(value)) return undefined
  const meta: CanvasProjectMeta = {}
  if (VALID_PROJECT_STATUSES.has(value.status as ProjectStatus)) {
    meta.status = value.status as ProjectStatus
  }
  if (VALID_PROJECT_PRIORITIES.has(value.priority as ProjectPriority)) {
    meta.priority = value.priority as ProjectPriority
  }
  if (typeof value.owner === 'string') meta.owner = normalizeString(value.owner, '', 120)
  if (typeof value.dueDate === 'string') meta.dueDate = value.dueDate
  if (value.estimate != null) meta.estimate = clampNumber(value.estimate, 0, 0, 10_000)
  if (value.progress != null) meta.progress = clampNumber(value.progress, 0, 0, 100)
  const tags = normalizeTags(value.tags)
  if (tags) meta.tags = tags
  if (typeof value.milestone === 'string') meta.milestone = normalizeString(value.milestone, '', 160)
  if (typeof value.blockedReason === 'string') {
    meta.blockedReason = normalizeString(value.blockedReason, '', 1_000)
  }
  return Object.keys(meta).length > 0 ? meta : undefined
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
  const pm = normalizeProjectMeta(value.pm)
  if (pm) node.pm = pm
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

type QueuedNodePatch = {
  canvasId: string
  nodeId: string
  patch: Partial<CanvasNode>
}

const queuedNodePatches = new Map<string, QueuedNodePatch>()
let queuedNodePatchHandle: number | null = null

const scheduleQueuedNodePatchFlush = (set: (updater: (state: CanvasStore) => CanvasStore) => void) => {
  if (queuedNodePatchHandle !== null) return

  const flush = () => {
    queuedNodePatchHandle = null
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

      const nextCanvases = state.canvases.slice()
      let changed = false
      for (let i = 0; i < nextCanvases.length; i += 1) {
        const canvas = nextCanvases[i]
        const patchByNode = patchByCanvas.get(canvas.id)
        if (!patchByNode || patchByNode.size === 0) continue
        let canvasChanged = false
        const nextNodes = canvas.nodes.map((node) => {
          const patch = patchByNode.get(node.id)
          if (!patch) return node
          canvasChanged = true
          return normalizeCanvasNode({ ...node, ...patch }) ?? node
        })
        if (!canvasChanged) continue
        nextCanvases[i] = { ...canvas, nodes: nextNodes, updated: now() }
        changed = true
      }

      if (!changed) return state
      return {
        ...state,
        canvases: nextCanvases,
      }
    })
  }

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

const resolveCanvasNodeScale = (): number => {
  if (typeof window === 'undefined') return 1
  const edge = Math.min(
    Math.max(280, Math.round(window.innerWidth || 0)),
    Math.max(280, Math.round(window.innerHeight || 0)),
  )
  if (edge <= 340) return 0.64
  if (edge <= 390) return 0.72
  if (edge <= 430) return 0.78
  if (edge <= 480) return 0.84
  if (edge <= 560) return 0.9
  return 1
}

const scaleCanvasDimension = (value: number, scale: number, minValue: number) =>
  Math.max(minValue, Math.round(value * scale))

const resolveNodeSizeForViewport = (type: NodeType): { w: number; h: number } => {
  const base = DEFAULT_NODE_SIZES[type]
  const scale = resolveCanvasNodeScale()
  if (scale >= 0.99) return base
  return {
    w: scaleCanvasDimension(base.w, scale, 180),
    h: scaleCanvasDimension(base.h, scale, 120),
  }
}

const resolveViewportCenter = (viewport: Viewport) => {
  const fallbackW = typeof window === 'undefined' ? 800 : Math.max(320, Math.round(window.innerWidth || 800))
  const fallbackH = typeof window === 'undefined' ? 600 : Math.max(280, Math.round(window.innerHeight || 600))
  return {
    x: (-viewport.panX + fallbackW * 0.5) / Math.max(0.0001, viewport.zoom),
    y: (-viewport.panY + fallbackH * 0.44) / Math.max(0.0001, viewport.zoom),
  }
}

const scaleDefaultCanvasNode = <T extends CanvasNode>(node: T): T => {
  const scale = resolveCanvasNodeScale()
  if (scale >= 0.99) return node
  return {
    ...node,
    x: Math.round(node.x * scale),
    y: Math.round(node.y * scale),
    width: scaleCanvasDimension(node.width, scale, 180),
    height: scaleCanvasDimension(node.height, scale, 120),
  }
}

const buildDefaultCanvas = (): Canvas => {
  const defaultNodes: CanvasNode[] = [
    {
      id: 'canvas-node-project',
      type: 'project',
      title: 'Nexus Workspace Setup',
      x: 120,
      y: 80,
      width: 380,
      height: 260,
      color: '#5E5CE6',
      pm: {
        status: 'doing',
        priority: 'high',
        progress: 36,
        owner: 'you',
        dueDate: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10),
      },
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
      pm: {
        status: 'blocked',
        priority: 'critical',
      },
      content:
        '```nexus-alert\nwarning\nLag im Built-Modus immer mit Profiling prüfen (TTI, Input Delay, View Switch).\n```',
    },
  ]
  return {
  id: 'canvas-welcome',
  name: '🚀 Nexus Canvas Walkthrough',
  created: now(),
  updated: now(),
  nodes: defaultNodes.map((node) => scaleDefaultCanvasNode(node)),
  connections: [
    { id: 'conn-1', fromId: 'canvas-node-project', toId: 'canvas-node-note' },
    { id: 'conn-2', fromId: 'canvas-node-project', toId: 'canvas-node-checklist' },
    { id: 'conn-3', fromId: 'canvas-node-project', toId: 'canvas-node-risk' },
  ],
  }
}

// ─── STORE ───

export const useCanvas = create<CanvasStore>()(
  persist((set, get) => ({

    canvases: [buildDefaultCanvas()],
    activeCanvasId: 'canvas-welcome',
    viewport: { panX: 0, panY: 0, zoom: 1 },

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
      return {
        canvases: remaining,
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

    renameCanvas: (id, name) => set(s => ({
      canvases: s.canvases.map(c =>
        c.id === id ? { ...c, name, updated: now() } : c
      ),
    })),

    // ─── Node CRUD ───

    addNode: (type, x, y) => {
      const nodeType = isNodeType(type) ? type : 'text'
      const sz = resolveNodeSizeForViewport(nodeType)
      const vp = normalizeViewport(get().viewport)
      // Place node near center of visible area if no position given
      const center = resolveViewportCenter(vp)
      const nx = x ?? center.x + Math.random() * 36 - 18
      const ny = y ?? center.y + Math.random() * 36 - 18
      const defaultProps: Partial<CanvasNode> = (() => {
        if (nodeType === 'checklist') return { items: [] }
        if (nodeType === 'code') return { content: '// code here...', codeLang: 'javascript' }
        if (nodeType === 'goal') return { content: 'Worum geht es bei diesem Ziel?' }
        if (nodeType === 'milestone') return { content: 'Definition of done, Scope, Deliverables' }
        if (nodeType === 'decision') return { content: 'Option A vs Option B\nKriterien:\n- Impact\n- Risiko\n- Aufwand' }
        if (nodeType === 'risk') return { content: 'Risiko:\nEintrittswahrscheinlichkeit:\nMitigation:' }
        if (nodeType === 'project') return { content: 'Projektziel, Scope, Stakeholder, KPI' }
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
        pm: {
          status: nodeType === 'task' || nodeType === 'goal' || nodeType === 'milestone' || nodeType === 'decision' || nodeType === 'project'
            ? 'todo'
            : nodeType === 'risk'
              ? 'blocked'
              : 'idea',
          priority: 'mid',
          progress: nodeType === 'task' || nodeType === 'goal' || nodeType === 'project' ? 0 : undefined,
          tags: [],
        },
      }
      set(s => ({
        canvases: s.canvases.map(c =>
          c.id === s.activeCanvasId
            ? { ...c, nodes: [...c.nodes, node], updated: now() }
            : c
        ),
      }))
    },

    updateNode: (id, p) => {
      enqueueNodePatch(set, get, id, p)
    },

    deleteNode: (id) => set(s => ({
      canvases: s.canvases.map(c =>
        c.id === s.activeCanvasId
          ? {
            ...c,
            nodes: c.nodes.filter(n => n.id !== id),
            connections: c.connections.filter(cn => cn.fromId !== id && cn.toId !== id),
            updated: now(),
          }
          : c
      ),
    })),

    moveNode: (id, x, y) => set(s => ({
      canvases: s.canvases.map(c =>
        c.id === s.activeCanvasId
          ? {
            ...c,
            nodes: c.nodes.map(n =>
              n.id === id
                ? {
                  ...n,
                  x: clampNumber(x, n.x, -100_000, 100_000),
                  y: clampNumber(y, n.y, -100_000, 100_000),
                }
                : n
            ),
            updated: now(),
          }
          : c
      ),
    })),

    resizeNode: (id, width, height) => set(s => ({
      canvases: s.canvases.map(c =>
        c.id === s.activeCanvasId
          ? {
            ...c,
            nodes: c.nodes.map(n =>
              n.id === id
                ? {
                  ...n,
                  width: clampNumber(width, n.width, 120, 1_600),
                  height: clampNumber(height, n.height, 80, 1_400),
                }
                : n
            ),
            updated: now(),
          }
          : c
      ),
    })),

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
      set(s => ({
        canvases: s.canvases.map(c =>
          c.id === s.activeCanvasId
            ? { ...c, connections: [...c.connections, conn], updated: now() }
            : c
        ),
      }))
    },

    deleteConnection: (id) => set(s => ({
      canvases: s.canvases.map(c =>
        c.id === s.activeCanvasId
          ? { ...c, connections: c.connections.filter(cn => cn.id !== id), updated: now() }
          : c
      ),
    })),

    updateConnection: (id, p) => set(s => ({
      canvases: s.canvases.map(c =>
        c.id === s.activeCanvasId
          ? { ...c, connections: c.connections.map(cn => cn.id === id ? { ...cn, ...p } : cn), updated: now() }
          : c
      ),
    })),

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

    // ─── Checklist Helpers ───

    addChecklistItem: (nodeId, text) => set(s => ({
      canvases: s.canvases.map(c =>
        c.id === s.activeCanvasId
          ? {
            ...c,
            nodes: c.nodes.map(n =>
              n.id === nodeId
                ? { ...n, items: [...(n.items || []), { id: genId(), text, done: false }] }
                : n
            ),
            updated: now(),
          }
          : c
      ),
    })),

    toggleChecklistItem: (nodeId, itemId) => set(s => ({
      canvases: s.canvases.map(c =>
        c.id === s.activeCanvasId
          ? {
            ...c,
            nodes: c.nodes.map(n =>
              n.id === nodeId
                ? { ...n, items: (n.items || []).map(i => i.id === itemId ? { ...i, done: !i.done } : i) }
                : n
            ),
            updated: now(),
          }
          : c
      ),
    })),

    deleteChecklistItem: (nodeId, itemId) => set(s => ({
      canvases: s.canvases.map(c =>
        c.id === s.activeCanvasId
          ? {
            ...c,
            nodes: c.nodes.map(n =>
              n.id === nodeId
                ? { ...n, items: (n.items || []).filter(i => i.id !== itemId) }
                : n
            ),
            updated: now(),
          }
          : c
      ),
    })),

    // ─── Derived ───

    getActiveCanvas: () => get().canvases.find(c => c.id === get().activeCanvasId),

  }), {
    name: 'nx-canvas-v1',
    storage: createIndexedDbStorage<CanvasStore>({
      dbName: 'nexus-mobile-state-v1',
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
        activeCanvasId: hasPreferredActive
          ? preferredActive
          : (canvases[0]?.id ?? null),
        viewport: currentState.viewport,
      }
    },
  })
)
