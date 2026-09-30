import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('Files keeps workspace scope explicit, persistent, and separate from disk snapshots', async () => {
  const [view, css] = await Promise.all([
    read('./FilesView.tsx'),
    read('./files/FilesViewHardening.css'),
  ])

  assert.match(view, /FILES_SCOPE_STORAGE_KEY/)
  assert.match(view, /role="radiogroup"/)
  assert.match(view, /Gesamte Bibliothek/)
  assert.match(view, /Aktiver Workspace/)
  assert.match(view, /kein automatischer Dateisystemordner/)
  assert.match(view, /Snapshot-Ordner/)
  assert.doesNotMatch(view, /Workspace folder waehlen/)
  assert.match(view, /aria-modal=\{detailsDrawer \|\| undefined\}/)
  assert.match(view, /aria-modal=\{explorerDrawer \|\| undefined\}/)
  assert.match(css, /@media \(max-width: 1280px\)/)
  assert.match(css, /@media \(max-width: 1024px\)/)
  assert.match(css, /@media \(max-width: 768px\)/)
})

test('Flux exposes source-backed low-activity states without bulk auto-resolution', async () => {
  const [view, css] = await Promise.all([
    read('./FluxView.tsx'),
    read('./flux/FluxViewHardening.css'),
  ])

  assert.match(view, /Lokaler Triage-Score/)
  assert.match(view, /Lokale Quellen: Notes, Code, Tasks, Reminder und Systemereignisse/)
  assert.match(view, /Keine Eintraege in dieser Queue-Ansicht/)
  assert.match(view, /Es wurde nichts automatisch erledigt/)
  assert.match(view, /reviewUrgentNow/)
  assert.doesNotMatch(view, /resolveUrgentNow/)
  assert.doesNotMatch(view, /startTopPriorityTasks/)
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/)
})

test('Settings separates accessibility and keeps details progressive on small screens', async () => {
  const [constants, panels, shell, css] = await Promise.all([
    read('./settings/settingsConstants.tsx'),
    read('./settings/SettingsModulePanels.tsx'),
    read('./settings/SettingsShell.tsx'),
    read('./settings/SettingsPolish.css'),
  ])

  assert.match(constants, /id: "accessibility"/)
  assert.match(panels, /module === "accessibility"/)
  assert.match(panels, /showAdvancedSettings \? \(/)
  assert.doesNotMatch(panels, /label="Hilfetexte anzeigen"/)
  assert.doesNotMatch(panels, /label="Farben automatisch lesbar halten"/)
  assert.doesNotMatch(panels, /label="Schnellaktionen anzeigen"/)
  assert.match(shell, /aria-current=\{active \? "page" : undefined\}/)
  assert.match(css, /position: sticky/)
  assert.match(css, /@media \(max-width: 1120px\)/)
  assert.match(css, /max-width: 460px/)
})

test('Main keeps renderer credentials out of production bundles and labels titlebar controls', async () => {
  const [app, titlebar] = await Promise.all([
    read('../App.tsx'),
    read('../components/TitleBar.tsx'),
  ])

  assert.doesNotMatch(app, /VITE_NEXUS_CONTROL_INGEST_KEY/)
  assert.match(app, /Session-Token bleibt nur bis zum Schliessen/)
  assert.match(titlebar, /Fenster schliessen/)
  assert.match(titlebar, /aria-label=\{action\.label\}/)
  assert.match(titlebar, /aria-label="Suche oeffnen"/)
})
