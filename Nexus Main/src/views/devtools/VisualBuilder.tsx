import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlignJustify,
  Check,
  Copy,
  Image as ImageIcon,
  Layout,
  MousePointer2,
  Square,
  Trash2,
  Type,
  Wand2,
} from 'lucide-react'
import { Glass } from '../../components/Glass'
import { useTheme } from '../../store/themeStore'
import { hexToRgb } from '../../lib/utils'

type BuilderElementType = 'section' | 'card' | 'button' | 'text' | 'input' | 'image'

type BuilderElement = {
  id: string
  type: BuilderElementType
  label: string
  x: number
  y: number
  width: number
  height: number
  radius: number
  padding: number
  fontSize: number
  weight: number
  bg: string
  fg: string
  border: string
  align: 'left' | 'center' | 'right'
}

type BuilderPayload = {
  html: string
  css: string
}

type VisualBuilderProps = {
  onApplyToCode: (payload: BuilderPayload) => void
}

const BUILDER_CANVAS_WIDTH = 1600
const BUILDER_CANVAS_HEIGHT = 960

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const snap = (value: number, step = 4) => Math.round(value / step) * step

const elementBase = (
  type: BuilderElementType,
  id: string,
  index: number,
  accent: string,
  accent2: string,
): BuilderElement => {
  const offsetX = 90 + (index % 4) * 290
  const offsetY = 90 + Math.floor(index / 4) * 200
  if (type === 'section') {
    return {
      id,
      type,
      label: 'Section',
      x: offsetX,
      y: offsetY,
      width: 520,
      height: 240,
      radius: 24,
      padding: 24,
      fontSize: 18,
      weight: 700,
      bg: `linear-gradient(135deg, ${accent}22, ${accent2}20)`,
      fg: '#f8fafc',
      border: 'rgba(255,255,255,0.16)',
      align: 'left',
    }
  }
  if (type === 'card') {
    return {
      id,
      type,
      label: 'Feature Card',
      x: offsetX,
      y: offsetY,
      width: 280,
      height: 180,
      radius: 18,
      padding: 16,
      fontSize: 15,
      weight: 600,
      bg: 'rgba(255,255,255,0.08)',
      fg: '#f8fafc',
      border: 'rgba(255,255,255,0.2)',
      align: 'left',
    }
  }
  if (type === 'button') {
    return {
      id,
      type,
      label: 'Call To Action',
      x: offsetX,
      y: offsetY,
      width: 210,
      height: 56,
      radius: 12,
      padding: 14,
      fontSize: 14,
      weight: 700,
      bg: `linear-gradient(135deg, ${accent}, ${accent2})`,
      fg: '#ffffff',
      border: 'rgba(255,255,255,0.2)',
      align: 'center',
    }
  }
  if (type === 'text') {
    return {
      id,
      type,
      label: 'Hero Title',
      x: offsetX,
      y: offsetY,
      width: 420,
      height: 100,
      radius: 12,
      padding: 10,
      fontSize: 40,
      weight: 800,
      bg: 'transparent',
      fg: '#f8fafc',
      border: 'rgba(255,255,255,0.0)',
      align: 'left',
    }
  }
  if (type === 'input') {
    return {
      id,
      type,
      label: 'Email address',
      x: offsetX,
      y: offsetY,
      width: 290,
      height: 54,
      radius: 12,
      padding: 12,
      fontSize: 14,
      weight: 500,
      bg: 'rgba(255,255,255,0.06)',
      fg: '#f8fafc',
      border: 'rgba(255,255,255,0.2)',
      align: 'left',
    }
  }
  return {
    id,
    type,
    label: 'Image Placeholder',
    x: offsetX,
    y: offsetY,
    width: 320,
    height: 220,
    radius: 16,
    padding: 12,
    fontSize: 14,
    weight: 600,
    bg: 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))',
    fg: '#dbeafe',
    border: 'rgba(255,255,255,0.22)',
    align: 'center',
  }
}

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const escapeHtml = (value: string) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

function renderElementContent(element: BuilderElement) {
  if (element.type === 'image') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
        <ImageIcon size={24} style={{ opacity: 0.8 }} />
      </div>
    )
  }
  if (element.type === 'input') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          opacity: 0.82,
          fontSize: element.fontSize,
        }}
      >
        {element.label}
      </div>
    )
  }
  return <span>{element.label}</span>
}

function toMarkup(elements: BuilderElement[]): BuilderPayload {
  const sorted = [...elements].sort((a, b) => a.y - b.y || a.x - b.x)
  const html: string[] = []
  const css: string[] = []

  html.push('<main class="nexus-builder-root">')
  sorted.forEach((element) => {
    const cls = `vb-${element.id}`
    if (element.type === 'button') {
      html.push(`  <button class="nexus-builder-item ${cls}">${escapeHtml(element.label)}</button>`)
      return
    }
    if (element.type === 'input') {
      html.push(`  <label class="nexus-builder-item ${cls}" aria-label="${escapeHtml(element.label)}">${escapeHtml(element.label)}</label>`)
      return
    }
    if (element.type === 'image') {
      html.push(`  <figure class="nexus-builder-item ${cls}" aria-label="${escapeHtml(element.label)}">`)
      html.push('    <span aria-hidden="true">Image</span>')
      html.push('  </figure>')
      return
    }
    html.push(`  <div class="nexus-builder-item ${cls}">${escapeHtml(element.label)}</div>`)
  })
  html.push('</main>')

  css.push(':root { color-scheme: dark; }')
  css.push('body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 10% 10%, #111827, #020617 55%); color: #f8fafc; font-family: "SF Pro Display", "Inter", sans-serif; }')
  css.push('.nexus-builder-root { position: relative; width: 100%; max-width: 1600px; min-height: 920px; margin: 0 auto; }')
  css.push('.nexus-builder-item { position: absolute; box-sizing: border-box; display: flex; align-items: center; justify-content: center; }')

  sorted.forEach((element) => {
    const cls = `.vb-${element.id}`
    css.push(
      `${cls} {` +
        ` left:${Math.round(element.x)}px;` +
        ` top:${Math.round(element.y)}px;` +
        ` width:${Math.round(element.width)}px;` +
        ` height:${Math.round(element.height)}px;` +
        ` padding:${Math.round(element.padding)}px;` +
        ` border-radius:${Math.round(element.radius)}px;` +
        ` border:1px solid ${element.border};` +
        ` background:${element.bg};` +
        ` color:${element.fg};` +
        ` font-size:${Math.round(element.fontSize)}px;` +
        ` font-weight:${Math.round(element.weight)};` +
        ` text-align:${element.align};` +
        ` justify-content:${element.align === 'left' ? 'flex-start' : element.align === 'right' ? 'flex-end' : 'center'};` +
        `}`
    )
    if (element.type === 'button') {
      css.push(`${cls} { cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }`)
      css.push(`${cls}:hover { transform: translateY(-1px); box-shadow: 0 12px 26px rgba(2, 6, 23, 0.45); }`)
    }
  })

  return {
    html: html.join('\n'),
    css: css.join('\n'),
  }
}

function InspectorRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, opacity: 0.55, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

function NumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (next: number) => void
}) {
  return (
    <input
      type="number"
      value={Math.round(value)}
      min={min}
      max={max}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{
        width: '100%',
        borderRadius: 7,
        border: '1px solid rgba(255,255,255,0.13)',
        background: 'rgba(255,255,255,0.06)',
        color: 'inherit',
        padding: '6px 8px',
        fontSize: 11,
      }}
    />
  )
}

export function VisualBuilder({ onApplyToCode }: VisualBuilderProps) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)

  const [elements, setElements] = useState<BuilderElement[]>(() => [
    elementBase('section', makeId('section'), 0, t.accent, t.accent2),
    elementBase('text', makeId('text'), 1, t.accent, t.accent2),
    elementBase('button', makeId('button'), 2, t.accent, t.accent2),
    elementBase('card', makeId('card'), 3, t.accent, t.accent2),
  ])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copiedState, setCopiedState] = useState<'none' | 'code' | 'css'>('none')

  const canvasRef = useRef<HTMLDivElement>(null)
  const dragMeta = useRef<{
    id: string
    offsetX: number
    offsetY: number
  } | null>(null)
  const frameRef = useRef(0)
  const pendingRef = useRef<{ id: string; x: number; y: number } | null>(null)
  const elementsRef = useRef(elements)

  useEffect(() => {
    elementsRef.current = elements
  }, [elements])

  const selected = useMemo(
    () => elements.find((element) => element.id === selectedId) ?? null,
    [elements, selectedId],
  )

  const syncCopiedState = useCallback((next: 'code' | 'css') => {
    setCopiedState(next)
    window.setTimeout(() => setCopiedState('none'), 1500)
  }, [])

  const patchSelected = useCallback((patch: Partial<BuilderElement>) => {
    if (!selectedId) return
    setElements((prev) =>
      prev.map((item) => (item.id === selectedId ? { ...item, ...patch } : item)),
    )
  }, [selectedId])

  const addElement = useCallback((type: BuilderElementType) => {
    const id = makeId(type)
    setElements((prev) => [...prev, elementBase(type, id, prev.length, t.accent, t.accent2)])
    setSelectedId(id)
  }, [t.accent, t.accent2])

  const removeSelected = useCallback(() => {
    if (!selectedId) return
    setElements((prev) => prev.filter((item) => item.id !== selectedId))
    setSelectedId(null)
  }, [selectedId])

  const duplicateSelected = useCallback(() => {
    if (!selected) return
    const duplicate: BuilderElement = {
      ...selected,
      id: makeId(selected.type),
      x: snap(selected.x + 44),
      y: snap(selected.y + 44),
      label: `${selected.label} Copy`,
    }
    setElements((prev) => [...prev, duplicate])
    setSelectedId(duplicate.id)
  }, [selected])

  const autoLayout = useCallback(() => {
    const gap = 34
    const columns = 3
    let x = 80
    let y = 80
    let col = 0
    let rowHeight = 0

    setElements((prev) =>
      prev.map((item) => {
        const next = { ...item, x, y }
        rowHeight = Math.max(rowHeight, item.height)
        col += 1
        x += item.width + gap
        if (col >= columns) {
          col = 0
          x = 80
          y += rowHeight + gap
          rowHeight = 0
        }
        return next
      }),
    )
  }, [])

  const applyToCode = useCallback(() => {
    const payload = toMarkup(elements)
    onApplyToCode(payload)
    syncCopiedState('code')
  }, [elements, onApplyToCode, syncCopiedState])

  const copyCss = useCallback(async () => {
    const payload = toMarkup(elements)
    await navigator.clipboard.writeText(payload.css)
    syncCopiedState('css')
  }, [elements, syncCopiedState])

  const flushDrag = useCallback(() => {
    frameRef.current = 0
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    setElements((prev) =>
      prev.map((item) =>
        item.id === pending.id ? { ...item, x: pending.x, y: pending.y } : item,
      ),
    )
  }, [])

  const onMouseDownElement = useCallback((event: React.MouseEvent, id: string) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('[data-builder-ignore-drag="true"]')) return

    const canvas = canvasRef.current
    const current = elementsRef.current.find((item) => item.id === id)
    if (!canvas || !current) return

    const rect = canvas.getBoundingClientRect()
    dragMeta.current = {
      id,
      offsetX: event.clientX - rect.left - current.x,
      offsetY: event.clientY - rect.top - current.y,
    }
    setSelectedId(id)

    const onMove = (moveEvent: MouseEvent) => {
      const meta = dragMeta.current
      const canvasNode = canvasRef.current
      if (!meta || !canvasNode) return
      const view = canvasNode.getBoundingClientRect()
      const source = elementsRef.current.find((item) => item.id === meta.id)
      if (!source) return

      const maxX = Math.max(0, BUILDER_CANVAS_WIDTH - source.width)
      const maxY = Math.max(0, BUILDER_CANVAS_HEIGHT - source.height)
      const nextX = snap(clamp(moveEvent.clientX - view.left - meta.offsetX, 0, maxX))
      const nextY = snap(clamp(moveEvent.clientY - view.top - meta.offsetY, 0, maxY))

      pendingRef.current = { id: meta.id, x: nextX, y: nextY }
      if (!frameRef.current) frameRef.current = requestAnimationFrame(flushDrag)
    }

    const onUp = () => {
      dragMeta.current = null
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
      }
      flushDrag()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [flushDrag])

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
  }, [])

  const palette: Array<{ type: BuilderElementType; label: string; icon: any }> = [
    { type: 'section', label: 'Section', icon: Layout },
    { type: 'card', label: 'Card', icon: Square },
    { type: 'button', label: 'Button', icon: MousePointer2 },
    { type: 'text', label: 'Text', icon: Type },
    { type: 'input', label: 'Input', icon: AlignJustify },
    { type: 'image', label: 'Image', icon: ImageIcon },
  ]

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%', overflow: 'hidden' }}>
      <Glass
        style={{
          width: 210,
          flexShrink: 0,
          padding: 12,
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.14)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase', opacity: 0.45, marginBottom: 8 }}>
          No-Code Palette
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {palette.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.type}
                onClick={() => addElement(item.type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 10px',
                  borderRadius: 9,
                  border: `1px solid rgba(${rgb},0.2)`,
                  background: `rgba(${rgb},0.08)`,
                  color: t.accent,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <Icon size={14} />
                {item.label}
              </button>
            )
          })}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />

        <div style={{ display: 'grid', gap: 6 }}>
          <button
            onClick={autoLayout}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 650,
            }}
          >
            Auto Layout
          </button>
          <button
            onClick={duplicateSelected}
            disabled={!selected}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: `1px solid ${selected ? `rgba(${rgb},0.3)` : 'rgba(255,255,255,0.1)'}`,
              background: selected ? `rgba(${rgb},0.1)` : 'rgba(255,255,255,0.04)',
              color: selected ? t.accent : 'rgba(255,255,255,0.5)',
              cursor: selected ? 'pointer' : 'not-allowed',
              fontSize: 11,
              fontWeight: 650,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Copy size={12} />
            Duplicate
          </button>
          <button
            onClick={removeSelected}
            disabled={!selected}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: `1px solid ${selected ? 'rgba(255,69,58,0.34)' : 'rgba(255,255,255,0.1)'}`,
              background: selected ? 'rgba(255,69,58,0.12)' : 'rgba(255,255,255,0.04)',
              color: selected ? '#ff7b72' : 'rgba(255,255,255,0.5)',
              cursor: selected ? 'pointer' : 'not-allowed',
              fontSize: 11,
              fontWeight: 650,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />

        <div style={{ display: 'grid', gap: 6 }}>
          <button
            onClick={applyToCode}
            style={{
              padding: '10px 10px',
              borderRadius: 9,
              border: `1px solid rgba(${rgb},0.32)`,
              background: `linear-gradient(135deg, rgba(${rgb},0.18), rgba(${rgb},0.08))`,
              color: t.accent,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {copiedState === 'code' ? <Check size={12} /> : <Wand2 size={12} />}
            Sync to Code
          </button>
          <button
            onClick={copyCss}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: copiedState === 'css' ? t.accent : 'inherit',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 650,
            }}
          >
            {copiedState === 'css' ? 'CSS Copied' : 'Copy CSS'}
          </button>
        </div>
      </Glass>

      <Glass
        style={{
          flex: 1,
          minWidth: 0,
          padding: 10,
          overflow: 'auto',
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          ref={canvasRef}
          style={{
            position: 'relative',
            width: BUILDER_CANVAS_WIDTH,
            height: BUILDER_CANVAS_HEIGHT,
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.1)',
            background:
              'radial-gradient(circle at 0 0, rgba(255,255,255,0.08) 0, transparent 42%), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), #020617',
            backgroundSize: 'auto, 24px 24px, 24px 24px, auto',
            overflow: 'hidden',
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null)
          }}
        >
          {elements.map((element) => {
            const active = element.id === selectedId
            return (
              <div
                key={element.id}
                onMouseDown={(event) => onMouseDownElement(event, element.id)}
                style={{
                  position: 'absolute',
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  height: element.height,
                  borderRadius: element.radius,
                  padding: element.padding,
                  border: `1px solid ${active ? t.accent : element.border}`,
                  background: element.bg,
                  color: element.fg,
                  fontSize: element.fontSize,
                  fontWeight: element.weight,
                  textAlign: element.align,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    element.align === 'left'
                      ? 'flex-start'
                      : element.align === 'right'
                        ? 'flex-end'
                        : 'center',
                  boxShadow: active ? `0 0 0 1px rgba(${rgb},0.35), 0 12px 28px rgba(2,6,23,0.45)` : '0 8px 24px rgba(2,6,23,0.22)',
                  cursor: 'grab',
                  userSelect: 'none',
                  transition: 'box-shadow 120ms ease, transform 120ms ease',
                  transform: active ? 'translateZ(0)' : 'none',
                  overflow: 'hidden',
                }}
              >
                <div
                  data-builder-ignore-drag="true"
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: 6,
                    fontSize: 9,
                    letterSpacing: 0.7,
                    textTransform: 'uppercase',
                    opacity: 0.58,
                    pointerEvents: 'none',
                  }}
                >
                  {element.type}
                </div>
                {renderElementContent(element)}
              </div>
            )
          })}
        </div>
      </Glass>

      <Glass
        style={{
          width: 255,
          flexShrink: 0,
          padding: 12,
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.16)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase', opacity: 0.45, marginBottom: 8 }}>
          Inspector
        </div>
        {!selected ? (
          <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.6 }}>
            Waehle ein Element auf dem Canvas aus. Du kannst es direkt ziehen und hier exakt per Zahlen oder Slider anpassen.
          </div>
        ) : (
          <>
            <InspectorRow label="Text">
              <input
                value={selected.label}
                onChange={(event) => patchSelected({ label: event.target.value })}
                style={{
                  width: '100%',
                  borderRadius: 7,
                  border: '1px solid rgba(255,255,255,0.13)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'inherit',
                  padding: '6px 8px',
                  fontSize: 11,
                }}
              />
            </InspectorRow>

            <InspectorRow label="Position X">
              <NumberInput value={selected.x} min={0} max={BUILDER_CANVAS_WIDTH} onChange={(next) => patchSelected({ x: snap(next) })} />
            </InspectorRow>
            <InspectorRow label="Position Y">
              <NumberInput value={selected.y} min={0} max={BUILDER_CANVAS_HEIGHT} onChange={(next) => patchSelected({ y: snap(next) })} />
            </InspectorRow>
            <InspectorRow label="Width">
              <NumberInput value={selected.width} min={48} max={1200} onChange={(next) => patchSelected({ width: snap(next) })} />
            </InspectorRow>
            <InspectorRow label="Height">
              <NumberInput value={selected.height} min={32} max={760} onChange={(next) => patchSelected({ height: snap(next) })} />
            </InspectorRow>
            <InspectorRow label="Padding">
              <NumberInput value={selected.padding} min={0} max={80} onChange={(next) => patchSelected({ padding: clamp(next, 0, 80) })} />
            </InspectorRow>
            <InspectorRow label="Radius">
              <NumberInput value={selected.radius} min={0} max={90} onChange={(next) => patchSelected({ radius: clamp(next, 0, 90) })} />
            </InspectorRow>
            <InspectorRow label="Font Size">
              <NumberInput value={selected.fontSize} min={8} max={72} onChange={(next) => patchSelected({ fontSize: clamp(next, 8, 72) })} />
            </InspectorRow>
            <InspectorRow label="Font Weight">
              <NumberInput value={selected.weight} min={100} max={900} onChange={(next) => patchSelected({ weight: clamp(Math.round(next / 100) * 100, 100, 900) })} />
            </InspectorRow>

            <InspectorRow label="Text Align">
              <div style={{ display: 'flex', gap: 4 }}>
                {(['left', 'center', 'right'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => patchSelected({ align: option })}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 7,
                      border: `1px solid ${selected.align === option ? t.accent : 'rgba(255,255,255,0.15)'}`,
                      background: selected.align === option ? `rgba(${rgb},0.16)` : 'rgba(255,255,255,0.04)',
                      color: selected.align === option ? t.accent : 'inherit',
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'capitalize',
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </InspectorRow>

            <InspectorRow label="Background">
              <input
                value={selected.bg}
                onChange={(event) => patchSelected({ bg: event.target.value })}
                style={{
                  width: '100%',
                  borderRadius: 7,
                  border: '1px solid rgba(255,255,255,0.13)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'inherit',
                  padding: '6px 8px',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              />
            </InspectorRow>
            <InspectorRow label="Text Color">
              <input
                value={selected.fg}
                onChange={(event) => patchSelected({ fg: event.target.value })}
                style={{
                  width: '100%',
                  borderRadius: 7,
                  border: '1px solid rgba(255,255,255,0.13)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'inherit',
                  padding: '6px 8px',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              />
            </InspectorRow>
            <InspectorRow label="Border Color">
              <input
                value={selected.border}
                onChange={(event) => patchSelected({ border: event.target.value })}
                style={{
                  width: '100%',
                  borderRadius: 7,
                  border: '1px solid rgba(255,255,255,0.13)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'inherit',
                  padding: '6px 8px',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              />
            </InspectorRow>
          </>
        )}
      </Glass>
    </div>
  )
}
