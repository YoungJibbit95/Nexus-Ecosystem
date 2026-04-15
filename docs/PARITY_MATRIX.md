# Main/Mobile Paritaetsmatrix

## Gemeinsame Contracts (v5)

### Navigation-Contract

- `bottom-nav`: Standard auf Phones.
- `tabs`: eigener Tabs-Renderer, faellt **nicht** still auf `bottom-nav` zurueck.
- `sidebar`: nur fuer Tablet/Large-Screen Layout.

### Quick-Capture-Contract

- Gemeinsame Intent-Sprache aus `@nexus/core`:
  - `note`
  - `task`
  - `reminder`
  - `code`
  - `canvas`
- Eingebunden in:
  - Main Spotlight/Toolbar
  - Mobile Command Palette
  - Main Dashboard
  - Mobile Dashboard

### Workspace-Handoff-Contract

- v1 ist bewusst manuell (kein Auto-Sync Loop).
- Austauschformat: `runtime.json`.
- Main: Export/Import ueber FilesView + Filesystem Runtime Snapshot.
- Mobile: Import/Export/Share von `runtime.json` in FilesView.
- Status sichtbar:
  - Main Dashboard (aktiver Workspace, Root, letzter Sync)
  - Mobile Dashboard (aktiver Workspace, Handoff-Modus, letzte Aktion)

## View-Paritaet (Core-Flows)

| View | Nexus Main | Nexus Mobile | Paritaetsstatus |
| --- | --- | --- | --- |
| Dashboard | Layout-Editor + Widgets + Today Layer + Quick Capture | Layout-Editor + Widgets + Today Layer + Quick Capture | Gleichwertig (mobile UI angepasst) |
| Notes | Voller Editor + Magic | Voller Editor + Magic | Gleichwertig |
| Tasks | Kanban/Listen-Flow | Kanban/Listen-Flow | Gleichwertig |
| Reminders | Filter/Stats/Today Layer/Snooze | Filter/Stats/Today Layer/Snooze + native local notifications | Mobile erweitert |
| Canvas | Volle Canvas-Primitives + Templates | Canvas + mobile Bottom-Sheet Flows | Mobile angepasst |
| Files | Workspace-Root + FS Import/Export + Runtime Snapshot | Runtime Snapshot Import/Export/Share | Bewusst differenziert (plattformgerecht) |
| Code | Voller Desktop-Codeflow | Mobile Codeflow | Paritaetsnah (UX variiert) |
| Settings | Voller Settings-Stack + Walkthrough Reopen | Mobile Settings-Stack | Funktionsparitaet, UI-spezifisch |
| Info | Aktuelle Doku + Walkthrough Reopen | Aktuelle Doku | Paritaetsnah |
| DevTools | Desktop-optimiert | Mobile-optimiert | Funktionsparitaet |
| Flux | Aktiv | Aktiv | Gleichwertig |

## Release-Check fuer Paritaet

1. `npm --prefix "./Nexus Main" run build`
2. `npm --prefix "./Nexus Mobile" run build`
3. `npm --prefix "./Nexus Code" run build`
4. `npm --prefix "./Nexus Code Mobile" run build`
5. Quick-Capture in Main/Mobile pruefen (`note/task/reminder/code/canvas`)
6. `runtime.json` Export aus Main und Import auf Mobile pruefen
7. Navigation-Schema pruefen (`bottom-nav`, `tabs`, `sidebar`) inkl. Phone/Tablet
