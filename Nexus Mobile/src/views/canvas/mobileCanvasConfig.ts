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
import type { LucideIcon } from 'lucide-react'
import type { NodeType, ProjectPriority, ProjectStatus } from '../../store/canvasStore'

export type MobileCanvasWidgetType = NodeType | 'sticky'
export type MobileCanvasWidgetCategory = 'Capture' | 'Execution' | 'Planning' | 'Control'
export type MobileCanvasWidgetPreset = {
  type: MobileCanvasWidgetType
  icon: LucideIcon
  label: string
  description: string
  category: MobileCanvasWidgetCategory
  accent: string
}

export const NODE_COLORS = [
  '#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE',
  '#00C7BE', '#FF2D55', '#5856D6', '#FFCC00', '#64D2FF',
  '#FF6B35', '#30D158', '#BF5AF2', '#FF6B9E', '#FFE600',
]

export const WIDGET_TYPES: MobileCanvasWidgetPreset[] = [
  {
    type: 'text',
    icon: Type,
    label: 'Text',
    description: 'Kurznotizen, Ideen und Freitext',
    category: 'Capture',
    accent: '#5B8CFF',
  },
  {
    type: 'markdown',
    icon: FileText,
    label: 'Markdown',
    description: 'Formatierte Docs mit Listen und Tabellen',
    category: 'Capture',
    accent: '#7D6BFF',
  },
  {
    type: 'checklist',
    icon: CheckSquare,
    label: 'Checklist',
    description: 'To-dos mit erledigt-Status',
    category: 'Execution',
    accent: '#30D158',
  },
  {
    type: 'image',
    icon: Image,
    label: 'Bild',
    description: 'Screenshots, Mockups und Referenzen',
    category: 'Capture',
    accent: '#64D2FF',
  },
  {
    type: 'code',
    icon: Code,
    label: 'Code',
    description: 'Snippet mit Highlighting und Sprache',
    category: 'Execution',
    accent: '#4E8BFF',
  },
  {
    type: 'sticky',
    icon: StickyNote,
    label: 'Sticky',
    description: 'Farbige Haftnotiz für schnelle Gedanken',
    category: 'Capture',
    accent: '#FFCC00',
  },
  {
    type: 'note',
    icon: FileText,
    label: 'Notiz',
    description: 'Lange Notizen mit strukturiertem Inhalt',
    category: 'Capture',
    accent: '#58C4FF',
  },
  {
    type: 'codefile',
    icon: Code,
    label: 'Code-Datei',
    description: 'Größerer Codeblock mit Dateifokus',
    category: 'Execution',
    accent: '#1A7BFF',
  },
  {
    type: 'task',
    icon: CheckSquare,
    label: 'Aufgabe',
    description: 'Umsetzbare Arbeit mit Status und Progress',
    category: 'Execution',
    accent: '#32D74B',
  },
  {
    type: 'reminder',
    icon: Bell,
    label: 'Reminder',
    description: 'Erinnerung mit Datum und Owner',
    category: 'Execution',
    accent: '#FF9F0A',
  },
  {
    type: 'project',
    icon: FileText,
    label: 'Projekt',
    description: 'Projekt-Container mit Scope und KPI',
    category: 'Planning',
    accent: '#00C7BE',
  },
  {
    type: 'goal',
    icon: Sun,
    label: 'Goal',
    description: 'Zieldefinition mit Outcome-Fokus',
    category: 'Planning',
    accent: '#FFD60A',
  },
  {
    type: 'milestone',
    icon: Flag,
    label: 'Milestone',
    description: 'Lieferpunkt mit klarer Definition of Done',
    category: 'Planning',
    accent: '#FF6B35',
  },
  {
    type: 'decision',
    icon: GitBranch,
    label: 'Decision',
    description: 'Entscheidung mit Optionen und Trade-offs',
    category: 'Control',
    accent: '#AF52DE',
  },
  {
    type: 'risk',
    icon: AlertCircle,
    label: 'Risk',
    description: 'Risiko mit Impact und Mitigation',
    category: 'Control',
    accent: '#FF453A',
  },
]

export const MOBILE_WIDGET_TYPE_BY_ID: Record<MobileCanvasWidgetType, MobileCanvasWidgetPreset> =
  WIDGET_TYPES.reduce(
    (acc, widget) => {
      acc[widget.type] = widget
      return acc
    },
    {} as Record<MobileCanvasWidgetType, MobileCanvasWidgetPreset>,
  )

export const getWidgetPreset = (type: MobileCanvasWidgetType) =>
  MOBILE_WIDGET_TYPE_BY_ID[type]

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
