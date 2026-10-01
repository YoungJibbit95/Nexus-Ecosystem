import type { PlanningDocument, TaskRecord } from '@nexus/core/planning/domain'

const messages: Record<string, string> = {
  'Task duration is unknown. Enter positive minutes before scheduling.':
    'Wie lange brauchst du für diese Aufgabe? Gib eine Dauer in Minuten ein.',
  'Duration must be a known positive number of minutes, at most one week.':
    'Gib eine Dauer zwischen 1 und 10.080 Minuten ein.',
  'Task title is required.': 'Gib deiner Aufgabe einen Titel.',
  'A fixed event needs a title, a valid start/end and IANA time zone.':
    'Gib einen Titel, Beginn und Ende für den Termin an. Das Ende muss nach dem Beginn liegen.',
  'Review overlap, dependency, deadline and coverage facts. Keep an explicit conflict/uncertainty only after review.':
    'Dieser Zeitraum braucht deine Entscheidung. Prüfe die Hinweise unten, bevor du ihn trotzdem einplanst.',
  'The event overlaps an existing commitment. Choose keep conflict explicitly.':
    'Dieser Termin überschneidet sich mit einem anderen Eintrag. Prüfe die Überschneidung, bevor du ihn trotzdem einplanst.',
  'Calendar coverage is unknown for this interval; this is not a confirmed free slot.':
    'Für diesen Zeitraum sind deine Kalenderdaten unvollständig. Er ist noch nicht als freie Zeit bestätigt.',
  'Outside the explicitly supplied working windows.':
    'Der Zeitraum liegt außerhalb deiner angegebenen Verfügbarkeit.',
  'This task is blocked.': 'Diese Aufgabe ist blockiert.',
  'A prerequisite is unfinished or unresolved.':
    'Eine vorausgesetzte Aufgabe ist noch offen oder fehlt.',
  'This block ends after the deadline, or its legacy deadline cannot be interpreted.':
    'Die Fokuszeit endet nach der Aufgabenfrist oder die gespeicherte Frist ist nicht eindeutig.',
  'The civil deadline has no resolved IANA zone/date. Its original value is retained; completion cannot be confirmed against it.':
    'Die gespeicherte Frist hat keine eindeutige Zeitzone. Sie bleibt erhalten und muss geprüft werden.',
  'Completed tasks cannot receive new or moved work blocks.':
    'Diese Aufgabe ist bereits abgeschlossen. Wähle eine offene Aufgabe.',
  'The workspace or planning revision changed. Review current data before retrying.':
    'Dein Plan wurde inzwischen geändert. Prüfe die aktuellen Einträge und versuche es erneut.',
  'The canonical task changed. Review status, deadline and relationships before retrying.':
    'Die Aufgabe wurde inzwischen geändert. Prüfe ihren aktuellen Stand und versuche es erneut.',
}

/** Presentation only: command results, issue codes and saved receipts stay intact. */
export function agendaMessage(
  value: string,
  planning: PlanningDocument,
  tasks: TaskRecord[],
) {
  if (messages[value]) return messages[value]
  const overlap = /^Overlaps (fixed event|work block) (.+)\.$/.exec(value)
  if (overlap) {
    const title =
      overlap[1] === 'fixed event'
        ? planning.events.find((event) => event.id === overlap[2])?.title
        : tasks.find(
            (task) =>
              task.id ===
              planning.blocks.find((block) => block.id === overlap[2])?.taskId,
          )?.title
    return `Überschneidung mit ${overlap[1] === 'fixed event' ? 'einem Termin' : 'einer Fokuszeit'}${title ? `: „${title}“` : '.'}`
  }
  return value
}
