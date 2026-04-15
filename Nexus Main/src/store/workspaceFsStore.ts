import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const WORKSPACE_EXPORT_DIRNAME = 'Nexus Workspace'

interface WorkspaceFsState {
  rootPath: string
  autoSync: boolean
  bootHydratedRoot: string | null
  lastSyncAt: string | null
  lastSyncMode: 'import' | 'export' | 'runtime-import' | 'runtime-export' | null
  setRootPath: (path: string) => void
  clearRootPath: () => void
  setAutoSync: (enabled: boolean) => void
  markBootHydrated: (path: string) => void
  markSync: (mode: 'import' | 'export' | 'runtime-import' | 'runtime-export') => void
}

const normalizeRootPath = (value: string) => value.trim().replace(/[\\/]+$/, '')

export const useWorkspaceFs = create<WorkspaceFsState>()(
  persist(
    (set) => ({
      rootPath: '',
      autoSync: true,
      bootHydratedRoot: null,
      lastSyncAt: null,
      lastSyncMode: null,
      setRootPath: (path) => set({ rootPath: normalizeRootPath(path) }),
      clearRootPath: () => set({
        rootPath: '',
        bootHydratedRoot: null,
      }),
      setAutoSync: (enabled) => set({ autoSync: Boolean(enabled) }),
      markBootHydrated: (path) =>
        set({
          bootHydratedRoot: normalizeRootPath(path),
        }),
      markSync: (mode) =>
        set({
          lastSyncAt: new Date().toISOString(),
          lastSyncMode: mode,
        }),
    }),
    {
      name: 'nx-workspace-fs-v1',
      partialize: (state) => ({
        rootPath: state.rootPath,
        autoSync: state.autoSync,
        lastSyncAt: state.lastSyncAt,
        lastSyncMode: state.lastSyncMode,
      }),
    },
  ),
)

export { WORKSPACE_EXPORT_DIRNAME }
