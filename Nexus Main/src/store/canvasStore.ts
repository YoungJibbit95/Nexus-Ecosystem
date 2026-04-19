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
          return { ...node, ...patch }
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
    .map((entry: any) => ({
      id: typeof entry.id === 'string' ? entry.id : genId(),
      name: typeof entry.name === 'string' ? entry.name : 'Canvas',
      nodes: Array.isArray(entry.nodes) ? entry.nodes : [],
      connections: Array.isArray(entry.connections) ? entry.connections : [],
      created: typeof entry.created === 'string' ? entry.created : now(),
      updated: typeof entry.updated === 'string' ? entry.updated : now(),
    }))
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

    setActiveCanvas: (id) => set({
      activeCanvasId: id,
      viewport: { panX: 0, panY: 0, zoom: 1 },
    }),

    renameCanvas: (id, name) => set(s => ({
      canvases: s.canvases.map(c =>
        c.id === id ? { ...c, name, updated: now() } : c
      ),
    })),

    // ─── Node CRUD ───

    addNode: (type, x, y) => {
      const sz = DEFAULT_NODE_SIZES[type]
      const vp = get().viewport
      // Place node near center of visible area if no position given
      const nx = x ?? (-vp.panX + 400) / vp.zoom + Math.random() * 40 - 20
      const ny = y ?? (-vp.panY + 300) / vp.zoom + Math.random() * 40 - 20
      const defaultProps: Partial<CanvasNode> = (() => {
        if (type === 'checklist') return { items: [] }
        if (type === 'code') return { content: '// code here...', codeLang: 'javascript' }
        if (type === 'goal') return { status: 'todo', progress: 25, priority: 'mid', content: 'Worum geht es bei diesem Ziel?' }
        if (type === 'milestone') return { status: 'todo', progress: 0, content: 'Definition of done, Scope, Deliverables' }
        if (type === 'decision') return { status: 'todo', priority: 'mid', content: 'Option A vs Option B\nKriterien:\n- Impact\n- Risiko\n- Aufwand' }
        if (type === 'risk') return { status: 'blocked', priority: 'high', content: 'Risiko:\nEintrittswahrscheinlichkeit:\nMitigation:' }
        if (type === 'project') return { status: 'doing', progress: 10, priority: 'mid', content: 'Projektziel, Scope, Stakeholder, KPI' }
        return {}
      })()
      const node: CanvasNode = {
        id: genId(),
        type,
        title: DEFAULT_NODE_TITLES[type],
        x: nx,
        y: ny,
        width: sz.w,
        height: sz.h,
        nodeScale: 1,
        content: '',
        color: DEFAULT_NODE_COLORS[type],
        ...defaultProps,
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
          ? { ...c, nodes: c.nodes.map(n => n.id === id ? { ...n, x, y } : n), updated: now() }
          : c
      ),
    })),

    resizeNode: (id, width, height) => set(s => ({
      canvases: s.canvases.map(c =>
        c.id === s.activeCanvasId
          ? { ...c, nodes: c.nodes.map(n => n.id === id ? { ...n, width: Math.max(160, width), height: Math.max(80, height) } : n), updated: now() }
          : c
      ),
    })),

    // ─── Connection CRUD ───

    addConnection: (fromId, toId) => {
      if (fromId === toId) return
      // Prevent duplicate connections
      const canvas = get().getActiveCanvas()
      if (!canvas) return
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

    setPan: (panX, panY) => set({ viewport: { ...get().viewport, panX, panY } }),
    setZoom: (zoom) => set({ viewport: { ...get().viewport, zoom: Math.max(0.15, Math.min(3, zoom)) } }),
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
      const canvases = sanitizePersistedCanvases((persisted as any).canvases)
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
