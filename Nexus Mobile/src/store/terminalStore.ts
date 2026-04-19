import { createWithEqualityFn as create } from 'zustand/traditional'
import { persist } from 'zustand/middleware'
import { createStoreManagerStorage } from './persistence/storeManager'

export type TerminalLine = {
  type: 'input' | 'output' | 'error' | 'success' | 'warn'
  text: string
  timestamp: string
}

interface TerminalContext {
  setView: (v: any) => void
  t: any
  app: any
  openPalette?: () => void
}

interface TerminalState {
  isOpen: boolean
  history: TerminalLine[]
  lastCommand: string

  setOpen: (open: boolean) => void
  addHistory: (line: Omit<TerminalLine, 'timestamp'>) => void
  clearHistory: () => void
  executeCommand: (cmd: string, context: TerminalContext) => void
}

const HELP_TEXT = [
  'Nexus Terminal Commands',
  'help                              Show this help',
  'goto <view>                       Navigate to a view',
  'views                             List all views',
  'new note|task|reminder|code       Create items',
  'list notes|tasks|reminders        Show recent items',
  'stats                             App stats overview',
  'theme dark|light                  Toggle mode',
  'preset <name>                     Apply theme preset',
  'search <query>                    Search title-based content',
  'palette                           Open command palette',
  'clear                             Clear terminal history',
  'exit                              Close terminal',
].join('\n')

const DEV_MODE = (import.meta as any).env?.DEV
const VIEWS = [
  'dashboard',
  'notes',
  'code',
  'tasks',
  'reminders',
  'canvas',
  'files',
  'flux',
  'devtools',
  ...(DEV_MODE ? ['diagnostics'] : []),
  'settings',
  'info',
]

const normalize = (cmd: string) => cmd.trim().replace(/^\//, '')

export const useTerminal = create<TerminalState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      history: [
        { type: 'output', text: 'Nexus Terminal [Version 5.0]', timestamp: new Date().toISOString() },
        { type: 'output', text: 'Type "help" for available commands.', timestamp: new Date().toISOString() },
      ],
      lastCommand: '',

      setOpen: (open) => set({ isOpen: open }),

      addHistory: (line) =>
        set((s) => ({
          history: [...s.history, { ...line, timestamp: new Date().toISOString() }].slice(-300),
        })),

      clearHistory: () => set({ history: [] }),

      executeCommand: (raw, { setView, t, app, openPalette }) => {
        const trimmed = raw.trim()
        if (!trimmed) return

        const cmd = normalize(trimmed)
        const parts = cmd.split(/\s+/)
        const action = (parts[0] || '').toLowerCase()
        const args = parts.slice(1)

        get().addHistory({ type: 'input', text: trimmed })
        set({ lastCommand: trimmed })

        if (action === 'help') {
          get().addHistory({ type: 'output', text: HELP_TEXT })
          return
        }

        if (action === 'views') {
          get().addHistory({ type: 'output', text: VIEWS.join(', ') })
          return
        }

        if (action === 'goto') {
          const view = (args[0] || '').toLowerCase()
          if (VIEWS.includes(view)) {
            setView(view)
            get().addHistory({ type: 'success', text: `Navigated to ${view}` })
          } else {
            get().addHistory({ type: 'error', text: `Unknown view: ${view || '(empty)'}` })
          }
          return
        }

        if (action === 'new') {
          const type = (args[0] || '').toLowerCase()
          if (type === 'note') {
            app.addNote()
            setView('notes')
            get().addHistory({ type: 'success', text: 'Created note and opened Notes.' })
            return
          }
          if (type === 'task') {
            app.addTask('Neue Aufgabe', 'todo', '', 'mid')
            setView('tasks')
            get().addHistory({ type: 'success', text: 'Created task and opened Tasks.' })
            return
          }
          if (type === 'reminder') {
            const dt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
            app.addRem({ title: 'Neue Erinnerung', msg: '', datetime: dt, repeat: 'none' })
            setView('reminders')
            get().addHistory({ type: 'success', text: 'Created reminder (+1h) and opened Reminders.' })
            return
          }
          if (type === 'code') {
            app.addCode('untitled.ts', 'typescript')
            setView('code')
            get().addHistory({ type: 'success', text: 'Created code file and opened Code.' })
            return
          }
          get().addHistory({ type: 'error', text: `Unknown create type: ${type || '(empty)'}` })
          return
        }

        if (action === 'list') {
          const type = (args[0] || '').toLowerCase()
          if (type === 'notes') {
            const items = app.notes.slice(0, 5).map((n: any, i: number) => `${i + 1}. ${n.title || 'Untitled'}`)
            get().addHistory({ type: 'output', text: items.length ? items.join('\n') : 'No notes.' })
            return
          }
          if (type === 'tasks') {
            const items = app.tasks.slice(0, 5).map((n: any, i: number) => `${i + 1}. ${n.title} [${n.status}]`)
            get().addHistory({ type: 'output', text: items.length ? items.join('\n') : 'No tasks.' })
            return
          }
          if (type === 'reminders') {
            const items = app.reminders.slice(0, 5).map((n: any, i: number) => `${i + 1}. ${n.title}`)
            get().addHistory({ type: 'output', text: items.length ? items.join('\n') : 'No reminders.' })
            return
          }
          get().addHistory({ type: 'error', text: `Unknown list target: ${type || '(empty)'}` })
          return
        }

        if (action === 'stats') {
          const openTasks = app.tasks.filter((x: any) => x.status !== 'done').length
          const doneTasks = app.tasks.filter((x: any) => x.status === 'done').length
          const openRem = app.reminders.filter((x: any) => !x.done).length
          const txt = [
            `Notes: ${app.notes.length}`,
            `Code files: ${app.codes.length}`,
            `Tasks: ${openTasks} open / ${doneTasks} done`,
            `Reminders: ${openRem} active`,
          ].join('\n')
          get().addHistory({ type: 'output', text: txt })
          return
        }

        if (action === 'theme') {
          const mode = (args[0] || '').toLowerCase()
          if (mode === 'dark' || mode === 'light') {
            t.setMode(mode)
            get().addHistory({ type: 'success', text: `Theme mode set to ${mode}.` })
            return
          }
          t.setMode(t.mode === 'dark' ? 'light' : 'dark')
          get().addHistory({ type: 'success', text: `Theme mode toggled to ${t.mode === 'dark' ? 'light' : 'dark'}.` })
          return
        }

        if (action === 'preset') {
          const name = args.join(' ')
          if (!name) {
            get().addHistory({ type: 'warn', text: 'Usage: preset <name>' })
            return
          }
          t.preset(name)
          get().addHistory({ type: 'success', text: `Preset applied: ${name}` })
          return
        }

        if (action === 'search') {
          const q = args.join(' ').toLowerCase()
          if (!q) {
            get().addHistory({ type: 'warn', text: 'Usage: search <query>' })
            return
          }
          const hits: string[] = []
          app.notes.forEach((n: any) => n.title?.toLowerCase().includes(q) && hits.push(`note: ${n.title}`))
          app.tasks.forEach((n: any) => n.title?.toLowerCase().includes(q) && hits.push(`task: ${n.title}`))
          app.codes.forEach((n: any) => n.name?.toLowerCase().includes(q) && hits.push(`code: ${n.name}`))
          app.reminders.forEach((n: any) => n.title?.toLowerCase().includes(q) && hits.push(`reminder: ${n.title}`))
          get().addHistory({ type: hits.length ? 'output' : 'warn', text: hits.length ? hits.slice(0, 10).join('\n') : `No result for "${q}"` })
          return
        }

        if (action === 'palette') {
          openPalette?.()
          get().addHistory({ type: 'success', text: 'Opened command palette.' })
          return
        }

        if (action === 'clear') {
          get().clearHistory()
          return
        }

        if (action === 'exit') {
          set({ isOpen: false })
          return
        }

        get().addHistory({ type: 'error', text: `Unknown command: ${action}` })
      },
    }),
    {
      name: 'nx-terminal-v2',
      storage: createStoreManagerStorage<TerminalState>({
        debounceMs: 2_800,
        idleTimeoutMs: 1_900,
        flushBudgetMs: 8,
      }),
    }
  )
)
