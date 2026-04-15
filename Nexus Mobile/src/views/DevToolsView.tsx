import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Copy, Check, RefreshCw, Play, Code2, Calculator, Plus, X,
  Monitor, Tablet, Smartphone, Download, Trash2, FileText, FolderOpen,
  ChevronRight, ChevronDown, Edit3, Eye, Layers, Sliders, Save,
  FilePlus, FolderPlus, MoreVertical, Palette, Layout, Type, Zap } from 'lucide-react'
import { Glass } from '../components/Glass'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { useMobile } from '../lib/useMobile'
import { motion, AnimatePresence } from 'framer-motion'
import { VisualBuilder } from './devtools/VisualBuilder'

// ── useCopy ────────────────────────────────────────────────────────────────
function useCopy() {
  const [k, setK] = useState<string|null>(null)
  const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setK(key); setTimeout(()=>setK(null),1600) }
  return { copy, copied: k }
}

// ── File system types ──────────────────────────────────────────────────────
interface FSFile { id: string; name: string; type: 'html'|'css'|'js'; content: string }
interface FSFolder { id: string; name: string; children: string[] }

const DEFAULT_FILES: FSFile[] = [
  { id: 'index', name: 'index.html', type: 'html', content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="navbar">
    <div class="logo">✦ Brand</div>
    <div class="nav-links">
      <a href="#">Home</a>
      <a href="#">About</a>
      <a href="#">Work</a>
    </div>
    <button class="btn-primary">Get Started</button>
  </nav>

  <section class="hero">
    <div class="hero-content">
      <h1 class="hero-title">Build <span class="accent">Beautiful</span> Products</h1>
      <p class="hero-sub">A modern design system built for Nexus DevTools.</p>
      <div class="hero-actions">
        <button class="btn-primary">Start Building</button>
        <button class="btn-ghost">View Docs →</button>
      </div>
    </div>
    <div class="hero-visual">
      <div class="card glow">
        <div class="card-icon">🚀</div>
        <div class="card-title">Launch Ready</div>
        <div class="card-desc">Ship fast with confidence</div>
      </div>
    </div>
  </section>
  <script src="app.js"></script>
</body>
</html>` },
  { id: 'style', name: 'style.css', type: 'css', content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --accent: #007AFF;
  --accent2: #5E5CE6;
  --bg: #0a0a14;
  --surface: rgba(255,255,255,0.07);
  --border: rgba(255,255,255,0.1);
  --text: #ffffff;
  --text-muted: rgba(255,255,255,0.55);
  --radius: 14px;
  --blur: 20px;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
}

.navbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 40px;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(var(--blur));
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 100;
}
.logo { font-size: 18px; font-weight: 900; background: linear-gradient(135deg,var(--accent),var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.nav-links { display: flex; gap: 28px; }
.nav-links a { color: var(--text-muted); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
.nav-links a:hover { color: var(--text); }

.hero { display: flex; align-items: center; justify-content: space-between; padding: 80px 40px; min-height: 80vh; gap: 40px; }
.hero-title { font-size: 3.5rem; font-weight: 900; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 16px; }
.accent { background: linear-gradient(135deg,var(--accent),var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { color: var(--text-muted); font-size: 1.1rem; line-height: 1.6; margin-bottom: 32px; max-width: 420px; }
.hero-actions { display: flex; gap: 12px; }

.btn-primary { padding: 12px 24px; border-radius: 10px; background: var(--accent); color: white; font-weight: 700; font-size: 14px; border: none; cursor: pointer; box-shadow: 0 4px 16px rgba(0,122,255,0.4); transition: all 0.2s; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,122,255,0.5); }
.btn-ghost { padding: 12px 24px; border-radius: 10px; background: transparent; color: var(--text); font-weight: 600; font-size: 14px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s; }
.btn-ghost:hover { background: var(--surface); }

.card { padding: 28px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); backdrop-filter: blur(var(--blur)); max-width: 280px; }
.card.glow { box-shadow: 0 0 40px rgba(0,122,255,0.15), 0 16px 40px rgba(0,0,0,0.3); }
.card-icon { font-size: 32px; margin-bottom: 12px; }
.card-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.card-desc { color: var(--text-muted); font-size: 13px; line-height: 1.5; }` },
  { id: 'app', name: 'app.js', type: 'js', content: `// App JavaScript
document.addEventListener('DOMContentLoaded', () => {
  console.log('App loaded!');

  // Smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Button ripple effect
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      ripple.style.cssText = \`
        position: absolute; border-radius: 50%; 
        width: 100px; height: 100px;
        background: rgba(255,255,255,0.3);
        transform: scale(0); animation: ripple 0.5s ease-out;
        left: \${e.clientX - rect.left - 50}px;
        top: \${e.clientY - rect.top - 50}px;
        pointer-events: none;
      \`;
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });
});` },
]

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
  files: FSFile[]; activeId: string; onSelect: (id:string)=>void
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
  { id:'size',    label:'📐 Size' },
  { id:'spacing', label:'↔ Spacing' },
  { id:'border',  label:'⬜ Border' },
  { id:'bg',      label:'🎨 Background' },
  { id:'shadow',  label:'🌑 Shadow' },
  { id:'glow',    label:'✨ Glow' },
  { id:'blur',    label:'🌫 Blur' },
  { id:'text',    label:'🔤 Text' },
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
    <div style={{ display:'flex', gap:14, height:'100%', overflow:'hidden' }}>
      {/* Controls */}
      <div style={{ width:260, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
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
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, overflow:'hidden', minHeight:0 }}>
        {/* Preview */}
        <Glass style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.25)', position:'relative', overflow:'visible', minHeight:120 }}>
          <div style={{ position:'absolute', top:8, left:12, fontSize:9, opacity:0.3, fontWeight:800, textTransform:'uppercase', letterSpacing:0.5 }}>Preview — &lt;{e.tag}&gt;</div>
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
  const mob = useMobile()
  const { copy, copied } = useCopy()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [files, setFiles]         = useState<FSFile[]>(DEFAULT_FILES)
  const [activeId, setActiveId]   = useState('style')
  const [vp, setVp]               = useState<'desktop'|'tablet'|'mobile'>('desktop')
  const [autoRun, setAutoRun]     = useState(true)
  const [consoleOut, setCOut]     = useState<string[]>([])
  const [subTab, setSubTab]       = useState<'code'|'designer'|'visual'>('code')
  const runTimer = useRef<any>(null)

  const activeFile = files.find(f=>f.id===activeId) || files[0]
  const vpWidth = vp==='desktop'?'100%':vp==='tablet'?'768px':'375px'

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
    const html = files.find(f=>f.type==='html')?.content || '<body></body>'
    const css  = files.filter(f=>f.type==='css').map(f=>f.content).join('\n')
    const js   = files.filter(f=>f.type==='js').map(f=>f.content).join('\n')
    const safeJs = js.replace(/<\/script>/gi,'<\\/script>')
    const baseCss = `html, body { margin: 0; min-height: 100%; background: #090d1f; color: #e5e7eb; } body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; }`
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseCss}\n${css}</style></head>
${html.match(/<body[^>]*>[\s\S]*<\/body>/i)?.[0]||'<body>'+html+'</body>'}
<script>
const __logs=[],oL=console.log,oE=console.error,oW=console.warn
const __p=(t,a)=>{__logs.push({t,m:a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ')});window.parent.postMessage({type:'__c__',logs:__logs},'*')}
console.log=(...a)=>{oL(...a);__p('log',a)};console.error=(...a)=>{oE(...a);__p('err',a)};console.warn=(...a)=>{oW(...a);__p('warn',a)}
try{${safeJs}}catch(e){__p('err',['❌ '+e.message])}
</script></html>`
  }, [files])

  useEffect(() => {
    const h = (e: MessageEvent) => {
      if(e.data?.type==='__c__') setCOut(e.data.logs.map((l:any)=>(l.t==='err'?'❌ ':l.t==='warn'?'⚠️ ':'')+l.m))
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

  useEffect(()=>{
    if(!autoRun)return
    clearTimeout(runTimer.current)
    runTimer.current = setTimeout(run,700)
    return ()=>clearTimeout(runTimer.current)
  },[files,autoRun,run])

  const downloadProject = () => {
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([buildSrc()],{type:'text/html'}))
    a.download='nexus-project.html'; a.click()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, background:'rgba(0,0,0,0.1)', flexWrap: mob.isMobile ? 'wrap' : 'nowrap' }}>
        {/* Sub-tabs: Code vs Designer */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:9, overflow:'hidden' }}>
          <button onClick={()=>setSubTab('code')} style={{ padding:'5px 12px', background:subTab==='code'?t.accent:'transparent', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, color:subTab==='code'?'#fff':'inherit', opacity:subTab==='code'?1:0.55, display:'flex', alignItems:'center', gap:5 }}>
            <Code2 size={12}/> Code
          </button>
          <button onClick={()=>setSubTab('designer')} style={{ padding:'5px 12px', background:subTab==='designer'?t.accent:'transparent', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, color:subTab==='designer'?'#fff':'inherit', opacity:subTab==='designer'?1:0.55, display:'flex', alignItems:'center', gap:5 }}>
            <Sliders size={12}/> Designer
          </button>
          <button onClick={()=>setSubTab('visual')} style={{ padding:'5px 12px', background:subTab==='visual'?t.accent:'transparent', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, color:subTab==='visual'?'#fff':'inherit', opacity:subTab==='visual'?1:0.55, display:'flex', alignItems:'center', gap:5 }}>
            <Layout size={12}/> Visual
          </button>
        </div>

        <div style={{ height:18, width:1, background:'rgba(255,255,255,0.1)' }}/>

        {/* Viewport */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:8, overflow:'hidden' }}>
          {([['desktop',Monitor],['tablet',Tablet],['mobile',Smartphone]] as const).map(([v,Icon])=>(
            <button key={v} onClick={()=>setVp(v as any)} style={{ padding:'5px 8px', background:vp===v?`rgba(${rgb},0.2)`:'transparent', border:'none', cursor:'pointer', color:vp===v?t.accent:'inherit', opacity:vp===v?1:0.45, display:'flex', alignItems:'center' }}>
              <Icon size={13}/>
            </button>
          ))}
        </div>

        <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, opacity:0.6, cursor:'pointer' }}>
          <input type="checkbox" checked={autoRun} onChange={e=>setAutoRun(e.target.checked)} style={{ cursor:'pointer' }}/> Auto-run
        </label>

        <div style={{ flex:1 }}/>
        <button onClick={downloadProject} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:10, fontWeight:600 }}>
          <Download size={11}/> Export
        </button>
        <button onClick={run} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 13px', borderRadius:8, background:t.accent, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, color:'#fff', boxShadow:`0 2px 12px rgba(${rgb},0.4)` }}>
          <Play size={11} fill="currentColor"/> Run
        </button>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', flexDirection: mob.isMobile ? 'column' : 'row', overflow:'hidden', minHeight:0 }}>
        {subTab === 'code' ? <>
          {/* File tree sidebar */}
          <div style={{ width: mob.isMobile ? '100%' : 180, height: mob.isMobile ? 170 : undefined, flexShrink:0, borderRight: mob.isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)', borderBottom: mob.isMobile ? '1px solid rgba(255,255,255,0.07)' : 'none', background:'rgba(0,0,0,0.12)', overflow:'hidden' }}>
            <FileTree files={files} activeId={activeId} onSelect={setActiveId} onNew={newFile} onDelete={deleteFile} onRename={renameFile}/>
          </div>

          {/* Active file editor */}
          <div style={{ flex: mob.isMobile ? '0 0 40%' : '0 0 45%', minHeight: mob.isMobile ? 180 : 0, display:'flex', flexDirection:'column', overflow:'hidden', borderRight: mob.isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)', borderBottom: mob.isMobile ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            {activeFile && <CodePane value={activeFile.content} onChange={v=>updateFile(activeFile.id,v)} lang={activeFile.type}/>}
          </div>

          {/* Preview + console */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
            <div style={{ flex:1, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.18)', padding:vp!=='desktop'?10:0 }}>
              <div style={{ width:vpWidth, height:'100%', maxHeight:'100%', transition:'width 0.3s ease', boxShadow:vp!=='desktop'?'0 8px 40px rgba(0,0,0,0.6)':undefined, borderRadius:vp!=='desktop'?12:0, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)', background:'radial-gradient(circle at 18% 0%, rgba(56, 87, 140, 0.28), rgba(3, 6, 18, 0.95) 60%)' }}>
                <iframe ref={iframeRef} style={{ width:'100%', height:'100%', border:'none', background:'transparent', display:'block', colorScheme:'dark' }} sandbox="allow-scripts" title="Preview"/>
              </div>
            </div>
            {consoleOut.length>0 && (
              <div style={{ flexShrink:0, maxHeight:90, overflowY:'auto', borderTop:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.28)', padding:'5px 12px' }}>
                {consoleOut.map((line,i)=><div key={i} style={{ fontSize:11, fontFamily:'monospace', lineHeight:1.6, color:line.startsWith('❌')?'#ff453a':line.startsWith('⚠️')?'#ffd60a':'inherit', opacity:0.85 }}>{line}</div>)}
              </div>
            )}
          </div>
        </> : subTab === 'designer' ? <>
          {/* Designer + Preview split */}
          <div style={{ width: mob.isMobile ? '100%' : '55%', height: mob.isMobile ? '52%' : undefined, flexShrink:0, padding:'12px 14px', overflow:'auto', borderRight: mob.isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)', borderBottom: mob.isMobile ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <ElementDesigner/>
          </div>
          <div style={{ flex:1, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.18)', padding:vp!=='desktop'?10:0 }}>
            <div style={{ width:vpWidth, height:'100%', maxHeight:'100%', transition:'width 0.3s ease', boxShadow:vp!=='desktop'?'0 8px 40px rgba(0,0,0,0.6)':undefined, borderRadius:vp!=='desktop'?12:0, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)', background:'radial-gradient(circle at 18% 0%, rgba(56, 87, 140, 0.28), rgba(3, 6, 18, 0.95) 60%)' }}>
              <iframe ref={iframeRef} style={{ width:'100%', height:'100%', border:'none', background:'transparent', display:'block', colorScheme:'dark' }} sandbox="allow-scripts" title="Preview"/>
            </div>
          </div>
        </> : (
          <div style={{ flex:1, minHeight:0, overflow:'hidden', padding:12 }}>
            <VisualBuilder onApplyToCode={applyVisualBuilderToCode} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── UI Calculator ──────────────────────────────────────────────────────────
const CALC_CATS = [
  { cat:'Spacing', items:[
    { name:'px → rem',   fn:(a:number)=>`${(a/16).toFixed(4).replace(/0+$/,'').replace(/\.$/,'')}rem`, inputs:[{l:'px',v:16,min:1,max:200}] },
    { name:'rem → px',   fn:(a:number)=>`${a*16}px`, inputs:[{l:'rem',v:1,min:0.1,max:20,step:0.125}] },
    { name:'8pt Grid',   fn:(a:number)=>`${Math.round(a/8)*8}px`, inputs:[{l:'px',v:20,min:1,max:200}] },
    { name:'4pt Grid',   fn:(a:number)=>`${Math.round(a/4)*4}px`, inputs:[{l:'px',v:14,min:1,max:200}] },
  ]},
  { cat:'Color', items:[
    { name:'Hex→RGB',    fn:(_:number,s:string)=>{const r=parseInt(s.slice(1,3),16),g=parseInt(s.slice(3,5),16),b=parseInt(s.slice(5,7),16);return `rgb(${r}, ${g}, ${b})`}, inputs:[{l:'hex',v:0,color:'#007AFF',min:0,max:100}] },
    { name:'Hex→RGBA',   fn:(a:number,s:string)=>{const r=parseInt(s.slice(1,3),16),g=parseInt(s.slice(3,5),16),b=parseInt(s.slice(5,7),16);return `rgba(${r}, ${g}, ${b}, ${(a/100).toFixed(2)})`}, inputs:[{l:'alpha%',v:80,min:0,max:100},{l:'hex',v:0,color:'#007AFF',min:0,max:0}] },
    { name:'Contrast',   fn:(_:number,s:string)=>{if(!/^#[0-9a-fA-F]{6}$/.test(s))return '—';const L=(x:number)=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;const r=parseInt(s.slice(1,3),16)/255,g=parseInt(s.slice(3,5),16)/255,b=parseInt(s.slice(5,7),16)/255;const lum=0.2126*L(r)+0.7152*L(g)+0.0722*L(b);const R=(1.05)/(lum+0.05);return `${R.toFixed(2)}:1 (${R>=7?'AAA':R>=4.5?'AA':R>=3?'AA Lg':'Fail'})`}, inputs:[{l:'hex',v:0,color:'#333333',min:0,max:0}] },
    { name:'Luminance',  fn:(_:number,s:string)=>{if(!/^#[0-9a-fA-F]{6}$/.test(s))return '—';const L=(x:number)=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;const r=parseInt(s.slice(1,3),16)/255,g=parseInt(s.slice(3,5),16)/255,b=parseInt(s.slice(5,7),16)/255;return (0.2126*L(r)+0.7152*L(g)+0.0722*L(b)).toFixed(4)}, inputs:[{l:'hex',v:0,color:'#007AFF',min:0,max:0}] },
  ]},
  { cat:'Typography', items:[
    { name:'Line Height',fn:(a:number)=>`${(a*1.5).toFixed(0)}px / 1.5em`, inputs:[{l:'font-size px',v:16,min:8,max:72}] },
    { name:'Clamp()',    fn:(a:number,_:string,b:number)=>`clamp(${a}px, ${((a+b)/2/16).toFixed(2)}rem, ${b}px)`, inputs:[{l:'min px',v:14,min:8,max:100},{l:'max px',v:24,min:8,max:100}] },
    { name:'Tracking',   fn:(a:number,_:string,b:number)=>`${(a/b).toFixed(4)}em`, inputs:[{l:'spacing px',v:1,min:0,max:20,step:0.5},{l:'font-size',v:16,min:8,max:72}] },
    { name:'Scale Step', fn:(a:number)=>`${(16*Math.pow(1.25,a)).toFixed(1)}px`, inputs:[{l:'step',v:2,min:-4,max:8}] },
  ]},
  { cat:'Layout', items:[
    { name:'Golden φ',   fn:(a:number)=>`${(a*1.618).toFixed(1)}px / ${(a/1.618).toFixed(1)}px`, inputs:[{l:'value px',v:100,min:1,max:1000}] },
    { name:'Aspect',     fn:(a:number,_:string,b:number)=>{const g=(x:number,y:number):number=>y===0?x:g(y,x%y);const d=g(Math.round(a),Math.round(b));return `${Math.round(a/d)} / ${Math.round(b/d)}`}, inputs:[{l:'width',v:1920,min:1,max:9999},{l:'height',v:1080,min:1,max:9999}] },
    { name:'Viewport%',  fn:(a:number,_:string,b:number)=>`${(a/b*100).toFixed(2)}vw`, inputs:[{l:'element px',v:320,min:1,max:3000},{l:'viewport',v:1440,min:320,max:3840}] },
    { name:'clamp()',    fn:(a:number,_:string,b:number)=>`clamp(${a}px, ${((a+b)/2/16).toFixed(2)}rem, ${b}px)`, inputs:[{l:'min px',v:320,min:1,max:2000},{l:'max px',v:1200,min:1,max:2000}] },
  ]},
  { cat:'Animation', items:[
    { name:'FPS→ms',     fn:(a:number)=>`${(1000/a).toFixed(2)}ms`, inputs:[{l:'fps',v:60,min:1,max:240}] },
    { name:'Stagger',    fn:(a:number,_:string,b:number)=>`${a*b}ms total`, inputs:[{l:'delay ms',v:40,min:1,max:500},{l:'items',v:6,min:1,max:50}] },
    { name:'Spring',     fn:(a:number)=>`~${(Math.sqrt(1/a)*1000).toFixed(0)}ms`, inputs:[{l:'stiffness',v:300,min:1,max:2000}] },
    { name:'cubic-bezier',fn:(a:number)=>`cubic-bezier(${(a/100).toFixed(2)}, 0, ${(1-a/100).toFixed(2)}, 1)`, inputs:[{l:'tension 0–100',v:40,min:0,max:100}] },
  ]},
]

function CalcItem({ item }: { item: any }) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { copy, copied } = useCopy()
  const [vals, setVals] = useState<[number,string]>([item.inputs?.[0]?.v??16, item.inputs?.[0]?.color??'#007AFF'])
  const [val2, setVal2] = useState<number>(item.inputs?.[1]?.v??100)
  let result='—'
  try{result=item.fn(vals[0],vals[1],val2)}catch{}
  return (
    <div style={{ padding:'11px 13px', borderRadius:11, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ fontSize:12,fontWeight:700,marginBottom:2 }}>{item.name}</div>
      {item.inputs?.map((inp:any,i:number)=>(
        <div key={i} style={{ marginBottom:6 }}>
          <div style={{ fontSize:9,opacity:0.45,marginBottom:2 }}>{inp.l}</div>
          {inp.color!==undefined?(
            <div style={{ display:'flex',gap:5,alignItems:'center' }}>
              <input type="color" value={vals[1]} onChange={e=>setVals(v=>[v[0],e.target.value])} style={{ width:24,height:22,borderRadius:4,border:'1px solid rgba(255,255,255,0.15)',padding:2,cursor:'pointer' }}/>
              <input value={vals[1]} onChange={e=>{if(/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))setVals(v=>[v[0],e.target.value])}} style={{ flex:1,padding:'3px 7px',borderRadius:5,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:10,color:'inherit',fontFamily:'monospace' }}/>
            </div>
          ):(
            <input type="number" value={i===0?vals[0]:val2} step={inp.step??1} min={inp.min} max={inp.max}
              onChange={e=>{const n=parseFloat(e.target.value);i===0?setVals(v=>[n,v[1]]):setVal2(n)}}
              style={{ width:'100%',padding:'4px 8px',borderRadius:6,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:11,color:'inherit',fontFamily:'monospace' }}/>
          )}
        </div>
      ))}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:8,padding:'6px 9px',borderRadius:7,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.2)` }}>
        <code style={{ fontSize:11,color:t.accent,fontFamily:'monospace',wordBreak:'break-all' }}>{result}</code>
        <button onClick={()=>copy(result,item.name)} style={{ background:'none',border:'none',cursor:'pointer',color:copied===item.name?t.accent:'inherit',opacity:copied===item.name?1:0.4,padding:'1px 3px',display:'flex',alignItems:'center' }}>
          {copied===item.name?<Check size={10}/>:<Copy size={10}/>}
        </button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export function DevToolsView() {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const [tab, setTab]     = useState<'builder'|'calc'>('builder')
  const [calcCat, setCat] = useState(0)

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',overflow:'hidden' }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',gap:12,padding:'9px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0,background:'rgba(0,0,0,0.1)' }}>
        <div>
          <div style={{ fontSize:15,fontWeight:900,background:`linear-gradient(135deg,${t.accent},${t.accent2})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>🛠️ DevTools</div>
          <div style={{ fontSize:9,opacity:0.35,marginTop:1,textTransform:'uppercase',letterSpacing:1 }}>Web Builder · Element Designer · Calculator</div>
        </div>
        <div style={{ display:'flex',background:'rgba(255,255,255,0.06)',borderRadius:10,overflow:'hidden',marginLeft:'auto' }}>
          <button onClick={()=>setTab('builder')} style={{ padding:'6px 14px',background:tab==='builder'?t.accent:'transparent',border:'none',cursor:'pointer',fontSize:11,fontWeight:700,color:tab==='builder'?'#fff':'inherit',opacity:tab==='builder'?1:0.55,display:'flex',alignItems:'center',gap:5 }}>
            <Code2 size={12}/> Builder
          </button>
          <button onClick={()=>setTab('calc')} style={{ padding:'6px 14px',background:tab==='calc'?t.accent:'transparent',border:'none',cursor:'pointer',fontSize:11,fontWeight:700,color:tab==='calc'?'#fff':'inherit',opacity:tab==='calc'?1:0.55,display:'flex',alignItems:'center',gap:5 }}>
            <Calculator size={12}/> Calculator
          </button>
        </div>
      </div>

      <div style={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column',minHeight:0 }}>
        {tab==='builder' ? <WebBuilder /> : (
          <div style={{ display:'flex',height:'100%',overflow:'hidden' }}>
            <div style={{ width: mob.isMobile ? '100%' : 130, height: mob.isMobile ? 'auto' : undefined, flexShrink:0, borderRight: mob.isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)', borderBottom: mob.isMobile ? '1px solid rgba(255,255,255,0.07)' : 'none',padding: mob.isMobile ? '8px 12px' : '10px 7px', display:'flex', flexDirection: mob.isMobile ? 'row' : 'column', flexWrap: mob.isMobile ? 'wrap' : undefined, gap:3, background:'rgba(0,0,0,0.1)' }}>
              {CALC_CATS.map((cat,i)=>(
                <button key={cat.cat} onClick={()=>setCat(i)} style={{ padding:'7px 9px',borderRadius:8,border:`1px solid ${calcCat===i?t.accent:'transparent'}`,background:calcCat===i?`rgba(${rgb},0.15)`:'transparent',cursor:'pointer',fontSize:11,fontWeight:700,color:calcCat===i?t.accent:'inherit',textAlign:'left',transition:'all 0.1s' }}>
                  {cat.cat}
                </button>
              ))}
            </div>
            <div style={{ flex:1,overflowY:'auto',padding:'12px 14px' }}>
              <div style={{ fontSize:10,fontWeight:800,opacity:0.35,textTransform:'uppercase',letterSpacing:1,marginBottom:10 }}>{CALC_CATS[calcCat].cat}</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                {CALC_CATS[calcCat].items.map(item=><CalcItem key={item.name} item={item}/>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
