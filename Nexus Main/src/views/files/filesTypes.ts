import { FileText, Code2, CheckSquare, Bell, PenSquare } from 'lucide-react'
import type React from 'react'

export const ICONS = ['🏠','💼','🚀','🎨','📚','🔬','🎮','💡','⚡','🌊','🎯','🔥','✨','🌿','💎','🎵']
export const COLORS = ['#007AFF','#5E5CE6','#FF453A','#FF9F0A','#30D158','#00C7BE','#BF5AF2','#FF6B9E','#64D2FF','#FFD60A']

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

export const TYPE_META: Record<ItemType, { icon: React.FC<any>; color: string; label: string }> = {
  note: { icon: FileText, color: '#007AFF', label: 'Note' },
  code: { icon: Code2, color: '#BF5AF2', label: 'Code' },
  task: { icon: CheckSquare, color: '#FF9F0A', label: 'Task' },
  reminder: { icon: Bell, color: '#FF453A', label: 'Reminder' },
  canvas: { icon: PenSquare, color: '#30D158', label: 'Canvas' },
}
