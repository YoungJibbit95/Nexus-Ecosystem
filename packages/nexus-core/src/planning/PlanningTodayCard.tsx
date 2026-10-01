import React from 'react'
import type { selectPlanningToday } from './today'
import './planningPanel.css'

export function PlanningTodayCard({ today, onSchedule, onOpenAgenda }: { today: ReturnType<typeof selectPlanningToday>; onSchedule: (id: string) => void; onOpenAgenda: () => void }) {
  return <section className="nx-planning-panel nx-planning-today-card" aria-label="Heute Planung">
    <header><h2>Heute: Fristen und Arbeitszeit</h2><button type="button" onClick={onOpenAgenda}>Agenda öffnen</button></header>
    <p>{today.openTaskCount} eindeutige offene Aufgaben · {today.commitmentCount} Verpflichtungen · {today.reminderCount} Erinnerungspunkte</p>
    <p className="nx-planning-coverage">{today.coverage === 'complete' ? 'Kalenderabdeckung für den Tag ausdrücklich bestätigt.' : 'Kalenderabdeckung unbekannt; keine freie Zeit zugesichert.'}</p>
    <div className="nx-planning-today">{today.tasks.map(item => <article key={item.task.id}><span>{item.task.title} · {item.reasons.join(', ')}{item.blocked ? ' · blockiert' : ''}{item.durationMinutes === undefined ? ' · Dauer unbekannt' : ` · ${item.durationMinutes} Min.`}</span><button type="button" onClick={() => onSchedule(item.task.id)}>Planen</button></article>)}</div>
    {!today.tasks.length && <p>Keine offene Aufgabe mit heutiger Frist, überfälliger Frist oder heutigem Arbeitsblock. Ungeplante Arbeit ist in der Agenda sichtbar.</p>}
    {today.issues.length > 0 && <p className="nx-planning-issue">{today.issues.length} konkrete Konflikt- oder Abdeckungshinweise. In der Agenda prüfen.</p>}
    {today.unresolvedBlocks.length > 0 && <p role="alert">{today.unresolvedBlocks.length} Arbeitsblöcke haben fehlende Aufgaben; zur Reparatur erhalten.</p>}
  </section>
}
