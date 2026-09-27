import { useCallback, useEffect, useRef, useState } from 'react'
import { createDocumentSaveQueue } from './documentSaveQueue'
import type { createLocalFileRepository, LocalFile } from './localFileRepository'

type EditorFile = LocalFile & { fsPath?: string; type?: string; modifiedAt?: string }
type Tab = { id: string; modified?: boolean; [key: string]: unknown }
type Options = {
  files: EditorFile[]
  setFiles: (files: EditorFile[] | ((files: EditorFile[]) => EditorFile[])) => void
  activeTabId: string | null
  setOpenTabs: (update: (tabs: Tab[]) => Tab[]) => void
  workspacePath: string | null
  autoSave: boolean
  repository: ReturnType<typeof createLocalFileRepository>
  writeFile: (path: string, content: string) => unknown | Promise<unknown>
}

/** Shared draft/commit lifecycle; each client retains its editor and native filesystem port. */
export function useEditorPersistence(options: Options) {
  const latest = useRef(options)
  latest.current = options
  const filesRef = useRef(options.files)
  filesRef.current = options.files
  const activeTabIdRef = useRef(options.activeTabId)
  activeTabIdRef.current = options.activeTabId
  const editorCodeRef = useRef('')
  const [editorCode, setEditorCode] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isMutating, setIsMutating] = useState(false)
  const mutationRef = useRef(false)
  const bufferTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const queueRef = useRef<ReturnType<typeof createDocumentSaveQueue> | null>(null)
  if (!queueRef.current) queueRef.current = createDocumentSaveQueue({
    onSaved: id => {
      const draft = queueRef.current?.get(id)
      if (draft) {
        const next = filesRef.current.map(file => file.id === id ? { ...file, content: draft.content } : file)
        filesRef.current = next
        latest.current.setFiles(next)
        queueRef.current?.forget(id)
      }
      latest.current.setOpenTabs(tabs => tabs.map(tab => tab.id === id ? { ...tab, modified: false } : tab))
      setSaveError(null)
    },
    onError: (id, message) => { setSaveError(`${id}: ${message}`) },
  })
  const drafts = queueRef.current
  const mergedFiles = useCallback(() => filesRef.current.map(file => {
    const draft = drafts.get(file.id)
    return draft && draft.content !== file.content ? { ...file, content: draft.content, modifiedAt: new Date().toISOString() } : file
  }), [drafts])
  const commitBufferToFile = useCallback((id: string, content: string) => {
    if (!id) return
    if (drafts.get(id)?.content !== content) drafts.edit(id, content)
    const next = mergedFiles()
    filesRef.current = next
    latest.current.setFiles(next)
  }, [drafts, mergedFiles])
  const flushEditorBuffer = useCallback((id = activeTabIdRef.current) => {
    clearTimeout(bufferTimer.current)
    if (!id) return
    const draft = drafts.get(id)
    if (draft) commitBufferToFile(id, draft.content)
  }, [commitBufferToFile, drafts])

  const writeFor = useCallback((file: EditorFile) => {
    // Capture path and identity now, never the subsequently active tab.
    if (file.fsPath) {
      const path = file.fsPath
      const writer = latest.current.writeFile
      return (content: string) => writer(path, content)
    }
    return () => {
      const queued = latest.current.repository.save(mergedFiles())
      const result = queued.ok ? latest.current.repository.flush() : queued
      if (!result.ok) throw new Error(result.error ?? 'Local file commit failed')
    }
  }, [mergedFiles])
  const saveFile = useCallback(async (id = activeTabIdRef.current) => {
    if (!id) return true
    flushEditorBuffer(id)
    const file = filesRef.current.find(candidate => candidate.id === id)
    if (!file) return false
    if (file.fsPath && file.content === undefined && !drafts.get(id)) return true
    if (!drafts.get(id)) drafts.edit(id, file.content ?? '')
    const result = await drafts.save(id, writeFor(file))
    return result.ok && result.current
  }, [drafts, flushEditorBuffer, writeFor])
  const handleSaveAll = useCallback(async () => {
    flushEditorBuffer()
    const results = await Promise.all(drafts.entries().map(([id]) => saveFile(id)))
    if (!latest.current.workspacePath) {
      const queued = latest.current.repository.save(mergedFiles())
      results.push(queued.ok && latest.current.repository.flush().ok)
    }
    return results.every(Boolean)
  }, [drafts, flushEditorBuffer, saveFile, mergedFiles])
  const handleCodeChange = useCallback((content: string) => {
    if (mutationRef.current) return
    const id = activeTabIdRef.current
    if (!id) return
    editorCodeRef.current = content
    setEditorCode(content)
    drafts.edit(id, content)
    latest.current.setOpenTabs(tabs => tabs.map(tab => tab.id === id ? { ...tab, modified: true } : tab))
    clearTimeout(bufferTimer.current)
    bufferTimer.current = setTimeout(() => {
      const draft = drafts.get(id)
      if (draft) commitBufferToFile(id, draft.content)
    }, 8000)
    const file = filesRef.current.find(candidate => candidate.id === id)
    if (file && (file.fsPath || latest.current.autoSave)) drafts.schedule(id, writeFor(file), file.fsPath ? 5200 : 6200)
  }, [drafts, commitBufferToFile, writeFor])
  const runFileMutation = useCallback(async (operation: () => unknown | Promise<unknown>) => {
    if (mutationRef.current) return false
    mutationRef.current = true
    setIsMutating(true)
    try {
      if (!await handleSaveAll()) return false
      await operation()
      return true
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
      return false
    } finally { mutationRef.current = false; setIsMutating(false) }
  }, [handleSaveAll])

  useEffect(() => {
    for (const [id] of drafts.entries()) if (!options.files.some(file => file.id === id)) drafts.forget(id)
    if (!options.workspacePath) options.repository.save(mergedFiles())
  }, [options.files, options.workspacePath, options.repository, drafts, mergedFiles])
  useEffect(() => {
    const file = options.files.find(candidate => candidate.id === options.activeTabId)
    const content = (file && drafts.get(file.id)?.content) ?? file?.content ?? ''
    editorCodeRef.current = content
    setEditorCode(content)
  }, [options.activeTabId, options.files, drafts])
  useEffect(() => {
    const checkpoint = () => {
      clearTimeout(bufferTimer.current)
      if (!latest.current.workspacePath) {
        latest.current.repository.save(mergedFiles())
        latest.current.repository.flush()
      }
      void drafts.flushAll()
    }
    const visibility = () => { if (document.visibilityState === 'hidden') checkpoint() }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (drafts.entries().some(([id]) => filesRef.current.some(file => file.id === id && file.fsPath))) {
        event.preventDefault()
        event.returnValue = ''
      }
      checkpoint()
    }
    window.addEventListener('pagehide', checkpoint)
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      checkpoint()
      window.removeEventListener('pagehide', checkpoint)
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [drafts, mergedFiles])
  return { editorCode, setEditorCode, editorCodeRef, activeTabIdRef, filesRef, commitBufferToFile, flushEditorBuffer, handleCodeChange, handleSaveAll, saveFile, saveError, runFileMutation, isMutating }
}
