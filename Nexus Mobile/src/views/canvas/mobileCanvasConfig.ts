import {
  AlertCircle,
  Bell,
  CheckSquare,
  Code,
  FileText,
  Flag,
  GitBranch,
  Image,
  StickyNote,
  Sun,
  Type,
} from 'lucide-react'
import type { NodeType, ProjectPriority, ProjectStatus } from '../../store/canvasStore'

export const NODE_COLORS = [
  '#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE',
  '#00C7BE', '#FF2D55', '#5856D6', '#FFCC00', '#64D2FF',
  '#FF6B35', '#30D158', '#BF5AF2', '#FF6B9E', '#FFE600',
]

export const WIDGET_TYPES: { type: NodeType | 'sticky'; icon: any; label: string }[] = [
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'markdown', icon: FileText, label: 'Markdown' },
  { type: 'checklist', icon: CheckSquare, label: 'Checklist' },
  { type: 'image', icon: Image, label: 'Bild' },
  { type: 'code', icon: Code, label: 'Code' },
  { type: 'sticky', icon: StickyNote, label: 'Sticky' },
  { type: 'note', icon: FileText, label: 'Notiz' },
  { type: 'codefile', icon: Code, label: 'Code-Datei' },
  { type: 'task', icon: CheckSquare, label: 'Aufgabe' },
  { type: 'reminder', icon: Bell, label: 'Reminder' },
  { type: 'project', icon: FileText, label: 'Projekt' },
  { type: 'goal', icon: Sun, label: 'Goal' },
  { type: 'milestone', icon: Flag, label: 'Milestone' },
  { type: 'decision', icon: GitBranch, label: 'Decision' },
  { type: 'risk', icon: AlertCircle, label: 'Risk' },
]

export const PM_STATUS_ORDER: ProjectStatus[] = ['idea', 'backlog', 'todo', 'doing', 'review', 'done', 'blocked']

export const PM_STATUS_COLOR: Record<ProjectStatus, string> = {
  idea: '#64D2FF',
  backlog: '#5E5CE6',
  todo: '#007AFF',
  doing: '#FF9F0A',
  review: '#BF5AF2',
  done: '#30D158',
  blocked: '#FF453A',
}

export const PM_PRIORITY_COLOR: Record<ProjectPriority, string> = {
  low: '#30D158',
  mid: '#FFD60A',
  high: '#FF9F0A',
  critical: '#FF453A',
}

export const CANVAS_NODE_OVERSCAN_PX = 680
export const CANVAS_NODE_OVERSCAN_MAX_PX = 2200
