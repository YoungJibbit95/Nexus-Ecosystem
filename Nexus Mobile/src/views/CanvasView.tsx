import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
    Plus, ZoomIn, ZoomOut, Maximize2, Trash2, Edit3, Link,
    FileText, CheckSquare, X, GripVertical,
    MoreHorizontal, Palette, Unlink, Grid, Map as MapIcon, RotateCcw, RotateCw,
    Copy, AlignCenter, FileDown, Wand2, Search, Compass, Network
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
    CANVAS_MAGIC_HUB_TEMPLATES,
    getCanvasMagicHubQuickAction,
    type CanvasMagicHubQuickActionId,
    type CanvasMagicTemplateId,
} from '@nexus/core/canvas/magicHubTemplates'
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
    createCanvasMagicHubTemplate,
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
import { useCanvasWheelGestures } from './canvas/useCanvasWheelGestures'

// ─── CONSTANTS ───

// ─── CONNECTION LINE ───

// ─── MAIN CANVAS VIEW ───

export function CanvasView() {
    type MobileCanvasSheet = 'none' | 'canvas-list' | 'add' | 'tools' | 'magic' | 'project'
    const t = useTheme()
    const rgb = hexToRgb(t.accent)
    const mob = useMobile()
    const compactEdge = Math.min(mob.screenW, mob.screenH)
    const isTinyMobile = mob.isMobile && compactEdge <= 430
    const isTightMobile = mob.isMobile && mob.screenH <= 900
    const isLandscapeMobile = mob.isMobile && mob.isLandscape
    const isCompactMobile = mob.isMobile && (isTinyMobile || isTightMobile || isLandscapeMobile)
    const { canvases, activeCanvasId, viewport, addCanvas, deleteCanvas, setActiveCanvas, renameCanvas, addNode, deleteConnection, setPan, setZoom, resetViewport, addConnection, getActiveCanvas } = useCanvas()

    const canvas = getActiveCanvas()
    const canvasRef = useRef<HTMLDivElement>(null)

    const [panning, setPanning] = useState(false)
    const [spaceHeld, setSpaceHeld] = useState(false)
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
    const [editCanvasName, setEditCanvasName] = useState(false)
    const [showCanvasSidebar, setShowCanvasSidebar] = useState(true)
    const [mobileSheet, setMobileSheet] = useState<MobileCanvasSheet>('none')
    const [gridMode, setGridMode] = useState<'dots' | 'lines' | 'none'>('dots')
    const [showMiniMap, setShowMiniMap] = useState(true)
    const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 })
    const [quickAddPos, setQuickAddPos] = useState<{ x: number, y: number } | null>(null)
    const [desktopMagicBuilderOpen, setDesktopMagicBuilderOpen] = useState(false)
    const [wheelPanning, setWheelPanning] = useState(false)

    // History (undo/redo)
    const [history, setHistory] = useState<any[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    // Mobile-specific state
    const [touchStartDist, setTouchStartDist] = useState<number | null>(null)
    const [touchStartZoom, setTouchStartZoom] = useState(1)
    const [desktopProjectPanelOpen, setDesktopProjectPanelOpen] = useState(false)
    const [pmStatusFilter, setPmStatusFilter] = useState<'all' | ProjectStatus>('all')
    const [focusNodeOnly, setFocusNodeOnly] = useState(false)
    const [projectSearchQuery, setProjectSearchQuery] = useState('')
    const [focusTrail, setFocusTrail] = useState<string[]>([])
    const [focusTrailIndex, setFocusTrailIndex] = useState(-1)

    const showCanvasList = mob.isMobile ? mobileSheet === 'canvas-list' : showCanvasSidebar
    const showMobileAddMenu = mob.isMobile && mobileSheet === 'add'
    const showMobileTools = mob.isMobile && mobileSheet === 'tools'
    const showMagicBuilder = mob.isMobile ? mobileSheet === 'magic' : desktopMagicBuilderOpen
    const showProjectPanel = mob.isMobile ? mobileSheet === 'project' : desktopProjectPanelOpen

    const setMagicBuilderVisible = useCallback((visible: boolean) => {
        if (mob.isMobile) {
            setMobileSheet(visible ? 'magic' : 'none')
            return
        }
        setDesktopMagicBuilderOpen(visible)
    }, [mob.isMobile])

    const closeMobileCanvasSheets = useCallback((
        except: MobileCanvasSheet = 'none',
    ) => {
        setMobileSheet(except)
    }, [])

    const toggleMobileCanvasSheet = useCallback((sheet: Exclude<MobileCanvasSheet, 'none'>) => {
        setMobileSheet((prev) => prev === sheet ? 'none' : sheet)
    }, [])

    const setProjectPanelVisible = useCallback((visible: boolean) => {
        if (mob.isMobile) {
            setMobileSheet(visible ? 'project' : 'none')
            return
        }
        setDesktopProjectPanelOpen(visible)
    }, [mob.isMobile])

    const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
    const touchModeRef = useRef<'none' | 'pan' | 'node' | 'pinch'>('none')

    const isNodeInteractiveTouchTarget = useCallback((target: EventTarget | null) => {
        if (!(target instanceof HTMLElement)) return false
        if (target.closest('.node-interactive, input, textarea, select, button, [contenteditable="true"]')) {
            return true
        }
        return Boolean(target.closest('.nx-canvas-node'))
    }, [])

    const { applyZoomAtPoint, handleWheel, setZoomCentered } = useCanvasWheelGestures({
        canvasRef,
        canvasHeight: canvasSize.h,
        setZoom,
        setWheelPanning,
    })

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

    const projectSearchNodes = useMemo(() => {
        if (!canvas) return []
        const query = projectSearchQuery.trim().toLowerCase()
        const scoreNode = (node: CanvasNode) => {
            if (!query) return 1
            const title = (node.title || '').toLowerCase()
            const content = String(node.content || '').toLowerCase()
            const type = node.type.toLowerCase()
            const tags = (node.pm?.tags || []).join(' ').toLowerCase()
            const status = (node.pm?.status || '').toLowerCase()
            const priority = (node.pm?.priority || '').toLowerCase()
            let score = 0
            if (title.includes(query)) score += 10
            if (title.startsWith(query)) score += 3
            if (type.includes(query)) score += 6
            if (tags.includes(query)) score += 5
            if (status.includes(query)) score += 4
            if (priority.includes(query)) score += 3
            if (content.includes(query)) score += 2
            return score
        }
        return canvas.nodes
            .map(node => ({ node, score: scoreNode(node) }))
            .filter(entry => entry.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, query ? 24 : 18)
            .map(entry => entry.node)
    }, [canvas, projectSearchQuery])

    const projectOutlineGroups = useMemo(() => {
        if (!canvas) return [] as Array<[string, CanvasNode[]]>
        const grouped = new Map<string, CanvasNode[]>()
        canvas.nodes.forEach((node) => {
            const key = node.type
            if (!grouped.has(key)) grouped.set(key, [])
            grouped.get(key)?.push(node)
        })
        return Array.from(grouped.entries()).sort((a, b) => b[1].length - a[1].length)
    }, [canvas])

    const selectedNodeRelations = useMemo(() => {
        if (!canvas || !selectedNodeId) {
            return {
                incoming: [] as CanvasNode[],
                outgoing: [] as CanvasNode[],
                local: [] as CanvasNode[],
            }
        }
        const nodeById = new globalThis.Map<string, CanvasNode>()
        canvas.nodes.forEach((node) => nodeById.set(node.id, node))
        const incomingIds = canvas.connections
            .filter((entry) => entry.toId === selectedNodeId)
            .map((entry) => entry.fromId)
        const outgoingIds = canvas.connections
            .filter((entry) => entry.fromId === selectedNodeId)
            .map((entry) => entry.toId)
        const toNodes = (ids: string[]) =>
            ids
                .map((id) => nodeById.get(id) ?? null)
                .filter((node): node is CanvasNode => Boolean(node))
        const incoming = toNodes(incomingIds)
        const outgoing = toNodes(outgoingIds)

        const localIds = new Set<string>([...incomingIds, ...outgoingIds])
        Array.from(localIds).forEach((nodeId) => {
            canvas.connections.forEach((entry) => {
                if (entry.fromId === nodeId && entry.toId !== selectedNodeId) localIds.add(entry.toId)
                if (entry.toId === nodeId && entry.fromId !== selectedNodeId) localIds.add(entry.fromId)
            })
        })
        const local = [...localIds]
            .map((id) => nodeById.get(id) ?? null)
            .filter((node): node is CanvasNode => Boolean(node))
            .slice(0, 10)

        return { incoming, outgoing, local }
    }, [canvas, selectedNodeId])

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
    const quickAddMenuMetrics = useMemo(() => {
        const width = mob.isMobile
            ? Math.max(220, Math.min(280, canvasSize.w - 16))
            : 292
        const maxHeight = mob.isMobile
            ? Math.max(240, Math.min(460, canvasSize.h - 24))
            : 580
        return { width, maxHeight }
    }, [canvasSize.h, canvasSize.w, mob.isMobile])
    const quickAddMenuPosition = useMemo(() => {
        if (!quickAddPos) return null
        const leftLimit = Math.max(8, canvasSize.w - quickAddMenuMetrics.width - 8)
        const topLimit = Math.max(8, canvasSize.h - quickAddMenuMetrics.maxHeight - 8)
        return {
            left: Math.min(Math.max(quickAddPos.x, 8), leftLimit),
            top: Math.min(Math.max(quickAddPos.y, 8), topLimit),
        }
    }, [canvasSize.h, canvasSize.w, quickAddMenuMetrics.maxHeight, quickAddMenuMetrics.width, quickAddPos])

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

    // Mobile should not boot with any sheet open by default.
    useEffect(() => {
        if (!mob.isMobile) return
        setMobileSheet('none')
    }, [mob.isMobile])

    useEffect(() => {
        setFocusTrail([])
        setFocusTrailIndex(-1)
        setProjectSearchQuery('')
    }, [activeCanvasId])

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
        const isInsideNode = Boolean(target.closest('.nx-canvas-node'))
        const isCanvasBackground =
            !isInsideNode
            && (
                target === e.currentTarget
                || target.id === 'nexus-canvas-inner'
                || Boolean(target.closest('#nexus-canvas-inner'))
            )
        const canStartPan =
            e.button === 1
            || (e.button === 0 && ((spaceHeld && !isInsideNode) || isCanvasBackground))
        if (canStartPan) {
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

    const commitFocusTrail = useCallback((nodeId: string) => {
        setFocusTrail((prev) => {
            const capped = focusTrailIndex >= 0 ? prev.slice(0, focusTrailIndex + 1) : prev.slice()
            if (capped[capped.length - 1] === nodeId) return capped
            const next = [...capped, nodeId]
            if (next.length > 24) return next.slice(next.length - 24)
            return next
        })
        setFocusTrailIndex((prev) => {
            const next = prev >= 0 ? prev + 1 : 0
            return Math.min(23, next)
        })
    }, [focusTrailIndex])

    const jumpToNode = useCallback((nodeId: string, options?: { recordTrail?: boolean }) => {
        const active = useCanvas.getState().getActiveCanvas()
        const target = active?.nodes.find((node) => node.id === nodeId)
        if (!target) return
        setSelectedNodeId(nodeId)
        const nextPanX = canvasSize.w * 0.5 - (target.x + target.width * 0.5) * viewport.zoom
        const nextPanY = canvasSize.h * 0.42 - (target.y + target.height * 0.5) * viewport.zoom
        setPan(nextPanX, nextPanY)
        if (options?.recordTrail !== false) commitFocusTrail(nodeId)
    }, [canvasSize.h, canvasSize.w, commitFocusTrail, setPan, viewport.zoom])

    const navigateFocusTrail = useCallback((direction: -1 | 1) => {
        setFocusTrailIndex((currentIndex) => {
            const nextIndex = currentIndex + direction
            if (nextIndex < 0 || nextIndex >= focusTrail.length) return currentIndex
            const targetId = focusTrail[nextIndex]
            if (targetId) jumpToNode(targetId, { recordTrail: false })
            return nextIndex
        })
    }, [focusTrail, jumpToNode])

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

    const magicHubTemplates = useMemo(
      () => Object.entries(CANVAS_MAGIC_HUB_TEMPLATES).map(([id, meta]) => ({
        id: id as CanvasMagicTemplateId,
        ...meta,
      })),
      [],
    )

    const createMagicHubPreset = useCallback((template: CanvasMagicTemplateId) => {
      const meta = CANVAS_MAGIC_HUB_TEMPLATES[template]
      createCanvasMagicHubTemplate({
        payload: {
          template,
          title: meta.label,
          includeNotes: true,
          includeTasks: true,
          aiDepth: 'balanced',
        },
        viewport,
        canvasSize,
        fitView,
        setSelectedNodeId,
      })
      setMagicBuilderVisible(false)
      closeMobileCanvasSheets('none')
      setQuickAddPos(null)
    }, [canvasSize, closeMobileCanvasSheets, fitView, setMagicBuilderVisible, viewport])

    const handleHubQuickAction = useCallback((
      hubNode: CanvasNode,
      action: CanvasMagicHubQuickActionId,
    ) => {
      const state = useCanvas.getState()
      const target = getCanvasMagicHubQuickAction(action)
      if (!target) return
      const nextX = hubNode.x + hubNode.width + 88
      const nextY = hubNode.y + target.yOffset
      state.addNode(target.nodeType as NodeType, nextX, nextY)
      const activeCanvas = state.getActiveCanvas()
      const created = activeCanvas?.nodes[activeCanvas.nodes.length - 1]
      if (!created) return
      state.updateNode(created.id, {
        title: target.title,
        color: target.color,
        content: target.content,
        pm: {
          ...(created.pm || {}),
          status: target.status,
          priority: target.priority,
          progress: typeof target.progress === 'number' ? target.progress : 0,
        },
      })
      state.addConnection(hubNode.id, created.id)
      setSelectedNodeId(created.id)
    }, [])

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
        <div className="nx-mobile-view-screen nx-mobile-canvas-root" style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden' }}>
            {/* ── Sidebar — desktop panel, mobile bottom sheet ── */}
            {showCanvasSidebar && !mob.isMobile && (
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
                                color: t.accent,
                            }}><Plus size={13} /></button>
                        </div>

                        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {canvases.map(c => (
                                <div key={c.id} onClick={() => setActiveCanvas(c.id)} className="nx-surface-row" data-active={c.id === activeCanvasId ? 'true' : 'false'} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '7px 9px', borderRadius: 8, cursor: 'pointer',
                                    background: c.id === activeCanvasId ? `rgba(${rgb}, 0.15)` : 'transparent',
                                    borderLeft: c.id === activeCanvasId ? `2px solid ${t.accent}` : '2px solid transparent',
                                    ['--nx-row-hover-bg' as any]: 'rgba(255,255,255,0.05)',
                                }}
                                >
                                    <span style={{ flex: 1, fontSize: 12, fontWeight: c.id === activeCanvasId ? 600 : 400, color: c.id === activeCanvasId ? t.accent : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.name}
                                    </span>
                                    <span style={{ fontSize: 10, opacity: 0.35, background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>{c.nodes.length}</span>
                                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${c.name}"?`)) deleteCanvas(c.id) }}
                                        className="nx-interactive nx-bounce-target nx-icon-fade"
                                        style={{ background: 'none', border: 'none', color: '#FF3B30', ['--nx-idle-opacity' as any]: 0.28, padding: 2 }}
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
                            onClick={() => closeMobileCanvasSheets('none')}
                            style={{ position:'fixed', inset:0, zIndex:220, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)' }}/>
                        <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                            transition={{type:'spring',stiffness:380,damping:30}}
                            style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:221,
                                background: t.mode==='dark'?'rgba(14,14,26,0.97)':'rgba(248,248,255,0.97)',
                                backdropFilter:'blur(24px)', borderRadius:'20px 20px 0 0',
                                border:'1px solid rgba(255,255,255,0.1)', borderBottom:'none',
                                padding:isCompactMobile ? '8px 12px 24px' : '8px 16px 40px', maxHeight:isCompactMobile ? '80vh' : '74vh', display:'flex', flexDirection:'column' }}>
                            <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)', margin:isCompactMobile ? '0 auto 10px' : '0 auto 16px' }}/>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:isCompactMobile ? 10 : 14 }}>
                                <span style={{ fontSize:isCompactMobile ? 13 : 14, fontWeight:800 }}>Canvases</span>
                                <button onClick={() => { addCanvas(); closeMobileCanvasSheets('none') }} style={{ display:'flex', alignItems:'center', gap:6, padding:isCompactMobile ? '6px 11px' : '8px 16px', borderRadius:10, background:`rgba(${rgb},0.18)`, border:'none', cursor:'pointer', color:t.accent, fontSize:isCompactMobile ? 12 : 13, fontWeight:700 }}>
                                    <Plus size={16}/> New
                                </button>
                            </div>
                            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:isCompactMobile ? 5 : 6 }}>
                                {canvases.map(c => (
                                    <div
                                        key={c.id}
                                        style={{ display:'flex', alignItems:'stretch', gap:8 }}
                                    >
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => { setActiveCanvas(c.id); closeMobileCanvasSheets('none') }}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault()
                                                    setActiveCanvas(c.id)
                                                    closeMobileCanvasSheets('none')
                                                }
                                            }}
                                            style={{ flex:1, display:'flex', alignItems:'center', gap:12, padding:isCompactMobile ? '10px 12px' : '14px 16px', borderRadius:14, cursor:'pointer',
                                                background: c.id===activeCanvasId?`rgba(${rgb},0.18)`:'rgba(255,255,255,0.05)',
                                                border:`1px solid ${c.id===activeCanvasId?t.accent:'rgba(255,255,255,0.08)'}`,
                                                color: c.id===activeCanvasId?t.accent:'inherit', textAlign:'left' }}>
                                            <div style={{ flex:1 }}>
                                                <div style={{ fontSize:isCompactMobile ? 13 : 14, fontWeight:c.id===activeCanvasId?700:500 }}>{c.name}</div>
                                                <div style={{ fontSize:isCompactMobile ? 10 : 11, opacity:0.45, marginTop:2 }}>{c.nodes.length} nodes · {c.connections.length} links</div>
                                            </div>
                                        </div>
                                        <button onClick={e=>{ e.stopPropagation(); if(confirm(`Delete "${c.name}"?`)) deleteCanvas(c.id) }}
                                            style={{ background:'rgba(255,59,48,0.12)', border:'1px solid rgba(255,59,48,0.36)', cursor:'pointer', color:'#FF3B30', padding:'0 12px', borderRadius:10, fontWeight:700 }}>
                                            <X size={16}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Main Canvas ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', isolation: 'isolate' }}>
                {/* ── Top Bar ── */}
                <div style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: mob.isMobile ? (isCompactMobile ? 6 : 8) : 4,
                    padding: mob.isMobile ? (isCompactMobile ? '4px 7px' : '6px 10px') : '5px 8px',
                    borderBottom: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    background: t.mode === 'dark' ? 'rgba(10,10,20,0.85)' : 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(16px)',
                    position: 'relative',
                    zIndex: 160,
                }}>
                    {/* Sidebar toggle — on mobile shows canvas list as bottom sheet */}
                    <CanvasToolBtn
                        icon={FileText}
                        tooltip="Canvases"
                        onClick={() => {
                            if (mob.isMobile) {
                                toggleMobileCanvasSheet('canvas-list')
                                return
                            }
                            setShowCanvasSidebar((prev) => !prev)
                        }}
                        accent={t.accent}
                        rgb={rgb}
                        active={showCanvasList}
                    />

                    {/* Canvas name */}
                    {canvas && (
                        editCanvasName
                            ? <input autoFocus value={canvas.name} onChange={(e) => renameCanvas(canvas.id, e.target.value)}
                                onBlur={() => setEditCanvasName(false)} onKeyDown={(e) => e.key === 'Enter' && setEditCanvasName(false)}
                                style={{ background: 'transparent', border: 'none', outline: 'none', color: t.accent, fontWeight: 600, fontSize: isCompactMobile ? 12 : 13, width: isCompactMobile ? 118 : 130, padding: '1px 4px' }} />
                            : <span onDoubleClick={() => setEditCanvasName(true)} onTouchEnd={() => setEditCanvasName(true)}
                                style={{ fontWeight: 700, fontSize: isCompactMobile ? 12 : 14, color: t.accent, padding: '1px 6px', cursor: 'pointer', borderRadius: 4, maxWidth: mob.isMobile ? (isCompactMobile ? 104 : 120) : 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {canvas.name}
                            </span>
                    )}

                    <div style={{ flex: 1 }} />

                    {mob.isMobile ? (
                        /* Mobile: "+ Add" button opens bottom sheet, tools button */
                        <>
                            <button onClick={() => {
                                toggleMobileCanvasSheet('add')
                            }} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: isCompactMobile ? '5px 9px' : '8px 12px', borderRadius: 11,
                                background: showMobileAddMenu ? t.accent : `rgba(${rgb},0.18)`,
                                border: 'none', cursor: 'pointer',
                                color: showMobileAddMenu ? '#fff' : t.accent,
                                fontSize: isCompactMobile ? 10.5 : 12.5, fontWeight: 700, flexShrink: 0,
                            }}>
                                <Plus size={isCompactMobile ? 13 : 16} /> Add
                            </button>
                            <button onClick={() => {
                                toggleMobileCanvasSheet('tools')
                            }} style={{
                                width: isCompactMobile ? 32 : 38, height: isCompactMobile ? 32 : 38, borderRadius: isCompactMobile ? 9 : 11, border: 'none',
                                background: showMobileTools ? `rgba(${rgb},0.2)` : 'rgba(255,255,255,0.08)',
                                cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Maximize2 size={isCompactMobile ? 14 : 17} style={{ opacity: 0.7 }}/>
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
                            <CanvasToolBtn icon={CheckSquare} tooltip="Projekt Panel" onClick={() => setProjectPanelVisible(!showProjectPanel)} accent={t.accent} rgb={rgb} active={showProjectPanel} />
                            <CanvasToolBtn icon={Wand2} tooltip="Magic Hub Templates" onClick={() => setDesktopMagicBuilderOpen((s) => !s)} accent={t.accent} rgb={rgb} active={showMagicBuilder} />
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
                                onClick={() => closeMobileCanvasSheets('none')}
                                style={{ position:'absolute', inset:0, zIndex:220, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)' }}/>
                            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                                transition={{type:'spring',stiffness:380,damping:30}}
                                style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:221,
                                    background: t.mode==='dark'?'rgba(14,14,26,0.97)':'rgba(248,248,255,0.97)',
                                    backdropFilter:'blur(24px)', borderRadius:'20px 20px 0 0',
                                    border:'1px solid rgba(255,255,255,0.1)', borderBottom:'none', padding:isCompactMobile ? '8px 12px 20px' : '8px 16px 32px',
                                    maxHeight:isCompactMobile ? 'calc(100% - 48px)' : 'calc(100% - 68px)', overflowY:'auto' }}>
                                <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)', margin:isCompactMobile ? '0 auto 10px' : '0 auto 16px' }}/>
                                <div style={{ fontSize:11, fontWeight:800, opacity:0.4, textTransform:'uppercase', letterSpacing:1, marginBottom:isCompactMobile ? 10 : 14 }}>Add Element</div>
                                <button
                                  onClick={() => {
                                    closeMobileCanvasSheets('none')
                                    setMagicBuilderVisible(true)
                                  }}
                                  style={{
                                    width: '100%',
                                    marginBottom: 12,
                                    padding: isCompactMobile ? '9px 10px' : '11px 12px',
                                    borderRadius: 12,
                                    border: `1px solid rgba(${rgb},0.35)`,
                                    background: `linear-gradient(135deg, rgba(${rgb},0.2), rgba(${rgb},0.08))`,
                                    color: t.accent,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    fontSize: isCompactMobile ? 12 : 13,
                                    fontWeight: 800,
                                  }}
                                >
                                  <Wand2 size={16} />
                                  Magic Hub Templates
                                </button>
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:isCompactMobile ? 8 : 10 }}>
                                    {WIDGET_TYPES.map(({ type, icon: WIcon, label, description, category, accent: widgetAccent }) => (
                                        <button key={type}
                                            onClick={() => {
                                                if (type === 'sticky') {
                                                    addNode('text')
                                                    setTimeout(() => {
                                                        const state = useCanvas.getState(); const c = state.getActiveCanvas()
                                                        if (c) { const last = c.nodes[c.nodes.length-1]; if (last) state.updateNode(last.id, { color:'#FFCC00', title:'Sticky Note' }) }
                                                    }, 50)
                                                } else { addNode(type as NodeType) }
                                                closeMobileCanvasSheets('none')
                                            }}
                                            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:isCompactMobile ? '9px 6px' : '12px 8px', borderRadius:14,
                                                background:`${widgetAccent}1a`, border:`1px solid ${widgetAccent}4d`, cursor:'pointer', color:widgetAccent, textAlign:'center' }}>
                                            <WIcon size={isCompactMobile ? 18 : 20}/>
                                            <span style={{ fontSize:isCompactMobile ? 9 : 10, fontWeight:700, lineHeight:1.1 }}>{label}</span>
                                            <span style={{ fontSize:8, fontWeight:700, padding:'2px 6px', borderRadius:999, border:`1px solid ${widgetAccent}55`, background:`${widgetAccent}22`, textTransform:'uppercase', letterSpacing:0.35 }}>
                                                {category}
                                            </span>
                                            <span style={{ fontSize:isCompactMobile ? 8 : 9, opacity:0.75, lineHeight:1.2, minHeight:isCompactMobile ? 16 : 22 }}>
                                                {description}
                                            </span>
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
                                onClick={() => closeMobileCanvasSheets('none')}
                                style={{ position:'absolute', inset:0, zIndex:220, background:'rgba(0,0,0,0.3)', backdropFilter:'blur(4px)' }}/>
                            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                                transition={{type:'spring',stiffness:380,damping:30}}
                                style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:221,
                                    background: t.mode==='dark'?'rgba(14,14,26,0.97)':'rgba(248,248,255,0.97)',
                                    backdropFilter:'blur(24px)', borderRadius:'20px 20px 0 0',
                                    border:'1px solid rgba(255,255,255,0.1)', borderBottom:'none', padding:isCompactMobile ? '8px 12px 20px' : '8px 16px 32px',
                                    maxHeight:isCompactMobile ? 'calc(100% - 48px)' : 'calc(100% - 68px)', overflowY:'auto' }}>
                                <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)', margin:isCompactMobile ? '0 auto 10px' : '0 auto 16px' }}/>
                                <div style={{ fontSize:11, fontWeight:800, opacity:0.4, textTransform:'uppercase', letterSpacing:1, marginBottom:isCompactMobile ? 10 : 14 }}>View Controls</div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:isCompactMobile ? 8 : 10, marginBottom:14 }}>
                                    {/* Zoom controls */}
                                    <button onClick={() => setZoomCentered(viewport.zoom - 0.25)} style={{ padding:isCompactMobile ? '10px' : '14px', borderRadius:14, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', color:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:isCompactMobile ? 13 : 15, fontWeight:700 }}>
                                        <ZoomOut size={20}/> Zoom Out
                                    </button>
                                    <button onClick={() => setZoomCentered(viewport.zoom + 0.25)} style={{ padding:isCompactMobile ? '10px' : '14px', borderRadius:14, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', color:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:isCompactMobile ? 13 : 15, fontWeight:700 }}>
                                        <ZoomIn size={20}/> Zoom In
                                    </button>
                                    <button onClick={fitView} style={{ padding:isCompactMobile ? '10px' : '14px', borderRadius:14, background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.25)`, cursor:'pointer', color:t.accent, display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:isCompactMobile ? 12 : 14, fontWeight:700 }}>
                                        <AlignCenter size={20}/> Fit View
                                    </button>
                                    <button onClick={resetViewport} style={{ padding:isCompactMobile ? '10px' : '14px', borderRadius:14, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', color:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:isCompactMobile ? 12 : 14, fontWeight:700 }}>
                                        <Maximize2 size={20}/> Reset
                                    </button>
                                </div>
                                <button onClick={exportCanvas} style={{ width:'100%', marginBottom:14, padding:isCompactMobile ? '10px' : '12px', borderRadius:12, background:`rgba(${rgb},0.13)`, border:`1px solid rgba(${rgb},0.3)`, cursor:'pointer', color:t.accent, fontSize:isCompactMobile ? 12 : 14, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
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
                                    <button onClick={() => setProjectPanelVisible(!showProjectPanel)} style={{ flex:1, padding:'12px', borderRadius:12, background:showProjectPanel?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.07)', border:`1px solid ${showProjectPanel?t.accent:'rgba(255,255,255,0.1)'}`, cursor:'pointer', color:showProjectPanel?t.accent:'inherit', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                        <CheckSquare size={16}/> Project
                                    </button>
                                    <button onClick={autoLinkWikiRefs} style={{ flex:1, padding:'12px', borderRadius:12, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', color:'inherit', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                        <Link size={16}/> Auto Link
                                    </button>
                                </div>
                                <div style={{ display:'flex', gap:10, marginTop:10 }}>
                                    <button onClick={() => {
                                        setMagicBuilderVisible(true)
                                    }} style={{ flex:1, padding:'12px', borderRadius:12, background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.25)`, cursor:'pointer', color:t.accent, fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                        <Wand2 size={16}/> Magic Hub
                                    </button>
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

                <AnimatePresence>
                    {showMagicBuilder && (
                        <>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => setMagicBuilderVisible(false)}
                              style={{ position: 'absolute', inset: 0, zIndex: 222, background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)' }}
                            />
                            <motion.div
                              initial={{ y: '100%' }}
                              animate={{ y: 0 }}
                              exit={{ y: '100%' }}
                              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 223,
                                borderRadius: '20px 20px 0 0',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderBottom: 'none',
                                padding: '10px 14px 30px',
                                background: t.mode === 'dark' ? 'rgba(10,10,20,0.97)' : 'rgba(248,248,255,0.97)',
                                backdropFilter: 'blur(20px)',
                                maxHeight: isCompactMobile ? '82%' : '78%',
                                overflowY: 'auto',
                              }}
                            >
                                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 14px' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <Wand2 size={16} style={{ color: t.accent }} />
                                    <div style={{ fontSize: 13, fontWeight: 800 }}>Magic Hub Templates</div>
                                    <button
                                      onClick={() => setMagicBuilderVisible(false)}
                                      style={{ marginLeft: 'auto', border: 'none', background: 'rgba(255,255,255,0.08)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      <X size={14} />
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: mob.isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                                    {magicHubTemplates.map((template) => (
                                        <button
                                          key={template.id}
                                          onClick={() => createMagicHubPreset(template.id)}
                                          style={{
                                            border: `1px solid ${template.color}55`,
                                            background: `${template.color}1a`,
                                            borderRadius: 12,
                                            padding: '10px 11px',
                                            textAlign: 'left',
                                            color: 'inherit',
                                            cursor: 'pointer',
                                          }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <span style={{ width: 10, height: 10, borderRadius: 999, background: template.color, boxShadow: `0 0 12px ${template.color}` }} />
                                                <span style={{ fontSize: 12, fontWeight: 800, color: template.color }}>{template.label}</span>
                                            </div>
                                            <div style={{ fontSize: 11, opacity: 0.72, lineHeight: 1.35 }}>{template.summary}</div>
                                        </button>
                                    ))}
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
                            touchAction: 'pan-x pan-y pinch-zoom',
                            overscrollBehavior: 'none',
                            contain: 'layout paint',
                        }}
                        onMouseDown={handleCanvasMouseDown}
                        onWheel={handleWheel}
                        onTouchStart={(e) => {
                            if (e.touches.length === 2) {
                                touchModeRef.current = 'pinch'
                                const dx = e.touches[0].clientX - e.touches[1].clientX
                                const dy = e.touches[0].clientY - e.touches[1].clientY
                                setTouchStartDist(Math.sqrt(dx*dx + dy*dy))
                                setTouchStartZoom(viewport.zoom)
                            } else if (e.touches.length === 1) {
                                const target = e.target as HTMLElement | null
                                if (isNodeInteractiveTouchTarget(target)) {
                                    touchModeRef.current = 'node'
                                    setPanning(false)
                                    return
                                }
                                touchModeRef.current = 'pan'
                                setPanning(true)
                                panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: viewport.panX, panY: viewport.panY }
                            }
                        }}
                        onTouchMove={(e) => {
                            if (touchModeRef.current === 'pinch' && e.touches.length === 2 && touchStartDist !== null) {
                                e.preventDefault()
                                const dx = e.touches[0].clientX - e.touches[1].clientX
                                const dy = e.touches[0].clientY - e.touches[1].clientY
                                const dist = Math.sqrt(dx*dx + dy*dy)
                                const scale = dist / touchStartDist
                                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
                                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
                                const vp = useCanvas.getState().viewport
                                const nextZoom = Math.max(0.15, Math.min(3, touchStartZoom * scale))
                                applyZoomAtPoint(centerX, centerY, nextZoom / Math.max(0.0001, vp.zoom))
                                return
                            }
                            if (touchModeRef.current === 'pan' && e.touches.length === 1 && panning) {
                                e.preventDefault()
                                const dx = e.touches[0].clientX - panStart.current.x
                                const dy = e.touches[0].clientY - panStart.current.y
                                setPan(panStart.current.panX + dx, panStart.current.panY + dy)
                            }
                        }}
                        onTouchEnd={(e) => {
                            if (e.touches.length === 0) {
                                touchModeRef.current = 'none'
                                setPanning(false)
                                setTouchStartDist(null)
                                return
                            }
                            if (e.touches.length === 1 && touchModeRef.current === 'pinch') {
                                touchModeRef.current = 'none'
                                setPanning(false)
                                setTouchStartDist(null)
                            }
                        }}
                        onTouchCancel={() => {
                            touchModeRef.current = 'none'
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
                                    onHubQuickAction={handleHubQuickAction}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Quick Add Context Menu */}
                    {quickAddPos && quickAddMenuPosition && (
                        <div style={{
                            position: 'absolute', top: quickAddMenuPosition.top, left: quickAddMenuPosition.left,
                            zIndex: 300, background: t.mode === 'dark' ? '#1a1a2e' : '#fff',
                            border: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                            borderRadius: 12, padding: 6, width: quickAddMenuMetrics.width, maxHeight: quickAddMenuMetrics.maxHeight, overflowY: 'auto',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            animation: 'nexus-scale-in 0.15s cubic-bezier(0.4,0,0.2,1) both',
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, padding: '4px 8px', textTransform: 'uppercase' }}>Add Element</div>
                            {WIDGET_TYPES.map(({ type, icon: WIcon, label, description, category, accent: widgetAccent }) => (
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
                                }} className="nx-surface-row" data-active="false" style={{
                                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                                    padding: '8px 10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12,
                                    background: 'transparent', color: t.mode === 'dark' ? '#fff' : '#000', textAlign: 'left',
                                    ['--nx-row-hover-bg' as any]: 'rgba(128,128,128,0.1)',
                                }}>
                                    <span style={{
                                        width: 24, height: 24, borderRadius: 8,
                                        background: `${widgetAccent}22`,
                                        color: widgetAccent,
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <WIcon size={14} />
                                    </span>
                                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
                                        <span style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{label}</span>
                                        <span style={{ fontSize: 10, opacity: 0.64, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {description}
                                        </span>
                                    </span>
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                                        border: `1px solid ${widgetAccent}55`, color: widgetAccent, background: `${widgetAccent}1a`,
                                        textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0,
                                    }}>
                                        {category}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Mini-map */}
                    {showMiniMap && miniMapNodes.length > 0 && (
                        <CanvasMiniMap nodes={miniMapNodes} viewport={viewport} canvasW={canvasSize.w} canvasH={canvasSize.h} />
                    )}

                    {/* Project Panel */}
                    {mob.isMobile && showProjectPanel ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 1 }}
                            onClick={() => setProjectPanelVisible(false)}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 223,
                                background: 'rgba(0,0,0,0.35)',
                                backdropFilter: 'blur(4px)',
                            }}
                        />
                    ) : null}
                    {showProjectPanel && canvas && (
                        <div style={{
                            position: 'absolute',
                            top: mob.isMobile ? 'auto' : 14,
                            right: mob.isMobile ? 0 : 14,
                            left: mob.isMobile ? 0 : 'auto',
                            bottom: mob.isMobile ? 0 : 'auto',
                            zIndex: 224,
                            width: mob.isMobile ? '100%' : 320,
                            maxHeight: mob.isMobile ? (isCompactMobile ? '74%' : '70%') : '78%',
                            overflow: 'auto',
                            borderRadius: mob.isMobile ? '18px 18px 0 0' : 14,
                            padding: mob.isMobile ? (isCompactMobile ? '10px 10px calc(16px + var(--sat-bottom, 0px))' : '12px 12px calc(18px + var(--sat-bottom, 0px))') : 12,
                            background: t.mode === 'dark' ? 'rgba(12,12,22,0.85)' : 'rgba(255,255,255,0.9)',
                            backdropFilter: 'blur(18px)',
                            border: '1px solid rgba(255,255,255,0.14)',
                            boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <CheckSquare size={14} style={{ color: t.accent }} />
                                <div style={{ fontSize: 12, fontWeight: 800 }}>Project Canvas</div>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                    <button onClick={() => navigateFocusTrail(-1)} disabled={focusTrailIndex <= 0} style={{ padding: '4px 7px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', fontSize: 10, cursor: focusTrailIndex > 0 ? 'pointer' : 'not-allowed', color: 'inherit', opacity: focusTrailIndex > 0 ? 1 : 0.45 }}>←</button>
                                    <button onClick={() => navigateFocusTrail(1)} disabled={focusTrailIndex >= focusTrail.length - 1} style={{ padding: '4px 7px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', fontSize: 10, cursor: focusTrailIndex < focusTrail.length - 1 ? 'pointer' : 'not-allowed', color: 'inherit', opacity: focusTrailIndex < focusTrail.length - 1 ? 1 : 0.45 }}>→</button>
                                    <button onClick={() => setFocusNodeOnly(s => !s)} style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid ${focusNodeOnly ? t.accent : 'rgba(255,255,255,0.14)'}`, background: focusNodeOnly ? `rgba(${rgb},0.16)` : 'rgba(255,255,255,0.06)', color: focusNodeOnly ? t.accent : 'inherit', fontSize: 10, cursor: 'pointer' }}>Focus</button>
                                    <button onClick={() => setProjectPanelVisible(false)} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', fontSize: 10, cursor: 'pointer', color: 'inherit' }}>Close</button>
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

                            <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 10, marginBottom: 10, background: 'rgba(255,255,255,0.04)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                                    <Search size={12} style={{ opacity: 0.7 }} />
                                    <div style={{ fontSize: 11, fontWeight: 700 }}>Find / Jump to Node</div>
                                </div>
                                <input
                                    value={projectSearchQuery}
                                    onChange={(event) => setProjectSearchQuery(event.target.value)}
                                    placeholder="Titel, Typ, Tag oder Inhalt…"
                                    style={{ width: '100%', fontSize: 11, padding: '7px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'inherit', marginBottom: 8 }}
                                />
                                <div style={{ maxHeight: 150, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {projectSearchNodes.length === 0 ? (
                                        <div style={{ fontSize: 11, opacity: 0.55 }}>Keine Treffer.</div>
                                    ) : (
                                        projectSearchNodes.map((node) => (
                                            <button
                                                key={`search-${node.id}`}
                                                onClick={() => jumpToNode(node.id)}
                                                style={{ textAlign: 'left', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: 'inherit', cursor: 'pointer', padding: '5px 7px' }}
                                            >
                                                <div style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title || 'Untitled'}</div>
                                                <div style={{ fontSize: 10, opacity: 0.58 }}>{node.type}{node.pm?.status ? ` · ${node.pm.status}` : ''}{node.pm?.priority ? ` · ${node.pm.priority}` : ''}</div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 10, marginBottom: 10, background: 'rgba(255,255,255,0.04)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                                    <Compass size={12} style={{ opacity: 0.7 }} />
                                    <div style={{ fontSize: 11, fontWeight: 700 }}>Outline / Navigator</div>
                                </div>
                                <div style={{ maxHeight: 146, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {projectOutlineGroups.map(([type, nodes]) => (
                                        <details key={type} open={nodes.length <= 4}>
                                            <summary style={{ fontSize: 10, fontWeight: 700, opacity: 0.78, cursor: 'pointer' }}>{type} · {nodes.length}</summary>
                                            <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {nodes.slice(0, 9).map((node) => (
                                                    <button
                                                        key={`outline-${node.id}`}
                                                        onClick={() => jumpToNode(node.id)}
                                                        style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 10, textAlign: 'left', padding: '4px 7px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                        title={node.title}
                                                    >
                                                        {node.title || 'Untitled'}
                                                    </button>
                                                ))}
                                            </div>
                                        </details>
                                    ))}
                                </div>
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

                            <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 10, marginBottom: 10, background: 'rgba(255,255,255,0.04)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                                    <Network size={12} style={{ opacity: 0.7 }} />
                                    <div style={{ fontSize: 11, fontWeight: 700 }}>Backlinks / Local Graph</div>
                                </div>
                                {!selectedNode ? (
                                    <div style={{ fontSize: 11, opacity: 0.55 }}>Node auswählen, um Link-Kontext anzuzeigen.</div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                                        {[
                                            { title: 'Incoming Links', nodes: selectedNodeRelations.incoming },
                                            { title: 'Outgoing Links', nodes: selectedNodeRelations.outgoing },
                                            { title: 'Local Graph Neighbors', nodes: selectedNodeRelations.local },
                                        ].map((section) => (
                                            <div key={section.title}>
                                                <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.62, marginBottom: 5 }}>{section.title}</div>
                                                {section.nodes.length === 0 ? (
                                                    <div style={{ fontSize: 10, opacity: 0.5 }}>Keine Einträge.</div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        {section.nodes.slice(0, 6).map((node) => (
                                                            <button
                                                                key={`${section.title}-${node.id}`}
                                                                onClick={() => jumpToNode(node.id)}
                                                                style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 10, textAlign: 'left', padding: '4px 7px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                                title={node.title}
                                                            >
                                                                {node.title || 'Untitled'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.55, marginBottom: 6 }}>Timeline</div>
                            {timelineNodes.length === 0 ? (
                                <div style={{ fontSize: 11, opacity: 0.5 }}>Keine Datums-Items im aktuellen Filter.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {timelineNodes.map(n => (
                                        <button key={n.id} onClick={() => jumpToNode(n.id)} style={{ textAlign: 'left', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 9, background: 'rgba(255,255,255,0.05)', cursor: 'pointer', padding: '7px 8px', color: 'inherit' }}>
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
