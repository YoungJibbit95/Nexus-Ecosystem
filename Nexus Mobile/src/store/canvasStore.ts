import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { genId } from '../lib/utils'

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

// ─── STORE ───

export const useCanvas = create<CanvasStore>()(
  persist((set, get) => ({

    canvases: [],
    activeCanvasId: null,
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
        if (type === 'goal') return { content: 'Worum geht es bei diesem Ziel?' }
        if (type === 'milestone') return { content: 'Definition of done, Scope, Deliverables' }
        if (type === 'decision') return { content: 'Option A vs Option B\nKriterien:\n- Impact\n- Risiko\n- Aufwand' }
        if (type === 'risk') return { content: 'Risiko:\nEintrittswahrscheinlichkeit:\nMitigation:' }
        if (type === 'project') return { content: 'Projektziel, Scope, Stakeholder, KPI' }
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
        content: '',
        ...defaultProps,
        pm: {
          status: type === 'task' || type === 'goal' || type === 'milestone' || type === 'decision' || type === 'project'
            ? 'todo'
            : type === 'risk'
              ? 'blocked'
              : 'idea',
          priority: 'mid',
          progress: type === 'task' || type === 'goal' || type === 'project' ? 0 : undefined,
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

    updateNode: (id, p) => set(s => ({
      canvases: s.canvases.map(c =>
        c.id === s.activeCanvasId
          ? { ...c, nodes: c.nodes.map(n => n.id === id ? { ...n, ...p } : n), updated: now() }
          : c
      ),
    })),

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

  }), { name: 'nx-canvas-v1' })
)
