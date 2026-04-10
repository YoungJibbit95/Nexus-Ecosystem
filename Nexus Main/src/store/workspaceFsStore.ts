import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const WORKSPACE_EXPORT_DIRNAME = 'Nexus Workspace'

interface WorkspaceFsState {
  rootPath: string
  autoSync: boolean
  bootHydratedRoot: string | null
  setRootPath: (path: string) => void
  clearRootPath: () => void
  setAutoSync: (enabled: boolean) => void
  markBootHydrated: (path: string) => void
}

const normalizeRootPath = (value: string) => value.trim().replace(/[\\/]+$/, '')

export const useWorkspaceFs = create<WorkspaceFsState>()(
  persist(
    (set) => ({
      rootPath: '',
      autoSync: true,
      bootHydratedRoot: null,
      setRootPath: (path) => set({ rootPath: normalizeRootPath(path) }),
      clearRootPath: () => set({ rootPath: '', bootHydratedRoot: null }),
      setAutoSync: (enabled) => set({ autoSync: Boolean(enabled) }),
      markBootHydrated: (path) =>
        set({
          bootHydratedRoot: normalizeRootPath(path),
        }),
    }),
    {
      name: 'nx-workspace-fs-v1',
      partialize: (state) => ({
        rootPath: state.rootPath,
        autoSync: state.autoSync,
      }),
    },
  ),
)

export { WORKSPACE_EXPORT_DIRNAME }
