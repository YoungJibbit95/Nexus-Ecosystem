import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Copy, Check, RefreshCw, Play, Code2, Calculator, Monitor, Tablet, Smartphone, Download, Trash2, Edit3, MoreVertical, Layout, Sliders, Save, Rocket } from 'lucide-react'
import {
  DEFAULT_DEVTOOLS_WEB_FILES,
  extractDevToolsCodeBundles,
  formatDevToolsArtifactKind,
  toExecutableDevToolsHtml,
  type DevToolsArtifact,
  type DevToolsArtifactKind,
  type DevToolsBuilderSubTab,
  type DevToolsFsFile,
} from '@nexus/core/devtools'
import { Glass } from '../components/Glass'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { VisualBuilder } from './devtools/VisualBuilder'
import { DevToolsArtifactLibraryPanel } from './devtools/DevToolsArtifactLibraryPanel'
import { useDevToolsArtifactLibrary } from './devtools/useDevToolsArtifactLibrary'
import { DevToolsCalculatorSection } from './devtools/DevToolsCalculatorSection'
import { ReleaseHealthDashboard } from './devtools/ReleaseHealthDashboard'

// ── useCopy ────────────────────────────────────────────────────────────────
function useCopy() {
  const [k, setK] = useState<string|null>(null)

  const fallbackCopy = (text: string) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', 'true')
      ta.style.position = 'fixed'
      ta.style.top = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }

  const markCopied = (key: string) => {
    setK(key)
    setTimeout(() => setK(null), 1600)
  }

  const copy = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text)
        .then(() => markCopied(key))
        .catch(() => {
          if (fallbackCopy(text)) markCopied(key)
        })
      return
    }
    if (fallbackCopy(text)) markCopied(key)
  }

  return { copy, copied: k }
}

function ToolbarGroup({ label, children, grow = false }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <div
      className="nx-devtools-toolbar-group"
      data-grow={grow ? 'true' : 'false'}
      style={{
        display:'flex',
        alignItems:'center',
        gap:7,
        padding:'5px',
        border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:10,
        background:'rgba(255,255,255,0.035)',
        minWidth:0,
        flex:grow ? '1 1 260px' : '0 0 auto',
      }}
    >
      <span
        className="nx-devtools-toolbar-group-label"
        style={{ fontSize:9, fontWeight:900, opacity:0.44, textTransform:'uppercase', letterSpacing:0.8, padding:'0 2px', whiteSpace:'nowrap' }}
      >
        {label}
      </span>
      <div className="nx-devtools-toolbar-group-actions" style={{ display:'flex', alignItems:'center', gap:5, minWidth:0, flexWrap:'wrap' }}>
        {children}
      </div>
    </div>
  )
}

function PreviewFrame({
  viewport,
  viewportWidth,
  iframeRef,
}: {
  viewport: 'desktop'|'tablet'|'mobile'
  viewportWidth: string
  iframeRef: React.RefObject<HTMLIFrameElement | null>
}) {
  return (
    <div
      className="nx-devtools-preview-stage"
      style={{ flex:1, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.18)', padding:viewport!=='desktop'?10:0, minHeight:0 }}
    >
      <div
        className="nx-devtools-device-frame"
        data-viewport={viewport}
        style={{
          width:viewportWidth,
          height:'100%',
          maxHeight:'100%',
          transition:'width 0.3s ease',
          boxShadow:viewport!=='desktop'?'0 8px 40px rgba(0,0,0,0.6)':undefined,
          borderRadius:viewport!=='desktop'?12:0,
          overflow:'hidden',
          border:'1px solid rgba(255,255,255,0.08)',
          background:'radial-gradient(circle at 18% 0%, rgba(56, 87, 140, 0.28), rgba(3, 6, 18, 0.95) 60%)',
        }}
      >
        <iframe ref={iframeRef} style={{ width:'100%', height:'100%', border:'none', background:'transparent', display:'block', colorScheme:'dark' }} sandbox="allow-scripts" title="DevTools preview"/>
      </div>
    </div>
  )
}

// ── Code editor textarea ────────────────────────────────────────────────────
function CodePane({ value, onChange, lang }: { value: string; onChange: (v:string)=>void; lang: string }) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const colors: Record<string,string> = { html: '#f97316', css: '#a78bfa', js: '#fbbf24', ts: '#60a5fa' }
  const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const el = e.currentTarget, s = el.selectionStart
    const v = el.value.slice(0,s) + '  ' + el.value.slice(el.selectionEnd)
    onChange(v)
    setTimeout(() => { el.selectionStart = el.selectionEnd = s + 2 }, 0)
  }
  return (
    <div style={{ flex:1, position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>
      <div style={{ position:'absolute', top:8, right:10, zIndex:10, padding:'2px 8px', borderRadius:6, background:`rgba(${rgb},0.15)`, border:`1px solid rgba(${rgb},0.2)`, fontSize:9, fontWeight:800, color:colors[lang]||t.accent, letterSpacing:0.5, textTransform:'uppercase', pointerEvents:'none' }}>{lang}</div>
      <textarea
        value={value} onChange={e=>onChange(e.target.value)} onKeyDown={handleTab} spellCheck={false}
        style={{ flex:1, width:'100%', padding:'12px 16px', paddingRight:60, background:'rgba(0,0,0,0.3)', border:'none', outline:'none', resize:'none', fontSize:12.5, fontFamily:"'Fira Code','JetBrains Mono',monospace", lineHeight:1.7, color: colors[lang]==='#f97316'?'#fdba74':colors[lang]==='#a78bfa'?'#c4b5fd':'#fde68a', tabSize:2, caretColor:t.accent }}
      />
    </div>
  )
}

// ── File tree ───────────────────────────────────────────────────────────────
function FileTree({ files, activeId, onSelect, onNew, onDelete, onRename }: {
  files: DevToolsFsFile[]; activeId: string; onSelect: (id:string)=>void
  onNew: (type:'html'|'css'|'js')=>void; onDelete: (id:string)=>void; onRename: (id:string,name:string)=>void
}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const [renaming, setRenaming] = useState<string|null>(null)
  const [menu, setMenu] = useState<string|null>(null)
  const EXT_COLORS: Record<string,string> = { html:'#f97316', css:'#a78bfa', js:'#fbbf24', ts:'#60a5fa', md:'#34d399' }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <div style={{ padding:'10px 10px 6px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontSize:10, fontWeight:800, opacity:0.4, textTransform:'uppercase', letterSpacing:1 }}>Explorer</span>
        <div style={{ display:'flex', gap:2 }}>
          {(['html','css','js'] as const).map(type => (
            <button key={type} onClick={()=>onNew(type)} title={`New .${type}`}
              style={{ padding:'3px 6px', borderRadius:5, border:`1px solid ${EXT_COLORS[type]}33`, background:`${EXT_COLORS[type]}11`, cursor:'pointer', fontSize:9, fontWeight:800, color:EXT_COLORS[type] }}>
              +{type}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'2px 6px' }}>
        {files.map(file => {
          const isActive = file.id === activeId
          const extColor = EXT_COLORS[file.type] || '#888'
          return (
            <div key={file.id} style={{ position:'relative' }}>
              {renaming === file.id ? (
                <input autoFocus defaultValue={file.name}
                  onBlur={e => { onRename(file.id, e.target.value); setRenaming(null) }}
                  onKeyDown={e => { if(e.key==='Enter'){onRename(file.id,(e.target as any).value);setRenaming(null)} if(e.key==='Escape')setRenaming(null) }}
                  style={{ width:'100%', padding:'5px 8px', borderRadius:7, background:'rgba(255,255,255,0.1)', border:`1px solid ${t.accent}`, outline:'none', fontSize:12, color:'inherit' }}/>
              ) : (
                <div onClick={() => onSelect(file.id)}
                  className="nx-surface-row"
                  data-active={isActive ? 'true' : 'false'}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:8, cursor:'pointer', background:isActive?`rgba(${rgb},0.12)`:'transparent', border:isActive?`1px solid rgba(${rgb},0.2)`:'1px solid transparent', marginBottom:2, ['--nx-row-hover-bg' as any]:'rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize:9, fontWeight:800, color:extColor, width:20, flexShrink:0, textTransform:'uppercase' }}>{file.type}</span>
                  <span style={{ flex:1, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:isActive?1:0.7 }}>{file.name}</span>
                  <button onClick={e=>{e.stopPropagation();setMenu(menu===file.id?null:file.id)}}
                    className="nx-interactive nx-bounce-target nx-icon-fade"
                    style={{ background:'none', border:'none', ['--nx-idle-opacity' as any]:0.28, padding:'1px 3px', color:'inherit', display:'flex', alignItems:'center', borderRadius:4 }}>
                    <MoreVertical size={11}/>
                  </button>
                </div>
              )}
              {menu === file.id && (
                <div style={{ position:'absolute', right:4, top:30, zIndex:100, background:'rgba(14,14,24,0.97)', backdropFilter:'blur(16px)', borderRadius:10, padding:5, border:'1px solid rgba(255,255,255,0.1)', minWidth:130, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>{setRenaming(file.id);setMenu(null)}} className="nx-interactive nx-bounce-target nx-menu-item" style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'6px 10px', background:'none', border:'none', borderRadius:7, fontSize:12, color:'inherit', textAlign:'left' }}>
                    <Edit3 size={11}/> Rename
                  </button>
                  <button onClick={()=>{onDelete(file.id);setMenu(null)}} className="nx-interactive nx-bounce-target" style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'6px 10px', background:'none', border:'none', borderRadius:7, fontSize:12, color:'#ff453a', textAlign:'left' }}>
                    <Trash2 size={11}/> Delete
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Element designer ────────────────────────────────────────────────────────
interface ElemProps {
  tag: string; text: string
  width: number; widthUnit: string; height: number; heightUnit: string
  paddingX: number; paddingY: number; marginX: number; marginY: number
  fontSize: number; fontWeight: number; color: string; textAlign: string
  bgType: string; bgColor: string; bgColor2: string; bgAngle: number; bgOpacity: number
  borderRadius: number; borderWidth: number; borderColor: string; borderStyle: string
  shadowX: number; shadowY: number; shadowBlur: number; shadowSpread: number; shadowColor: string
  glowEnabled: boolean; glowColor: string; glowBlur: number; glowOpacity: number
  backdropBlur: number; display: string; overflow: string; transition: string
}

const DEFAULT_ELEM: ElemProps = {
  tag:'div', text:'Preview Element',
  width:240,widthUnit:'px',height:140,heightUnit:'px',
  paddingX:20,paddingY:16,marginX:0,marginY:0,
  fontSize:14,fontWeight:500,color:'#ffffff',textAlign:'center',
  bgType:'glass',bgColor:'#007AFF',bgColor2:'#5E5CE6',bgAngle:135,bgOpacity:10,
  borderRadius:14,borderWidth:1,borderColor:'rgba(255,255,255,0.15)',borderStyle:'solid',
  shadowX:0,shadowY:8,shadowBlur:24,shadowSpread:0,shadowColor:'rgba(0,0,0,0.4)',
  glowEnabled:true,glowColor:'#007AFF',glowBlur:20,glowOpacity:40,
  backdropBlur:16,display:'flex',overflow:'hidden',transition:'all',
}

function buildElemStyle(e: ElemProps): React.CSSProperties {
  const bg = e.bgType==='glass'?`rgba(255,255,255,${e.bgOpacity/100})`:e.bgType==='solid'?e.bgColor:e.bgType==='gradient'?`linear-gradient(${e.bgAngle}deg,${e.bgColor},${e.bgColor2})`:`radial-gradient(circle,${e.bgColor},${e.bgColor2})`
  const shadow = `${e.shadowX}px ${e.shadowY}px ${e.shadowBlur}px ${e.shadowSpread}px ${e.shadowColor}`
  const glow = e.glowEnabled ? `, 0 0 ${e.glowBlur}px ${e.glowColor}${Math.round(e.glowOpacity*2.55).toString(16).padStart(2,'0')}` : ''
  return {
    width:`${e.width}${e.widthUnit}`,height:`${e.height}${e.heightUnit}`,display:e.display,
    alignItems:'center',justifyContent:'center',
    padding:`${e.paddingY}px ${e.paddingX}px`,margin:`${e.marginY}px ${e.marginX}px`,
    borderRadius:`${e.borderRadius}px`,border:`${e.borderWidth}px ${e.borderStyle} ${e.borderColor}`,
    background:bg,backdropFilter:e.backdropBlur>0?`blur(${e.backdropBlur}px)`:undefined,
    WebkitBackdropFilter:e.backdropBlur>0?`blur(${e.backdropBlur}px)`:undefined,
    boxShadow:shadow+glow,fontSize:e.fontSize,fontWeight:e.fontWeight,
    color:e.color,textAlign:e.textAlign as any,overflow:e.overflow as any,
    transition:`${e.transition} 0.2s ease`,
  }
}

function buildElemCSS(e: ElemProps): string {
  const s = buildElemStyle(e)
  return `.element {\n${Object.entries(s).filter(([,v])=>v!==undefined).map(([k,v])=>`  ${k.replace(/([A-Z])/g,'-$1').toLowerCase().replace('webkit-','-webkit-')}: ${v};`).join('\n')}\n}`
}

function Ctrl({ label, value, min, max, step=1, unit='', onChange }: any) {
  const t = useTheme()
  const pct = Math.max(0,Math.min(100,((value-min)/(max-min))*100))
  return (
    <div style={{ marginBottom:9 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:10, opacity:0.6 }}>{label}</span>
        <span style={{ fontSize:10, fontWeight:700, color:t.accent, fontFamily:'monospace' }}>{value%1!==0?value.toFixed(1):value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}
        style={{ width:'100%', height:3, borderRadius:2, background:`linear-gradient(to right,${t.accent} ${pct}%,rgba(255,255,255,0.12) ${pct}%)` }}/>
    </div>
  )
}

function ColorCtrl({ label, value, onChange }: any) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:9 }}>
      <span style={{ fontSize:10, opacity:0.6 }}>{label}</span>
      <div style={{ display:'flex', gap:5, alignItems:'center' }}>
        <input type="color" value={value.startsWith('#')?value:'#007AFF'} onChange={e=>onChange(e.target.value)}
          style={{ width:24, height:22, borderRadius:5, border:'1px solid rgba(255,255,255,0.15)', padding:2, cursor:'pointer' }}/>
        <input value={value} onChange={e=>onChange(e.target.value)}
          style={{ width:78, padding:'2px 6px', borderRadius:5, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:9, color:'inherit', fontFamily:'monospace' }}/>
      </div>
    </div>
  )
}

function SelCtrl({ label, value, options, onChange }: any) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  return (
    <div style={{ marginBottom:9 }}>
      {label && <div style={{ fontSize:10, opacity:0.55, marginBottom:4 }}>{label}</div>}
      <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
        {options.map((o:string)=>(
          <button key={o} onClick={()=>onChange(o)} style={{ padding:'3px 8px', borderRadius:5, border:`1px solid ${value===o?t.accent:'rgba(255,255,255,0.1)'}`, background:value===o?`rgba(${rgb},0.15)`:'transparent', cursor:'pointer', fontSize:9, fontWeight:700, color:value===o?t.accent:'inherit', textTransform:'capitalize', transition:'all 0.1s' }}>{o}</button>
        ))}
      </div>
    </div>
  )
}

const ELEM_TABS = [
  { id:'size',    label:'Size' },
  { id:'spacing', label:'Spacing' },
  { id:'border',  label:'Border' },
  { id:'bg',      label:'Background' },
  { id:'shadow',  label:'Shadow' },
  { id:'glow',    label:'Glow' },
  { id:'blur',    label:'Blur' },
  { id:'text',    label:'Text' },
]

const BUILDER_MODES: Array<{ id: DevToolsBuilderSubTab; label: string; summary: string; Icon: React.ComponentType<{ size?: number }> }> = [
  { id:'code', label:'Code', summary:'Files + live preview', Icon:Code2 },
  { id:'designer', label:'Designer', summary:'Element CSS lab', Icon:Sliders },
  { id:'visual', label:'Visual', summary:'No-code layout canvas', Icon:Layout },
]

const VIEWPORT_MODES: Array<{ id: 'desktop'|'tablet'|'mobile'; label: string; Icon: React.ComponentType<{ size?: number }> }> = [
  { id:'desktop', label:'Desktop', Icon:Monitor },
  { id:'tablet', label:'Tablet', Icon:Tablet },
  { id:'mobile', label:'Mobile', Icon:Smartphone },
]

function ElementDesigner() {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { copy, copied } = useCopy()
  const [e, setE] = useState<ElemProps>({...DEFAULT_ELEM, bgColor:t.accent, bgColor2:t.accent2, glowColor:t.accent})
  const [tab, setTab] = useState('size')
  const [codeMode, setCodeMode] = useState<'css'|'tailwind'>('css')
  const u = (patch: Partial<ElemProps>) => setE(p=>({...p,...patch}))

  const css = buildElemCSS(e)
  const tw = useMemo(() => {
    const c: string[] = []
    c.push(e.widthUnit==='px'?`w-[${e.width}px]`:e.width===100?'w-full':`w-[${e.width}%]`)
    c.push(e.heightUnit==='px'?`h-[${e.height}px]`:`h-[${e.height}${e.heightUnit}]`)
    if(e.display==='flex')c.push('flex','items-center','justify-center')
    c.push(e.paddingX===e.paddingY?`p-[${e.paddingX}px]`:`px-[${e.paddingX}px] py-[${e.paddingY}px]`)
    const rMap:Record<number,string>={0:'rounded-none',4:'rounded',8:'rounded-lg',12:'rounded-xl',16:'rounded-2xl',24:'rounded-3xl',9999:'rounded-full'}
    c.push(rMap[e.borderRadius]??`rounded-[${e.borderRadius}px]`)
    if(e.backdropBlur>0)c.push(`backdrop-blur-[${e.backdropBlur}px]`)
    if(e.overflow==='hidden')c.push('overflow-hidden')
    return c.join(' ')
  }, [e])

  return (
    <div className="nx-devtools-designer" style={{ display:'flex', gap:14, height:'100%', overflow:'hidden' }}>
      {/* Controls */}
      <div className="nx-devtools-designer-controls" style={{ width:260, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Tab strip */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:10, flexShrink:0 }}>
          {ELEM_TABS.map(tb=>(
            <button key={tb.id} onClick={()=>setTab(tb.id)} style={{ padding:'4px 9px', borderRadius:7, border:`1px solid ${tab===tb.id?t.accent:'rgba(255,255,255,0.1)'}`, background:tab===tb.id?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.04)', cursor:'pointer', fontSize:9, fontWeight:700, color:tab===tb.id?t.accent:'inherit', transition:'all 0.1s' }}>
              {tb.label}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:'auto', paddingRight:4 }}>
          {tab==='size' && <>
            <Ctrl label="Width" value={e.width} min={20} max={800} onChange={(v:number)=>u({width:v})} unit={e.widthUnit}/>
            <SelCtrl label="Width Unit" value={e.widthUnit} options={['px','%','vw','rem']} onChange={(v:string)=>u({widthUnit:v})}/>
            <Ctrl label="Height" value={e.height} min={20} max={600} onChange={(v:number)=>u({height:v})} unit={e.heightUnit}/>
            <SelCtrl label="Height Unit" value={e.heightUnit} options={['px','%','vh','rem','auto']} onChange={(v:string)=>u({heightUnit:v})}/>
            <SelCtrl label="Display" value={e.display} options={['flex','block','inline-flex','grid']} onChange={(v:string)=>u({display:v})}/>
            <SelCtrl label="Overflow" value={e.overflow} options={['hidden','visible','auto','scroll']} onChange={(v:string)=>u({overflow:v})}/>
            <SelCtrl label="HTML Tag" value={e.tag} options={['div','section','article','button','nav','header','footer','span','p','h1','h2','h3','ul','li','form','input']} onChange={(v:string)=>u({tag:v})}/>
          </>}
          {tab==='spacing' && <>
            <Ctrl label="Padding X" value={e.paddingX} min={0} max={80} onChange={(v:number)=>u({paddingX:v})} unit="px"/>
            <Ctrl label="Padding Y" value={e.paddingY} min={0} max={80} onChange={(v:number)=>u({paddingY:v})} unit="px"/>
            <Ctrl label="Margin X" value={e.marginX} min={0} max={80} onChange={(v:number)=>u({marginX:v})} unit="px"/>
            <Ctrl label="Margin Y" value={e.marginY} min={0} max={80} onChange={(v:number)=>u({marginY:v})} unit="px"/>
          </>}
          {tab==='border' && <>
            <Ctrl label="Border Radius" value={e.borderRadius} min={0} max={100} onChange={(v:number)=>u({borderRadius:v})} unit="px"/>
            <Ctrl label="Border Width" value={e.borderWidth} min={0} max={10} onChange={(v:number)=>u({borderWidth:v})} unit="px"/>
            <ColorCtrl label="Border Color" value={e.borderColor.startsWith('#')?e.borderColor:'#ffffff'} onChange={(v:string)=>u({borderColor:v})}/>
            <SelCtrl label="Border Style" value={e.borderStyle} options={['solid','dashed','dotted','none']} onChange={(v:string)=>u({borderStyle:v})}/>
          </>}
          {tab==='bg' && <>
            <SelCtrl label="Type" value={e.bgType} options={['glass','solid','gradient','radial']} onChange={(v:string)=>u({bgType:v})}/>
            <ColorCtrl label="Color 1" value={e.bgColor} onChange={(v:string)=>u({bgColor:v})}/>
            {e.bgType!=='solid'&&e.bgType!=='glass' && <ColorCtrl label="Color 2" value={e.bgColor2} onChange={(v:string)=>u({bgColor2:v})}/>}
            {e.bgType==='gradient' && <Ctrl label="Angle" value={e.bgAngle} min={0} max={360} step={15} onChange={(v:number)=>u({bgAngle:v})} unit="°"/>}
            <Ctrl label="Opacity" value={e.bgOpacity} min={0} max={100} onChange={(v:number)=>u({bgOpacity:v})} unit="%"/>
          </>}
          {tab==='shadow' && <>
            <Ctrl label="Offset X" value={e.shadowX} min={-40} max={40} onChange={(v:number)=>u({shadowX:v})} unit="px"/>
            <Ctrl label="Offset Y" value={e.shadowY} min={-40} max={60} onChange={(v:number)=>u({shadowY:v})} unit="px"/>
            <Ctrl label="Blur" value={e.shadowBlur} min={0} max={80} onChange={(v:number)=>u({shadowBlur:v})} unit="px"/>
            <Ctrl label="Spread" value={e.shadowSpread} min={-20} max={40} onChange={(v:number)=>u({shadowSpread:v})} unit="px"/>
            <ColorCtrl label="Shadow Color" value={e.shadowColor.startsWith('#')?e.shadowColor:'#000000'} onChange={(v:string)=>u({shadowColor:v})}/>
          </>}
          {tab==='glow' && <>
            <SelCtrl label="Glow" value={e.glowEnabled?'on':'off'} options={['on','off']} onChange={(v:string)=>u({glowEnabled:v==='on'})}/>
            <ColorCtrl label="Glow Color" value={e.glowColor} onChange={(v:string)=>u({glowColor:v})}/>
            <Ctrl label="Glow Blur" value={e.glowBlur} min={0} max={80} onChange={(v:number)=>u({glowBlur:v})} unit="px"/>
            <Ctrl label="Glow Opacity" value={e.glowOpacity} min={0} max={100} onChange={(v:number)=>u({glowOpacity:v})} unit="%"/>
          </>}
          {tab==='blur' && <>
            <Ctrl label="Backdrop Blur" value={e.backdropBlur} min={0} max={60} step={2} onChange={(v:number)=>u({backdropBlur:v})} unit="px"/>
          </>}
          {tab==='text' && <>
            <Ctrl label="Font Size" value={e.fontSize} min={8} max={64} onChange={(v:number)=>u({fontSize:v})} unit="px"/>
            <Ctrl label="Font Weight" value={e.fontWeight} min={100} max={900} step={100} onChange={(v:number)=>u({fontWeight:v})}/>
            <ColorCtrl label="Text Color" value={e.color} onChange={(v:string)=>u({color:v})}/>
            <SelCtrl label="Text Align" value={e.textAlign} options={['left','center','right','justify']} onChange={(v:string)=>u({textAlign:v})}/>
            <div style={{ marginBottom:9 }}>
              <div style={{ fontSize:10, opacity:0.55, marginBottom:4 }}>Preview Text</div>
              <input value={e.text} onChange={ev=>u({text:ev.target.value})}
                style={{ width:'100%', padding:'5px 8px', borderRadius:7, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:11, color:'inherit' }}/>
            </div>
          </>}
        </div>
      </div>

      {/* Preview + code output */}
      <div className="nx-devtools-designer-preview" style={{ flex:1, display:'flex', flexDirection:'column', gap:10, overflow:'hidden', minHeight:0 }}>
        {/* Preview */}
        <Glass style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.25)', position:'relative', overflow:'visible', minHeight:120 }}>
          <div style={{ position:'absolute', top:8, left:12, fontSize:9, opacity:0.3, fontWeight:800, textTransform:'uppercase', letterSpacing:0.5 }}>Preview - &lt;{e.tag}&gt;</div>
          <div style={{ position:'absolute', top:6, right:10, display:'flex', gap:5 }}>
            <button onClick={()=>setE({...DEFAULT_ELEM,bgColor:t.accent,bgColor2:t.accent2,glowColor:t.accent})} className="nx-interactive nx-bounce-target nx-icon-fade" style={{ background:'none', border:'none', ['--nx-idle-opacity' as any]:0.4, padding:'2px 6px', borderRadius:5, color:'inherit', fontSize:9, display:'flex', alignItems:'center', gap:3 }}>
              <RefreshCw size={9}/> Reset
            </button>
          </div>
          <div style={buildElemStyle(e)}>{e.display==='flex'||e.display==='grid'?e.text:e.text}</div>
        </Glass>

        {/* Code output */}
        <div style={{ flexShrink:0, height:160 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:8, overflow:'hidden' }}>
              {(['css','tailwind'] as const).map(ct=>(
                <button key={ct} onClick={()=>setCodeMode(ct)} style={{ padding:'4px 10px', background:codeMode===ct?t.accent:'transparent', border:'none', cursor:'pointer', fontSize:10, fontWeight:700, color:codeMode===ct?'#fff':'inherit', opacity:codeMode===ct?1:0.5, textTransform:'uppercase' }}>{ct}</button>
              ))}
            </div>
            <button onClick={()=>copy(codeMode==='css'?css:tw,'elem')} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:copied==='elem'?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.06)', cursor:'pointer', fontSize:10, color:copied==='elem'?t.accent:'inherit', fontWeight:600 }}>
              {copied==='elem'?<><Check size={10}/> Copied</>:<><Copy size={10}/> Copy</>}
            </button>
          </div>
          <Glass style={{ height:130, overflow:'hidden', padding:0 }}>
            <pre style={{ margin:0, padding:12, overflow:'auto', fontSize:10.5, fontFamily:"'Fira Code',monospace", lineHeight:1.65, height:'100%', color:codeMode==='tailwind'?t.accent:'inherit' }}>
              <code>{codeMode==='css'?css:`className="${tw}"`}</code>
            </pre>
          </Glass>
        </div>
      </div>
    </div>
  )
}

// ── Web Builder (with file system) ──────────────────────────────────────────
function WebBuilder() {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { copy, copied } = useCopy()
  const { artifacts, saveArtifact, removeArtifact } = useDevToolsArtifactLibrary()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [files, setFiles]         = useState<DevToolsFsFile[]>(DEFAULT_DEVTOOLS_WEB_FILES)
  const [activeId, setActiveId]   = useState('style')
  const [vp, setVp]               = useState<'desktop'|'tablet'|'mobile'>('desktop')
  const [autoRun, setAutoRun]     = useState(true)
  const [consoleOut, setCOut]     = useState<string[]>([])
  const [subTab, setSubTab]       = useState<DevToolsBuilderSubTab>('code')
  const [leftPane, setLeftPane]   = useState<'files'|'library'>('files')
  const [saveKind, setSaveKind]   = useState<DevToolsArtifactKind>('recipe')
  const [saveLabel, setSaveLabel] = useState('')
  const runTimer = useRef<any>(null)

  const activeFile = files.find(f=>f.id===activeId) || files[0]
  const vpWidth = vp==='desktop'?'100%':vp==='tablet'?'768px':'375px'
  const bundles = useMemo(() => extractDevToolsCodeBundles(files), [files])
  const activeMode = BUILDER_MODES.find((mode) => mode.id === subTab) ?? BUILDER_MODES[0]
  const fileCountLabel = `${files.length} file${files.length === 1 ? '' : 's'}`

  const updateFile = (id: string, content: string) =>
    setFiles(fs => fs.map(f => f.id===id ? {...f, content} : f))

  const newFile = (type: 'html'|'css'|'js') => {
    const exts = files.filter(f=>f.type===type).length
    const id = `${type}_${Date.now()}`
    const name = `file${exts+1}.${type}`
    setFiles(fs=>[...fs,{id,name,type,content:''}])
    setActiveId(id)
  }

  const deleteFile = (id: string) => {
    if(files.length===1)return
    setFiles(fs=>fs.filter(f=>f.id!==id))
    if(activeId===id) setActiveId(files.find(f=>f.id!==id)?.id||'')
  }

  const renameFile = (id: string, name: string) =>
    setFiles(fs=>fs.map(f=>f.id===id?{...f,name}:f))

  const buildSrc = useCallback(() => {
    return toExecutableDevToolsHtml({
      html: bundles.html || '<body></body>',
      css: bundles.css,
      js: bundles.js,
      includeLogBridge: true,
    })
  }, [bundles])

  useEffect(() => {
    const h = (e: MessageEvent) => {
      if(e.data?.type==='__c__') setCOut(e.data.logs.map((l:any)=>(l.t==='err'?'ERR ':l.t==='warn'?'WARN ':'')+l.m))
    }
    window.addEventListener('message',h)
    return ()=>window.removeEventListener('message',h)
  },[])

  const run = useCallback(()=>{
    if(!iframeRef.current)return
    setCOut([])
    iframeRef.current.srcdoc = buildSrc()
  },[buildSrc])

  const applyVisualBuilderToCode = useCallback((payload: { html: string; css: string }) => {
    let nextActiveId = ''
    setFiles((prev) => {
      const next = [...prev]
      const htmlIndex = next.findIndex((file) => file.type === 'html')
      const cssIndex = next.findIndex((file) => file.type === 'css')
      if (htmlIndex >= 0) {
        next[htmlIndex] = { ...next[htmlIndex], content: payload.html }
        nextActiveId = next[htmlIndex].id
      } else {
        const htmlId = `html_${Date.now()}`
        next.unshift({ id: htmlId, name: 'index.html', type: 'html', content: payload.html })
        nextActiveId = htmlId
      }
      if (cssIndex >= 0) next[cssIndex] = { ...next[cssIndex], content: payload.css }
      else next.push({ id: `css_${Date.now()}`, name: 'style.css', type: 'css', content: payload.css })
      return next
    })
    if (nextActiveId) setActiveId(nextActiveId)
    setSubTab('code')
    requestAnimationFrame(() => run())
  }, [run])

  const inferFileType = useCallback((language: string): DevToolsFsFile['type'] => {
    const normalized = language.toLowerCase()
    if (normalized.includes('css')) return 'css'
    if (normalized.includes('js') || normalized.includes('ts')) return 'js'
    return 'html'
  }, [])

  const buildArtifactDraft = useCallback((kind: DevToolsArtifactKind, titleOverride?: string) => {
    const fallbackTitle = `${formatDevToolsArtifactKind(kind)} ${new Date().toLocaleDateString()}`
    const title = titleOverride?.trim() || fallbackTitle
    const description = `Saved from DevTools ${subTab} view`
    const projectPayload = {
      type: 'project-snapshot' as const,
      files,
      activeId,
      viewport: vp,
      autoRun,
      subTab,
      source: subTab === 'visual' ? 'visual-builder' as const : 'web-builder' as const,
    }
    if (kind === 'snippet') {
      return {
        kind,
        title: titleOverride?.trim() || `${activeFile?.name ?? 'code'} snippet`,
        description,
        payload: {
          type: 'snippet' as const,
          language: activeFile?.type ?? 'html',
          fileName: activeFile?.name ?? 'snippet.txt',
          code: activeFile?.content ?? '',
        },
      }
    }
    if (kind === 'recipe') {
      return {
        kind,
        title,
        description,
        payload: {
          type: 'recipe' as const,
          html: bundles.html,
          css: bundles.css,
          js: bundles.js,
        },
      }
    }
    if (kind === 'preset') {
      return {
        kind,
        title,
        description,
        payload: {
          type: 'preset' as const,
          viewport: vp,
          autoRun,
          subTab,
        },
      }
    }
    if (kind === 'component') {
      return {
        kind,
        title,
        description,
        payload: {
          type: 'component' as const,
          html: bundles.html,
          css: bundles.css,
        },
      }
    }
    return {
      kind,
      title: titleOverride?.trim() || 'Prototype Snapshot',
      description,
      payload: projectPayload,
    }
  }, [activeFile?.content, activeFile?.name, activeFile?.type, activeId, autoRun, bundles.css, bundles.html, bundles.js, files, subTab, vp])

  const saveCurrentArtifact = useCallback(() => {
    const draft = buildArtifactDraft(saveKind, saveLabel)
    const artifact = saveArtifact(draft)
    setSaveLabel('')
    setLeftPane('library')
    setCOut((prev) => [`Saved: ${artifact.title}`, ...prev].slice(0, 6))
  }, [buildArtifactDraft, saveKind, saveLabel, saveArtifact])

  const loadArtifact = useCallback((artifact: DevToolsArtifact) => {
    const payload = artifact.payload
    if (payload.type === 'project-snapshot') {
      setFiles(payload.files.length > 0 ? payload.files : DEFAULT_DEVTOOLS_WEB_FILES)
      setActiveId(payload.activeId)
      setVp(payload.viewport)
      setAutoRun(payload.autoRun)
      setSubTab(payload.subTab)
      requestAnimationFrame(() => run())
      return
    }
    if (payload.type === 'preset') {
      setVp(payload.viewport)
      setAutoRun(payload.autoRun)
      setSubTab(payload.subTab)
      return
    }
    if (payload.type === 'snippet') {
      const type = inferFileType(payload.language)
      const id = `${type}_${Date.now()}`
      setFiles((prev) => [...prev, { id, type, name: payload.fileName || `${id}.${type}`, content: payload.code }])
      setActiveId(id)
      setSubTab('code')
      return
    }
    if (payload.type === 'recipe' || payload.type === 'component') {
      let nextActiveId = ''
      setFiles((prev) => {
        const next = [...prev]
        const htmlIndex = next.findIndex((file) => file.type === 'html')
        const cssIndex = next.findIndex((file) => file.type === 'css')
        const jsIndex = next.findIndex((file) => file.type === 'js')
        const html = payload.html
        const css = payload.css
        const js = payload.type === 'recipe' ? payload.js : (jsIndex >= 0 ? next[jsIndex].content : '')
        if (htmlIndex >= 0) {
          next[htmlIndex] = { ...next[htmlIndex], content: html }
          nextActiveId = next[htmlIndex].id
        } else {
          const htmlId = `html_${Date.now()}`
          next.unshift({ id: htmlId, name: 'index.html', type: 'html', content: html })
          nextActiveId = htmlId
        }
        if (cssIndex >= 0) next[cssIndex] = { ...next[cssIndex], content: css }
        else next.push({ id: `css_${Date.now()}`, name: 'style.css', type: 'css', content: css })
        if (payload.type === 'recipe') {
          if (jsIndex >= 0) next[jsIndex] = { ...next[jsIndex], content: js }
          else next.push({ id: `js_${Date.now()}`, name: 'app.js', type: 'js', content: js })
        }
        return next
      })
      if (nextActiveId) setActiveId(nextActiveId)
      setSubTab('code')
      requestAnimationFrame(() => run())
    }
  }, [inferFileType, run])

  const copyArtifactPayload = useCallback((artifact: DevToolsArtifact) => {
    copy(JSON.stringify(artifact.payload, null, 2), `artifact-${artifact.id}`)
  }, [copy])

  const downloadArtifactJson = useCallback((artifact: DevToolsArtifact) => {
    const safeTitle = artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || artifact.kind
    const url = URL.createObjectURL(new Blob([JSON.stringify(artifact, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `nexus-${artifact.kind}-${safeTitle}.json`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    window.setTimeout(() => {
      URL.revokeObjectURL(url)
      a.remove()
    }, 0)
  }, [])

  useEffect(()=>{
    if(!autoRun)return
    clearTimeout(runTimer.current)
    runTimer.current = setTimeout(run,700)
    return ()=>clearTimeout(runTimer.current)
  },[files,autoRun,run])

  const downloadProject = () => {
    const url = URL.createObjectURL(new Blob([buildSrc()],{type:'text/html'}))
    const a=document.createElement('a')
    a.href=url
    a.download='nexus-project.html'
    a.style.display='none'
    document.body.appendChild(a)
    a.click()
    window.setTimeout(() => {
      URL.revokeObjectURL(url)
      a.remove()
    }, 0)
  }

  return (
    <div className="nx-devtools-builder" style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Toolbar */}
      <div className="nx-devtools-builder-toolbar" style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, background:'rgba(0,0,0,0.12)', flexWrap:'wrap' }}>
        <ToolbarGroup label="Mode">
          {BUILDER_MODES.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={()=>setSubTab(id)}
              aria-pressed={subTab===id}
              title={label}
              className="nx-devtools-segment-button"
              style={{ padding:'6px 10px', borderRadius:7, background:subTab===id?t.accent:'transparent', border:'none', cursor:'pointer', fontSize:11, fontWeight:800, color:subTab===id?'#fff':'inherit', opacity:subTab===id?1:0.62, display:'flex', alignItems:'center', gap:5 }}
            >
              <Icon size={12}/> {label}
            </button>
          ))}
        </ToolbarGroup>

        <ToolbarGroup label="Preview">
          {VIEWPORT_MODES.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={()=>setVp(id)}
              aria-pressed={vp===id}
              title={label}
              className="nx-devtools-icon-button"
              style={{ width:30, height:28, borderRadius:7, background:vp===id?`rgba(${rgb},0.2)`:'transparent', border:'none', cursor:'pointer', color:vp===id?t.accent:'inherit', opacity:vp===id?1:0.48, display:'grid', placeItems:'center' }}
            >
              <Icon size={13}/>
            </button>
          ))}
          <label className="nx-devtools-switch" style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, opacity:0.72, cursor:'pointer', padding:'0 4px' }}>
            <input type="checkbox" checked={autoRun} onChange={e=>setAutoRun(e.target.checked)} style={{ cursor:'pointer' }}/> Auto
          </label>
        </ToolbarGroup>

        <ToolbarGroup label="Artifacts" grow>
          <select
            value={saveKind}
            onChange={(event) => setSaveKind(event.target.value as DevToolsArtifactKind)}
            title="Artifact type"
            style={{ padding:'6px 7px', borderRadius:7, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', color:'inherit', fontSize:10, fontWeight:800 }}
          >
            <option value="recipe">Recipe</option>
            <option value="snippet">Snippet</option>
            <option value="component">Component</option>
            <option value="preset">Preset</option>
            <option value="prototype">Prototype</option>
          </select>
          <input
            value={saveLabel}
            onChange={(event) => setSaveLabel(event.target.value)}
            placeholder="Optional name"
            className="nx-devtools-save-name"
            style={{ width:140, minWidth:0, padding:'6px 8px', borderRadius:7, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', color:'inherit', fontSize:10 }}
          />
          <button
            onClick={saveCurrentArtifact}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:7, background:`rgba(${rgb},0.18)`, border:`1px solid rgba(${rgb},0.28)`, cursor:'pointer', fontSize:10, fontWeight:800, color:t.accent }}
          >
            <Save size={11}/> Save
          </button>
        </ToolbarGroup>

        <ToolbarGroup label="Actions">
          <button onClick={downloadProject} style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:7, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:10, fontWeight:700, color:'inherit' }}>
            <Download size={11}/> Export
          </button>
          <button onClick={run} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 13px', borderRadius:8, background:t.accent, border:'none', cursor:'pointer', fontSize:11, fontWeight:800, color:'#fff', boxShadow:`0 2px 12px rgba(${rgb},0.4)` }}>
            <Play size={11} fill="currentColor"/> Run
          </button>
        </ToolbarGroup>
      </div>

      {/* Body */}
      <div className="nx-devtools-builder-body" style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
        {subTab === 'code' ? <>
          {/* File tree sidebar */}
          <div className="nx-devtools-file-panel" style={{ width:248, flexShrink:0, borderRight:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.12)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'9px 10px 5px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:7 }}>
                <span style={{ fontSize:10, fontWeight:900, opacity:0.52, textTransform:'uppercase', letterSpacing:0.8 }}>Project</span>
                <span style={{ fontSize:10, opacity:0.48 }}>{fileCountLabel}</span>
              </div>
              <div className="nx-devtools-pane-tabs" style={{ display:'flex', gap:4 }}>
                <button onClick={() => setLeftPane('files')} aria-pressed={leftPane==='files'} style={{ flex:1, padding:'6px 8px', borderRadius:7, border:`1px solid ${leftPane==='files'?`rgba(${rgb},0.24)`:'rgba(255,255,255,0.1)'}`, background:leftPane==='files'?`rgba(${rgb},0.12)`:'rgba(255,255,255,0.03)', color:leftPane==='files'?t.accent:'inherit', fontSize:10, fontWeight:800, cursor:'pointer' }}>
                  Files
                </button>
                <button onClick={() => setLeftPane('library')} aria-pressed={leftPane==='library'} style={{ flex:1, padding:'6px 8px', borderRadius:7, border:`1px solid ${leftPane==='library'?`rgba(${rgb},0.24)`:'rgba(255,255,255,0.1)'}`, background:leftPane==='library'?`rgba(${rgb},0.12)`:'rgba(255,255,255,0.03)', color:leftPane==='library'?t.accent:'inherit', fontSize:10, fontWeight:800, cursor:'pointer' }}>
                  Library ({artifacts.length})
                </button>
              </div>
            </div>
            <div style={{ flex:1, minHeight:0 }}>
              {leftPane === 'files' ? (
                <FileTree files={files} activeId={activeId} onSelect={setActiveId} onNew={newFile} onDelete={deleteFile} onRename={renameFile}/>
              ) : (
                <DevToolsArtifactLibraryPanel
                  artifacts={artifacts}
                  onLoad={loadArtifact}
                  onCopy={copyArtifactPayload}
                  onDownload={downloadArtifactJson}
                  onDelete={removeArtifact}
                />
              )}
            </div>
          </div>

          {/* Active file editor */}
          <div className="nx-devtools-code-panel" style={{ flex:'0 0 42%', display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0, borderRight:'1px solid rgba(255,255,255,0.07)' }}>
            <div className="nx-devtools-panel-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.12)', flexShrink:0 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activeFile?.name ?? 'No file selected'}</div>
                <div style={{ fontSize:9, opacity:0.46, textTransform:'uppercase', letterSpacing:0.7 }}>{activeFile?.type ?? 'file'}</div>
              </div>
              {activeFile && (
                <button
                  onClick={() => copy(activeFile.content, 'active-file')}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 8px', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:copied==='active-file'?`rgba(${rgb},0.14)`:'rgba(255,255,255,0.05)', color:copied==='active-file'?t.accent:'inherit', cursor:'pointer', fontSize:10, fontWeight:800 }}
                >
                  {copied==='active-file'?<Check size={11}/>:<Copy size={11}/>} Copy
                </button>
              )}
            </div>
            {activeFile && <CodePane value={activeFile.content} onChange={v=>updateFile(activeFile.id,v)} lang={activeFile.type}/>}
          </div>

          {/* Preview + console */}
          <div className="nx-devtools-preview-panel" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
            <div className="nx-devtools-panel-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.12)', flexShrink:0 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:900 }}>{activeMode.label} Preview</div>
                <div style={{ fontSize:9, opacity:0.46 }}>{activeMode.summary} / {vp}</div>
              </div>
              <button onClick={run} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 9px', borderRadius:7, background:`rgba(${rgb},0.16)`, border:`1px solid rgba(${rgb},0.24)`, color:t.accent, cursor:'pointer', fontSize:10, fontWeight:800 }}>
                <Play size={11} fill="currentColor"/> Run
              </button>
            </div>
            <PreviewFrame viewport={vp} viewportWidth={vpWidth} iframeRef={iframeRef} />
            {consoleOut.length>0 && (
              <div style={{ flexShrink:0, maxHeight:96, overflowY:'auto', borderTop:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.28)', padding:'6px 12px' }}>
                {consoleOut.map((line,i)=><div key={i} style={{ fontSize:11, fontFamily:'monospace', lineHeight:1.6, color:line.startsWith('ERR')?'#ff453a':line.startsWith('WARN')?'#ffd60a':'inherit', opacity:0.85 }}>{line}</div>)}
              </div>
            )}
          </div>
        </> : subTab === 'designer' ? <>
          {/* Designer + Preview split */}
          <div className="nx-devtools-element-panel" style={{ width:'55%', flexShrink:0, padding:'12px 14px', overflow:'auto', borderRight:'1px solid rgba(255,255,255,0.07)' }}>
            <ElementDesigner/>
          </div>
          <div className="nx-devtools-preview-panel" style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>
            <div className="nx-devtools-panel-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.12)', flexShrink:0 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:900 }}>Project Preview</div>
                <div style={{ fontSize:9, opacity:0.46 }}>Current builder files / {vp}</div>
              </div>
              <button onClick={run} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 9px', borderRadius:7, background:`rgba(${rgb},0.16)`, border:`1px solid rgba(${rgb},0.24)`, color:t.accent, cursor:'pointer', fontSize:10, fontWeight:800 }}>
                <Play size={11} fill="currentColor"/> Run
              </button>
            </div>
            <PreviewFrame viewport={vp} viewportWidth={vpWidth} iframeRef={iframeRef} />
          </div>
        </> : (
          <div className="nx-devtools-visual-pane" style={{ flex:1, minHeight:0, overflow:'hidden', padding:12 }}>
            <VisualBuilder onApplyToCode={applyVisualBuilderToCode} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
const DEVTOOLS_TABS = [
  {
    id: 'builder',
    label: 'Builder',
    summary: 'Code, Visual Builder und Live Preview',
    Icon: Code2,
  },
  {
    id: 'calc',
    label: 'Calculator',
    summary: 'Layout-, Motion- und CSS-Rechner',
    Icon: Calculator,
  },
  {
    id: 'release',
    label: 'Release',
    summary: 'QA Gates, Release Health und Smoke-Status',
    Icon: Rocket,
  },
] as const

type DevToolsTab = (typeof DEVTOOLS_TABS)[number]['id']

export function DevToolsView() {
  const t = useTheme()
  const [tab, setTab] = useState<DevToolsTab>('builder')
  const activeTab = DEVTOOLS_TABS.find((entry) => entry.id === tab) ?? DEVTOOLS_TABS[0]
  const ActiveIcon = activeTab.Icon
  const titleRgb = hexToRgb(t.accent)

  return (
    <div className="nx-devtools-v6 nx-release-view" style={{ display:'flex',flexDirection:'column',height:'100%',overflow:'hidden' }}>
      {/* Header */}
      <div className="nx-devtools-toolbar nx-release-toolbar" style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0,background:'rgba(0,0,0,0.12)', flexWrap:'wrap' }}>
        <div className="nx-devtools-titleblock" style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
          <div style={{ width:34, height:34, borderRadius:11, display:'grid', placeItems:'center', color:t.accent, background:`rgba(${titleRgb},0.14)`, border:`1px solid rgba(${titleRgb},0.2)` }}>
            <ActiveIcon size={16}/>
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:15,fontWeight:950,background:`linear-gradient(135deg,${t.accent},${t.accent2})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>DevTools</div>
            <div className="nx-devtools-active-summary" style={{ fontSize:10,opacity:0.58,marginTop:2 }}>{activeTab.summary}</div>
          </div>
        </div>
        <div className="nx-devtools-tabs" style={{ display:'flex',background:'rgba(255,255,255,0.05)',borderRadius:10,overflow:'hidden',marginLeft:'auto',padding:3,border:'1px solid rgba(255,255,255,0.08)' }}>
          {DEVTOOLS_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              title={label}
              className="nx-devtools-tab"
              style={{ padding:'6px 12px',borderRadius:7,background:tab===id?t.accent:'transparent',border:'none',cursor:'pointer',fontSize:11,fontWeight:800,color:tab===id?'#fff':'inherit',opacity:tab===id?1:0.62,display:'flex',alignItems:'center',gap:5 }}
            >
              <Icon size={12}/> {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column',minHeight:0 }}>
        {tab==='builder'
          ? <WebBuilder />
          : tab==='calc'
            ? <DevToolsCalculatorSection />
            : <ReleaseHealthDashboard />}
      </div>
    </div>
  )
}
