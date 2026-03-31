import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
    Plus, ZoomIn, ZoomOut, Maximize2, Trash2, Edit3, Link,
    FileText, CheckSquare, X, GripVertical,
    MoreHorizontal, Palette, Unlink, Grid, Map as MapIcon, RotateCcw, RotateCw,
    Copy, AlignCenter, FileDown
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
import { CanvasNexusCodeBlock } from '@nexus/core/canvas/CanvasMagicRenderers'
import {
    CanvasConnectionLine,
    CanvasNodeWidget,
    CanvasMiniMap,
} from './canvas/components/CanvasCanvasPrimitives'
import { CanvasToolBtn } from './canvas/components/CanvasToolBtn'
import { CanvasEmptyState } from './canvas/components/CanvasEmptyState'
import {
    autoArrangeCanvasByStatus,
    autoLinkCanvasWikiRefs,
    createCanvasProjectTemplate,
    duplicateSelectedCanvasNode,
    exportCanvasFiles,
} from './canvas/mobileCanvasActions'
import {
    CANVAS_NODE_OVERSCAN_MAX_PX,
    CANVAS_NODE_OVERSCAN_PX,
    NODE_COLORS,
    PM_PRIORITY_COLOR,
    PM_STATUS_COLOR,
    PM_STATUS_ORDER,
    WIDGET_TYPES,
} from './canvas/mobileCanvasConfig'

// ─── CONSTANTS ───

// ─── CONNECTION LINE ───

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

    const focusNodeIds = useMemo(() => {
        if (!canvas) return new Set<string>()
        if (!focusNodeOnly || !selectedNodeId) return new Set(canvas.nodes.map(n => n.id))
        const linked = new Set<string>([selectedNodeId])
        canvas.connections.forEach(cn => {
            if (cn.fromId === selectedNodeId) linked.add(cn.toId)
            if (cn.toId === selectedNodeId) linked.add(cn.fromId)
        })
        return linked
    }, [canvas, focusNodeOnly, selectedNodeId])

    const visibleBounds = useMemo(() => {
        const zoom = Math.max(0.0001, viewport.zoom)
        const overscan = Math.min(
            CANVAS_NODE_OVERSCAN_MAX_PX,
            Math.max(CANVAS_NODE_OVERSCAN_PX, 560 / Math.max(0.2, zoom)),
        )
        const worldLeft = -viewport.panX / zoom
        const worldTop = -viewport.panY / zoom
        const worldRight = worldLeft + canvasSize.w / zoom
        const worldBottom = worldTop + canvasSize.h / zoom
        return {
            left: worldLeft - overscan,
            top: worldTop - overscan,
            right: worldRight + overscan,
            bottom: worldBottom + overscan,
        }
    }, [viewport.panX, viewport.panY, viewport.zoom, canvasSize.w, canvasSize.h])

    const visibleNodes = useMemo(() => {
        if (!canvas) return []
        return canvas.nodes.filter(n => {
            if (!focusNodeIds.has(n.id)) return false
            const right = n.x + n.width
            const bottom = n.y + n.height
            return !(
                right < visibleBounds.left
                || n.x > visibleBounds.right
                || bottom < visibleBounds.top
                || n.y > visibleBounds.bottom
            )
        })
    }, [canvas, focusNodeIds, visibleBounds])

    const visibleNodeById = useMemo(() => {
        const map = new globalThis.Map<string, CanvasNode>()
        visibleNodes.forEach(node => map.set(node.id, node))
        return map
    }, [visibleNodes])

    const visibleConnections = useMemo(
        () => canvas?.connections.filter(cn => visibleNodeById.has(cn.fromId) && visibleNodeById.has(cn.toId)) ?? [],
        [canvas, visibleNodeById]
    )
    const reduceConnectionEffects =
        panning
        || wheelPanning
        || (canvas?.nodes.length ?? 0) > 70
        || viewport.zoom < 0.35
        || (canvas?.connections.length ?? 0) > 140
    const miniMapNodes = (canvas && canvas.nodes.length > 320) ? visibleNodes : (canvas?.nodes ?? [])

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
        const target = e.target as HTMLElement
        const isCanvasBackground =
            target === e.currentTarget
            || target.id === 'nexus-canvas-inner'
            || Boolean(target.closest('#nexus-canvas-inner'))
        if (e.button === 1 || (e.button === 0 && (spaceHeld || isCanvasBackground))) {
            e.preventDefault()
            setPanning(true)
            panStart.current = { x: e.clientX, y: e.clientY, panX: viewport.panX, panY: viewport.panY }
        }
        if (e.button === 0 && isCanvasBackground) {
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

    // Trackpad-friendly wheel: pan by default, zoom only with pinch.
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        const deltaScale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvasSize.h : 1
        const rawDx = e.deltaX * deltaScale
        const rawDy = e.deltaY * deltaScale
        const dx = Math.max(-180, Math.min(180, rawDx))
        const dy = Math.max(-180, Math.min(180, rawDy))
        if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) return

        const absRawDx = Math.abs(rawDx)
        const absRawDy = Math.abs(rawDy)
        const looksLikePinch =
            absRawDy > 0
            && absRawDy <= 7
            && absRawDx <= 7
            && absRawDy >= absRawDx * 0.75
        const isZoomGesture = e.ctrlKey || e.metaKey || e.altKey || looksLikePinch
        if (isZoomGesture) {
            const pinchDelta = Math.max(-120, Math.min(120, dy))
            const absPinch = Math.abs(pinchDelta)
            const sensitivity = absPinch <= 4 ? 0.03 : absPinch < 16 ? 0.016 : 0.0105
            const factor = Math.exp(-pinchDelta * sensitivity)
            applyZoomAtPoint(e.clientX, e.clientY, factor)
            setWheelPanning(false)
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
        }, 110)
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

    const exportCanvas = useCallback(
        () => exportCanvasFiles(canvas, viewport),
        [canvas, viewport]
    )

    const duplicateSelectedNode = useCallback(
        () => duplicateSelectedCanvasNode(selectedNodeId, setSelectedNodeId),
        [selectedNodeId]
    )

    const createProjectTemplate = useCallback(
        () => createCanvasProjectTemplate({ canvas, viewport, canvasSize, fitView, setSelectedNodeId }),
        [canvas, viewport, canvasSize, fitView]
    )

    const autoArrangeByStatus = useCallback(
        () => autoArrangeCanvasByStatus(fitView),
        [fitView]
    )

    const autoLinkWikiRefs = useCallback(
        () => autoLinkCanvasWikiRefs(),
        []
    )

    // Empty state
    if (canvases.length === 0) {
        return <CanvasEmptyState addCanvas={addCanvas} accent={t.accent} accent2={t.accent2} rgb={rgb} />
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
                    <CanvasToolBtn icon={FileText} tooltip="Canvases" onClick={() => setShowCanvasList(!showCanvasList)} accent={t.accent} rgb={rgb} active={showCanvasList} />

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
                                <CanvasToolBtn key={type} icon={WIcon} tooltip={label}
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
                            <CanvasToolBtn icon={Grid} tooltip="Grid-Modus" onClick={() => setGridMode(g => g === 'dots' ? 'lines' : g === 'lines' ? 'none' : 'dots')} accent={t.accent} rgb={rgb} active={gridMode !== 'none'} />
                            <CanvasToolBtn icon={MapIcon} tooltip="Minimap" onClick={() => setShowMiniMap(!showMiniMap)} accent={t.accent} rgb={rgb} active={showMiniMap} />
                            <CanvasToolBtn icon={CheckSquare} tooltip="Projekt Panel" onClick={() => setShowProjectPanel(s => !s)} accent={t.accent} rgb={rgb} active={showProjectPanel} />
                            <CanvasToolBtn icon={Link} tooltip="Auto Link [[Wiki]]" onClick={autoLinkWikiRefs} accent={t.accent} rgb={rgb} />
                            <CanvasToolBtn icon={Grid} tooltip="Arrange by Status" onClick={autoArrangeByStatus} accent={t.accent} rgb={rgb} />
                            <CanvasToolBtn icon={Plus} tooltip="Projekt Template" onClick={createProjectTemplate} accent={t.accent} rgb={rgb} />
                            <CanvasToolBtn icon={Copy} tooltip="Node duplizieren" onClick={duplicateSelectedNode} accent={t.accent} rgb={rgb} active={Boolean(selectedNodeId)} />
                            <CanvasToolBtn icon={AlignCenter} tooltip="Fit to View" onClick={fitView} accent={t.accent} rgb={rgb} />
                            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
                            <CanvasToolBtn icon={ZoomOut} tooltip="Rauszoomen" onClick={() => setZoomCentered(viewport.zoom - 0.15)} accent={t.accent} rgb={rgb} />
                            <span style={{ fontSize: 11, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', minWidth: 42, textAlign: 'center', opacity: 0.8 }}>
                                {Math.round(viewport.zoom * 100)}%
                            </span>
                            <CanvasToolBtn icon={ZoomIn} tooltip="Reinzoomen" onClick={() => setZoomCentered(viewport.zoom + 0.15)} accent={t.accent} rgb={rgb} />
                            <CanvasToolBtn icon={Maximize2} tooltip="Reset View" onClick={resetViewport} accent={t.accent} rgb={rgb} />
                            <CanvasToolBtn icon={FileDown} tooltip="Export (JSON + AI-Markdown)" onClick={exportCanvas} accent={t.accent} rgb={rgb} />
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
                                <button onClick={exportCanvas} style={{ width:'100%', marginBottom:14, padding:'12px', borderRadius:12, background:`rgba(${rgb},0.13)`, border:`1px solid rgba(${rgb},0.3)`, cursor:'pointer', color:t.accent, fontSize:14, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                                    <FileDown size={18}/> Export (JSON + AI-Markdown)
                                </button>
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
                                <div style={{ display:'flex', gap:10, marginTop:10 }}>
                                    <button onClick={duplicateSelectedNode} style={{ flex:1, padding:'12px', borderRadius:12, background:Boolean(selectedNodeId)?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.07)', border:`1px solid ${selectedNodeId?t.accent:'rgba(255,255,255,0.1)'}`, cursor:'pointer', color:selectedNodeId?t.accent:'inherit', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                        <Copy size={16}/> Duplicate
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
                        }}>Space + Drag (optional) · Hintergrund ziehen zum Pannen</div>
                    )}

                    <div ref={canvasRef}
                        className="w-full h-full relative nx-canvas-grid"
                        style={{
                            cursor: connectingFrom
                                ? 'crosshair'
                                : (panning || wheelPanning ? 'grabbing' : 'grab'),
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
                            touchAction: 'none',
                            overscrollBehavior: 'none',
                            contain: 'layout paint',
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
                            const target = e.target as HTMLElement
                            const isCanvasBackground =
                                target === e.currentTarget
                                || target.id === 'nexus-canvas-inner'
                                || Boolean(target.closest('#nexus-canvas-inner'))
                            if (!isCanvasBackground) return
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
                                <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: reduceConnectionEffects ? 'none' : 'auto', zIndex: 0 }}>
                                    {!reduceConnectionEffects && (
                                        <defs>
                                            <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                                                <feGaussianBlur stdDeviation="4" result="blur" />
                                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                            </filter>
                                        </defs>
                                    )}
                                    {visibleConnections.map(conn => (
                                        <CanvasConnectionLine key={conn.id} conn={conn} nodeById={visibleNodeById} zoom={viewport.zoom} onDelete={deleteConnection} reduceEffects={reduceConnectionEffects} />
                                    ))}
                                </svg>
                            )}

                            {/* Nodes */}
                            {visibleNodes.map(node => (
                                <CanvasNodeWidget key={node.id} node={node}
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
                    {showMiniMap && miniMapNodes.length > 0 && (
                        <CanvasMiniMap nodes={miniMapNodes} viewport={viewport} canvasW={canvasSize.w} canvasH={canvasSize.h} />
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
                        }}>{Math.round(viewport.zoom * 100)}% · Scroll = Pan · Pinch/Ctrl + Scroll = Zoom · Render {visibleNodes.length}/{canvas?.nodes.length ?? 0}</div>
                    )}
                </div>
            </div>
        </div>
    )
}
