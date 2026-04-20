import React, { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Download,
  Grid3x3,
  Layers,
  List,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { ViewHeader } from '../components/ViewHeader'
import { useApp } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { useWorkspaces, Workspace } from '../store/workspaceStore'
import { useCanvas } from '../store/canvasStore'
import { useWorkspaceHandoff } from '../store/workspaceHandoffStore'
import { hexToRgb } from '../lib/utils'
import { useMobile } from '../lib/useMobile'
import { AnimatePresence } from 'framer-motion'
import { Glass } from '../components/Glass'
import { InteractiveActionButton } from '../components/render/InteractiveActionButton'
import {
  AssignModal,
  FileCard,
  WorkspaceModal,
} from './files/MobileFilesUiParts'
import {
  parseRuntimeSnapshot,
  type FileItem,
  type ItemType,
  type SmartViewMode,
  type ViewMode,
  type WorkspaceRuntimeSnapshot,
} from './files/mobileFilesTypes'

type SnapshotSection = 'notes' | 'codes' | 'tasks' | 'reminders' | 'canvases' | 'workspaces'
type ReviewRisk = 'low' | 'medium' | 'high'

const SNAPSHOT_SECTIONS: SnapshotSection[] = ['notes', 'codes', 'tasks', 'reminders', 'canvases', 'workspaces']

const getArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])
const getStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
const normalizeWorkspaceEntry = (workspace: any): Workspace | null => {
  if (!workspace || typeof workspace !== 'object' || typeof workspace.id !== 'string') return null
  const now = new Date().toISOString()
  return {
    id: workspace.id,
    name: typeof workspace.name === 'string' && workspace.name ? workspace.name : 'Workspace',
    icon: typeof workspace.icon === 'string' && workspace.icon ? workspace.icon : '🗂️',
    color: typeof workspace.color === 'string' && workspace.color ? workspace.color : '#007AFF',
    description: typeof workspace.description === 'string' ? workspace.description : undefined,
    created: typeof workspace.created === 'string' && workspace.created ? workspace.created : now,
    lastAccessed: typeof workspace.lastAccessed === 'string' && workspace.lastAccessed ? workspace.lastAccessed : now,
    noteIds: getStringArray(workspace.noteIds),
    codeIds: getStringArray(workspace.codeIds),
    taskIds: getStringArray(workspace.taskIds),
    reminderIds: getStringArray(workspace.reminderIds),
    canvasIds: getStringArray(workspace.canvasIds),
  }
}

const mergeById = <T extends { id: string }>(current: T[], incoming: T[]) => {
  const map = new Map<string, T>()
  current.forEach((entry) => map.set(entry.id, entry))
  incoming.forEach((entry) => map.set(entry.id, entry))
  return Array.from(map.values())
}

const getSnapshotCounts = (snapshot: WorkspaceRuntimeSnapshot) => {
  const state = snapshot.state || ({} as any)
  return {
    notes: getArray<any>(state.notes).length,
    codes: getArray<any>(state.codes).length,
    tasks: getArray<any>(state.tasks).length,
    reminders: getArray<any>(state.reminders).length,
    canvases: getArray<any>(state.canvases).length,
    workspaces: getArray<any>(state.workspaces).length,
  }
}

const getSnapshotAgeMinutes = (exportedAt?: string | null) => {
  if (!exportedAt) return null
  const ts = new Date(exportedAt).getTime()
  if (Number.isNaN(ts)) return null
  return Math.max(0, Math.round((Date.now() - ts) / 60000))
}

const formatSnapshotAge = (minutes: number | null) => {
  if (minutes == null) return 'unbekannt'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h`
  return `${Math.round(hours / 24)} d`
}

const getRiskLevel = (snapshot: WorkspaceRuntimeSnapshot, ageMinutes: number | null): ReviewRisk => {
  const counts = getSnapshotCounts(snapshot)
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  if (total === 0) return 'high'
  if (ageMinutes != null && ageMinutes > 7 * 24 * 60) return 'high'
  if (ageMinutes != null && ageMinutes > 24 * 60) return 'medium'
  return 'low'
}

const riskMeta: Record<ReviewRisk, { label: string; color: string; bg: string; border: string }> = {
  low: {
    label: 'Low risk',
    color: '#30d158',
    bg: 'rgba(48,209,88,0.12)',
    border: '1px solid rgba(48,209,88,0.3)',
  },
  medium: {
    label: 'Medium risk',
    color: '#ff9f0a',
    bg: 'rgba(255,159,10,0.12)',
    border: '1px solid rgba(255,159,10,0.3)',
  },
  high: {
    label: 'High risk',
    color: '#ff453a',
    bg: 'rgba(255,69,58,0.12)',
    border: '1px solid rgba(255,69,58,0.3)',
  },
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
type FilesViewProps = {
  setView?: (view: string) => void
}

export function FilesView({ setView }: FilesViewProps = {}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const { notes, codes, tasks, reminders, openNoteIds, activeNoteId, openCodeIds, activeCodeId, folders, openNote, setNote, openCode, setCode } = useApp()
  const { canvases, activeCanvasId, setActiveCanvas } = useCanvas()
  const { workspaces, activeWorkspaceId, setActive } = useWorkspaces()

  const [search,      setSearch]      = useState('')
  const [typeFilter,  setTypeFilter]  = useState<'all'|ItemType>('all')
  const [smartView,   setSmartView]   = useState<SmartViewMode>('all')
  const [folderFilter, setFolderFilter] = useState<'all' | 'none' | string>('all')
  const [viewMode,    setViewMode]    = useState<ViewMode>('grid')
  const [tab,         setTab]         = useState<'all'|'workspaces'>('all')
  const [newWsOpen,   setNewWsOpen]   = useState(false)
  const [editWs,      setEditWs]      = useState<Workspace|null>(null)
  const [assignItem,  setAssignItem]  = useState<FileItem|null>(null)
  const [handoffMsg, setHandoffMsg] = useState('')
  const [handoffMenuOpen, setHandoffMenuOpen] = useState(false)
  const [mergeSelection, setMergeSelection] = useState<Record<SnapshotSection, boolean>>({
    notes: true,
    codes: true,
    tasks: true,
    reminders: true,
    canvases: true,
    workspaces: true,
  })
  const [pendingSnapshot, setPendingSnapshot] = useState<{
    snapshot: WorkspaceRuntimeSnapshot
    sourceName: string
    counts: ReturnType<typeof getSnapshotCounts>
    ageMinutes: number | null
    risk: ReviewRisk
  } | null>(null)

  const recordHandoffAction = useWorkspaceHandoff((s) => s.recordAction)
  const confidence = useWorkspaceHandoff((s) => s.confidence)
  const lastAction = useWorkspaceHandoff((s) => s.lastAction)
  const lastActionAt = useWorkspaceHandoff((s) => s.lastActionAt)
  const lastSourceApp = useWorkspaceHandoff((s) => s.lastSourceApp)
  const checkpoint = useWorkspaceHandoff((s) => s.checkpoint)
  const saveCheckpoint = useWorkspaceHandoff((s) => s.saveCheckpoint)

  const runtimeImportRef = useRef<HTMLInputElement | null>(null)
  const activeWs = workspaces.find(w => w.id === activeWorkspaceId)

  const setHandoffStatus = (
    message: string,
    meta?: {
      sourceApp?: string | null
      exportedAt?: string | null
      snapshotAgeMinutes?: number | null
      counts?: ReturnType<typeof getSnapshotCounts> | null
      riskLevel?: ReviewRisk | null
    },
  ) => {
    setHandoffMsg(message)
    recordHandoffAction(message, meta)
    window.setTimeout(() => setHandoffMsg(''), 3200)
  }

  const buildRuntimeSnapshot = (): WorkspaceRuntimeSnapshot => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'Nexus Mobile',
    state: {
      notes,
      openNoteIds,
      activeNoteId,
      codes,
      openCodeIds,
      activeCodeId,
      tasks,
      reminders,
      folders,
      canvases,
      activeCanvasId,
      workspaces,
      activeWorkspaceId,
    },
  })

  const exportRuntimeSnapshot = () => {
    const snapshot = buildRuntimeSnapshot()
    const payload = JSON.stringify(snapshot, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'runtime.json'
    a.click()
    URL.revokeObjectURL(url)
    setHandoffStatus('runtime.json exportiert', {
      sourceApp: snapshot.app,
      exportedAt: snapshot.exportedAt,
      snapshotAgeMinutes: 0,
      counts: getSnapshotCounts(snapshot),
      riskLevel: 'low',
    })
  }

  const shareRuntimeSnapshot = async () => {
    try {
      const snapshot = buildRuntimeSnapshot()
      const payload = JSON.stringify(snapshot, null, 2)
      const file = new File([payload], 'runtime.json', { type: 'application/json' })
      const canShareFiles = typeof navigator !== 'undefined'
        && typeof (navigator as any).canShare === 'function'
        && (navigator as any).canShare({ files: [file] })
      if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function' && canShareFiles) {
        await (navigator as any).share({
          title: 'Nexus Workspace Snapshot',
          text: 'runtime.json für Nexus Workspace Handoff',
          files: [file],
        })
        setHandoffStatus('runtime.json geteilt', {
          sourceApp: snapshot.app,
          exportedAt: snapshot.exportedAt,
          snapshotAgeMinutes: 0,
          counts: getSnapshotCounts(snapshot),
          riskLevel: 'low',
        })
        return
      }
      exportRuntimeSnapshot()
    } catch {
      setHandoffStatus('Share abgebrochen')
    }
  }

  const applyRuntimeState = (state: WorkspaceRuntimeSnapshot['state']) => {
    const nextNotes = getArray<any>(state.notes)
    const nextCodes = getArray<any>(state.codes)
    const nextTasks = getArray<any>(state.tasks)
    const nextReminders = getArray<any>(state.reminders)
    const nextFolders = getArray<any>(state.folders)
    const nextCanvases = getArray<any>(state.canvases)
    const nextWorkspaces = getArray<any>(state.workspaces)
      .map((workspace) => normalizeWorkspaceEntry(workspace))
      .filter((workspace): workspace is Workspace => Boolean(workspace))

    const noteIds = new Set(nextNotes.map((note) => note.id))
    const codeIds = new Set(nextCodes.map((code) => code.id))
    const canvasIds = new Set(nextCanvases.map((canvas) => canvas.id))
    const workspaceIds = new Set(nextWorkspaces.map((workspace) => workspace.id))

    useApp.setState((current) => ({
      ...current,
      notes: nextNotes,
      openNoteIds: getArray<string>(state.openNoteIds).filter((id) => noteIds.has(id)),
      activeNoteId: noteIds.has(state.activeNoteId as string) ? state.activeNoteId : (nextNotes[0]?.id ?? null),
      codes: nextCodes,
      openCodeIds: getArray<string>(state.openCodeIds).filter((id) => codeIds.has(id)),
      activeCodeId: codeIds.has(state.activeCodeId as string) ? state.activeCodeId : (nextCodes[0]?.id ?? null),
      tasks: nextTasks,
      reminders: nextReminders,
      folders: nextFolders,
    }))

    useCanvas.setState((current) => ({
      ...current,
      canvases: nextCanvases,
      activeCanvasId: canvasIds.has(state.activeCanvasId as string) ? state.activeCanvasId : (nextCanvases[0]?.id ?? null),
    }))

    useWorkspaces.setState((current) => ({
      ...current,
      workspaces: nextWorkspaces,
      activeWorkspaceId: workspaceIds.has(state.activeWorkspaceId as string)
        ? state.activeWorkspaceId
        : (nextWorkspaces[0]?.id ?? null),
    }))
  }

  const buildMergedState = (
    snapshot: WorkspaceRuntimeSnapshot,
    mode: 'replace' | 'merge',
    selected: Record<SnapshotSection, boolean>,
  ): WorkspaceRuntimeSnapshot['state'] => {
    const incoming = snapshot.state || ({} as any)

    const incomingNotes = getArray<any>(incoming.notes)
    const incomingCodes = getArray<any>(incoming.codes)
    const incomingTasks = getArray<any>(incoming.tasks)
    const incomingReminders = getArray<any>(incoming.reminders)
    const incomingFolders = getArray<any>(incoming.folders)
    const incomingCanvases = getArray<any>(incoming.canvases)
    const incomingWorkspaces = getArray<any>(incoming.workspaces)
      .map((workspace) => normalizeWorkspaceEntry(workspace))
      .filter((workspace): workspace is Workspace => Boolean(workspace))

    const useIncoming = (section: SnapshotSection) => mode === 'replace' || selected[section]

    const nextNotes = useIncoming('notes')
      ? (mode === 'replace' ? incomingNotes : mergeById(notes as any[], incomingNotes))
      : (notes as any[])
    const nextCodes = useIncoming('codes')
      ? (mode === 'replace' ? incomingCodes : mergeById(codes as any[], incomingCodes))
      : (codes as any[])
    const nextTasks = useIncoming('tasks')
      ? (mode === 'replace' ? incomingTasks : mergeById(tasks as any[], incomingTasks))
      : (tasks as any[])
    const nextReminders = useIncoming('reminders')
      ? (mode === 'replace' ? incomingReminders : mergeById(reminders as any[], incomingReminders))
      : (reminders as any[])
    const nextCanvases = useIncoming('canvases')
      ? (mode === 'replace' ? incomingCanvases : mergeById(canvases as any[], incomingCanvases))
      : (canvases as any[])
    const currentWorkspaces = (workspaces as any[])
      .map((workspace: any) => normalizeWorkspaceEntry(workspace))
      .filter((workspace: Workspace | null): workspace is Workspace => Boolean(workspace))
    const nextWorkspaces = useIncoming('workspaces')
      ? (mode === 'replace' ? incomingWorkspaces : mergeById(currentWorkspaces, incomingWorkspaces))
      : currentWorkspaces

    const noteIds = new Set(nextNotes.map((entry) => entry.id))
    const codeIds = new Set(nextCodes.map((entry) => entry.id))
    const canvasIds = new Set(nextCanvases.map((entry) => entry.id))
    const workspaceIds = new Set(nextWorkspaces.map((entry) => entry.id))

    const incomingOpenNoteIds = getArray<string>(incoming.openNoteIds).filter((id) => noteIds.has(id))
    const incomingOpenCodeIds = getArray<string>(incoming.openCodeIds).filter((id) => codeIds.has(id))

    const nextOpenNoteIds = mode === 'replace'
      ? incomingOpenNoteIds
      : useIncoming('notes')
        ? Array.from(new Set([
          ...openNoteIds.filter((id) => noteIds.has(id)),
          ...incomingOpenNoteIds,
        ]))
        : openNoteIds.filter((id) => noteIds.has(id))

    const nextOpenCodeIds = mode === 'replace'
      ? incomingOpenCodeIds
      : useIncoming('codes')
        ? Array.from(new Set([
          ...openCodeIds.filter((id) => codeIds.has(id)),
          ...incomingOpenCodeIds,
        ]))
        : openCodeIds.filter((id) => codeIds.has(id))

    const resolveActiveId = (
      currentId: string | null,
      incomingId: string | null,
      idSet: Set<string>,
      fallbackId: string | null,
      section: SnapshotSection,
    ) => {
      if (mode === 'replace') {
        if (incomingId && idSet.has(incomingId)) return incomingId
        return fallbackId
      }
      if (!useIncoming(section)) {
        return currentId && idSet.has(currentId) ? currentId : fallbackId
      }
      if (currentId && idSet.has(currentId)) return currentId
      if (incomingId && idSet.has(incomingId)) return incomingId
      return fallbackId
    }

    return {
      notes: nextNotes,
      openNoteIds: nextOpenNoteIds,
      activeNoteId: resolveActiveId(activeNoteId, incoming.activeNoteId ?? null, noteIds, nextNotes[0]?.id ?? null, 'notes'),
      codes: nextCodes,
      openCodeIds: nextOpenCodeIds,
      activeCodeId: resolveActiveId(activeCodeId, incoming.activeCodeId ?? null, codeIds, nextCodes[0]?.id ?? null, 'codes'),
      tasks: nextTasks,
      reminders: nextReminders,
      folders: mode === 'replace' ? incomingFolders : folders,
      canvases: nextCanvases,
      activeCanvasId: resolveActiveId(activeCanvasId, incoming.activeCanvasId ?? null, canvasIds, nextCanvases[0]?.id ?? null, 'canvases'),
      workspaces: nextWorkspaces,
      activeWorkspaceId: resolveActiveId(activeWorkspaceId, incoming.activeWorkspaceId ?? null, workspaceIds, nextWorkspaces[0]?.id ?? null, 'workspaces'),
    }
  }

  const applyImportedSnapshot = (
    snapshot: WorkspaceRuntimeSnapshot,
    mode: 'replace' | 'merge',
    selected: Record<SnapshotSection, boolean>,
  ) => {
    const nextState = buildMergedState(snapshot, mode, selected)
    applyRuntimeState(nextState)
  }

  const importRuntimeSnapshot = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseRuntimeSnapshot(String(reader.result || ''))
      if (!parsed) {
        setHandoffStatus('runtime.json ungültig')
        return
      }
      const ageMinutes = getSnapshotAgeMinutes(parsed.exportedAt)
      setPendingSnapshot({
        snapshot: parsed,
        sourceName: file.name || 'runtime.json',
        counts: getSnapshotCounts(parsed),
        ageMinutes,
        risk: getRiskLevel(parsed, ageMinutes),
      })
      setMergeSelection({
        notes: true,
        codes: true,
        tasks: true,
        reminders: true,
        canvases: true,
        workspaces: true,
      })
      setHandoffMenuOpen(false)
    }
    reader.readAsText(file)
  }

  const handleApplySnapshot = (mode: 'replace' | 'merge') => {
    if (!pendingSnapshot) return
    saveCheckpoint(buildRuntimeSnapshot().state as any)
    applyImportedSnapshot(pendingSnapshot.snapshot, mode, mergeSelection)
    setHandoffStatus(
      mode === 'replace'
        ? 'runtime.json vollständig ersetzt'
        : 'runtime.json selektiv gemerged',
      {
        sourceApp: pendingSnapshot.snapshot.app,
        exportedAt: pendingSnapshot.snapshot.exportedAt,
        snapshotAgeMinutes: pendingSnapshot.ageMinutes,
        counts: pendingSnapshot.counts,
        riskLevel: pendingSnapshot.risk,
      },
    )
    setPendingSnapshot(null)
  }

  const restoreCheckpoint = () => {
    if (!checkpoint?.state) return
    applyRuntimeState(checkpoint.state as any)
    setHandoffStatus('Letzter Restore-Checkpoint wiederhergestellt', {
      sourceApp: 'local-checkpoint',
      snapshotAgeMinutes: 0,
      riskLevel: 'low',
    })
  }

  // Build unified file list
  const allItems = useMemo((): FileItem[] => {
    const items: FileItem[] = []
    notes.forEach(n => items.push({ id:n.id, title:n.title||'Untitled', type:'note', updated:n.updated||n.created, preview:n.content?.slice(0,80), folderId: n.folderId ?? null, pinned: Boolean(n.pinned) }))
    codes.forEach(c => items.push({ id:c.id, title:c.name, type:'code', updated:c.updated||c.created, preview:`${c.lang} · ${c.content?.split('\n').length} lines`, lang:c.lang, folderId: c.folderId ?? null, pinned: Boolean(c.pinned) }))
    tasks.forEach(tk => items.push({ id:tk.id, title:tk.title, type:'task', updated:tk.updated||tk.created, preview:tk.desc?.slice(0,60), priority:tk.priority, status:tk.status, folderId: tk.folderId ?? null }))
    reminders.forEach(r => items.push({ id:r.id, title:r.title, type:'reminder', updated:r.datetime, preview:r.msg?.slice(0,60), folderId: r.folderId ?? null }))
    canvases.forEach(canvas => items.push({ id:canvas.id, title:canvas.name || 'Untitled Canvas', type:'canvas', updated:canvas.updated || canvas.created, preview:`${canvas.nodes.length} nodes · ${canvas.connections.length} links` }))
    return items.sort((a,b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
  }, [notes, codes, tasks, reminders, canvases])

  const itemInWorkspace = (workspace: Workspace, item: FileItem) => {
    const key = `${item.type}Ids` as keyof Workspace
    return (workspace[key] as string[]).includes(item.id)
  }

  const isItemAssigned = (item: FileItem) =>
    workspaces.some((workspace) => itemInWorkspace(workspace, item))

  const folderOptions = useMemo(() => {
    const used = new Set(
      allItems
        .map((item) => item.folderId)
        .filter((folderId): folderId is string => Boolean(folderId)),
    )
    return folders
      .filter((folder) => used.has(folder.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allItems, folders])

  const displayItems = useMemo(() => {
    let items = allItems
    if (typeFilter !== 'all') items = items.filter(i => i.type === typeFilter)
    if (folderFilter === 'none') items = items.filter((item) => !item.folderId)
    else if (folderFilter !== 'all') items = items.filter((item) => item.folderId === folderFilter)
    if (search) items = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || i.preview?.toLowerCase().includes(search.toLowerCase()))
    if (tab === 'workspaces' && activeWs) {
      items = items.filter((item) => itemInWorkspace(activeWs, item))
    }
    if (smartView === 'workspace' && activeWs) {
      items = items.filter((item) => itemInWorkspace(activeWs, item))
    }
    if (smartView === 'recent') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
      items = items.filter((item) => new Date(item.updated).getTime() >= cutoff)
    }
    if (smartView === 'pinned') {
      items = items.filter((item) => item.pinned)
    }
    if (smartView === 'unassigned') {
      items = items.filter((item) => !isItemAssigned(item))
    }
    return items
  }, [activeWs, allItems, folderFilter, isItemAssigned, search, smartView, tab, typeFilter])

  const getItemWsColor = (item: FileItem) => {
    const ws = workspaces.find(w => itemInWorkspace(w, item))
    return ws?.color
  }

  const wsItemCount = (ws: Workspace) =>
    ws.noteIds.length + ws.codeIds.length + ws.taskIds.length + ws.reminderIds.length + ws.canvasIds.length

  const unassignedCount = useMemo(
    () => allItems.filter((item) => !isItemAssigned(item)).length,
    [allItems, isItemAssigned]
  )

  const openItem = (item: FileItem) => {
    if (item.type === 'note') {
      openNote(item.id)
      setNote(item.id)
      setView?.('notes')
      return
    }
    if (item.type === 'code') {
      openCode(item.id)
      setCode(item.id)
      setView?.('code')
      return
    }
    if (item.type === 'task') {
      setView?.('tasks')
      return
    }
    if (item.type === 'reminder') {
      setView?.('reminders')
      return
    }
    setActiveCanvas(item.id)
    setView?.('canvas')
  }

  const confidenceMeta = confidence === 'fresh'
    ? { label: 'Fresh', color: '#30d158', bg: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.25)' }
    : confidence === 'stale'
      ? { label: 'Stale', color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.25)' }
      : { label: 'Recent', color: t.accent, bg: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.26)` }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <div style={{ padding: mob.isMobile ? '10px 10px 0' : '10px 14px 0' }}>
        <ViewHeader
          title="Files & Workspaces"
          subtitle={`${allItems.length} Items · ${workspaces.length} Workspaces`}
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <InteractiveActionButton
                onClick={() => setNewWsOpen(true)}
                motionId="mobile-files-create-workspace"
                areaHint={96}
                radius={10}
                style={{
                  border: `1px solid rgba(${rgb},0.3)`,
                  background: `rgba(${rgb},0.14)`,
                  color: t.accent,
                  borderRadius: 10,
                  padding: '7px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Plus size={13}/> Workspace
              </InteractiveActionButton>
              <div style={{ position: 'relative' }}>
                <InteractiveActionButton
                  onClick={() => setHandoffMenuOpen((prev) => !prev)}
                  motionId="mobile-files-handoff-menu"
                  selected={handoffMenuOpen}
                  areaHint={90}
                  radius={10}
                  style={{
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'inherit',
                    borderRadius: 10,
                    padding: '7px 9px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <ShieldCheck size={12}/> Handoff
                  <MoreHorizontal size={12}/>
                </InteractiveActionButton>
                {handoffMenuOpen ? (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    zIndex: 40,
                    minWidth: 220,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(17,20,31,0.96)',
                    backdropFilter: 'blur(12px)',
                    padding: 6,
                    boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
                  }}>
                    {[
                      { icon: Upload, label: 'Import runtime.json', onClick: () => runtimeImportRef.current?.click() },
                      { icon: Download, label: 'Export runtime.json', onClick: () => exportRuntimeSnapshot() },
                      { icon: Share2, label: 'Share runtime.json', onClick: () => { void shareRuntimeSnapshot() } },
                      { icon: RefreshCw, label: 'Restore last checkpoint', onClick: () => restoreCheckpoint(), disabled: !checkpoint },
                    ].map((entry) => (
                      <InteractiveActionButton
                        key={entry.label}
                        disabled={entry.disabled}
                        onClick={() => {
                          entry.onClick()
                          setHandoffMenuOpen(false)
                        }}
                        motionId={`mobile-files-handoff-${entry.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        areaHint={78}
                        radius={8}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: 'transparent',
                          color: 'inherit',
                          cursor: entry.disabled ? 'not-allowed' : 'pointer',
                          opacity: entry.disabled ? 0.45 : 1,
                          fontSize: 12,
                          fontWeight: 650,
                        }}
                      >
                        <entry.icon size={13}/>
                        {entry.label}
                      </InteractiveActionButton>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          }
        />
        <input
          ref={runtimeImportRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) importRuntimeSnapshot(file)
            event.currentTarget.value = ''
          }}
        />
      </div>

      <div style={{ padding: '0 12px 8px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, flexWrap: 'wrap' }}>
        <span style={{ padding: '3px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)' }}>
          Workspace: {activeWs ? `${activeWs.icon} ${activeWs.name}` : 'All Files'}
        </span>
        <span style={{ padding: '3px 8px', borderRadius: 999, border: `1px solid rgba(${rgb},0.28)`, background: `rgba(${rgb},0.12)`, color: t.accent }}>
          Modus: Manual Handoff (runtime.json)
        </span>
        <span style={{ padding: '3px 8px', borderRadius: 999, border: confidenceMeta.border, background: confidenceMeta.bg, color: confidenceMeta.color, fontWeight: 700 }}>
          Confidence: {confidenceMeta.label}
        </span>
        {lastSourceApp ? (
          <span style={{ padding: '3px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', opacity: 0.8 }}>
            Source: {lastSourceApp}
          </span>
        ) : null}
        {lastAction ? (
          <span style={{ opacity: 0.75 }}>
            Last: <b>{lastAction}</b>{lastActionAt ? ` · ${new Date(lastActionAt).toLocaleString()}` : ''}
          </span>
        ) : null}
        {handoffMsg ? <span style={{ color: t.accent, fontWeight: 700 }}>{handoffMsg}</span> : null}
      </div>

      <div style={{ display:'flex', flex:1, minHeight:0, overflow:'hidden' }}>
        {/* ── Left: Workspace panel ────────────────────────── */}
        <div style={{ width:260, flexShrink:0, display:'flex', flexDirection:'column', borderRight:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.12)', overflow:'hidden' }}>
          <div style={{ padding:'14px 12px 10px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:1 }}>Workspaces</div>
              <div style={{ fontSize:10, opacity:0.4 }}>{workspaces.length} workspace{workspaces.length!==1?'s':''}</div>
            </div>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'4px 10px 12px' }}>
            <InteractiveActionButton onClick={()=>{setActive(null);setTab('all');setSmartView('all')}}
              motionId="mobile-files-workspace-all-files"
              selected={!activeWorkspaceId}
              areaHint={120}
              radius={10}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:10, marginBottom:4, background: !activeWorkspaceId?`rgba(${rgb},0.12)`:'transparent', border: !activeWorkspaceId?`1px solid rgba(${rgb},0.2)`:'1px solid transparent', cursor:'pointer', transition:'all 0.12s', color:'inherit' }}>
              <div style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🗂️</div>
              <div style={{ flex:1, textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:700, color: !activeWorkspaceId?t.accent:'inherit' }}>All Files</div>
                <div style={{ fontSize:10, opacity:0.45 }}>{allItems.length} items</div>
              </div>
            </InteractiveActionButton>

            <div style={{ fontSize:10, fontWeight:800, opacity:0.35, textTransform:'uppercase', letterSpacing:1, padding:'8px 4px 4px' }}>My Workspaces</div>

            {workspaces.map(ws => (
              <InteractiveActionButton key={ws.id} onClick={()=>{setActive(ws.id);setTab('workspaces');setSmartView('workspace')}}
                motionId={`mobile-files-workspace-${ws.id}`}
                selected={activeWorkspaceId===ws.id}
                areaHint={120}
                radius={10}
                style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:10, marginBottom:4, background: activeWorkspaceId===ws.id?`${ws.color}18`:'transparent', border: activeWorkspaceId===ws.id?`1px solid ${ws.color}44`:'1px solid transparent', cursor:'pointer', transition:'all 0.12s', color:'inherit', position:'relative' }}>
                {activeWorkspaceId===ws.id && <div style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', width:3, height:'60%', borderRadius:2, background:ws.color, boxShadow:`0 0 8px ${ws.color}` }}/>}
                <div style={{ width:34, height:34, borderRadius:9, background:`${ws.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, border:`1px solid ${ws.color}33` }}>
                  {ws.icon}
                </div>
                <div style={{ flex:1, textAlign:'left', minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: activeWorkspaceId===ws.id?ws.color:'inherit' }}>{ws.name}</div>
                  <div style={{ fontSize:10, opacity:0.45 }}>{wsItemCount(ws)} items</div>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e)=>{e.stopPropagation();setEditWs(ws)}}
                  onKeyDown={(e)=>{
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      setEditWs(ws)
                    }
                  }}
                  className="nx-interactive nx-bounce-target nx-icon-fade"
                  style={{ background:'none', border:'none', ['--nx-idle-opacity' as any]:0.28, padding:3, borderRadius:5, color:'inherit', display: 'inline-flex' }}
                >
                  <span style={{ display: 'inline-flex' }}>✎</span>
                </span>
              </InteractiveActionButton>
            ))}
          </div>
        </div>

        {/* ── Right: File list ──────────────────────────────── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, background:'rgba(0,0,0,0.1)' }}>
            {activeWs ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                <span style={{ fontSize:20 }}>{activeWs.icon}</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:activeWs.color }}>{activeWs.name}</div>
                  {activeWs.description && <div style={{ fontSize:11, opacity:0.5 }}>{activeWs.description}</div>}
                </div>
              </div>
            ) : (
              <div style={{ fontSize:14, fontWeight:800, flex:1 }}>All Files</div>
            )}

            <div style={{ position:'relative' }}>
              <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', opacity:0.4 }}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ padding:'6px 10px 6px 28px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:12, color:'inherit', width:180 }}/>
            </div>

            <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:8, overflow:'hidden' }}>
              {(['all','note','code','task','reminder','canvas'] as const).map(f => (
                <InteractiveActionButton key={f} onClick={()=>setTypeFilter(f)}
                  motionId={`mobile-files-type-${f}`}
                  selected={typeFilter===f}
                  areaHint={58}
                  radius={8}
                  style={{ padding:'5px 9px', background:typeFilter===f?t.accent:'transparent', border:'none', cursor:'pointer', fontSize:10, fontWeight:700, color:typeFilter===f?'#fff':'inherit', opacity:typeFilter===f?1:0.5, transition:'all 0.12s', textTransform:'capitalize' }}>{f}</InteractiveActionButton>
              ))}
            </div>

            <select
              value={folderFilter}
              onChange={(event) => setFolderFilter(event.target.value)}
              style={{
                padding:'6px 8px',
                borderRadius:8,
                background:'rgba(255,255,255,0.06)',
                border:'1px solid rgba(255,255,255,0.12)',
                outline:'none',
                color:'inherit',
                fontSize:11,
                minWidth:120,
              }}
            >
              <option value="all">All folders</option>
              <option value="none">No folder</option>
              {folderOptions.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>

            <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:8, overflow:'hidden' }}>
              <InteractiveActionButton onClick={()=>setViewMode('grid')}
                motionId="mobile-files-view-grid"
                selected={viewMode==='grid'}
                areaHint={50}
                radius={8}
                style={{ padding:'5px 8px', background:viewMode==='grid'?t.accent:'transparent', border:'none', cursor:'pointer', color:viewMode==='grid'?'#fff':'inherit', display:'flex', alignItems:'center', transition:'all 0.12s' }}><Grid3x3 size={13}/></InteractiveActionButton>
              <InteractiveActionButton onClick={()=>setViewMode('list')}
                motionId="mobile-files-view-list"
                selected={viewMode==='list'}
                areaHint={50}
                radius={8}
                style={{ padding:'5px 8px', background:viewMode==='list'?t.accent:'transparent', border:'none', cursor:'pointer', color:viewMode==='list'?'#fff':'inherit', display:'flex', alignItems:'center', transition:'all 0.12s' }}><List size={13}/></InteractiveActionButton>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.05)', flexWrap:'wrap' }}>
            {([
              { id: 'all', label: 'All' },
              { id: 'workspace', label: 'Workspace' },
              { id: 'recent', label: 'Recent 7d' },
              { id: 'pinned', label: 'Pinned' },
              { id: 'unassigned', label: `Unassigned (${unassignedCount})` },
            ] as const).map((entry) => (
              <InteractiveActionButton
                key={entry.id}
                onClick={() => {
                  setSmartView(entry.id)
                  setTab(entry.id === 'workspace' ? 'workspaces' : 'all')
                }}
                motionId={`mobile-files-smart-view-${entry.id}`}
                selected={smartView === entry.id}
                areaHint={80}
                radius={8}
                style={{
                  padding:'5px 9px',
                  borderRadius:8,
                  border:`1px solid ${smartView === entry.id ? t.accent : 'rgba(255,255,255,0.14)'}`,
                  background:smartView === entry.id ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.06)',
                  color:smartView === entry.id ? t.accent : 'inherit',
                  fontSize:10,
                  fontWeight:700,
                  cursor:'pointer',
                }}
              >
                {entry.label}
              </InteractiveActionButton>
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'6px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.05)', flexShrink:0 }}>
            {[
              { label:'Notes',     val:notes.length,     color:'#007AFF' },
              { label:'Code',      val:codes.length,     color:'#BF5AF2' },
              { label:'Tasks',     val:tasks.length,     color:'#FF9F0A' },
              { label:'Reminders', val:reminders.length, color:'#FF453A' },
              { label:'Canvas',    val:canvases.length,  color:'#30D158' },
            ].map(s => (
              <div key={s.label} style={{ fontSize:10, display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:s.color }}/>
                <span style={{ opacity:0.5 }}>{s.label}</span>
                <span style={{ fontWeight:700, color:s.color }}>{s.val}</span>
              </div>
            ))}
            <div style={{ flex:1 }}/>
            <span style={{ fontSize:10, opacity:0.4 }}>{displayItems.length} item{displayItems.length!==1?'s':''}</span>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:12 }}>
            {displayItems.length === 0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60%', gap:12, opacity:0.4 }}>
                <Layers size={48} strokeWidth={1} style={{ color:t.accent, opacity:0.4 }}/>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>
                    {activeWs ? `No files in "${activeWs.name}"` : 'No files yet'}
                  </div>
                  <div style={{ fontSize:12, opacity:0.6 }}>
                    {activeWs ? 'Add files to this workspace via the ⋮ menu on any file' : 'Create notes, code files, tasks, reminders, or canvases to see them here'}
                  </div>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:10 }}>
                {displayItems.map(item => (
                  <FileCard key={item.id} item={item} viewMode="grid" onAssign={()=>setAssignItem(item)} onOpen={openItem} wsColor={getItemWsColor(item)} />
                ))}
              </div>
            ) : (
              <div>
                {displayItems.map(item => (
                  <FileCard key={item.id} item={item} viewMode="list" onAssign={()=>setAssignItem(item)} onOpen={openItem} wsColor={getItemWsColor(item)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review / Import safety flow */}
      <AnimatePresence>
        {pendingSnapshot ? (
          <div style={{ position: 'fixed', inset: 0, zIndex: 180, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: mob.isMobile ? 'flex-end' : 'center', justifyContent: 'center' }}>
            <div style={{ width: mob.isMobile ? '100%' : 540, maxHeight: mob.isMobile ? '92vh' : '86vh', padding: mob.isMobile ? 0 : 14 }}>
              <Glass type="modal" glow style={{ padding: 16, borderRadius: mob.isMobile ? '18px 18px 0 0' : 16, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>Snapshot Review</div>
                    <div style={{ fontSize: 11, opacity: 0.62 }}>Import wird erst nach Bestätigung angewendet.</div>
                  </div>
                  <button onClick={() => setPendingSnapshot(null)} style={{ border: 'none', background: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer', fontWeight: 700 }}>Schließen</button>
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', fontSize: 11 }}>
                    Datei: {pendingSnapshot.sourceName}
                  </span>
                  <span style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', fontSize: 11 }}>
                    Quelle: {pendingSnapshot.snapshot.app || 'unknown'}
                  </span>
                  <span style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', fontSize: 11 }}>
                    Alter: {formatSnapshotAge(pendingSnapshot.ageMinutes)}
                  </span>
                  <span style={{ padding: '4px 8px', borderRadius: 999, ...riskMeta[pendingSnapshot.risk], fontSize: 11, fontWeight: 700 }}>
                    {riskMeta[pendingSnapshot.risk].label}
                  </span>
                </div>

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {SNAPSHOT_SECTIONS.map((section) => (
                    <div key={section} style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{section}</div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{pendingSnapshot.counts[section]}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 }}>
                    Merge selected (empfohlen)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    {SNAPSHOT_SECTIONS.map((section) => (
                      <label key={section} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: mergeSelection[section] ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.04)', padding: '6px 8px', fontSize: 11, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={mergeSelection[section]}
                          onChange={(event) => setMergeSelection((prev) => ({ ...prev, [section]: event.target.checked }))}
                        />
                        {section}
                      </label>
                    ))}
                  </div>
                </div>

                {(pendingSnapshot.ageMinutes != null && pendingSnapshot.ageMinutes > 7 * 24 * 60) || Object.values(pendingSnapshot.counts).every((value) => value === 0) ? (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '8px 10px', border: '1px solid rgba(255,159,10,0.35)', background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', fontSize: 11, fontWeight: 700 }}>
                    <AlertTriangle size={14}/> Snapshot ist alt oder leer. Bitte vor Replace genau prüfen.
                  </div>
                ) : null}

                <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setPendingSnapshot(null)} style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'inherit', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    Cancel
                  </button>
                  <button onClick={() => handleApplySnapshot('replace')} style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(255,69,58,0.34)', background: 'rgba(255,69,58,0.14)', color: '#ff453a', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    Replace all
                  </button>
                  <button onClick={() => handleApplySnapshot('merge')} style={{ padding: '8px 12px', borderRadius: 9, border: `1px solid rgba(${rgb},0.32)`, background: `rgba(${rgb},0.16)`, color: t.accent, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    Merge selected
                  </button>
                </div>
              </Glass>
            </div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {newWsOpen && <WorkspaceModal key="new" onClose={()=>setNewWsOpen(false)} />}
        {editWs    && <WorkspaceModal key={editWs.id} ws={editWs} onClose={()=>setEditWs(null)} />}
        {assignItem && <AssignModal key={assignItem.id} item={assignItem} onClose={()=>setAssignItem(null)} />}
      </AnimatePresence>
    </div>
  )
}
