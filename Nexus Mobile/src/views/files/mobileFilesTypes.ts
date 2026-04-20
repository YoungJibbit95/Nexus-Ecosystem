import { Bell, CheckSquare, Code2, FileText, PenSquare } from 'lucide-react'
import type { FC } from 'react'
import type { CodeFile, Note, Reminder, Task } from '../../store/appStore'
import type { Workspace } from '../../store/workspaceStore'

export const MOBILE_FILE_WORKSPACE_ICONS = ['🏠','💼','🚀','🎨','📚','🔬','🎮','💡','⚡','🌊','🎯','🔥','✨','🌿','💎','🎵']
export const MOBILE_FILE_WORKSPACE_COLORS = ['#007AFF','#5E5CE6','#FF453A','#FF9F0A','#30D158','#00C7BE','#BF5AF2','#FF6B9E','#64D2FF','#FFD60A']

export type ItemType = 'note'|'code'|'task'|'reminder'|'canvas'
export type ViewMode = 'grid'|'list'
export type SmartViewMode = 'all' | 'workspace' | 'recent' | 'pinned' | 'unassigned'

export interface FileItem {
  id: string
  title: string
  type: ItemType
  updated: string
  preview?: string
  tags?: string[]
  lang?: string
  priority?: string
  status?: string
  folderId?: string | null
  pinned?: boolean
}

export type WorkspaceRuntimeSnapshot = {
  version: 1
  exportedAt: string
  app: string
  state: {
    notes: Note[]
    openNoteIds: string[]
    activeNoteId: string | null
    codes: CodeFile[]
    openCodeIds: string[]
    activeCodeId: string | null
    tasks: Task[]
    reminders: Reminder[]
    folders: any[]
    canvases: any[]
    activeCanvasId: string | null
    workspaces: Workspace[]
    activeWorkspaceId: string | null
  }
}

export const TYPE_META: Record<ItemType, { icon: FC<any>; color: string; label: string }> = {
  note:     { icon: FileText,    color: '#007AFF', label: 'Note' },
  code:     { icon: Code2,       color: '#BF5AF2', label: 'Code' },
  task:     { icon: CheckSquare, color: '#FF9F0A', label: 'Task' },
  reminder: { icon: Bell,        color: '#FF453A', label: 'Reminder' },
  canvas:   { icon: PenSquare,   color: '#30D158', label: 'Canvas' },
}

export const parseRuntimeSnapshot = (raw: string): WorkspaceRuntimeSnapshot | null => {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (Number((parsed as any).version || 0) !== 1) return null
    const state = (parsed as any).state
    if (!state || typeof state !== 'object') return null
    return parsed as WorkspaceRuntimeSnapshot
  } catch {
    return null
  }
}
