import React from 'react'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  NOTES_MAGIC_DEFINITIONS,
  buildNotesMagicSnippet,
} from '@nexus/core/notes/magicRegistry'

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
          <div key={i} className="nx-surface-row" data-active="false" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 14px',
            background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
            borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            fontSize: 13,
            ['--nx-row-hover-bg' as any]: 'rgba(255,255,255,0.05)',
          }}>
            <span style={{ opacity: 0.85 }}>{label}</span>
            {detail && <span style={{ color: accent, fontWeight: 600, fontSize: 12, background: `${accent}18`, padding: '2px 8px', borderRadius: 20 }}>{detail}</span>}
          </div>
        )
      })}
    </div>
  )
}

function MagicChecklist({ content, accent }: { content: string; accent: string }) {
  const parsed = React.useMemo(() => (
    content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((row) => {
        const [labelRaw, doneRaw] = row.split('|').map(s => s.trim())
        const done = ['1', 'true', 'done', 'x', 'yes', 'y'].includes((doneRaw || '').toLowerCase())
        return { label: labelRaw || 'Neuer Punkt', done }
      })
  ), [content])
  const [items, setItems] = React.useState(parsed)

  React.useEffect(() => {
    setItems(parsed)
  }, [parsed])

  const doneCount = items.filter((item) => item.done).length
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0

  return (
    <div className="nx-magic-fade" style={{
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: '10px 12px',
      margin: '12px 0',
      background: 'linear-gradient(155deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>Checklist</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: accent }}>
          {doneCount}/{items.length} ({progress}%)
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          borderRadius: 999,
          background: `linear-gradient(90deg, ${accent}bb, ${accent})`,
          transition: 'width 0.25s ease',
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => {
              setItems((prev) => prev.map((entry, index) => (
                index === i ? { ...entry, done: !entry.done } : entry
              )))
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 9,
              padding: '8px 10px',
              background: item.done ? `${accent}18` : 'rgba(255,255,255,0.03)',
              color: 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              border: `1px solid ${item.done ? accent : 'rgba(255,255,255,0.35)'}`,
              display: 'grid',
              placeItems: 'center',
              color: accent,
              fontSize: 11,
              fontWeight: 800,
              flexShrink: 0,
              background: item.done ? `${accent}30` : 'transparent',
            }}>
              {item.done ? '✓' : ''}
            </span>
            <span style={{
              fontSize: 12,
              opacity: item.done ? 0.65 : 0.92,
              textDecoration: item.done ? 'line-through' : 'none',
            }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
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
        <div key={i} className="nx-surface-row" data-active="false" style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.5,
          ['--nx-row-hover-bg' as any]: 'rgba(255,255,255,0.07)',
        }}>
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

function MagicMetrics({ content, accent }: { content: string; accent: string }) {
  const rows = content.trim().split('\n').filter(Boolean).map((row) => {
    const [label, value, delta] = row.split('|').map(s => s.trim())
    return { label, value, delta }
  })
  return (
    <div className="nx-magic-fade" style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 10, margin: '12px 0',
    }}>
      {rows.map((row, i) => (
        <div key={i} style={{
          borderRadius: 10, padding: '10px 12px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: `linear-gradient(155deg, ${accent}14, rgba(255,255,255,0.03))`,
        }}>
          <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{row.label || `KPI ${i + 1}`}</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, lineHeight: 1.1 }}>{row.value || '0'}</div>
          {row.delta && (
            <div style={{
              marginTop: 6, fontSize: 11, fontWeight: 700, display: 'inline-flex',
              padding: '2px 8px', borderRadius: 999, background: `${accent}22`, color: accent,
            }}>
              {row.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function MagicSteps({ content, accent }: { content: string; accent: string }) {
  const rows = content.trim().split('\n').filter(Boolean).map((row) => {
    const [title, detail] = row.split('|').map(s => s.trim())
    return { title, detail }
  })
  return (
    <div className="nx-magic-fade" style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 10 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: `${accent}26`, border: `1px solid ${accent}55`, color: accent,
            fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {i + 1}
          </div>
          <div style={{
            flex: 1, borderRadius: 8, padding: '8px 10px',
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{row.title || `Step ${i + 1}`}</div>
            {row.detail && <div style={{ fontSize: 12, opacity: 0.68, marginTop: 3, lineHeight: 1.5 }}>{row.detail}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

function MagicQuadrant({ content, accent }: { content: string; accent: string }) {
  const rows = content.trim().split('\n').filter(Boolean).map((row) => {
    const [title, detail] = row.split('|').map(s => s.trim())
    return { title, detail }
  })
  while (rows.length < 4) rows.push({ title: `Quadrant ${rows.length + 1}`, detail: '' })
  return (
    <div className="nx-magic-fade" style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '12px 0',
    }}>
      {rows.slice(0, 4).map((row, i) => (
        <div key={i} style={{
          minHeight: 86, borderRadius: 10, padding: '8px 10px',
          border: `1px solid ${accent}26`, background: `${accent}12`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: accent }}>{row.title || `Quadrant ${i + 1}`}</div>
          <div style={{ fontSize: 12, opacity: 0.76, marginTop: 4, lineHeight: 1.45 }}>{row.detail || 'Inhalt hinzufügen'}</div>
        </div>
      ))}
    </div>
  )
}

const CALLOUT_STYLES: Record<string, { border: string; bg: string; icon: string }> = {
  info: { border: 'rgba(0,122,255,0.35)', bg: 'rgba(0,122,255,0.1)', icon: 'ℹ️' },
  success: { border: 'rgba(48,209,88,0.35)', bg: 'rgba(48,209,88,0.1)', icon: '✅' },
  warning: { border: 'rgba(255,159,10,0.35)', bg: 'rgba(255,159,10,0.12)', icon: '⚠️' },
  error: { border: 'rgba(255,69,58,0.35)', bg: 'rgba(255,69,58,0.1)', icon: '⛔' },
  tip: { border: 'rgba(191,90,242,0.35)', bg: 'rgba(191,90,242,0.11)', icon: '💡' },
}

function MagicCallout({ content }: { content: string }) {
  const lines = content.trim().split('\n').filter(Boolean)
  const [typeRaw = 'info', titleRaw = 'Hinweis'] = (lines[0] || 'info | Hinweis').split('|').map(v => v.trim())
  const body = lines.slice(1).join('\n').trim() || 'Details ergänzen'
  const type = typeRaw.toLowerCase()
  const style = CALLOUT_STYLES[type] || CALLOUT_STYLES.info
  return (
    <div className="nx-magic-fade" style={{
      margin: '12px 0',
      borderRadius: 10,
      border: `1px solid ${style.border}`,
      background: style.bg,
      padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>{style.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{titleRaw || 'Hinweis'}</span>
      </div>
      <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{body}</div>
    </div>
  )
}

function MagicKanban({ content, accent }: { content: string; accent: string }) {
  const entries = content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((row) => {
      const [laneRaw, taskRaw] = row.split('|').map((v) => v.trim())
      return {
        lane: laneRaw || 'Backlog',
        task: taskRaw || 'Neuer Task',
      }
    })
  const laneOrder = ['Backlog', 'Todo', 'Doing', 'Review', 'Done']
  const laneMap = new Map<string, string[]>()
  entries.forEach((entry) => {
    if (!laneMap.has(entry.lane)) laneMap.set(entry.lane, [])
    laneMap.get(entry.lane)!.push(entry.task)
  })
  const lanes = Array.from(laneMap.keys()).sort((a, b) => {
    const ai = laneOrder.indexOf(a)
    const bi = laneOrder.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
  return (
    <div className="nx-magic-fade" style={{
      margin: '12px 0',
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.max(1, lanes.length)}, minmax(140px, 1fr))`,
      gap: 8,
    }}>
      {lanes.length === 0 && (
        <div style={{ fontSize: 12, opacity: 0.55 }}>Keine Kanban-Einträge</div>
      )}
      {lanes.map((lane) => {
        const tasks = laneMap.get(lane) || []
        return (
          <div key={lane} style={{
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            padding: 8,
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
              {lane}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {tasks.map((task, index) => (
                <div key={`${lane}-${index}`} style={{
                  borderRadius: 7,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.16)',
                  padding: '6px 8px',
                  fontSize: 12,
                  lineHeight: 1.45,
                }}>
                  {task}
                </div>
              ))}
              {tasks.length === 0 && (
                <div style={{ fontSize: 11, opacity: 0.5, padding: '2px 0' }}>Keine Tasks</div>
              )}
            </div>
          </div>
        )
      })}
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
export function NexusCodeBlock({ className, children, accent }: { className?: string; children: React.ReactNode; accent: string }) {
  const lang = (className || '').replace('language-', '')
  // children from react-markdown is already a string for code blocks
  const raw = Array.isArray(children) ? children.join('') : String(children ?? '')
  const content = raw.replace(/\n$/, '')

  if (lang === 'nexus-list')     return <MagicList content={content} accent={accent} />
  if (lang === 'nexus-checklist') return <MagicChecklist content={content} accent={accent} />
  if (lang === 'nexus-alert')    return <MagicAlert content={content} />
  if (lang === 'nexus-progress') return <MagicProgress content={content} accent={accent} />
  if (lang === 'nexus-timeline') return <MagicTimeline content={content} accent={accent} />
  if (lang === 'nexus-grid')     return <MagicGrid content={content} />
  if (lang === 'nexus-card')     return <MagicCard content={content} accent={accent} />
  if (lang === 'nexus-kanban')   return <MagicKanban content={content} accent={accent} />
  if (lang === 'nexus-metrics')  return <MagicMetrics content={content} accent={accent} />
  if (lang === 'nexus-steps')    return <MagicSteps content={content} accent={accent} />
  if (lang === 'nexus-quadrant') return <MagicQuadrant content={content} accent={accent} />
  if (lang === 'nexus-callout')  return <MagicCallout content={content} />

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

export function NexusInlineCode({ children, accent }: { children: React.ReactNode; accent: string }) {
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

export function MagicElementModal({ accent, accent2, onClose, onInsert }: MagicModalProps) {
  const [selected, setSelected] = React.useState<string | null>(null)
  const [fields, setFields] = React.useState<Record<string,string>>({})

  const type = NOTES_MAGIC_DEFINITIONS.find(m => m.id === selected)

  const handleSelect = (id: string) => {
    setSelected(id)
    const t = NOTES_MAGIC_DEFINITIONS.find(m => m.id === id)
    if (!t) return
    const defaults: Record<string,string> = {}
    t.fields.forEach(f => { defaults[f.key] = f.placeholder })
    setFields(defaults)
  }

  const handleInsert = () => {
    if (!type) return
    onInsert(buildNotesMagicSnippet(type.id, fields))
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
            {NOTES_MAGIC_DEFINITIONS.map(mt => (
              <button
                key={mt.id}
                onClick={() => handleSelect(mt.id)}
                className="nx-surface-row"
                data-active={selected === mt.id ? "true" : "false"}
                style={{
                  width: '100%', padding: '9px 10px', borderRadius: 10, marginBottom: 2,
                  display: 'flex', alignItems: 'center', gap: 10,
                  border: `1px solid ${selected === mt.id ? mt.color + '50' : 'transparent'}`,
                  background: selected === mt.id ? `${mt.color}18` : 'transparent',
                  color: 'inherit', cursor: 'pointer', textAlign: 'left',
                  ['--nx-row-hover-bg' as any]: 'rgba(255,255,255,0.05)',
                }}
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
                    {buildNotesMagicSnippet(type.id, fields)}
                  </div>
                </div>

                <div style={{ flex: 1 }} />

                {/* Insert button */}
                <button
                  onClick={handleInsert}
                  className="nx-interactive nx-bounce-target"
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#fff',
                    background: `linear-gradient(135deg, ${type.color}, ${accent2})`,
                    boxShadow: `0 4px 20px ${type.color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
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
