import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PRESETS } from './themeStore'
import { useApp } from './appStore'
import { useCanvas } from './canvasStore'
import { createStoreManagerStorage } from './persistence/storeManager'

export type TerminalLine = {
  type: 'input' | 'output' | 'error' | 'success' | 'warn'
  text: string
  timestamp: string
}

type TerminalContext = {
  setView: (v: any) => void
  t: any
  app: any
}

type ExecuteCommandOptions = {
  fromMacro?: boolean
  depth?: number
}

interface TerminalState {
  isOpen: boolean
  history: TerminalLine[]
  lastCommand: string
  macros: Record<string, string[]>
  recordingMacro: string | null
  undoStack: string[]
  redoStack: string[]

  setOpen: (open: boolean) => void
  addHistory: (line: Omit<TerminalLine, 'timestamp'>) => void
  clearHistory: () => void
  executeCommand: (cmd: string, context: TerminalContext, options?: ExecuteCommandOptions) => void
}

const VIEWS = ['dashboard', 'notes', 'code', 'tasks', 'reminders', 'canvas', 'files', 'flux', 'devtools', 'settings', 'info']

const VIEW_ALIASES: Record<string, string> = {
  dash: 'dashboard',
  home: 'dashboard',
  note: 'notes',
  editor: 'code',
  task: 'tasks',
  rem: 'reminders',
  reminder: 'reminders',
  file: 'files',
  dev: 'devtools',
  config: 'settings',
  about: 'info',
}

const HELP_TEXT = [
  'Nexus Terminal commands:',
  'help                               Show command list',
  'views | ls                         List all views',
  'goto <view>                        Navigate (aliases supported)',
  'spotlight [query]                  Open spotlight with optional query',
  'search <query>                     Search notes, tasks, code, reminders',
  'canvas list                        List canvases with node count',
  'canvas new [name]                  Create and open a new canvas',
  'canvas layout <mode>               Apply canvas layout (mindmap/timeline/board)',
  'canvas template <type> [name]      Build template (mindmap/roadmap/sprint/risk/decision/ai)',
  'canvas focus                       Fit current canvas in view',
  'theme list                         List available presets',
  'theme <preset>                     Apply a theme preset',
  'profile <focus|cinematic|compact|default>',
  'mode <dark|light>                  Toggle color mode',
  'new <note|task|reminder> [title]   Quick create with optional title',
  'stats                              App stats summary',
  'today                              Daily pulse summary',
  'calc <expression>                  Quick calculator (+ - * / %)',
  'macro start <name>                 Start recording command macro',
  'macro stop                          Stop active macro recording',
  'macro list | show <name>            List macros or inspect one',
  'macro run <name>                    Replay stored macro',
  'macro delete <name>                 Remove macro',
  'undo | redo                         Command timeline workflow',
  'history                            Show recent terminal inputs',
  'terminal <open|close|toggle>       Control terminal visibility',
  'clear | cls                        Clear terminal history',
  'exit | close                       Close terminal',
].join('\n')

const sanitize = (cmd: string) => cmd.trim().replace(/^\/+/, '')
const resolveView = (value: string) => VIEW_ALIASES[value.toLowerCase()] || value.toLowerCase()

const safeCalc = (expr: string): number | null => {
  if (!/^[0-9+\-*/().%\s]+$/.test(expr)) return null
  try {
    const out = Function(`'use strict'; return (${expr})`)()
    if (typeof out !== 'number' || Number.isNaN(out) || !Number.isFinite(out)) return null
    return out
  } catch {
    return null
  }
}

const formatSearchSection = (title: string, lines: string[]) =>
  lines.length ? `${title}:\n${lines.join('\n')}` : ''

const DEFAULT_TERMINAL_HISTORY: TerminalLine[] = [
  { type: 'output', text: 'Nexus Terminal [Version 5.0]', timestamp: new Date().toISOString() },
  { type: 'output', text: 'Type "help" for available commands.', timestamp: new Date().toISOString() },
]

const matchesQuery = (value: string | undefined, query: string, maxLen = 5000) => {
  if (!value) return false
  const haystack = value.length > maxLen ? value.slice(0, maxLen) : value
  return haystack.toLowerCase().includes(query)
}

const MAX_MACRO_DEPTH = 6

export const useTerminal = create<TerminalState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      history: DEFAULT_TERMINAL_HISTORY,
      lastCommand: '',
      macros: {},
      recordingMacro: null,
      undoStack: [],
      redoStack: [],

      setOpen: (open) => set({ isOpen: open }),

      addHistory: (line) => set((s) => ({
        history: [...s.history, { ...line, timestamp: new Date().toISOString() }].slice(-140),
      })),

      clearHistory: () => set({ history: [...DEFAULT_TERMINAL_HISTORY] }),

      executeCommand: (raw, ctx, options) => {
        const trimmed = raw.trim()
        if (!trimmed) return

        const normalized = sanitize(trimmed)
        const [cmd, ...args] = normalized.split(/\s+/)
        const command = (cmd || '').toLowerCase()
        const arg0 = (args[0] || '').toLowerCase()
        const rest = args.join(' ').trim()
        const fromMacro = !!options?.fromMacro
        const depth = options?.depth ?? 0

        set({ lastCommand: trimmed })
        get().addHistory({ type: 'input', text: trimmed })

        const add = (type: TerminalLine['type'], text: string) => get().addHistory({ type, text })

        try {

        if (!['undo', 'redo'].includes(command)) {
          set((s) => ({
            undoStack: [...s.undoStack, trimmed].slice(-120),
            redoStack: [],
          }))
        }

        if (get().recordingMacro && command !== 'macro' && !fromMacro) {
          const recording = get().recordingMacro as string
          set((s) => ({
            macros: {
              ...s.macros,
              [recording]: [...(s.macros[recording] || []), trimmed].slice(-60),
            },
          }))
        }

        const goTo = (viewRaw: string) => {
          const view = resolveView(viewRaw)
          if (!VIEWS.includes(view)) {
            add('error', `Unknown view: ${viewRaw}`)
            return
          }
          ctx.setView(view)
          add('success', `Navigated to ${view}`)
        }

        if (command === 'help') {
          add('output', HELP_TEXT)
          return
        }

        if (command === 'views' || command === 'ls') {
          add('output', `Views: ${VIEWS.join(', ')}\nAliases: ${Object.keys(VIEW_ALIASES).join(', ')}`)
          return
        }

        if (command === 'goto' || command === 'open' || command === 'view' || command === 'cd') {
          if (!arg0) {
            add('warn', 'Usage: goto <view>')
            return
          }
          goTo(arg0)
          return
        }

        if (command === 'settings') {
          goTo('settings')
          return
        }

        if (command === 'canvas') {
          const action = arg0 || 'list'

          if (action === 'list' || action === 'ls') {
            const canvases = useCanvas.getState().canvases
            if (!canvases.length) {
              add('warn', 'No canvases yet. Use: canvas new <name>')
              return
            }
            add(
              'output',
              canvases
                .slice(0, 24)
                .map((c, i) => `${i + 1}. ${c.name} (${c.nodes.length} nodes, ${c.connections.length} links)`)
                .join('\n')
            )
            return
          }

          if (action === 'new' || action === 'create') {
            const name = args.slice(1).join(' ').trim() || 'Terminal Canvas'
            useCanvas.getState().addCanvas(name)
            ctx.setView('canvas')
            add('success', `Canvas created: ${name}`)
            return
          }

          if (action === 'focus' || action === 'fit') {
            ctx.setView('canvas')
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('nx-canvas-command', { detail: { action: 'focus' } }))
            }
            add('success', 'Canvas fit-view requested')
            return
          }

          if (action === 'layout') {
            const rawMode = (args[1] || 'mindmap').toLowerCase()
            const modeMap: Record<string, 'mindmap' | 'timeline' | 'board'> = {
              mindmap: 'mindmap',
              map: 'mindmap',
              timeline: 'timeline',
              time: 'timeline',
              board: 'board',
              kanban: 'board',
            }
            const mode = modeMap[rawMode]
            if (!mode) {
              add('warn', 'Usage: canvas layout <mindmap|timeline|board>')
              return
            }
            if (!useCanvas.getState().canvases.length) {
              useCanvas.getState().addCanvas(`Terminal ${mode}`)
            }
            ctx.setView('canvas')
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('nx-canvas-command', { detail: { action: 'layout', mode } }))
            }
            add('success', `Canvas layout applied: ${mode}`)
            return
          }

          if (action === 'template') {
            const rawType = (args[1] || 'mindmap').toLowerCase()
            const map: Record<string, 'mindmap' | 'roadmap' | 'sprint' | 'risk-matrix' | 'decision-flow' | 'ai-project'> = {
              mindmap: 'mindmap',
              roadmap: 'roadmap',
              sprint: 'sprint',
              risk: 'risk-matrix',
              matrix: 'risk-matrix',
              decision: 'decision-flow',
              flow: 'decision-flow',
              ai: 'ai-project',
              aiproject: 'ai-project',
            }
            const template = map[rawType]
            if (!template) {
              add('warn', 'Usage: canvas template <mindmap|roadmap|sprint|risk|decision|ai> [name]')
              return
            }
            const name = args.slice(2).join(' ').trim() || `Terminal ${template}`
            if (!useCanvas.getState().canvases.length) {
              useCanvas.getState().addCanvas(name)
            }
            ctx.setView('canvas')
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('nx-canvas-command', {
                detail: {
                  action: 'template',
                  template,
                  title: name,
                  includeNotes: true,
                  includeTasks: true,
                },
              }))
            }
            add('success', `Canvas template queued: ${template} (${name})`)
            return
          }

          add('warn', 'Usage: canvas <list|new|layout|template|focus>')
          return
        }

        if (command === 'spotlight') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nx-open-spotlight', { detail: { query: rest } }))
          }
          add('success', rest ? `Spotlight opened: "${rest}"` : 'Spotlight opened')
          return
        }

        if (command === 'undo') {
          const stack = get().undoStack
          if (!stack.length) {
            add('warn', 'Nothing to undo. Execute commands first.')
            return
          }
          const last = stack[stack.length - 1]
          set((s) => ({
            undoStack: s.undoStack.slice(0, -1),
            redoStack: [last, ...s.redoStack].slice(0, 80),
          }))
          add('warn', `Undo staged: ${last}\nUse "redo" to run it again.`)
          return
        }

        if (command === 'redo') {
          const next = get().redoStack[0]
          if (!next) {
            add('warn', 'Nothing to redo.')
            return
          }
          set((s) => ({ redoStack: s.redoStack.slice(1) }))
          add('success', `Redo: ${next}`)
          get().executeCommand(next, ctx, { fromMacro: true, depth: depth + 1 })
          return
        }

        if (command === 'macro') {
          const action = arg0
          const nameRaw = args.slice(1).join(' ').trim()
          const macroName = nameRaw.toLowerCase().replace(/\s+/g, '-')

          if (action === 'start') {
            if (!macroName) {
              add('warn', 'Usage: macro start <name>')
              return
            }
            set((s) => ({
              recordingMacro: macroName,
              macros: { ...s.macros, [macroName]: s.macros[macroName] || [] },
            }))
            add('success', `Recording macro "${macroName}"...`)
            return
          }

          if (action === 'stop') {
            const active = get().recordingMacro
            if (!active) {
              add('warn', 'No active macro recording.')
              return
            }
            const count = get().macros[active]?.length ?? 0
            set({ recordingMacro: null })
            add('success', `Macro "${active}" saved (${count} commands).`)
            return
          }

          if (action === 'list' || !action) {
            const entries = Object.entries(get().macros)
            if (!entries.length) {
              add('output', 'No macros saved yet.\nTry: macro start daily-flow')
              return
            }
            add(
              'output',
              `Macros:\n${entries.map(([name, cmds]) => `- ${name} (${cmds.length} cmds${get().recordingMacro === name ? ' · recording' : ''})`).join('\n')}`
            )
            return
          }

          if (action === 'show') {
            if (!macroName) {
              add('warn', 'Usage: macro show <name>')
              return
            }
            const steps = get().macros[macroName]
            if (!steps) {
              add('error', `Macro not found: ${macroName}`)
              return
            }
            add('output', `Macro "${macroName}":\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n') || '- empty'}`)
            return
          }

          if (action === 'delete' || action === 'rm') {
            if (!macroName) {
              add('warn', 'Usage: macro delete <name>')
              return
            }
            if (!get().macros[macroName]) {
              add('error', `Macro not found: ${macroName}`)
              return
            }
            set((s) => {
              const next = { ...s.macros }
              delete next[macroName]
              return {
                macros: next,
                recordingMacro: s.recordingMacro === macroName ? null : s.recordingMacro,
              }
            })
            add('warn', `Macro deleted: ${macroName}`)
            return
          }

          if (action === 'run') {
            if (!macroName) {
              add('warn', 'Usage: macro run <name>')
              return
            }
            if (depth > MAX_MACRO_DEPTH) {
              add('error', `Macro recursion blocked at depth ${depth}.`)
              return
            }
            const steps = get().macros[macroName]
            if (!steps) {
              add('error', `Macro not found: ${macroName}`)
              return
            }
            if (!steps.length) {
              add('warn', `Macro "${macroName}" is empty.`)
              return
            }
            if (steps.some((step) => step.trim().toLowerCase() === `macro run ${macroName}`)) {
              add('warn', `Macro "${macroName}" contains self-run and was blocked to prevent loops.`)
              return
            }
            add('success', `Running macro "${macroName}" (${steps.length} commands)...`)
            steps.forEach((step, idx) => {
              setTimeout(() => get().executeCommand(step, ctx, { fromMacro: true, depth: depth + 1 }), idx * 40)
            })
            return
          }

          add('warn', 'Usage: macro <start|stop|list|show|run|delete> [name]')
          return
        }

        if (command === 'clear' || command === 'cls') {
          get().clearHistory()
          return
        }

        if (command === 'exit' || command === 'close') {
          set({ isOpen: false })
          return
        }

        if (command === 'terminal') {
          const mode = arg0 || 'toggle'
          if (mode === 'open') {
            set({ isOpen: true })
            add('success', 'Terminal opened')
            return
          }
          if (mode === 'close') {
            set({ isOpen: false })
            return
          }
          if (mode === 'toggle') {
            const next = !get().isOpen
            set({ isOpen: next })
            add('success', `Terminal ${next ? 'opened' : 'closed'}`)
            return
          }
          add('warn', 'Usage: terminal <open|close|toggle>')
          return
        }

        if (command === 'mode') {
          if (arg0 === 'dark' || arg0 === 'light') {
            ctx.t.setMode(arg0)
            add('success', `Mode set to ${arg0}`)
          } else {
            add('warn', 'Usage: mode <dark|light>')
          }
          return
        }

        if (command === 'theme') {
          if (!arg0 || arg0 === 'list') {
            add('output', `Theme presets:\n${PRESETS.map((p) => `- ${p}`).join('\n')}`)
            return
          }

          const query = rest.toLowerCase()
          const exact = PRESETS.find((name) => name.toLowerCase() === query)
          const fuzzy = PRESETS.find((name) => name.toLowerCase().includes(query))
          const presetName = exact || fuzzy

          if (!presetName) {
            add('error', `Theme preset not found: ${rest}`)
            return
          }

          ctx.t.preset(presetName)
          add('success', `Theme preset applied: ${presetName}`)
          return
        }

        if (command === 'profile') {
          if (!arg0) {
            add('warn', 'Usage: profile <focus|cinematic|compact|default>')
            return
          }

          if (arg0 === 'focus') {
            ctx.t.setQOL({ panelDensity: 'compact', reducedMotion: false, quickActions: true })
            ctx.t.setVisual({ compactMode: true, spacingDensity: 'compact' })
            ctx.t.setToolbar({ toolbarMode: 'spotlight' })
            add('success', 'Profile applied: focus')
            return
          }

          if (arg0 === 'cinematic') {
            ctx.t.setQOL({ panelDensity: 'spacious', reducedMotion: false })
            ctx.t.setBackground({ overlayOpacity: 0.08, vignette: true, vignetteStrength: 0.45, scanlines: false })
            ctx.t.setAnimations({ glowPulse: true, floatEffect: true })
            add('success', 'Profile applied: cinematic')
            return
          }

          if (arg0 === 'compact') {
            ctx.t.setQOL({ panelDensity: 'compact', reducedMotion: true })
            ctx.t.setVisual({ compactMode: true, spacingDensity: 'compact' })
            ctx.t.setToolbar({ height: 36 })
            add('success', 'Profile applied: compact')
            return
          }

          if (arg0 === 'default') {
            ctx.t.setQOL({ panelDensity: 'comfortable', reducedMotion: false })
            ctx.t.setVisual({ compactMode: false, spacingDensity: 'comfortable' })
            ctx.t.setToolbar({ toolbarMode: 'island', height: 40 })
            add('success', 'Profile applied: default')
            return
          }

          add('warn', 'Usage: profile <focus|cinematic|compact|default>')
          return
        }

        if (command === 'new') {
          const type = arg0
          const title = args.slice(1).join(' ').trim()

          if (type === 'note') {
            ctx.app.addNote()
            if (title) {
              const latest = useApp.getState().notes[0]
              if (latest) useApp.getState().updateNote(latest.id, { title })
            }
            ctx.setView('notes')
            add('success', `New note created${title ? `: ${title}` : ''}`)
            return
          }

          if (type === 'task') {
            ctx.app.addTask(title || 'Quick Task', 'todo')
            ctx.setView('tasks')
            add('success', `New task created${title ? `: ${title}` : ''}`)
            return
          }

          if (type === 'reminder') {
            ctx.app.addRem({
              title: title || 'Quick Reminder',
              msg: 'Created from terminal',
              datetime: new Date(Date.now() + 60 * 60000).toISOString(),
              repeat: 'none',
            })
            ctx.setView('reminders')
            add('success', `Reminder for +1h created${title ? `: ${title}` : ''}`)
            return
          }

          add('warn', 'Usage: new <note|task|reminder> [title]')
          return
        }

        if (command === 'search' || command === 'find') {
          if (!rest) {
            add('warn', 'Usage: search <query>')
            return
          }

          const q = rest.toLowerCase()
          const notes = (ctx.app.notes || [])
            .filter((n: any) => matchesQuery(n.title, q, 300) || matchesQuery(n.content, q, 4000))
            .slice(0, 4)
            .map((n: any) => `- ${n.title || 'Untitled'}`)

          const tasks = (ctx.app.tasks || [])
            .filter((task: any) => matchesQuery(task.title, q, 300) || matchesQuery(task.desc, q, 1200))
            .slice(0, 4)
            .map((task: any) => `- ${task.title}`)

          const codes = (ctx.app.codes || [])
            .filter((c: any) => matchesQuery(c.name, q, 300) || matchesQuery(c.content, q, 3500))
            .slice(0, 3)
            .map((c: any) => `- ${c.name}`)

          const reminders = (ctx.app.reminders || [])
            .filter((r: any) => matchesQuery(r.title, q, 300) || matchesQuery(r.msg, q, 600))
            .slice(0, 4)
            .map((r: any) => `- ${r.title}`)

          const output = [
            formatSearchSection('Notes', notes),
            formatSearchSection('Tasks', tasks),
            formatSearchSection('Code', codes),
            formatSearchSection('Reminders', reminders),
          ].filter(Boolean).join('\n\n')

          if (!output) {
            add('warn', `No matches for "${rest}"`)
            return
          }

          add('output', output)
          return
        }

        if (command === 'stats') {
          const noteCount = ctx.app.notes?.length ?? 0
          const taskOpen = (ctx.app.tasks ?? []).filter((task: any) => task.status !== 'done').length
          const taskDone = (ctx.app.tasks ?? []).filter((task: any) => task.status === 'done').length
          const reminderOpen = (ctx.app.reminders ?? []).filter((r: any) => !r.done).length
          const codeCount = ctx.app.codes?.length ?? 0

          add(
            'output',
            `Notes: ${noteCount}\nOpen tasks: ${taskOpen}\nDone tasks: ${taskDone}\nOpen reminders: ${reminderOpen}\nCode files: ${codeCount}`,
          )
          return
        }

        if (command === 'today') {
          const now = new Date()
          const dayEnd = new Date()
          dayEnd.setHours(23, 59, 59, 999)

          const dueToday = (ctx.app.reminders ?? []).filter((r: any) => {
            if (r.done) return false
            const d = new Date(r.snoozeUntil || r.datetime)
            return d >= now && d <= dayEnd
          }).length

          const overdue = (ctx.app.reminders ?? []).filter((r: any) => {
            if (r.done) return false
            return new Date(r.snoozeUntil || r.datetime) < now
          }).length

          const openTasks = (ctx.app.tasks ?? []).filter((task: any) => task.status !== 'done').length
          const updatedNotes = [...(ctx.app.notes ?? [])]
            .sort((a: any, b: any) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
            .slice(0, 3)
            .map((n: any) => `- ${n.title || 'Untitled'}`)

          add(
            'output',
            `Open tasks: ${openTasks}\nDue today: ${dueToday}\nOverdue reminders: ${overdue}\nRecent notes:\n${updatedNotes.join('\n') || '- none'}`,
          )
          return
        }

        if (command === 'calc') {
          if (!rest) {
            add('warn', 'Usage: calc <expression>')
            return
          }
          const result = safeCalc(rest)
          if (result === null) {
            add('error', 'Invalid expression')
            return
          }
          add('success', `${rest} = ${result}`)
          return
        }

        if (command === 'history') {
          const recentInputs = get().history
            .filter((line) => line.type === 'input')
            .slice(-10)
            .map((line, index) => `${index + 1}. ${line.text}`)
          add('output', recentInputs.length ? recentInputs.join('\n') : 'No command history yet.')
          return
        }

        if (command === 'time' || command === 'date' || command === 'now') {
          add('output', new Date().toLocaleString())
          return
        }

        add('error', `Unknown command: ${command}. Type "help".`)
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown failure'
          add('error', `Command failed: ${msg}`)
        }
      },
    }),
    {
      name: 'nx-terminal',
      version: 2,
      storage: createStoreManagerStorage<TerminalState>({
        debounceMs: 2_800,
        idleTimeoutMs: 1_900,
        flushBudgetMs: 8,
      }),
      partialize: (s) => ({
        macros: s.macros,
      }),
      migrate: (persisted: any) => ({
        macros: persisted?.macros || {},
      }),
    }
  )
)
