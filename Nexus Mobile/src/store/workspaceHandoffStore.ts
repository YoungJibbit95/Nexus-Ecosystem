import { createWithEqualityFn as create } from 'zustand/traditional'
import { persist } from 'zustand/middleware'

type WorkspaceHandoffMode = 'manual-runtime'
type HandoffRiskLevel = 'low' | 'medium' | 'high'
type HandoffConfidence = 'fresh' | 'recent' | 'stale'

type HandoffCounts = {
  notes: number
  codes: number
  tasks: number
  reminders: number
  canvases: number
  workspaces: number
}

type HandoffCheckpointState = {
  notes: any[]
  openNoteIds: string[]
  activeNoteId: string | null
  codes: any[]
  openCodeIds: string[]
  activeCodeId: string | null
  tasks: any[]
  reminders: any[]
  folders: any[]
  canvases: any[]
  activeCanvasId: string | null
  workspaces: any[]
  activeWorkspaceId: string | null
}

type HandoffCheckpoint = {
  savedAt: string
  state: HandoffCheckpointState
}

interface WorkspaceHandoffStore {
  mode: WorkspaceHandoffMode
  lastAction: string | null
  lastActionAt: string | null
  lastSourceApp: string | null
  lastExportedAt: string | null
  lastSnapshotAgeMinutes: number | null
  lastCounts: HandoffCounts | null
  lastRiskLevel: HandoffRiskLevel | null
  confidence: HandoffConfidence
  checkpoint: HandoffCheckpoint | null
  recordAction: (
    action: string,
    meta?: {
      sourceApp?: string | null
      exportedAt?: string | null
      snapshotAgeMinutes?: number | null
      counts?: HandoffCounts | null
      riskLevel?: HandoffRiskLevel | null
    },
  ) => void
  saveCheckpoint: (state: HandoffCheckpointState) => void
  clearCheckpoint: () => void
}

const getConfidence = (snapshotAgeMinutes: number | null): HandoffConfidence => {
  if (snapshotAgeMinutes == null) return 'recent'
  if (snapshotAgeMinutes <= 120) return 'fresh'
  if (snapshotAgeMinutes <= 24 * 60) return 'recent'
  return 'stale'
}

export const useWorkspaceHandoff = create<WorkspaceHandoffStore>()(
  persist(
    (set) => ({
      mode: 'manual-runtime',
      lastAction: null,
      lastActionAt: null,
      lastSourceApp: null,
      lastExportedAt: null,
      lastSnapshotAgeMinutes: null,
      lastCounts: null,
      lastRiskLevel: null,
      confidence: 'recent',
      checkpoint: null,
      recordAction: (action, meta) =>
        set((state) => {
          const nextAge = meta?.snapshotAgeMinutes ?? state.lastSnapshotAgeMinutes ?? null
          return {
            lastAction: action.trim() || 'Unbekannte Aktion',
            lastActionAt: new Date().toISOString(),
            lastSourceApp: meta?.sourceApp ?? state.lastSourceApp,
            lastExportedAt: meta?.exportedAt ?? state.lastExportedAt,
            lastSnapshotAgeMinutes: nextAge,
            lastCounts: meta?.counts ?? state.lastCounts,
            lastRiskLevel: meta?.riskLevel ?? state.lastRiskLevel,
            confidence: getConfidence(nextAge),
          }
        }),
      saveCheckpoint: (state) =>
        set({
          checkpoint: {
            savedAt: new Date().toISOString(),
            state,
          },
        }),
      clearCheckpoint: () => set({ checkpoint: null }),
    }),
    {
      name: 'nx-workspace-handoff-v1',
      partialize: (state) => ({
        mode: state.mode,
        lastAction: state.lastAction,
        lastActionAt: state.lastActionAt,
        lastSourceApp: state.lastSourceApp,
        lastExportedAt: state.lastExportedAt,
        lastSnapshotAgeMinutes: state.lastSnapshotAgeMinutes,
        lastCounts: state.lastCounts,
        lastRiskLevel: state.lastRiskLevel,
        confidence: state.confidence,
      }),
    },
  ),
)
