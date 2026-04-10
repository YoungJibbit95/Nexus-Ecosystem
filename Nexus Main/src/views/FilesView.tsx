import React, { useState, useMemo } from 'react'
import { Search, FolderOpen, Grid3x3, List, Layers, ArrowRight, Zap, Download, Edit3 } from 'lucide-react'
import { useApp, Note, CodeFile, Task, Reminder } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { useWorkspaces, Workspace } from '../store/workspaceStore'
import { useCanvas } from '../store/canvasStore'
import { useWorkspaceFs, WORKSPACE_EXPORT_DIRNAME } from '../store/workspaceFsStore'
import { hexToRgb } from '../lib/utils'
import { AnimatePresence } from 'framer-motion'
import { AssignModal, FileCard, WorkspaceCreateButton, WorkspaceModal } from './files/FilesUiParts'
import { FileItem, ItemType, ViewMode } from './files/filesTypes'
import {
  buildWorkspaceRuntimeSnapshot,
  readWorkspaceRuntimeSnapshot,
  writeWorkspaceRuntimeSnapshot,
} from '../lib/workspaceFsRuntime'

const stripTrailingSeparators = (value: string) => value.replace(/[\\/]+$/, '')
const joinFsPath = (root: string, ...segments: string[]) =>
  `${stripTrailingSeparators(root)}/${segments.join('/')}`
const sanitizeFileName = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'item'
const getCodeExtension = (lang?: string) => {
  const normalized = (lang || 'txt').toLowerCase()
  if (normalized === 'typescript') return 'ts'
  if (normalized === 'javascript') return 'js'
  if (normalized === 'markdown') return 'md'
  if (normalized === 'shell') return 'sh'
  return normalized.replace(/[^a-z0-9]/g, '') || 'txt'
}
const getCodeLangFromPath = (filePath: string) => {
  const ext = (filePath.split('.').pop() || '').toLowerCase()
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    md: 'markdown',
    json: 'json',
    html: 'html',
    css: 'css',
    sh: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
  }
  return map[ext] || ext || 'plaintext'
}
const toSafeId = () =>
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const toRelPath = (baseDir: string, fullPath: string) => {
  const base = stripTrailingSeparators(baseDir)
  if (!fullPath.startsWith(base)) return fullPath
  return fullPath.slice(base.length).replace(/^[/\\]+/, '')
}
const parseMarkdownTitle = (content: string, fallback = 'Untitled') => {
  const hit = content.match(/^#\s+(.+?)\s*$/m)
  return hit?.[1]?.trim() || fallback
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
export function FilesView() {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { notes, codes, tasks, reminders } = useApp()
  const canvases = useCanvas((s) => s.canvases)
  const { workspaces, activeWorkspaceId, setActive } = useWorkspaces()
  const workspaceRoot = useWorkspaceFs((s) => s.rootPath)
  const setWorkspaceRoot = useWorkspaceFs((s) => s.setRootPath)
  const autoSync = useWorkspaceFs((s) => s.autoSync)
  const setAutoSync = useWorkspaceFs((s) => s.setAutoSync)

  const [search,      setSearch]      = useState('')
  const [typeFilter,  setTypeFilter]  = useState<'all'|ItemType>('all')
  const [viewMode,    setViewMode]    = useState<ViewMode>('grid')
  const [tab,         setTab]         = useState<'all'|'workspaces'>('all')
  const [newWsOpen,   setNewWsOpen]   = useState(false)
  const [editWs,      setEditWs]      = useState<Workspace|null>(null)
  const [assignItem,  setAssignItem]  = useState<FileItem|null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId)

  // Build unified file list
  const allItems = useMemo((): FileItem[] => {
    const items: FileItem[] = []
    notes.forEach(n => items.push({ id:n.id, title:n.title||'Untitled', type:'note', updated:n.updated||n.created, preview:n.content?.slice(0,80) }))
    codes.forEach(c => items.push({ id:c.id, title:c.name, type:'code', updated:c.updated||c.created, preview:`${c.lang} · ${c.content?.split('\n').length} lines`, lang:c.lang }))
    tasks.forEach(tk => items.push({ id:tk.id, title:tk.title, type:'task', updated:tk.updated||tk.created, preview:tk.desc?.slice(0,60), priority:tk.priority, status:tk.status }))
    reminders.forEach(r => items.push({ id:r.id, title:r.title, type:'reminder', updated:r.datetime, preview:r.msg?.slice(0,60) }))
    return items.sort((a,b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
  }, [notes, codes, tasks, reminders])

  const filtered = useMemo(() => {
    let items = allItems
    if (typeFilter !== 'all') items = items.filter(i => i.type === typeFilter)
    if (search) items = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || i.preview?.toLowerCase().includes(search.toLowerCase()))
    if (activeWorkspaceId && tab === 'all') {
      // Show workspace items highlighted, not filtered
    }
    return items
  }, [allItems, typeFilter, search, activeWorkspaceId, tab])

  const wsItems = useMemo(() => {
    if (!activeWs) return filtered
    return filtered.filter(item => {
      const key = `${item.type}Ids` as keyof Workspace
      return (activeWs[key] as string[]).includes(item.id)
    })
  }, [filtered, activeWs])

  const displayItems = tab === 'workspaces' && activeWs ? wsItems : filtered

  const getItemWsColor = (item: FileItem) => {
    const ws = workspaces.find(w => (w[`${item.type}Ids` as keyof Workspace] as string[]).includes(item.id))
    return ws?.color
  }

  const wsItemCount = (ws: Workspace) =>
    ws.noteIds.length + ws.codeIds.length + ws.taskIds.length + ws.reminderIds.length

  const toast = (message: string) => {
    setSyncMsg(message)
    window.setTimeout(() => setSyncMsg(''), 3200)
  }

  const selectWorkspaceRoot = async (): Promise<string | null> => {
    const picker = window.api?.fs?.pickDirectory
    if (!picker) {
      toast('Ordnerauswahl ist nur in der Desktop-App verfügbar.')
      return null
    }

    const result = await picker()
    if (!result.ok || !result.path) {
      if (!result.canceled) toast(result.error || 'Ordner konnte nicht ausgewählt werden.')
      return null
    }

    setWorkspaceRoot(result.path)
    toast(`Workspace-Ordner gesetzt: ${result.path}`)
    return result.path
  }

  const readWorkspaceDirectory = async (root: string) => {
    const fsApi = window.api?.fs
    if (!fsApi?.readDir) return null
    const primaryRoot = joinFsPath(root, WORKSPACE_EXPORT_DIRNAME)
    const primaryResult = await fsApi.readDir(primaryRoot, true)
    if (primaryResult.ok && primaryResult.entries) {
      return { baseRoot: primaryRoot, entries: primaryResult.entries }
    }
    const fallbackResult = await fsApi.readDir(root, true)
    if (!fallbackResult.ok || !fallbackResult.entries) return null
    return { baseRoot: root, entries: fallbackResult.entries }
  }

  const importWorkspaceFromDisk = async () => {
    if (loadingWorkspace || syncing) return
    const fsApi = window.api?.fs
    if (!fsApi?.read || !fsApi?.readDir) {
      toast('Workspace-Import ist nur in der Desktop-App verfügbar.')
      return
    }

    let root = workspaceRoot
    if (!root) {
      const selected = await selectWorkspaceRoot()
      if (!selected) return
      root = selected
    }

    setLoadingWorkspace(true)
    try {
      const runtimeSnapshot = await readWorkspaceRuntimeSnapshot(root, fsApi)
      if (runtimeSnapshot) {
        const incoming = runtimeSnapshot.state

        useApp.setState((state) => {
          const nextNotes = Array.isArray(incoming.notes) ? incoming.notes : state.notes
          const noteIds = new Set(nextNotes.map((note) => note.id))
          const nextOpenNoteIds = (Array.isArray(incoming.openNoteIds) ? incoming.openNoteIds : []).filter((id) =>
            noteIds.has(id),
          )
          const nextActiveNoteId =
            incoming.activeNoteId && noteIds.has(incoming.activeNoteId)
              ? incoming.activeNoteId
              : nextOpenNoteIds[0] || nextNotes[0]?.id || null

          const nextCodes = Array.isArray(incoming.codes) ? incoming.codes : state.codes
          const codeIds = new Set(nextCodes.map((code) => code.id))
          const nextOpenCodeIds = (Array.isArray(incoming.openCodeIds) ? incoming.openCodeIds : []).filter((id) =>
            codeIds.has(id),
          )
          const nextActiveCodeId =
            incoming.activeCodeId && codeIds.has(incoming.activeCodeId)
              ? incoming.activeCodeId
              : nextOpenCodeIds[0] || nextCodes[0]?.id || null

          return {
            notes: nextNotes,
            openNoteIds: nextOpenNoteIds,
            activeNoteId: nextActiveNoteId,
            codes: nextCodes,
            openCodeIds: nextOpenCodeIds,
            activeCodeId: nextActiveCodeId,
            tasks: Array.isArray(incoming.tasks) ? incoming.tasks : state.tasks,
            reminders: Array.isArray(incoming.reminders) ? incoming.reminders : state.reminders,
            folders: Array.isArray(incoming.folders) ? incoming.folders : state.folders,
          }
        })

        if (Array.isArray(incoming.canvases) && incoming.canvases.length > 0) {
          const canvasIds = new Set(incoming.canvases.map((canvas) => canvas.id))
          useCanvas.setState((state) => ({
            ...state,
            canvases: incoming.canvases,
            activeCanvasId:
              incoming.activeCanvasId && canvasIds.has(incoming.activeCanvasId)
                ? incoming.activeCanvasId
                : incoming.canvases[0]?.id || state.activeCanvasId,
          }))
        }

        if (Array.isArray(incoming.workspaces) && incoming.workspaces.length > 0) {
          const workspaceIds = new Set(incoming.workspaces.map((workspace) => workspace.id))
          useWorkspaces.setState((state) => ({
            ...state,
            workspaces: incoming.workspaces,
            activeWorkspaceId:
              incoming.activeWorkspaceId && workspaceIds.has(incoming.activeWorkspaceId)
                ? incoming.activeWorkspaceId
                : incoming.workspaces[0]?.id || state.activeWorkspaceId,
          }))
        }

        toast('Workspace Runtime geladen (schneller Snapshot-Import).')
        return
      }

      const readResult = await readWorkspaceDirectory(root)
      if (!readResult) {
        toast('Workspace konnte nicht gelesen werden.')
        return
      }

      const { baseRoot, entries } = readResult
      const files = entries
        .filter((entry) => !entry.isDirectory)
        .map((entry) => ({ ...entry, relPath: toRelPath(baseRoot, entry.path) }))

      const importedNotes: Note[] = []
      const importedCodes: CodeFile[] = []
      const importedTasks: Task[] = []
      const importedReminders: Reminder[] = []
      let importedWorkspaceDefs: Workspace[] | null = null

      for (const file of files) {
        const rel = file.relPath.replace(/\\/g, '/')
        const lower = rel.toLowerCase()
        if (lower.endsWith('workspace-export.txt') || lower.endsWith('manifest.json')) continue
        const fileRead = await fsApi.read(file.path)
        if (!fileRead.ok || typeof fileRead.data !== 'string') continue
        const content = fileRead.data

        if (lower.endsWith('/workspaces/workspaces.json')) {
          try {
            const parsed = JSON.parse(content)
            if (Array.isArray(parsed)) {
              importedWorkspaceDefs = parsed.filter((item) => item && typeof item.id === 'string') as Workspace[]
            }
          } catch {}
          continue
        }

        if (lower.includes('/notes/') && lower.endsWith('.md')) {
          const titleFromPath = rel.split('/').pop()?.replace(/\.md$/i, '') || 'Imported Note'
          const noteTitle = parseMarkdownTitle(content, titleFromPath)
          importedNotes.push({
            id: toSafeId(),
            title: noteTitle,
            content,
            tags: [],
            created: new Date(file.mtimeMs || Date.now()).toISOString(),
            updated: new Date(file.mtimeMs || Date.now()).toISOString(),
            dirty: false,
          })
          continue
        }

        if (lower.includes('/code/')) {
          const fileName = rel.split('/').pop() || `imported-${toSafeId()}.txt`
          importedCodes.push({
            id: toSafeId(),
            name: fileName,
            lang: getCodeLangFromPath(fileName),
            content,
            dirty: false,
            created: new Date(file.mtimeMs || Date.now()).toISOString(),
            updated: new Date(file.mtimeMs || Date.now()).toISOString(),
            lastSaved: new Date(file.mtimeMs || Date.now()).toISOString(),
          })
          continue
        }

        if (lower.includes('/tasks/') && lower.endsWith('.json')) {
          try {
            const parsed = JSON.parse(content)
            if (parsed && typeof parsed === 'object') {
              importedTasks.push({
                id: toSafeId(),
                title: String(parsed.title || 'Imported Task'),
                desc: String(parsed.desc || parsed.description || ''),
                status: parsed.status === 'done' || parsed.status === 'doing' ? parsed.status : 'todo',
                priority: parsed.priority === 'high' || parsed.priority === 'low' ? parsed.priority : 'mid',
                deadline: parsed.deadline ? String(parsed.deadline) : undefined,
                tags: Array.isArray(parsed.tags) ? parsed.tags.map((tag: any) => String(tag)) : [],
                color: parsed.color ? String(parsed.color) : undefined,
                subtasks: Array.isArray(parsed.subtasks)
                  ? parsed.subtasks.map((sub: any) => ({
                    id: String(sub?.id || toSafeId()),
                    title: String(sub?.title || 'Subtask'),
                    done: Boolean(sub?.done),
                  }))
                  : [],
                created: parsed.created ? String(parsed.created) : new Date(file.mtimeMs || Date.now()).toISOString(),
                updated: parsed.updated ? String(parsed.updated) : new Date(file.mtimeMs || Date.now()).toISOString(),
                linkedNoteId: parsed.linkedNoteId ? String(parsed.linkedNoteId) : undefined,
                folderId: parsed.folderId ? String(parsed.folderId) : null,
                notes: parsed.notes ? String(parsed.notes) : undefined,
              })
            }
          } catch {}
          continue
        }

        if (lower.includes('/reminders/') && lower.endsWith('.json')) {
          try {
            const parsed = JSON.parse(content)
            if (parsed && typeof parsed === 'object') {
              importedReminders.push({
                id: toSafeId(),
                title: String(parsed.title || 'Imported Reminder'),
                msg: String(parsed.msg || parsed.message || ''),
                datetime: String(parsed.datetime || new Date(file.mtimeMs || Date.now()).toISOString()),
                repeat: parsed.repeat === 'daily' || parsed.repeat === 'weekly' || parsed.repeat === 'monthly' ? parsed.repeat : 'none',
                done: Boolean(parsed.done),
                snoozeUntil: parsed.snoozeUntil ? String(parsed.snoozeUntil) : undefined,
                linkedNoteId: parsed.linkedNoteId ? String(parsed.linkedNoteId) : undefined,
                linkedTaskId: parsed.linkedTaskId ? String(parsed.linkedTaskId) : undefined,
                folderId: parsed.folderId ? String(parsed.folderId) : null,
                notes: parsed.notes ? String(parsed.notes) : undefined,
              })
            }
          } catch {}
        }
      }

      const importedSomething =
        importedNotes.length > 0 ||
        importedCodes.length > 0 ||
        importedTasks.length > 0 ||
        importedReminders.length > 0

      if (!importedSomething) {
        toast('Keine importierbaren Workspace-Dateien gefunden.')
        return
      }

      useApp.setState((state) => {
        const nextNotes = importedNotes.length > 0 ? importedNotes : state.notes
        const nextCodes = importedCodes.length > 0 ? importedCodes : state.codes
        return {
          notes: nextNotes,
          openNoteIds: nextNotes.length > 0 ? [nextNotes[0].id] : [],
          activeNoteId: nextNotes[0]?.id ?? null,
          codes: nextCodes,
          openCodeIds: nextCodes.length > 0 ? [nextCodes[0].id] : [],
          activeCodeId: nextCodes[0]?.id ?? null,
          tasks: importedTasks.length > 0 ? importedTasks : state.tasks,
          reminders: importedReminders.length > 0 ? importedReminders : state.reminders,
        }
      })

      if (importedWorkspaceDefs && importedWorkspaceDefs.length > 0) {
        useWorkspaces.setState((state) => ({
          ...state,
          workspaces: importedWorkspaceDefs!,
          activeWorkspaceId: importedWorkspaceDefs![0]?.id || state.activeWorkspaceId,
        }))
      }

      useApp.getState().logActivity('system', 'workspace-imported', `${importedNotes.length} notes · ${importedCodes.length} code`)
      toast(`Workspace geladen: ${importedNotes.length} Notes · ${importedCodes.length} Code · ${importedTasks.length} Tasks · ${importedReminders.length} Reminders`)
    } catch (error: any) {
      toast(`Workspace-Import fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setLoadingWorkspace(false)
    }
  }

  const exportWorkspaceToDisk = async () => {
    if (syncing || loadingWorkspace) return
    const fsApi = window.api?.fs
    if (!fsApi?.write) {
      toast('Datei-Export ist in dieser Laufzeit nicht verfügbar.')
      return
    }

    let root = workspaceRoot
    if (!root) {
      const selected = await selectWorkspaceRoot()
      if (!selected) return
      root = selected
    }

    setSyncing(true)
    const exportedAt = new Date().toISOString()
    const exportRoot = joinFsPath(root, WORKSPACE_EXPORT_DIRNAME)
    const manifest: {
      exportedAt: string
      app: string
      counts: Record<string, number>
      files: Array<{ type: ItemType | 'meta' | 'summary' | 'canvas'; sourceId?: string; path: string }>
    } = {
      exportedAt,
      app: 'Nexus Main',
      counts: {
        notes: notes.length,
        code: codes.length,
        tasks: tasks.length,
        reminders: reminders.length,
        canvases: canvases.length,
        workspaces: workspaces.length,
      },
      files: [],
    }

    const writeWithManifest = async (
      relativePath: string,
      content: string,
      meta: { type: ItemType | 'meta' | 'summary' | 'canvas'; sourceId?: string },
    ) => {
      const absolutePath = joinFsPath(exportRoot, relativePath)
      const result = await fsApi.write(absolutePath, content)
      if (!result.ok) {
        throw new Error(result.error || `Write failed: ${relativePath}`)
      }
      manifest.files.push({ ...meta, path: relativePath })
    }

    try {
      const runtimeSnapshot = buildWorkspaceRuntimeSnapshot({
        notes,
        openNoteIds: useApp.getState().openNoteIds,
        activeNoteId: useApp.getState().activeNoteId,
        codes,
        openCodeIds: useApp.getState().openCodeIds,
        activeCodeId: useApp.getState().activeCodeId,
        tasks,
        reminders,
        folders: useApp.getState().folders,
        canvases,
        activeCanvasId: useCanvas.getState().activeCanvasId,
        workspaces,
        activeWorkspaceId,
      })
      const runtimeWrite = await writeWorkspaceRuntimeSnapshot(root, runtimeSnapshot, fsApi)
      if (!runtimeWrite.ok) {
        throw new Error(runtimeWrite.error || 'Runtime Snapshot konnte nicht geschrieben werden.')
      }
      manifest.files.push({ type: 'meta', path: 'state/runtime.json' })

      for (const note of notes) {
        const noteName = sanitizeFileName(note.title || 'untitled-note')
        const noteFile = `notes/${noteName}-${note.id.slice(0, 8)}.md`
        const noteBody = `# ${note.title || 'Untitled'}\n\n${note.content || ''}\n`
        await writeWithManifest(noteFile, noteBody, { type: 'note', sourceId: note.id })
      }

      for (const code of codes) {
        const codeName = sanitizeFileName(code.name || 'untitled-code')
        const ext = getCodeExtension(code.lang)
        const codeFile = `code/${codeName}-${code.id.slice(0, 8)}.${ext}`
        await writeWithManifest(codeFile, code.content || '', { type: 'code', sourceId: code.id })
      }

      for (const task of tasks) {
        const taskName = sanitizeFileName(task.title || 'task')
        const taskFile = `tasks/${taskName}-${task.id.slice(0, 8)}.json`
        await writeWithManifest(taskFile, JSON.stringify(task, null, 2), { type: 'task', sourceId: task.id })
      }

      for (const reminder of reminders) {
        const reminderName = sanitizeFileName(reminder.title || 'reminder')
        const reminderFile = `reminders/${reminderName}-${reminder.id.slice(0, 8)}.json`
        await writeWithManifest(reminderFile, JSON.stringify(reminder, null, 2), { type: 'reminder', sourceId: reminder.id })
      }

      for (const canvas of canvases) {
        const canvasName = sanitizeFileName(canvas.name || 'canvas')
        const canvasFile = `canvas/${canvasName}-${canvas.id.slice(0, 8)}.json`
        await writeWithManifest(canvasFile, JSON.stringify(canvas, null, 2), { type: 'canvas', sourceId: canvas.id })
      }

      await writeWithManifest('workspaces/workspaces.json', JSON.stringify(workspaces, null, 2), { type: 'meta' })

      const aiExport = [
        `# Nexus Workspace Export`,
        ``,
        `Generated: ${exportedAt}`,
        ``,
        `## Notes`,
        ...notes.map((note) => `- ${note.title || 'Untitled'} (${note.id})`),
        ``,
        `## Code`,
        ...codes.map((code) => `- ${code.name} [${code.lang}] (${code.id})`),
        ``,
        `## Tasks`,
        ...tasks.map((task) => `- ${task.title} [${task.status}/${task.priority}] (${task.id})`),
        ``,
        `## Reminders`,
        ...reminders.map((reminder) => `- ${reminder.title} (${reminder.datetime}) (${reminder.id})`),
        ``,
        `## Canvas`,
        ...canvases.map((canvas) => `- ${canvas.name} (${canvas.id})`),
      ].join('\n')
      await writeWithManifest('workspace-export.txt', aiExport, { type: 'summary' })

      await writeWithManifest('manifest.json', JSON.stringify(manifest, null, 2), { type: 'meta' })
      toast(`Export abgeschlossen: ${manifest.files.length} Dateien`)
      void window.api?.notify?.('Nexus Workspace', `Export abgeschlossen (${manifest.files.length} Dateien)`)
    } catch (error: any) {
      toast(`Export fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>

      {/* ── Left: Workspace panel ────────────────────────── */}
      <div style={{ width:260, flexShrink:0, display:'flex', flexDirection:'column', borderRight:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.12)', overflow:'hidden' }}>
        <div style={{ padding:'14px 12px 10px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:1 }}>Workspaces</div>
            <div style={{ fontSize:10, opacity:0.4 }}>{workspaces.length} workspace{workspaces.length!==1?'s':''}</div>
          </div>
          <WorkspaceCreateButton onClick={() => setNewWsOpen(true)} />
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'4px 10px 12px' }}>
          {/* All Files */}
          <button onClick={()=>{setActive(null);setTab('all')}}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:10, marginBottom:4, background: !activeWorkspaceId?`rgba(${rgb},0.12)`:'transparent', border: !activeWorkspaceId?`1px solid rgba(${rgb},0.2)`:'1px solid transparent', cursor:'pointer', transition:'all 0.12s', color:'inherit' }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🗂️</div>
            <div style={{ flex:1, textAlign:'left' }}>
              <div style={{ fontSize:13, fontWeight:700, color: !activeWorkspaceId?t.accent:'inherit' }}>All Files</div>
              <div style={{ fontSize:10, opacity:0.45 }}>{allItems.length} items</div>
            </div>
          </button>

          <div style={{ fontSize:10, fontWeight:800, opacity:0.35, textTransform:'uppercase', letterSpacing:1, padding:'8px 4px 4px' }}>My Workspaces</div>

          {workspaces.map(ws => (
            <button key={ws.id} onClick={()=>{setActive(ws.id);setTab('workspaces')}}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:10, marginBottom:4, background: activeWorkspaceId===ws.id?`${ws.color}18`:'transparent', border: activeWorkspaceId===ws.id?`1px solid ${ws.color}44`:'1px solid transparent', cursor:'pointer', transition:'all 0.12s', color:'inherit', position:'relative' }}>
              {activeWorkspaceId===ws.id && <div style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', width:3, height:'60%', borderRadius:2, background:ws.color, boxShadow:`0 0 8px ${ws.color}` }}/>}
              <div style={{ width:34, height:34, borderRadius:9, background:`${ws.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, border:`1px solid ${ws.color}33` }}>
                {ws.icon}
              </div>
              <div style={{ flex:1, textAlign:'left', minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: activeWorkspaceId===ws.id?ws.color:'inherit' }}>{ws.name}</div>
                <div style={{ fontSize:10, opacity:0.45 }}>{wsItemCount(ws)} items</div>
              </div>
              <button onClick={e=>{e.stopPropagation();setEditWs(ws)}} style={{ background:'none', border:'none', cursor:'pointer', opacity:0, padding:3, borderRadius:5, color:'inherit', transition:'opacity 0.1s' }}
                onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0'}><Edit3 size={11}/></button>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: File list ──────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.08)', flexShrink:0 }}>
          <button
            onClick={() => void selectWorkspaceRoot()}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius:8, background:`rgba(${rgb},0.15)`, border:`1px solid rgba(${rgb},0.25)`, color:t.accent, cursor:'pointer', fontSize:11, fontWeight:700 }}
          >
            <FolderOpen size={12}/> Workspace wählen/erstellen
          </button>
          <button
            onClick={() => void importWorkspaceFromDisk()}
            disabled={loadingWorkspace || syncing}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius:8, background: loadingWorkspace ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'inherit', cursor: loadingWorkspace || syncing ? 'not-allowed' : 'pointer', fontSize:11, fontWeight:700, opacity: loadingWorkspace || syncing ? 0.7 : 1 }}
          >
            <ArrowRight size={12}/> {loadingWorkspace ? 'Workspace wird geladen…' : 'Workspace laden'}
          </button>
          <button
            onClick={() => void exportWorkspaceToDisk()}
            disabled={syncing || loadingWorkspace}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius:8, background: syncing ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'inherit', cursor: syncing || loadingWorkspace ? 'not-allowed' : 'pointer', fontSize:11, fontWeight:700, opacity: syncing || loadingWorkspace ? 0.7 : 1 }}
          >
            <Download size={12}/> {syncing ? 'Sync läuft…' : 'Workspace synchronisieren'}
          </button>
          <button
            onClick={() => setAutoSync(!autoSync)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 8,
              background: autoSync ? `rgba(${rgb},0.16)` : 'rgba(255,255,255,0.06)',
              border: autoSync ? `1px solid rgba(${rgb},0.3)` : '1px solid rgba(255,255,255,0.12)',
              color: autoSync ? t.accent : 'inherit',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <Zap size={12}/> {autoSync ? 'Auto-Sync: an' : 'Auto-Sync: aus'}
          </button>
          <div style={{ fontSize:10, opacity:0.52, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {workspaceRoot
              ? `Aktiver Workspace: ${workspaceRoot} · ${autoSync ? 'Runtime-Sync aktiv' : 'nur manuelles Sync'}`
              : 'Kein Workspace-Ordner ausgewählt'}
          </div>
          {syncMsg && <div style={{ marginLeft:'auto', fontSize:10, color:t.accent, fontWeight:700 }}>{syncMsg}</div>}
        </div>

        {/* Header */}
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
            {(['all','note','code','task','reminder'] as const).map(f => (
              <button key={f} onClick={()=>setTypeFilter(f)} style={{ padding:'5px 9px', background:typeFilter===f?t.accent:'transparent', border:'none', cursor:'pointer', fontSize:10, fontWeight:700, color:typeFilter===f?'#fff':'inherit', opacity:typeFilter===f?1:0.5, transition:'all 0.12s', textTransform:'capitalize' }}>{f}</button>
            ))}
          </div>

          <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:8, overflow:'hidden' }}>
            <button onClick={()=>setViewMode('grid')} style={{ padding:'5px 8px', background:viewMode==='grid'?t.accent:'transparent', border:'none', cursor:'pointer', color:viewMode==='grid'?'#fff':'inherit', display:'flex', alignItems:'center', transition:'all 0.12s' }}><Grid3x3 size={13}/></button>
            <button onClick={()=>setViewMode('list')} style={{ padding:'5px 8px', background:viewMode==='list'?t.accent:'transparent', border:'none', cursor:'pointer', color:viewMode==='list'?'#fff':'inherit', display:'flex', alignItems:'center', transition:'all 0.12s' }}><List size={13}/></button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'6px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.05)', flexShrink:0 }}>
          {[
            { label:'Notes',     val:notes.length,     color:'#007AFF' },
            { label:'Code',      val:codes.length,     color:'#BF5AF2' },
            { label:'Tasks',     val:tasks.length,     color:'#FF9F0A' },
            { label:'Reminders', val:reminders.length, color:'#FF453A' },
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

        {/* Items */}
        <div style={{ flex:1, overflowY:'auto', padding:12 }}>
          {displayItems.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60%', gap:12, opacity:0.4 }}>
              <Layers size={48} strokeWidth={1} style={{ color:t.accent, opacity:0.4 }}/>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>
                  {activeWs ? `No files in "${activeWs.name}"` : 'No files yet'}
                </div>
                <div style={{ fontSize:12, opacity:0.6 }}>
                  {activeWs ? 'Add files to this workspace via the ⋮ menu on any file' : 'Create notes, code files, tasks, or reminders to see them here'}
                </div>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:10 }}>
              {displayItems.map(item => (
                <FileCard key={item.id} item={item} viewMode="grid" onAssign={()=>setAssignItem(item)} wsColor={getItemWsColor(item)} />
              ))}
            </div>
          ) : (
            <div>
              {displayItems.map(item => (
                <FileCard key={item.id} item={item} viewMode="list" onAssign={()=>setAssignItem(item)} wsColor={getItemWsColor(item)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {newWsOpen && <WorkspaceModal key="new" onClose={()=>setNewWsOpen(false)} />}
        {editWs    && <WorkspaceModal key={editWs.id} ws={editWs} onClose={()=>setEditWs(null)} />}
        {assignItem && <AssignModal key={assignItem.id} item={assignItem} onClose={()=>setAssignItem(null)} />}
      </AnimatePresence>
    </div>
  )
}
