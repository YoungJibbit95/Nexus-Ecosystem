# Nexus Code Release Checklist

Stand: 2026-06-30

## Renderer und UI-System

- [x] Strikten Account-Gate als eigene Startflaeche vor der Workbench einziehen.
- [x] Lokale Bootstrap-Fallbacks aus dem Workbench-Pass entfernen.
- [x] Nexus-Code-eigenen Username/Passwort-Login bauen, Passwort nicht speichern und Session ueber `/auth/login` plus `/api/v1/session` normalisieren.
- [x] Lokalen Workspace-Start als bewusst markierten IDE-Modus erlauben, damit Editor/File/Search/Terminal ohne Cloud starten.
- [x] Control-API-Bootstrap-Fehler in lokale Runtime degradieren statt den Renderer zu blockieren.
- [x] Gemeinsame Nexus-Code-Primitives fuer Buttons, Inputs, Cards, Badges und Panel-Header fertig integrieren.
- [x] Primaertexte duerfen in Launchpad-Actions und neuen Panel-Primitives nicht hart abgeschnitten werden.
- [x] Settings fuer Glow, Blur, Motion, Radius, Textgroessen und Low-Power-Fallback erweitern.
- [x] Theme Editor mit Custom Surface/Input-Farben, Rezept-Presets, Copy JSON und Reset Design ausbauen.
- [x] Performance-Budget fuer Glow, Blur, Motion und Background konkreter bewerten.
- [x] Search, Git, Problems und Terminal auf ruhigere Nexus-Panel-Optik mit besseren Empty/Action States heben.
- [ ] Glow, Blur, Roundness und Motion in echten Electron-Viewports visuell pruefen.

## Workbench und Docking

- [x] Layout-Persistenz auf `nexus-code.workbench-layout.v3` migrieren und `v1/v2` weiter einlesen.
- [x] Snap-Zones links, rechts, unten und hidden im Modell validieren.
- [x] Explorer, Search, Git, Issues, PRs, Projects, Extensions, Account, Debug, Problems und Terminal als Dock-Ziele modellieren.
- [x] Layout-Reset und aktive Dock-Zonen per Command Palette/Bottom-Dock bedienbar machen.
- [x] Layout-v2 gegen korrupte Storage-Daten, Duplikate und Bucket-Layouts modellseitig absichern.
- [x] Drop-Preview- und Panel-Move-Helper fuer Snap-Zone-Docking bereitstellen.
- [x] Drag-Handle, Snap-Zone-Buttons und Drop-Overlay fuer SidePanel und BottomDock integrieren.
- [x] BottomDock Compact-Fallback gegen Statusbar/Text-Clipping einbauen.
- [x] Settings um IDE-artige Docking-, Layout-, Theme- und Performance-Quick-Actions erweitern.
- [x] Side-/Bottom-Panel-Groessen produktiver begrenzen und Sidebar/Rail schmaler machen.
- [ ] Drag-Drop und defekte Persistenzdaten in echten Electron-Viewports visuell testen.
- [ ] Launchpad ohne Scrollzwang bei 900x512 pruefen.

## IDE-Core und File System

- [x] File Tree folder-first und danach Dateien nach Extension/Name sortieren.
- [x] Grosse Trees mit flacher/virtueller Renderliste stabil halten.
- [x] Open-State, Refresh, Loading, Empty und Error States modellseitig mit IDE-Core-Smoke abdecken.
- [x] Docking-Modell mit IDE-Core-Smoke fuer korrupte Layoutdaten, Duplikate, Moves, Drop Preview und sichtbare Fallbacks abdecken.
- [x] FileExplorer mit sichtbaren Extension-Gruppen, ruhigem Refresh und besseren Empty/Error/Search-States ausbauen.
- [x] CodeMirror Completions fuer JS/TS/Python/Rust/Go/CSS/JSON/Markdown language-aware ausbauen.
- [x] Completion-Overlays begrenzen, Low-Power respektieren und LSP/Snippet-Dedupe absichern.
- [x] Palette und Spotlight mit Fuzzy-/Initialen-Ranking, Datei-Dedupe und saubererem Focus/ARIA-Verhalten verbessern.
- [x] Editor-Symbol-Extraktion und aktive Scope-Anzeige fuer CodeMirror integrieren.
- [ ] Open-State, Refresh, Loading, Empty und Error States manuell pruefen.
- [ ] Editor, Tabs, Search, Problems und Terminal duerfen die Codeflaeche nicht verdraengen.
- [x] CodeMirror 6 bleibt Engine; breite Syntax plus LSP/Completion-Smoke pruefen.

## Account, API und GitHub

- [x] Ohne Nexus Session kein Cloud-Workbench-Start; lokaler Workspace bleibt als eigener Offline-Modus verfuegbar.
- [x] API-/Bootstrap-Fehler werden als degraded/offline Status gezeigt, ohne den Editor-Renderer zu blockieren.
- [x] Account-Panel auf Nexus/Local/Signed-out Session-Modell umstellen.
- [x] GitHub OAuth Scopes um `project` erweitern.
- [x] Issues: Listen, Erstellen, Bearbeiten, Schliessen, Labels, Assignees, Kommentare.
- [x] Pull Requests: Liste, Detail, Diff, Checks, Review-Kommentare, Review Submit, Merge mit Confirm.
- [x] Projects v2: User/Org Projects, Items, Felder, Issue/PR-Zuordnung.
- [x] Issues, PRs und Projects als eigene Workbench-Panels mit Loading, Empty, Error, Refresh und Basis-Actions integrieren.
- [x] Issues, PRs und Projects per Command Palette direkt oeffnen.
- [x] GitHub-Workbench mit Scope/Auth/Rate-Limit/Validation-Hinweisen und Confirm/Safety-Flows haerten.

## Extensions und IDE Platform

- [x] Extension Runtime Snapshot fuer installierte, aktive und beigetragene Module erzeugen.
- [x] Extension-Panel mit Copy Plan, Reset Defaults und stabileren Registry-Actions ausbauen.
- [x] Extension-Smoke/Panel-Markup in UI-Smoke aufnehmen.
- [x] Extension-Commands in Command Palette und Spotlight routen.
- [x] Extension-Command-Fallbacks fuer Format, Diagnostics, Git, Terminal und Theme/Settings integrieren.

## Pflichtchecks

- [x] `npm --prefix "./Nexus Code" run lint`
- [x] `npm --prefix "./Nexus Code" run build`
- [x] `npm run verify:single-react`
- [x] `npm --prefix "./Nexus Code" run electron:ensure`
- [x] `npm --prefix "./Nexus Code" run smoke:ui`
- [x] `npm --prefix "./Nexus Code" run smoke:ide-core`
- [x] SSR-Smoke-Struktur: 1440x900, 1024x768, 900x512, 390x900 fuer Workbench, Launchpad, Account und Settings
- [x] SSR-Smoke-Struktur: PanelChrome und GitHub-Workbench ohne App-Bootgate
- [x] IDE-Core-Smoke: 19 Szenarien inklusive Filetree, Docking, Extensions, Account-Start, Palette, Spotlight, Symbols und Completion Helpers
- [ ] Visual Smoke: 1440x900
- [ ] Visual Smoke: 1024x768
- [ ] Visual Smoke: 900x512
- [ ] Visual Smoke: 390x900
