import { useMobile } from '../lib/useMobile'
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, Trash2, Settings, Save, Copy, Pin, X, RotateCcw, Search,
  Bold, Italic, Heading, List, ListOrdered, Quote, Code, Link,
  Download, Clock, Hash, Eye, Edit3, Minus, Strikethrough,
  Maximize2, Minimize2, Wand2, Sparkles, Bell, Zap, Calendar, CreditCard,
  ChevronDown, Table, FileText
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Glass } from '../components/Glass'
import { NexusMarkdown } from '../components/NexusMarkdown'
import { useApp } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { hexToRgb, fmtDt } from '../lib/utils'

// ─────────────────────────────────────────────────────────────────
//  MAGIC ELEMENT RENDERERS
// ─────────────────────────────────────────────────────────────────

function MagicList({ content, accent }: { content: string; accent: string }) {
  const rows = content.trim().split('\n').filter(Boolean)
  return (
    <div className="nx-magic-fade" style={{
      border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 10,
      overflow: 'hidden', margin: '12px 0',
    }}>
      {rows.map((row, i) => {
        const [label, detail] = row.split('|').map(s => s.trim())
        return (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 14px',
            background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
            borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            fontSize: 13, transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent')}
          >
            <span style={{ opacity: 0.85 }}>{label}</span>
            {detail && <span style={{ color: accent, fontWeight: 600, fontSize: 12, background: `${accent}18`, padding: '2px 8px', borderRadius: 20 }}>{detail}</span>}
          </div>
        )
      })}
    </div>
  )
}

const ALERT_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  info:    { bg: 'rgba(0,122,255,0.1)',    border: 'rgba(0,122,255,0.35)',    icon: 'ℹ️' },
  success: { bg: 'rgba(48,209,88,0.1)',   border: 'rgba(48,209,88,0.35)',   icon: '✅' },
  warning: { bg: 'rgba(255,159,10,0.1)',  border: 'rgba(255,159,10,0.35)',  icon: '⚠️' },
  error:   { bg: 'rgba(255,69,58,0.1)',   border: 'rgba(255,69,58,0.35)',   icon: '❌' },
  magic:   { bg: 'rgba(191,90,242,0.1)',  border: 'rgba(191,90,242,0.35)',  icon: '✨' },
}

function MagicAlert({ content }: { content: string }) {
  const lines = content.trim().split('\n')
  const type = lines[0]?.trim().toLowerCase() || 'info'
  const msg = lines.slice(1).join('\n').trim()
  const s = ALERT_COLORS[type] || ALERT_COLORS.info
  return (
    <div className="nx-magic-fade" style={{
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 10, padding: '10px 14px', margin: '12px 0', fontSize: 13,
      display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      <span style={{ fontSize: 16, lineHeight: 1.4 }}>{s.icon}</span>
      <span style={{ lineHeight: 1.55 }}>{msg}</span>
    </div>
  )
}

function MagicProgress({ content, accent }: { content: string; accent: string }) {
  const rows = content.trim().split('\n').filter(Boolean)
  return (
    <div className="nx-magic-fade" style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((row, i) => {
        const [label, pct] = row.split('|').map(s => s.trim())
        const val = Math.min(100, Math.max(0, Number(pct) || 0))
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5, opacity: 0.85 }}>
              <span>{label}</span>
              <span style={{ color: accent, fontWeight: 700 }}>{val}%</span>
            </div>
            <div style={{ height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${val}%`, height: '100%',
                background: `linear-gradient(90deg, ${accent}bb, ${accent})`,
                borderRadius: 4, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: `0 0 8px ${accent}55`,
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MagicTimeline({ content, accent }: { content: string; accent: string }) {
  const rows = content.trim().split('\n').filter(Boolean)
  return (
    <div className="nx-magic-fade" style={{ margin: '12px 0', paddingLeft: 16, borderLeft: `2px solid ${accent}40` }}>
      {rows.map((row, i) => {
        const [when, what] = row.split('|').map(s => s.trim())
        return (
          <div key={i} style={{ position: 'relative', paddingLeft: 20, marginBottom: 18 }}>
            <div style={{
              position: 'absolute', left: -9, top: 2, width: 14, height: 14, borderRadius: '50%',
              background: i === 0 ? accent : 'rgba(255,255,255,0.1)',
              border: `2px solid ${i === 0 ? accent : 'rgba(255,255,255,0.2)'}`,
              boxShadow: i === 0 ? `0 0 10px ${accent}66` : 'none',
              transition: 'all 0.2s',
            }} />
            <div style={{ fontSize: 10, color: accent, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{when}</div>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>{what}</div>
          </div>
        )
      })}
    </div>
  )
}

function MagicGrid({ content }: { content: string }) {
  const lines = content.trim().split('\n').filter(Boolean)
  const cols = parseInt(lines[0]) || 2
  const items = lines.slice(1)
  return (
    <div className="nx-magic-fade" style={{
      display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 8, margin: '12px 0',
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.5,
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        >
          {item}
        </div>
      ))}
    </div>
  )
}

function MagicCard({ content, accent }: { content: string; accent: string }) {
  const parts = content.trim().split('|').map(s => s.trim())
  const imgSrc = parts[0]; const title = parts[1]; const desc = parts[2]
  return (
    <div className="nx-magic-fade" style={{
      border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 12, overflow: 'hidden',
      margin: '12px 0', background: 'rgba(255,255,255,0.03)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}>
      {imgSrc && imgSrc.startsWith('http') && (
        <img src={imgSrc} alt={title || 'card'} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
      )}
      <div style={{ padding: '12px 14px' }}>
        {title && <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{title}</div>}
        {desc && <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.55 }}>{desc}</div>}
      </div>
    </div>
  )
}

// Inline badge: `b:Label|variant`
function renderInlineBadge(text: string, accent: string) {
  if (!text.startsWith('b:')) {
    return <code style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4, fontSize: '0.85em' }}>{text}</code>
  }
  const [label, variant] = text.slice(2).split('|')
  const colors: Record<string, string> = {
    magic: accent, success: '#30D158', warning: '#FF9F0A', error: '#FF453A', info: '#007AFF',
  }
  const bg = colors[variant?.toLowerCase()] || accent
  return (
    <span className="nx-badge" style={{
      background: `${bg}22`, color: bg, border: `1px solid ${bg}44`, verticalAlign: 'middle',
    }}>
      {label}
    </span>
  )
}

// ── Code block router — nexus-* → magic components, else code block ──
function NexusCodeBlock({ className, children, accent }: { className?: string; children: React.ReactNode; accent: string }) {
  const lang = (className || '').replace('language-', '')
  // children from react-markdown is already a string for code blocks
  const raw = Array.isArray(children) ? children.join('') : String(children ?? '')
  const content = raw.replace(/\n$/, '')

  if (lang === 'nexus-list')     return <MagicList content={content} accent={accent} />
  if (lang === 'nexus-alert')    return <MagicAlert content={content} />
  if (lang === 'nexus-progress') return <MagicProgress content={content} accent={accent} />
  if (lang === 'nexus-timeline') return <MagicTimeline content={content} accent={accent} />
  if (lang === 'nexus-grid')     return <MagicGrid content={content} />
  if (lang === 'nexus-card')     return <MagicCard content={content} accent={accent} />

  return (
    <pre style={{
      background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: 9,
      overflowX: 'auto', fontSize: 12, margin: '8px 0',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <code>{content}</code>
    </pre>
  )
}

function NexusInlineCode({ children, accent }: { children: React.ReactNode; accent: string }) {
  return <>{renderInlineBadge(String(children ?? ''), accent)}</>
}

// ─────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────

// ── Magic Element Modal — full-screen wizard ────────────────────────────────
interface MagicModalProps {
  accent: string
  accent2: string
  onClose: () => void
  onInsert: (snippet: string) => void
}

const MAGIC_TYPES = [
  {
    id: 'nexus-list', label: 'Liste', icon: '📋', desc: 'Zeilen mit Label und Detail',
    color: '#00AAFF',
    fields: [{ key: 'rows', label: 'Einträge (Label | Detail, eine Zeile pro Eintrag)', multiline: true, placeholder: 'Alpha | Erster Punkt\nBeta | Zweiter Punkt\nGamma | Dritter Punkt' }],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-list\n${v.rows}\n\`\`\`\n`,
  },
  {
    id: 'nexus-alert', label: 'Alert Box', icon: '🔔', desc: 'Info, Warnung oder Fehler',
    color: '#FF9F0A',
    fields: [
      { key: 'type', label: 'Typ (info / success / warning / error)', multiline: false, placeholder: 'info' },
      { key: 'msg', label: 'Nachricht', multiline: true, placeholder: 'Wichtige Information hier...' },
    ],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-alert\n${v.type || 'info'}\n${v.msg}\n\`\`\`\n`,
  },
  {
    id: 'nexus-progress', label: 'Fortschritt', icon: '📊', desc: 'Fortschrittsbalken mit Prozent',
    color: '#30D158',
    fields: [{ key: 'rows', label: 'Einträge (Label | Prozent, eine Zeile pro Balken)', multiline: true, placeholder: 'Frontend | 80\nBackend | 65\nDesign | 45' }],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-progress\n${v.rows}\n\`\`\`\n`,
  },
  {
    id: 'nexus-timeline', label: 'Timeline', icon: '🗓️', desc: 'Zeitstrahl mit Datum und Text',
    color: '#BF5AF2',
    fields: [{ key: 'rows', label: 'Einträge (Datum | Ereignis, eine Zeile pro Punkt)', multiline: true, placeholder: 'Q1 2026 | Projektstart\nQ2 2026 | Alpha Release\nQ3 2026 | Beta Launch' }],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-timeline\n${v.rows}\n\`\`\`\n`,
  },
  {
    id: 'nexus-grid', label: 'Grid', icon: '⊞', desc: 'Mehrspaltiges Raster',
    color: '#FF6B6B',
    fields: [
      { key: 'cols', label: 'Spalten (Zahl)', multiline: false, placeholder: '2' },
      { key: 'items', label: 'Inhalte (eine Zeile pro Zelle)', multiline: true, placeholder: 'Zelle 1\nZelle 2\nZelle 3\nZelle 4' },
    ],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-grid\n${v.cols || '2'}\n${v.items}\n\`\`\`\n`,
  },
  {
    id: 'nexus-card', label: 'Bild-Karte', icon: '🖼️', desc: 'Karte mit Bild, Titel und Text',
    color: '#FF79C6',
    fields: [
      { key: 'url', label: 'Bild-URL', multiline: false, placeholder: 'https://images.unsplash.com/photo-1618005182384?w=600' },
      { key: 'title', label: 'Titel', multiline: false, placeholder: 'Mein Titel' },
      { key: 'desc', label: 'Beschreibung', multiline: false, placeholder: 'Kurze Beschreibung...' },
    ],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-card\n${v.url} | ${v.title} | ${v.desc}\n\`\`\`\n`,
  },
  {
    id: 'badge', label: 'Badge', icon: '✨', desc: 'Inline-Abzeichen im Text',
    color: '#FFE600',
    fields: [
      { key: 'label', label: 'Text', multiline: false, placeholder: 'Nexus' },
      { key: 'variant', label: 'Farbe (magic / success / warning / error / info)', multiline: false, placeholder: 'magic' },
    ],
    build: (v: Record<string,string>) => `\`b:${v.label || 'Badge'}|${v.variant || 'magic'}\``,
  },
]

function MagicElementModal({ accent, accent2, onClose, onInsert }: MagicModalProps) {
  const [selected, setSelected] = React.useState<string | null>(null)
  const [fields, setFields] = React.useState<Record<string,string>>({})

  const type = MAGIC_TYPES.find(m => m.id === selected)

  const handleSelect = (id: string) => {
    setSelected(id)
    // Pre-fill defaults
    const t = MAGIC_TYPES.find(m => m.id === id)!
    const defaults: Record<string,string> = {}
    t.fields.forEach(f => { defaults[f.key] = f.placeholder })
    setFields(defaults)
  }

  const handleInsert = () => {
    if (!type) return
    onInsert(type.build(fields))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        style={{
          width: '100%', maxWidth: 720, maxHeight: '85vh',
          background: 'rgba(12,12,22,0.97)',
          border: `1px solid rgba(255,255,255,0.1)`,
          borderRadius: 20,
          boxShadow: `0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05), 0 0 60px ${accent}18`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: `linear-gradient(135deg, ${accent}40, ${accent2}30)`,
              border: `1px solid ${accent}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>✦</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em' }}>
                {selected ? `Magic: ${type?.label}` : 'Magic Element einfügen'}
              </div>
              <div style={{ fontSize: 10, opacity: 0.4, marginTop: 1 }}>
                {selected ? type?.desc : 'Wähle ein Element aus'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: 'inherit',
            fontSize: 11, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <X size={12} /> ESC
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left: type picker */}
          <div style={{
            width: 220, borderRight: '1px solid rgba(255,255,255,0.07)',
            padding: 12, overflowY: 'auto', flexShrink: 0,
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.3, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8, paddingLeft: 4 }}>
              Elemente
            </div>
            {MAGIC_TYPES.map(mt => (
              <button
                key={mt.id}
                onClick={() => handleSelect(mt.id)}
                style={{
                  width: '100%', padding: '9px 10px', borderRadius: 10, marginBottom: 2,
                  display: 'flex', alignItems: 'center', gap: 10,
                  border: `1px solid ${selected === mt.id ? mt.color + '50' : 'transparent'}`,
                  background: selected === mt.id ? `${mt.color}18` : 'transparent',
                  color: 'inherit', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (selected !== mt.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (selected !== mt.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{mt.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{mt.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2, lineHeight: 1.3 }}>{mt.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Right: editor or empty state */}
          <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {!selected ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.35, gap: 12 }}>
                <div style={{ fontSize: 48 }}>✦</div>
                <div style={{ fontSize: 13, textAlign: 'center' }}>Wähle links ein Element aus<br/>und befülle es mit deinen Daten</div>
              </div>
            ) : type ? (
              <>
                {/* Color accent bar */}
                <div style={{ height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${type.color}, ${type.color}44)`, marginBottom: 20 }} />

                {type.fields.map(field => (
                  <div key={field.key} style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 11, opacity: 0.6, marginBottom: 6, fontWeight: 600 }}>
                      {field.label}
                    </label>
                    {field.multiline ? (
                      <textarea
                        value={fields[field.key] ?? ''}
                        onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))}
                        rows={field.key === 'rows' || field.key === 'items' ? 5 : 3}
                        style={{
                          width: '100%', background: 'rgba(255,255,255,0.05)',
                          border: `1px solid rgba(255,255,255,0.1)`,
                          borderRadius: 10, padding: '10px 12px', color: 'inherit',
                          fontFamily: "'Fira Code', monospace", fontSize: 12, lineHeight: 1.6,
                          resize: 'vertical', outline: 'none',
                          transition: 'border-color 0.15s',
                        }}
                        onFocus={e => { e.target.style.borderColor = type.color + '80' }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={fields[field.key] ?? ''}
                        onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))}
                        style={{
                          width: '100%', background: 'rgba(255,255,255,0.05)',
                          border: `1px solid rgba(255,255,255,0.1)`,
                          borderRadius: 10, padding: '9px 12px', color: 'inherit',
                          fontFamily: 'inherit', fontSize: 12,
                          outline: 'none', transition: 'border-color 0.15s',
                        }}
                        onFocus={e => { e.target.style.borderColor = type.color + '80' }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                      />
                    )}
                  </div>
                ))}

                {/* Live preview */}
                <div style={{ marginTop: 4, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, opacity: 0.4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Vorschau</div>
                  <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10, padding: '10px 12px',
                    fontFamily: "'Fira Code', monospace", fontSize: 11, opacity: 0.65,
                    lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    maxHeight: 120, overflowY: 'auto',
                  }}>
                    {type.build(fields)}
                  </div>
                </div>

                <div style={{ flex: 1 }} />

                {/* Insert button */}
                <button
                  onClick={handleInsert}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#fff',
                    background: `linear-gradient(135deg, ${type.color}, ${accent2})`,
                    boxShadow: `0 4px 20px ${type.color}44`,
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${type.color}55` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${type.color}44` }}
                >
                  <span style={{ fontSize: 16 }}>{type.icon}</span>
                  In Notiz einfügen
                </button>
              </>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function NotesView() {
  const { notes, activeNoteId, addNote, updateNote, delNote, setNote, saveNote } = useApp()
  const [mode, setMode] = useState<'edit' | 'split' | 'preview'>('split')
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'created'>('updated')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [editingTags, setEditingTags] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [showMagic, setShowMagic] = useState(false)
  const [magicStep, setMagicStep] = useState<string | null>(null) // selected element type
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const magicBtnRef = useRef<HTMLButtonElement>(null)
  // Save selection before magic menu opens so we can restore it on insert
  const savedSel = useRef<{ start: number; end: number } | null>(null)
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const active = useMemo(() => notes.find((n) => n.id === activeNoteId) ?? notes[0], [notes, activeNoteId])

  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])

  const [localSettings, setLocalSettings] = useState({
    fontSize: t.notes.fontSize, fontFamily: t.notes.fontFamily,
    lineHeight: t.notes.lineHeight, mode: t.notes.mode,
    autosave: t.editor.autosave, autosaveInterval: t.editor.autosaveInterval,
    wordWrap: t.editor.wordWrap, lineNumbers: t.editor.lineNumbers,
    minimap: t.editor.minimap, cursorAnimation: t.editor.cursorAnimation,
    tabSize: t.editor.tabSize,
    compactMode: t.visual.compactMode, panelRadius: t.visual.panelRadius,
    shadowDepth: t.visual.shadowDepth, spacingDensity: t.visual.spacingDensity as 'comfortable' | 'compact' | 'spacious',
  })

  useEffect(() => { if (active) setUndoStack([active.content]) }, [active?.id])

  useEffect(() => {
    if (!t.editor.autosave || !active?.dirty) return
    const timer = setTimeout(() => {
      saveNote(active.id)
      setLastSavedAt(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))
    }, t.editor.autosaveInterval)
    return () => clearTimeout(timer)
  }, [active?.content, active?.dirty, t.editor.autosave, t.editor.autosaveInterval])

  const handleChange = (value: string) => {
    if (!active) return
    setUndoStack((s) => [...s.slice(-50), value])
    setRedoStack([])
    updateNote(active.id, { content: value, dirty: true })
  }

  const handleUndo = () => {
    if (undoStack.length <= 1 || !active) return
    const ns = [...undoStack]; const last = ns.pop()!
    setRedoStack(r => [...r, last]); const prev = ns[ns.length - 1]
    setUndoStack(ns); updateNote(active.id, { content: prev })
  }

  const handleRedo = () => {
    if (redoStack.length === 0 || !active) return
    const nr = [...redoStack]; const next = nr.pop()!
    setRedoStack(nr); setUndoStack(s => [...s, next])
    updateNote(active.id, { content: next })
  }

  const saveAsFile = () => {
    if (!active) return
    const blob = new Blob([active.content], { type: 'text/markdown;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob); link.download = active.title.replace(/\s/g, '_') + '.md'
    link.click(); URL.revokeObjectURL(link.href); saveNote(active.id)
  }

  // ── Insert format helper — uses saved selection if textarea lost focus ──
  const insertFormat = useCallback((prefix: string, suffix: string = '', placeholder: string = '') => {
    if (!active) return
    const ta = editorRef.current
    // Use saved selection (from magic menu open) or current selection
    const sel = savedSel.current
    const start = sel?.start ?? (ta?.selectionStart ?? active.content.length)
    const end   = sel?.end   ?? (ta?.selectionEnd   ?? active.content.length)
    savedSel.current = null

    const selected = active.content.substring(start, end) || placeholder
    const before = active.content.substring(0, start)
    const after  = active.content.substring(end)
    const newContent = before + prefix + selected + suffix + after
    handleChange(newContent)

    // Restore focus + cursor
    setTimeout(() => {
      if (!ta) return
      ta.focus()
      ta.selectionStart = start + prefix.length
      ta.selectionEnd   = start + prefix.length + selected.length
    }, 10)
  }, [active, handleChange])

  // Save cursor position before magic menu opens
  const handleMagicOpen = () => {
    if (editorRef.current) {
      savedSel.current = { start: editorRef.current.selectionStart, end: editorRef.current.selectionEnd }
    }
    setMagicStep(null)
    setShowMagic(true)
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); insertFormat('**', '**', 'fett') }
      else if (e.key === 'i') { e.preventDefault(); insertFormat('*', '*', 'kursiv') }
      else if (e.key === 's') {
        e.preventDefault()
        if (active) { saveNote(active.id); setLastSavedAt(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })) }
      }
      else if (e.key === 'z') { e.preventDefault(); handleUndo() }
      else if (e.key === 'y') { e.preventDefault(); handleRedo() }
      else if (e.key === 'k') { e.preventDefault(); insertFormat('[', '](url)', 'Link-Text') }
    }
    if (e.key === 'Tab') { e.preventDefault(); insertFormat('  ', '') }
  }, [insertFormat, active, handleUndo, handleRedo, saveNote])

  const stats = useMemo(() => {
    if (!active) return { words: 0, chars: 0, lines: 0 }
    const text = active.content.replace(/[#*`\[\]()]/g, '')
    return { words: text.trim().split(/\s+/).filter(Boolean).length, chars: active.content.length, lines: active.content.split('\n').length }
  }, [active?.content])

  const filteredNotes = useMemo(() => {
    let result = notes
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)))
    }
    if (tagFilter) result = result.filter(n => n.tags.includes(tagFilter))
    result = [...result].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'created') return new Date(b.created).getTime() - new Date(a.created).getTime()
      return new Date(b.updated).getTime() - new Date(a.updated).getTime()
    })
    return [...result.filter(n => n.pinned), ...result.filter(n => !n.pinned)]
  }, [notes, searchQuery, tagFilter, sortBy])

  const allTags = useMemo(() => {
    const set = new Set<string>(); notes.forEach(n => n.tags.forEach(t => set.add(t))); return Array.from(set)
  }, [notes])

  const handleApplySettings = () => {
    t.setNotes({ fontSize: localSettings.fontSize, fontFamily: localSettings.fontFamily, lineHeight: localSettings.lineHeight, mode: localSettings.mode })
    t.setEditor({ autosave: localSettings.autosave, autosaveInterval: localSettings.autosaveInterval, wordWrap: localSettings.wordWrap, lineNumbers: localSettings.lineNumbers, minimap: localSettings.minimap, cursorAnimation: localSettings.cursorAnimation, tabSize: localSettings.tabSize })
    t.setVisual({ compactMode: localSettings.compactMode, panelRadius: localSettings.panelRadius, shadowDepth: localSettings.shadowDepth, spacingDensity: localSettings.spacingDensity })
    setShowSettings(false)
  }

  // Small formatting button
  const FmtBtn = ({ icon: Icon, tooltip, action }: { icon: any; tooltip: string; action: () => void }) => {
    const [h, setH] = useState(false)
    return (
      <button
        title={tooltip} onClick={action}
        onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{
          padding: '5px', borderRadius: 7, border: 'none', cursor: 'pointer',
          background: h ? `rgba(${rgb}, 0.15)` : 'transparent',
          color: h ? t.accent : 'inherit',
          transform: h ? 'scale(1.12)' : 'scale(1)',
          transition: 'all 0.13s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon size={14} />
      </button>
    )
  }

  // ReactMarkdown components — passed accent via closure
  const mdComponents = useMemo(() => ({
    code({ className, children, ...props }: any) {
      // In react-markdown v9, fenced code blocks get className='language-xxx'
      if (className?.startsWith('language-')) {
        return <NexusCodeBlock className={className} accent={t.accent}>{children}</NexusCodeBlock>
      }
      return <NexusInlineCode accent={t.accent}>{children}</NexusInlineCode>
    },
  }), [t.accent])

  const noteStats = useMemo(() => {
    const raw = active?.content || ''
    const words = raw.trim() ? raw.trim().split(/\s+/).length : 0
    const links = (raw.match(/\[\[.*?\]\]|\[[^\]]+\]\([^)]+\)/g) || []).length
    const tasks = (raw.match(/^- \[[ x]\]/gm) || []).length
    const readMins = Math.max(1, Math.round(words / 220))
    return { words, links, tasks, readMins }
  }, [active?.content])

  const insertWorkflowTemplate = (kind: 'daily' | 'meeting' | 'project') => {
    if (!active) return
    const templates: Record<typeof kind, string> = {
      daily: `\n## Daily Focus\n- Top 3 Prioritäten\n- Blocker\n- Heute erledigt\n\n## Review\n- Was lief gut?\n- Was verbessern?\n`,
      meeting: `\n## Meeting\n- Ziel\n- Teilnehmer\n- Entscheidungen\n- Action Items\n`,
      project: `\n## Projekt Plan\n- Scope\n- Milestones\n- Risiken\n- Nächste Schritte\n\n## Tasks\n- [ ] \n`,
    }
    updateNote(active.id, { content: `${active.content}${templates[kind]}` })
  }

  return (
    <div className="flex h-full gap-3 p-3 relative" style={{ minHeight: 0, flexDirection: mob.isMobile ? 'column' : 'row', gap: mob.isMobile ? 0 : 12, padding: mob.isMobile ? 0 : 12 }}>

      {/* Mobile top bar */}
      {mob.isMobile && !focusMode && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.1)', flexShrink:0 }}>
          <button onClick={()=>setShowMobileSidebar(true)} style={{ width:42, height:42, borderRadius:12, background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.2)`, cursor:'pointer', color:t.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <FileText size={20}/>
          </button>
          <div style={{ flex:1, fontSize:15, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:t.accent }}>
            {active ? (active.title || 'Untitled') : 'Notes'}
          </div>
          {active && (
            <div style={{ display:'flex', gap:6 }}>
              {(['edit','preview'] as const).map(m => (
                <button key={m} onClick={()=>setMode(m)}
                  style={{ padding:'8px 12px', borderRadius:10, border:`1px solid ${mode===m?t.accent:'rgba(255,255,255,0.1)'}`, background:mode===m?`rgba(${rgb},0.15)`:'transparent', cursor:'pointer', color:mode===m?t.accent:'inherit', fontSize:12, fontWeight:700 }}>
                  {m==='edit'?'✏️':'👁'}
                </button>
              ))}
              <button onClick={()=>active&&saveNote(active.id)} style={{ width:40, height:40, borderRadius:10, background:t.accent, border:'none', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Save size={16}/>
              </button>
            </div>
          )}
          {!active && (
            <button onClick={addNote} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:12, background:t.accent, border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              <Plus size={16}/> New
            </button>
          )}
        </div>
      )}

      {/* ── SIDEBAR ── */}
      {!focusMode && !mob.isMobile && (
        <Glass className="flex flex-col shrink-0" style={{ width: 220, overflow: 'hidden', minHeight: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>Notes</span>
            <div className="flex gap-0.5">
              {[
                { icon: Search, action: () => setShowSearch(!showSearch), active: showSearch, tip: 'Suchen' },
                { icon: Plus,   action: addNote,                         active: false,        tip: 'Neue Notiz', color: t.accent },
                { icon: Settings, action: () => setShowSettings(true),  active: false,        tip: 'Einstellungen' },
              ].map(({ icon: Icon, action, active: isActive, tip, color }) => (
                <button key={tip} onClick={action} title={tip} style={{
                  padding: '5px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: isActive ? `rgba(${rgb},0.12)` : 'transparent',
                  color: isActive ? t.accent : (color || 'inherit'),
                  transition: 'all 0.15s', display: 'flex',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = `rgba(${rgb},0.12)`)}
                  onMouseLeave={e => (e.currentTarget.style.background = isActive ? `rgba(${rgb},0.12)` : 'transparent')}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          {showSearch && (
            <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <input
                autoFocus placeholder="Suchen..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', borderRadius: 8, fontSize: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                  outline: 'none', color: 'inherit',
                }}
              />
            </div>
          )}

          {allTags.length > 0 && (
            <div className="px-3 py-2 shrink-0 flex flex-wrap gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {allTags.slice(0, 8).map(tag => (
                <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 10, border: 'none', cursor: 'pointer',
                    background: tagFilter === tag ? `rgba(${rgb},0.25)` : 'rgba(255,255,255,0.06)',
                    color: tagFilter === tag ? t.accent : 'inherit', transition: 'all 0.15s',
                  }}
                >#{tag}</button>
              ))}
            </div>
          )}

          <div className="px-2 py-1 shrink-0 flex gap-0.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {(['updated', 'title', 'created'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)} style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 10, border: 'none', cursor: 'pointer',
                background: sortBy === s ? `rgba(${rgb},0.15)` : 'transparent',
                color: sortBy === s ? t.accent : 'inherit', transition: 'all 0.15s',
              }}>
                {s === 'updated' ? 'Aktuell' : s === 'title' ? 'A-Z' : 'Neu'}
              </button>
            ))}
          </div>

          {/* Scrollable list — overflow-y:auto always shows scrollbar when needed */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '6px', minHeight: 0 }}>
            {filteredNotes.map((n) => (
              <div
                key={n.id} onClick={() => setNote(n.id)} role="button" tabIndex={0}
                style={{
                  padding: '8px 10px', borderRadius: 9, cursor: 'pointer', marginBottom: 2,
                  background: n.id === activeNoteId ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderLeft: `2px solid ${n.id === activeNoteId ? t.accent : 'transparent'}`,
                  transition: 'all 0.13s', position: 'relative',
                }}
                className="group"
                onMouseEnter={e => { if (n.id !== activeNoteId) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (n.id !== activeNoteId) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 500 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {n.dirty && <span style={{ color: t.accent, fontSize: 7, flexShrink: 0 }}>●</span>}
                    {n.title}
                  </span>
                  {n.pinned && <Pin size={9} style={{ color: '#FFCC00', flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 10, opacity: 0.45, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.content.replace(/[#*`]/g, '').slice(0, 45)}…
                </div>
                {n.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                    {n.tags.slice(0, 3).map(tag => (
                      <span key={tag} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: `rgba(${rgb},0.12)`, color: t.accent }}>{tag}</span>
                    ))}
                  </div>
                )}
                <div style={{ position: 'absolute', right: 6, top: 6, display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s' }}
                  className="group-hover:opacity-100"
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <button onClick={e => { e.stopPropagation(); updateNote(n.id, { pinned: !n.pinned }) }}
                    style={{ padding: 3, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', display: 'flex' }}>
                    <Pin size={9} style={{ color: n.pinned ? '#FFCC00' : undefined }} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); delNote(n.id) }}
                    style={{ padding: 3, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'rgba(255,69,58,0.15)', color: '#FF453A', display: 'flex' }}>
                    <Trash2 size={9} />
                  </button>
                </div>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div style={{ fontSize: 11, opacity: 0.35, textAlign: 'center', padding: '24px 0' }}>
                {searchQuery ? 'Keine Ergebnisse' : 'Keine Notizen'}
              </div>
            )}
          </div>
        </Glass>
      )}

      {/* Mobile note list — bottom sheet */}
      <AnimatePresence>
        {mob.isMobile && showMobileSidebar && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={() => setShowMobileSidebar(false)}
              style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(5px)' }}/>
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',stiffness:380,damping:30}}
              style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:201,
                background: t.mode==='dark'?'rgba(12,12,22,0.98)':'rgba(248,248,255,0.98)',
                backdropFilter:'blur(24px)', borderRadius:'20px 20px 0 0',
                border:'1px solid rgba(255,255,255,0.1)', borderBottom:'none',
                padding:'8px 0 40px', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
              <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)', margin:'0 auto 12px' }}/>
              <div style={{ padding:'0 16px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontWeight:800, fontSize:16 }}>All Notes <span style={{ fontSize:12, opacity:0.4, fontWeight:500 }}>({notes.length})</span></span>
                <button onClick={()=>{addNote();setShowMobileSidebar(false)}}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:12, background:t.accent, border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  <Plus size={15}/> New
                </button>
              </div>
              {/* Search */}
              <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  placeholder="Search notes…"
                  style={{ width:'100%', padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:14, color:'inherit' }}/>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'8px 12px' }}>
                {notes.filter(n => searchQuery ? (n.title+n.content).toLowerCase().includes(searchQuery.toLowerCase()) : true)
                  .sort((a,b) => new Date(b.updated).getTime()-new Date(a.updated).getTime())
                  .map(n => (
                  <button key={n.id} onClick={()=>{setNote(n.id);setShowMobileSidebar(false)}}
                    style={{ width:'100%', textAlign:'left', padding:'13px 14px', borderRadius:14, cursor:'pointer', marginBottom:6,
                      background: n.id===activeNoteId?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.04)',
                      border:`1px solid ${n.id===activeNoteId?`rgba(${rgb},0.3)`:'rgba(255,255,255,0.07)'}`,
                      display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:n.id===activeNoteId?700:600, color:n.id===activeNoteId?t.accent:'inherit', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {n.pinned && '📌 '}{n.title||'Untitled'}
                      </div>
                      <div style={{ fontSize:12, opacity:0.45, marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {n.content.replace(/[#*`]/g,'').slice(0,60)}
                      </div>
                      {n.tags.length>0 && <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                        {n.tags.slice(0,3).map(tag=><span key={tag} style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:`rgba(${rgb},0.12)`, color:t.accent }}>#{tag}</span>)}
                      </div>}
                    </div>
                  </button>
                ))}
                {notes.length===0 && <div style={{ opacity:0.35, textAlign:'center', padding:'30px 0', fontSize:14 }}>No notes yet</div>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    {/* ── MAIN PANEL ── */}
      {active ? (
        <div className="flex-1 flex flex-col gap-2" style={{ minHeight: 0, overflow: 'hidden' }}>

          {/* Header bar */}
          <Glass className="flex items-center gap-2 px-3 py-2 shrink-0">
            <input
              className="flex-1 bg-transparent outline-none font-semibold"
              style={{ fontSize: 14, minWidth: 0 }}
              value={active.title}
              onChange={e => updateNote(active.id, { title: e.target.value })}
              placeholder="Titel..."
            />
            <div className="flex gap-0.5 items-center shrink-0">
              {/* View mode */}
              {(['edit', 'split', 'preview'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} title={m}
                  style={{
                    padding: '4px 8px', borderRadius: 7, fontSize: 11, fontWeight: 500,
                    border: 'none', cursor: 'pointer',
                    background: mode === m ? `rgba(${rgb},0.18)` : 'transparent',
                    color: mode === m ? t.accent : 'inherit', transition: 'all 0.15s',
                  }}>
                  {m === 'edit' ? <Edit3 size={13} /> : m === 'preview' ? <Eye size={13} /> : <span style={{ fontSize: 10, fontWeight: 700 }}>SPLIT</span>}
                </button>
              ))}
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              {[
                { icon: RotateCcw, tip: 'Undo (Ctrl+Z)', action: handleUndo },
                { icon: RotateCcw, tip: 'Redo (Ctrl+Y)', action: handleRedo, flip: true },
                { icon: Copy,      tip: 'Kopieren',      action: () => navigator.clipboard.writeText(active.content) },
                { icon: Download,  tip: 'Download .md',  action: saveAsFile },
                { icon: Save,      tip: 'Speichern (Ctrl+S)', action: () => { saveNote(active.id); setLastSavedAt(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })) }, accent: active.dirty },
              ].map(({ icon: Icon, tip, action, flip, accent: useAccent }: any) => (
                <button key={tip} onClick={action} title={tip} style={{
                  padding: '5px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: useAccent ? t.accent : 'inherit',
                  transform: flip ? 'scaleX(-1)' : undefined, display: 'flex', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon size={13} />
                </button>
              ))}
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              <button onClick={() => setFocusMode(!focusMode)} title="Focus Mode" style={{
                padding: '5px', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: focusMode ? `rgba(${rgb},0.15)` : 'transparent',
                color: focusMode ? t.accent : 'inherit', transition: 'all 0.15s', display: 'flex',
              }}>
                {focusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </div>
          </Glass>

          {/* Workflow strip */}
          <Glass className="shrink-0" style={{ padding: '7px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Words', val: noteStats.words },
                { label: 'Read', val: `${noteStats.readMins}m` },
                { label: 'Links', val: noteStats.links },
                { label: 'Tasks', val: noteStats.tasks },
              ].map(s => (
                <span key={s.label} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <strong style={{ fontWeight: 800 }}>{s.val}</strong> <span style={{ opacity: 0.6 }}>{s.label}</span>
                </span>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button onClick={() => insertWorkflowTemplate('daily')} style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid rgba(${rgb},0.3)`, background: `rgba(${rgb},0.14)`, color: t.accent, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Daily</button>
                <button onClick={() => insertWorkflowTemplate('meeting')} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Meeting</button>
                <button onClick={() => insertWorkflowTemplate('project')} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Project</button>
              </div>
            </div>
          </Glass>

          {/* Formatting toolbar */}
          {(mode === 'edit' || mode === 'split') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 4px', flexWrap: 'wrap', opacity: 0.9 }}>
              <FmtBtn icon={Heading}      tooltip="H2"           action={() => insertFormat('\n## ', '', 'Überschrift')} />
              <FmtBtn icon={Bold}         tooltip="Fett (Ctrl+B)" action={() => insertFormat('**', '**', 'fett')} />
              <FmtBtn icon={Italic}       tooltip="Kursiv (Ctrl+I)" action={() => insertFormat('*', '*', 'kursiv')} />
              <FmtBtn icon={Strikethrough} tooltip="Durchgestrichen" action={() => insertFormat('~~', '~~', 'text')} />
              <FmtBtn icon={Code}         tooltip="Inline Code"  action={() => insertFormat('`', '`', 'code')} />
              <FmtBtn icon={Link}         tooltip="Link (Ctrl+K)" action={() => insertFormat('[', '](url)', 'Text')} />
              <FmtBtn icon={Quote}        tooltip="Zitat"        action={() => insertFormat('\n> ', '', 'Zitat')} />
              <FmtBtn icon={List}         tooltip="Liste"        action={() => insertFormat('\n- ', '', 'Eintrag')} />
              <FmtBtn icon={ListOrdered}  tooltip="Num. Liste"   action={() => insertFormat('\n1. ', '', 'Eintrag')} />
              <FmtBtn icon={Table}        tooltip="Tabelle"      action={() => insertFormat('\n| Kopf | Kopf |\n| --- | --- |\n| Zelle | Zelle |\n')} />
              <FmtBtn icon={Minus}        tooltip="Trennlinie"   action={() => insertFormat('\n---\n', '')} />

              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

              {/* ✦ Magic Button */}
              <div style={{ position: 'relative' }}>
                <button
                  ref={magicBtnRef}
                  onClick={handleMagicOpen}
                  style={{
                    padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.accent}${showMagic ? '60' : '30'}`,
                    background: showMagic ? `linear-gradient(135deg, ${t.accent}30, ${t.accent2}30)` : `linear-gradient(135deg, ${t.accent}18, ${t.accent2}18)`,
                    color: t.accent, cursor: 'pointer', fontSize: 11, fontWeight: 800,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', gap: 5,
                    boxShadow: showMagic ? `0 0 16px ${t.accent}28` : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <Wand2 size={12} style={{ transform: showMagic ? 'rotate(12deg) scale(1.15)' : 'none', transition: 'transform 0.2s' }} />
                  Magic
                </button>
              </div>

              <div style={{ flex: 1 }} />

              {/* Tags */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Hash size={10} style={{ opacity: 0.35 }} />
                {active.tags.map(tag => (
                  <span key={tag} onClick={() => updateNote(active.id, { tags: active.tags.filter(t => t !== tag) })}
                    style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20, cursor: 'pointer',
                      background: `rgba(${rgb},0.12)`, color: t.accent, transition: 'opacity 0.15s',
                    }}
                    title="Klicken zum Entfernen"
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.6')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {tag} ×
                  </span>
                ))}
                {editingTags ? (
                  <input
                    autoFocus value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        if (!active.tags.includes(newTag.trim())) updateNote(active.id, { tags: [...active.tags, newTag.trim()] })
                        setNewTag(''); setEditingTags(false)
                      }
                      if (e.key === 'Escape') { setEditingTags(false); setNewTag('') }
                    }}
                    onBlur={() => { setEditingTags(false); setNewTag('') }}
                    style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20, width: 70,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      outline: 'none', color: 'inherit',
                    }}
                    placeholder="tag..."
                  />
                ) : (
                  <button onClick={() => setEditingTags(true)}
                    style={{ fontSize: 10, opacity: 0.4, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                  >+ Tag</button>
                )}
              </div>
            </div>
          )}

          {/* ── EDITOR / PREVIEW ── */}
          <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {/* Editor */}
            {(mode === 'edit' || mode === 'split') && (
              <Glass className="flex-1 flex flex-col" style={{ minHeight: 0, overflow: 'hidden' }}>
                {t.editor.lineNumbers ? (
                  <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <div style={{
                      flexShrink: 0, paddingTop: 20, paddingBottom: 20, paddingLeft: 10, paddingRight: 6,
                      textAlign: 'right', userSelect: 'none',
                      fontSize: t.notes.fontSize - 1,
                      lineHeight: `${t.notes.lineHeight * t.notes.fontSize}px`,
                      fontFamily: "'Fira Code', monospace",
                      opacity: 0.18, width: 36, overflowY: 'hidden',
                    }}>
                      {active.content.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
                    </div>
                    <textarea
                      ref={editorRef}
                      style={{
                        flex: 1, background: 'transparent', resize: 'none', outline: 'none',
                        padding: '20px 16px 20px 4px',
                        overflowY: 'auto', overflowX: 'hidden', minHeight: 0,
                        fontSize: t.notes.fontSize,
                        fontFamily: `"${t.notes.fontFamily}", ui-monospace, Menlo, monospace`,
                        lineHeight: t.notes.lineHeight,
                        tabSize: t.editor.tabSize,
                        whiteSpace: t.editor.wordWrap ? 'pre-wrap' : 'pre',
                        overflowWrap: t.editor.wordWrap ? 'break-word' : 'normal',
                        color: 'inherit', border: 'none',
                      }}
                      value={active.content}
                      onChange={e => handleChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                ) : (
                  <textarea
                    ref={editorRef}
                    style={{
                      flex: 1, background: 'transparent', resize: 'none', outline: 'none',
                      padding: 20, overflowY: 'auto', overflowX: 'hidden', minHeight: 0,
                      fontSize: t.notes.fontSize,
                      fontFamily: `"${t.notes.fontFamily}", ui-monospace, Menlo, monospace`,
                      lineHeight: t.notes.lineHeight,
                      tabSize: t.editor.tabSize,
                      whiteSpace: t.editor.wordWrap ? 'pre-wrap' : 'pre',
                      overflowWrap: t.editor.wordWrap ? 'break-word' : 'normal',
                      color: 'inherit', border: 'none',
                    }}
                    value={active.content}
                    onChange={e => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                )}
              </Glass>
            )}

            {/* Preview — always has a visible scrollbar */}
            {(mode === 'preview' || mode === 'split') && (
              <Glass className="flex-1 flex flex-col" style={{ minHeight: 0, overflow: 'hidden' }} glow>
                {/* The scrollable div is direct child of the Glass content wrapper (which is flex-col) */}
                <div style={{
                  flex: 1, overflowY: 'scroll', overflowX: 'hidden',
                  padding: 20, minHeight: 0,
                }}>
                  <NexusMarkdown content={active.content} />
                </div>
              </Glass>
            )}
          </div>

          {/* Status bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '2px 8px', fontSize: 10, opacity: 0.38, flexShrink: 0 }}>
            <span>{stats.words} W</span>
            <span>{stats.chars} Z</span>
            <span>{stats.lines} L</span>
            <div style={{ flex: 1 }} />
            {active.dirty && <span style={{ color: t.accent, opacity: 1 }}>● Ungespeichert</span>}
            {lastSavedAt && !active.dirty && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={9} /> {lastSavedAt}
              </span>
            )}
            <span>{fmtDt(new Date(active.created))}</span>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2, flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 32 }}>📝</div>
          <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Keine Notiz ausgewählt</div>
          <button onClick={addNote} style={{
            marginTop: 8, padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: `rgba(${rgb},0.2)`, color: t.accent, fontSize: 12, fontWeight: 700,
          }}>+ Neue Notiz</button>
        </div>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={() => setShowSettings(false)} />
            <motion.div
              initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'relative', zIndex: 1, width: 380, maxHeight: '80vh', overflowY: 'auto',
                background: t.mode === 'dark' ? 'rgba(14,14,26,0.97)' : 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(24px)', borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 40px 80px rgba(0,0,0,0.7)', padding: 22,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>📝 Notes Settings</span>
                <button onClick={() => setShowSettings(false)} style={{
                  padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)', color: 'inherit', display: 'flex',
                }}><X size={14} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Schriftgröße', key: 'fontSize', type: 'number', min: 10, max: 24, step: 1 },
                  { label: 'Zeilenhöhe', key: 'lineHeight', type: 'number', min: 1, max: 3, step: 0.1 },
                  { label: 'Tab Size', key: 'tabSize', type: 'number', min: 2, max: 8, step: 2 },
                ].map(({ label, key, min, max, step }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ opacity: 0.8 }}>{label}</span>
                    <input type="number" min={min} max={max} step={step}
                      value={(localSettings as any)[key]}
                      onChange={e => setLocalSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
                      style={{
                        width: 60, padding: '4px 8px', borderRadius: 7, fontSize: 12, textAlign: 'right',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        outline: 'none', color: 'inherit',
                      }}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ opacity: 0.8 }}>Schriftart</span>
                  <select value={localSettings.fontFamily} onChange={e => setLocalSettings(s => ({ ...s, fontFamily: e.target.value }))}
                    style={{
                      padding: '4px 8px', borderRadius: 7, fontSize: 11,
                      background: t.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff',
                      border: '1px solid rgba(255,255,255,0.1)', outline: 'none', color: 'inherit',
                    }}>
                    {['Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Monaco', 'Inter', 'system-ui'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                {[
                  { label: 'Wortumbruch', key: 'wordWrap' },
                  { label: 'Zeilennummern', key: 'lineNumbers' },
                  { label: 'Autosave', key: 'autosave' },
                ].map(({ label, key }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ opacity: 0.8 }}>{label}</span>
                    <input type="checkbox" checked={(localSettings as any)[key]}
                      onChange={e => setLocalSettings(s => ({ ...s, [key]: e.target.checked }))}
                      style={{ cursor: 'pointer', accentColor: t.accent, width: 15, height: 15 }}
                    />
                  </div>
                ))}
              </div>
              <button onClick={handleApplySettings} style={{
                marginTop: 16, width: '100%', padding: '10px', borderRadius: 12, border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#fff',
                background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                boxShadow: `0 4px 14px ${t.accent}44`,
                transition: 'all 0.15s',
              }}>
                ✓ Anwenden
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          ✦ MAGIC ELEMENT BUILDER MODAL
          Rendered at top level — always above everything
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showMagic && (
          <MagicElementModal
            accent={t.accent}
            accent2={t.accent2}
            onClose={() => setShowMagic(false)}
            onInsert={(snippet) => {
              insertFormat(snippet)
              setShowMagic(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
