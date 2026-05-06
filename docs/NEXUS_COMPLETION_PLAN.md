# Nexus Fertigstellungs- und Releaseplan

Stand: 2026-05-06

Arbeitsstand nach Start der Abarbeitung:

- P0 Build-Basis fuer Main, Mobile, Nexus Code und Code Mobile ist repariert und erneut verifiziert.
- Website API Integration ist Node/tsx-sicher repariert und besteht.
- `verify:single-react` und `verify:ecosystem` bestehen; Ecosystem-Gate meldet 23/23 Checks.
- Erste UI-Shell-Konsolidierung fuer Nexus Main ist umgesetzt: Main nutzt `MainShellLayout`/`MainViewHost`, View Error Boundaries sitzen im Host, der alte Inline-Shell-Block ist entfernt, und Boot-/View-Konstanten liegen wieder in `mainAppConfig.ts`.
- `packages/nexus-core` hat ein erstes View Manifest v2 fuer alle Kernviews inklusive Actions, Panels, Responsive Modes, Status-Signalen und ableitbarer Command Registry.
- `packages/nexus-core` hat ein eigenes Package-Gate mit Typecheck, Manifest-Test und Build-Script.
- Core View Runtime v2 ist erweitert: Layout Schema v2, Panel Engine, resolved Command Registry und sicherer Command Execution Hook sind angelegt und in Nexus Main sichtbar angebunden.
- Nexus Main hat eine zentrale `mainViewRegistry.ts`: Sidebar, View Preload, Boot-Prioritaeten, Heavy-View-Liste und persistenter View-Cache haengen jetzt an derselben Registry.
- Erste echte Shell-Commands sind angebunden: Quick Capture/New Note/New Task/New Reminder erzeugen Daten und wechseln in die passende View; alle weiteren Commands werden als `nexus:view-command` Event weitergereicht.
- UI-Cleanup fuer Nexus Main ist nachgezogen: doppelte Context-Bar entfernt, v6-Header kompakter, Sidebar-Topbereich vereinfacht, Statusleiste reduziert und Hover-Transforms fuer zentrale Klickziele weiter entschaerft.
- Nexus Main nutzt dieses Manifest sichtbar in der `NexusV6ViewShell`, einer reduzierten Statusleiste und manifest-basierten View-Actions.
- Ein Encoding-Gate (`npm run verify:encoding`) sucht jetzt in Source und Docs nach typischen Mojibake-Signaturen und besteht aktuell.
- Ein zentrales RC-Gate (`npm run release:gate`) und ein GitHub Actions Release-Gate sind angelegt.
- Die View-Smoke-Matrix ist als Markdown-Dokument und Wiki-Eintrag uebernommen.
- Grosser Nexus-v6-UI-Schnitt ist gestartet: Nexus Main und Nexus Mobile stehen auf Version `6.0.0`; alle Main-Views laufen durch eine neue `NexusV6ViewShell` mit einheitlichem Header, Fokusmodus, funktionaler Quick-View-Navigation, Inspector Rail, Panel-/Action-Modell und Status-Signalen.
- v6-UI wurde weiter entschlackt: Main-Content bekommt mehr Raum, die Inspector Rail startet geschlossen, das sichtbare Action/Activity-Modell wurde entfernt, Quick Navigation sitzt kompakt im Header und die Shell nutzt staerker transparente blurry Gradient-/Glow-Surfaces.
- Globales Main-Design ist enger an `nexusproject.dev` angelehnt: Space-Base, Cyan/Indigo/Violet-Produktpalette, cosmic glass panels, feines Grid, Text-Glow und Product-Page-aehnliche Radial-Glows sind in die v6-Shell uebernommen.
- Notes hat einen gezielten v6-Layout-Schnitt erhalten: kompaktere globale Topbar, mehr Schreibraum, breitere Library, bessere Editor-/Preview-Panes, glaeserne Toolbars und responsives Stack-Verhalten.

Scope dieser Analyse:

- Nexus Main Desktop App mit allen Views
- Nexus Mobile App mit allen Views
- Nexus Code Desktop und Nexus Code Mobile
- `packages/nexus-core` inklusive Runtime, Live Sync und Control API Client
- `NexusAPI/API/nexus-control-plane` und API Contracts
- Nexus Wiki
- Public Website `nexusproject.dev`
- Release-, Build-, Sicherheits- und Dokumentationsreife

Hinweis: Dependency-Diffs und frisch aktualisierte Lockfiles wurden auf Wunsch nicht bewertet. Die Build- und Releaseaussagen beziehen sich auf den aktuell ausgecheckten Stand nach diesen Updates.

## Kurzfazit

Nexus ist funktional breit angelegt und in der Architektur deutlich weiter als ein Prototyp: Die Views sind in Desktop und Mobile fast vollstaendig vorhanden, `nexus-core` kapselt Runtime, Live Sync, View-Validierung und Control API sauber, die Control Plane hat eine ernsthafte Sicherheitsbaseline, Wiki und Website bauen erfolgreich.

Der aktuelle Stand ist trotzdem noch nicht releasefertig fuer App-Binaries. Die vorherigen Build-Blocker fuer Main, Mobile, Nexus Code und Code Mobile sind geschlossen; die naechsten Release-Gates sind API-Datenhygiene, fehlende Ende-zu-Ende-Smokes fuer alle Views, macOS Signing/Notarization und Packaging-/RC-Automatisierung.

Zusaetzlich sollte vor einem grossen Public Release ein sichtbarer UI-/UX-Schub eingeplant werden. Die Views sind funktional breit, brauchen aber ein staerkeres gemeinsames Layout-System, bessere reaktive Zustaende, klarere Primaeraktionen, konsistente Panel-/Toolbar-Strukturen und Core-Features, die komplexere und schoenere Oberflaechen ermoeglichen.

Release-Ampel:

| Bereich | Status | Einschaetzung |
| --- | --- | --- |
| Nexus Main | Gelb | Build repariert, Version `6.0.0`, alle Views laufen durch `NexusV6ViewShell`; View-Smokes und tiefere ViewShell-Migration offen. |
| Nexus Mobile | Gelb | Build repariert, Version `6.0.0`, Core-Manifest-Aenderung erneut bestaetigt; View-Smokes und Login/Register-Paritaet offen. |
| Nexus Code | Gelb | Build repariert; Filesystem-Hardening, Packaging und Artifact-Namen offen. |
| Nexus Code Mobile | Gelb | Build repariert; Mobile IDE Smoke, Packaging und Artifact-Namen offen. |
| Nexus Core | Gelb/Gruen | Gemeinsame Runtime ist deutlich reifer: Package-Gate, Layout Schema v2, Panel Engine und Command Registry sind angelegt; view-spezifische Handler bleiben offen. |
| Nexus API / Control Plane | Gelb | Sicherheitsbaseline stark, aber Release-Daten und Secrets muessen bereinigt werden. |
| Nexus Wiki | Gruen/Gelb | Build, Budget und i18n bestehen; braucht Release-Links und visuelle QA. |
| Website | Gruen/Gelb | Build, Budget und API-Integration bestehen; Payment-E2E bleibt bewusst offen. |
| Gesamt | Gelb fuer RC-Vorbereitung | Build- und Website-P0 geschlossen; RC-Gate ist angelegt, API-Datenhygiene, Smoke-Ausfuehrung und Signing bleiben offen. |

## Gepruefte Kommandos

Aus `F:\Coding\Nexus Workspace\Nexus-Ecosystem`:

```powershell
npm run verify:single-react
npm run verify:ecosystem
npm run doctor:release
npm run release:gate
npm run release:gate -- --fast
npm --prefix "packages/nexus-core" run build
npm --prefix "Nexus Main" run build
npm --prefix "Nexus Mobile" run build
npm --prefix "Nexus Code" run build
npm --prefix "Nexus Code Mobile" run build
npm --prefix "Nexus Wiki" run build
npm --prefix "Nexus Wiki" run build:ci
npm run verify:encoding
```

Aus `F:\Coding\Nexus Workspace\nexusproject.dev`:

```powershell
npm run build
npm run build:ci
npm run test:api:integration
```

Ergebnisse:

| Check | Ergebnis | Notiz |
| --- | --- | --- |
| `verify:single-react` | Pass | Eine React-Instanz im Ecosystem erkannt. |
| `verify:ecosystem` | Pass | 23/23 Checks bestanden: Runtime-Nutzung, View-Validierung, Live Sync, interne API-Pfade. |
| `verify:encoding` | Pass | Source und Docs sind frei von typischen Mojibake-Signaturen. |
| Core Package Gate | Pass | `packages/nexus-core` prueft TypeScript und View Manifest v2. |
| `release:gate -- --fast` | Pass | Schneller RC-Gate-Pfad fuer Single React, Encoding, Ecosystem und Core Package. |
| `doctor:release` | Warn | Hosted API erreichbar, Android/JDK ok; macOS Notarization env und `xcrun notarytool` fehlen. |
| Main Build | Pass | Nach Nexus-v6-ViewShell, Version `6.0.0`, Core-Manifest-Context und App-Config-Cleanup erneut gruen. |
| Mobile Build | Pass | Nach Version `6.0.0` und Core-Manifest-Erweiterung erneut gruen. |
| Nexus Code Build | Pass | Tailwind 4 ueber `@tailwindcss/postcss` angebunden und CSS-Apply-Probleme bereinigt. |
| Nexus Code Mobile Build | Pass | Tailwind 4 ueber `@tailwindcss/postcss` angebunden und CSS-Apply-Probleme bereinigt. |
| Wiki Build | Pass | Vite Build erfolgreich. |
| Wiki Build CI | Pass | Build, Perf Budget und i18n bestehen. |
| Website Build | Pass | Vite Build erfolgreich. |
| Website Build CI | Pass | Build und Bundle Budget bestehen. |
| Website API Integration | Pass | `apiHostPolicy.ts` liest Vite Env defensiv und faellt in Node/tsx auf `process.env`/Defaults zurueck. |

Nicht ausgefuehrt:

- Live-Payment-E2E der Website, weil dieser Pfad echte Sessions gegen eine API erzeugen kann.
- Voller API Contract/Attack-Test der Control Plane in diesem Auditlauf. Diese Tests haengen am RC-Gate mit `npm run release:gate -- --with-api-contract`.
- Visuelle Browser-Smokes fuer alle Views. Die Matrix ist dokumentiert, die reale Ausfuehrung bleibt noetig vor Release.

## View-Analyse Main und Mobile

Desktop und Mobile enthalten dieselbe Kernnavigation:

- Dashboard
- Notes
- Tasks
- Reminders
- Canvas
- Files
- Code
- Flux
- Settings
- Info
- DevTools
- Render Diagnostics in Dev/Debug-Kontext

Die Views sind nicht nur Platzhalter. Viele Dateien sind umfangreich implementiert, inklusive lokaler Persistence, Runtime-Anbindung, View-Validierung, Mobile-Adaption und spezialisierten Workflows. Trotzdem gilt: Ohne erfolgreiche Builds und E2E-Smokes ist der Status "implementiert", nicht "releasebewiesen".

| View | Main | Mobile | Release-Einschaetzung | Fertigstellen |
| --- | --- | --- | --- | --- |
| Dashboard | Implementiert | Implementiert | Gute Startflaeche, Layout-/Statuslogik vorhanden. | Persistenz, leerer Zustand, Widget-Konfiguration und Sync-Fehler per Smoke testen. |
| Notes | Stark implementiert | Stark implementiert | Editor, Magic-/Markdown-/Organisationslogik vorhanden. | Encoding-Probleme bereinigen, Import/Export und Konfliktfaelle testen. |
| Tasks | Stark implementiert | Stark implementiert | Board-/Listen-/Produktivitaetsflows vorhanden. | Drag/drop, Filter, Persistenz und mobile Touch-Flows testen. |
| Reminders | Implementiert | Stark implementiert | Mobile wirkt sehr weit, Desktop braucht Notification-Smoke. | Reminder-Erstellung, Faelligkeit, Snooze, lokale Notifications und Zeitzonen testen. |
| Canvas | Stark implementiert | Stark implementiert | Umfangreich und visuell zentral. | Rendering, Touch/Gesten, Export, Undo/Redo und Performance-Budget pruefen. |
| Files | Stark implementiert | Stark implementiert | Main mit Electron-FS-Runtime, Mobile mit Plattformpfaden. | Rechte, Import/Export, Workspace Snapshot, grosse Dateien und Fehlerzustaende testen. |
| Code View | Implementiert | Implementiert | In-App-Codeflaeche vorhanden, getrennt von Nexus Code App. | Laufzeit-Ausfuehrung, Speicherung, Fehlerausgabe und Sandbox-Grenzen testen. |
| Flux | Stark implementiert | Stark implementiert | Ideen-/Flow-Modul vorhanden. | Kernworkflow definieren: Was ist MVP, was ist spaetere Automatisierung? |
| Settings | Implementiert | Implementiert | Viele Optionen und Runtime-Status vorhanden. | Kein Setting darf nur UI sein: jedes Toggle braucht Wirkung oder klare Deaktivierung. |
| Info | Implementiert | Implementiert | Produkt-/Systeminfos vorhanden. | Release-Version, Build-Channel, API-Status und Links finalisieren. |
| DevTools | Stark implementiert | Stark implementiert | Hilfreich fuer Diagnose, aber fuer Endnutzer riskant. | In Release nur gated anzeigen oder klar in Debug/Developer Mode kapseln. |
| Render Diagnostics | Klein, vorhanden | Klein, vorhanden | Nuetzlich fuer QA. | In Release nicht prominent zeigen, aber fuer Support abrufbar lassen. |

Wichtige Beobachtungen:

- `Nexus Main/src/App.tsx` rendert Views nicht mehr direkt, sondern delegiert an `MainShellLayout` und `MainViewHost`.
- `Nexus Main/src/app/mainAppConfig.ts` zentralisiert Boot-Timeouts, Fallback-Views, Preload-Gruppen und gemeinsame Helper wieder fuer Main.
- `packages/nexus-core/src/views.ts` enthaelt ein erstes View Manifest v2 als fachliche Quelle fuer Titel, Actions, Panels, Modes, Shortcuts und Status-Signale.
- Restliche Architekturdrift bleibt: `Sidebar`, `viewPreload` und die neuen Manifeste sollten als naechster Schritt vollstaendig aus einer Registry gespeist werden.
- Desktop Main hat Login/Register-Flows gegen `https://nexus-api.cloud`.
- Mobile bootet robuster mit Last-Known-Good-Fallbacks, hat aber keinen gleichwertigen sichtbaren Login/Register-Flow.
- In mehreren Textdaten sind Encoding-Artefakte sichtbar, zum Beispiel falsche Darstellung von deutschen Umlauten und Symbolen. Das ist kein Core-Feature-Bug, aber ein Release-Polish-Blocker.

## UI Design Leitbild

Nexus sollte sich weniger wie eine Sammlung einzelner Tools anfuehlen und staerker wie ein zusammenhaengender kreativer Workbench. Die App darf ruhig, dicht und produktiv wirken, aber nicht flach oder technisch roh. Ziel ist ein Interface, das fuer wiederholte Arbeit gebaut ist: schnell scannbar, reaktionsstark, visuell hochwertig, aber nicht dekorativ ueberladen.

Design-Richtung:

- Arbeitsflaeche zuerst, Marketing zuletzt.
- Ruhige, professionelle Flaechen statt viele dekorative Karten.
- Klare Primaeraktionen pro View.
- Sichtbare Systemzustaende: Speichern, Sync, Offline, Fehler, Verarbeitung.
- Gute Dichte auf Desktop, gut erreichbare Controls auf Mobile.
- Einheitliche Toolbars, Panels, Tabs, Filter, Suchfelder, Inspector Rails und Statusleisten.
- Icons fuer bekannte Aktionen, Text nur dort, wo Bedeutung sonst unklar wird.
- Keine verschachtelten Cards. Wiederholte Items duerfen Cards sein, ganze Seitenbereiche nicht.
- Stabile Hoehen/Breiten fuer Toolbars, Buttons, Tabs, Boards und Tiles, damit Hover, Labels oder Ladezustaende kein Layout verschieben.
- Text darf auf keiner View ueberlaufen oder Controls sprengen.

Visueller Zielcharakter:

- Produktivitaets-App: dicht, ruhig, schnell.
- Kreativwerkzeug: grosszuegige Canvas-/Editor-Flaechen.
- Developer Tool: praezise, monospace dort wo sinnvoll, klare Status- und Fehlerzonen.
- Mobile: weniger Spalten, mehr Bottom Sheets, Segmented Controls und Floating Toolbars.

## Gemeinsame View-Shell

Aktuell wirken viele Views einzeln stark, aber das System braucht eine gemeinsame Shell-Logik. Diese Shell sollte als UI-Kern in Core oder als geteiltes App-Package gedacht werden, damit Main, Mobile, Wiki-nahe Demos und Code-Oberflaechen dieselben Layoutregeln sprechen.

Empfohlene Desktop-Struktur:

| Zone | Zweck | Verhalten |
| --- | --- | --- |
| Global Rail | App-Wechsel, Hauptviews, Status-Badges | Schmal, icon-basiert, immer stabil. |
| Top Command Bar | Suche, Command Palette, globale Aktionen, Account/API-Status | Sticky, kompakt, keyboard-first. |
| View Header | Titel, Breadcrumb, View-spezifische Primaeraktion | Nicht hero-gross, eher arbeitsnah. |
| View Toolbar | Filter, Sortierung, Modes, Tools | Einheitliche Hoehe, segmentierte Controls, Icon Buttons. |
| Main Surface | Liste, Board, Editor, Canvas oder Dashboard | Maximale Flaeche, keine dekorative Umrandung. |
| Inspector Rail | Details, Eigenschaften, Kontextaktionen | Rechts andockbar, resizable, auf Mobile als Sheet. |
| Bottom Status Bar | Sync, Speicherstatus, Auswahl, Performance, Fehler | Schmal, informativ, nicht laut. |
| Modal/Sheet Layer | Bestaetigungen, Quick Create, Detail-Editor | Einheitliches Verhalten, Fokusfang, Escape/Back. |

Mobile-Adaption:

- Global Rail wird Bottom Navigation oder kompaktes View Switcher Sheet.
- View Toolbar wird horizontal scrollbar oder in ein Actions Sheet verschoben.
- Inspector Rail wird Bottom Sheet mit Snap Points.
- Multi-Column Layouts werden zu Stack Navigation: Liste -> Detail -> Inspector.
- Drag/drop-Flows brauchen Touch-Alternativen: Move Menu, Reorder Handles, Long Press.
- Primaeraktion pro View als gut erreichbarer Floating Action Button oder Toolbar-Button.

## UI Komponenten, Tokens und Verhalten

Nexus braucht ein klares internes Design System. Nicht als grosses eigenes Framework, sondern als kleine Menge harter Primitiven, die alle Views verwenden.

### Tokens

Ein gemeinsames Token-Set sollte definieren:

- Farbrollen: `background`, `surface`, `surfaceElevated`, `border`, `text`, `textMuted`, `accent`, `success`, `warning`, `danger`, `info`.
- Semantische Statusfarben, nicht pro View neu erfundene Paletten.
- Typografie: feste Skala fuer App Shell, View Header, Panel Header, Body, Meta, Monospace.
- Spacing: 4/8/12/16/24 Raster.
- Radius: Standard 6 bis 8 px, groessere Radien nur fuer Sheets/Overlays.
- Border/Elevation: sehr sparsam, lieber klare Trennung durch Flaechen und Linien.
- Motion: kurze, funktionale Transitions fuer Panels, Sheets, Auswahl, Ladewechsel.

### Basiskomponenten

Prioritaet fuer geteilte Komponenten:

- `AppShell`
- `ViewShell`
- `ViewToolbar`
- `InspectorRail`
- `StatusBar`
- `CommandPalette`
- `SearchBox`
- `SegmentedControl`
- `IconButton`
- `SplitPane`
- `ResizablePanel`
- `Tabs`
- `DataTable`
- `CardList`
- `KanbanBoard`
- `Timeline`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `ConfirmDialog`
- `Toast`
- `BottomSheet`
- `ContextMenu`
- `KeyboardShortcutHint`

Diese Komponenten sollten nicht nur optisch gleich sein, sondern gleich reagieren:

- Focus Ring konsistent.
- Disabled State konsistent.
- Loading State konsistent.
- Error State mit Retry.
- Tooltips fuer Icon Buttons.
- Tastaturbedienung fuer Menus, Tabs, Dialoge und Command Palette.
- Mobile Touch Targets mindestens komfortabel gross.

## UI Engine und Core Feature-Roadmap

Damit Nexus komplexere und schoenere UIs bauen kann, sollte `nexus-core` nicht nur Daten, Runtime und API kapseln, sondern auch UI-faehige Primitiven bereitstellen. Das heisst nicht, dass Core React-Komponenten enthalten muss. Besser ist eine Schicht aus Schema, Registries, Layout-Modellen und Interaktionskontrakten, die Main/Mobile/Code dann rendern.

Empfohlene Core-Erweiterungen:

| Feature | Nutzen | Konkrete Form |
| --- | --- | --- |
| View Manifest v2 | Jede View beschreibt Navigation, Actions, Shortcuts, Permissions und Responsive Modes. | `NexusViewManifest` mit `id`, `title`, `icon`, `actions`, `panels`, `shortcuts`, `mobileMode`. |
| Layout Schema v2 | Server/API kann komplexere Oberflaechen validieren, ohne Renderer zu kennen. | Split panes, tabs, rails, boards, grids, inspectors, status zones. |
| Command Registry | Jede Aktion wird suchbar, per Shortcut ausfuehrbar und in UI eingebunden. | `registerCommand`, `canRun`, `run`, `shortcut`, `scope`. |
| Panel Engine | Views koennen Inspector, Details, Filter, Preview und Debug Panels einheitlich andocken. | Dock left/right/bottom, resizable, collapsed, persisted. |
| Interaction State | Einheitlicher Umgang mit selection, hover, focus, dirty, saving, offline, error. | Shared finite state contracts oder kleine state helpers. |
| Undo/Redo Stack | Notes, Tasks, Canvas, Files und Code brauchen konsistente Ruecknahme. | Command-basierter History Stack pro Workspace/View. |
| Optimistic Update Layer | UI reagiert sofort, API/Storage bestaetigt spaeter. | Pending markers, rollback, conflict events. |
| Theme Engine | Schoenere Oberflaechen ohne harte CSS-Duplizierung. | Tokens, density modes, high contrast, reduced motion. |
| Responsive Adapter | Main und Mobile teilen dieselbe View-Idee, rendern aber passende Layouts. | `desktop`, `tablet`, `phone`, `compact` Layout Hints. |
| Empty/Error/Loading Contracts | Jede View zeigt professionelle Zustandsflaechen. | Standardisierte State Models mit CTA, Retry, Details. |
| Data Surface Primitives | Tabellen, Listen, Boards und Timelines werden schneller und konsistenter. | Sorting, filtering, grouping, virtualization, selection. |
| Canvas Scene Model | Canvas kann komplexer werden, ohne UI-Logik zu zerfasern. | Layers, nodes, edges, guides, transforms, hit testing. |
| Telemetry/Perf Hooks | UI kann echte Reaktionszeit messen. | view mount time, action latency, save latency, render cost. |
| A11y Contracts | Barrierefreiheit wird Teil des View-Manifests. | Labels, roles, keyboard maps, focus order hints. |

Wichtig: Die Engine soll den Views nicht die Gestaltung wegnehmen. Sie soll wiederkehrende Komplexitaet tragen, damit jede View hochwertiger aussehen und stabiler reagieren kann.

Status 2026-05-06:

- View Manifest v2 ist als erster Core-Schnitt angelegt: Kernviews beschreiben Titel, Navigation, Actions, Panels, Desktop-/Mobile-Modes, Shortcuts und Status-Signale.
- Nexus Main rendert daraus manifest-basierte Statusinformationen und eine `NexusV6ViewShell` fuer alle Views.
- Die v6-Shell erweitert jede Main-View um Fokusmodus, manifest-basierte Quick Navigation, Inspector Rail, Action-Modell, Panel-Uebersicht, Status-Signale und responsive Fallbacks.
- Noch offen sind Layout Schema v2, echte Command-Ausfuehrung, Panel Engine und die vollstaendige Migration von Sidebar/Toolbar/ViewPreload auf dieselbe Registry.

## View-spezifische UI Verbesserungen

| View | UI-Zielbild | Konkrete Verbesserungen |
| --- | --- | --- |
| Dashboard | Eine echte Arbeitszentrale statt Kartenuebersicht. | Resizable Widgets, Today Strip, Activity Feed, API/Sync Health, Quick Capture, kompakte Metriken, gespeicherte Layouts. |
| Notes | Schneller Schreibraum mit Strukturhilfe. | Drei Modi: Focus Editor, Split Preview, Library. Outline Rail, Backlinks, Tags, Magic Panel als Inspector, bessere Empty States. |
| Tasks | Operatives Board mit mehreren Perspektiven. | Board/Table/Timeline Mode, Swimlanes, Quick Filters, Bulk Actions, Detail Inspector, klare Drag/drop- und Touch-Alternative. |
| Reminders | Zeit- und Kontextansicht. | Agenda, Timeline, Calendar Strip, Snooze Sheet, wiederkehrende Regeln visuell editierbar, overdue cluster. |
| Canvas | Vollwertige kreative Flaeche. | Full-bleed Surface, Layer Panel, Inspector, Minimap, Smart Guides, Grid/Snap, Tool Palette, Zoom Controls, Export Panel. |
| Files | Workspace-Dateimanager statt Dateiliste. | Breadcrumb, Split Preview, Quick Actions, Upload/Dropzone, Recent Files, Type Filter, Path Trust Indicator. |
| Code View | Kleine IDE innerhalb Main. | Monaco Shell, Problems Bottom Panel, Run Output, Snippet Commands, File Context, safer execution states. |
| Flux | Prozess- und Ideenfluss als interaktive Map. | Node Graph oder Timeline, Stage Columns, Connection Lines, Focus Mode, Status Inspector, Convert to Task/Note. |
| Settings | Kontrollzentrum statt Optionsliste. | Suchbare Settings, Kategorien, Status Chips, Danger Zone, Preview fuer Theme/Density, API Connection Test. |
| Info | Systemueberblick, nicht Broschuere. | Version, Channel, API Host, Build Manifest, Runtime Health, Links zu Wiki/Diagnostics. |
| DevTools | Release Health Cockpit. | Feature Catalog, Layout Schema, Capability Report, Sync Events, Logs, Perf Timeline, Export Diagnostics. |
| Render Diagnostics | Support-Werkzeug. | Kompakter Debug Screen, Copy Report, visual render checks, failed asset list. |

## Reaktionsverhalten und Mikrointeraktionen

Die UI sollte nicht nur besser aussehen, sondern spuerbar direkter reagieren. Dafuer braucht Nexus einheitliche Regeln:

- Jede Primaeraktion gibt sofort Feedback innerhalb von 100 ms.
- Speichern zeigt `saving`, `saved`, `offline queued` oder `error` sichtbar, aber nicht stoerend.
- Lange Operationen bekommen Skeletons oder Progress, keine leeren Flaechen.
- Listen, Boards und grosse Canvas-Szenen brauchen Virtualisierung oder Chunking.
- Filter und Suche werden debounce-t, aber die Eingabe bleibt sofort fluessig.
- Requests sind abbrechbar, wenn View oder Filter gewechselt wird.
- Toasts melden Ergebnis, aber ersetzen keine dauerhaften Fehlerzustaende.
- Destruktive Aktionen nutzen ein eigenes Confirm-Dialog-System statt native `confirm()`.
- Command Palette findet Aktionen, Views, Dateien, Notizen und Einstellungen.
- Keyboard Shortcuts werden konsistent dokumentiert und in Tooltips angezeigt.
- Mobile nutzt Bottom Sheets und lange Touch Targets statt Desktop-Dialoge zu verkleinern.

## UI Acceptance Criteria

Eine View gilt UI-seitig als releasebereit, wenn:

- Sie bei leerem, normalem und stark gefuelltem Zustand gut aussieht.
- Sie bei langsamer API oder Offline-Modus einen verstaendlichen Zustand zeigt.
- Sie auf Desktop und Mobile ohne Ueberlappungen funktioniert.
- Sie eine klare Primaeraktion hat.
- Filter, Suche und Sortierung nicht das Layout verschieben.
- Text in Buttons, Tabs, Karten und Panels nicht ueberlaeuft.
- Alle Icon Buttons Tooltips haben.
- Keyboard und Touch Hauptflows funktionieren.
- Loading, Error und Empty States gestaltet sind.
- Die View dieselben Shell-/Toolbar-/Inspector-Regeln nutzt wie die anderen Views.

## Nexus Core

Staerken:

- `packages/nexus-core` buendelt Runtime, Views, Live Sync, Control API, Quick Capture, Today Layer, Render, Motion, Reminders, Code und DevTools.
- `createNexusRuntime` kapselt Connection, Performance, Control API, Heartbeat, Capability Report und Release Sync.
- Live Sync trennt Main/Mobile-Fallback-Views von serverseitiger Layout-/Feature-Konfiguration.
- View-Validierung ist im Ecosystem-Gate nachgewiesen.
- API Client normalisiert den Control Host strikt auf `https://nexus-api.cloud`, was Produktion schuetzt.

Risiken:

- Die harte Canonical-URL ist gut fuer Production, erschwert aber Staging, lokale QA und Preview-Deployments.
- Core braucht einen eigenen Package-Gate: Typecheck, Unit Tests, API Contract Fixtures, Build/Pack-Test.
- Fallback-Bundles muessen als offizieller Offline-/Degraded-Modus dokumentiert werden.
- View-Schema und Client-Faehigkeiten sollten versioniert und mit Contract Tests eingefroren werden.

Fertigstellen:

1. Eigenes Core-Gate einfuehren:

   ```powershell
   npm --prefix "packages/nexus-core" run typecheck
   npm --prefix "packages/nexus-core" run test
   npm --prefix "packages/nexus-core" run build
   ```

2. Falls Scripts fehlen, minimal ergaenzen:

   - TypeScript noEmit
   - Vitest/Jest fuer pure Runtime-Funktionen
   - Fixture-Test fuer Layout Schema, Feature Catalog und Release Manifest

3. Staging-Strategie entscheiden:

   - Production bleibt strikt canonical.
   - Development/CI darf explizit per Env einen lokalen oder Staging-Control-Host verwenden.
   - Jede Abweichung muss sichtbar geloggt und in Release Builds blockiert werden.

## Nexus API und Control Plane

Staerken:

- Control Plane hat breite Route-Abdeckung:
  - Auth/Login/Register/Session
  - Public Health und Bootstrap
  - Apps, Config, Policies, Devices, Metrics, Build Manifest, Commands, Audit, Guides
  - v2 Capabilities, Feature Catalog, Layout Schema, Layout Validation, Releases
  - Payment Plans, Checkout, Portal, Webhook, Admin State/Sessions
- Sicherheitsbaseline ist ernsthaft:
  - Loopback-Fallback fuer unsichere Host-Bindings
  - Keine wildcard trusted origins in sicherem Modus
  - Owner-only Control Panel
  - Signed Mutations
  - Verified Device Requirements
  - Ingest-Key-Hardening
  - Rate Limits
  - JSON Logging
- Production Runbook existiert und nennt Secret Store, nginx, systemd, TLS und env-basierte Ingest Keys.

Risiken:

- Release-Daten wirken noch nicht sauber getrennt von Dev-Daten.
- In `data/users.json` sind neben Owner auch Admin/Developer/Viewer Seeds vorhanden.
- In `data/policies.json` sind lokale Ingest-Key-Werte erkennbar. Selbst wenn sie nur lokal sind, gehoeren Keys nicht in release-relevante Repo-Daten.
- Rust `target`-/Buildartefakte und Logs muessen aus Release-Repos und Commits herausgehalten werden.
- Der volle Node-vs-Rust-Contract-Gate wurde in diesem Audit nicht ausgefuehrt.

Fertigstellen:

1. Release-Daten bereinigen:

   - Keine lokalen Ingest Keys im Repo.
   - Keine Default-Produktionspasswoerter.
   - Dev Bootstrap User nur per `NEXUS_ENABLE_DEV_BOOTSTRAP_USERS=true`.
   - `NEXUS_REQUIRE_ENV_INGEST_KEYS=true` fuer Production.
   - Produktionsdaten in Secret Store oder deploy-spezifischen Volumes halten.

2. Git-Hygiene:

   - `target/`, Logs, Runtime-Dumps und lokale Daten in `.gitignore` pruefen.
   - Bereits versionierte Buildartefakte gezielt entfernen, falls sie im Repo liegen.

3. API-Gate in CI:

   ```powershell
   npm --prefix "..\NexusAPI\API\nexus-control-plane" run test:contract
   npm --prefix "..\NexusAPI\API\nexus-control-plane" run test:attack
   ```

4. Production Probe:

   - Hosted `/health` pruefen.
   - Public Bootstrap pruefen.
   - Auth Smoke mit Testuser in Staging.
   - Signed Mutation Smoke.
   - Device Approve/Revoke Smoke.
   - Audit Log Smoke.

## Nexus Code und Code Mobile

Staerken:

- Nexus Code ist deutlich mehr als ein Editor-Shell:
  - Monaco Editor
  - File Explorer
  - Tabs
  - Terminal
  - Suche
  - Git Panel
  - Debug Panel
  - Extensions/Settings
  - Command Palette/Spotlight
  - Problems
  - Disk Workspace in Electron
  - Runtime- und Release-Kompatibilitaetschecks
- Code Mobile adaptiert die IDE-Idee auf eine mobile Oberflaeche.

Blocker:

- ~~Beide Builds scheitern an Tailwind 4/PostCSS-Konfiguration.~~ Erledigt am 2026-05-06.
- Desktop Code sollte die Filesystem-Schutzlogik aus Main uebernehmen oder gleichwertig absichern.
- App-/Artifact-Namen wirken teilweise zu generisch oder kollisionsgefaehrdet.

Fertigstellen:

1. ~~Tailwind 4 korrekt anbinden:~~

   - `@tailwindcss/postcss` installieren oder auf das Vite-Plugin migrieren.
   - `postcss.config.js` in Desktop und Mobile aktualisieren.
   - Danach beide Builds erneut ausfuehren.

2. Filesystem-Grenzen haerten:

   - Allowed Roots wie in Main verwenden.
   - Delete/Rename/Write nur innerhalb erlaubter Workspace-Wurzeln.
   - Terminal-Befehle weiter blocken, aber Ergebnis auch in UI auditierbar machen.

3. Packaging klaeren:

   - Paketname fuer Code Mobile eindeutig machen.
   - Artifact-Namen klar von Nexus Main trennen.
   - Release-Channel, App-ID und Icons final pruefen.

## Nexus Wiki

Status:

- Build erfolgreich.
- `build:ci` erfolgreich.
- Perf Budget erfolgreich.
- i18n Check erfolgreich mit 67 Entries und 67 Translations.
- Suche und Filter wirken als ernsthafte Docs-Oberflaeche statt als statische Linkliste.

Fertigstellen:

1. Diese Completion-/Release-Plan-Datei im Wiki verlinken.
2. Known Issues und Release Checklist als eigene Wiki-Eintraege aufnehmen.
3. Screenshots oder kurze visuelle Guides fuer Main, Mobile, Code und Control ergaenzen.
4. Encoding-Artefakte in sichtbaren Texten entfernen.
5. Mobile Browser Smoke:

   - Suche
   - Sprache wechseln
   - Kategorie filtern
   - Entry kopieren
   - Deep Link oeffnen

## Website `nexusproject.dev`

Status:

- `npm run build` erfolgreich.
- `npm run build:ci` erfolgreich.
- Bundle Budget erfolgreich.
- Struktur deckt Public Story, Ecosystem, Security/API, Developer, Account und Pricing ab.
- Payment Feature ist production-seitig vorsichtig gegated.

Blocker:

- ~~`npm run test:api:integration` scheitert in Node, weil `apiHostPolicy.ts` direkt `import.meta.env.MODE` liest.~~ Erledigt am 2026-05-06.
- Live-Payment-E2E wurde bewusst nicht ausgefuehrt.

Fertigstellen:

1. ~~`apiHostPolicy.ts` Node-sicher machen:~~

   - Vite env nur defensiv lesen.
   - In Node/tsx Tests auf `process.env` oder sichere Defaults fallen.
   - Danach Integrationstest erneut ausfuehren.

2. ~~API-Integration testen:~~

   ```powershell
   npm run test:api:integration
   ```

3. Payment-Release entscheiden:

   - Entweder Feature Flag bis Provider-Freigabe aus lassen.
   - Oder Staging Provider konfigurieren und E2E gegen Staging laufen lassen.

4. Browser-Smoke:

   - Startseite
   - Login Page
   - Account Page
   - Pricing
   - API Status/Bootstrap
   - Mobile Viewport

## P0 Blocker vor jedem Release Candidate

1. ~~Main und Mobile Build reparieren.~~

   Erledigt am 2026-05-06: `ignoreDeprecations: "6.0"`, CSS Side-Effect Declarations und Tailwind/PostCSS-Kompatibilitaet sind gesetzt; beide Builds laufen gruen.

   Aktueller Fehler:

   - TypeScript 6 wertet `baseUrl` als deprecated und blockiert `tsc -b`.
   - Nach Umgehung des Build-Modus fehlt eine CSS Side-Effect Declaration fuer `./index.css`.

   Optionen:

   - `ignoreDeprecations: "6.0"` in die relevanten `tsconfig.json` aufnehmen.
   - Oder `baseUrl`/Path-Setup modernisieren.
   - `src/vite-env.d.ts` oder eine CSS-Declaration ergaenzen:

     ```ts
     /// <reference types="vite/client" />
     ```

   Akzeptanz:

   ```powershell
   npm --prefix "Nexus Main" run build
   npm --prefix "Nexus Mobile" run build
   ```

2. ~~Nexus Code und Code Mobile Build reparieren.~~

   Erledigt am 2026-05-06: `@tailwindcss/postcss` ist eingebunden, Tailwind-4-`@apply`-Brueche sind bereinigt, beide Builds laufen gruen.

   Aktueller Fehler:

   - Tailwind 4 wird direkt als PostCSS Plugin genutzt.
   - Tailwind verlangt `@tailwindcss/postcss` oder eine passende Vite-Integration.

   Akzeptanz:

   ```powershell
   npm --prefix "Nexus Code" run build
   npm --prefix "Nexus Code Mobile" run build
   ```

3. ~~Website API Integration reparieren.~~

   Erledigt am 2026-05-06: `apiHostPolicy.ts` liest `import.meta.env` defensiv; `npm run test:api:integration` besteht.

   Akzeptanz:

   ```powershell
   cd "F:\Coding\Nexus Workspace\nexusproject.dev"
   npm run test:api:integration
   ```

4. API Release-Daten bereinigen.

   Akzeptanz:

   - Keine lokalen Ingest Keys in Repo-Daten.
   - Keine Dev-User in Production-Datensets.
   - Production verlangt env-basierte Secrets.
   - Runbook und Deployment stimmen ueberein.

5. ~~RC Gate als ein Kommando oder CI-Workflow definieren.~~

   Status 2026-05-06:

   - Erledigt als `npm run release:gate`.
   - Fast-Modus fuer schnelle lokale RC-Vorpruefung: `npm run release:gate -- --fast`.
   - API Contract/Attack Tests sind optional zuschaltbar: `npm run release:gate -- --with-api-contract`.
   - GitHub Actions Workflow `.github/workflows/release-gate.yml` ist angelegt.

   Mindestumfang:

   ```powershell
   npm run verify:single-react
   npm run verify:ecosystem
   npm run doctor:release
   npm --prefix "Nexus Main" run build
   npm --prefix "Nexus Mobile" run build
   npm --prefix "Nexus Code" run build
   npm --prefix "Nexus Code Mobile" run build
   npm --prefix "Nexus Wiki" run build:ci
   cd "F:\Coding\Nexus Workspace\nexusproject.dev"
   npm run build:ci
   npm run test:api:integration
   ```

## P1 Release-Hardening

1. Gemeinsames UI-System und View-Shell einfuehren.

   Ziel:

   - Views wirken wie ein zusammenhaengendes Produkt.
   - Main und Mobile teilen Layout- und Interaktionskonzepte.
   - Toolbars, Inspector Rails, Statusleisten, Empty/Error/Loading States und Confirm Dialogs sind konsistent.
   - Core liefert View Manifest, Layout Schema, Command Registry, Panel Engine und Interaction State als stabile Grundlage.

   Akzeptanz:

   - Mindestens Dashboard, Notes, Tasks und Canvas nutzen die neue Shell.
   - Jede dieser Views hat klare Desktop- und Mobile-Regeln.
   - Keine Textueberlaeufe, keine verschachtelten Cards, keine springenden Toolbars.
   - Primaeraktionen, Filter, Suche und Statusfeedback sind einheitlich.

   Status 2026-05-06:

   - Erster Shell-Schnitt in Nexus Main umgesetzt: `MainShellLayout` plus `MainViewHost`, reduzierte Status-Bar, Error Boundaries und stabile View-Mount-Schicht.
   - Zweiter v6-Schnitt umgesetzt: `NexusV6ViewShell` rahmt alle Main-Views mit modernem Header, Fokusmodus, kompakter Quick Navigation, optionaler Inspector Rail, Panel-Modell und responsiven Regeln.
   - Refinement umgesetzt: Content-Flaeche priorisiert, Inspector standardmaessig geschlossen, sichtbares Action/Activity-Modell entfernt, transparente blurry Gradient-/Glow-Surfaces verstaerkt.
   - Product-Page-Angleichung umgesetzt: Main nutzt die `nexusproject.dev`-artige Space-/Cosmic-Palette, Cyan/Indigo/Violet-Glows, Grid/Noise-Anmutung, glass panels und Avenir/Plus-Jakarta/Outfit-nahe Typografie.
   - Notes-Refinement umgesetzt: Header/Orb sind kompakter, Notes Library, Editor, Preview, Formatting Toolbar und Statuszeile nutzen ein klareres v6-Schreiblayout mit stabileren Flaechen und responsivem Stack.
   - UI-Cleanup umgesetzt: globale Context-Bar entfernt, Status-Bar auf Kerninfos reduziert, Sidebar-Metriken und Quick Actions schlanker gemacht, v6-Header-Actions reduziert und Hover-Bewegungen fuer Actions/Panels stabilisiert.
   - Core liefert erste View-Manifeste fuer gemeinsame Titel, Actions, Panels, Modes und Statussignale.
   - Core liefert jetzt Layout Schema v2, Panel Engine, resolved Command Registry und einen Execution Hook; `NexusV6ViewShell` nutzt diese Daten fuer Inspector, Commands und Layout-Diagnose.
   - Dashboard/Notes/Tasks/Canvas muessen noch tiefer auf gemeinsame ViewShell-/Toolbar-/Inspector-Primitiven migriert werden.

2. Main-App-Struktur konsolidieren.

   Ziel:

   - Eine zentrale View Registry.
   - Eine Shell/Host-Komposition.
   - Keine doppelte Navigation in `App.tsx`, `mainViewHost.tsx` und `mainAppConfig.ts`.

   Status 2026-05-06:

   - `App.tsx` nutzt die zentrale Shell/Host-Komposition und enthaelt keinen zweiten toten Inline-Shell-Renderblock mehr.
   - Alle Main-View-Instanzen laufen durch `NexusV6ViewShell`; Quick Navigation prewarmt Ziel-Views ueber die bestehende Preload-Pipeline.
   - Boot- und Preload-Konstanten sind in `mainAppConfig.ts` gebuendelt.
   - `mainViewRegistry.ts` zentralisiert Core-Manifest-Metadaten, Icons, Main/Footer/Developer-Gruppen, Preload-Prioritaeten, Heavy-Views und persistente View-Caches.
   - Sidebar, `viewPreload.tsx` und `mainAppConfig.ts` nutzen diese Registry; Toolbar/Command Palette und Mobile sollen als naechstes folgen.

3. Encoding und Copy bereinigen.

   Ziel:

   - Alle deutschen Umlaute, Symbole und Markdown-Seeds sind UTF-8-korrekt.
   - Keine sichtbaren UTF-8-Mojibake-Artefakte in UI-Texten oder Dokumentation.
   - Ein kleiner Test sucht nach typischen Mojibake-Sequenzen.

   Status 2026-05-06:

   - `tools/verify-encoding.mjs` und `npm run verify:encoding` sind angelegt.
   - Der Check scannt Source- und Docs-Pfade und besteht aktuell.

4. View-Smoke-Matrix bauen.

   Pro View:

   - Oeffnen
   - Create
   - Edit
   - Delete/Archive
   - Persistenz nach Reload
   - Offline/API-Fallback
   - Mobile Layout
   - Keyboard oder Touch-Hauptflow

5. API Contract und Attack Tests in CI.

   Ziel:

   - Node und Rust Control Plane bleiben verhaltensgleich.
   - Unsichere Origins, unsignierte Mutations und schwache Keys werden blockiert.

6. Electron Security fuer Nexus Code angleichen.

   Ziel:

   - Context Isolation, Sandbox und Navigation bleiben hart.
   - Filesystem-Mutationen laufen nur innerhalb erlaubter Roots.
   - Terminal-Ausfuehrung bleibt begrenzt und auditierbar.

7. Signing und Notarization.

   Ziel:

   - Windows Signierung definiert.
   - macOS `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` gesetzt.
   - `xcrun notarytool` im macOS Build Runner vorhanden.
   - Android Signing/Keystore dokumentiert.

8. Control UI Deployment klaeren.

   `verify:ecosystem` erwartet offenbar einen lokalen privaten Control-Workspace. Fuer Release braucht es eine dokumentierte Entscheidung:

   - Ist Control UI Teil dieses Releases?
   - Liegt es in `NexusAPI`, in einem privaten Workspace oder wird es separat versioniert?
   - Welcher Build ist der offizielle?

## P2 Produktpolitur und Ideen

1. Release Health Dashboard.

   Eine DevTools-/Control-Seite, die Build Manifest, API Health, Feature Catalog, Layout Schema, aktuelle App-Versionen und letzte Sync-Fehler zusammenfasst.

2. Gefuehrtes Onboarding.

   Erster Start mit:

   - Workspace auswaehlen
   - Daten importieren
   - Notes/Tasks/Canvas kurz initialisieren
   - API Login optional verbinden

3. Diagnose-Export fuer Support.

   Ein Button erzeugt ein redigiertes Paket:

   - App Version
   - Runtime Status
   - Feature Catalog Version
   - View Validation Result
   - letzte Fehler ohne Secrets

4. Staging/Canary Channel.

   - Stable: nur canonical production API.
   - Canary: explizite Staging API per signiertem Manifest.
   - Dev: local API erlaubt, aber sichtbar markiert.

5. Template Packs.

   - Notes Templates
   - Task Boards
   - Canvas Layouts
   - Code Snippets
   - Flux Workflows

6. Backup und Restore.

   - Crash-sicherer Workspace Snapshot.
   - Versionierte lokale Backups.
   - Import Preview mit Konfliktliste.

7. Control Feature-Flag Editor.

   - Feature Catalog editieren
   - Layout Schema validieren
   - Release Rollout stufenweise promoten
   - Audit Log sichtbar machen

## Empfohlener Fertigstellungsablauf

### Phase 1: Build-Basis stabilisieren

Ziel: Alle Apps bauen lokal reproduzierbar.

Schritte:

1. ~~TypeScript-6-Blocker in Main/Mobile beheben.~~
2. ~~CSS Side-Effect Declaration ergaenzen.~~
3. ~~Tailwind-4-PostCSS in Code/Code Mobile migrieren.~~
4. ~~Alle vier App-Builds erneut ausfuehren.~~
5. ~~`verify:ecosystem` danach erneut laufen lassen.~~

Status 2026-05-06: Phase 1 ist erledigt. Main, Mobile, Code und Code Mobile bauen; `verify:single-react` und `verify:ecosystem` bestehen.

Exit-Kriterium:

- Main, Mobile, Code und Code Mobile bauen ohne Fehler.
- Keine neuen Ecosystem-Verify-Fails.

### Phase 2: API und Daten release-sauber machen

Ziel: Keine Dev-Secrets oder lokalen Daten im Releasepfad.

Schritte:

1. Ingest Keys aus Repo-Daten entfernen.
2. Dev-User Seeds aus Production-Daten entfernen.
3. Production Env erzwingen.
4. Contract- und Attack-Tests laufen lassen.
5. Hosted API Health und Bootstrap pruefen.

Exit-Kriterium:

- API Contract Tests bestehen.
- Attack Smoke besteht.
- Production Runbook passt zu realer Config.

### Phase 3: View-RC pruefen

Ziel: Jede Hauptview hat einen bestandenen Nutzerflow.

Schritte:

1. Desktop Main in Dev/Preview starten.
2. Mobile Preview starten.
3. Pro View die Smoke-Matrix abarbeiten.
4. Persistenz und Reload testen.
5. Mobile Layout und Touch-Flows testen.
6. Fehler und Luecken als Issues oder Checklist Items erfassen.

Exit-Kriterium:

- Jede View hat mindestens einen dokumentierten Happy Path.
- Kritische Destructive Flows sind bestaetigt.
- Keine leeren oder toten Primaeraktionen.

### Phase 4: Website und Wiki finalisieren

Ziel: Public Story und Dokumentation sind konsistent mit dem Produktstand.

Schritte:

1. Website Integrationstest reparieren.
2. Website Browser-Smoke laufen lassen.
3. Wiki Known Issues und Release Checklist verlinken.
4. Screenshots oder kurze visuelle Belege ergaenzen.
5. Build CI fuer beide erneut ausfuehren.

Exit-Kriterium:

- Website `build:ci` und API Integration bestehen.
- Wiki `build:ci` besteht.
- Public Texte versprechen nur, was App/API aktuell leisten.

### Phase 5: Packaging und Release Candidate

Ziel: Installierbare Artefakte und klare Release Notes.

Schritte:

1. Versionen synchronisieren.
2. Release Channel setzen.
3. Windows/macOS/Android Signing vorbereiten.
4. Installer/Packages bauen.
5. Fresh-install Smoke auf sauberem System.
6. Upgrade Smoke von vorherigem lokalen Build.
7. Release Notes schreiben:

   - Neue Features
   - Bekannte Einschraenkungen
   - Systemanforderungen
   - Datenschutz/Security-Hinweise
   - Rollback-Hinweise

Exit-Kriterium:

- Artefakte installierbar.
- App startet ohne Dev-Server.
- Login/API-Fallback verhaelt sich kontrolliert.
- Keine Secrets im Bundle.
- Release Notes und Wiki passen.

## Definition of Done fuer Nexus 1.0/RC

Ein Nexus Release Candidate ist fertig, wenn:

- Alle App-Builds bestehen.
- Ecosystem Verify besteht.
- Release Doctor keine harten Failures zeigt und Warnungen bewusst akzeptiert oder behoben sind.
- Website und Wiki CI bestehen.
- API Contract und Attack Tests bestehen.
- Keine Dev-Secrets oder lokalen Keys in release-relevanten Daten liegen.
- Jede Hauptview einen dokumentierten Smoke bestanden hat.
- macOS/Windows/Android Packaging-Entscheidungen dokumentiert sind.
- Public Website und Wiki keine nicht erfuellten Produktversprechen machen.
- Known Issues ehrlich dokumentiert sind.

## Naechste konkrete Arbeitsliste

1. ~~Main/Mobile TypeScript und CSS Build fixen.~~
2. ~~Code/Code Mobile Tailwind 4 Build fixen.~~
3. ~~Website `import.meta.env` Node-Fallback fixen.~~
4. API Daten und Git-Hygiene bereinigen.
5. API Contract/Attack Tests laufen lassen.
6. Gemeinsame View-Shell, Tokens und UI-Komponenten definieren. Status: in Arbeit, Main nutzt jetzt `MainShellLayout`/`MainViewHost`, `NexusV6ViewShell`, reduzierte Status-Bar, v6-Tokens und Core-View-Manifeste; v6-Shell ist auf mehr Content-Space, transparente Blur/Gradient-Glows, optionalen Inspector und kompaktere Header getrimmt.
7. ~~Core um View Manifest v2, Layout Schema v2, Command Registry und Panel Engine erweitern.~~ Erledigt als Core-Grundlage: `packages/nexus-core/src/views.ts` liefert Layout Schema v2, Panel Engine, resolved Command Registry und `executeNexusViewCommand`; Nexus Main nutzt diese Daten in `NexusV6ViewShell`. Offen bleibt die view-spezifische Handler-Anbindung pro Feature.
8. Dashboard, Notes, Tasks und Canvas als erste Views auf die neue Shell migrieren. Status: Basis erledigt, alle Main-Views laufen durch `NexusV6ViewShell`; Notes hat zusaetzlich ein internes v6-Layout-Refinement erhalten, globale Shell/Sidebar/Status-Bar sind cleaner und ruhiger, tiefere Toolbar-/Inspector-Migration bleibt offen.
9. Main-App-Registry konsolidieren oder tote Host-Dateien entfernen. Status: grosser Teil erledigt, zentrale Host-Dateien werden genutzt, toter Inline-Shell-Code ist entfernt, Boot-/Preload-Konfig liegt in `mainAppConfig.ts`, und `mainViewRegistry.ts` speist Sidebar, ViewPreload, Boot-Prioritaeten, Heavy-View-Liste und persistenten Cache. Offen: Toolbar/Command Palette und Mobile voll auf Registry ziehen.
10. ~~Encoding-Artefakte repo-weit suchen und Gate ergaenzen.~~ Erledigt: `npm run verify:encoding` scannt Source/Docs und besteht aktuell.
11. ~~View-Smoke-Matrix als Markdown oder Testplan ins Wiki uebernehmen.~~ Erledigt: `docs/VIEW_SMOKE_MATRIX.md` plus Wiki-Eintrag `release-view-smoke-matrix`.
12. ~~Release CI Job definieren.~~ Erledigt: `npm run release:gate` plus `.github/workflows/release-gate.yml`.
13. Signing/Notarization/Android Keystore final dokumentieren.
