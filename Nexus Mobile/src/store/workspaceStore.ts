import { createWithEqualityFn as create } from 'zustand/traditional'
import { persist } from 'zustand/middleware'

export interface Workspace {
  id: string
  name: string
  icon: string
  color: string
  description?: string
  created: string
  lastAccessed: string
  // IDs of items belonging to this workspace
  noteIds: string[]
  codeIds: string[]
  taskIds: string[]
  reminderIds: string[]
}

interface WorkspaceStore {
  workspaces: Workspace[]
  activeWorkspaceId: string | null

  addWorkspace: (name: string, icon: string, color: string, desc?: string) => Workspace
  updateWorkspace: (id: string, p: Partial<Workspace>) => void
  delWorkspace: (id: string) => void
  setActive: (id: string | null) => void
  addItemToWorkspace: (wsId: string, type: 'note' | 'code' | 'task' | 'reminder', itemId: string) => void
  removeItemFromWorkspace: (wsId: string, type: 'note' | 'code' | 'task' | 'reminder', itemId: string) => void
  getWorkspaceForItem: (type: 'note' | 'code' | 'task' | 'reminder', itemId: string) => Workspace | null
}

const now = () => new Date().toISOString()
const uid = () => Math.random().toString(36).slice(2, 10)

export const useWorkspaces = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaces: [
        {
          id: 'default',
          name: 'Personal',
          icon: '🏠',
          color: '#007AFF',
          description: 'Default workspace',
          created: now(),
          lastAccessed: now(),
          noteIds: [], codeIds: [], taskIds: [], reminderIds: [],
        },
      ],
      activeWorkspaceId: null,

      addWorkspace: (name, icon, color, desc) => {
        const ws: Workspace = {
          id: uid(), name, icon, color, description: desc,
          created: now(), lastAccessed: now(),
          noteIds: [], codeIds: [], taskIds: [], reminderIds: [],
        }
        set(s => ({ workspaces: [...s.workspaces, ws] }))
        return ws
      },

      updateWorkspace: (id, p) => set(s => ({
        workspaces: s.workspaces.map(w => w.id === id ? { ...w, ...p } : w),
      })),

      delWorkspace: (id) => {
        if (id === 'default') return
        set(s => ({
          workspaces: s.workspaces.filter(w => w.id !== id),
          activeWorkspaceId: s.activeWorkspaceId === id ? null : s.activeWorkspaceId,
        }))
      },

      setActive: (id) => {
        set(s => ({
          activeWorkspaceId: id,
          workspaces: id
            ? s.workspaces.map(w => w.id === id ? { ...w, lastAccessed: now() } : w)
            : s.workspaces,
        }))
      },

      addItemToWorkspace: (wsId, type, itemId) => {
        const key = `${type}Ids` as keyof Workspace
        set(s => ({
          workspaces: s.workspaces.map(w => {
            if (w.id !== wsId) return w
            const ids = (w[key] as string[])
            if (ids.includes(itemId)) return w
            return { ...w, [key]: [...ids, itemId] }
          }),
        }))
      },

      removeItemFromWorkspace: (wsId, type, itemId) => {
        const key = `${type}Ids` as keyof Workspace
        set(s => ({
          workspaces: s.workspaces.map(w => {
            if (w.id !== wsId) return w
            return { ...w, [key]: (w[key] as string[]).filter(id => id !== itemId) }
          }),
        }))
      },

      getWorkspaceForItem: (type, itemId) => {
        const key = `${type}Ids` as keyof Workspace
        return get().workspaces.find(w => (w[key] as string[]).includes(itemId)) ?? null
      },
    }),
    { name: 'nx-workspaces-v1' }
  )
)
