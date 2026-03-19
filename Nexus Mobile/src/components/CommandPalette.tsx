import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ArrowRight, Sparkles, Sun, Moon, Plus, LayoutPanelTop, CheckSquare, Bell, Code2, FileText } from 'lucide-react'
import { useTheme, PRESETS } from '../store/themeStore'
import { useApp } from '../store/appStore'
import { useTerminal } from '../store/terminalStore'
import { View } from './Sidebar'
import { hexToRgb } from '../lib/utils'
import { haptic } from '../lib/haptics'

type PaletteAction = {
  id: string
  title: string
  subtitle?: string
  group: string
  keywords: string
  run: () => void
}

const VIEW_ITEMS: { id: View; title: string }[] = [
  { id: 'dashboard', title: 'Dashboard' },
  { id: 'notes', title: 'Notizen' },
  { id: 'code', title: 'Code' },
  { id: 'tasks', title: 'Tasks' },
  { id: 'reminders', title: 'Reminders' },
  { id: 'canvas', title: 'Canvas' },
  { id: 'files', title: 'Dateien' },
  { id: 'flux', title: 'Flux' },
  { id: 'devtools', title: 'DevTools' },
  { id: 'settings', title: 'Settings' },
  { id: 'info', title: 'Info' },
]

export function CommandPalette({
  open,
  onClose,
  setView,
}: {
  open: boolean
  onClose: () => void
  setView: (v: View) => void
}) {
  const t = useTheme()
  const app = useApp()
  const terminal = useTerminal()
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('nx-palette-recent')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const rgb = hexToRgb(t.accent)

  const actions = useMemo<PaletteAction[]>(() => {
    const nav: PaletteAction[] = VIEW_ITEMS.map((v) => ({
      id: `nav-${v.id}`,
      title: `Gehe zu ${v.title}`,
      subtitle: 'Navigation',
      group: 'Navigation',
      keywords: `${v.id} ${v.title} view`,
      run: () => {
        void haptic('light')
        setView(v.id)
        onClose()
      },
    }))

    const create: PaletteAction[] = [
      {
        id: 'create-note', title: 'Neue Notiz', subtitle: 'Legt eine Note an und öffnet Notes', group: 'Create', keywords: 'new note notiz create',
        run: () => { app.addNote(); setView('notes'); onClose() },
      },
      {
        id: 'create-task', title: 'Neuer Task', subtitle: 'Schnellaufgabe in To Do', group: 'Create', keywords: 'new task todo',
        run: () => { app.addTask('Neue Aufgabe', 'todo', '', 'mid'); setView('tasks'); onClose() },
      },
      {
        id: 'create-reminder', title: 'Neuer Reminder in 1h', subtitle: 'Erstellt Erinnerung in einer Stunde', group: 'Create', keywords: 'new reminder erinnerung',
        run: () => {
          const inOneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString()
          app.addRem({ title: 'Neue Erinnerung', msg: '', datetime: inOneHour, repeat: 'none' })
          setView('reminders')
          onClose()
        },
      },
      {
        id: 'create-code', title: 'Neue Code-Datei', subtitle: 'Erstellt untitled.ts', group: 'Create', keywords: 'new code file',
        run: () => { app.addCode('untitled.ts', 'typescript'); setView('code'); onClose() },
      },
    ]

    const theme: PaletteAction[] = [
      {
        id: 'theme-toggle', title: t.mode === 'dark' ? 'Light Mode aktivieren' : 'Dark Mode aktivieren', subtitle: 'Theme', group: 'Theme', keywords: 'theme mode dark light',
        run: () => { t.setMode(t.mode === 'dark' ? 'light' : 'dark'); onClose() },
      },
      {
        id: 'terminal-toggle', title: 'Terminal öffnen/schließen', subtitle: 'Developer', group: 'Developer', keywords: 'terminal console shell',
        run: () => { terminal.setOpen(!terminal.isOpen); onClose() },
      },
      {
        id: 'terminal-clear', title: 'Terminal History leeren', subtitle: 'Developer', group: 'Developer', keywords: 'terminal clear history',
        run: () => { terminal.clearHistory(); onClose() },
      },
      {
        id: 'theme-contrast', title: 'Auto-Kontrast für Accent', subtitle: 'Theme', group: 'Theme', keywords: 'theme contrast accent color',
        run: () => {
          t.setQOL({ autoAccentContrast: true } as any)
          t.setColors({ accent: t.accent, accent2: t.accent2, bg: t.bg })
          onClose()
        },
      },
      ...PRESETS.slice(0, 6).map((name) => ({
        id: `preset-${name}`,
        title: `Preset: ${name}`,
        subtitle: 'Theme Preset',
        group: 'Theme',
        keywords: `preset ${name.toLowerCase()}`,
        run: () => { t.preset(name); onClose() },
      })),
    ]

    return [...nav, ...create, ...theme]
  }, [app, onClose, setView, t, terminal])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions.filter((a) => (`${a.title} ${a.subtitle || ''} ${a.group} ${a.keywords}`).toLowerCase().includes(q))
  }, [actions, query])

  const markRecent = (id: string) => {
    const next = [id, ...recent.filter((x) => x !== id)].slice(0, 8)
    setRecent(next)
    localStorage.setItem('nx-palette-recent', JSON.stringify(next))
  }

  const shown = filtered.length ? filtered : actions.filter((a) => recent.includes(a.id))

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{ position: 'fixed', left: '50%', top: '12%', transform: 'translateX(-50%)', width: 'min(760px, calc(100vw - 20px))', maxHeight: '70vh', zIndex: 1201 }}
          >
            <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', background: t.mode === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(10,10,18,0.92))' : 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,248,255,0.88))', boxShadow: '0 30px 70px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.4)', backdropFilter: 'blur(36px) saturate(230%)', WebkitBackdropFilter: 'blur(36px) saturate(230%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Search size={16} style={{ opacity: 0.55 }} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') onClose()
                    if (e.key === 'Enter' && shown[0]) { markRecent(shown[0].id); shown[0].run() }
                  }}
                  placeholder="Suche nach Views, Aktionen, Themes..."
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'inherit', fontSize: 14 }}
                />
                <span style={{ fontSize: 10, opacity: 0.45, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 6px' }}>ESC</span>
              </div>

              <div style={{ maxHeight: '58vh', overflowY: 'auto', padding: 8 }}>
                {shown.length === 0 ? (
                  <div style={{ padding: '24px 10px', textAlign: 'center', opacity: 0.6, fontSize: 13 }}>
                    Keine Aktion gefunden.
                  </div>
                ) : (
                  shown.map((a, idx) => (
                    <button
                      key={a.id}
                      onClick={() => { markRecent(a.id); a.run() }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                        border: `1px solid ${idx === 0 ? `rgba(${rgb},0.35)` : 'transparent'}`,
                        background: idx === 0 ? `rgba(${rgb},0.12)` : 'transparent',
                        color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</div>
                        <div style={{ fontSize: 11, opacity: 0.55 }}>{a.subtitle || a.group}</div>
                      </div>
                      <ArrowRight size={14} style={{ opacity: 0.45 }} />
                    </button>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, opacity: 0.6 }}>
                <Sparkles size={12} />
                <span>Quick keys:</span>
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><LayoutPanelTop size={12} /> Navigation</span>
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Plus size={12} /> Create</span>
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{t.mode === 'dark' ? <Sun size={12} /> : <Moon size={12} />} Theme</span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <FileText size={12} /><Code2 size={12} /><CheckSquare size={12} /><Bell size={12} />
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
