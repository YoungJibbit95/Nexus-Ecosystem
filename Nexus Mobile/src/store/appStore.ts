import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { genId } from '../lib/utils'

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
}

export type Folder = {
  id: string
  name: string
  parentId: string | null
  color?: string
  created: string
}

export type DashboardWidgetId =
  | 'stats'
  | 'quick'
  | 'tasks'
  | 'reminders'
  | 'notes'
  | 'activity'
  | 'chart'
  | 'calendar'

export type DashboardWidget = {
  id: DashboardWidgetId
  label: string
  icon: string
  span: 1 | 2
  visible: boolean
  order: number
}

const DEFAULT_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'stats', label: 'Stats', icon: '📊', span: 2, visible: true, order: 0 },
  { id: 'quick', label: 'Quick Actions', icon: '⚡', span: 2, visible: true, order: 1 },
  { id: 'tasks', label: 'Tasks', icon: '✅', span: 1, visible: true, order: 2 },
  { id: 'reminders', label: 'Reminders', icon: '🔔', span: 1, visible: true, order: 3 },
  { id: 'notes', label: 'Recent Notes', icon: '📝', span: 1, visible: true, order: 4 },
  { id: 'activity', label: 'Activity', icon: '⚡', span: 1, visible: true, order: 5 },
  { id: 'chart', label: 'Progress', icon: '📈', span: 2, visible: false, order: 6 },
  { id: 'calendar', label: 'Calendar', icon: '📅', span: 1, visible: false, order: 7 },
]

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
  dashboardWidgets: DashboardWidget[]

  logActivity: (type: Activity['type'], action: string, targetName: string) => void
  setDashboardWidgets: (widgets: DashboardWidget[]) => void
  resetDashboardWidgets: () => void

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

/* ============================================================
   STORE
============================================================ */

export const useApp = create<Store>()(
  persist(
    (set, get) => ({
      /* ================= NOTES ================= */

      notes: [{
        id: 'w',
        title: '👋 Willkommen bei Nexus',
        content:
          '# 👋 Willkommen bei Nexus\n' +
          '___\n' +
          '\n' +
          '> Warum fünf verschiedene Apps jonglieren, wenn eine alles kann?\n' +
          '\n' +
          'Nexus wurde entwickelt, um deinen gesamten Workflow in einer einzigen, klaren Umgebung zu bündeln – ohne Chaos, ohne Kontextwechsel, ohne unnötige Reibung.\n' +
          '\n' +
          '---\n' +
          '\n' +
          '## ❓ Was ist Nexus?\n' +
          '\n' +
          'Nexus ist eine modulare Productivity-Suite, die Struktur, Kreativität und Technik in einem System vereint.\n' +
          '\n' +
          '### 🎯 Die Idee dahinter\n' +
          '\n' +
          'Produktivität bedeutet nicht „mehr machen“.\n' +
          'Produktivität bedeutet **klar denken, schnell handeln, organisiert bleiben**.\n' +
          '\n' +
          'Nexus gibt dir dafür die Werkzeuge.\n' +
          '\n' +
          '---\n' +
          '\n' +
          '## 🚀 Wofür kannst du Nexus nutzen?\n' +
          '\n' +
          'Egal ob du …\n' +
          '\n' +
          '- 📂 Projekte planst\n' +
          '- 📝 strukturierte Notizen schreibst\n' +
          '- 💡 brainstormst oder Ideen sammelst\n' +
          '- 💻 Code entwickelst und testest\n' +
          '- ⏰ Erinnerungen verwaltest\n' +
          '- 🧠 komplexe Zusammenhänge visualisierst\n' +
          '\n' +
          '**Nexus passt sich deinem Workflow an – nicht andersherum.**\n' +
          '\n' +
          '---\n' +
          '\n' +
          '# ⚙️ Features? Mehr als genug.\n' +
          '___\n' +
          '\n' +
          '## 🔷 Canvas View\n' +
          'Infinite Canvas mit Pan & Zoom.\n' +
          'Erstelle visuelle Strukturen mit Widgets, verbinde Elemente und denke frei – ohne Grenzen.\n' +
          '\n' +
          '## 📝 Notes View\n' +
          'Markdown-Editor mit Toolbar, Split-View, Pinning, Volltextsuche und Tag-System.\n' +
          'Schnell schreiben. Klar strukturieren. Sofort wiederfinden.\n' +
          '\n' +
          '## 💻 Code Editor\n' +
          'Monaco-basiert mit Projekt-Sidebar und integrierter REPL für JS/TS sowie Python (Pyodide).\n' +
          'Schreiben. Testen. Iterieren – direkt in Nexus.\n' +
          '\n' +
          '## 🔔 Reminders\n' +
          'Intelligente Erinnerungen mit Toasts, Audio, Snooze-Funktion, Wiederholungen und Überfällig-Markierung.\n' +
          '\n' +
          '## ⚙️ Settings & Visual Engine\n' +
          'Theme-Presets, Typografie, Glow-System, Glassmorphism, Blur-Optionen und individuelle Farbgestaltung.\n' +
          '\n' +
          '---\n' +
          '\n' +
          '## 🔥 Weitere Highlights\n' +
          '\n' +
          '- 💾 **Autosave** – Deine Arbeit wird automatisch gespeichert\n' +
          '- 📑 **Tab Management** – Schnelle Navigation zwischen Modulen\n' +
          '- 🔗 **Backlinks & Connections** – Verknüpfe Notizen, Canvas-Elemente und Tasks intelligent\n' +
          '- 🎨 **Custom Gradients & Glow Control** – Visuelle Anpassung bis ins Detail\n' +
          '\n' +
          '---\n' +
          '\n' +
          '## 💡 Warum Nexus?\n' +
          '\n' +
          'Weil Produktivität nicht fragmentiert sein sollte.\n' +
          'Weil dein Workflow fließen sollte.\n' +
          'Weil Fokus wichtiger ist als Feature-Overload.\n' +
          '\n' +
          '---\n' +
          '\n' +
          '## Willkommen in deinem neuen Arbeitsraum.\n' +
          '\n' +
          '**Genieße dein produktiveres Setup mit Nexus.** 🚀\n',
        tags: ['welcome'],
        created: now(),
        updated: now(),
        dirty: false,
      }],

      openNoteIds: ['w'],
      activeNoteId: 'w',

      folders: [],
      activities: [],
      dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,

      logActivity: (type, action, targetName) => set(s => ({
        activities: [{ id: genId(), type, action, targetName, timestamp: now() }, ...s.activities].slice(0, 100)
      })),
      setDashboardWidgets: (widgets) => set({ dashboardWidgets: widgets }),
      resetDashboardWidgets: () => set({ dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS }),



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
          get().logActivity('note', 'created', n.title)
          return {
            notes: [n, ...s.notes],
            openNoteIds: [n.id, ...s.openNoteIds],
            activeNoteId: n.id
          }
        }),

      updateNote: (id, p) =>
        set(s => ({
          notes: s.notes.map(n =>
            n.id === id
              ? { ...n, ...p, updated: now(), dirty: true }
              : n
          )
        })),

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
        set(s => ({
          notes: s.notes.map(n =>
            n.id === id
              ? { ...n, dirty: false, updated: now() }
              : n
          )
        })),

      safeCloseNote: id => {
        const note = get().notes.find(n => n.id === id)
        if (!note) return
        if (note.dirty && !confirm('Unsaved changes. Close anyway?')) return
        get().closeNote(id)
      },

      /* ================= CODE ================= */

      codes: [{
        id: 'e',
        name: 'example.py',
        lang: 'python',
        content:
          '# Nexus Python Sandbox 🚀\n' +
          '\n' +
          'print("Nexus Python Environment Ready")\n' +
          '\n' +
          '# -----------------------------\n' +
          '# Data Model\n' +
          '# -----------------------------\n' +
          'class Project:\n' +
          '    def __init__(self, name: str, priority: int):\n' +
          '        self.name = name\n' +
          '        self.priority = priority\n' +
          '        self.completed = False\n' +
          '\n' +
          '    def complete(self):\n' +
          '        self.completed = True\n' +
          '\n' +
          '    def __repr__(self):\n' +
          '        status = "✔" if self.completed else "✘"\n' +
          '        return f"{self.name} (Priority: {self.priority}) [{status}]"\n' +
          '\n' +
          '# -----------------------------\n' +
          '# State\n' +
          '# -----------------------------\n' +
          'projects = []\n' +
          '\n' +
          'def add_project(name: str, priority: int):\n' +
          '    p = Project(name, priority)\n' +
          '    projects.append(p)\n' +
          '    return p\n' +
          '\n' +
          'def list_projects():\n' +
          '    print("\\nCurrent Projects:")\n' +
          '    for p in sorted(projects, key=lambda x: x.priority):\n' +
          '        print(p)\n' +
          '\n' +
          '# -----------------------------\n' +
          '# Functional Example\n' +
          '# -----------------------------\n' +
          'def priority_summary():\n' +
          '    return {p.name: p.priority for p in projects}\n' +
          '\n' +
          '# -----------------------------\n' +
          '# Async Example (Pyodide Safe)\n' +
          '# -----------------------------\n' +
          'import asyncio\n' +
          '\n' +
          'async def simulate_deploy():\n' +
          '    print("\\nDeploying...")\n' +
          '    await asyncio.sleep(0.5)\n' +
          '    print("Deployment finished.")\n' +
          '\n' +
          '# -----------------------------\n' +
          '# Demo Execution\n' +
          '# -----------------------------\n' +
          'p1 = add_project("Build Nexus", 1)\n' +
          'p2 = add_project("Write Docs", 3)\n' +
          'p3 = add_project("Optimize UI", 2)\n' +
          '\n' +
          'p1.complete()\n' +
          '\n' +
          'list_projects()\n' +
          '\n' +
          'print("\\nPriority Map:", priority_summary())\n' +
          '\n' +
          'await simulate_deploy()\n',
        dirty: false,
        created: now(),
        updated: now(),
        lastSaved: now()
      }],
      openCodeIds: [],
      activeCodeId: null,

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

        get().logActivity('code', 'created', file.name)
        set(s => ({
          codes: [file, ...s.codes],
          openCodeIds: [file.id, ...s.openCodeIds],
          activeCodeId: file.id
        }))

        return file
      },

      updateCode: (id, p) =>
        set(s => ({
          codes: s.codes.map(c =>
            c.id === id
              ? {
                ...c,
                ...p,
                updated: now(),
                dirty:
                  p.hasOwnProperty('dirty')
                    ? p.dirty!
                    : true
              }
              : c
          )
        })),

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
        set(s => ({
          codes: s.codes.map(c =>
            c.id === id
              ? { ...c, dirty: false, lastSaved: now() }
              : c
          )
        })),

      safeCloseCode: id => {
        const file = get().codes.find(c => c.id === id)
        if (!file) return
        if (file.dirty && !confirm('Unsaved changes. Close anyway?')) return
        get().closeCode(id)
      },

      /* ================= TASKS ================= */

      tasks: [],

      addTask: (title, status, desc = '', priority = 'mid') => {
        const t: Task = {
          id: genId(),
          title,
          desc,
          status,
          priority,
          tags: [],
          subtasks: [],
          created: now(),
          updated: now()
        }
        get().logActivity('task', 'created', t.title)
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

      moveTask: (id, status) =>
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === id ? { ...t, status, updated: now() } : t
          )
        })),

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

      reminders: [],

      addRem: r =>
        set(s => ({
          reminders: [
            ...s.reminders,
            { ...r, id: genId(), done: false }
          ]
        })),

      delRem: id =>
        set(s => ({
          reminders: s.reminders.filter(r => r.id !== id)
        })),

      doneRem: id =>
        set(s => ({
          reminders: s.reminders.map(r =>
            r.id === id ? { ...r, done: true } : r
          )
        })),

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
    { name: 'nx-app-v3' }
  )
)
