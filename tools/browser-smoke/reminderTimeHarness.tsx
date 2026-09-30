import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { ReminderModal as MainReminderModal } from '../../Nexus Main/src/views/reminders/ReminderViewParts'
// The isolated Vite test plugin exports this existing private component in memory.
import { ReminderTimeFixtureModal as MobileReminderModal } from '../../Nexus Mobile/src/views/RemindersView'

const root = createRoot(document.getElementById('root')!)
const results: unknown[] = []
const checks: string[] = []
const settle = () => new Promise(resolve => setTimeout(resolve, 25))
const assert = (value: unknown, label: string) => { if (!value) throw new Error(label); checks.push(label) }
const field = () => document.querySelector<HTMLInputElement>('input[type="datetime-local"]')!
const button = (text: string) => Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === text)!
const input = async (element: HTMLInputElement | HTMLSelectElement, value: string) => {
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value)
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
  await settle()
}

async function render(client: 'main' | 'mobile', original?: string) {
  let saved: any
  let closed = false
  ;(window as any).__reminderFixtureStore = {
    tasks: [], notes: [], openNote() {}, setNote() {},
    addRem: (value: unknown) => { saved = value },
    updateReminder: (_id: string, value: unknown) => { saved = value },
  }
  const reminder = original ? { id: 'synthetic-reminder', title: 'Synthetic reminder', msg: '', datetime: original, repeat: 'none' as const, done: false } : undefined
  const Modal = client === 'main' ? MainReminderModal : MobileReminderModal
  flushSync(() => root.render(<Modal key={`${client}-${Math.random()}`} reminder={reminder} onClose={() => { closed = true }} />))
  await settle()
  if (!original) await input(document.querySelector<HTMLInputElement>('input[placeholder="Reminder title…"]')!, 'Synthetic new reminder')
  return { save: async () => { button(original ? 'Save Changes' : 'Create Reminder').click(); await settle() }, saved: () => saved, closed: () => closed }
}

async function run() {
  const phase = new URLSearchParams(location.search).get('phase') || 'after'
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const original = '2026-09-30T09:00:37.123Z'
  for (const client of ['main', 'mobile'] as const) {
    const fixture = await render(client, original)
    const displayed = field().value
    await fixture.save()
    results.push({ client, probe: 'unchanged-precise-instant', zone, displayed, original, saved: fixture.saved()?.datetime, closed: fixture.closed() })
    if (phase === 'after') {
      assert(displayed === (zone === 'Europe/Berlin' ? '2026-09-30T11:00' : '2026-09-30T05:00'), `${client}: displayed wall time uses ${zone}`)
      assert(fixture.saved()?.datetime === original, `${client}: unchanged save preserves exact seconds/milliseconds`)
      assert(document.body.textContent?.includes(zone), `${client}: form identifies its IANA time zone`)
    }
    const laterFold = zone === 'Europe/Berlin' ? '2026-10-25T01:30:42.987Z' : '2026-11-01T06:30:42.987Z'
    const foldFixture = await render(client, laterFold)
    const foldDisplayed = field().value
    await foldFixture.save()
    results.push({ client, probe: 'unchanged-later-fold', zone, displayed: foldDisplayed, original: laterFold, saved: foldFixture.saved()?.datetime })
    if (phase === 'after') assert(foldFixture.saved()?.datetime === laterFold, `${client}: unchanged edit retains the original later fold`)

    const create = await render(client)
    const defaultDisplay = field().value
    if (client === 'mobile') { button('+15m').click(); await settle() }
    await create.save()
    results.push({ client, probe: 'default-and-quick-preset', zone, displayed: defaultDisplay, saved: create.saved()?.datetime })
    if (phase === 'after') assert(create.saved()?.datetime === '2026-09-30T09:15:45.123Z', `${client}: +15-minute default/preset preserves the intended instant`)

    if (phase === 'before') continue
    const changed = await render(client, original)
    const gapLocal = zone === 'Europe/Berlin' ? '2026-03-29T02:30' : '2026-03-08T02:30'
    await input(field(), gapLocal)
    await changed.save()
    assert(!changed.saved() && !changed.closed(), `${client}: nonexistent DST local time cannot save or close the form`)
    assert(Boolean(document.querySelector('[role="alert"]')), `${client}: gap rejection is visible`)
    const ambiguousLocal = zone === 'Europe/Berlin' ? '2026-10-25T02:30' : '2026-11-01T01:30'
    await input(field(), ambiguousLocal)
    await changed.save()
    assert(!changed.saved(), `${client}: changed fold requires a choice`)
    const choices = document.querySelector<HTMLSelectElement>('select[aria-label="Repeated time occurrence"]')!
    assert(choices && choices.options.length === 3, `${client}: both fold occurrences are exposed`)
    const later = choices.options[2].value
    await input(choices, later)
    await changed.save()
    assert(changed.saved()?.datetime === later, `${client}: explicit later fold is saved`)

    const empty = await render(client, original)
    await input(field(), '')
    await empty.save()
    assert(!empty.saved() && !empty.closed(), `${client}: empty date input is rejected without throwing or closing`)
  }
  flushSync(() => root.unmount())
  return { ok: true, phase, zone, results, checks }
}

// A fixed clock makes defaults and relative presets reproducible; zone behavior
// remains the browser's real IANA/Intl implementation under the test override.
const NativeDate = Date
class FixedDate extends NativeDate {
  constructor(...args: any[]) { super((args.length ? args[0] : '2026-09-30T09:00:45.123Z') as any) }
  static now() { return NativeDate.parse('2026-09-30T09:00:45.123Z') }
}
window.Date = FixedDate as DateConstructor
run().then(result => { (window as any).reminderTimeTestResult = result }).catch(error => {
  ;(window as any).reminderTimeTestResult = { ok: false, results, checks, error: error.stack || String(error) }
})
