import React, { useState, useEffect, useMemo } from 'react'
import { Download, Upload, RotateCcw, Moon, Sun, Plus, X, Save, Search, TerminalSquare, Command } from 'lucide-react'
import { Glass } from '../components/Glass'
import { useTheme, PRESETS, GlowMode, GLOBAL_FONTS, BgMode } from '../store/themeStore'
import { useTerminal } from '../store/terminalStore'
import { hexToRgb } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Primitive controls ───────────────────────────────────────────

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 24px' }}>{children}</div>
}

function Divider({ label }: { label?: string }) {
  const t = useTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 12px' }}>
      <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.08)' }}/>
      {label && <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.38, textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>{label}</span>}
      <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.08)' }}/>
    </div>
  )
}

function Slider({ label, value, min, max, step = 1, unit = '', onChange, desc }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; desc?: string
}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
        <label style={{ fontSize: 12, opacity: 0.72, userSelect: 'none' }}>{label}</label>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, fontFamily: 'monospace', minWidth: 48, textAlign: 'right' }}>
          {(value % 1 !== 0) ? value.toFixed(step >= 0.1 ? 1 : 2) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', height: 4, borderRadius: 2, appearance: 'none', background: `linear-gradient(to right, ${t.accent} ${pct}%, rgba(${hexToRgb(t.mode === 'dark' ? '#ffffff' : '#000000')},0.14) ${pct}%)`, outline: 'none', cursor: 'pointer' }} />
      {desc && <p style={{ fontSize: 10, opacity: 0.36, marginTop: 4, lineHeight: 1.5 }}>{desc}</p>}
    </div>
  )
}

function Toggle({ label, checked, onChange, desc }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; desc?: string
}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 13 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, opacity: 0.78, lineHeight: 1.4 }}>{label}</div>
        {desc && <div style={{ fontSize: 10, opacity: 0.36, marginTop: 2, lineHeight: 1.45 }}>{desc}</div>}
      </div>
      <button onClick={() => onChange(!checked)} style={{
        width: 42, height: 23, borderRadius: 12, flexShrink: 0, border: 'none',
        background: checked ? t.accent : 'rgba(255,255,255,0.15)',
        cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease',
        boxShadow: checked ? `0 0 12px rgba(${rgb},0.45), 0 2px 6px rgba(${rgb},0.3)` : '0 1px 3px rgba(0,0,0,0.3)',
        marginTop: 1,
      }}>
        <div style={{
          position: 'absolute', top: 3, width: 17, height: 17, borderRadius: '50%',
          background: '#fff', left: checked ? 22 : 3,
          transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
        }} />
      </button>
    </div>
  )
}

function Chips({ label, options, value, onChange }: {
  label?: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  return (
    <div style={{ marginBottom: 13 }}>
      {label && <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.45, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 }}>{label}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {options.map(o => (
          <button key={o} onClick={() => onChange(o)} style={{
            padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
            textTransform: 'capitalize', border: `1px solid ${value === o ? t.accent : 'rgba(255,255,255,0.1)'}`,
            background: value === o ? `rgba(${rgb},0.18)` : 'rgba(255,255,255,0.04)',
            color: value === o ? t.accent : 'inherit',
            boxShadow: value === o ? `0 0 10px rgba(${rgb},0.25)` : 'none',
            transition: 'all 0.14s ease',
          }}>{o}</button>
        ))}
      </div>
    </div>
  )
}

function Swatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [hex, setHex] = useState(value)
  useEffect(() => setHex(value), [value])
  const commit = (v: string) => { if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v) }
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.45, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 44, height: 38, borderRadius: 10, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.15)', padding: 2, flexShrink: 0 }} />
        <input value={hex} onChange={e => setHex(e.target.value)} onBlur={() => commit(hex)} onKeyDown={e => e.key === 'Enter' && commit(hex)}
          style={{ flex: 1, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 12, fontFamily: 'monospace', color: 'inherit' }} />
        <div style={{ width: 32, height: 32, borderRadius: 8, background: value, boxShadow: `0 0 10px ${value}88`, border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }} />
      </div>
    </div>
  )
}

function GradStops({ stops, onChange }: { stops: any[]; onChange: (s: any[]) => void }) {
  const t = useTheme()
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.45, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Color Stops</div>
      {stops.map((stop, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <input type="color" value={stop.color} onChange={e => { const n=[...stops]; n[i]={...n[i],color:e.target.value}; onChange(n) }}
            style={{ width: 30, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', padding: 2, cursor: 'pointer', flexShrink: 0 }} />
          <input type="range" min={0} max={100} value={stop.position} onChange={e => { const n=[...stops]; n[i]={...n[i],position:+e.target.value}; onChange(n) }}
            style={{ flex: 1 }} />
          <span style={{ width: 32, textAlign: 'right', fontSize: 10, fontFamily: 'monospace', opacity: 0.5 }}>{stop.position}%</span>
          {stops.length > 2 && (
            <button onClick={() => onChange(stops.filter((_,j)=>j!==i))}
              style={{ background:'none',border:'none',cursor:'pointer',color:'#ff453a',opacity:0.6,padding:'2px 3px',borderRadius:4,display:'flex',alignItems:'center' }}>
              <X size={10}/>
            </button>
          )}
        </div>
      ))}
      {stops.length < 5 && (
        <button onClick={() => onChange([...stops, { color: t.accent2, position: Math.min((stops[stops.length-1]?.position||0)+20,100), opacity:1 }])}
          style={{ background:'none',border:'none',cursor:'pointer',color:t.accent,fontSize:11,opacity:0.7,display:'flex',alignItems:'center',gap:5,padding:'3px 0' }}>
          <Plus size={11}/> Stop hinzufügen
        </button>
      )}
    </div>
  )
}

// ─── Preview panel ────────────────────────────────────────────────
function LivePreview() {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const rgb2 = hexToRgb(t.accent2)
  return (
    <div style={{ padding: 16, borderRadius: 14, background: t.bg, border: `1px solid rgba(${rgb},0.2)`, marginBottom: 18, position: 'relative', overflow: 'hidden' }}>
      {/* Glow bloom in corner */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, rgba(${rgb},0.2), transparent)`, filter: 'blur(25px)', pointerEvents: 'none' }}/>
      <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.35, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Live Preview</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {/* Panel A — glass */}
        <div style={{ flex: 1, padding: '12px 14px', borderRadius: t.visual.panelRadius, background: `rgba(${rgb},0.1)`, border: `1px solid rgba(${rgb},0.25)`, backdropFilter: `blur(${t.blur.panelBlur}px) saturate(${t.glassmorphism.saturation}%)`, boxShadow: t.glow.gradientGlow ? `0 0 ${t.glow.radius}px rgba(${rgb},${t.glow.intensity*0.4})` : undefined }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, marginBottom: 5, fontFamily: t.globalFont }}>Panel A</div>
          <div style={{ height: 4, borderRadius: 2, background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})`, width: '75%', marginBottom: 5 }}/>
          <div style={{ fontSize: 10, opacity: 0.45, fontFamily: t.globalFont }}>Sample text</div>
        </div>
        {/* Panel B — default */}
        <div style={{ flex: 1, padding: '12px 14px', borderRadius: t.visual.panelRadius, background: t.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.82)', border: `1px solid rgba(255,255,255,${t.glassmorphism.borderOpacity})`, backdropFilter: `blur(${t.blur.panelBlur}px)` }}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, marginBottom: 5, fontFamily: t.globalFont }}>Panel B</div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', width: '55%', marginBottom: 5 }}/>
          <div style={{ fontSize: 10, opacity: 0.45, fontFamily: t.globalFont }}>Sample text</div>
        </div>
      </div>
      {/* Buttons row */}
      <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
        <button style={{ padding: '6px 16px', borderRadius: 8, background: t.accent, border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'default', boxShadow: `0 2px 12px rgba(${rgb},0.45)`, fontFamily: t.globalFont }}>Primary</button>
        <button style={{ padding: '6px 16px', borderRadius: 8, background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.3)`, color: t.accent, fontSize: 11, fontWeight: 700, cursor: 'default', fontFamily: t.globalFont }}>Ghost</button>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', gap: 5 }}>
          {[t.accent, t.accent2, '#30d158', '#ff9f0a', '#ff453a'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}` }}/>
          ))}
        </div>
        <span style={{ fontSize: 10, opacity: 0.35, fontFamily: t.globalFont }}>Aa Bb 123</span>
      </div>
    </div>
  )
}

// ─── Preset cards ─────────────────────────────────────────────────
const PMETA: Record<string,{a:string;a2:string;bg:string}> = {
  'macOS Dark':  {a:'#007AFF',a2:'#5E5CE6',bg:'#1a1a2e'},
  'Neon Ultra':  {a:'#00FFAA',a2:'#FF00FF',bg:'#0a0a14'},
  'Ocean Wave':  {a:'#00AAFF',a2:'#00DDCC',bg:'#0a1929'},
  'Light Clean': {a:'#007AFF',a2:'#5E5CE6',bg:'#f5f5f7'},
  'Cyberpunk':   {a:'#FFE600',a2:'#FF2D78',bg:'#07080f'},
  'SuBset Glow': {a:'#FF6B35',a2:'#FF2D78',bg:'#1a0a0f'},
  'Forest Dark': {a:'#30D158',a2:'#64D2FF',bg:'#0b1a10'},
  'Deep Space':  {a:'#BF5AF2',a2:'#64D2FF',bg:'#060614'},
  'Rose Gold':   {a:'#FF6B9E',a2:'#FFB3C8',bg:'#1a0d12'},
  'Arctic':      {a:'#007AFF',a2:'#5E5CE6',bg:'#eef4ff'},
  'Dracula':     {a:'#BD93F9',a2:'#FF79C6',bg:'#282a36'},
  'Void':        {a:'#ffffff',a2:'#888888',bg:'#000000'},
  'Sakura':      {a:'#E91E8C',a2:'#FF6B6B',bg:'#fff5f8'},
}

function PresetBtn({ name, onClick }: {name:string;onClick:()=>void}) {
  const m = PMETA[name]||{a:'#007AFF',a2:'#5E5CE6',bg:'#1a1a2e'}
  const [h,setH]=useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{
      background: m.bg, padding: 10, borderRadius: 12, cursor: 'pointer', border: '2px solid transparent',
      boxShadow: h ? `0 8px 28px rgba(0,0,0,0.45), 0 0 16px ${m.a}50` : '0 2px 8px rgba(0,0,0,0.3)',
      transform: h ? 'translateY(-2px) scale(1.04)' : 'scale(1)',
      transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      position: 'relative', overflow: 'hidden', minHeight: 68, textAlign: 'left',
    }}>
      <div style={{position:'absolute',inset:0,background:`linear-gradient(135deg,${m.a}20,${m.a2}10)`}}/>
      <div style={{position:'relative'}}>
        <div style={{fontSize:10,fontWeight:800,color:m.a,marginBottom:5}}>{name}</div>
        <div style={{display:'flex',gap:4}}>
          <div style={{width:12,height:12,borderRadius:'50%',background:m.a,boxShadow:`0 0 6px ${m.a}`}}/>
          <div style={{width:12,height:12,borderRadius:'50%',background:m.a2,boxShadow:`0 0 6px ${m.a2}`}}/>
          <div style={{width:12,height:12,borderRadius:3,background:`linear-gradient(135deg,${m.a},${m.a2})`}}/>
        </div>
      </div>
    </button>
  )
}

// ─── Tab types ────────────────────────────────────────────────────
const TABS = [
  { id:'theme',      em:'🎨', label:'Theme'      },
  { id:'glass',      em:'🪟', label:'Panel Background' },
  { id:'glow',       em:'✨', label:'Glow'       },
  { id:'background', em:'🖼', label:'Background' },
  { id:'layout',     em:'📐', label:'Layout'     },
  { id:'workspace',  em:'🧰', label:'Workspace'  },
  { id:'animation',  em:'🎬', label:'Motion'     },
  { id:'editor',     em:'💻', label:'Editor'     },
] as const
type Tab = typeof TABS[number]['id']

const UX_PROFILES = [
  { id: 'focus', label: 'Focus', desc: 'Weniger Ablenkung, ruhige Motion' },
  { id: 'cinema', label: 'Cinematic', desc: 'Mehr Glow, mehr Tiefe, mehr Blur' },
  { id: 'compact', label: 'Compact', desc: 'Dichteres UI für mehr Content' },
] as const

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
export function SettingsView() {
  const t = useTheme()
  const terminal = useTerminal()
  const rgb = hexToRgb(t.accent)
  const [tab, setTab] = useState<Tab>('theme')
  const [tabSearch, setTabSearch] = useState('')
  const [msg, setMsg] = useState('')
  const [saved, setSaved] = useState<string[]>([])
  useEffect(()=>{ try{const r=localStorage.getItem('nx-saved-themes');if(r)setSaved(JSON.parse(r))}catch{} },[])
  const toast = (m: string) => { setMsg(m); setTimeout(()=>setMsg(''),2200) }

  const visibleTabs = useMemo(
    () => TABS.filter(tb => tb.label.toLowerCase().includes(tabSearch.toLowerCase())),
    [tabSearch]
  )

  useEffect(() => {
    if (!visibleTabs.find(tb => tb.id === tab)) {
      setTab((visibleTabs[0]?.id ?? 'theme') as Tab)
    }
  }, [visibleTabs, tab])

  const saveTheme = () => {
    const n=`Custom ${new Date().toLocaleTimeString()}`
    const d=JSON.stringify({accent:t.accent,accent2:t.accent2,bg:t.bg,glow:t.glow,blur:t.blur,background:t.background,glassmorphism:t.glassmorphism,visual:t.visual,animations:t.animations,globalFont:t.globalFont,mode:t.mode,sidebarWidth:t.sidebarWidth})
    localStorage.setItem(`nx-theme-${n}`,d)
    const u=[...saved,n]; setSaved(u); localStorage.setItem('nx-saved-themes',JSON.stringify(u))
    toast('Theme gespeichert!')
  }
  const exportTheme = () => {
    const d=JSON.stringify({accent:t.accent,accent2:t.accent2,bg:t.bg,glow:t.glow,blur:t.blur,background:t.background,glassmorphism:t.glassmorphism,visual:t.visual,animations:t.animations,globalFont:t.globalFont,mode:t.mode,sidebarWidth:t.sidebarWidth},null,2)
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([d],{type:'application/json'}));a.download='nexus-theme.json';a.click()
    toast('Exportiert!')
  }
  const importTheme = (file: File) => {
    const r=new FileReader()
    r.onload=()=>{
      try {
        const o=JSON.parse(r.result as string)
        if(o.accent) t.setColors({accent:o.accent,accent2:o.accent2,bg:o.bg})
        if(o.glow) t.setGlow(o.glow)
        if(o.blur) t.setBlur(o.blur)
        if(o.background) t.setBackground(o.background)
        if(o.glassmorphism) t.setGlassmorphism(o.glassmorphism)
        if(o.visual) t.setVisual(o.visual)
        if(o.animations) t.setAnimations(o.animations)
        if(o.globalFont) t.setGlobalFont(o.globalFont)
        if(o.mode) t.setMode(o.mode)
        if(o.sidebarWidth) t.setSidebarWidth(o.sidebarWidth)
        toast('Theme importiert!')
      } catch { toast('Ungültige Datei') }
    }
    r.readAsText(file)
  }

  const applyProfile = (profile: (typeof UX_PROFILES)[number]['id']) => {
    if (profile === 'focus') {
      t.setQOL({ reducedMotion: true, panelDensity: 'comfortable', quickActions: true })
      t.setAnimations({ pageTransitions: false, hoverLift: false, rippleClick: false, glowPulse: false })
      t.setVisual({ compactMode: false, shadowDepth: 0.28 })
      toast('Profil: Focus')
      return
    }

    if (profile === 'cinema') {
      t.setQOL({ reducedMotion: false, panelDensity: 'spacious', quickActions: true })
      t.setAnimations({ pageTransitions: true, hoverLift: true, rippleClick: true, glowPulse: true })
      t.setGlow({ intensity: 1.15, radius: 34, gradientGlow: true, animated: true })
      t.setBlur({ panelBlur: 26, modalBlur: 32, sidebarBlur: 24 })
      toast('Profil: Cinematic')
      return
    }

    t.setQOL({ panelDensity: 'compact', quickActions: true })
    t.setVisual({ compactMode: true, shadowDepth: 0.25, panelRadius: 12 })
    t.setAnimations({ hoverLift: true, pageTransitions: true, rippleClick: false })
    toast('Profil: Compact')
  }

  const openSpotlight = (query = '') => {
    window.dispatchEvent(new CustomEvent('nx-open-spotlight', { detail: { query } }))
  }

  const clearSpotlightData = () => {
    localStorage.removeItem('nx-spotlight-pins-v1')
    localStorage.removeItem('nx-spotlight-recents-v1')
    window.dispatchEvent(new CustomEvent('nx-spotlight-storage-updated'))
    toast('Spotlight-Verlauf zurückgesetzt')
  }

  const resetDashboardLayout = () => {
    localStorage.removeItem('nx-dashboard-layout-v2')
    toast('Dashboard-Layout zurückgesetzt')
  }

  const clearTerminalWorkspace = () => {
    terminal.clearHistory()
    useTerminal.setState({
      macros: {},
      recordingMacro: null,
      undoStack: [],
      redoStack: [],
    } as any)
    toast('Terminal-Workspace bereinigt')
  }

  return (
    <div className="nx-settings-shell" style={{display:'flex',height:'100%',overflow:'hidden',fontFamily:t.globalFont,minHeight:0}}>

      {/* ── Tab sidebar ── */}
      <div className="nx-settings-sidebar" style={{width:'clamp(224px, 24vw, 276px)',flexShrink:0,borderRight:'1px solid rgba(255,255,255,0.07)',background:'linear-gradient(180deg, rgba(0,0,0,0.24), rgba(0,0,0,0.16))',display:'flex',flexDirection:'column',padding:'14px 11px',gap:4,minHeight:0}}>
        <div style={{padding:'2px 6px 10px',borderBottom:'1px solid rgba(255,255,255,0.08)',marginBottom:8}}>
          <div style={{fontSize:10,fontWeight:800,opacity:0.34,textTransform:'uppercase',letterSpacing:1.1,marginBottom:4}}>Settings Hub</div>
          <div style={{fontSize:15,fontWeight:800,letterSpacing:'-0.02em'}}>Aussehen & Workflow</div>
          <div style={{fontSize:11,opacity:0.42,marginTop:2}}>Schnellprofile, Design und Editor-Verhalten</div>
        </div>

        <div style={{ position:'relative', marginBottom:6 }}>
          <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', opacity:0.4 }} />
          <input
            value={tabSearch}
            onChange={e=>setTabSearch(e.target.value)}
            placeholder="Tab suchen..."
            style={{ width:'100%', padding:'7px 10px 7px 30px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'inherit', fontSize:12, outline:'none' }}
          />
        </div>

        <div style={{fontSize:10,fontWeight:800,opacity:0.34,textTransform:'uppercase',letterSpacing:1, padding:'0 8px 4px'}}>UX Profile</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4,marginBottom:8}}>
          {UX_PROFILES.map(p => (
            <button
              key={p.id}
              onClick={()=>applyProfile(p.id)}
              title={p.desc}
              style={{
                padding:'7px 0',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',
                background:'rgba(255,255,255,0.05)',cursor:'pointer',fontSize:10,fontWeight:700,
                color:'inherit',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="nx-settings-tabs-scroll" style={{flex:1,minHeight:0,overflowY:'auto',display:'flex',flexDirection:'column',gap:2,paddingRight:4,paddingBottom:8}}>
          {visibleTabs.map(tb => {
            const active = tab===tb.id
            return (
              <button key={tb.id} onClick={()=>setTab(tb.id)} style={{
                display:'flex',alignItems:'center',gap:9,padding:'9px 10px',borderRadius:9,
                background:active?`rgba(${rgb},0.15)`:'transparent',
                border:`1px solid ${active?`rgba(${rgb},0.28)`:'transparent'}`,
                cursor:'pointer',color:active?t.accent:'inherit',
                fontSize:13,fontWeight:active?700:500,textAlign:'left',
                transition:'all 0.12s',
              }}
              onMouseEnter={e=>{if(!active)(e.currentTarget as any).style.background='rgba(255,255,255,0.06)'}}
              onMouseLeave={e=>{if(!active)(e.currentTarget as any).style.background='transparent'}}>
                <span style={{fontSize:15,flexShrink:0}}>{tb.em}</span>
                <span style={{opacity:active?1:0.75}}>{tb.label}</span>
              </button>
            )
          })}
          {!visibleTabs.length && (
            <div style={{fontSize:11,opacity:0.5,padding:'8px 10px'}}>Kein Tab gefunden</div>
          )}
        </div>

        <div style={{display:'flex',gap:5,marginBottom:8,paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.07)',background:'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.16))'}}>
          <button onClick={()=>t.setQOL({reducedMotion:!t.qol.reducedMotion})} style={{flex:1,padding:'6px 8px',borderRadius:8,border:`1px solid ${t.qol.reducedMotion?'rgba(255,159,10,0.35)':'rgba(255,255,255,0.1)'}`,background:t.qol.reducedMotion?'rgba(255,159,10,0.12)':'rgba(255,255,255,0.04)',cursor:'pointer',fontSize:10,color:t.qol.reducedMotion?'#ff9f0a':'inherit',fontWeight:700}}>
            Motion
          </button>
          <button onClick={()=>t.setQOL({highContrast:!t.qol.highContrast})} style={{flex:1,padding:'6px 8px',borderRadius:8,border:`1px solid ${t.qol.highContrast?'rgba(10,132,255,0.35)':'rgba(255,255,255,0.1)'}`,background:t.qol.highContrast?'rgba(10,132,255,0.12)':'rgba(255,255,255,0.04)',cursor:'pointer',fontSize:10,color:t.qol.highContrast?'#0a84ff':'inherit',fontWeight:700}}>
            Contrast
          </button>
          <button onClick={()=>t.setToolbar({visible:!(t.toolbar?.visible??true)})} style={{flex:1,padding:'6px 8px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',cursor:'pointer',fontSize:10,color:'inherit',fontWeight:700}}>
            Toolbar
          </button>
        </div>

        {/* Action buttons */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:10,display:'flex',flexDirection:'column',gap:5}}>
          <button onClick={saveTheme} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 10px',borderRadius:9,background:`rgba(${rgb},0.14)`,border:`1px solid rgba(${rgb},0.25)`,cursor:'pointer',color:t.accent,fontSize:12,fontWeight:700}}>
            <Save size={12}/> Theme speichern
          </button>
          <button onClick={exportTheme} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 10px',borderRadius:9,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',cursor:'pointer',color:'inherit',fontSize:11}}>
            <Download size={11}/> Export JSON
          </button>
          <label style={{display:'flex',alignItems:'center',gap:7,padding:'7px 10px',borderRadius:9,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',cursor:'pointer',fontSize:11}}>
            <Upload size={11}/> Import JSON
            <input type="file" accept=".json" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)importTheme(f)}}/>
          </label>
        </div>
        {msg && <div style={{fontSize:11,color:t.accent,textAlign:'center',padding:'5px 0',fontWeight:700,animation:'nexus-fade-in 0.2s both'}}>{msg}</div>}
      </div>

      {/* ── Content ── */}
      <div className="nx-settings-content" style={{flex:1,overflowY:'auto',padding:'16px clamp(14px,2.4vw,24px) 22px',minWidth:0}}>
        <div style={{maxWidth:860,margin:'0 auto'}}>
          <div style={{position:'sticky',top:0,zIndex:10,padding:'12px 14px',borderRadius:12,background:'rgba(18,20,30,0.58)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',border:'1px solid rgba(255,255,255,0.1)',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:10,opacity:0.42,textTransform:'uppercase',letterSpacing:1}}>Current Section</div>
              <div style={{fontSize:17,fontWeight:800,letterSpacing:'-0.02em'}}>{TABS.find(tb=>tb.id===tab)?.label ?? 'Theme'}</div>
            </div>
            <div style={{display:'flex',gap:8,fontSize:11,opacity:0.7}}>
              <span>Mode: <strong style={{color:t.accent}}>{t.mode}</strong></span>
              <span>Density: <strong>{t.qol?.panelDensity ?? 'comfortable'}</strong></span>
              <span>Blur: <strong>{t.blur.panelBlur}px</strong></span>
              <span>Panel: <strong>{(t.glassmorphism as any).panelRenderer ?? 'blur'}</strong></span>
            </div>
          </div>
          <LivePreview/>

          {/* ════════════════════════════════ THEME */}
          {tab==='theme' && <>
            {/* Dark / Light */}
            <div style={{display:'flex',gap:8,marginBottom:18}}>
              {(['dark','light'] as const).map(m=>(
                <button key={m} onClick={()=>t.setMode(m)} style={{
                  flex:1,padding:'10px',borderRadius:11,fontWeight:700,fontSize:13,cursor:'pointer',
                  background:t.mode===m?t.accent:'rgba(255,255,255,0.06)',
                  color:t.mode===m?'#fff':'inherit',border:'none',
                  boxShadow:t.mode===m?`0 2px 18px rgba(${rgb},0.45)`:'none',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all 0.2s',
                }}>
                  {m==='dark'?<Moon size={14}/>:<Sun size={14}/>} {m==='dark'?'Dark Mode':'Light Mode'}
                </button>
              ))}
            </div>

            <Divider label="Quick Settings"/>
            <Row>
              <Chips
                label="Layout Preset"
                options={['focus','cinema','compact']}
                value={t.qol?.panelDensity === 'compact' ? 'compact' : t.animations.glowPulse ? 'cinema' : 'focus'}
                onChange={(profile)=>applyProfile(profile as any)}
              />
              <Chips
                label="Panel Background"
                options={['blur','fake-glass','glass-shader']}
                value={(t.glassmorphism as any).panelRenderer ?? 'blur'}
                onChange={(renderer)=>t.setGlassmorphism({ panelRenderer: renderer } as any)}
              />
            </Row>
            <Row>
              <Chips
                label="Glow Renderer"
                options={['css','three']}
                value={(t.glassmorphism as any).glowRenderer ?? 'css'}
                onChange={(renderer)=>t.setGlassmorphism({ glowRenderer: renderer } as any)}
              />
              <Chips
                label="Visual Focus"
                options={['calm','balanced','vivid']}
                value={t.glow.intensity < 0.5 ? 'calm' : t.glow.intensity > 1 ? 'vivid' : 'balanced'}
                onChange={(mode)=>{
                  if (mode === 'calm') {
                    t.setGlow({ intensity: 0.35, radius: 14, animated: false })
                    t.setBlur({ panelBlur: Math.min(t.blur.panelBlur, 14), modalBlur: Math.min(t.blur.modalBlur, 18) })
                    return
                  }
                  if (mode === 'vivid') {
                    t.setGlow({ intensity: 1.1, radius: 30, animated: true, gradientGlow: true })
                    t.setBlur({ panelBlur: Math.max(t.blur.panelBlur, 20), modalBlur: Math.max(t.blur.modalBlur, 26) })
                    return
                  }
                  t.setGlow({ intensity: 0.72, radius: 22, animated: false })
                  t.setBlur({ panelBlur: 16, modalBlur: 22 })
                }}
              />
            </Row>

            {/* Presets */}
            <Divider label="Presets"/>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(125px,1fr))',gap:7,marginBottom:6}}>
              {PRESETS.map(name=><PresetBtn key={name} name={name} onClick={()=>t.preset(name)}/>)}
            </div>
            {saved.length>0 && <>
              <Divider label="Gespeichert"/>
              <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:6}}>
                {saved.map(n=>(
                  <button key={n} onClick={()=>{try{const d=JSON.parse(localStorage.getItem(`nx-theme-${n}`)!);importTheme(new File([JSON.stringify(d)],'x.json'))}catch{}}}
                    style={{padding:'5px 11px',borderRadius:8,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',cursor:'pointer',fontSize:11,color:'inherit'}}>
                    {n}
                  </button>
                ))}
              </div>
            </>}

            {/* Custom colors */}
            <Divider label="Farben"/>
            <Row>
              <Swatch label="Primary Accent" value={t.accent} onChange={v=>t.setColors({accent:v})}/>
              <Swatch label="Secondary Accent" value={t.accent2} onChange={v=>t.setColors({accent2:v})}/>
            </Row>
            <Swatch label="App Background" value={t.bg} onChange={v=>t.setColors({bg:v})}/>

            {/* Font */}
            <Divider label="Schriftart (gilt für alles)"/>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {GLOBAL_FONTS.map((f:any)=>(
                <button key={f.value} onClick={()=>t.setGlobalFont(f.value)} style={{
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'9px 14px',borderRadius:10,cursor:'pointer',
                  background:t.globalFont===f.value?`rgba(${rgb},0.14)`:'rgba(255,255,255,0.03)',
                  border:`1px solid ${t.globalFont===f.value?`rgba(${rgb},0.3)`:'rgba(255,255,255,0.07)'}`,
                  color:t.globalFont===f.value?t.accent:'inherit',transition:'all 0.12s',
                }}>
                  <span style={{fontSize:13,fontFamily:f.value,fontWeight:600}}>{f.label}</span>
                  <span style={{fontSize:12,fontFamily:f.value,opacity:0.38}}>Aa Bb Cc 123 !@#</span>
                </button>
              ))}
            </div>
          </>}

          {/* ════════════════════════════════ GLASS */}
          {tab==='glass' && <>
            {/* Glass mode visual picker */}
            <Divider label="Panel Rendering"/>
            <Row>
              <Chips
                label="Renderer"
                options={['blur','fake-glass','glass-shader']}
                value={(t.glassmorphism as any).panelRenderer ?? 'blur'}
                onChange={v=>t.setGlassmorphism({ panelRenderer: v } as any)}
              />
              <Chips
                label="Glow Renderer"
                options={['css','three']}
                value={(t.glassmorphism as any).glowRenderer ?? 'css'}
                onChange={v=>t.setGlassmorphism({ glowRenderer: v } as any)}
              />
            </Row>
            <Divider label="Glass Mode"/>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
              {(['default','frosted','crystal','neon','matte','mirror'] as const).map(mode=>{
                const active=((t.glassmorphism as any).glassMode??'default')===mode
                const icons:Record<string,string>={default:'🪟',frosted:'🌫️',crystal:'💎',neon:'⚡',matte:'🎭',mirror:'🪞',plasma:'🌊'}
                const descs:Record<string,string>={default:'Standard Glass',frosted:'Max Blur + Frost',crystal:'Top-Shine Overlay',neon:'Accent Ring-Glow',matte:'Kein Blur, Matt',mirror:'Reflektierend',plasma:'Animierter Wavy Blur'}
                return (
                  <button key={mode} onClick={()=>t.setGlassmorphism({glassMode:mode} as any)} style={{
                    padding:'14px 8px',borderRadius:11,cursor:'pointer',textAlign:'center',
                    background:active?`rgba(${rgb},0.16)`:'rgba(255,255,255,0.04)',
                    border:`1.5px solid ${active?t.accent:'rgba(255,255,255,0.1)'}`,
                    boxShadow:active?`0 0 20px rgba(${rgb},0.3),inset 0 0 24px rgba(${rgb},0.06)`:'none',
                    color:active?t.accent:'inherit',transition:'all 0.15s',
                  }}>
                    <div style={{fontSize:22,marginBottom:6}}>{icons[mode]}</div>
                    <div style={{fontSize:11,fontWeight:800,textTransform:'capitalize',marginBottom:3}}>{mode}</div>
                    <div style={{fontSize:9,opacity:0.4,lineHeight:1.4}}>{descs[mode]}</div>
                    {active&&<div style={{fontSize:9,color:t.accent,marginTop:4,fontWeight:700}}>✓ Aktiv</div>}
                  </button>
                )
              })}
            </div>

            <Divider label="Blur & Sättigung"/>
            <Row>
              <Slider label="Panel Blur" value={t.blur.panelBlur} min={0} max={60} step={2} unit="px" onChange={v=>t.setBlur({panelBlur:v})} desc="Backdrop-Blur der Hauptpanels"/>
              <Slider label="Sidebar Blur" value={t.blur.sidebarBlur} min={0} max={60} step={2} unit="px" onChange={v=>t.setBlur({sidebarBlur:v})}/>
            </Row>
            <Row>
              <Slider label="Modal Blur" value={t.blur.modalBlur} min={0} max={60} step={2} unit="px" onChange={v=>t.setBlur({modalBlur:v})}/>
              <Slider label="Saturation" value={t.glassmorphism.saturation} min={80} max={400} step={10} unit="%" onChange={v=>t.setGlassmorphism({saturation:v})} desc="Höher = bunter hinter Glas"/>
            </Row>

            <Divider label="Border & Tint"/>
            <Row>
              <Slider label="Border Opacity" value={t.glassmorphism.borderOpacity} min={0} max={0.8} step={0.01} onChange={v=>t.setGlassmorphism({borderOpacity:v})} desc="Transparenz der Panelkante"/>
              <Slider label="Glass Depth" value={(t.glassmorphism as any).glassDepth??0.5} min={0} max={1} step={0.05} onChange={v=>t.setGlassmorphism({glassDepth:v} as any)} desc="Tiefeneffekt der Glasschicht"/>
            </Row>
            <Swatch label="Tint-Farbe" value={t.glassmorphism.tintColor} onChange={v=>t.setGlassmorphism({tintColor:v})}/>
            <Slider label="Tint Opacity" value={t.glassmorphism.tintOpacity} min={0} max={0.3} step={0.005} onChange={v=>t.setGlassmorphism({tintOpacity:v})} desc="0 = kein Tint. Erhöhen für eingefärbte Panels."/>

            <Divider label="Effekte"/>
            <Row>
              <Toggle label="Frosted Glass" checked={t.glassmorphism.frostedGlass} onChange={v=>t.setGlassmorphism({frostedGlass:v})} desc="Stärkere Frost-Optik (erzwingt ≥28px Blur)"/>
              <Toggle label="Inner Shadow" checked={(t.glassmorphism as any).innerShadow??false} onChange={v=>t.setGlassmorphism({innerShadow:v} as any)} desc="Eingebetteter Schatten für Tiefe"/>
            </Row>
            <Row>
              <Toggle label="Reflection Line" checked={(t.glassmorphism as any).reflectionLine??false} onChange={v=>t.setGlassmorphism({reflectionLine:v} as any)} desc="Subtile Glanz-Linie oben"/>
              <Toggle label="Border Glow" checked={t.glassmorphism.borderGlow} onChange={v=>t.setGlassmorphism({borderGlow:v})} desc="Accent-Leuchten an Kanten"/>
            </Row>
            {t.glassmorphism.borderGlow && <Slider label="Border Glow Intensität" value={t.glassmorphism.borderGlowIntensity} min={0} max={1} step={0.05} onChange={v=>t.setGlassmorphism({borderGlowIntensity:v})}/>}
            <Row>
              <Toggle label="Noise Overlay" checked={t.blur.noiseOverlay} onChange={v=>t.setBlur({noiseOverlay:v})} desc="Film-Grain-Textur über Panels"/>
              <Toggle label="Chromatic Aberration" checked={t.glassmorphism.chromaticAberration} onChange={v=>t.setGlassmorphism({chromaticAberration:v})} desc="RGB-Split-Effekt"/>
            </Row>
            {t.blur.noiseOverlay && <Slider label="Noise Stärke" value={t.blur.noiseOpacity} min={0.005} max={0.15} step={0.005} onChange={v=>t.setBlur({noiseOpacity:v})}/>}
          </>}

          {/* ════════════════════════════════ GLOW */}
          {tab==='glow' && <>
            {/* Live glow preview */}
            <div style={{padding:18,borderRadius:14,position:'relative',overflow:'hidden',background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.08)',marginBottom:16,minHeight:80}}>
              <div style={{position:'absolute',inset:0,background:`conic-gradient(from ${t.glow.gradientAngle}deg, ${t.glow.gradientColor1||t.accent}, ${t.glow.gradientColor2||t.accent2}, ${t.glow.gradientColor1||t.accent})`,filter:`blur(${Math.max(t.glow.radius,12)}px)`,opacity:Math.min(t.glow.intensity*0.7,1)}}/>
              <div style={{position:'relative',textAlign:'center',fontSize:13,fontWeight:700}}>✨ Glow Preview · {t.glow.mode}</div>
              <div style={{position:'relative',textAlign:'center',fontSize:11,opacity:0.5,marginTop:4}}>{t.glow.gradientColor1||t.accent} → {t.glow.gradientColor2||t.accent2}</div>
            </div>

            <Chips label="Glow Modus" options={['ambient','outline','focus','gradient','pulse','off']} value={t.glow.mode} onChange={v=>t.setGlow({mode:v as GlowMode})}/>
            <Row>
              <Toggle label="Gradient Glow aktivieren" checked={t.glow.gradientGlow} onChange={v=>t.setGlow({gradientGlow:v})} desc="Mehrfarbiger Gradient-Rand — muss AN sein"/>
              <Toggle label="Rotierende Animation" checked={t.glow.animated} onChange={v=>t.setGlow({animated:v})} desc="Gradient dreht sich kontinuierlich"/>
            </Row>
            {t.glow.animated && <Slider label="Rotationsgeschwindigkeit" value={t.glow.animationSpeed} min={0.1} max={5} step={0.1} unit="x" onChange={v=>t.setGlow({animationSpeed:v})}/>}

            <Divider label="Farben"/>
            <Row>
              <Swatch label="Glow Farbe 1" value={t.glow.gradientColor1||t.accent} onChange={v=>t.setGlow({gradientColor1:v,color:v})}/>
              <Swatch label="Glow Farbe 2" value={t.glow.gradientColor2||t.accent2} onChange={v=>t.setGlow({gradientColor2:v})}/>
            </Row>

            <Divider label="Intensität"/>
            <Slider label="Intensität" value={t.glow.intensity} min={0} max={2} step={0.05} onChange={v=>t.setGlow({intensity:v})} desc="Wie stark das Leuchten erscheint"/>
            <Row>
              <Slider label="Radius" value={t.glow.radius} min={0} max={80} step={2} unit="px" onChange={v=>t.setGlow({radius:v})}/>
              <Slider label="Spread" value={t.glow.spread} min={0} max={30} step={1} unit="px" onChange={v=>t.setGlow({spread:v})}/>
            </Row>
            <Row>
              <Slider label="Gradient Winkel" value={t.glow.gradientAngle} min={0} max={360} step={15} unit="°" onChange={v=>t.setGlow({gradientAngle:v})}/>
              <Chips label="Blend Mode" options={['normal','screen','overlay','multiply']} value={t.glow.blendMode} onChange={v=>t.setGlow({blendMode:v as any})}/>
            </Row>
          </>}

          {/* ════════════════════════════════ BACKGROUND */}
          {tab==='background' && <>
            {/* App bg preview */}
            <div style={{height:58,borderRadius:12,marginBottom:14,border:'1px solid rgba(255,255,255,0.09)',overflow:'hidden',background:t.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,opacity:0.5}}>
              App Hintergrund — {t.background.mode}
            </div>

            <Divider label="App Hintergrund"/>
            <Chips options={['solid','gradient','animated-gradient','mesh','noise','aurora']} value={t.background.mode} onChange={v=>t.setBackground({mode:v as BgMode})}/>
            {t.background.mode!=='solid' && <GradStops stops={t.background.stops} onChange={stops=>t.setBackground({stops})}/>}
            {t.background.mode!=='solid'&&t.background.mode!=='noise' && <Slider label="Winkel" value={t.background.angle} min={0} max={360} step={15} unit="°" onChange={v=>t.setBackground({angle:v})}/>}
            {(t.background.mode==='animated-gradient'||t.background.mode==='aurora') && <>
              <Toggle label="Animation aktiv" checked={t.background.animated} onChange={v=>t.setBackground({animated:v})}/>
              {t.background.animated && <Slider label="Animationsgeschwindigkeit" value={t.background.animationSpeed} min={1} max={15} step={0.5} unit="s" onChange={v=>t.setBackground({animationSpeed:v})} desc="Sekunden pro Zyklus — kleiner = schneller"/>}
            </>}
            {t.background.mode==='noise' && <Slider label="Rauschen Stärke" value={t.background.noiseOpacity} min={0.01} max={0.25} step={0.01} onChange={v=>t.setBackground({noiseOpacity:v})}/>}
            {t.background.mode==='mesh' && <>
              <Slider label="Mesh Intensität" value={t.background.meshIntensity} min={0.05} max={1} step={0.05} onChange={v=>t.setBackground({meshIntensity:v})}/>
              <Row>
                <Swatch label="Mesh Farbe 1" value={t.background.stops[0]?.color||t.accent} onChange={v=>{const n=[...t.background.stops];n[0]={...n[0],color:v};t.setBackground({stops:n})}}/>
                <Swatch label="Mesh Farbe 2" value={t.background.stops[1]?.color||t.accent2} onChange={v=>{const n=[...t.background.stops];n[1]={...n[1],color:v};t.setBackground({stops:n})}}/>
              </Row>
            </>}

            <Divider label="Panel Hintergrund Muster"/>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:14}}>
              {['glass','solid','gradient','noise','dots','grid','carbon','circuit'].map(mode=>{
                const active=((t.background as any).panelBgMode??'glass')===mode
                const icons:Record<string,string>={glass:'🪟',solid:'⬛',gradient:'🌈',noise:'📺',dots:'⠿',grid:'⊞',carbon:'🔲',circuit:'🔌'}
                return (
                  <button key={mode} onClick={()=>t.setBackground({panelBgMode:mode} as any)} style={{
                    padding:'10px 5px',borderRadius:9,cursor:'pointer',textAlign:'center',
                    background:active?`rgba(${rgb},0.16)`:'rgba(255,255,255,0.04)',
                    border:`1.5px solid ${active?t.accent:'rgba(255,255,255,0.09)'}`,
                    color:active?t.accent:'inherit',transition:'all 0.12s',
                  }}>
                    <div style={{fontSize:17,marginBottom:4}}>{icons[mode]}</div>
                    <div style={{fontSize:9,fontWeight:700,textTransform:'capitalize'}}>{mode}</div>
                  </button>
                )
              })}
            </div>

            <Divider label="Overlays"/>
            <Row>
              <Toggle label="Vignette" checked={(t.background as any).vignette??false} onChange={v=>t.setBackground({vignette:v} as any)} desc="Dunkle Ränder rund um den Bildschirm"/>
              <Toggle label="Scanlines" checked={(t.background as any).scanlines??false} onChange={v=>t.setBackground({scanlines:v} as any)} desc="CRT Scanlinien-Effekt"/>
            </Row>
            {(t.background as any).vignette && <Slider label="Vignette Stärke" value={(t.background as any).vignetteStrength??0.4} min={0.1} max={1} step={0.05} onChange={v=>t.setBackground({vignetteStrength:v} as any)}/>}
            <Slider label="Overlay Dunkelheit" value={(t.background as any).overlayOpacity??0} min={0} max={0.5} step={0.01} onChange={v=>t.setBackground({overlayOpacity:v} as any)} desc="Zusätzliche Abdunkelungsschicht über dem Hintergrund"/>
          </>}

          {/* ════════════════════════════════ LAYOUT */}
          {tab==='layout' && <>
            <Divider label="Sidebar"/>
            <Chips label="Sidebar Stil" options={['default','floating','minimal','rail','hidden']} value={(t as any).sidebarStyle??'default'} onChange={v=>(t as any).setSidebarStyle?.(v)}/>
            <Slider label="Sidebar Breite" value={t.sidebarWidth} min={60} max={400} step={10} unit="px" onChange={v=>t.setSidebarWidth(v)} desc="Unter 160px = Icon-Only Modus. Rail-Stil ignoriert diese Einstellung."/>
            <div style={{height:5,borderRadius:3,background:'rgba(255,255,255,0.08)',overflow:'hidden',marginBottom:14}}>
              <div style={{height:'100%',width:`${((t.sidebarWidth-60)/340)*100}%`,background:`linear-gradient(90deg,${t.accent},${t.accent2})`,borderRadius:3,transition:'width 0.2s'}}/>
            </div>
            <Chips label="Sidebar Position" options={['left','right']} value={(t as any).sidebarPosition??'left'} onChange={v=>(t as any).setSidebarPosition?.(v)}/>
            <Row>
              <Toggle label="Labels anzeigen" checked={(t as any).sidebarLabels??true} onChange={v=>(t as any).setSidebarLabels?.(v)} desc="Beschriftungen neben Icons"/>
              <Toggle label="Accent Hintergrund" checked={(t as any).sidebarAccentBg??false} onChange={v=>(t as any).setSidebarAccentBg?.(v)} desc="Farbiger Gradient-Hintergrund"/>
            </Row>

            <Divider label="Panel Design"/>
            <Row>
              <Slider label="Panel Radius" value={t.visual.panelRadius} min={0} max={32} step={1} unit="px" onChange={v=>t.setVisual({panelRadius:v})} desc="Eckenrundung aller Panels"/>
              <Slider label="Shadow Depth" value={t.visual.shadowDepth} min={0} max={1} step={0.05} onChange={v=>t.setVisual({shadowDepth:v})} desc="Stärke der Schatten"/>
            </Row>
            <Chips label="Spacing Dichte" options={['compact','comfortable','spacious']} value={t.visual.spacingDensity} onChange={v=>t.setVisual({spacingDensity:v as any})}/>
            <Toggle label="Kompakt-Modus" checked={t.visual.compactMode} onChange={v=>t.setVisual({compactMode:v})} desc="Weniger Padding überall"/>

            <Divider label="Schriftgrößen"/>
            <Row>
              <Slider label="App Schriftgröße" value={t.qol?.fontSize??14} min={10} max={22} step={1} unit="px" onChange={v=>t.setQOL({fontSize:v})} desc="Basisgröße der gesamten App"/>
              <Slider label="Editor Schriftgröße" value={t.editor.fontSize} min={10} max={22} step={1} unit="px" onChange={v=>t.setEditor({fontSize:v})}/>
            </Row>
            <Row>
              <Slider label="Notes Schriftgröße" value={t.notes.fontSize} min={10} max={24} step={1} unit="px" onChange={v=>t.setNotes({fontSize:v})}/>
              <Slider label="Notes Zeilenabstand" value={t.notes.lineHeight} min={1} max={2.5} step={0.1} unit="em" onChange={v=>t.setNotes({lineHeight:v})}/>
            </Row>

            <Divider label="Toolbar"/>
            <Chips label="Toolbar Modus" options={['island','spotlight','full-width']} value={t.toolbar?.toolbarMode??'island'} onChange={v=>t.setToolbar({toolbarMode:v as any})}/>
            <Chips label="Toolbar Position" options={['bottom','top']} value={t.toolbar?.position??'bottom'} onChange={v=>t.setToolbar({position:v as any})}/>
            <Row>
              <Toggle label="Toolbar sichtbar" checked={t.toolbar?.visible??true} onChange={v=>t.setToolbar({visible:v})}/>
              <Slider label="Toolbar Höhe" value={t.toolbar?.height??44} min={32} max={60} step={2} unit="px" onChange={v=>t.setToolbar({height:v})}/>
            </Row>
            <Divider label="Barrierefreiheit"/>
            <Row>
              <Toggle label="Hoher Kontrast" checked={t.qol?.highContrast??false} onChange={v=>t.setQOL({highContrast:v})} desc="Verstärkte Rahmen und Kontraste"/>
              <Toggle label="Tooltips anzeigen" checked={t.qol?.showTooltips??true} onChange={v=>t.setQOL({showTooltips:v})}/>
            </Row>
            <Chips label="Panel Dichte" options={['comfortable','compact','spacious']} value={t.qol?.panelDensity??'comfortable'} onChange={v=>t.setQOL({panelDensity:v as any})}/>
          </>}

          {/* ════════════════════════════════ WORKSPACE */}
          {tab==='workspace' && <>
            <Divider label="Produktivität"/>
            <Row>
              <Toggle label="Quick Actions" checked={t.qol?.quickActions??false} onChange={v=>t.setQOL({quickActions:v})} desc="Zusätzliche Schnellaktionen in der UI anzeigen"/>
              <Toggle label="Sidebar Auto Hide" checked={t.qol?.sidebarAutoHide??false} onChange={v=>t.setSidebarAutoHide(v)} desc="Sidebar kann automatisch ausblenden"/>
            </Row>

            <Divider label="Spotlight & Terminal"/>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8,marginBottom:10}}>
              <button
                onClick={()=>openSpotlight()}
                style={{padding:'10px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,color:'inherit',fontSize:12,fontWeight:700}}
              >
                <span style={{display:'inline-flex',alignItems:'center',gap:7}}><Command size={13}/> Spotlight öffnen</span>
                <span style={{fontSize:10,opacity:0.45}}>Shift x2</span>
              </button>
              <button
                onClick={()=>terminal.setOpen(!terminal.isOpen)}
                style={{padding:'10px 12px',borderRadius:10,border:`1px solid ${terminal.isOpen?`rgba(${rgb},0.36)`:'rgba(255,255,255,0.1)'}`,background:terminal.isOpen?`rgba(${rgb},0.14)`:'rgba(255,255,255,0.05)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,color:terminal.isOpen?t.accent:'inherit',fontSize:12,fontWeight:700}}
              >
                <span style={{display:'inline-flex',alignItems:'center',gap:7}}><TerminalSquare size={13}/> Terminal {terminal.isOpen?'schließen':'öffnen'}</span>
                <span style={{fontSize:10,opacity:0.45}}>Panel</span>
              </button>
            </div>

            <Divider label="Workspace Reset"/>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8}}>
              <button
                onClick={clearSpotlightData}
                style={{padding:'10px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',cursor:'pointer',fontSize:12,fontWeight:700,color:'inherit',textAlign:'left'}}
              >
                Spotlight Pins & Recents löschen
              </button>
              <button
                onClick={clearTerminalWorkspace}
                style={{padding:'10px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',cursor:'pointer',fontSize:12,fontWeight:700,color:'inherit',textAlign:'left'}}
              >
                Terminal History & Macros löschen
              </button>
              <button
                onClick={resetDashboardLayout}
                style={{padding:'10px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',cursor:'pointer',fontSize:12,fontWeight:700,color:'inherit',textAlign:'left'}}
              >
                Dashboard Layout zurücksetzen
              </button>
            </div>
          </>}

          {/* ════════════════════════════════ ANIMATION */}
          {tab==='animation' && <>
            <Slider label="Globale Animationsgeschwindigkeit" value={t.visual.animationSpeed} min={0.1} max={3} step={0.1} unit="x" onChange={v=>t.setVisual({animationSpeed:v})} desc="Multiplikator für alle Übergänge und Animationen. 1x = normal, 0.1x = sehr langsam."/>
            <Chips label="Entry-Stil (View-Übergang)" options={['fade','slide','scale','bounce','flip']} value={(t.animations as any).entranceStyle??'fade'} onChange={v=>t.setAnimations({entranceStyle:v} as any)}/>

            <Divider label="Animationen ein/aus"/>
            <Row>
              <Toggle label="Entry-Animationen" checked={t.animations.entryAnimations} onChange={v=>t.setAnimations({entryAnimations:v})} desc="Fade-up beim Laden von Views"/>
              <Toggle label="Page-Transitions" checked={t.animations.pageTransitions} onChange={v=>t.setAnimations({pageTransitions:v})} desc="Übergang zwischen Views"/>
            </Row>
            <Row>
              <Toggle label="Hover Lift" checked={t.animations.hoverLift} onChange={v=>t.setAnimations({hoverLift:v})} desc="Panels heben sich beim Hover"/>
              <Toggle label="Ripple-Klick" checked={t.animations.rippleClick} onChange={v=>t.setAnimations({rippleClick:v})} desc="Wellen-Effekt beim Klicken"/>
            </Row>
            <Row>
              <Toggle label="Glow Pulse" checked={t.animations.glowPulse} onChange={v=>t.setAnimations({glowPulse:v})} desc="Leuchtendes Pulsieren"/>
              <Toggle label="Float Effect" checked={(t.animations as any).floatEffect??false} onChange={v=>t.setAnimations({floatEffect:v} as any)} desc="Schwebende Karten-Animation"/>
            </Row>
            <Row>
              <Toggle label="Border Flow" checked={(t.animations as any).borderFlow??false} onChange={v=>t.setAnimations({borderFlow:v} as any)} desc="Animierter Gradient-Rahmen"/>
              <Toggle label="Puls-Effekte" checked={t.animations.pulseEffects} onChange={v=>t.setAnimations({pulseEffects:v})} desc="Subtile Pulsanimationen"/>
            </Row>
            <Row>
              <Toggle label="Smooth Transitions" checked={t.animations.smoothTransitions} onChange={v=>t.setAnimations({smoothTransitions:v})} desc="Weiches Interpolieren"/>
              <Toggle label="Partikel-Effekte" checked={t.animations.particleEffects} onChange={v=>t.setAnimations({particleEffects:v})} desc="Partikel beim Klicken"/>
            </Row>

            <Divider label="Barrierefreiheit"/>
            <Toggle label="Bewegung reduzieren" checked={t.qol?.reducedMotion??false} onChange={v=>t.setQOL({reducedMotion:v})} desc="Deaktiviert alle Animationen — für Nutzer mit Bewegungsempfindlichkeit"/>
          </>}

          {/* ════════════════════════════════ EDITOR */}
          {tab==='editor' && <>
            <Divider label="Code Editor"/>
            <Row>
              <Toggle label="Autosave" checked={t.editor.autosave} onChange={v=>t.setEditor({autosave:v})} desc="Automatisch speichern"/>
              <Toggle label="Word Wrap" checked={t.editor.wordWrap} onChange={v=>t.setEditor({wordWrap:v})} desc="Lange Zeilen umbrechen"/>
            </Row>
            <Row>
              <Toggle label="Zeilennummern" checked={t.editor.lineNumbers} onChange={v=>t.setEditor({lineNumbers:v})}/>
              <Toggle label="Minimap" checked={t.editor.minimap} onChange={v=>t.setEditor({minimap:v})} desc="Code-Minimap rechts"/>
            </Row>
            <Toggle label="Cursor-Animation" checked={t.editor.cursorAnimation} onChange={v=>t.setEditor({cursorAnimation:v})} desc="Blinkendes Cursor-Animiert"/>
            {t.editor.autosave && <Slider label="Autosave Intervall" value={t.editor.autosaveInterval} min={500} max={10000} step={500} unit="ms" onChange={v=>t.setEditor({autosaveInterval:v})}/>}
            <Row>
              <Slider label="Tab-Breite" value={t.editor.tabSize} min={2} max={8} step={1} unit=" Sp." onChange={v=>t.setEditor({tabSize:v})}/>
              <div/>
            </Row>

            <Divider label="Notes Editor"/>
            <Chips label="Notes Schriftart" options={['Fira Code','Inter','system-ui','Consolas','Georgia','Arial']} value={t.notes.fontFamily} onChange={v=>t.setNotes({fontFamily:v})}/>
            <Chips label="Notes Modus" options={['dark','light']} value={t.notes.mode} onChange={v=>t.setNotes({mode:v as any})}/>

            <Divider label="Zurücksetzen"/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(confirm('Alle Einstellungen auf Standardwerte zurücksetzen?')){t.preset('macOS Dark');t.setGlobalFont('system-ui');t.setSidebarWidth(240);toast('Zurückgesetzt!')}}}
                style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(255,60,60,0.08)',border:'1px solid rgba(255,60,60,0.22)',cursor:'pointer',color:'#ff453a',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                <RotateCcw size={13}/> Standard wiederherstellen
              </button>
            </div>
          </>}

          <div style={{height:36}}/>
        </div>
      </div>
    </div>
  )
}
