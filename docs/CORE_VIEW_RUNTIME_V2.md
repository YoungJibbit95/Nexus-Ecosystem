# Core View Runtime v2

Stand: 2026-05-06

Core View Runtime v2 macht die Nexus-v6-Shell berechenbar. Views liefern nicht nur Titel und Actions, sondern ein gemeinsames Layout-, Panel- und Command-Modell, das Desktop Main, Mobile und spaetere Surfaces gleich interpretieren koennen.

## Ziele

- Eine zentrale Quelle fuer View-Metadaten, Actions, Panels, Shortcuts und Statussignale.
- Layout Schema v2 fuer Desktop, Tablet und Mobile.
- Panel Engine fuer Inspector Rails, Inline-Panels, Sheets und Fokusmodus.
- Command Registry mit Enabled/Disabled-State und sicherem Execution-Hook.
- Stabile UI: Actions duerfen Klickziele nicht durch Hover/Press verschieben.

## Zentrale Exports

```ts
NEXUS_VIEW_MANIFESTS
buildNexusViewCommandRegistry()
resolveNexusViewCommandRegistry()
resolveDefaultNexusViewCommand()
executeNexusViewCommand()
resolveNexusViewPanels()
resolveNexusViewLayout()
buildNexusPanelEngine()
```

## Layout Schema v2

`resolveNexusViewLayout()` gibt pro View ein `NexusViewLayoutSchemaV2` zurueck:

- `surface`: desktop, tablet oder mobile.
- `surfaceMode`: dashboard, editor, board, canvas, browser, flow, settings, status, diagnostics oder stack.
- `density`: compact, comfortable oder spacious.
- `chrome`: full, focused oder immersive.
- `contentPriority`: balanced, content-first, creation-first oder diagnostic.
- `columns`: berechnete Spaltenzahl fuer die Shell.
- `minContentWidth`: Mindestbreite fuer stabile Arbeitsflaechen.
- `panels`: aufgeloeste Panel-Liste inklusive Sichtbarkeit und Presentation.
- `commandPlacements`: Command-IDs gruppiert nach primary, toolbar, command und context.

## Panel Engine

`buildNexusPanelEngine()` baut aus Manifest und UI-Zustand die konkrete Panel-Sicht:

- `railPanels`: sichtbare Desktop-Rails.
- `sheetPanels`: Mobile- oder Inspector-Sheets.
- `inlinePanels`: Bottom/Inline-Panels.
- `inspectorPanels`: alle Panels, die sich fuer den Inspector eignen.
- `activePanel`: das aktuell sinnvollste Panel fuer die Inspector-Anzeige.
- `hasVisibleInspector`: true, wenn ein Inspector-relevantes Panel sichtbar ist.

Fokusmodus blendet nicht notwendige Rails aus. Bottom/Inline-Panels duerfen sichtbar bleiben, wenn sie arbeitskritische Statusdaten tragen.

## Command Registry

`resolveNexusViewCommandRegistry()` erweitert Actions zu Commands mit State:

- `commandId`: stabile ID im Format `view.action`.
- `enabled`: berechneter Bedienzustand.
- `disabledReason`: `requires-selection`, `read-only`, `entitlement-blocked` oder `view-unavailable`.
- `scope`: view oder global.
- `priority`: stabile Sortierung fuer Command Palette, Toolbar und Inspector.

`executeNexusViewCommand()` fuehrt keine App-Logik selbst aus. Es erzwingt aber die gemeinsame Reihenfolge:

1. Command suchen.
2. Disabled-State respektieren.
3. View-spezifischen Handler, `view.*` Handler oder globalen `*` Handler finden.
4. Handler ausfuehren und ein strukturiertes Ergebnis zurueckgeben.

Damit bleibt Core sicher und UI-agnostisch, waehrend Main/Mobile echte Handler schrittweise pro View anbinden koennen.

## Main Integration

`NexusV6ViewShell` nutzt jetzt:

- `buildNexusPanelEngine()` fuer Inspector-Panel-State.
- `resolveNexusViewCommandRegistry()` fuer Primary- und Toolbar-Actions.
- Layout-Metadaten fuer Inspector-Debugging und spaetere Responsive-Regeln.
- Stabilere Panel-Buttons ohne Hover-Translation, damit Klickziele nicht wandern.

## Naechste Ausbaustufe

- View-spezifische Command Handler in Dashboard, Notes, Tasks und Canvas anbinden.
- Mobile Shell auf dieselbe Panel Engine ziehen.
- Command Palette als globalen Einstieg auf `resolveNexusViewCommandRegistry()` umstellen.
- Persistente Panel-Zustaende pro View speichern.
- Layout Schema v2 in Live Sync aufnehmen, sobald Control Plane Promotion-Regeln dafuer bereit sind.
