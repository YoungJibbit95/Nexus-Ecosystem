import { createWithEqualityFn as create } from 'zustand/traditional'
import { persist } from 'zustand/middleware'
import { genId } from '../lib/utils'
import { createIndexedDbStorage } from './persistence/indexedDbStorage'
import { createInitialAppData } from './appStoreInitialData'

/* ============================================================
   TYPES
============================================================ */

export type Note = {
  id: string
  title: string
  content: string
  tags: string[]
  created: string
  updated: string
  dirty: boolean
  backlinks?: string[]
  pinned?: boolean
  folderId?: string | null
}

export type CodeFile = {
  id: string
  name: string
  lang: string
  content: string
  dirty: boolean
  created: string
  updated: string
  lastSaved?: string
  readonly?: boolean
  pinned?: boolean
  folderId?: string | null
}

export type Task = {
  id: string
  title: string
  desc: string
  status: 'todo' | 'doing' | 'done'
  priority: 'low' | 'mid' | 'high'
  deadline?: string
  tags: string[]
  color?: string
  subtasks: { id: string; title: string; done: boolean }[]
  blocked?: boolean
  blockedReason?: string
  dependsOnTaskIds?: string[]
  linkedCanvasNodeId?: string
  created: string
  updated: string
  linkedNoteId?: string
  folderId?: string | null
  notes?: string
}

export type Reminder = {
  id: string
  title: string
  msg: string
  datetime: string
  repeat: 'none' | 'daily' | 'weekly' | 'monthly'
  done: boolean
  snoozeUntil?: string
  linkedNoteId?: string
  linkedTaskId?: string
  folderId?: string | null
  notes?: string
}

export type Activity = {
  id: string
  type: 'note' | 'code' | 'task' | 'reminder' | 'system'
  action: string
  targetName: string
  timestamp: string
  targetId?: string
  targetView?: 'notes' | 'code' | 'tasks' | 'reminders' | 'canvas' | 'files' | 'dashboard' | 'flux'
  workspaceId?: string | null
}

export type Folder = {
  id: string
  name: string
  parentId: string | null
  color?: string
  created: string
}

/* ============================================================
   STORE INTERFACE
============================================================ */

interface Store {
  notes: Note[]
  openNoteIds: string[]
  activeNoteId: string | null

  codes: CodeFile[]
  openCodeIds: string[]
  activeCodeId: string | null

  tasks: Task[]
  reminders: Reminder[]

  folders: Folder[]
  activities: Activity[]

  logActivity: (
    type: Activity['type'],
    action: string,
    targetName: string,
    meta?: Pick<Activity, 'targetId' | 'targetView' | 'workspaceId'>,
  ) => void

  // Notes
  addNote: () => void
  updateNote: (id: string, p: Partial<Note>) => void
  delNote: (id: string) => void
  setNote: (id: string) => void
  openNote: (id: string) => void
  closeNote: (id: string) => void
  saveNote: (id: string) => void
  safeCloseNote: (id: string) => void

  // Code
  addCode: (name?: string, lang?: string) => CodeFile
  updateCode: (id: string, p: Partial<CodeFile>) => void
  delCode: (id: string) => void
  setCode: (id: string) => void
  openCode: (id: string) => void
  closeCode: (id: string) => void
  saveCode: (id: string) => void
  safeCloseCode: (id: string) => void

  // Tasks
  addTask: (
    title: string,
    status: 'todo' | 'doing' | 'done',
    desc?: string,
    priority?: 'low' | 'mid' | 'high'
  ) => void
  updateTask: (id: string, p: Partial<Task>) => void
  delTask: (id: string) => void
  moveTask: (id: string, s: 'todo' | 'doing' | 'done') => void
  addSubtask: (taskId: string, title: string) => void
  toggleSubtask: (taskId: string, subtaskId: string) => void

  // Reminders
  addRem: (r: Omit<Reminder, 'id' | 'done'>) => void
  delRem: (id: string) => void
  doneRem: (id: string) => void
  snoozeRem: (id: string, minutes: number) => void
  updateReminder: (id: string, p: Partial<Reminder>) => void

  // Folders
  addFolder: (name: string, parentId?: string | null) => void
  updateFolder: (id: string, p: Partial<Folder>) => void
  delFolder: (id: string) => void

  // Derived
  getLinkedTask: (remId: string) => Task | null
  getActiveCode: () => CodeFile | undefined
  hasUnsavedChanges: () => boolean
}

/* ============================================================
   HELPERS
============================================================ */

const now = () => new Date().toISOString()
const INITIAL_APP_DATA = createInitialAppData(now)

/* ============================================================
   STORE
============================================================ */

export const useApp = create<Store>()(
  persist(
    (set, get) => ({
      /* ================= NOTES ================= */

      notes: INITIAL_APP_DATA.notes,
      openNoteIds: INITIAL_APP_DATA.openNoteIds,
      activeNoteId: INITIAL_APP_DATA.activeNoteId,

      folders: [],
      activities: [],

      logActivity: (type, action, targetName, meta) => set(s => ({
        activities: [{
          id: genId(),
          type,
          action,
          targetName,
          timestamp: now(),
          targetId: meta?.targetId,
          targetView: meta?.targetView,
          workspaceId: meta?.workspaceId ?? null,
        }, ...s.activities].slice(0, 120)
      })),



      addNote: () =>
        set(s => {
          const n: Note = {
            id: genId(),
            title: 'Untitled',
            content: '# Untitled\n\n',
            tags: [],
            created: now(),
            updated: now(),
            dirty: false
          }
          get().logActivity('note', 'created', n.title, { targetId: n.id, targetView: 'notes' })
          return {
            notes: [n, ...s.notes],
            openNoteIds: [n.id, ...s.openNoteIds],
            activeNoteId: n.id
          }
        }),

      updateNote: (id, p) =>
        set(s => {
          const idx = s.notes.findIndex(n => n.id === id)
          if (idx === -1) return s
          const current = s.notes[idx]
          const next = { ...current, ...p, updated: now(), dirty: true }
          const notes = s.notes.slice()
          notes[idx] = next
          return { notes }
        }),

      delNote: id =>
        set(s => {
          const open = s.openNoteIds.filter(n => n !== id)
          return {
            notes: s.notes.filter(n => n.id !== id),
            openNoteIds: open,
            activeNoteId:
              s.activeNoteId === id ? open[0] ?? null : s.activeNoteId
          }
        }),

      setNote: id => set({ activeNoteId: id }),

      openNote: id =>
        set(s => ({
          openNoteIds: s.openNoteIds.includes(id)
            ? s.openNoteIds
            : [...s.openNoteIds, id],
          activeNoteId: id
        })),

      closeNote: id =>
        set(s => {
          const open = s.openNoteIds.filter(n => n !== id)
          return {
            openNoteIds: open,
            activeNoteId:
              s.activeNoteId === id ? open[0] ?? null : s.activeNoteId
          }
        }),

      saveNote: id =>
        set(s => {
          const idx = s.notes.findIndex(n => n.id === id)
          if (idx === -1) return s
          const current = s.notes[idx]
          const notes = s.notes.slice()
          notes[idx] = { ...current, dirty: false, updated: now() }
          return { notes }
        }),

      safeCloseNote: id => {
        const note = get().notes.find(n => n.id === id)
        if (!note) return
        if (note.dirty && !confirm('Unsaved changes. Close anyway?')) return
        get().closeNote(id)
      },

      /* ================= CODE ================= */

      codes: INITIAL_APP_DATA.codes,
      openCodeIds: INITIAL_APP_DATA.openCodeIds,
      activeCodeId: INITIAL_APP_DATA.activeCodeId,

      addCode: (name = 'untitled.txt', lang = 'plaintext') => {
        const file: CodeFile = {
          id: genId(),
          name,
          lang,
          content: '',
          dirty: false,
          created: now(),
          updated: now(),
          lastSaved: now()
        }

        get().logActivity('code', 'created', file.name, { targetId: file.id, targetView: 'code' })
        set(s => ({
          codes: [file, ...s.codes],
          openCodeIds: [file.id, ...s.openCodeIds],
          activeCodeId: file.id
        }))

        return file
      },

      updateCode: (id, p) =>
        set(s => {
          const idx = s.codes.findIndex(c => c.id === id)
          if (idx === -1) return s
          const current = s.codes[idx]
          const codes = s.codes.slice()
          codes[idx] = {
            ...current,
            ...p,
            updated: now(),
            dirty:
              Object.prototype.hasOwnProperty.call(p, 'dirty')
                ? p.dirty!
                : true
          }
          return { codes }
        }),

      delCode: id =>
        set(s => {
          const open = s.openCodeIds.filter(c => c !== id)
          return {
            codes: s.codes.filter(c => c.id !== id),
            openCodeIds: open,
            activeCodeId:
              s.activeCodeId === id ? open[0] ?? null : s.activeCodeId
          }
        }),

      setCode: id => set({ activeCodeId: id }),

      openCode: id =>
        set(s => ({
          openCodeIds: s.openCodeIds.includes(id)
            ? s.openCodeIds
            : [...s.openCodeIds, id],
          activeCodeId: id
        })),

      closeCode: id =>
        set(s => {
          const open = s.openCodeIds.filter(c => c !== id)
          return {
            openCodeIds: open,
            activeCodeId:
              s.activeCodeId === id ? open[0] ?? null : s.activeCodeId
          }
        }),

      saveCode: id =>
        set(s => {
          const idx = s.codes.findIndex(c => c.id === id)
          if (idx === -1) return s
          const current = s.codes[idx]
          const codes = s.codes.slice()
          codes[idx] = { ...current, dirty: false, lastSaved: now() }
          return { codes }
        }),

      safeCloseCode: id => {
        const file = get().codes.find(c => c.id === id)
        if (!file) return
        if (file.dirty && !confirm('Unsaved changes. Close anyway?')) return
        get().closeCode(id)
      },

      /* ================= TASKS ================= */

      tasks: INITIAL_APP_DATA.tasks,

      addTask: (title, status, desc = '', priority = 'mid') => {
        const t: Task = {
          id: genId(),
          title,
          desc,
          status,
          priority,
          tags: [],
          subtasks: [],
          blocked: false,
          dependsOnTaskIds: [],
          created: now(),
          updated: now()
        }
        get().logActivity('task', 'created', t.title, { targetId: t.id, targetView: 'tasks' })
        set(s => ({
          tasks: [t, ...s.tasks]
        }))
      },

      updateTask: (id, p) =>
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === id ? { ...t, ...p, updated: now() } : t
          )
        })),

      delTask: id =>
        set(s => ({
          tasks: s.tasks.filter(t => t.id !== id)
        })),

      moveTask: (id, status) => {
        const current = get().tasks.find((task) => task.id === id)
        if (current && current.status !== status) {
          get().logActivity('task', `status:${current.status}->${status}`, current.title, {
            targetId: current.id,
            targetView: 'tasks',
          })
        }
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === id ? { ...t, status, updated: now() } : t
          )
        }))
      },

      addSubtask: (taskId, title) =>
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === taskId
              ? {
                ...t,
                subtasks: [
                  ...t.subtasks,
                  { id: genId(), title, done: false }
                ]
              }
              : t
          )
        })),

      toggleSubtask: (taskId, subtaskId) =>
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === taskId
              ? {
                ...t,
                subtasks: t.subtasks.map(st =>
                  st.id === subtaskId
                    ? { ...st, done: !st.done }
                    : st
                )
              }
              : t
          )
        })),

      /* ================= REMINDERS ================= */

      reminders: INITIAL_APP_DATA.reminders,

      addRem: r =>
        set(s => {
          const reminder: Reminder = { ...r, id: genId(), done: false }
          get().logActivity('reminder', 'created', reminder.title, { targetId: reminder.id, targetView: 'reminders' })
          return {
            reminders: [
              ...s.reminders,
              reminder,
            ]
          }
        }),

      delRem: id =>
        set(s => ({
          reminders: s.reminders.filter(r => r.id !== id)
        })),

      doneRem: id =>
        set(s => {
          const current = s.reminders.find((reminder) => reminder.id === id)
          if (!current) return s
          get().logActivity('reminder', 'completed', current.title, { targetId: current.id, targetView: 'reminders' })
          return {
            reminders: s.reminders.map(r =>
              r.id === id ? { ...r, done: true } : r
            )
          }
        }),

      snoozeRem: (id, minutes) => {
        const snoozeUntil = new Date(
          Date.now() + minutes * 60000
        ).toISOString()

        set(s => ({
          reminders: s.reminders.map(r =>
            r.id === id ? { ...r, snoozeUntil } : r
          )
        }))
      },

      updateReminder: (id, p) =>
        set(s => ({
          reminders: s.reminders.map(r =>
            r.id === id ? { ...r, ...p } : r
          )
        })),

      /* ================= FOLDERS ================= */

      addFolder: (name, parentId = null) => set(s => ({
        folders: [{ id: genId(), name, parentId, created: now() }, ...s.folders]
      })),

      updateFolder: (id, p) => set(s => ({
        folders: s.folders.map(f => f.id === id ? { ...f, ...p } : f)
      })),

      delFolder: id => set(s => {
        // When deleting a folder, we dissociating files (move to root) 
        // Or we could delete them? Moving to root is safer.
        return {
          folders: s.folders.filter(f => f.id !== id),
          notes: s.notes.map(n => n.folderId === id ? { ...n, folderId: null } : n),
          codes: s.codes.map(c => c.folderId === id ? { ...c, folderId: null } : c),
          tasks: s.tasks.map(t => t.folderId === id ? { ...t, folderId: null } : t),
          reminders: s.reminders.map(r => r.folderId === id ? { ...r, folderId: null } : r)
        }
      }),

      /* ================= DERIVED ================= */

      getLinkedTask: remId => {
        const rem = get().reminders.find(r => r.id === remId)
        if (!rem?.linkedTaskId) return null
        return (
          get().tasks.find(t => t.id === rem.linkedTaskId) ??
          null
        )
      },

      getActiveCode: () =>
        get().codes.find(c => c.id === get().activeCodeId),

      hasUnsavedChanges: () =>
        get().notes.some(n => n.dirty) ||
        get().codes.some(c => c.dirty)
    }),
    {
      name: 'nx-app-v3',
      storage: createIndexedDbStorage<Store>({
        dbName: 'nexus-main-state-v1',
        storeName: 'persist',
        debounceMs: 3_600,
        idleTimeoutMs: 1_800,
        flushBudgetMs: 12,
        segmentStateKeys: [
          'notes',
          'openNoteIds',
          'activeNoteId',
          'codes',
          'openCodeIds',
          'activeCodeId',
          'tasks',
          'reminders',
          'folders',
          'activities',
        ],
      }),
      partialize: (state) => ({
        notes: state.notes,
        openNoteIds: state.openNoteIds,
        activeNoteId: state.activeNoteId,
        codes: state.codes,
        openCodeIds: state.openCodeIds,
        activeCodeId: state.activeCodeId,
        tasks: state.tasks,
        reminders: state.reminders,
        folders: state.folders,
        activities: state.activities,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<Store>),
      }),
    }
  )
)
