import React from 'react'

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

export function NexusCodeBlock({ className, children, accent }: { className?: string; children: React.ReactNode; accent: string }) {
  const lang = (className || '').replace('language-', '')
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

export function NexusInlineCode({ children, accent }: { children: React.ReactNode; accent: string }) {
  return <>{renderInlineBadge(String(children ?? ''), accent)}</>
}
