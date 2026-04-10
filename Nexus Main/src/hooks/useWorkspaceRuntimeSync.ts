import { useEffect, useRef } from 'react'
import { useApp } from '../store/appStore'
import { useCanvas } from '../store/canvasStore'
import { useWorkspaces } from '../store/workspaceStore'
import { useWorkspaceFs } from '../store/workspaceFsStore'
import {
  buildWorkspaceRuntimeFingerprint,
  buildWorkspaceRuntimeSnapshot,
  readWorkspaceRuntimeSnapshot,
  writeWorkspaceRuntimeSnapshot,
} from '../lib/workspaceFsRuntime'

const AUTOSYNC_DEBOUNCE_MS = 900
const AUTOSYNC_MIN_INTERVAL_MS = 1_250

const applyRuntimeSnapshot = (snapshot: NonNullable<Awaited<ReturnType<typeof readWorkspaceRuntimeSnapshot>>>) => {
  const incoming = snapshot.state

  const nextNotes = Array.isArray(incoming.notes) ? incoming.notes : []
  const nextNoteIds = new Set(nextNotes.map((note) => note.id))
  const nextOpenNoteIds = (Array.isArray(incoming.openNoteIds) ? incoming.openNoteIds : []).filter((id) => nextNoteIds.has(id))
  const nextActiveNoteId =
    incoming.activeNoteId && nextNoteIds.has(incoming.activeNoteId)
      ? incoming.activeNoteId
      : nextOpenNoteIds[0] || nextNotes[0]?.id || null

  const nextCodes = Array.isArray(incoming.codes) ? incoming.codes : []
  const nextCodeIds = new Set(nextCodes.map((code) => code.id))
  const nextOpenCodeIds = (Array.isArray(incoming.openCodeIds) ? incoming.openCodeIds : []).filter((id) => nextCodeIds.has(id))
  const nextActiveCodeId =
    incoming.activeCodeId && nextCodeIds.has(incoming.activeCodeId)
      ? incoming.activeCodeId
      : nextOpenCodeIds[0] || nextCodes[0]?.id || null

  useApp.setState((state) => ({
    ...state,
    notes: nextNotes,
    openNoteIds: nextOpenNoteIds,
    activeNoteId: nextActiveNoteId,
    codes: nextCodes,
    openCodeIds: nextOpenCodeIds,
    activeCodeId: nextActiveCodeId,
    tasks: Array.isArray(incoming.tasks) ? incoming.tasks : state.tasks,
    reminders: Array.isArray(incoming.reminders) ? incoming.reminders : state.reminders,
    folders: Array.isArray(incoming.folders) ? incoming.folders : state.folders,
  }))

  const nextCanvases = Array.isArray(incoming.canvases) ? incoming.canvases : []
  const nextCanvasIds = new Set(nextCanvases.map((canvas) => canvas.id))
  const nextActiveCanvasId =
    incoming.activeCanvasId && nextCanvasIds.has(incoming.activeCanvasId)
      ? incoming.activeCanvasId
      : nextCanvases[0]?.id || null

  useCanvas.setState((state) => ({
    ...state,
    canvases: nextCanvases.length > 0 ? nextCanvases : state.canvases,
    activeCanvasId: nextCanvases.length > 0 ? nextActiveCanvasId : state.activeCanvasId,
  }))

  const nextWorkspaces = Array.isArray(incoming.workspaces) ? incoming.workspaces : []
  const nextWorkspaceIds = new Set(nextWorkspaces.map((workspace) => workspace.id))
  const nextActiveWorkspaceId =
    incoming.activeWorkspaceId && nextWorkspaceIds.has(incoming.activeWorkspaceId)
      ? incoming.activeWorkspaceId
      : nextWorkspaces[0]?.id || null

  useWorkspaces.setState((state) => ({
    ...state,
    workspaces: nextWorkspaces.length > 0 ? nextWorkspaces : state.workspaces,
    activeWorkspaceId: nextWorkspaces.length > 0 ? nextActiveWorkspaceId : state.activeWorkspaceId,
  }))
}

export const useWorkspaceRuntimeSync = () => {
  const rootPath = useWorkspaceFs((state) => state.rootPath)
  const autoSync = useWorkspaceFs((state) => state.autoSync)
  const bootHydratedRoot = useWorkspaceFs((state) => state.bootHydratedRoot)
  const markBootHydrated = useWorkspaceFs((state) => state.markBootHydrated)

  const writeTimerRef = useRef<number | null>(null)
  const writingRef = useRef(false)
  const pendingFlushRef = useRef(false)
  const lastFingerprintRef = useRef('')
  const lastWriteAtRef = useRef(0)

  useEffect(() => {
    if (!rootPath || bootHydratedRoot === rootPath) return
    if (!window.api?.fs?.read) {
      markBootHydrated(rootPath)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const snapshot = await readWorkspaceRuntimeSnapshot(rootPath, window.api?.fs)
        if (cancelled) return
        if (snapshot) {
          applyRuntimeSnapshot(snapshot)
          lastFingerprintRef.current = buildWorkspaceRuntimeFingerprint(snapshot)
        }
      } catch (error) {
        console.warn('[workspace-runtime] hydrate failed', error)
      } finally {
        if (!cancelled) {
          markBootHydrated(rootPath)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [bootHydratedRoot, markBootHydrated, rootPath])

  useEffect(() => {
    if (!rootPath || !autoSync) return
    if (bootHydratedRoot !== rootPath) return
    if (!window.api?.fs?.write) return

    const flushSnapshot = async () => {
      if (writingRef.current) {
        pendingFlushRef.current = true
        return
      }
      writingRef.current = true
      pendingFlushRef.current = false

      try {
        const appState = useApp.getState()
        const canvasState = useCanvas.getState()
        const workspaceState = useWorkspaces.getState()

        const snapshot = buildWorkspaceRuntimeSnapshot({
          notes: appState.notes,
          openNoteIds: appState.openNoteIds,
          activeNoteId: appState.activeNoteId,
          codes: appState.codes,
          openCodeIds: appState.openCodeIds,
          activeCodeId: appState.activeCodeId,
          tasks: appState.tasks,
          reminders: appState.reminders,
          folders: appState.folders,
          canvases: canvasState.canvases,
          activeCanvasId: canvasState.activeCanvasId,
          workspaces: workspaceState.workspaces,
          activeWorkspaceId: workspaceState.activeWorkspaceId,
        })

        const nextFingerprint = buildWorkspaceRuntimeFingerprint(snapshot)
        if (nextFingerprint === lastFingerprintRef.current) {
          return
        }

        const now = Date.now()
        const minIntervalRemaining = AUTOSYNC_MIN_INTERVAL_MS - (now - lastWriteAtRef.current)
        if (minIntervalRemaining > 0) {
          window.setTimeout(() => {
            pendingFlushRef.current = true
            flushSnapshot().catch((error) => {
              console.warn('[workspace-runtime] delayed flush failed', error)
            })
          }, minIntervalRemaining)
          return
        }

        const result = await writeWorkspaceRuntimeSnapshot(rootPath, snapshot, window.api?.fs)
        if (!result.ok) {
          console.warn('[workspace-runtime] write failed', result.error)
          return
        }

        lastFingerprintRef.current = nextFingerprint
        lastWriteAtRef.current = Date.now()
      } catch (error) {
        console.warn('[workspace-runtime] flush failed', error)
      } finally {
        writingRef.current = false
        if (pendingFlushRef.current) {
          flushSnapshot().catch((error) => {
            console.warn('[workspace-runtime] follow-up flush failed', error)
          })
        }
      }
    }

    const schedule = () => {
      if (writeTimerRef.current) {
        window.clearTimeout(writeTimerRef.current)
      }
      writeTimerRef.current = window.setTimeout(() => {
        writeTimerRef.current = null
        flushSnapshot().catch((error) => {
          console.warn('[workspace-runtime] scheduled flush failed', error)
        })
      }, AUTOSYNC_DEBOUNCE_MS)
    }

    const unsubscribers = [
      useApp.subscribe(schedule),
      useCanvas.subscribe(schedule),
      useWorkspaces.subscribe(schedule),
    ]

    schedule()

    return () => {
      if (writeTimerRef.current) {
        window.clearTimeout(writeTimerRef.current)
        writeTimerRef.current = null
      }
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
    }
  }, [autoSync, bootHydratedRoot, rootPath])
}
