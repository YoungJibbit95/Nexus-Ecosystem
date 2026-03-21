import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
    Plus, ZoomIn, ZoomOut, Maximize2, Trash2, Edit3, Link,
    Type, FileText, CheckSquare, Image, Code, X, GripVertical,
    MoreHorizontal, Palette, Unlink, Grid, Map as MapIcon, RotateCcw, RotateCw,
    StickyNote, Sun, Copy, AlignCenter, Bell
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Glass } from '../components/Glass'
import { useCanvas, NodeType, CanvasNode, CanvasConnection, ProjectStatus, ProjectPriority } from '../store/canvasStore'
import { useTheme } from '../store/themeStore'
import { useApp } from '../store/appStore'
import { hexToRgb } from '../lib/utils'
import { useMobile } from '../lib/useMobile'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CanvasNexusCodeBlock } from './canvas/CanvasMagicRenderers'

// ─── CONSTANTS ───

const NODE_COLORS = [
    '#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE',
    '#00C7BE', '#FF2D55', '#5856D6', '#FFCC00', '#64D2FF',
    '#FF6B35', '#30D158', '#BF5AF2', '#FF6B9E', '#FFE600',
]

const WIDGET_TYPES: { type: NodeType | 'sticky'; icon: any; label: string }[] = [
    { type: 'text', icon: Type, label: 'Text' },
    { type: 'markdown', icon: FileText, label: 'Markdown' },
    { type: 'checklist', icon: CheckSquare, label: 'Checklist' },
    { type: 'image', icon: Image, label: 'Bild' },
    { type: 'code', icon: Code, label: 'Code' },
    { type: 'sticky', icon: StickyNote, label: 'Sticky' },
    { type: 'note', icon: FileText, label: 'Notiz' },
    { type: 'codefile', icon: Code, label: 'Code-Datei' },
    { type: 'task', icon: CheckSquare, label: 'Aufgabe' },
    { type: 'reminder', icon: Bell, label: 'Reminder' },
]

const PM_STATUS_ORDER: ProjectStatus[] = ['idea', 'backlog', 'todo', 'doing', 'review', 'done', 'blocked']
const PM_STATUS_COLOR: Record<ProjectStatus, string> = {
    idea: '#64D2FF',
    backlog: '#5E5CE6',
    todo: '#007AFF',
    doing: '#FF9F0A',
    review: '#BF5AF2',
    done: '#30D158',
    blocked: '#FF453A',
}
const PM_PRIORITY_COLOR: Record<ProjectPriority, string> = {
    low: '#30D158',
    mid: '#FFD60A',
    high: '#FF9F0A',
    critical: '#FF453A',
}

// ─── CONNECTION LINE ───

function ConnectionLine({ conn, nodes, zoom, onDelete }: {
    conn: CanvasConnection; nodes: CanvasNode[]; zoom: number; onDelete: (id: string) => void
}) {
    const t = useTheme()
    const fromNode = nodes.find(n => n.id === conn.fromId)
    const toNode = nodes.find(n => n.id === conn.toId)
    if (!fromNode || !toNode) return null

    const x1 = fromNode.x + fromNode.width / 2
    const y1 = fromNode.y + fromNode.height / 2
    const x2 = toNode.x + toNode.width / 2
    const y2 = toNode.y + toNode.height / 2
    const dx = Math.abs(x2 - x1) * 0.5
    const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`

    const [hovered, setHovered] = useState(false)
    const connColor = conn.color || t.accent

    return (
        <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <path d={path} stroke="transparent" strokeWidth={18 / zoom} fill="none" style={{ cursor: 'pointer' }} />
            {/* Glow layer */}
            {hovered && (
                <path d={path} stroke={connColor} strokeWidth={6 / zoom} fill="none" opacity={0.2} style={{ filter: `blur(${3 / zoom}px)` }} />
            )}
            <path
                d={path}
                stroke={connColor}
                strokeWidth={(hovered ? 2.5 : 1.5) / zoom}
                fill="none"
                strokeDasharray={hovered ? 'none' : `${8 / zoom} ${4 / zoom}`}
                opacity={hovered ? 1 : 0.55}
                style={{ transition: 'all 0.2s', filter: hovered ? `drop-shadow(0 0 ${4 / zoom}px ${connColor})` : 'none' }}
            />
            {/* Arrowhead */}
            {hovered && (() => {
                const angle = Math.atan2(y2 - y1, x2 - x1)
                const ax = x2 - (8 / zoom) * Math.cos(angle)
                const ay = y2 - (8 / zoom) * Math.sin(angle)
                return (
                    <polygon
                        points={`${x2},${y2} ${ax - (5 / zoom) * Math.sin(angle)},${ay + (5 / zoom) * Math.cos(angle)} ${ax + (5 / zoom) * Math.sin(angle)},${ay - (5 / zoom) * Math.cos(angle)}`}
                        fill={connColor} opacity={0.9}
                    />
                )
            })()}
            {/* Midpoint delete */}
            {hovered && (
                <g transform={`translate(${(x1 + x2) / 2},${(y1 + y2) / 2})`}
                    onClick={(e) => { e.stopPropagation(); onDelete(conn.id) }} style={{ cursor: 'pointer' }}>
                    <circle r={10 / zoom} fill="#FF3B30" opacity={0.9} />
                    <line x1={-4 / zoom} y1={-4 / zoom} x2={4 / zoom} y2={4 / zoom} stroke="white" strokeWidth={1.5 / zoom} />
                    <line x1={4 / zoom} y1={-4 / zoom} x2={-4 / zoom} y2={4 / zoom} stroke="white" strokeWidth={1.5 / zoom} />
                </g>
            )}
            {conn.label && (
                <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 14 / zoom} textAnchor="middle"
                    fill={t.mode === 'dark' ? '#fff' : '#000'} fontSize={11 / zoom} opacity={0.7}>
                    {conn.label}
                </text>
            )}
        </g>
    )
}

// ─── CONNECTION PORT ───

function ConnPort({ side, nodeId, onStartConnect, onEndConnect, connecting }: {
    side: 'top' | 'right' | 'bottom' | 'left'
    nodeId: string; onStartConnect: (id: string) => void
    onEndConnect: (id: string) => void; connecting: boolean
}) {
    const t = useTheme()
    const [hovered, setHovered] = useState(false)
    const posStyle: React.CSSProperties = {
        position: 'absolute', width: 13, height: 13, borderRadius: '50%',
        background: hovered || connecting ? t.accent : (t.mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'),
        border: `2px solid ${t.accent}`,
        cursor: 'crosshair', transition: 'all 0.15s',
        transform: 'translate(-50%, -50%)', zIndex: 10,
        boxShadow: (hovered || connecting) ? `0 0 8px ${t.accent}` : 'none',
        ...(side === 'top' && { top: 0, left: '50%' }),
        ...(side === 'right' && { top: '50%', right: -7, left: 'auto', transform: 'translate(50%, -50%)' }),
        ...(side === 'bottom' && { bottom: -7, left: '50%', top: 'auto', transform: 'translate(-50%, 50%)' }),
        ...(side === 'left' && { top: '50%', left: 0 }),
    }
    return (
        <div style={posStyle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseDown={(e) => { e.stopPropagation(); onStartConnect(nodeId) }}
            onMouseUp={(e) => { e.stopPropagation(); onEndConnect(nodeId) }}
        />
    )
}

// ─── NODE WIDGET ───

function NodeWidget({ node, isSelected, onSelect, onStartConnect, onEndConnect, connectingFrom }: {
    node: CanvasNode; isSelected: boolean
    onSelect: (id: string) => void
    onStartConnect: (id: string) => void
    onEndConnect: (id: string) => void
    connectingFrom: string | null
}) {
    const t = useTheme()
    const app = useApp()
    const rgb = hexToRgb(node.color || t.accent)
    const { updateNode, deleteNode, moveNode, resizeNode, addChecklistItem, toggleChecklistItem, deleteChecklistItem } = useCanvas()

    const [dragging, setDragging] = useState(false)
    const [resizing, setResizing] = useState(false)
    const [editTitle, setEditTitle] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [newCheckItem, setNewCheckItem] = useState('')
    const [editingContent, setEditingContent] = useState(node.type !== 'markdown')
    const [hovered, setHovered] = useState(false)
    const dragStart = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 })
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })

    const isSticky = node.type === 'text' && node.color === '#FFCC00'
    const stickyBg = isSticky
        ? `linear-gradient(145deg, #FFEE88, #FFD700)`
        : undefined

    // Drag
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.node-interactive')) return
        e.stopPropagation()
        onSelect(node.id)
        setDragging(true)
        dragStart.current = { x: e.clientX, y: e.clientY, nodeX: node.x, nodeY: node.y }
    }, [node.id, node.x, node.y, onSelect])

    useEffect(() => {
        if (!dragging) return
        let raf = 0
        let pending: { x: number; y: number } | null = null

        const flush = () => {
            raf = 0
            if (!pending) return
            moveNode(node.id, pending.x, pending.y)
            pending = null
        }

        const onMove = (e: MouseEvent) => {
            const zoom = useCanvas.getState().viewport?.zoom || 1
            pending = {
                x: dragStart.current.nodeX + (e.clientX - dragStart.current.x) / zoom,
                y: dragStart.current.nodeY + (e.clientY - dragStart.current.y) / zoom,
            }
            if (!raf) raf = requestAnimationFrame(flush)
        }
        const onUp = () => {
            if (raf) {
                cancelAnimationFrame(raf)
                raf = 0
            }
            if (pending) {
                moveNode(node.id, pending.x, pending.y)
                pending = null
            }
            setDragging(false)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => {
            if (raf) cancelAnimationFrame(raf)
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [dragging, node.id, moveNode])

    // Resize
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault()
        setResizing(true)
        resizeStart.current = { x: e.clientX, y: e.clientY, w: node.width, h: node.height }
    }, [node.width, node.height])

    useEffect(() => {
        if (!resizing) return
        let raf = 0
        let pending: { width: number; height: number } | null = null

        const flush = () => {
            raf = 0
            if (!pending) return
            resizeNode(node.id, pending.width, pending.height)
            pending = null
        }

        const onMove = (e: MouseEvent) => {
            const zoom = useCanvas.getState().viewport?.zoom || 1
            pending = {
                width: resizeStart.current.w + (e.clientX - resizeStart.current.x) / zoom,
                height: resizeStart.current.h + (e.clientY - resizeStart.current.y) / zoom,
            }
            if (!raf) raf = requestAnimationFrame(flush)
        }
        const onUp = () => {
            if (raf) {
                cancelAnimationFrame(raf)
                raf = 0
            }
            if (pending) {
                resizeNode(node.id, pending.width, pending.height)
                pending = null
            }
            setResizing(false)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => {
            if (raf) cancelAnimationFrame(raf)
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [resizing, node.id, resizeNode])

    const replaceMarkdownCodeBlock = useCallback((
        mdNode: any,
        className: string | undefined,
        rawChildren: React.ReactNode,
        nextBlockContent: string,
    ) => {
        const current = node.content || ''
        const lang = (className || '').replace('language-', '')
        const raw = Array.isArray(rawChildren) ? rawChildren.join('') : String(rawChildren ?? '')
        const currentBlockContent = raw.replace(/\n$/, '')
        const normalizedNext = nextBlockContent.replace(/\r\n/g, '\n').replace(/\n+$/, '')
        const makeFence = (block: string) => `\`\`\`${lang}\n${block.replace(/\n+$/, '')}\n\`\`\``
        const nextFence = makeFence(normalizedNext)

        const start = mdNode?.position?.start?.offset
        const end = mdNode?.position?.end?.offset
        if (
            Number.isFinite(start)
            && Number.isFinite(end)
            && start >= 0
            && end > start
            && end <= current.length
        ) {
            updateNode(node.id, { content: `${current.slice(0, start)}${nextFence}${current.slice(end)}` })
            return
        }

        const prevFence = makeFence(currentBlockContent)
        const idx = current.indexOf(prevFence)
        if (idx >= 0) {
            updateNode(node.id, {
                content: `${current.slice(0, idx)}${nextFence}${current.slice(idx + prevFence.length)}`,
            })
        }
    }, [node.content, node.id, updateNode])

    const renderContent = () => {
        switch (node.type) {
            case 'text':
                return (
                    <textarea
                        className="node-interactive"
                        value={node.content}
                        onChange={(e) => updateNode(node.id, { content: e.target.value })}
                        placeholder="Text eingeben..."
                        style={{
                            width: '100%', height: '100%', resize: 'none',
                            background: 'transparent', border: 'none', outline: 'none',
                            color: isSticky ? '#333' : 'inherit', fontFamily: 'inherit',
                            fontSize: 13, lineHeight: 1.6, padding: 0,
                        }}
                    />
                )

            case 'markdown':
                return editingContent ? (
                    <div className="node-interactive" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                            <button onClick={() => setEditingContent(false)} style={{
                                fontSize: 10, padding: '2px 8px', borderRadius: 6,
                                background: `rgba(${rgb}, 0.2)`, border: 'none',
                                color: node.color || t.accent, cursor: 'pointer',
                            }}>Preview</button>
                        </div>
                        <textarea value={node.content} onChange={(e) => updateNode(node.id, { content: e.target.value })}
                            placeholder="# Markdown..." style={{
                                flex: 1, width: '100%', resize: 'none', background: 'transparent',
                                border: 'none', outline: 'none', color: 'inherit',
                                fontFamily: "'Fira Code', monospace", fontSize: 12, lineHeight: 1.5, padding: 0,
                            }} />
                    </div>
                ) : (
                    <div className="node-interactive" style={{ width: '100%', height: '100%', overflow: 'auto', cursor: 'text' }}
                        onDoubleClick={() => setEditingContent(true)}>
                        {node.content
                            ? <div style={{ fontSize: 13, lineHeight: 1.6 }} className="canvas-md">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    pre: ({ children }: any) => <>{children}</>,
                                    code: ({ node: mdNode, className, children }: any) => (
                                      <CanvasNexusCodeBlock
                                        className={className}
                                        accent={node.color || t.accent}
                                        onChange={(next) => replaceMarkdownCodeBlock(mdNode, className, children, next)}
                                      >
                                        {children}
                                      </CanvasNexusCodeBlock>
                                    ),
                                  }}
                                >{node.content}</ReactMarkdown>
                            </div>
                            : <div style={{ opacity: 0.4, fontSize: 13 }}>Doppelklick zum Bearbeiten...</div>
                        }
                        <button onClick={() => setEditingContent(true)} style={{
                            position: 'absolute', bottom: 8, right: 8,
                            fontSize: 10, padding: '2px 8px', borderRadius: 6,
                            background: `rgba(${rgb}, 0.2)`, border: 'none',
                            color: node.color || t.accent, cursor: 'pointer',
                        }}>Edit</button>
                    </div>
                )

            case 'checklist':
                return (
                    <div className="node-interactive" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                        {(node.items || []).map(item => (
                            <div key={item.id} style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                                borderBottom: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                            }}>
                                <input type="checkbox" checked={item.done} onChange={() => toggleChecklistItem(node.id, item.id)}
                                    style={{ accentColor: node.color || t.accent, cursor: 'pointer', flexShrink: 0, width: 14, height: 14 }} />
                                <span style={{ flex: 1, fontSize: 12, textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.45 : 1, transition: 'all 0.2s' }}>
                                    {item.text}
                                </span>
                                <button onClick={() => deleteChecklistItem(node.id, item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF3B30', opacity: 0.6, padding: 2 }}>
                                    <X size={11} />
                                </button>
                            </div>
                        ))}
                        {/* Progress bar */}
                        {(node.items || []).length > 0 && (
                            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 6, marginBottom: 4 }}>
                                <div style={{
                                    height: '100%', borderRadius: 2,
                                    background: node.color || t.accent,
                                    width: `${((node.items || []).filter(i => i.done).length / ((node.items || []).length || 1)) * 100}%`,
                                    transition: 'width 0.3s ease',
                                }} />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <input type="text" value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && newCheckItem.trim()) { addChecklistItem(node.id, newCheckItem.trim()); setNewCheckItem('') } }}
                                placeholder="Neuer Eintrag..."
                                style={{
                                    flex: 1, background: t.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    border: 'none', borderRadius: 6, padding: '4px 8px', color: 'inherit', fontSize: 12, outline: 'none',
                                }} />
                            <button onClick={() => { if (newCheckItem.trim()) { addChecklistItem(node.id, newCheckItem.trim()); setNewCheckItem('') } }}
                                style={{ background: `rgba(${rgb}, 0.2)`, border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: node.color || t.accent, fontSize: 12 }}>
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                )

            case 'image':
                return (
                    <div className="node-interactive" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input type="text" value={node.content} onChange={(e) => updateNode(node.id, { content: e.target.value })}
                            placeholder="Bild-URL eingeben..."
                            style={{
                                width: '100%', background: t.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                border: 'none', borderRadius: 6, padding: '4px 8px', color: 'inherit', fontSize: 11, outline: 'none', flexShrink: 0,
                            }} />
                        {node.content
                            ? <img src={node.content} alt={node.title} style={{ flex: 1, width: '100%', objectFit: 'contain', borderRadius: 8, minHeight: 0 }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                <Image size={32} />
                            </div>
                        }
                    </div>
                )

            case 'code':
                return (
                    <div className="node-interactive" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select value={node.codeLang || 'javascript'} onChange={(e) => updateNode(node.id, { codeLang: e.target.value })}
                                style={{
                                    flex: 1, background: t.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                    border: 'none', borderRadius: 6, padding: '3px 6px', color: 'inherit', fontSize: 10, outline: 'none', cursor: 'pointer',
                                }}>
                                {['javascript', 'typescript', 'python', 'html', 'css', 'json', 'rust', 'go', 'java', 'c', 'cpp', 'sql', 'bash', 'markdown', 'yaml'].map(l => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                            <button onClick={() => { navigator.clipboard?.writeText(node.content) }}
                                title="Copy code"
                                style={{ background: `rgba(${rgb},0.15)`, border: 'none', borderRadius: 5, padding: '3px 6px', cursor: 'pointer', color: node.color || t.accent, fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Copy size={10} /> Copy
                            </button>
                        </div>
                        <textarea value={node.content} onChange={(e) => updateNode(node.id, { content: e.target.value })}
                            placeholder="// Code eingeben..." spellCheck={false}
                            style={{
                                flex: 1, width: '100%', resize: 'none',
                                background: t.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.03)',
                                border: 'none', outline: 'none', borderRadius: 6, padding: 8,
                                color: 'inherit', fontFamily: "'Fira Code', 'Consolas', monospace",
                                fontSize: 12, lineHeight: 1.5,
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Tab') {
                                    e.preventDefault()
                                    const ta = e.target as HTMLTextAreaElement
                                    const s = ta.selectionStart, end = ta.selectionEnd
                                    updateNode(node.id, { content: ta.value.substring(0, s) + '  ' + ta.value.substring(end) })
                                    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 2 }, 0)
                                }
                            }}
                        />
                    </div>
                )

            case 'note': {
                const linkedNote = app.notes.find(n => n.id === node.linkedNoteId)
                if (!linkedNote) {
                    return (
                        <div className="node-interactive p-3 flex flex-col gap-2 h-full justify-center">
                            <span className="text-xs opacity-60">Notiz verknüpfen:</span>
                            <select className="bg-white/10 text-xs p-1.5 rounded outline-none w-full" value="" onChange={e => updateNode(node.id, { linkedNoteId: e.target.value })}>
                                <option value="">-- Auswählen --</option>
                                {app.notes.map(n => <option key={n.id} value={n.id}>{n.title || 'Ohne Titel'}</option>)}
                            </select>
                        </div>
                    )
                }
                return (
                    <div className="node-interactive w-full h-full overflow-y-auto p-3 flex flex-col gap-2">
                        <div className="font-bold text-sm border-b border-white/10 pb-1 mb-1 truncate flex justify-between items-center cursor-pointer hover:text-blue-400 transition-colors" onDoubleClick={() => app.setNote(linkedNote.id)}>
                            <span>{linkedNote.title || 'Ohne Titel'}</span>
                            <button onClick={(e) => { e.stopPropagation(); updateNode(node.id, { linkedNoteId: undefined }) }} className="opacity-50 hover:opacity-100" title="Verknüpfung aufheben"><Unlink size={12} /></button>
                        </div>
                        <div className="text-xs flex-1 overflow-y-auto canvas-md" style={{ opacity: 0.85 }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{linkedNote.content.slice(0, 500) + (linkedNote.content.length > 500 ? '\n...' : '')}</ReactMarkdown>
                        </div>
                    </div>
                )
            }

            case 'codefile': {
                const linkedCode = app.codes.find(c => c.id === node.linkedCodeId)
                if (!linkedCode) {
                    return (
                        <div className="node-interactive p-3 flex flex-col gap-2 h-full justify-center">
                            <span className="text-xs opacity-60">Code-Datei verknüpfen:</span>
                            <select className="bg-white/10 text-xs p-1.5 rounded outline-none w-full" value="" onChange={e => updateNode(node.id, { linkedCodeId: e.target.value })}>
                                <option value="">-- Auswählen --</option>
                                {app.codes.map(c => <option key={c.id} value={c.id}>{c.name || 'Ohne Titel'} ({c.lang})</option>)}
                            </select>
                        </div>
                    )
                }
                return (
                    <div className="node-interactive w-full h-full p-2 flex flex-col gap-2">
                        <div className="font-bold text-xs border-b border-white/10 pb-1 mb-1 truncate flex justify-between items-center opacity-70">
                            <span>{linkedCode.name || 'Ohne Titel'} ({linkedCode.lang})</span>
                            <button onClick={() => updateNode(node.id, { linkedCodeId: undefined })} className="hover:opacity-100"><Unlink size={10} /></button>
                        </div>
                        <pre className="text-[10px] opacity-80 flex-1 overflow-auto bg-black/20 p-2 rounded m-0 font-mono">
                            <code>{(linkedCode.content || '').slice(0, 800) + ((linkedCode.content || '').length > 800 ? '\n...' : '')}</code>
                        </pre>
                    </div>
                )
            }

            case 'task': {
                const linkedTask = app.tasks.find(t => t.id === node.linkedTaskId)
                if (!linkedTask) {
                    return (
                        <div className="node-interactive p-3 flex flex-col gap-2 h-full justify-center">
                            <span className="text-xs opacity-60">Task verknüpfen:</span>
                            <select className="bg-white/10 text-xs p-1.5 rounded outline-none w-full" value="" onChange={e => updateNode(node.id, { linkedTaskId: e.target.value })}>
                                <option value="">-- Auswählen --</option>
                                {app.tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </div>
                    )
                }
                const isTaskDone = linkedTask.status === 'done'
                return (
                    <div className="node-interactive w-full h-full p-3 flex flex-col gap-2 overflow-y-auto">
                        <div className="flex justify-between items-start gap-2 border-b border-white/10 pb-2">
                            <div className="flex gap-2 items-center text-sm font-semibold w-full" style={{ textDecoration: isTaskDone ? 'line-through' : 'none', opacity: isTaskDone ? 0.5 : 1 }}>
                                <input type="checkbox" checked={isTaskDone} onChange={(e) => app.updateTask(linkedTask.id, { status: e.target.checked ? 'done' : 'todo' })} style={{ accentColor: node.color || t.accent }} className="shrink-0" />
                                <span className="truncate flex-1">{linkedTask.title}</span>
                            </div>
                            <button onClick={() => updateNode(node.id, { linkedTaskId: undefined })} className="opacity-50 hover:opacity-100 shrink-0"><Unlink size={12} /></button>
                        </div>
                        {linkedTask.desc && <div className="text-xs opacity-70 mt-1 line-clamp-3">{linkedTask.desc}</div>}
                        {linkedTask.subtasks && linkedTask.subtasks.length > 0 && (
                            <div className="mt-2 flex flex-col gap-1">
                                {linkedTask.subtasks.map(st => (
                                    <div key={st.id} className="flex gap-1.5 items-center text-[11px] opacity-80" style={{ textDecoration: st.done ? 'line-through' : 'none' }}>
                                        <input type="checkbox" checked={st.done} onChange={() => {
                                            const newSt = (linkedTask.subtasks || []).map(x => x.id === st.id ? { ...x, done: !x.done } : x)
                                            app.updateTask(linkedTask.id, { subtasks: newSt })
                                        }} style={{ accentColor: node.color || t.accent }} className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">{st.title}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {linkedTask.deadline && <div className="text-[10px] opacity-50 mt-auto pt-2 border-t border-white/5">Fällig: {new Date(linkedTask.deadline).toLocaleDateString()}</div>}
                    </div>
                )
            }

            case 'reminder': {
                const linkedReminder = app.reminders.find(r => r.id === node.linkedReminderId)
                if (!linkedReminder) {
                    return (
                        <div className="node-interactive p-3 flex flex-col gap-2 h-full justify-center">
                            <span className="text-xs opacity-60">Reminder verknüpfen:</span>
                            <select className="bg-white/10 text-xs p-1.5 rounded outline-none w-full" value="" onChange={e => updateNode(node.id, { linkedReminderId: e.target.value })}>
                                <option value="">-- Auswählen --</option>
                                {app.reminders.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                            </select>
                        </div>
                    )
                }
                const isRemDone = linkedReminder.done
                return (
                    <div className="node-interactive w-full h-full p-3 flex flex-col gap-2 justify-center items-center text-center relative" style={{ opacity: isRemDone ? 0.5 : 1 }}>
                        <button onClick={() => updateNode(node.id, { linkedReminderId: undefined })} className="absolute top-2 right-2 opacity-50 hover:opacity-100 z-10"><Unlink size={12} /></button>
                        <Bell size={24} style={{ color: node.color || t.accent, opacity: isRemDone ? 0.3 : 1 }} className={(!isRemDone && new Date(linkedReminder.datetime) < new Date()) ? 'nx-glow-pulse' : ''} />
                        <div className="font-semibold text-sm mt-1" style={{ textDecoration: isRemDone ? 'line-through' : 'none' }}>{linkedReminder.title}</div>
                        {linkedReminder.msg && <div className="text-xs opacity-70 line-clamp-2">{linkedReminder.msg}</div>}
                        {linkedReminder.datetime && <div className="text-[10px] opacity-60 mt-auto bg-black/20 px-2 py-1 rounded w-full">{new Date(linkedReminder.datetime).toLocaleString()}</div>}
                        <div className="mt-2 text-[10px]">
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={isRemDone} onChange={(e) => app.updateReminder(linkedReminder.id, { done: e.target.checked })} style={{ accentColor: node.color || t.accent }} />
                                Erledigt
                            </label>
                        </div>
                    </div>
                )
            }

            default:
                return null
        }
    }

    const TypeIcon = WIDGET_TYPES.find(w => w.type === node.type)?.icon || Type
    const nodeAccent = node.color || t.accent

    return (
        <div className="nx-canvas-node"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'absolute', left: node.x, top: node.y,
                width: node.width, height: node.height,
                zIndex: isSelected ? 100 : 1,
                animation: 'nexus-scale-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                willChange: 'transform, left, top, width, height',
                backfaceVisibility: 'hidden',
                transform: isSelected
                    ? 'translateZ(0) scale(1.01)'
                    : hovered
                        ? 'translateZ(0) scale(1.004)'
                        : 'translateZ(0)',
                transition: dragging || resizing
                    ? 'none'
                    : 'transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}>
            {/* Connection ports */}
            {(isSelected || connectingFrom) && (
                <>
                    {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                        <ConnPort key={side} side={side} nodeId={node.id}
                            onStartConnect={onStartConnect} onEndConnect={onEndConnect}
                            connecting={connectingFrom === node.id} />
                    ))}
                </>
            )}

            <Glass type="panel" glow={isSelected} className="h-full" style={{
                width: '100%', height: '100%',
                borderColor: isSelected ? nodeAccent : undefined,
                borderWidth: isSelected ? 2 : 1,
                overflow: 'hidden',
                cursor: dragging ? 'grabbing' : 'grab',
                userSelect: dragging ? 'none' : 'auto',
                background: isSticky ? stickyBg : undefined,
                boxShadow: isSelected
                    ? `0 0 0 2px ${nodeAccent}, 0 8px 32px rgba(0,0,0,0.3), 0 0 20px ${nodeAccent}30`
                    : `0 4px 16px rgba(0,0,0,0.2)`,
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 10, gap: 6 }}>
                    {/* Header with color strip */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                        background: `linear-gradient(90deg, ${nodeAccent}, ${nodeAccent}80)`,
                        borderRadius: `${t.visual.panelRadius}px ${t.visual.panelRadius}px 0 0`,
                        opacity: 0.8,
                    }} />

                    <div onMouseDown={handleDragStart} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        cursor: dragging ? 'grabbing' : 'grab', flexShrink: 0,
                        borderBottom: `1px solid ${isSticky ? 'rgba(0,0,0,0.1)' : (t.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}`,
                        paddingBottom: 6, paddingTop: 4,
                    }}>
                        <GripVertical size={13} style={{ opacity: 0.35, flexShrink: 0 }} />
                        <TypeIcon size={13} style={{ color: nodeAccent, flexShrink: 0 }} />

                        {editTitle
                            ? <input autoFocus className="node-interactive" value={node.title}
                                onChange={(e) => updateNode(node.id, { title: e.target.value })}
                                onBlur={() => setEditTitle(false)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditTitle(false)}
                                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: isSticky ? '#333' : 'inherit', fontWeight: 600, fontSize: 12, padding: 0, minWidth: 0 }}
                            />
                            : <span onDoubleClick={() => setEditTitle(true)}
                                style={{ flex: 1, fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isSticky ? '#333' : 'inherit' }}>
                                {node.title}
                            </span>
                        }

                        {/* Context menu */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <button className="node-interactive"
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); setShowColorPicker(false) }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSticky ? '#666' : 'inherit', opacity: 0.5, padding: 2, display: 'flex', alignItems: 'center' }}>
                                <MoreHorizontal size={13} />
                            </button>

                            {showMenu && (
                                <div className="node-interactive" style={{
                                    position: 'absolute', top: '100%', right: 0,
                                    background: t.mode === 'dark' ? '#1a1a2e' : '#fff',
                                    border: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                                    borderRadius: 10, padding: 4, zIndex: 200, minWidth: 140,
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                }}>
                                    <MenuBtn icon={Edit3} label="Rename" onClick={() => { setEditTitle(true); setShowMenu(false) }} />
                                    <MenuBtn icon={Palette} label="Color" onClick={() => setShowColorPicker(!showColorPicker)} />
                                    <MenuBtn icon={Link} label="Connect" onClick={() => { onStartConnect(node.id); setShowMenu(false) }} />
                                    <MenuBtn icon={Copy} label="Duplicate" onClick={() => {
                                        useCanvas.getState().addNode(node.type, node.x + 30, node.y + 30)
                                        setShowMenu(false)
                                    }} />
                                    <MenuBtn icon={Trash2} label="Delete" onClick={() => deleteNode(node.id)} danger />

                                    {showColorPicker && (
                                        <div style={{
                                            display: 'flex', flexWrap: 'wrap', gap: 4, padding: '6px',
                                            borderTop: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                            marginTop: 4,
                                        }}>
                                            {NODE_COLORS.map(c => (
                                                <div key={c} onClick={() => { updateNode(node.id, { color: c }); setShowColorPicker(false); setShowMenu(false) }}
                                                    style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', border: node.color === c ? '2px solid white' : '2px solid transparent', boxShadow: `0 0 4px ${c}` }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, position: 'relative' }}>
                        {(node.pm?.status || node.pm?.priority || node.pm?.owner || node.pm?.dueDate) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                                {node.pm?.status && (
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: `${PM_STATUS_COLOR[node.pm.status]}22`, color: PM_STATUS_COLOR[node.pm.status], border: `1px solid ${PM_STATUS_COLOR[node.pm.status]}55`, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                        {node.pm.status}
                                    </span>
                                )}
                                {node.pm?.priority && (
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: `${PM_PRIORITY_COLOR[node.pm.priority]}22`, color: PM_PRIORITY_COLOR[node.pm.priority], border: `1px solid ${PM_PRIORITY_COLOR[node.pm.priority]}55`, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                        {node.pm.priority}
                                    </span>
                                )}
                                {node.pm?.owner && (
                                    <span style={{ fontSize: 9, opacity: 0.75, padding: '2px 6px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)' }}>
                                        @{node.pm.owner}
                                    </span>
                                )}
                                {node.pm?.dueDate && (
                                    <span style={{ fontSize: 9, opacity: 0.75, padding: '2px 6px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)' }}>
                                        due {new Date(node.pm.dueDate).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        )}
                        {renderContent()}
                    </div>

                    {/* Resize handle */}
                    {(isSelected || hovered) && (
                        <div
                            onMouseDownCapture={handleResizeStart}
                            style={{
                                position: 'absolute', right: 0, bottom: 0,
                                width: 24, height: 24, cursor: 'nwse-resize',
                                display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 6, opacity: 0.5,
                                zIndex: 50,
                            }}
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ pointerEvents: 'none' }}>
                                <path d="M9 1L9 9L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    )}
                </div>
            </Glass>
        </div>
    )
}


// ─── MENU BUTTON ───

function MenuBtn({ icon: Icon, label, onClick, danger }: { icon: any, label: string, onClick: () => void, danger?: boolean }) {
    const [h, setH] = useState(false)
    return (
        <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 10px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                background: h ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: danger ? '#FF3B30' : 'inherit',
            }}>
            <Icon size={13} />
            {label}
        </button>
    )
}

// ─── MINIMAP ───

function MiniMap({ nodes, viewport, canvasW, canvasH }: {
    nodes: CanvasNode[], viewport: { panX: number, panY: number, zoom: number }
    canvasW: number, canvasH: number
}) {
    const t = useTheme()
    const MAP_W = 160
    const MAP_H = 110
    const PADDING = 40

    if (nodes.length === 0) return null

    const minX = Math.min(...nodes.map(n => n.x)) - PADDING
    const maxX = Math.max(...nodes.map(n => n.x + n.width)) + PADDING
    const minY = Math.min(...nodes.map(n => n.y)) - PADDING
    const maxY = Math.max(...nodes.map(n => n.y + n.height)) + PADDING

    const rangeX = Math.max(maxX - minX, 100)
    const rangeY = Math.max(maxY - minY, 100)
    const scale = Math.min(MAP_W / rangeX, MAP_H / rangeY) * 0.85

    const toMapX = (x: number) => (x - minX) * scale + (MAP_W - rangeX * scale) / 2
    const toMapY = (y: number) => (y - minY) * scale + (MAP_H - rangeY * scale) / 2

    // Viewport rect
    const vpLeft = (-viewport.panX / viewport.zoom - minX) * scale + (MAP_W - rangeX * scale) / 2
    const vpTop = (-viewport.panY / viewport.zoom - minY) * scale + (MAP_H - rangeY * scale) / 2
    const vpW = (canvasW / viewport.zoom) * scale
    const vpH = (canvasH / viewport.zoom) * scale

    return (
        <div style={{
            position: 'absolute', bottom: 16, right: 16, zIndex: 50,
            width: MAP_W, height: MAP_H, borderRadius: 10,
            background: t.mode === 'dark' ? 'rgba(10,10,20,0.8)' : 'rgba(240,240,255,0.85)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
            <svg width={MAP_W} height={MAP_H}>
                {nodes.map(node => (
                    <rect key={node.id}
                        x={toMapX(node.x)} y={toMapY(node.y)}
                        width={Math.max(node.width * scale, 4)}
                        height={Math.max(node.height * scale, 3)}
                        rx={2}
                        fill={node.color || t.accent}
                        opacity={0.7}
                    />
                ))}
                {/* Viewport indicator */}
                <rect
                    x={vpLeft} y={vpTop}
                    width={Math.min(vpW, MAP_W)} height={Math.min(vpH, MAP_H)}
                    fill="none"
                    stroke={t.accent}
                    strokeWidth={1}
                    opacity={0.8}
                    rx={2}
                />
            </svg>
            <div style={{
                position: 'absolute', bottom: 3, right: 5, fontSize: 9,
                opacity: 0.4, fontFamily: 'monospace', letterSpacing: 0.5,
            }}>MINIMAP</div>
        </div>
    )
}

// ─── TOOLBAR BUTTON ───

function ToolBtn({ icon: Icon, tooltip, onClick, accent, rgb, active, label }: {
    icon: any; tooltip: string; onClick: () => void; accent: string; rgb: string; active?: boolean; label?: string
}) {
    const [h, setH] = useState(false)
    const mob = useMobile()
    const sz = mob.isMobile ? 44 : 30
    const iconSz = mob.isMobile ? 20 : 14
    return (
        <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
            title={tooltip}
            style={{
                background: active ? `rgba(${rgb}, 0.22)` : (h ? `rgba(${rgb}, 0.12)` : 'transparent'),
                border: active ? `1px solid rgba(${rgb}, 0.4)` : '1px solid transparent',
                borderRadius: mob.isMobile ? 12 : 7,
                width: mob.isMobile ? 'auto' : sz, height: sz,
                minWidth: sz,
                display: 'flex', flexDirection: mob.isMobile && label ? 'column' : 'row',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                cursor: 'pointer', color: (h || active) ? accent : 'inherit',
                transition: 'all 0.15s', opacity: (h || active) ? 1 : 0.65,
                padding: mob.isMobile && label ? '8px 10px' : undefined,
            }}>
            <Icon size={iconSz} />
            {mob.isMobile && label && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>}
        </button>
    )
}

// ─── MAIN CANVAS VIEW ───

export function CanvasView() {
    const t = useTheme()
    const rgb = hexToRgb(t.accent)
    const mob = useMobile()
    const { canvases, activeCanvasId, viewport, addCanvas, deleteCanvas, setActiveCanvas, renameCanvas, addNode, deleteConnection, setPan, setZoom, resetViewport, addConnection, getActiveCanvas } = useCanvas()

    const canvas = getActiveCanvas()
    const canvasRef = useRef<HTMLDivElement>(null)

    const [panning, setPanning] = useState(false)
    const [spaceHeld, setSpaceHeld] = useState(false)
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
    const [editCanvasName, setEditCanvasName] = useState(false)
    const [showCanvasList, setShowCanvasList] = useState(true)
    const [gridMode, setGridMode] = useState<'dots' | 'lines' | 'none'>('dots')
    const [showMiniMap, setShowMiniMap] = useState(true)
    const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 })
    const [quickAddPos, setQuickAddPos] = useState<{ x: number, y: number } | null>(null)
    const [showWidgetMenu, setShowWidgetMenu] = useState(false) // Added state
    const [wheelPanning, setWheelPanning] = useState(false)

    // History (undo/redo)
    const [history, setHistory] = useState<any[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    // Mobile-specific state
    const [showMobileAddMenu, setShowMobileAddMenu] = useState(false)
    const [showMobileTools, setShowMobileTools] = useState(false)
    const [touchStartDist, setTouchStartDist] = useState<number | null>(null)
    const [touchStartZoom, setTouchStartZoom] = useState(1)
    const [showProjectPanel, setShowProjectPanel] = useState(false)
    const [pmStatusFilter, setPmStatusFilter] = useState<'all' | ProjectStatus>('all')
    const [focusNodeOnly, setFocusNodeOnly] = useState(false)

    const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
    const wheelPanRaf = useRef(0)
    const wheelPanDelta = useRef({ x: 0, y: 0 })
    const wheelPanReleaseTimeout = useRef(0)

    const projectNodes = useMemo(() => {
        if (!canvas) return []
        return canvas.nodes.filter(n => ['task', 'markdown', 'checklist', 'text', 'note'].includes(n.type))
    }, [canvas])

    const selectedNode = useMemo(
        () => canvas?.nodes.find(n => n.id === selectedNodeId) ?? null,
        [canvas, selectedNodeId]
    )

    const filteredProjectNodes = useMemo(() => {
        const base = [...projectNodes]
        if (pmStatusFilter === 'all') return base
        return base.filter(n => n.pm?.status === pmStatusFilter)
    }, [projectNodes, pmStatusFilter])

    const timelineNodes = useMemo(() => {
        return [...filteredProjectNodes]
            .filter(n => !!n.pm?.dueDate)
            .sort((a, b) => +new Date(a.pm?.dueDate || 0) - +new Date(b.pm?.dueDate || 0))
            .slice(0, 8)
    }, [filteredProjectNodes])

    const visibleNodeIds = useMemo(() => {
        if (!canvas) return new Set<string>()
        if (!focusNodeOnly || !selectedNodeId) return new Set(canvas.nodes.map(n => n.id))
        const linked = new Set<string>([selectedNodeId])
        canvas.connections.forEach(cn => {
            if (cn.fromId === selectedNodeId) linked.add(cn.toId)
            if (cn.toId === selectedNodeId) linked.add(cn.fromId)
        })
        return linked
    }, [canvas, focusNodeOnly, selectedNodeId])

    const visibleNodes = useMemo(
        () => canvas?.nodes.filter(n => visibleNodeIds.has(n.id)) ?? [],
        [canvas, visibleNodeIds]
    )
    const visibleConnections = useMemo(
        () => canvas?.connections.filter(cn => visibleNodeIds.has(cn.fromId) && visibleNodeIds.has(cn.toId)) ?? [],
        [canvas, visibleNodeIds]
    )

    // Track canvas size
    useEffect(() => {
        if (!canvasRef.current) return
        const obs = new ResizeObserver(entries => {
            for (const e of entries) {
                setCanvasSize({ w: e.contentRect.width, h: e.contentRect.height })
            }
        })
        obs.observe(canvasRef.current)
        return () => obs.disconnect()
    }, [])

    // Keyboard
    useEffect(() => {
        const onDown = (e: KeyboardEvent) => {
            const targetTag = (e.target as HTMLElement).tagName
            const isEditing = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable
            if (e.code === 'Space' && !isEditing) { e.preventDefault(); setSpaceHeld(true) }
            if (e.key === 'Delete' && selectedNodeId && !isEditing) { useCanvas.getState().deleteNode(selectedNodeId); setSelectedNodeId(null) }
            if (e.key === 'Escape') { setConnectingFrom(null); setSelectedNodeId(null) }
            // Undo / Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !isEditing) { e.preventDefault() }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !isEditing) { e.preventDefault() }
            // Center view
            if ((e.ctrlKey || e.metaKey) && e.key === '0') { resetViewport() }
        }
        const onUp = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false) }
        window.addEventListener('keydown', onDown)
        window.addEventListener('keyup', onUp)
        return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
    }, [selectedNodeId, resetViewport])

    // Pan
    const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
        setQuickAddPos(null)
        if (e.button === 1 || (e.button === 0 && spaceHeld)) {
            e.preventDefault()
            setPanning(true)
            panStart.current = { x: e.clientX, y: e.clientY, panX: viewport.panX, panY: viewport.panY }
        } else if (e.button === 0 && (e.target === e.currentTarget || (e.target as HTMLElement).id === 'nexus-canvas-inner')) {
            setSelectedNodeId(null)
            setConnectingFrom(null)
        }
    }, [spaceHeld, viewport.panX, viewport.panY])

    useEffect(() => {
        if (!panning) return
        let raf = 0
        let pending: { x: number; y: number } | null = null

        const flush = () => {
            raf = 0
            if (!pending) return
            setPan(pending.x, pending.y)
            pending = null
        }

        const onMove = (e: MouseEvent) => {
            pending = {
                x: panStart.current.panX + e.clientX - panStart.current.x,
                y: panStart.current.panY + e.clientY - panStart.current.y,
            }
            if (!raf) raf = requestAnimationFrame(flush)
        }
        const onUp = () => {
            if (raf) {
                cancelAnimationFrame(raf)
                raf = 0
            }
            if (pending) {
                setPan(pending.x, pending.y)
                pending = null
            }
            setPanning(false)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => {
            if (raf) cancelAnimationFrame(raf)
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [panning, setPan])

    const applyZoomAtPoint = useCallback((clientX: number, clientY: number, scaleFactor: number) => {
        const el = canvasRef.current
        if (!el) return
        const vp = useCanvas.getState().viewport
        const rect = el.getBoundingClientRect()
        const localX = clientX - rect.left
        const localY = clientY - rect.top
        const nextZoom = Math.max(0.15, Math.min(3, vp.zoom * scaleFactor))
        if (Math.abs(nextZoom - vp.zoom) < 0.0001) return
        const worldX = (localX - vp.panX) / vp.zoom
        const worldY = (localY - vp.panY) / vp.zoom
        const nextPanX = localX - worldX * nextZoom
        const nextPanY = localY - worldY * nextZoom
        useCanvas.setState({
            viewport: {
                ...vp,
                zoom: nextZoom,
                panX: nextPanX,
                panY: nextPanY,
            },
        })
    }, [])

    const setZoomCentered = useCallback((nextZoom: number) => {
        const el = canvasRef.current
        const vp = useCanvas.getState().viewport
        const clamped = Math.max(0.15, Math.min(3, nextZoom))
        if (!el) {
            setZoom(clamped)
            return
        }
        const rect = el.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const factor = clamped / Math.max(0.0001, vp.zoom)
        applyZoomAtPoint(centerX, centerY, factor)
    }, [applyZoomAtPoint, setZoom])

    // Trackpad-friendly wheel: pan by default, zoom only with pinch/Ctrl.
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        const deltaScale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvasSize.h : 1
        const dx = e.deltaX * deltaScale
        const dy = e.deltaY * deltaScale

        if (e.ctrlKey || e.metaKey) {
            const factor = Math.exp(-dy * 0.0015)
            applyZoomAtPoint(e.clientX, e.clientY, factor)
            return
        }

        wheelPanDelta.current.x -= dx
        wheelPanDelta.current.y -= dy
        setWheelPanning(true)
        if (!wheelPanRaf.current) {
            wheelPanRaf.current = requestAnimationFrame(() => {
                wheelPanRaf.current = 0
                const vp = useCanvas.getState().viewport
                const delta = wheelPanDelta.current
                wheelPanDelta.current = { x: 0, y: 0 }
                if (delta.x || delta.y) {
                    useCanvas.setState({
                        viewport: {
                            ...vp,
                            panX: vp.panX + delta.x,
                            panY: vp.panY + delta.y,
                        },
                    })
                }
            })
        }

        if (wheelPanReleaseTimeout.current) {
            window.clearTimeout(wheelPanReleaseTimeout.current)
        }
        wheelPanReleaseTimeout.current = window.setTimeout(() => {
            setWheelPanning(false)
        }, 90)
    }, [applyZoomAtPoint, canvasSize.h])

    useEffect(() => () => {
        if (wheelPanRaf.current) {
            cancelAnimationFrame(wheelPanRaf.current)
        }
        if (wheelPanReleaseTimeout.current) {
            window.clearTimeout(wheelPanReleaseTimeout.current)
        }
    }, [])

    const handleStartConnect = useCallback((nodeId: string) => setConnectingFrom(nodeId), [])
    const handleEndConnect = useCallback((nodeId: string) => {
        if (connectingFrom && connectingFrom !== nodeId) addConnection(connectingFrom, nodeId)
        setConnectingFrom(null)
    }, [connectingFrom, addConnection])

    // Fit view to all nodes
    const fitView = useCallback(() => {
        if (!canvas || canvas.nodes.length === 0) { resetViewport(); return }
        const cW = canvasSize.w, cH = canvasSize.h
        const minX = Math.min(...canvas.nodes.map(n => n.x))
        const maxX = Math.max(...canvas.nodes.map(n => n.x + n.width))
        const minY = Math.min(...canvas.nodes.map(n => n.y))
        const maxY = Math.max(...canvas.nodes.map(n => n.y + n.height))
        const pad = 60
        const z = Math.min((cW - pad * 2) / (maxX - minX), (cH - pad * 2) / (maxY - minY), 1.5)
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
        setZoom(z)
        setPan(cW / 2 - cx * z, cH / 2 - cy * z)
    }, [canvas, canvasSize, resetViewport, setZoom, setPan])

    const createProjectTemplate = useCallback(() => {
        if (!canvas) return
        const state = useCanvas.getState()
        const baseX = (-viewport.panX + canvasSize.w * 0.15) / viewport.zoom
        const baseY = (-viewport.panY + canvasSize.h * 0.2) / viewport.zoom
        const make = (type: NodeType, x: number, y: number, patch: Partial<CanvasNode>) => {
            state.addNode(type, x, y)
            const c = state.getActiveCanvas()
            const last = c?.nodes[c.nodes.length - 1]
            if (!last) return
            state.updateNode(last.id, patch)
        }
        make('markdown', baseX, baseY, {
            title: 'Projekt Brief',
            content: '# Projektziel\n\n- Scope\n- Timeline\n- Risiken\n',
            pm: { status: 'idea', priority: 'high', owner: 'you', progress: 5, tags: ['brief', 'scope'] },
            width: 360,
            height: 250,
        })
        make('checklist', baseX + 420, baseY, {
            title: 'Sprint Backlog',
            items: [
                { id: `i-${Date.now()}-1`, text: 'UI Polish abschließen', done: false },
                { id: `i-${Date.now()}-2`, text: 'QA Testcases schreiben', done: false },
                { id: `i-${Date.now()}-3`, text: 'Release Notes vorbereiten', done: false },
            ],
            pm: { status: 'backlog', priority: 'mid', owner: 'team', progress: 0, tags: ['sprint'] },
            width: 320,
            height: 240,
        })
        make('task', baseX + 120, baseY + 300, {
            title: 'API Integration',
            pm: {
                status: 'doing',
                priority: 'high',
                owner: 'backend',
                dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
                estimate: 8,
                progress: 45,
                tags: ['api', 'integration'],
            },
        })
        make('task', baseX + 420, baseY + 300, {
            title: 'Mobile QA',
            pm: {
                status: 'todo',
                priority: 'mid',
                owner: 'qa',
                dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
                estimate: 5,
                progress: 0,
                tags: ['qa', 'mobile'],
            },
        })
        make('text', baseX + 760, baseY + 40, {
            title: 'Milestone',
            content: 'Beta Release',
            pm: {
                status: 'review',
                priority: 'critical',
                owner: 'pm',
                dueDate: new Date(Date.now() + 10 * 86400000).toISOString(),
                milestone: 'Beta v1',
                progress: 70,
                tags: ['milestone'],
            },
            width: 260,
            height: 160,
            color: '#BF5AF2',
        })
        fitView()
    }, [canvas, viewport.panX, viewport.panY, viewport.zoom, canvasSize.w, canvasSize.h, fitView])

    const autoArrangeByStatus = useCallback(() => {
        const state = useCanvas.getState()
        const c = state.getActiveCanvas()
        if (!c) return
        const columns = PM_STATUS_ORDER
        const laneX = (idx: number) => 120 + idx * 300
        const laneYStart = 140
        const laneGap = 170
        const counters: Record<ProjectStatus, number> = {
            idea: 0, backlog: 0, todo: 0, doing: 0, review: 0, done: 0, blocked: 0,
        }
        c.nodes.forEach(node => {
            const st = node.pm?.status || 'idea'
            const idx = columns.indexOf(st)
            const row = counters[st]++
            state.moveNode(node.id, laneX(Math.max(0, idx)), laneYStart + row * laneGap)
        })
        fitView()
    }, [fitView])

    const autoLinkWikiRefs = useCallback(() => {
        const state = useCanvas.getState()
        const c = state.getActiveCanvas()
        if (!c) return
        const byTitle = new Map(c.nodes.map(n => [n.title.trim().toLowerCase(), n.id]))
        c.nodes.forEach((node) => {
            const content = node.content || ''
            const matches = Array.from(content.matchAll(/\[\[([^\]]+)\]\]/g)).map(m => m[1].trim().toLowerCase())
            matches.forEach((m) => {
                const toId = byTitle.get(m)
                if (toId && toId !== node.id) state.addConnection(node.id, toId)
            })
        })
    }, [])

    // Empty state
    if (canvases.length === 0) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                <div style={{
                    fontSize: 72, opacity: 0.12,
                    background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    animation: 'nexus-float 3s ease-in-out infinite',
                }}>✦</div>
                <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.7 }}>Kein Canvas vorhanden</div>
                <div style={{ fontSize: 13, opacity: 0.4, maxWidth: 300, textAlign: 'center' }}>
                    Erstelle ein neues Canvas, um Ideen, Pläne und Mindmaps visuell zu organisieren.
                </div>
                <button onClick={() => addCanvas()} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 28px', borderRadius: 14, border: 'none',
                    background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                    color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                    boxShadow: `0 6px 24px rgba(${rgb}, 0.35)`,
                    transition: 'transform 0.15s ease',
                }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                    <Plus size={20} /> Neues Canvas
                </button>
            </div>
        )
    }

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden' }}>
            {/* ── Sidebar — desktop panel, mobile bottom sheet ── */}
            {showCanvasList && !mob.isMobile && (
                <Glass type="panel" className="shrink-0" style={{
                    width: 188, height: '100%', display: 'flex', flexDirection: 'column',
                    borderRight: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
                    borderRadius: 0,
                }}>
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingBottom: 8, borderBottom: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'}` }}>
                            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.45, textTransform: 'uppercase', letterSpacing: 1.2 }}>Canvases</span>
                            <button onClick={() => addCanvas()} style={{
                                background: `rgba(${rgb}, 0.15)`, border: 'none', borderRadius: 7,
                                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: t.accent, transition: 'all 0.15s',
                            }}><Plus size={13} /></button>
                        </div>

                        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {canvases.map(c => (
                                <div key={c.id} onClick={() => setActiveCanvas(c.id)} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '7px 9px', borderRadius: 8, cursor: 'pointer',
                                    background: c.id === activeCanvasId ? `rgba(${rgb}, 0.15)` : 'transparent',
                                    borderLeft: c.id === activeCanvasId ? `2px solid ${t.accent}` : '2px solid transparent',
                                    transition: 'all 0.15s',
                                }}
                                    onMouseEnter={e => { if (c.id !== activeCanvasId) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
                                    onMouseLeave={e => { if (c.id !== activeCanvasId) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                                >
                                    <span style={{ flex: 1, fontSize: 12, fontWeight: c.id === activeCanvasId ? 600 : 400, color: c.id === activeCanvasId ? t.accent : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.name}
                                    </span>
                                    <span style={{ fontSize: 10, opacity: 0.35, background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>{c.nodes.length}</span>
                                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${c.name}"?`)) deleteCanvas(c.id) }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF3B30', opacity: 0, padding: 2, transition: 'opacity 0.15s' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0'}
                                    ><X size={11} /></button>
                                </div>
                            ))}
                        </div>

                        <div style={{ fontSize: 10, opacity: 0.3, marginTop: 4, paddingTop: 6, borderTop: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}` }}>
                            {canvas?.nodes.length ?? 0} nodes · {canvas?.connections.length ?? 0} links
                        </div>
                    </div>
                </Glass>
            )}

            {/* ── Mobile Canvas List Sheet ── */}
            <AnimatePresence>
                {mob.isMobile && showCanvasList && (
                    <>
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                            onClick={() => setShowCanvasList(false)}
                            style={{ position:'fixed', inset:0, zIndex:85, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)' }}/>
                        <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                            transition={{type:'spring',stiffness:380,damping:30}}
                            style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:86,
                                background: t.mode==='dark'?'rgba(14,14,26,0.97)':'rgba(248,248,255,0.97)',
                                backdropFilter:'blur(24px)', borderRadius:'20px 20px 0 0',
                                border:'1px solid rgba(255,255,255,0.1)', borderBottom:'none',
                                padding:'8px 16px 40px', maxHeight:'70vh', display:'flex', flexDirection:'column' }}>
                            <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)', margin:'0 auto 16px' }}/>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                                <span style={{ fontSize:14, fontWeight:800 }}>Canvases</span>
                                <button onClick={() => { addCanvas(); setShowCanvasList(false) }} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:`rgba(${rgb},0.18)`, border:'none', cursor:'pointer', color:t.accent, fontSize:13, fontWeight:700 }}>
                                    <Plus size={16}/> New
                                </button>
                            </div>
                            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                                {canvases.map(c => (
                                    <button key={c.id} onClick={() => { setActiveCanvas(c.id); setShowCanvasList(false) }}
                                        style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:14, cursor:'pointer',
                                            background: c.id===activeCanvasId?`rgba(${rgb},0.18)`:'rgba(255,255,255,0.05)',
                                            border:`1px solid ${c.id===activeCanvasId?t.accent:'rgba(255,255,255,0.08)'}`,
                                            color: c.id===activeCanvasId?t.accent:'inherit', textAlign:'left' }}>
                                        <div style={{ flex:1 }}>
                                            <div style={{ fontSize:14, fontWeight:c.id===activeCanvasId?700:500 }}>{c.name}</div>
                                            <div style={{ fontSize:11, opacity:0.45, marginTop:2 }}>{c.nodes.length} nodes · {c.connections.length} links</div>
                                        </div>
                                        <button onClick={e=>{ e.stopPropagation(); if(confirm(`Delete "${c.name}"?`)) deleteCanvas(c.id) }}
                                            style={{ background:'none', border:'none', cursor:'pointer', color:'#FF3B30', padding:'4px 6px', borderRadius:6 }}>
                                            <X size={16}/>
                                        </button>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Main Canvas ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* ── Top Bar ── */}
                <div style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: mob.isMobile ? 8 : 4,
                    padding: mob.isMobile ? '8px 12px' : '5px 8px',
                    borderBottom: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    background: t.mode === 'dark' ? 'rgba(10,10,20,0.85)' : 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(16px)',
                }}>
                    {/* Sidebar toggle — on mobile shows canvas list as bottom sheet */}
                    <ToolBtn icon={FileText} tooltip="Canvases" onClick={() => setShowCanvasList(!showCanvasList)} accent={t.accent} rgb={rgb} active={showCanvasList} />

                    {/* Canvas name */}
                    {canvas && (
                        editCanvasName
                            ? <input autoFocus value={canvas.name} onChange={(e) => renameCanvas(canvas.id, e.target.value)}
                                onBlur={() => setEditCanvasName(false)} onKeyDown={(e) => e.key === 'Enter' && setEditCanvasName(false)}
                                style={{ background: 'transparent', border: 'none', outline: 'none', color: t.accent, fontWeight: 600, fontSize: 13, width: 130, padding: '1px 4px' }} />
                            : <span onDoubleClick={() => setEditCanvasName(true)} onTouchEnd={() => setEditCanvasName(true)}
                                style={{ fontWeight: 700, fontSize: 14, color: t.accent, padding: '1px 6px', cursor: 'pointer', borderRadius: 4, maxWidth: mob.isMobile ? 120 : 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {canvas.name}
                            </span>
                    )}

                    <div style={{ flex: 1 }} />

                    {mob.isMobile ? (
                        /* Mobile: "+ Add" button opens bottom sheet, tools button */
                        <>
                            <button onClick={() => setShowMobileAddMenu(s => !s)} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '10px 16px', borderRadius: 12,
                                background: showMobileAddMenu ? t.accent : `rgba(${rgb},0.18)`,
                                border: 'none', cursor: 'pointer',
                                color: showMobileAddMenu ? '#fff' : t.accent,
                                fontSize: 14, fontWeight: 700, flexShrink: 0,
                            }}>
                                <Plus size={18} /> Add
                            </button>
                            <button onClick={() => setShowMobileTools(s => !s)} style={{
                                width: 44, height: 44, borderRadius: 12, border: 'none',
                                background: showMobileTools ? `rgba(${rgb},0.2)` : 'rgba(255,255,255,0.08)',
                                cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Maximize2 size={20} style={{ opacity: 0.7 }}/>
                            </button>
                        </>
                    ) : (
                        /* Desktop: icon-only toolbar */
                        <>
                            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
                            {WIDGET_TYPES.map(({ type, icon: WIcon, label }) => (
                                <ToolBtn key={type} icon={WIcon} tooltip={label}
                                    onClick={() => {
                                        if (type === 'sticky') {
                                            addNode('text')
                                            setTimeout(() => {
                                                const state = useCanvas.getState()
                                                const c = state.getActiveCanvas()
                                                if (c) {
                                                    const last = c.nodes[c.nodes.length - 1]
                                                    if (last) state.updateNode(last.id, { color: '#FFCC00', title: 'Sticky Note' })
                                                }
                                            }, 50)
                                        } else { addNode(type as NodeType) }
                                    }}
                                    accent={t.accent} rgb={rgb} />
                            ))}
                            <div style={{ flex: 1 }} />
                            <ToolBtn icon={Grid} tooltip="Grid-Modus" onClick={() => setGridMode(g => g === 'dots' ? 'lines' : g === 'lines' ? 'none' : 'dots')} accent={t.accent} rgb={rgb} active={gridMode !== 'none'} />
                            <ToolBtn icon={MapIcon} tooltip="Minimap" onClick={() => setShowMiniMap(!showMiniMap)} accent={t.accent} rgb={rgb} active={showMiniMap} />
                            <ToolBtn icon={CheckSquare} tooltip="Projekt Panel" onClick={() => setShowProjectPanel(s => !s)} accent={t.accent} rgb={rgb} active={showProjectPanel} />
                            <ToolBtn icon={Link} tooltip="Auto Link [[Wiki]]" onClick={autoLinkWikiRefs} accent={t.accent} rgb={rgb} />
                            <ToolBtn icon={Grid} tooltip="Arrange by Status" onClick={autoArrangeByStatus} accent={t.accent} rgb={rgb} />
                            <ToolBtn icon={Plus} tooltip="Projekt Template" onClick={createProjectTemplate} accent={t.accent} rgb={rgb} />
                            <ToolBtn icon={AlignCenter} tooltip="Fit to View" onClick={fitView} accent={t.accent} rgb={rgb} />
                            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
                            <ToolBtn icon={ZoomOut} tooltip="Rauszoomen" onClick={() => setZoomCentered(viewport.zoom - 0.15)} accent={t.accent} rgb={rgb} />
                            <span style={{ fontSize: 11, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', minWidth: 42, textAlign: 'center', opacity: 0.8 }}>
                                {Math.round(viewport.zoom * 100)}%
                            </span>
                            <ToolBtn icon={ZoomIn} tooltip="Reinzoomen" onClick={() => setZoomCentered(viewport.zoom + 0.15)} accent={t.accent} rgb={rgb} />
                            <ToolBtn icon={Maximize2} tooltip="Reset View" onClick={resetViewport} accent={t.accent} rgb={rgb} />
                        </>
                    )}
                </div>

                {/* ── Mobile Add Menu (bottom sheet) ── */}
                <AnimatePresence>
                    {mob.isMobile && showMobileAddMenu && (
                        <>
                            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                                onClick={() => setShowMobileAddMenu(false)}
                                style={{ position:'absolute', inset:0, zIndex:80, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)' }}/>
                            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                                transition={{type:'spring',stiffness:380,damping:30}}
                                style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:81,
                                    background: t.mode==='dark'?'rgba(14,14,26,0.97)':'rgba(248,248,255,0.97)',
                                    backdropFilter:'blur(24px)', borderRadius:'20px 20px 0 0',
                                    border:'1px solid rgba(255,255,255,0.1)', borderBottom:'none', padding:'8px 16px 32px' }}>
                                <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)', margin:'0 auto 16px' }}/>
                                <div style={{ fontSize:11, fontWeight:800, opacity:0.4, textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>Add Element</div>
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                                    {WIDGET_TYPES.map(({ type, icon: WIcon, label }) => (
                                        <button key={type}
                                            onClick={() => {
                                                if (type === 'sticky') {
                                                    addNode('text')
                                                    setTimeout(() => {
                                                        const state = useCanvas.getState(); const c = state.getActiveCanvas()
                                                        if (c) { const last = c.nodes[c.nodes.length-1]; if (last) state.updateNode(last.id, { color:'#FFCC00', title:'Sticky Note' }) }
                                                    }, 50)
                                                } else { addNode(type as NodeType) }
                                                setShowMobileAddMenu(false)
                                            }}
                                            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px 8px', borderRadius:14,
                                                background:`rgba(${rgb},0.1)`, border:`1px solid rgba(${rgb},0.18)`, cursor:'pointer', color:t.accent }}>
                                            <WIcon size={24}/>
                                            <span style={{ fontSize:10, fontWeight:700 }}>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* ── Mobile Tools Sheet ── */}
                <AnimatePresence>
                    {mob.isMobile && showMobileTools && (
                        <>
                            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                                onClick={() => setShowMobileTools(false)}
                                style={{ position:'absolute', inset:0, zIndex:80, background:'rgba(0,0,0,0.3)', backdropFilter:'blur(4px)' }}/>
                            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                                transition={{type:'spring',stiffness:380,damping:30}}
                                style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:81,
                                    background: t.mode==='dark'?'rgba(14,14,26,0.97)':'rgba(248,248,255,0.97)',
                                    backdropFilter:'blur(24px)', borderRadius:'20px 20px 0 0',
                                    border:'1px solid rgba(255,255,255,0.1)', borderBottom:'none', padding:'8px 16px 32px' }}>
                                <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)', margin:'0 auto 16px' }}/>
                                <div style={{ fontSize:11, fontWeight:800, opacity:0.4, textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>View Controls</div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                                    {/* Zoom controls */}
                                    <button onClick={() => setZoomCentered(viewport.zoom - 0.25)} style={{ padding:'14px', borderRadius:14, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', color:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:15, fontWeight:700 }}>
                                        <ZoomOut size={20}/> Zoom Out
                                    </button>
                                    <button onClick={() => setZoomCentered(viewport.zoom + 0.25)} style={{ padding:'14px', borderRadius:14, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', color:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:15, fontWeight:700 }}>
                                        <ZoomIn size={20}/> Zoom In
                                    </button>
                                    <button onClick={fitView} style={{ padding:'14px', borderRadius:14, background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.25)`, cursor:'pointer', color:t.accent, display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:14, fontWeight:700 }}>
                                        <AlignCenter size={20}/> Fit View
                                    </button>
                                    <button onClick={resetViewport} style={{ padding:'14px', borderRadius:14, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', color:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:14, fontWeight:700 }}>
                                        <Maximize2 size={20}/> Reset
                                    </button>
                                </div>
                                <div style={{ display:'flex', gap:10 }}>
                                    <button onClick={() => setGridMode(g => g==='dots'?'lines':g==='lines'?'none':'dots')} style={{ flex:1, padding:'12px', borderRadius:12, background:gridMode!=='none'?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.07)', border:`1px solid ${gridMode!=='none'?t.accent:'rgba(255,255,255,0.1)'}`, cursor:'pointer', color:gridMode!=='none'?t.accent:'inherit', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                        <Grid size={16}/> Grid: {gridMode}
                                    </button>
                                    <button onClick={() => setShowMiniMap(s=>!s)} style={{ flex:1, padding:'12px', borderRadius:12, background:showMiniMap?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.07)', border:`1px solid ${showMiniMap?t.accent:'rgba(255,255,255,0.1)'}`, cursor:'pointer', color:showMiniMap?t.accent:'inherit', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                        <MapIcon size={16}/> Minimap
                                    </button>
                                </div>
                                <div style={{ display:'flex', gap:10, marginTop:10 }}>
                                    <button onClick={() => setShowProjectPanel(s => !s)} style={{ flex:1, padding:'12px', borderRadius:12, background:showProjectPanel?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.07)', border:`1px solid ${showProjectPanel?t.accent:'rgba(255,255,255,0.1)'}`, cursor:'pointer', color:showProjectPanel?t.accent:'inherit', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                        <CheckSquare size={16}/> Project
                                    </button>
                                    <button onClick={autoLinkWikiRefs} style={{ flex:1, padding:'12px', borderRadius:12, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', color:'inherit', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                        <Link size={16}/> Auto Link
                                    </button>
                                </div>
                                <div style={{ display:'flex', gap:10, marginTop:10 }}>
                                    <button onClick={autoArrangeByStatus} style={{ flex:1, padding:'12px', borderRadius:12, background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.25)`, cursor:'pointer', color:t.accent, fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                        <Grid size={16}/> Arrange
                                    </button>
                                    <button onClick={createProjectTemplate} style={{ flex:1, padding:'12px', borderRadius:12, background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.25)`, cursor:'pointer', color:t.accent, fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                        <Plus size={16}/> Template
                                    </button>
                                </div>
                                <div style={{ textAlign:'center', marginTop:12, fontSize:11, opacity:0.4 }}>
                                    Zoom: {Math.round(viewport.zoom*100)}% · {canvas?.nodes.length??0} Nodes
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* ── Canvas Surface ── */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    {/* Connect mode toast */}
                    {connectingFrom && (
                        <div style={{
                            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                            zIndex: 200, display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 18px', borderRadius: 12,
                            background: `rgba(${rgb}, 0.25)`, border: `1px solid ${t.accent}`,
                            backdropFilter: 'blur(12px)', fontSize: 12, fontWeight: 500,
                            boxShadow: `0 4px 20px rgba(${rgb}, 0.3)`,
                            animation: 'nexus-fade-up 0.25s both',
                        }}>
                            <Link size={14} style={{ color: t.accent }} />
                            Klicke auf einen anderen Node zum Verbinden
                            <button onClick={() => setConnectingFrom(null)} style={{
                                background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6,
                                padding: '2px 10px', cursor: 'pointer', color: 'inherit', fontSize: 11,
                            }}>Abbrechen</button>
                        </div>
                    )}

                    {/* Space hint */}
                    {spaceHeld && (
                        <div style={{
                            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                            zIndex: 200, padding: '4px 12px', borderRadius: 8,
                            background: 'rgba(0,0,0,0.5)', fontSize: 11, opacity: 0.7, pointerEvents: 'none',
                        }}>Hold Space + Drag to Pan</div>
                    )}

                    <div ref={canvasRef}
                        className="w-full h-full relative nx-canvas-grid"
                        style={{
                            cursor: connectingFrom
                                ? 'crosshair'
                                : (spaceHeld
                                    ? (panning ? 'grabbing' : 'grab')
                                    : (wheelPanning ? 'grabbing' : 'default')),
                            transition: panning || wheelPanning
                                ? 'none'
                                : 'background-position 0.08s ease-out, background-size 0.12s ease-out',
                            backgroundPosition: `${viewport.panX}px ${viewport.panY}px`, // viewport.x, viewport.y replaced with viewport.panX, viewport.panY
                            backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
                            backgroundImage: gridMode === 'dots'
                                ? (t.mode === 'dark'
                                    ? 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)'
                                    : 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)')
                                : gridMode === 'lines'
                                    ? (t.mode === 'dark'
                                        ? 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)'
                                        : 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)')
                                    : 'none',
                        }}
                        onMouseDown={handleCanvasMouseDown}
                        onWheel={handleWheel}
                        onTouchStart={(e) => {
                            if (e.touches.length === 2) {
                                const dx = e.touches[0].clientX - e.touches[1].clientX
                                const dy = e.touches[0].clientY - e.touches[1].clientY
                                setTouchStartDist(Math.sqrt(dx*dx + dy*dy))
                                setTouchStartZoom(viewport.zoom)
                            } else if (e.touches.length === 1) {
                                setPanning(true)
                                panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: viewport.panX, panY: viewport.panY }
                            }
                        }}
                        onTouchMove={(e) => {
                            e.preventDefault()
                            if (e.touches.length === 2 && touchStartDist !== null) {
                                const dx = e.touches[0].clientX - e.touches[1].clientX
                                const dy = e.touches[0].clientY - e.touches[1].clientY
                                const dist = Math.sqrt(dx*dx + dy*dy)
                                const scale = dist / touchStartDist
                                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
                                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
                                const vp = useCanvas.getState().viewport
                                const nextZoom = Math.max(0.15, Math.min(3, touchStartZoom * scale))
                                applyZoomAtPoint(centerX, centerY, nextZoom / Math.max(0.0001, vp.zoom))
                            } else if (e.touches.length === 1 && panning) {
                                const dx = e.touches[0].clientX - panStart.current.x
                                const dy = e.touches[0].clientY - panStart.current.y
                                setPan(panStart.current.panX + dx, panStart.current.panY + dy)
                            }
                        }}
                        onTouchEnd={() => {
                            setPanning(false)
                            setTouchStartDist(null)
                        }}
                        onDoubleClick={(e) => {
                            if (e.target !== e.currentTarget && (e.target as HTMLElement).id !== 'nexus-canvas-inner') return
                            const rect = canvasRef.current?.getBoundingClientRect()
                            if (!rect) return
                            setQuickAddPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                        }}
                        onClick={() => setShowWidgetMenu(false)} // Added onClick
                    >
                        {/* ── TRANSFORM LAYER ── */}
                        <div style={{
                            position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
                            transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`, // viewport.x, viewport.y replaced with viewport.panX, viewport.panY
                            transformOrigin: '0 0',
                            willChange: 'transform',
                            backfaceVisibility: 'hidden',
                        }}>
                            {/* SVG Layer for Connections */}
                            {canvas && visibleConnections.length > 0 && (
                                <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 0 }}>
                                    <defs>
                                        <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                                            <feGaussianBlur stdDeviation="4" result="blur" />
                                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                        </filter>
                                    </defs>
                                    {visibleConnections.map(conn => (
                                        <ConnectionLine key={conn.id} conn={conn} nodes={visibleNodes} zoom={viewport.zoom} onDelete={deleteConnection} />
                                    ))}
                                </svg>
                            )}

                            {/* Nodes */}
                            {visibleNodes.map(node => (
                                <NodeWidget key={node.id} node={node}
                                    isSelected={selectedNodeId === node.id}
                                    onSelect={setSelectedNodeId}
                                    onStartConnect={handleStartConnect}
                                    onEndConnect={handleEndConnect}
                                    connectingFrom={connectingFrom}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Quick Add Context Menu */}
                    {quickAddPos && (
                        <div style={{
                            position: 'absolute', top: quickAddPos.y, left: quickAddPos.x,
                            zIndex: 300, background: t.mode === 'dark' ? '#1a1a2e' : '#fff',
                            border: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                            borderRadius: 12, padding: 6, width: 150,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            animation: 'nexus-scale-in 0.15s cubic-bezier(0.4,0,0.2,1) both',
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, padding: '4px 8px', textTransform: 'uppercase' }}>Add Element</div>
                            {WIDGET_TYPES.map(({ type, icon: WIcon, label }) => (
                                <button key={type} onClick={() => {
                                    const canvasX = (-viewport.panX + quickAddPos.x) / viewport.zoom
                                    const canvasY = (-viewport.panY + quickAddPos.y) / viewport.zoom
                                    if (type === 'sticky') {
                                        addNode('text', canvasX, canvasY)
                                        setTimeout(() => {
                                            const state = useCanvas.getState()
                                            const c = state.getActiveCanvas()
                                            const last = c?.nodes[c.nodes.length - 1]
                                            if (last) state.updateNode(last.id, { color: '#FFCC00', title: 'Sticky Note' })
                                        }, 10)
                                    } else {
                                        addNode(type as NodeType, canvasX, canvasY)
                                    }
                                    setQuickAddPos(null)
                                }} style={{
                                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                    padding: '6px 8px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                                    background: 'transparent', color: t.mode === 'dark' ? '#fff' : '#000', textAlign: 'left',
                                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(128,128,128,0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <WIcon size={14} style={{ color: t.accent }} /> {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Mini-map */}
                    {showMiniMap && visibleNodes.length > 0 && (
                        <MiniMap nodes={visibleNodes} viewport={viewport} canvasW={canvasSize.w} canvasH={canvasSize.h} />
                    )}

                    {/* Project Panel */}
                    {showProjectPanel && canvas && (
                        <div style={{
                            position: 'absolute', top: 14, right: 14, zIndex: 210,
                            width: mob.isMobile ? 'calc(100% - 28px)' : 320, maxHeight: mob.isMobile ? '62%' : '78%',
                            overflow: 'auto', borderRadius: 14, padding: 12,
                            background: t.mode === 'dark' ? 'rgba(12,12,22,0.85)' : 'rgba(255,255,255,0.9)',
                            backdropFilter: 'blur(18px)',
                            border: '1px solid rgba(255,255,255,0.14)',
                            boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <CheckSquare size={14} style={{ color: t.accent }} />
                                <div style={{ fontSize: 12, fontWeight: 800 }}>Project Canvas</div>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                    <button onClick={() => setFocusNodeOnly(s => !s)} style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid ${focusNodeOnly ? t.accent : 'rgba(255,255,255,0.14)'}`, background: focusNodeOnly ? `rgba(${rgb},0.16)` : 'rgba(255,255,255,0.06)', color: focusNodeOnly ? t.accent : 'inherit', fontSize: 10, cursor: 'pointer' }}>Focus</button>
                                    <button onClick={() => setShowProjectPanel(false)} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', fontSize: 10, cursor: 'pointer', color: 'inherit' }}>Close</button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
                                {[
                                    { label: 'Nodes', val: projectNodes.length },
                                    { label: 'Done', val: projectNodes.filter(n => n.pm?.status === 'done').length },
                                    { label: 'Blocked', val: projectNodes.filter(n => n.pm?.status === 'blocked').length },
                                    { label: 'Links', val: canvas.connections.length },
                                ].map(x => (
                                    <div key={x.label} style={{ padding: '7px 6px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                                        <div style={{ fontSize: 14, fontWeight: 800 }}>{x.val}</div>
                                        <div style={{ fontSize: 9, opacity: 0.55 }}>{x.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10 }}>
                                <button onClick={() => setPmStatusFilter('all')} style={{ fontSize: 10, padding: '4px 7px', borderRadius: 999, border: `1px solid ${pmStatusFilter === 'all' ? t.accent : 'rgba(255,255,255,0.15)'}`, background: pmStatusFilter === 'all' ? `rgba(${rgb},0.16)` : 'rgba(255,255,255,0.04)', color: pmStatusFilter === 'all' ? t.accent : 'inherit', cursor: 'pointer' }}>all</button>
                                {PM_STATUS_ORDER.map(st => (
                                    <button key={st} onClick={() => setPmStatusFilter(st)} style={{ fontSize: 10, padding: '4px 7px', borderRadius: 999, border: `1px solid ${pmStatusFilter === st ? PM_STATUS_COLOR[st] : 'rgba(255,255,255,0.15)'}`, background: pmStatusFilter === st ? `${PM_STATUS_COLOR[st]}22` : 'rgba(255,255,255,0.04)', color: pmStatusFilter === st ? PM_STATUS_COLOR[st] : 'inherit', cursor: 'pointer' }}>
                                        {st}
                                    </button>
                                ))}
                            </div>

                            {selectedNode && (
                                <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 10, marginBottom: 10, background: 'rgba(255,255,255,0.04)' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Selected: {selectedNode.title}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                        <select value={selectedNode.pm?.status || 'idea'} onChange={e => useCanvas.getState().updateNode(selectedNode.id, { pm: { ...(selectedNode.pm || {}), status: e.target.value as ProjectStatus } })} style={{ fontSize: 11, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'inherit' }}>
                                            {PM_STATUS_ORDER.map(st => <option key={st} value={st}>{st}</option>)}
                                        </select>
                                        <select value={selectedNode.pm?.priority || 'mid'} onChange={e => useCanvas.getState().updateNode(selectedNode.id, { pm: { ...(selectedNode.pm || {}), priority: e.target.value as ProjectPriority } })} style={{ fontSize: 11, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'inherit' }}>
                                            {(['low', 'mid', 'high', 'critical'] as ProjectPriority[]).map(pr => <option key={pr} value={pr}>{pr}</option>)}
                                        </select>
                                        <input value={selectedNode.pm?.owner || ''} placeholder="Owner" onChange={e => useCanvas.getState().updateNode(selectedNode.id, { pm: { ...(selectedNode.pm || {}), owner: e.target.value } })} style={{ fontSize: 11, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'inherit' }} />
                                        <input type="date" value={selectedNode.pm?.dueDate ? selectedNode.pm.dueDate.slice(0, 10) : ''} onChange={e => useCanvas.getState().updateNode(selectedNode.id, { pm: { ...(selectedNode.pm || {}), dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined } })} style={{ fontSize: 11, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'inherit' }} />
                                    </div>
                                    <div style={{ marginTop: 8 }}>
                                        <label style={{ fontSize: 10, opacity: 0.6, display: 'block', marginBottom: 4 }}>Progress {selectedNode.pm?.progress ?? 0}%</label>
                                        <input type="range" min={0} max={100} value={selectedNode.pm?.progress ?? 0} onChange={e => useCanvas.getState().updateNode(selectedNode.id, { pm: { ...(selectedNode.pm || {}), progress: Number(e.target.value) } })} style={{ width: '100%' }} />
                                    </div>
                                </div>
                            )}

                            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.55, marginBottom: 6 }}>Timeline</div>
                            {timelineNodes.length === 0 ? (
                                <div style={{ fontSize: 11, opacity: 0.5 }}>Keine Datums-Items im aktuellen Filter.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {timelineNodes.map(n => (
                                        <button key={n.id} onClick={() => { setSelectedNodeId(n.id); if (focusNodeOnly) fitView() }} style={{ textAlign: 'left', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 9, background: 'rgba(255,255,255,0.05)', cursor: 'pointer', padding: '7px 8px', color: 'inherit' }}>
                                            <div style={{ fontSize: 11, fontWeight: 700 }}>{n.title}</div>
                                            <div style={{ fontSize: 10, opacity: 0.6 }}>{n.pm?.dueDate ? new Date(n.pm.dueDate).toLocaleDateString() : '-'}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Zoom tooltip */}
                    {viewport.zoom !== 1 && (
                        <div style={{
                            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                            fontSize: 10, opacity: 0.35, pointerEvents: 'none',
                            background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace',
                        }}>{Math.round(viewport.zoom * 100)}% · Scroll to pan · Pinch/Ctrl + Scroll to zoom</div>
                    )}
                </div>
            </div>
        </div>
    )
}
