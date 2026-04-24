import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { Copy, Check } from 'lucide-react'
import { writeClipboardTextSafely } from '@nexus/core/canvas/markdownSafety'
import { CanvasNexusCodeBlock } from '@nexus/core/canvas/CanvasMagicRenderers'

// ── Code block with syntax highlighting + copy ─────────────────
function CodeBlock({ className, children, accent }: { className?: string; children: React.ReactNode; accent: string }) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') ?? 'text'
  const code = String(children).replace(/\n$/, '')

  // Magic block types
  if (lang === 'nexus-badge') return <MagicBadge content={code} accent={accent} />
  if (lang.startsWith('nexus-')) {
    return (
      <CanvasNexusCodeBlock className={className} accent={accent}>
        {children}
      </CanvasNexusCodeBlock>
    )
  }

  const copy = async () => {
    const copiedOk = await writeClipboardTextSafely(code)
    if (!copiedOk) return
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const rgb = hexToRgb(accent)

  return (
    <div style={{ position: 'relative', marginBottom: 14, borderRadius: 10, overflow: 'hidden', background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
        <span style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.6 }}>{lang}</span>
        <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? accent : 'inherit', opacity: copied ? 1 : 0.45, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 6px', borderRadius: 5, transition: 'all 0.15s' }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '14px 16px', overflowX: 'auto', fontSize: 13, lineHeight: 1.6 }}>
        <code style={{ fontFamily: "'Fira Code', 'JetBrains Mono', monospace", color: `rgba(${rgb}, 0.95)` }}>{code}</code>
      </pre>
    </div>
  )
}

function InlineCode({ accent, children }: { accent: string; children: React.ReactNode }) {
  const rgb = hexToRgb(accent)
  return (
    <code style={{ background: `rgba(${rgb}, 0.12)`, color: accent, padding: '1px 6px', borderRadius: 4, fontSize: '0.85em', fontFamily: "'Fira Code', monospace", border: `1px solid rgba(${rgb}, 0.2)` }}>
      {children}
    </code>
  )
}

// ── Magic Widgets ────────────────────────────────────────────────

function MagicList({ content, accent }: { content: string; accent: string }) {
  const rgb = hexToRgb(accent)
  const rows = content.split('\n').filter(Boolean)
  return (
    <div style={{ margin: '10px 0 16px', borderRadius: 10, overflow: 'hidden', border: `1px solid rgba(${rgb}, 0.2)` }}>
      {rows.map((row, i) => {
        const [label, detail] = row.split('|').map(s => s.trim())
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: i % 2 === 0 ? `rgba(${rgb}, 0.05)` : 'transparent', borderBottom: i < rows.length - 1 ? `1px solid rgba(${rgb}, 0.1)` : 'none' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
            {detail && <span style={{ fontSize: 12, opacity: 0.55, fontFamily: 'monospace' }}>{detail}</span>}
          </div>
        )
      })}
    </div>
  )
}

function MagicAlert({ content }: { content: string }) {
  const lines = content.split('\n').filter(Boolean)
  const type = lines[0]?.toLowerCase() || 'info'
  const msg = lines.slice(1).join('\n')
  const colors: Record<string, { bg: string; border: string; icon: string }> = {
    info:    { bg: 'rgba(0,122,255,0.1)',   border: '#007AFF', icon: 'ℹ️' },
    warning: { bg: 'rgba(255,214,10,0.1)',  border: '#FFD60A', icon: '⚠️' },
    error:   { bg: 'rgba(255,69,58,0.1)',   border: '#FF453A', icon: '❌' },
    success: { bg: 'rgba(48,209,88,0.1)',   border: '#30D158', icon: '✅' },
    tip:     { bg: 'rgba(94,92,230,0.1)',   border: '#5E5CE6', icon: '💡' },
  }
  const c = colors[type] || colors.info
  return (
    <div style={{ margin: '10px 0 16px', padding: '12px 16px', borderRadius: 10, background: c.bg, borderLeft: `3px solid ${c.border}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: msg ? 5 : 0, opacity: 0.9 }}>{c.icon} {type.toUpperCase()}</div>
      {msg && <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.55 }}>{msg}</div>}
    </div>
  )
}

function MagicCard({ content, accent }: { content: string; accent: string }) {
  const rgb = hexToRgb(accent)
  const lines = content.split('\n').filter(Boolean)
  const title = lines[0] || ''
  const body = lines.slice(1).join('\n')
  return (
    <div style={{ margin: '10px 0 16px', padding: '14px 16px', borderRadius: 12, background: `rgba(${rgb}, 0.07)`, border: `1px solid rgba(${rgb}, 0.2)` }}>
      {title && <div style={{ fontSize: 14, fontWeight: 700, color: accent, marginBottom: 8 }}>{title}</div>}
      {body && <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{body}</div>}
    </div>
  )
}

function MagicProgress({ content, accent }: { content: string; accent: string }) {
  const rgb = hexToRgb(accent)
  const rows = content.split('\n').filter(Boolean)
  return (
    <div style={{ margin: '10px 0 16px' }}>
      {rows.map((row, i) => {
        const [label, valStr] = row.split('|').map(s => s.trim())
        const val = Math.min(100, Math.max(0, parseFloat(valStr) || 0))
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5, opacity: 0.8 }}>
              <span>{label}</span>
              <span style={{ color: accent }}>{val}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ width: `${val}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${accent}, rgba(${rgb},0.7))`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MagicBadge({ content, accent }: { content: string; accent: string }) {
  const rgb = hexToRgb(accent)
  const tags = content.split('\n').filter(Boolean)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 14px' }}>
      {tags.map((tag, i) => (
        <span key={i} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `rgba(${rgb}, 0.15)`, color: accent, border: `1px solid rgba(${rgb}, 0.3)` }}>{tag.trim()}</span>
      ))}
    </div>
  )
}

// ── Main exported component ──────────────────────────────────────

interface NexusMarkdownProps {
  content: string
  className?: string
  style?: React.CSSProperties
  components?: Record<string, any>
}

export function NexusMarkdown({ content, className = '', style, components }: NexusMarkdownProps) {
  const t = useTheme()
  const baseComponents = {
    pre({ children }: any) { return <>{children}</> },
    code({ className: cls, children, ...props }: any) {
      const isBlock = Boolean(cls?.startsWith('language-'))
      if (isBlock) return <CodeBlock className={cls} accent={t.accent}>{children}</CodeBlock>
      return <InlineCode accent={t.accent}>{children}</InlineCode>
    },
    h1: ({ children }: any) => <h1 style={{ fontSize: '1.6em', fontWeight: 800, color: 'inherit', margin: '0.8em 0 0.4em', borderBottom: `1px solid rgba(255,255,255,0.1)`, paddingBottom: '0.3em' }}>{children}</h1>,
    h2: ({ children }: any) => <h2 style={{ fontSize: '1.3em', fontWeight: 700, color: 'inherit', margin: '0.7em 0 0.35em' }}>{children}</h2>,
    h3: ({ children }: any) => <h3 style={{ fontSize: '1.1em', fontWeight: 700, color: 'inherit', margin: '0.6em 0 0.3em' }}>{children}</h3>,
    blockquote: ({ children }: any) => (
      <blockquote style={{ borderLeft: `3px solid ${t.accent}`, paddingLeft: 14, margin: '10px 0', opacity: 0.75, fontStyle: 'italic' }}>{children}</blockquote>
    ),
    hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '16px 0' }} />,
    table: ({ children }: any) => (
      <div style={{ overflowX: 'auto', marginBottom: 14 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead style={{ background: 'rgba(255,255,255,0.05)' }}>{children}</thead>,
    th: ({ children }: any) => <th style={{ padding: '7px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</th>,
    td: ({ children }: any) => <td style={{ padding: '7px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{children}</td>,
    a: ({ href, children }: any) => <a href={href} style={{ color: t.accent, textDecoration: 'underline', textDecorationColor: `${t.accent}60` }} target="_blank" rel="noreferrer">{children}</a>,
    strong: ({ children }: any) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
    em: ({ children }: any) => <em style={{ opacity: 0.8 }}>{children}</em>,
    img: ({ src, alt }: any) => <img src={src} alt={alt} style={{ maxWidth: '100%', borderRadius: 8, margin: '8px 0', display: 'block' }} />,
    ul: ({ children }: any) => <ul style={{ paddingLeft: '1.4em', margin: '8px 0' }}>{children}</ul>,
    ol: ({ children }: any) => <ol style={{ paddingLeft: '1.4em', margin: '8px 0' }}>{children}</ol>,
    li: ({ children }: any) => <li style={{ marginBottom: '0.25em', lineHeight: 1.65 }}>{children}</li>,
    p: ({ children }: any) => <p style={{ margin: '0 0 0.8em', lineHeight: 1.72 }}>{children}</p>,
  }
  const mergedComponents = {
    ...baseComponents,
    ...(components || {}),
  }

  return (
    <div style={style} className={`nx-prose ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={mergedComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
