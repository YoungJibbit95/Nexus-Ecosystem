import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Link2,
  Plus,
  Search,
  Settings2,
  Upload,
  X,
} from 'lucide-react'
import { PlanningPanel } from '@nexus/core/planning/PlanningPanel'
import { PlanningIcsPanel } from '@nexus/core/planning/PlanningIcsPanel'
import { TaskContextLinks } from '@nexus/core/planning/TaskContextLinks'
import {
  taskRevision,
  zonedDate,
  type PlanningBlock,
  type TaskRecord,
} from '@nexus/core/planning/domain'
import {
  planningDayHorizon,
  planningInstantToLocal,
} from '@nexus/core/planning/planningTime'
import { selectPlanningToday } from '@nexus/core/planning/today'
import { usePlanningNavigation } from '@nexus/core/planning/planningNavigation'
import { requestEntityNavigation } from '@nexus/core/planning/entityNavigation'
import type { EntityCatalog, EntityRef } from '@nexus/core/planning/entityLinks'
import type {
  PlanningCommand,
  PlanningCommandResult,
} from '@nexus/core/planning/commandService'
import { Glass } from '../../components/Glass'
import { useApp } from '../../store/appStore'
import { useCanvas } from '../../store/canvasStore'
import { useTheme } from '../../store/themeStore'
import {
  planningCommands,
  usePlanning,
  usePlanningError,
} from '../../store/planningStore'
import {
  isViewCommandScopeActive,
  useActiveViewCommandScope,
} from '../../app/ViewCommandScope'
import { agendaMessage } from './agendaMessages'
import './mainAgendaWorkspace.css'

type EditorIntent = {
  mode: 'task' | 'event' | 'schedule' | 'availability'
  taskId?: string
  localStart?: string
  initialTitle?: string
  blockId?: string
  requestId: string
}
type Feedback = {
  message: string
  result: PlanningCommandResult | null
  error: boolean
}
export type MainAgendaWorkspaceProps = {
  selectedDay?: string
  initialTaskId?: string
  initialStart?: string
  onDayChange?: (day: string) => void
  onOpenTask?: (id: string) => void
  setView?: (view: string) => void
  viewSwitcher?: React.ReactNode
  quickEntry?: React.ReactNode
  importRequest?: number
  navigationCursor?: React.MutableRefObject<string>
  importCursor?: React.MutableRefObject<number>
}
const civilDate = (day: string) => new Date(`${day}T12:00:00Z`)
const shiftDay = (day: string, offset: number) => {
  const date = civilDate(day)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
const dateLabel = (day: string, options: Intl.DateTimeFormatOptions) =>
  civilDate(day).toLocaleDateString('de-DE', { ...options, timeZone: 'UTC' })

export function MainAgendaWorkspace(props: MainAgendaWorkspaceProps) {
  const theme = useTheme(),
    activeScope = useActiveViewCommandScope()
  const tasks = useApp((state) => state.tasks) as unknown as TaskRecord[],
    reminders = useApp((state) => state.reminders)
  const notes = useApp((state) => state.notes),
    canvases = useCanvas((state) => state.canvases)
  const planning = usePlanning(),
    storageError = usePlanningError(),
    navigation = usePlanningNavigation('main')
  const [zone, setZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  )
  const timeZones = useMemo(
    () =>
      [
        ...new Set([
          zone,
          'UTC',
          ...((
            Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
          ).supportedValuesOf?.('timeZone') || [
            'Europe/Berlin',
            'Europe/London',
            'America/New_York',
            'Asia/Tokyo',
          ]),
        ]),
      ].sort(),
    [zone],
  )
  const [localDay, setLocalDay] = useState(
    props.selectedDay || zonedDate(new Date().toISOString(), zone),
  )
  const day = props.selectedDay || localDay
  const [tool, setTool] = useState<
    'day' | 'import' | 'links' | 'settings' | 'quick'
  >('day')
  const [taskFilter, setTaskFilter] = useState<'today' | 'open'>('today'),
    [search, setSearch] = useState(''),
    [history, setHistory] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false),
    [editorIntent, setEditorIntent] = useState<EditorIntent>({
      mode: 'schedule',
      requestId: '',
    })
  const [editorFeedback, setEditorFeedback] = useState<Feedback>({
      message: '',
      result: null,
      error: false,
    }),
    [feedback, setFeedback] = useState<Feedback>({
      message: '',
      result: null,
      error: false,
    })
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [stopReminderIds, setStopReminderIds] = useState<string[]>([]),
    [contextTaskId, setContextTaskId] = useState('')
  const lastCompletion = useRef<PlanningCommand | null>(null),
    editorRef = useRef<HTMLElement>(null),
    openerRef = useRef<HTMLElement | null>(null)
  const localNavigationCursor = useRef(''),
    navigationCursor = props.navigationCursor || localNavigationCursor
  const localImportCursor = useRef(0),
    importCursor = props.importCursor || localImportCursor
  const catalog = { notes, canvases } as unknown as EntityCatalog
  useEffect(() => {
    void planningCommands
      .ready()
      .then(() => setReady(true))
      .catch((error) =>
        setFeedback({ message: String(error), result: null, error: true }),
      )
  }, [])
  const setDay = (value: string) => {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(civilDate(value).getTime())
    )
      return
    setLocalDay(value)
    props.onDayChange?.(value)
  }
  const openEditor = (intent: Omit<EditorIntent, 'requestId'>) => {
    const focused = document.activeElement as HTMLElement
    openerRef.current =
      focused?.closest('.nx-agenda-workspace') && focused.checkVisibility()
        ? focused
        : document.querySelector<HTMLElement>(
            '.nx-agenda-workspace [data-agenda-open-editor]',
          )
    setFeedback({ message: '', result: null, error: false })
    setEditorIntent({ ...intent, requestId: crypto.randomUUID() })
    setEditorOpen(true)
  }
  useEffect(() => {
    if (navigation && navigationCursor.current !== navigation.requestId) {
      navigationCursor.current = navigation.requestId
      openerRef.current = document.querySelector<HTMLElement>(
        '.nx-agenda-workspace [data-agenda-open-editor]',
      )
      setFeedback({ message: '', result: null, error: false })
      setEditorIntent({ ...navigation, mode: navigation.mode || 'schedule' })
      setEditorOpen(true)
      setTool('day')
    } else if (!navigation && props.initialTaskId)
      openEditor({
        mode: 'schedule',
        taskId: props.initialTaskId,
        localStart: props.initialStart,
      })
  }, [navigation?.requestId, props.initialTaskId, props.initialStart])
  useEffect(() => {
    if (props.importRequest && importCursor.current !== props.importRequest) {
      importCursor.current = props.importRequest
      setTool('import')
      setEditorOpen(false)
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLTextAreaElement>(
            '.nx-agenda-workspace .nx-planning-ics textarea',
          )
          ?.focus(),
      )
    }
  }, [props.importRequest])
  const openTool = (value: typeof tool) => {
    setTool(value)
    if (value === 'import')
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLTextAreaElement>(
            '.nx-agenda-workspace .nx-planning-ics textarea',
          )
          ?.focus(),
      )
  }
  useEffect(() => {
    if (!editorOpen || !activeScope) return
    const editor = editorRef.current
    if (!editor) return
    const controls = () =>
      [
        ...editor.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)',
        ),
      ].filter((item) => item.checkVisibility())
    const keydown = (event: KeyboardEvent) => {
      if (
        !isViewCommandScopeActive(activeScope) ||
        event.defaultPrevented ||
        event.isComposing
      )
        return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setEditorOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const items = controls(),
        first = items[0],
        last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    const focus = (event: FocusEvent) => {
      if (
        isViewCommandScopeActive(activeScope) &&
        !editor.contains(event.target as Node)
      )
        controls()[0]?.focus()
    }
    const frame = requestAnimationFrame(() =>
      editor
        .querySelector<HTMLElement>(
          'form input:not([type="checkbox"]),form select',
        )
        ?.focus(),
    )
    editor.addEventListener('keydown', keydown)
    document.addEventListener('focusin', focus)
    return () => {
      cancelAnimationFrame(frame)
      editor.removeEventListener('keydown', keydown)
      document.removeEventListener('focusin', focus)
      if (openerRef.current?.isConnected && openerRef.current.checkVisibility())
        openerRef.current.focus()
    }
  }, [editorOpen, activeScope, editorIntent.requestId])
  const derived = useMemo(() => {
    try {
      return {
        today: selectPlanningToday({
          tasks,
          reminders,
          planning,
          day,
          timeZone: zone,
          horizon: planningDayHorizon(day, zone),
          now: new Date().toISOString(),
        }),
        error: '',
      }
    } catch (error) {
      return { today: null, error: String(error) }
    }
  }, [tasks, reminders, planning, day, zone])
  const today = derived.today
  const unscheduled = tasks.filter(
    (task) =>
      task.status !== 'done' &&
      !planning.blocks.some(
        (block) =>
          block.taskId === task.id &&
          block.state === 'active' &&
          Date.parse(block.end) > Date.now(),
      ),
  )
  const listedTasks = (
    taskFilter === 'today'
      ? today?.tasks.map((item) => item.task) || []
      : unscheduled
  ).filter((task) =>
    task.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  )
  const contextTask =
    tasks.find((task) => task.id === contextTaskId) || tasks[0]
  const time = (instant: string) => {
    try {
      const value = planningInstantToLocal(instant, zone)
      return `${value.slice(0, 10) === day ? '' : `${value.slice(8, 10)}.${value.slice(5, 7)}. `}${value.slice(11, 16)}`
    } catch {
      return instant
    }
  }
  const deadline = (value: string) => {
    try {
      return /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? dateLabel(value, { day: 'numeric', month: 'short', year: 'numeric' })
        : new Date(value).toLocaleString('de-DE', {
            timeZone: zone,
            dateStyle: 'medium',
            timeStyle: 'short',
          })
    } catch {
      return value
    }
  }
  const move = (block: PlanningBlock) => {
    setZone(block.timeZone)
    openEditor({
      mode: 'schedule',
      taskId: block.taskId,
      blockId: block.id,
      localStart: planningInstantToLocal(block.start, block.timeZone),
    })
  }
  const execute = async (command: PlanningCommand) => {
    setBusy(true)
    setEditorFeedback({ message: '', result: null, error: false })
    setFeedback({ message: 'Wird gespeichert …', result: null, error: false })
    try {
      const result = await planningCommands.execute(command)
      setFeedback({
        message: result.ok === true ? 'Dauerhaft gespeichert.' : result.message,
        result,
        error: !result.ok,
      })
      return result
    } catch (error) {
      setFeedback({ message: String(error), result: null, error: true })
      return null
    } finally {
      setBusy(false)
    }
  }
  const complete = (task: TaskRecord) => {
    const command: PlanningCommand = {
      kind: 'complete-task',
      key: crypto.randomUUID(),
      expected: {
        generation: planning.generation,
        revision: planning.revision,
        taskRevision: taskRevision(task),
      },
      taskId: task.id,
      stopAttachedReminderIds: stopReminderIds.filter((id) =>
        reminders.some(
          (reminder) => reminder.id === id && reminder.linkedTaskId === task.id,
        ),
      ),
    }
    lastCompletion.current = command
    void execute(command)
  }
  const openEntity = (ref: EntityRef) => {
    requestEntityNavigation('main', ref)
    props.setView?.(ref.kind === 'note' ? 'notes' : 'canvas')
  }
  const scheduled = [
    ...(today?.events || []).map((event) => ({
      id: event.id,
      kind: 'event' as const,
      title: event.title,
      start: event.start,
      end: event.end,
    })),
    ...(today?.blocks || [])
      .filter((block) => block.state === (history ? 'inactive' : 'active'))
      .map((block) => ({
        id: block.id,
        kind: 'block' as const,
        title:
          tasks.find((task) => task.id === block.taskId)?.title ||
          'Aufgabe nicht mehr vorhanden',
        start: block.start,
        end: block.end,
        block,
      })),
    ...(today?.reminderPoints || []).map((reminder) => ({
      id: reminder.occurrenceId,
      kind: 'reminder' as const,
      title: reminder.title,
      start: reminder.snoozeUntil || reminder.datetime,
      overdue: reminder.overdue,
    })),
  ]
    .filter((item) => !history || item.kind === 'block')
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const weekStart = shiftDay(day, -((civilDate(day).getUTCDay() + 6) % 7))
  const messageText = (value: string) => agendaMessage(value, planning, tasks)
  const status = feedback.message ? feedback : editorFeedback
  return (
    <section
      className="nx-agenda-workspace"
      data-theme={theme.mode}
      style={{ '--nx-agenda-accent': theme.accent } as React.CSSProperties}
      aria-label="Agenda Arbeitsfläche"
    >
      <header className="nx-agenda-header">
        <div>
          <span className="nx-agenda-eyebrow">
            <Calendar size={15} /> DEIN TAG
          </span>
          <h1>Agenda</h1>
          <p>Termine im Blick. Aufgaben in Zeit verwandeln.</p>
        </div>
        <div className="nx-agenda-header-controls">
          {props.viewSwitcher}
          <button
            className="nx-agenda-button"
            type="button"
            onClick={() => setTool('settings')}
            aria-label="Agenda-Einstellungen"
          >
            <Settings2 size={17} />
          </button>
        </div>
      </header>
      <div className="nx-agenda-datebar">
        <div className="nx-agenda-date-navigation">
          <button
            type="button"
            aria-label="Vorheriger Tag"
            onClick={() => setDay(shiftDay(day, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setDay(zonedDate(new Date().toISOString(), zone))}
          >
            Heute
          </button>
          <button
            type="button"
            aria-label="Naechster Tag"
            onClick={() => setDay(shiftDay(day, 1))}
          >
            <ChevronRight size={18} />
          </button>
          <h2>
            {dateLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          <input
            type="date"
            aria-label="Agenda-Tag"
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </div>
        <div className="nx-agenda-create-actions">
          <button
            className="nx-agenda-button nx-agenda-button--primary"
            type="button"
            data-agenda-open-editor
            onClick={() =>
              openEditor({ mode: 'schedule', localStart: `${day}T09:00` })
            }
          >
            <Plus size={16} />
            Zeit einplanen
          </button>
          <button
            className="nx-agenda-button"
            type="button"
            onClick={() =>
              openEditor({ mode: 'event', localStart: `${day}T09:00` })
            }
          >
            <Calendar size={16} />
            Neuer Termin
          </button>
          <button
            className="nx-agenda-button"
            type="button"
            onClick={() => openEditor({ mode: 'task' })}
          >
            <Plus size={16} />
            Neue Aufgabe
          </button>
        </div>
      </div>
      <nav className="nx-agenda-week" aria-label="Agenda-Woche">
        {Array.from({ length: 7 }, (_, index) =>
          shiftDay(weekStart, index),
        ).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === day}
            onClick={() => setDay(value)}
          >
            <span>{dateLabel(value, { weekday: 'short' })}</span>
            <strong>{civilDate(value).getUTCDate()}</strong>
            <small>{dateLabel(value, { month: 'short' })}</small>
          </button>
        ))}
      </nav>
      <div className="nx-agenda-overview">
        {[
          {
            label: 'Termine',
            count: today?.events.length || 0,
            Icon: Calendar,
          },
          {
            label: 'Fokuszeiten',
            count:
              today?.blocks.filter((block) => block.state === 'active')
                .length || 0,
            Icon: Clock,
          },
          {
            label: 'Aufgaben für den Tag',
            count: today?.openTaskCount || 0,
            Icon: CheckCircle2,
          },
          {
            label: 'Erinnerungen',
            count: today?.reminderCount || 0,
            Icon: Bell,
          },
        ].map(({ label, count, Icon }) => (
          <div key={label}>
            <Icon size={18} />
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div
        className={`nx-agenda-coverage ${today?.coverage === 'complete' ? 'is-confirmed' : ''}`}
        role="status"
      >
        <span>
          {today?.coverage === 'complete' ? (
            <CheckCircle2 size={16} />
          ) : (
            <Calendar size={16} />
          )}
          <strong>
            {today?.coverage === 'complete'
              ? 'Kalenderdaten bestätigt'
              : 'Kalenderdaten unvollständig'}
          </strong>
          {today?.coverage !== 'complete' && (
            <span>Leere Zeit ist noch keine bestätigte freie Zeit.</span>
          )}
        </span>
        <button
          type="button"
          onClick={() =>
            openEditor({ mode: 'availability', localStart: `${day}T09:00` })
          }
        >
          Verfügbarkeit festlegen
        </button>
      </div>
      {(storageError ||
        derived.error ||
        (!editorOpen && status.message) ||
        feedback.message) && (
        <div
          className="nx-agenda-feedback"
          role={
            storageError || derived.error || status.error ? 'alert' : 'status'
          }
        >
          {messageText(storageError || derived.error || status.message)}
          {status.result?.ok === false &&
            status.result.issues?.map((issue, index) => (
              <p key={index}>{messageText(issue.message)}</p>
            ))}
          {status.result?.ok &&
            status.result.reminderStops?.map((stop) => (
              <p
                key={stop.id}
                role={stop.result.ok === true ? 'status' : 'alert'}
              >
                {stop.result.ok === true
                  ? 'Ausgewählte verbundene Erinnerung wurde zusätzlich gestoppt.'
                  : `Aufgabe dauerhaft abgeschlossen; Erinnerungsstopp noch unbestätigt: ${stop.result.message}`}
              </p>
            ))}
          {status.result?.ok &&
            status.result.reminderStops?.some((stop) => !stop.result.ok) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (lastCompletion.current)
                    void execute(lastCompletion.current)
                }}
              >
                Ausgewählte Erinnerungsstopps erneut versuchen
              </button>
            )}
        </div>
      )}
      <nav className="nx-agenda-tools" aria-label="Agenda-Bereiche">
        {(
          [
            { id: 'day', label: 'Tagesplan', Icon: Calendar },
            { id: 'import', label: 'Import', Icon: Upload },
            { id: 'links', label: 'Verknüpfungen', Icon: Link2 },
            { id: 'settings', label: 'Einstellungen', Icon: Settings2 },
            ...(props.quickEntry
              ? [{ id: 'quick', label: 'Schnelleintrag', Icon: Plus }]
              : []),
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tool === id}
            onClick={() => openTool(id as typeof tool)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>
      <div className="nx-agenda-content custom-scrollbar">
        <div className="nx-agenda-columns" hidden={tool !== 'day'}>
          <Glass
            className="nx-agenda-surface nx-agenda-timeline"
            performanceProfile="balanced"
          >
            <header className="nx-agenda-section-head">
              <div>
                <h3>Dein Tagesplan</h3>
                <p>Termine, Fokuszeiten und Erinnerungen — der Reihe nach.</p>
              </div>
              <div className="nx-agenda-segment">
                <button
                  type="button"
                  aria-pressed={!history}
                  onClick={() => setHistory(false)}
                >
                  Geplant
                </button>
                <button
                  type="button"
                  aria-pressed={history}
                  onClick={() => setHistory(true)}
                >
                  Verlauf
                </button>
              </div>
            </header>
            <div className="nx-agenda-timeline-list">
              {!scheduled.length && (
                <div className="nx-agenda-empty-state">
                  <Calendar size={34} />
                  <h4>
                    {history
                      ? 'Noch keine früheren Fokuszeiten'
                      : 'Dein Tagesplan beginnt hier'}
                  </h4>
                  <p>
                    {history
                      ? 'Nach dem Abschluss einer Aufgabe bleiben ihre Fokuszeiten hier erhalten.'
                      : 'Lege einen Termin an oder plane Zeit für eine Aufgabe ein. Erinnerungen erscheinen ebenfalls hier.'}
                  </p>
                  {!history && (
                    <button
                      className="nx-agenda-button nx-agenda-button--primary"
                      type="button"
                      onClick={() =>
                        openEditor({
                          mode: 'schedule',
                          localStart: `${day}T09:00`,
                        })
                      }
                    >
                      <Plus size={16} />
                      Erste Fokuszeit planen
                    </button>
                  )}
                </div>
              )}
              {scheduled.map((item) => (
                <article
                  className={`nx-agenda-time-entry is-${item.kind}${history ? ' is-history' : ''}`}
                  key={`${item.kind}-${item.id}`}
                >
                  <div className="nx-agenda-time">
                    <time dateTime={item.start}>{time(item.start)}</time>
                    {'end' in item && <small>{time(item.end)}</small>}
                  </div>
                  <span className="nx-agenda-entry-icon">
                    {item.kind === 'event' ? (
                      <Calendar size={18} />
                    ) : item.kind === 'block' ? (
                      <Clock size={18} />
                    ) : (
                      <Bell size={18} />
                    )}
                  </span>
                  <div className="nx-agenda-entry-body">
                    <span className="nx-agenda-kind">
                      {item.kind === 'event'
                        ? 'TERMIN'
                        : item.kind === 'block'
                          ? history
                            ? 'ABGESCHLOSSENE FOKUSZEIT'
                            : 'FOKUSZEIT'
                          : 'ERINNERUNG'}
                    </span>
                    <h4>{item.title}</h4>
                    <div className="nx-agenda-task-meta">
                      {item.kind === 'block' && (
                        <span>
                          {(Date.parse(item.end) - Date.parse(item.start)) /
                            60000}{' '}
                          Min.
                        </span>
                      )}
                      {item.kind === 'block' &&
                        item.block.acceptedIssues.length > 0 && (
                          <span>Mit bestätigtem Konflikt eingeplant</span>
                        )}
                      {item.kind === 'reminder' && item.overdue && (
                        <span>Fällig</span>
                      )}
                    </div>
                  </div>
                  {item.kind === 'block' &&
                    !history &&
                    tasks.find((task) => task.id === item.block.taskId)
                      ?.status !== 'done' && (
                      <button
                        className="nx-agenda-button"
                        type="button"
                        onClick={() => move(item.block)}
                      >
                        Zeit ändern
                      </button>
                    )}
                </article>
              ))}
            </div>
            {today?.issues.map((issue, index) => (
              <p className="nx-agenda-notice" key={index}>
                {messageText(issue.message)}
              </p>
            ))}
            {today?.unresolvedBlocks.length ? (
              <p role="alert">
                {today.unresolvedBlocks.length} Fokuszeiten haben keine
                zugehörige Aufgabe. Prüfe die Verknüpfungen.
              </p>
            ) : null}
          </Glass>
          <Glass
            className="nx-agenda-surface nx-agenda-task-panel"
            performanceProfile="balanced"
          >
            <header className="nx-agenda-section-head">
              <div>
                <h3>Deine Aufgaben</h3>
                <p>Wähle eine Aufgabe und gib ihr Zeit.</p>
              </div>
              <button
                className="nx-agenda-button"
                type="button"
                aria-label="Neue Aufgabe hinzufügen"
                onClick={() => openEditor({ mode: 'task' })}
              >
                <Plus size={17} />
              </button>
            </header>
            <div className="nx-agenda-segment">
              <button
                type="button"
                aria-pressed={taskFilter === 'today'}
                onClick={() => setTaskFilter('today')}
              >
                Für diesen Tag · {today?.openTaskCount || 0}
              </button>
              <button
                type="button"
                aria-pressed={taskFilter === 'open'}
                onClick={() => setTaskFilter('open')}
              >
                Noch zu planen · {unscheduled.length}
              </button>
            </div>
            <label className="nx-agenda-search">
              <Search size={15} />
              <input
                aria-label="Agenda-Aufgaben suchen"
                placeholder="Aufgabe suchen …"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="nx-agenda-task-list">
              {!listedTasks.length && (
                <div className="nx-agenda-empty-state">
                  <CheckCircle2 size={28} />
                  <h4>
                    {search
                      ? 'Keine passende Aufgabe'
                      : taskFilter === 'today'
                        ? 'Für diesen Tag ist nichts offen'
                        : 'Alles hat seinen Platz'}
                  </h4>
                  <p>
                    {taskFilter === 'today'
                      ? 'Unter „Noch zu planen“ findest du Aufgaben, für die noch keine Zeit reserviert ist.'
                      : 'Neue Aufgaben kannst du hier hinzufügen und anschließend einplanen.'}
                  </p>
                  {taskFilter === 'today' && (
                    <button
                      className="nx-agenda-button"
                      type="button"
                      onClick={() => setTaskFilter('open')}
                    >
                      Offene Aufgaben ansehen
                    </button>
                  )}
                </div>
              )}
              {listedTasks.map((task) => {
                const minutes =
                    task.durationMinutes ?? planning.durations[task.id],
                  blocked = Boolean(
                    task.blocked ||
                      task.dependsOnTaskIds?.some(
                        (id) =>
                          tasks.find((item) => item.id === id)?.status !==
                          'done',
                      ),
                  )
                return (
                  <article className="nx-agenda-task-card" key={task.id}>
                    <div className="nx-agenda-task-title">
                      <span
                        className={`nx-agenda-priority is-${task.priority || 'mid'}`}
                      >
                        {task.priority === 'high'
                          ? 'Hohe Priorität'
                          : task.priority === 'low'
                            ? 'Niedrige Priorität'
                            : 'Mittlere Priorität'}
                      </span>
                      {blocked && (
                        <span className="nx-agenda-blocked">Blockiert</span>
                      )}
                      <h4>{task.title}</h4>
                    </div>
                    <div className="nx-agenda-task-meta">
                      <span>
                        <Clock size={13} />
                        {minutes === undefined
                          ? 'Dauer nicht festgelegt'
                          : `${minutes} Min.`}
                      </span>
                      {task.deadline && (
                        <span>
                          <Calendar size={13} />
                          Frist: {deadline(task.deadline)}
                        </span>
                      )}
                    </div>
                    <div className="nx-agenda-task-actions">
                      <button
                        className="nx-agenda-button nx-agenda-button--accent"
                        type="button"
                        onClick={() =>
                          openEditor({
                            mode: 'schedule',
                            taskId: task.id,
                            localStart: `${day}T09:00`,
                          })
                        }
                      >
                        Planen
                      </button>
                      <button
                        className="nx-agenda-button"
                        type="button"
                        disabled={busy || !ready || Boolean(storageError)}
                        onClick={() => complete(task)}
                      >
                        <Check size={14} />
                        Abschließen
                      </button>
                      <button
                        className="nx-agenda-button"
                        type="button"
                        aria-label={`Verknüpfungen: ${task.title}`}
                        onClick={() => {
                          setContextTaskId(task.id)
                          setTool('links')
                        }}
                      >
                        <Link2 size={14} />
                      </button>
                      {props.onOpenTask && (
                        <button
                          className="nx-agenda-button"
                          type="button"
                          onClick={() => props.onOpenTask?.(task.id)}
                        >
                          Öffnen
                        </button>
                      )}
                    </div>
                    {reminders
                      .filter(
                        (reminder) =>
                          reminder.linkedTaskId === task.id && !reminder.done,
                      )
                      .map((reminder) => (
                        <label
                          className="nx-agenda-reminder-choice"
                          key={reminder.id}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Beim Abschluss Erinnerung stoppen: ${reminder.title}`}
                            checked={stopReminderIds.includes(reminder.id)}
                            disabled={busy}
                            onChange={(event) =>
                              setStopReminderIds((ids) =>
                                event.target.checked
                                  ? [...ids, reminder.id]
                                  : ids.filter((id) => id !== reminder.id),
                              )
                            }
                          />
                          Beim Abschluss auch stoppen: {reminder.title}
                        </label>
                      ))}
                  </article>
                )
              })}
            </div>
          </Glass>
        </div>
        <Glass
          className="nx-agenda-surface nx-agenda-tool-page nx-agenda-tool-import"
          performanceProfile="balanced"
          style={tool !== 'import' ? { display: 'none' } : undefined}
        >
          <p className="nx-agenda-tool-intro">
            Übernimm Termine aus deinem Kalender. Du siehst vor dem Speichern,
            welche Einträge übernommen werden können.
          </p>
          <PlanningIcsPanel
            embedded
            planning={planning}
            timeZone={zone}
            ready={ready && !busy && !storageError}
            execute={planningCommands.execute}
          />
        </Glass>
        <Glass
          className="nx-agenda-surface nx-agenda-tool-page nx-agenda-tool-links"
          performanceProfile="balanced"
          style={tool !== 'links' ? { display: 'none' } : undefined}
        >
          <h3>Verknüpfungen</h3>
          <p>
            Verbinde eine Aufgabe mit einer Notiz oder einem Canvas-Inhalt.
            Fehlende Ziele kannst du hier reparieren.
          </p>
          <label>
            Aufgabe
            <select
              aria-label="Aufgabe für Verknüpfungen"
              value={contextTask?.id || ''}
              onChange={(event) => setContextTaskId(event.target.value)}
            >
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>
          {contextTask ? (
            <TaskContextLinks
              embedded
              key={contextTask.id}
              task={contextTask}
              catalog={catalog}
              planning={planning}
              execute={planningCommands.execute}
              onOpen={props.setView ? openEntity : undefined}
            />
          ) : (
            <p>Füge zuerst eine Aufgabe hinzu.</p>
          )}
        </Glass>
        <Glass
          className="nx-agenda-surface nx-agenda-tool-page nx-agenda-tool-settings"
          performanceProfile="balanced"
          style={tool !== 'settings' ? { display: 'none' } : undefined}
        >
          <h3>Agenda-Einstellungen</h3>
          <p>Alle Zeiten im Tagesplan werden in dieser Zeitzone angezeigt.</p>
          <label>
            Zeitzone
            <select
              aria-label="Planungszeitzone"
              value={zone}
              onChange={(event) => setZone(event.target.value)}
            >
              {timeZones.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <h4>Kalenderdaten und freie Zeit</h4>
          <p>
            Damit Nexus freie Zeit bestätigen kann, musst du alle beschäftigten
            Kalenderquellen ausdrücklich berücksichtigen. Ohne diese Bestätigung
            bleibt Zeit unbestätigt.
          </p>
          <button
            className="nx-agenda-button"
            type="button"
            onClick={() =>
              openEditor({ mode: 'availability', localStart: `${day}T09:00` })
            }
          >
            Verfügbarkeit festlegen
          </button>
        </Glass>
        <Glass
          className="nx-agenda-surface nx-agenda-tool-page nx-agenda-tool-quick"
          performanceProfile="balanced"
          style={tool !== 'quick' ? { display: 'none' } : undefined}
        >
          <h3>Schnelleintrag</h3>
          <p>
            Eine Aufgabe wird angelegt und direkt zum Einplanen geöffnet. Eine
            Erinnerung erinnert dich zum gewählten Zeitpunkt.
          </p>
          {props.quickEntry}
        </Glass>
      </div>
      <div
        className="nx-agenda-editor-layer"
        hidden={!editorOpen}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditorOpen(false)
        }}
      >
        <aside
          ref={editorRef}
          className="nx-agenda-editor"
          role="dialog"
          aria-modal={editorOpen}
          aria-labelledby="nx-agenda-editor-title"
        >
          <Glass
            type="modal"
            disablePulse
            performanceProfile="balanced"
            className="nx-agenda-editor-sheet"
          >
            <header className="nx-agenda-editor-head">
              <div>
                <span className="nx-agenda-eyebrow">DEIN NÄCHSTER SCHRITT</span>
                <h2 id="nx-agenda-editor-title">
                  {editorIntent.blockId
                    ? 'Fokuszeit verschieben'
                    : 'Eintrag hinzufügen'}
                </h2>
              </div>
              <button
                className="nx-agenda-button"
                type="button"
                aria-label="Planungseditor schließen"
                onClick={() => setEditorOpen(false)}
              >
                <X size={19} />
              </button>
            </header>
            <div className="nx-agenda-editor-content custom-scrollbar">
              <PlanningPanel
                editorOnly
                selectedDay={day}
                initialTaskId={editorIntent.taskId}
                initialStart={editorIntent.localStart}
                initialTitle={editorIntent.initialTitle}
                initialMode={editorIntent.mode}
                initialBlockId={editorIntent.blockId}
                requestId={editorIntent.requestId}
                timeZone={zone}
                tasks={tasks}
                reminders={reminders}
                planning={planning}
                execute={planningCommands.execute}
                initialize={planningCommands.ready}
                storageError={storageError}
                onFeedback={setEditorFeedback}
                messageText={messageText}
              />
            </div>
          </Glass>
        </aside>
      </div>
    </section>
  )
}
