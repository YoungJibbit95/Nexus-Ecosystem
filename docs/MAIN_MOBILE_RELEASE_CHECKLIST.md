# Nexus Main/Mobile Release Checklist

Stand: 2026-06-27
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
| Settings Shared Core | In Arbeit | Main/Mobile Bridge weiter reduzieren und Import-Validation ausbauen; Radius/Font/Panel-Token sind in Main stabilisiert |
| Notes | In Arbeit | Persistenz/Import/Editor-Performance aufteilen; Popover/Toolbar/Editor-Raum sind poliert |
| Files/Workspace Handoff | In Arbeit | Runtime Snapshot Flow mit Mobile Roundtrip testen |
| Website/API Nutzerzahlen | In Arbeit | Aktive Nutzer bleiben getrennt von technischen Clients; Contract-Smokes weiter ausbauen |

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
- [x] Font Size clampen und global layout-sicher machen
- [x] Panel Radius ueber Shell/Glass Tokens sichtbar verdrahten
- [x] Panel Backgrounds fuer App Panels/Sidebar sichtbar reparieren
- [x] Glass Performance Anzeige in Settings einfuehren

## Notes Release Liste

- [x] UI-State-Import ist gegen defekte LocalStorage-Werte geschuetzt
- [x] Emoji- und Blocks-Menues schweben ueber der Toolbar statt Layout zu vergroessern
- [x] Magic Button schliesst konkurrierende Notes-Popover
- [x] InfoView hat Suche und bessere Referenzen fuer Views/Markdown/Terminal
- [ ] Notes Store von Editor-Draft-State trennen
- [ ] Markdown/Emoji/Magic Daten in kleinere Module auslagern
- [ ] Import-Validation fuer Markdown/JSON Notes
- [ ] Performance-Gate fuer grosse Notes mit Preview/Analysis Worker

## Website/API Release Liste

- [x] Website-Login zeigt bei nicht bestaetigter E-Mail keinen Erfolgs-Haken
- [x] Website-Text ab API/Developer/Pricing konkreter und weniger Beta-lastig
- [x] Maus-Glow ist oben links abschaltbar
- [x] `activeUsers`/`activeUsers15m` wird von technischen Clients getrennt
- [x] Nexus Control Dashboard zeigt im Nutzer-Slot echte aktive Nutzer
- [ ] Website Screenshots nach UI-Stabilisierung neu capturen
- [ ] API Contract-Test fuer fehlende Nutzer-Metriken um Fallbacks erweitern

## Manual Smoke

- Main: Start, Dashboard, Notes, Canvas, Files, Settings einmal oeffnen
- Main Settings: Font-Size-Slider, Panel Radius, Sidebar Rail, alle Panel Textures pruefen
- Main Notes: Emoji/Blocks Popover, Magic Modal, Split/Edit auf kleinen Fenstern pruefen
- Main Dashboard: Layout Editor Drag/Drop ohne Zittern pruefen
- Main Canvas: Node erstellen, auswaehlen, Inspector editieren, duplizieren, loeschen
- Main Files: Search, Filter, Workspace zuweisen, Snapshot Export
- Website: API, Developer, Account, Pricing, Glow-Toggle und Live-Metriken pruefen
- API/Control: aktive Nutzer vs. technische Clients getrennt anzeigen
- Mobile: Start, Dashboard, Notes, Canvas, Files, Settings einmal oeffnen
- Mobile Files: Runtime Snapshot importieren/exportieren/teilen
- Mobile Canvas: Pan, Zoom, Node Edit, kleine Viewports

## Release Blocker

- GitHub meldet weiterhin repo-weite Dependabot Findings ausserhalb des Main/Mobile-Audit-Gates.
- Voller Runtime-Smoke kann durch Hosted-Control-API Auth (`HTTP_401`) begrenzt sein.
- Code/Code Mobile bleiben ausserhalb dieses Main/Mobile Gates und brauchen ein separates Security-/Release-Fenster.
