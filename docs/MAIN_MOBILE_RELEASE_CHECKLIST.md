# Nexus Main/Mobile Release Checklist

Stand: 2026-06-22
Scope: `Nexus Main`, `Nexus Mobile`, `packages/nexus-core`

## Release Gate

Pflicht vor jedem Main/Mobile Release:

```bash
npm run release:main-mobile
```

Der Gate prueft:

- Single-React-Instanz im Workspace
- Encoding-Gate
- Ecosystem Contracts
- optionale Signing-Konfiguration
- `@nexus/core` Build
- `Nexus Main` Production Build
- `Nexus Mobile` Production Build
- `Nexus Main` Dependency Audit ab `moderate`
- `Nexus Mobile` Dependency Audit ab `moderate`

## Aktueller Status

| Bereich | Status | Naechster Schritt |
| --- | --- | --- |
| Main Build | Gate-ready | Weiter nach jedem Canvas/Settings/Notes Batch laufen lassen |
| Mobile Build | Gate-ready | Mobile Canvas/Settings nach jedem Shared-Core Patch mitbauen |
| Dependency Security Main/Mobile | Gate-ready | Audits bleiben Teil von `release:main-mobile` |
| Canvas Main | In Arbeit | Inspector v2 ist drin, danach Multi-Select/History/Snap vollenden |
| Canvas Mobile | In Arbeit | Mobile Gestures und Bottom-Sheet Inspector angleichen |
| Settings Shared Core | In Arbeit | Main/Mobile Bridge weiter reduzieren und Import-Validation ausbauen |
| Notes | In Arbeit | Persistenz/Import/Editor-Performance aufteilen |
| Files/Workspace Handoff | In Arbeit | Runtime Snapshot Flow mit Mobile Roundtrip testen |

## Canvas Release Liste

- [x] Persistierte Canvas-UI-Prefs validieren
- [x] Adaptive Minimap fuer kleine Viewports
- [x] Desktop Node Inspector fuer direkte Node-Bearbeitung
- [x] Node Chrome visuell reduzieren
- [ ] Multi-Select: Shift-Click, Selection-Rectangle, Gruppenbewegung
- [ ] Undo/Redo: Create, Delete, Move, Resize, Edit, Connection, Auto-Layout
- [ ] Snap-to-grid: 8px/16px Optionen
- [ ] Mobile: Pinch Zoom und ein-/zwei-Finger Gesten finalisieren
- [ ] Mobile: Inspector als kompaktes Bottom Sheet

## Settings Release Liste

- [x] Gemeinsame Settings-Schema-Basis in `@nexus/core/settings`
- [x] Versionierte Defaults/Validation/Persistence vorhanden
- [x] Main/Mobile Theme-Import validiert ueber Shared Parser
- [ ] Main/Mobile SettingsModulePanels weiter entkoppeln
- [ ] Gemeinsame SettingRow/Toggle/Slider/Select direkt aus Core verwenden
- [ ] Settings Reset: Appearance/Layout/Motion/Accessibility/Data/Mobile vollstaendig sichtbar machen
- [ ] Developer-Sektion nur fuer Development sichtbar halten
- [ ] Alte Theme-Persistenz mit Migration hart absichern

## Notes Release Liste

- [x] UI-State-Import ist gegen defekte LocalStorage-Werte geschuetzt
- [ ] Notes Store von Editor-Draft-State trennen
- [ ] Markdown/Emoji/Magic Daten in kleinere Module auslagern
- [ ] Import-Validation fuer Markdown/JSON Notes
- [ ] Performance-Gate fuer grosse Notes mit Preview/Analysis Worker

## Manual Smoke

- Main: Start, Dashboard, Notes, Canvas, Files, Settings einmal oeffnen
- Main Canvas: Node erstellen, auswaehlen, Inspector editieren, duplizieren, loeschen
- Main Files: Search, Filter, Workspace zuweisen, Snapshot Export
- Mobile: Start, Dashboard, Notes, Canvas, Files, Settings einmal oeffnen
- Mobile Files: Runtime Snapshot importieren/exportieren/teilen
- Mobile Canvas: Pan, Zoom, Node Edit, kleine Viewports

## Release Blocker

- GitHub meldet weiterhin repo-weite Dependabot Findings ausserhalb des Main/Mobile-Audit-Gates.
- Voller Runtime-Smoke kann durch Hosted-Control-API Auth (`HTTP_401`) begrenzt sein.
- Code/Code Mobile bleiben ausserhalb dieses Main/Mobile Gates und brauchen ein separates Security-/Release-Fenster.
