import { useState } from 'react'
import type { CodeFile, Note, Reminder, Task } from '../../store/appStore'
import { useApp } from '../../store/appStore'
import type { Canvas } from '../../store/canvasStore'
import { useCanvas } from '../../store/canvasStore'
import { useWorkspaceFs, WORKSPACE_EXPORT_DIRNAME } from '../../store/workspaceFsStore'
import type { Workspace } from '../../store/workspaceStore'
import { useWorkspaces } from '../../store/workspaceStore'
import {
  buildWorkspaceRuntimeSnapshot,
  readWorkspaceRuntimeSnapshot,
  writeWorkspaceRuntimeSnapshot,
} from '../../lib/workspaceFsRuntime'

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
const ensureStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
const normalizeWorkspaceDefinition = (workspace: any): Workspace | null => {
  if (!workspace || typeof workspace !== 'object' || typeof workspace.id !== 'string') return null
  const fallbackTimestamp = new Date().toISOString()
  const createdAt = typeof workspace.created === 'string' && workspace.created ? workspace.created : fallbackTimestamp
  const lastAccessedAt =
    typeof workspace.lastAccessed === 'string' && workspace.lastAccessed ? workspace.lastAccessed : fallbackTimestamp
  return {
    id: workspace.id,
    name: typeof workspace.name === 'string' && workspace.name ? workspace.name : 'Workspace',
    icon: typeof workspace.icon === 'string' && workspace.icon ? workspace.icon : '🗂️',
    color: typeof workspace.color === 'string' && workspace.color ? workspace.color : '#007AFF',
    description: typeof workspace.description === 'string' ? workspace.description : undefined,
    created: createdAt,
    lastAccessed: lastAccessedAt,
    noteIds: ensureStringArray(workspace.noteIds),
    codeIds: ensureStringArray(workspace.codeIds),
    taskIds: ensureStringArray(workspace.taskIds),
    reminderIds: ensureStringArray(workspace.reminderIds),
    canvasIds: ensureStringArray(workspace.canvasIds),
  }
}

type WorkspaceSyncArgs = {
  notes: Note[]
  codes: CodeFile[]
  tasks: Task[]
  reminders: Reminder[]
  canvases: Canvas[]
  workspaces: Workspace[]
  activeWorkspaceId: string | null
}

export function useWorkspaceSync({
  notes,
  codes,
  tasks,
  reminders,
  canvases,
  workspaces,
  activeWorkspaceId,
}: WorkspaceSyncArgs) {
  const workspaceRoot = useWorkspaceFs((s) => s.rootPath)
  const setWorkspaceRoot = useWorkspaceFs((s) => s.setRootPath)
  const autoSync = useWorkspaceFs((s) => s.autoSync)
  const setAutoSync = useWorkspaceFs((s) => s.setAutoSync)
  const markWorkspaceSync = useWorkspaceFs((s) => s.markSync)

  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)

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
          const normalizedWorkspaces = incoming.workspaces
            .map((workspace) => normalizeWorkspaceDefinition(workspace))
            .filter((workspace): workspace is Workspace => Boolean(workspace))
          if (normalizedWorkspaces.length === 0) {
            markWorkspaceSync('runtime-import')
            toast('Runtime Snapshot geladen, Workspace-Definitionen übersprungen (ungültig).')
            return
          }
          const workspaceIds = new Set(normalizedWorkspaces.map((workspace) => workspace.id))
          useWorkspaces.setState((state) => ({
            ...state,
            workspaces: normalizedWorkspaces,
            activeWorkspaceId:
              incoming.activeWorkspaceId && workspaceIds.has(incoming.activeWorkspaceId)
                ? incoming.activeWorkspaceId
                : normalizedWorkspaces[0]?.id || state.activeWorkspaceId,
          }))
        }

        markWorkspaceSync('runtime-import')
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
      const importedCanvases: Canvas[] = []
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
              importedWorkspaceDefs = parsed
                .map((item) => normalizeWorkspaceDefinition(item))
                .filter((item): item is Workspace => Boolean(item))
            }
          } catch {}
          continue
        }

        if (lower.includes('/notes/') && lower.endsWith('.md')) {
          const titleFromPath = rel.split('/').pop()?.replace(/\\.md$/i, '') || 'Imported Note'
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
                blocked: Boolean(parsed.blocked),
                blockedReason: parsed.blockedReason ? String(parsed.blockedReason) : undefined,
                dependsOnTaskIds: Array.isArray(parsed.dependsOnTaskIds)
                  ? parsed.dependsOnTaskIds.map((entry: any) => String(entry)).filter(Boolean)
                  : [],
                linkedCanvasNodeId: parsed.linkedCanvasNodeId ? String(parsed.linkedCanvasNodeId) : undefined,
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

        if (lower.includes('/canvas/') && lower.endsWith('.json')) {
          try {
            const parsed = JSON.parse(content)
            if (parsed && typeof parsed === 'object' && typeof parsed.id === 'string') {
              const name = typeof parsed.name === 'string' && parsed.name ? parsed.name : 'Imported Canvas'
              const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : []
              const connections = Array.isArray(parsed.connections) ? parsed.connections : []
              importedCanvases.push({
                id: String(parsed.id),
                name,
                nodes,
                connections,
                created: typeof parsed.created === 'string' ? parsed.created : new Date(file.mtimeMs || Date.now()).toISOString(),
                updated: typeof parsed.updated === 'string' ? parsed.updated : new Date(file.mtimeMs || Date.now()).toISOString(),
              })
            }
          } catch {}
        }
      }

      const importedSomething =
        importedNotes.length > 0 ||
        importedCodes.length > 0 ||
        importedTasks.length > 0 ||
        importedReminders.length > 0 ||
        importedCanvases.length > 0

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

      if (importedCanvases.length > 0) {
        useCanvas.setState((state) => ({
          ...state,
          canvases: importedCanvases,
          activeCanvasId: importedCanvases[0]?.id || state.activeCanvasId,
        }))
      }

      if (importedWorkspaceDefs && importedWorkspaceDefs.length > 0) {
        useWorkspaces.setState((state) => ({
          ...state,
          workspaces: importedWorkspaceDefs!,
          activeWorkspaceId: importedWorkspaceDefs![0]?.id || state.activeWorkspaceId,
        }))
      }

      useApp
        .getState()
        .logActivity(
          'system',
          'workspace-imported',
          `${importedNotes.length} notes · ${importedCodes.length} code`,
          { targetView: 'files' },
        )
      markWorkspaceSync('import')
      toast(`Workspace geladen: ${importedNotes.length} Notes · ${importedCodes.length} Code · ${importedTasks.length} Tasks · ${importedReminders.length} Reminders · ${importedCanvases.length} Canvas`)
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
      files: Array<{ type: 'note' | 'code' | 'task' | 'reminder' | 'meta' | 'summary' | 'canvas'; sourceId?: string; path: string }>
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
      meta: { type: 'note' | 'code' | 'task' | 'reminder' | 'meta' | 'summary' | 'canvas'; sourceId?: string },
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
        const noteBody = `# ${note.title || 'Untitled'}\\n\\n${note.content || ''}\\n`
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
      ].join('\\n')
      await writeWithManifest('workspace-export.txt', aiExport, { type: 'summary' })

      await writeWithManifest('manifest.json', JSON.stringify(manifest, null, 2), { type: 'meta' })
      markWorkspaceSync('runtime-export')
      toast(`Export abgeschlossen: ${manifest.files.length} Dateien`)
      void window.api?.notify?.('Nexus Workspace', `Export abgeschlossen (${manifest.files.length} Dateien)`)
    } catch (error: any) {
      toast(`Export fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setSyncing(false)
    }
  }

  return {
    workspaceRoot,
    setWorkspaceRoot,
    autoSync,
    setAutoSync,
    syncing,
    syncMsg,
    loadingWorkspace,
    selectWorkspaceRoot,
    importWorkspaceFromDisk,
    exportWorkspaceToDisk,
  }
}
