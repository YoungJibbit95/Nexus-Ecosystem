import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Wand2,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
  Save,
  Download,
  Upload,
  RotateCcw,
  Command,
  TerminalSquare,
  Type,
} from 'lucide-react'
import { useTheme, PRESETS, PRESET_PREVIEWS, GLOBAL_FONTS, BgMode } from '../store/themeStore'
import { useTerminal } from '../store/terminalStore'
import { hexToRgb } from '../lib/utils'
import { applyMotionProfile, buildMotionRuntime, type MotionProfile } from '../lib/motionEngine'
import { useMobile } from '../lib/useMobile'

type ModuleId = 'appearance' | 'panel' | 'layout' | 'motion' | 'editor' | 'workspace'

type RendererMode = 'blur' | 'fake-glass' | 'glass-shader'
type GlowRendererMode = 'css' | 'three'

type ExperiencePreset = {
  id: 'focus' | 'balanced' | 'cinematic'
  title: string
  desc: string
  apply: (t: any) => void
}

const MODULES: { id: ModuleId; icon: React.ReactNode; title: string; desc: string }[] = [
  { id: 'appearance', icon: <Wand2 size={14} />, title: 'Appearance', desc: 'Presets, Farben, Schrift' },
  { id: 'panel', icon: <Sparkles size={14} />, title: 'Panel Background', desc: 'Renderer & Glow Pipeline' },
  { id: 'layout', icon: <LayoutGrid size={14} />, title: 'Layout', desc: 'Sidebar, Toolbar, Dichte' },
  { id: 'motion', icon: <SlidersHorizontal size={14} />, title: 'Motion Engine', desc: 'Apple-like Motion Profiles' },
  { id: 'editor', icon: <Type size={14} />, title: 'Editor', desc: 'Code und Notes Verhalten' },
  { id: 'workspace', icon: <TerminalSquare size={14} />, title: 'Workspace', desc: 'Spotlight, Terminal, Reset' },
]

const MOTION_PROFILES: { id: MotionProfile; label: string; desc: string }[] = [
  { id: 'minimal', label: 'Minimal', desc: 'Nahezu statisch, maximale Ruhe' },
  { id: 'balanced', label: 'Balanced', desc: 'Schnell und modern für Alltag' },
  { id: 'expressive', label: 'Expressive', desc: 'Mehr Tiefe, mehr Reaktion' },
  { id: 'cinematic', label: 'Cinematic', desc: 'Maximaler Eye-Candy bei genug Leistung' },
]

const EXPERIENCE_PRESETS: ExperiencePreset[] = [
  {
    id: 'focus',
    title: 'Focus',
    desc: 'Weniger Effekt, maximale Klarheit',
    apply: (t) => {
      t.setMode('dark')
      t.setQOL({ reducedMotion: true, panelDensity: 'comfortable', quickActions: false })
      t.setAnimations({ pageTransitions: false, hoverLift: false, rippleClick: false, glowPulse: false })
      t.setGlow({ mode: 'focus', intensity: 0.35, radius: 14, animated: false, gradientGlow: false })
      t.setBlur({ panelBlur: 14, sidebarBlur: 14, modalBlur: 18 })
      t.setGlassmorphism({ panelRenderer: 'blur', glowRenderer: 'css' } as any)
    },
  },
  {
    id: 'balanced',
    title: 'Balanced',
    desc: 'Empfohlen: guter Mix aus Style und Performance',
    apply: (t) => {
      t.setQOL({ reducedMotion: false, panelDensity: 'comfortable', quickActions: true })
      t.setAnimations({ pageTransitions: true, hoverLift: true, rippleClick: true, glowPulse: false })
      t.setGlow({ mode: 'outline', intensity: 0.78, radius: 24, animated: false, gradientGlow: true })
      t.setBlur({ panelBlur: 18, sidebarBlur: 18, modalBlur: 22 })
      t.setGlassmorphism({ panelRenderer: 'blur', glowRenderer: 'css' } as any)
      applyMotionProfile(t, 'balanced')
    },
  },
  {
    id: 'cinematic',
    title: 'Cinematic',
    desc: 'Starke visuelle Tiefe und Glow',
    apply: (t) => {
      t.setQOL({ reducedMotion: false, panelDensity: 'spacious', quickActions: true })
      t.setAnimations({ pageTransitions: true, hoverLift: true, rippleClick: true, glowPulse: true })
      t.setGlow({ mode: 'gradient', intensity: 1.08, radius: 30, animated: true, gradientGlow: true })
      t.setBlur({ panelBlur: 24, sidebarBlur: 22, modalBlur: 30 })
      t.setGlassmorphism({ panelRenderer: 'glass-shader', glowRenderer: 'three' } as any)
      applyMotionProfile(t, 'cinematic')
    },
  },
]

function ModuleCard({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        padding: '14px 14px 12px',
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em' }}>{title}</div>
      {desc ? <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{desc}</div> : null}
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 10,
      }}
    >
      {children}
    </div>
  )
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label?: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  return (
    <div>
      {label ? <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>{label}</div> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map((option) => {
          const active = option === value
          return (
            <button
              key={option}
              onClick={() => onChange(option)}
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                border: `1px solid ${active ? `rgba(${rgb},0.4)` : 'rgba(255,255,255,0.12)'}`,
                background: active ? `rgba(${rgb},0.2)` : 'rgba(255,255,255,0.04)',
                color: active ? t.accent : 'inherit',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ThemeLibraryGrid({
  onApply,
}: {
  onApply: (presetName: string) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8 }}>
      {PRESETS.map((name) => {
        const preview = PRESET_PREVIEWS[name] || {
          mode: 'dark' as const,
          accent: '#007AFF',
          accent2: '#5E5CE6',
          bg: '#12141f',
        }
        return (
          <button
            key={name}
            onClick={() => onApply(name)}
            style={{
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background:
                `linear-gradient(135deg, ${preview.bg} 0%, color-mix(in srgb, ${preview.bg} 78%, ${preview.accent} 22%) 100%)`,
              padding: 9,
              textAlign: 'left',
              cursor: 'pointer',
              display: 'grid',
              gap: 7,
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ width: 14, height: 14, borderRadius: 999, background: preview.accent, border: '1px solid rgba(255,255,255,0.35)' }} />
              <span style={{ width: 14, height: 14, borderRadius: 999, background: preview.accent2, border: '1px solid rgba(255,255,255,0.35)' }} />
              <span style={{ width: 14, height: 14, borderRadius: 999, background: preview.bg, border: '1px solid rgba(255,255,255,0.35)' }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: preview.mode === 'light' ? '#111827' : '#eef2ff' }}>{name}</div>
          </button>
        )
      })}
    </div>
  )
}

function FontLibrary({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
      {GLOBAL_FONTS.map((font) => {
        const active = value === font.value
        return (
          <button
            key={font.value}
            onClick={() => onChange(font.value)}
            style={{
              borderRadius: 12,
              border: `1px solid ${active ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.12)'}`,
              background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
              padding: '10px 11px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800 }}>{font.label}</div>
            <div style={{ marginTop: 3, fontSize: 13, opacity: 0.82, fontFamily: font.value }}>
              Nexus Workspace Aa Bb Cc 123
            </div>
          </button>
        )
      })}
    </div>
  )
}

function Toggle({
  label,
  checked,
  desc,
  onChange,
}: {
  label: string
  checked: boolean
  desc?: string
  onChange: (next: boolean) => void
}) {
  const t = useTheme()
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '100%',
        textAlign: 'left',
        borderRadius: 12,
        border: `1px solid ${checked ? t.accent : 'rgba(255,255,255,0.12)'}`,
        background: checked ? `rgba(${hexToRgb(t.accent)},0.16)` : 'rgba(255,255,255,0.03)',
        padding: '10px 11px',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
      {desc ? <div style={{ fontSize: 10, opacity: 0.62, marginTop: 2 }}>{desc}</div> : null}
    </button>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}) {
  const t = useTheme()
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 11, opacity: 0.68 }}>{label}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.accent }}>
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {unit}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          width: '100%',
          height: 4,
          borderRadius: 999,
          appearance: 'none',
          background: `linear-gradient(to right, ${t.accent} ${pct}%, rgba(255,255,255,0.15) ${pct}%)`,
          outline: 'none',
        }}
      />
    </div>
  )
}

export function SettingsView() {
  const t = useTheme()
  const mob = useMobile()
  const terminal = useTerminal()
  const motionRuntime = useMemo(() => buildMotionRuntime(t), [t])
  const rgb = hexToRgb(t.accent)
  const [module, setModule] = useState<ModuleId>('appearance')
  const [msg, setMsg] = useState<string | null>(null)

  const panelRenderer = ((t.glassmorphism as any).panelRenderer ?? 'blur') as RendererMode
  const glowRenderer = ((t.glassmorphism as any).glowRenderer ?? 'css') as GlowRendererMode

  const toast = (text: string) => {
    setMsg(text)
    window.setTimeout(() => setMsg(null), 1200)
  }

  const exportTheme = () => {
    const payload = JSON.stringify(
      {
        accent: t.accent,
        accent2: t.accent2,
        bg: t.bg,
        mode: t.mode,
        globalFont: t.globalFont,
        glow: t.glow,
        blur: t.blur,
        background: t.background,
        glassmorphism: t.glassmorphism,
        visual: t.visual,
        animations: t.animations,
        editor: t.editor,
        notes: t.notes,
        qol: t.qol,
        toolbar: t.toolbar,
      },
      null,
      2,
    )
    const blob = new Blob([payload], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nexus-theme-v5.json'
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Theme exportiert')
  }

  const importTheme = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || '{}'))
        if (data.mode) t.setMode(data.mode)
        if (data.accent || data.accent2 || data.bg) {
          t.setColors({ accent: data.accent, accent2: data.accent2, bg: data.bg })
        }
        if (data.globalFont) t.setGlobalFont(data.globalFont)
        if (data.glow) t.setGlow(data.glow)
        if (data.blur) t.setBlur(data.blur)
        if (data.background) t.setBackground(data.background)
        if (data.glassmorphism) t.setGlassmorphism(data.glassmorphism)
        if (data.visual) t.setVisual(data.visual)
        if (data.animations) t.setAnimations(data.animations)
        if (data.editor) t.setEditor(data.editor)
        if (data.notes) t.setNotes(data.notes)
        if (data.qol) t.setQOL(data.qol)
        if (data.toolbar) t.setToolbar(data.toolbar)
        toast('Theme importiert')
      } catch {
        toast('Import fehlgeschlagen')
      }
    }
    reader.readAsText(file)
  }

  const saveThemeSlot = () => {
    const name = window.prompt('Preset Name?')?.trim()
    if (!name) return
    const key = `nx-theme-${name}`
    const payload = JSON.stringify({
      accent: t.accent,
      accent2: t.accent2,
      bg: t.bg,
      mode: t.mode,
      globalFont: t.globalFont,
      glow: t.glow,
      blur: t.blur,
      background: t.background,
      glassmorphism: t.glassmorphism,
      visual: t.visual,
      animations: t.animations,
      editor: t.editor,
      notes: t.notes,
      qol: t.qol,
      toolbar: t.toolbar,
    })
    localStorage.setItem(key, payload)
    toast(`Preset gespeichert: ${name}`)
  }

  const clearSpotlight = () => {
    localStorage.removeItem('nx-spotlight-pins-v1')
    localStorage.removeItem('nx-spotlight-recents-v1')
    window.dispatchEvent(new CustomEvent('nx-spotlight-storage-updated'))
    toast('Spotlight Daten gelöscht')
  }

  const resetDashboardLayout = () => {
    localStorage.removeItem('nx-dashboard-layout-v2')
    toast('Dashboard Layout zurückgesetzt')
  }

  const clearTerminalWorkspace = () => {
    terminal.clearHistory()
    useTerminal.setState({
      macros: {},
      recordingMacro: null,
      undoStack: [],
      redoStack: [],
    } as any)
    toast('Terminal Workspace bereinigt')
  }

  const activeModule = MODULES.find((m) => m.id === module)

  return (
    <div
      style={{
        display: mob.isMobile ? 'block' : 'flex',
        gap: mob.isMobile ? 0 : 10,
        minHeight: 0,
        height: '100%',
        padding: mob.isMobile ? 10 : 12,
        fontFamily: t.globalFont,
        background:
          t.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(10,12,19,0.96), rgba(10,12,19,0.92))'
            : 'linear-gradient(180deg, #f5f6fb, #eceef7)',
      }}
    >
      <aside
        style={{
          display: mob.isMobile ? 'none' : 'flex',
          width: 'clamp(236px, 24vw, 290px)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.12)',
          background:
            t.mode === 'dark'
              ? 'linear-gradient(180deg, rgba(24,26,34,0.9), rgba(17,20,28,0.84))'
              : 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(246,247,252,0.92))',
          boxShadow:
            t.mode === 'dark'
              ? '0 14px 38px rgba(0,0,0,0.34)'
              : '0 14px 30px rgba(40,52,78,0.14)',
          padding: '12px 10px',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div style={{ padding: '4px 8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
          <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>Settings</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>Nexus Design System</div>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>Preset-first, klar, schnell wartbar</div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
          {MODULES.map((item) => {
            const active = item.id === module
            return (
              <button
                key={item.id}
                onClick={() => setModule(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 11,
                  border: `1px solid ${active ? `rgba(${rgb},0.34)` : 'transparent'}`,
                  background: active ? `rgba(${rgb},0.14)` : 'transparent',
                  color: active ? t.accent : 'inherit',
                  padding: '9px 9px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'inline-flex', opacity: active ? 1 : 0.8 }}>{item.icon}</span>
                <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</span>
                  <span style={{ fontSize: 10, opacity: active ? 0.78 : 0.5 }}>{item.desc}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 8, display: 'grid', gap: 6 }}>
          <button onClick={saveThemeSlot} style={{ borderRadius: 10, border: `1px solid rgba(${rgb},0.34)`, background: `rgba(${rgb},0.12)`, color: t.accent, padding: '8px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}><Save size={12} /> Preset speichern</button>
          <button onClick={exportTheme} style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'inherit', padding: '8px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}><Download size={12} /> Export JSON</button>
          <label style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'inherit', padding: '8px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Upload size={12} /> Import JSON
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) importTheme(file)
            }} />
          </label>
        </div>
      </aside>

      <section
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflowY: 'auto',
          borderRadius: mob.isMobile ? 14 : 20,
          border: mob.isMobile ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.12)',
          background:
            t.mode === 'dark'
              ? 'linear-gradient(180deg, rgba(20,22,32,0.93), rgba(14,16,24,0.88))'
              : 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,249,254,0.95))',
          boxShadow:
            t.mode === 'dark'
              ? '0 14px 38px rgba(0,0,0,0.3)'
              : '0 14px 30px rgba(40,52,78,0.12)',
          padding: mob.isMobile ? '12px 10px 16px' : '14px clamp(12px, 2vw, 22px) 20px',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 10, paddingBottom: 10 }}>
          {mob.isMobile ? (
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 8, marginBottom: 6 }}>
              {MODULES.map((item) => {
                const active = item.id === module
                return (
                  <button
                    key={item.id}
                    onClick={() => setModule(item.id)}
                    style={{
                      flexShrink: 0,
                      borderRadius: 10,
                      border: `1px solid ${active ? `rgba(${rgb},0.34)` : 'rgba(255,255,255,0.12)'}`,
                      background: active ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.04)',
                      color: active ? t.accent : 'inherit',
                      padding: '7px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {item.icon}
                    {item.title}
                  </button>
                )
              })}
            </div>
          ) : null}
          <div
            style={{
              borderRadius: 13,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(20,22,30,0.5)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>Current Module</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{activeModule?.title}</div>
              <div style={{ fontSize: 11, opacity: 0.62, marginTop: 2 }}>{activeModule?.desc}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 11, opacity: 0.8, flexWrap: 'wrap' }}>
              <span>Mode: <strong style={{ color: t.accent }}>{t.mode}</strong></span>
              <span>Panel: <strong>{panelRenderer}</strong></span>
              <span>Motion: <strong>{(t.qol?.motionProfile ?? 'balanced')}</strong></span>
            </div>
          </div>
          {msg ? (
            <div style={{ marginTop: 7, fontSize: 11, color: t.accent, fontWeight: 700 }}>
              {msg}
            </div>
          ) : null}
          {mob.isMobile ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 8 }}>
              <button onClick={saveThemeSlot} style={{ borderRadius: 10, border: `1px solid rgba(${rgb},0.34)`, background: `rgba(${rgb},0.12)`, color: t.accent, padding: '8px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Preset speichern</button>
              <button onClick={exportTheme} style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'inherit', padding: '8px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Export JSON</button>
            </div>
          ) : null}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={module}
            initial={motionRuntime.pageInitial || { opacity: 0, y: 8, scale: 0.996 }}
            animate={motionRuntime.pageAnimate}
            exit={motionRuntime.pageExit || { opacity: 0, y: -6, scale: 1.004 }}
            transition={motionRuntime.pageTransition}
            style={{ maxWidth: 920, margin: '0 auto' }}
          >
            {module === 'appearance' ? (
              <>
                <ModuleCard title="Quick Presets" desc="Weniger Micromanagement, mehr klare Ergebnisse">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 8 }}>
                    {EXPERIENCE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          preset.apply(t)
                          toast(`Preset aktiv: ${preset.title}`)
                        }}
                        style={{
                          textAlign: 'left',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                          padding: '10px 11px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{preset.title}</div>
                        <div style={{ fontSize: 11, opacity: 0.62, marginTop: 2 }}>{preset.desc}</div>
                      </button>
                    ))}
                  </div>
                </ModuleCard>

                <ModuleCard title="Theme Library" desc="Jedes Theme zeigt Farbe vor dem Anwenden">
                  <ThemeLibraryGrid
                    onApply={(name) => {
                      t.preset(name)
                      toast(`Theme aktiv: ${name}`)
                    }}
                  />
                </ModuleCard>

                <ModuleCard title="Brand Colors & Mode">
                  <Row>
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.62, marginBottom: 6 }}>Accent</div>
                      <input type="color" value={t.accent} onChange={(event) => t.setColors({ accent: event.target.value })} style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.62, marginBottom: 6 }}>Accent 2</div>
                      <input type="color" value={t.accent2} onChange={(event) => t.setColors({ accent2: event.target.value })} style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent' }} />
                    </div>
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Segmented
                        label="Color Mode"
                        value={t.mode}
                        options={['dark', 'light']}
                        onChange={(mode) => t.setMode(mode as 'dark' | 'light')}
                      />
                      <button
                        onClick={() => t.setColors({ accent: t.accent2, accent2: t.accent })}
                        style={{
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.04)',
                          color: 'inherit',
                          padding: '8px 10px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          alignSelf: 'end',
                        }}
                      >
                        Accent tauschen
                      </button>
                    </Row>
                  </div>
                </ModuleCard>

                <ModuleCard title="Typography">
                  <FontLibrary
                    value={t.globalFont}
                    onChange={(font) => t.setGlobalFont(font)}
                  />
                  <div style={{ marginTop: 10 }}>
                    <Row>
                      <Slider
                        label="UI Font Size"
                        value={t.qol.fontSize}
                        min={12}
                        max={18}
                        step={1}
                        unit="px"
                        onChange={(value) => t.setQOL({ fontSize: value })}
                      />
                      <Segmented
                        label="Editor Font"
                        value={t.editor.fontFamily}
                        options={['monospace', 'Fira Code', 'Menlo', 'Consolas', 'JetBrains Mono']}
                        onChange={(font) => t.setEditor({ fontFamily: font })}
                      />
                    </Row>
                  </div>
                </ModuleCard>
              </>
            ) : null}

            {module === 'panel' ? (
              <>
                <ModuleCard title="Panel Renderer" desc="Nur passende Controls werden angezeigt">
                  <Segmented
                    label="Panel Background"
                    value={panelRenderer}
                    options={['blur', 'fake-glass', 'glass-shader']}
                    onChange={(mode) => t.setGlassmorphism({ panelRenderer: mode as RendererMode } as any)}
                  />
                  <div style={{ height: 10 }} />
                  <Segmented
                    label="Glow Renderer"
                    value={glowRenderer}
                    options={['css', 'three']}
                    onChange={(mode) => t.setGlassmorphism({ glowRenderer: mode as GlowRendererMode } as any)}
                  />
                </ModuleCard>

                {panelRenderer === 'blur' ? (
                  <ModuleCard title="Blur Renderer Controls">
                    <Row>
                      <Slider label="Panel Blur" value={t.blur.panelBlur} min={4} max={40} step={1} unit="px" onChange={(value) => t.setBlur({ panelBlur: value })} />
                      <Slider label="Sidebar Blur" value={t.blur.sidebarBlur} min={4} max={40} step={1} unit="px" onChange={(value) => t.setBlur({ sidebarBlur: value })} />
                    </Row>
                  </ModuleCard>
                ) : null}

                {panelRenderer === 'fake-glass' ? (
                  <ModuleCard title="Fake Glass Controls">
                    <Row>
                      <Slider label="Border Opacity" value={t.glassmorphism.borderOpacity} min={0.05} max={0.6} step={0.01} onChange={(value) => t.setGlassmorphism({ borderOpacity: value })} />
                      <Slider label="Tint Opacity" value={t.glassmorphism.tintOpacity} min={0} max={0.3} step={0.01} onChange={(value) => t.setGlassmorphism({ tintOpacity: value })} />
                    </Row>
                  </ModuleCard>
                ) : null}

                {panelRenderer === 'glass-shader' ? (
                  <ModuleCard title="Glass Shader Controls">
                    <Row>
                      <Slider label="Glass Depth" value={(t.glassmorphism as any).glassDepth ?? 1} min={0.2} max={2} step={0.05} unit="x" onChange={(value) => t.setGlassmorphism({ glassDepth: value } as any)} />
                      <Slider label="Saturation" value={t.glassmorphism.saturation} min={90} max={260} step={5} unit="%" onChange={(value) => t.setGlassmorphism({ saturation: value })} />
                    </Row>
                    <div style={{ marginTop: 8 }}>
                      <Toggle label="Reflection Line" checked={Boolean((t.glassmorphism as any).reflectionLine)} onChange={(next) => t.setGlassmorphism({ reflectionLine: next } as any)} />
                    </div>
                  </ModuleCard>
                ) : null}

                <ModuleCard title="Glow">
                  <Row>
                    <Slider label="Glow Intensity" value={t.glow.intensity} min={0} max={1.4} step={0.02} onChange={(value) => t.setGlow({ intensity: value })} />
                    <Slider label="Glow Radius" value={t.glow.radius} min={0} max={44} step={1} unit="px" onChange={(value) => t.setGlow({ radius: value })} />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Toggle label="Gradient Glow" checked={t.glow.gradientGlow} onChange={(next) => t.setGlow({ gradientGlow: next })} />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Segmented
                        label="Glow Mode"
                        value={t.glow.mode}
                        options={['outline', 'ambient', 'gradient', 'focus', 'pulse', 'off']}
                        onChange={(mode) => t.setGlow({ mode: mode as any })}
                      />
                      <Toggle label="Animated Glow" checked={Boolean(t.glow.animated)} onChange={(next) => t.setGlow({ animated: next })} />
                    </Row>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <div>
                        <div style={{ fontSize: 11, opacity: 0.62, marginBottom: 6 }}>Glow Color A</div>
                        <input type="color" value={t.glow.gradientColor1} onChange={(event) => t.setGlow({ gradientColor1: event.target.value, color: event.target.value })} style={{ width: '100%', height: 36, borderRadius: 9, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, opacity: 0.62, marginBottom: 6 }}>Glow Color B</div>
                        <input type="color" value={t.glow.gradientColor2} onChange={(event) => t.setGlow({ gradientColor2: event.target.value })} style={{ width: '100%', height: 36, borderRadius: 9, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent' }} />
                      </div>
                    </Row>
                  </div>
                </ModuleCard>

                <ModuleCard title="Background">
                  <Segmented
                    label="Background Mode"
                    value={t.background.mode}
                    options={['solid', 'gradient', 'animated-gradient', 'mesh', 'aurora', 'noise']}
                    onChange={(mode) => t.setBackgroundMode(mode as BgMode)}
                  />
                </ModuleCard>
              </>
            ) : null}

            {module === 'layout' ? (
              <>
                <ModuleCard title="Sidebar">
                  <Row>
                    <Segmented label="Style" value={(t as any).sidebarStyle ?? 'default'} options={['default', 'floating', 'minimal', 'rail', 'hidden']} onChange={(value) => (t as any).setSidebarStyle?.(value)} />
                    <Segmented label="Position" value={(t as any).sidebarPosition ?? 'left'} options={['left', 'right']} onChange={(value) => (t as any).setSidebarPosition?.(value)} />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Slider label="Sidebar Width" value={t.sidebarWidth} min={64} max={380} step={8} unit="px" onChange={(value) => t.setSidebarWidth(value)} />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Toggle label="Show Labels" checked={Boolean((t as any).sidebarLabels ?? true)} onChange={(next) => (t as any).setSidebarLabels?.(next)} />
                      <Toggle label="Sidebar Auto Hide" checked={Boolean(t.qol?.sidebarAutoHide)} onChange={(next) => t.setSidebarAutoHide(next)} />
                    </Row>
                  </div>
                </ModuleCard>

                <ModuleCard title="Toolbar">
                  <Row>
                    <Segmented label="Mode" value={t.toolbar?.toolbarMode ?? 'island'} options={['island', 'spotlight', 'full-width']} onChange={(value) => t.setToolbar({ toolbarMode: value as any })} />
                    <Segmented label="Position" value={t.toolbar?.position ?? 'bottom'} options={['bottom', 'top']} onChange={(value) => t.setToolbar({ position: value as any })} />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Toggle label="Toolbar Visible" checked={t.toolbar?.visible ?? true} onChange={(next) => t.setToolbar({ visible: next })} />
                      <Toggle label="High Contrast" checked={Boolean(t.qol?.highContrast)} onChange={(next) => t.setQOL({ highContrast: next })} />
                    </Row>
                  </div>
                </ModuleCard>

                <ModuleCard title="Density & Radius">
                  <Row>
                    <Segmented label="Panel Density" value={t.qol?.panelDensity ?? 'comfortable'} options={['comfortable', 'compact', 'spacious']} onChange={(value) => t.setQOL({ panelDensity: value as any })} />
                    <Toggle label="Quick Actions" checked={Boolean(t.qol?.quickActions)} onChange={(next) => t.setQOL({ quickActions: next })} />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Slider label="Panel Radius" value={t.visual.panelRadius} min={0} max={32} step={1} unit="px" onChange={(value) => t.setVisual({ panelRadius: value })} />
                      <Slider label="Shadow Depth" value={t.visual.shadowDepth} min={0} max={1} step={0.05} onChange={(value) => t.setVisual({ shadowDepth: value })} />
                    </Row>
                  </div>
                </ModuleCard>
              </>
            ) : null}

            {module === 'motion' ? (
              <>
                <ModuleCard title="Motion Profiles" desc="Neue Motion Engine ersetzt alten Motion-Tab vollständig">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
                    {MOTION_PROFILES.map((profile) => {
                      const active = (t.qol?.motionProfile ?? 'balanced') === profile.id
                      return (
                        <button
                          key={profile.id}
                          onClick={() => {
                            applyMotionProfile(t, profile.id)
                            toast(`Motion: ${profile.label}`)
                          }}
                          style={{
                            textAlign: 'left',
                            borderRadius: 12,
                            border: `1px solid ${active ? `rgba(${rgb},0.34)` : 'rgba(255,255,255,0.12)'}`,
                            background: active ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.04)',
                            color: active ? t.accent : 'inherit',
                            padding: '10px 11px',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 800 }}>{profile.label}</div>
                          <div style={{ fontSize: 10, opacity: 0.62, marginTop: 2 }}>{profile.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </ModuleCard>

                <ModuleCard title="Fine Tuning">
                  <Row>
                    <Slider label="Animation Speed" value={t.visual.animationSpeed} min={0.7} max={1.7} step={0.05} unit="x" onChange={(value) => t.setVisual({ animationSpeed: value })} />
                    <Segmented label="Entry Style" value={(t.animations as any).entranceStyle ?? 'fade'} options={['fade', 'slide', 'scale']} onChange={(value) => t.setAnimations({ entranceStyle: value as any })} />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Toggle label="Page Transitions" checked={Boolean(t.animations.pageTransitions)} onChange={(next) => t.setAnimations({ pageTransitions: next })} />
                      <Toggle label="Hover Lift" checked={Boolean(t.animations.hoverLift)} onChange={(next) => t.setAnimations({ hoverLift: next })} />
                    </Row>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Toggle label="Ripple Click" checked={Boolean(t.animations.rippleClick)} onChange={(next) => t.setAnimations({ rippleClick: next })} />
                      <Toggle label="Reduce Motion" checked={Boolean(t.qol?.reducedMotion)} onChange={(next) => t.setQOL({ reducedMotion: next })} />
                    </Row>
                  </div>
                </ModuleCard>
              </>
            ) : null}

            {module === 'editor' ? (
              <>
                <ModuleCard title="Code Editor">
                  <Row>
                    <Slider label="Font Size" value={t.editor.fontSize} min={10} max={22} step={1} unit="px" onChange={(value) => t.setEditor({ fontSize: value })} />
                    <Slider label="Tab Size" value={t.editor.tabSize} min={2} max={8} step={1} onChange={(value) => t.setEditor({ tabSize: value })} />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Toggle label="Word Wrap" checked={Boolean(t.editor.wordWrap)} onChange={(next) => t.setEditor({ wordWrap: next })} />
                      <Toggle label="Line Numbers" checked={Boolean(t.editor.lineNumbers)} onChange={(next) => t.setEditor({ lineNumbers: next })} />
                    </Row>
                  </div>
                </ModuleCard>

                <ModuleCard title="Notes">
                  <Row>
                    <Slider label="Notes Font" value={t.notes.fontSize} min={10} max={24} step={1} unit="px" onChange={(value) => t.setNotes({ fontSize: value })} />
                    <Slider label="Line Height" value={t.notes.lineHeight} min={1} max={2.4} step={0.1} unit="em" onChange={(value) => t.setNotes({ lineHeight: value })} />
                  </Row>
                </ModuleCard>

                <ModuleCard title="Accessibility">
                  <Row>
                    <Toggle label="Auto Accent Contrast" checked={Boolean((t.qol as any)?.autoAccentContrast ?? true)} onChange={(next) => t.setQOL({ autoAccentContrast: next } as any)} />
                    <Toggle label="Tooltips" checked={Boolean(t.qol?.showTooltips)} onChange={(next) => t.setQOL({ showTooltips: next })} />
                  </Row>
                </ModuleCard>
              </>
            ) : null}

            {module === 'workspace' ? (
              <>
                <ModuleCard title="Spotlight" desc="Command Center Wartung">
                  <Row>
                    <button onClick={() => {
                      window.dispatchEvent(new CustomEvent('nx-open-spotlight', { detail: { query: '' } }))
                    }} style={{ borderRadius: 11, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '10px 11px', cursor: 'pointer', color: 'inherit', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}><Command size={13} /> Spotlight öffnen</button>
                    <button onClick={clearSpotlight} style={{ borderRadius: 11, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '10px 11px', cursor: 'pointer', color: 'inherit', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}><RotateCcw size={13} /> Spotlight Cache löschen</button>
                  </Row>
                </ModuleCard>

                <ModuleCard title="Terminal Workspace">
                  <button onClick={clearTerminalWorkspace} style={{ borderRadius: 11, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '10px 11px', cursor: 'pointer', color: 'inherit', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}><TerminalSquare size={13} /> Terminal Verlauf & Makros zurücksetzen</button>
                </ModuleCard>

                <ModuleCard title="Layouts">
                  <button onClick={resetDashboardLayout} style={{ borderRadius: 11, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '10px 11px', cursor: 'pointer', color: 'inherit', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}><LayoutGrid size={13} /> Dashboard Layout zurücksetzen</button>
                </ModuleCard>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  )
}
