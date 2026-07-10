# Nexus Code Release Checklist

Stand: 2026-07-10

## 2026-07-10 Optimization/QA Gate Notes

- [x] Vite Manual-Chunks fuer Nexus-Code-Editor-Modelle pruefen; Ziel ist kleinere stabile Editor-Chunks ohne UI-Code-Aenderung.
- [x] Visual-Smoke-Szenariomatrix in `src/testing/visualSmokeScenarios.js` zentralisieren, damit Runner und Browser-Harness dieselben Viewports/Surfaces nutzen.
- [x] Visual-Smoke-Full-Preset umfasst aktuell 4 Viewports x 30 Surfaces (120 Screenshots), inklusive CodeMirror-Sprachsurfaces fuer JS/MJS/JSX, JSON/JSONC, CSS/SCSS, Python, Rust, Go, HTML, YAML, SQL, Shell, PHP, Java, C++, Gherkin, RDF, LaTeX, XQuery und GLSL/WGSL-Fallback.
- [x] Visual-Smoke-Focused-Preset dokumentieren: `NEXUS_CODE_VISUAL_SMOKE_PRESET=focused` prueft `launchpad`, `editor-rust` und `editor-glsl` auf `desktop` und `short-wide` (6 Screenshots).
- [x] Visual-Smoke-Evidence sauberer machen: Runner schreibt neben Screenshots `summary.json` und `summary.md` mit Preset, Surface-/Viewport-Filtern, Timeouts, Environment und fehlgeschlagenen Scenario-IDs.
- [ ] Full Visual-Smoke `npm --prefix "./Nexus Code" run smoke:visual` in aktueller Electron/GPU-Umgebung erfolgreich abschliessen und `summary.md`/`summary.json` archivieren. Falls Electron vor Rendering mit `GPU process isn't usable` oder `ContextResult::kFatalFailure` beendet, als environment-blocked dokumentieren, nicht als Visual-Smoke-Erfolg.
- [x] Fokussierter Visual-Smoke `NEXUS_CODE_VISUAL_SMOKE_PRESET=focused` am 2026-07-10 erfolgreich mit 6 Screenshots, `summary.json` und `summary.md` unter `F:\Coding\Nexus Workspace\.tmp\nexus-code-visual-smoke-focused-integrated`.

## 2026-07-01 Nexus-Code-Plan: Docking, Layout, QA-Agent

- [x] Ungueltige Snap-Zone-Kommandos im Docking-Modell als no-op behandeln, damit kaputte Commands keine Panel-Reihenfolge umsortieren.
- [x] Persistierte Zone-Buckets mit leeren, verschachtelten, duplizierten oder alias-basierten Panel-IDs im IDE-Core-Smoke absichern.
- [x] Keyboard-/Command-freundliche Fokus-Helfer fuer sichtbare Side-/Bottom-Panels bereitstellen.
- [x] Strict-Login-Smoke auf den aktuellen Vertrag ausrichten: Local Mode ist konfiguriert, aber kein Nexus-API-Start.
- [x] Fokus-Helfer in Command-Palette-/Shortcut-Flows verdrahten, inklusive Next/Previous und direkter Left/Right/Bottom-Fokus-Kommandos.
- [x] Dev-Start gegen belegte Ports haerten: blockierende HTTP-Prozesse werden mit PID geloggt und ein isolierter Folgeport wird genutzt.
- [x] Boot-Phasen als Performance-Metriken erfassen: Account-Gate, Control-Bootstrap, View-Access, Editor-Warmup und Gesamtzeit.
- [ ] Drag-Drop und defekte Persistenzdaten in echten Electron-Viewports visuell testen.

## Renderer und UI-System

- [x] Strikten Account-Gate als eigene Startflaeche vor der Workbench einziehen.
- [x] Lokale Bootstrap-Fallbacks aus dem Workbench-Pass entfernen.
- [x] Nexus-Code-eigenen Username/Passwort-Login bauen, Passwort nicht speichern und Session ueber `/auth/login` plus `/api/v1/session` normalisieren.
- [x] Nexus-Code-Login-Body an den strict API-Vertrag anpassen; unbekannte Felder wie `source` werden nicht mehr gesendet.
- [x] Login-Fehlerdetails aus `details`/`errors` anzeigen, damit API-400 nicht nur als generisches `BAD_REQUEST` erscheint.
- [x] Lokalen Workbench-Start wieder deaktivieren: Local Mode bleibt normalisierbar, rendert aber keine Workbench.
- [x] Start auf Strict-Login umstellen: leere, alte oder abgelaufene Sessions landen im Account-Gate statt in der Workbench.
- [x] Editor-Warmup erst nach gueltiger Strict-Login-Session starten, damit der Login-Screen nicht den grossen Editor-Bundle vorlaedt.
- [x] Control-API-Bootstrap-Fehler auf Account-/Recovery-Screen blocken statt lokale Runtime freizugeben.
- [x] Electron-Renderer-Diagnose fuer Load-Events, Renderer-Konsole, Window-Close und Quit einbauen.
- [x] Gemeinsame Nexus-Code-Primitives fuer Buttons, Inputs, Cards, Badges und Panel-Header fertig integrieren.
- [x] Primaertexte duerfen in Launchpad-Actions und neuen Panel-Primitives nicht hart abgeschnitten werden.
- [x] Settings fuer Glow, Blur, Motion, Radius, Textgroessen und Low-Power-Fallback erweitern.
- [x] Theme Editor mit Custom Surface/Input-Farben, Rezept-Presets, Copy JSON und Reset Design ausbauen.
- [x] Performance-Budget fuer Glow, Blur, Motion und Background konkreter bewerten.
- [x] Search, Git, Problems und Terminal auf ruhigere Nexus-Panel-Optik mit besseren Empty/Action States heben.
- [x] Terminal, Debug und Titlebar weiter entcluttern: kompaktere Toolbars, bessere Empty/Error/Busy States und textfit-sichere Controls.
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
- [x] Ungueltige Snap-Zone-Kommandos veraendern weder Preset noch Panel-Reihenfolge.
- [x] Panel-Fokus-Helfer fuer Next/Previous und konkrete Dock-Ziele modellseitig bereitstellen.
- [x] Responsive Docking-Helpers fuer Size-Presets, Reset ohne Zonenverlust und kompakte Viewport-Clamps ergaenzen.
- [x] Persistierte Dock-Buckets gegen Zyklen, verschachtelte Listen und ueberlange Daten absichern.
- [ ] Drag-Drop und defekte Persistenzdaten in echten Electron-Viewports visuell testen.
- [ ] Launchpad ohne Scrollzwang bei 900x512 pruefen.

## IDE-Core und File System

- [x] File Tree folder-first und danach Dateien nach Extension/Name sortieren.
- [x] Grosse Trees mit flacher/virtueller Renderliste stabil halten.
- [x] Open-State, Refresh, Loading, Empty und Error States modellseitig mit IDE-Core-Smoke abdecken.
- [x] Docking-Modell mit IDE-Core-Smoke fuer korrupte Layoutdaten, Duplikate, Moves, Drop Preview, Fokus-Helfer und sichtbare Fallbacks abdecken.
- [x] FileExplorer mit sichtbaren Extension-Gruppen, ruhigem Refresh und besseren Empty/Error/Search-States ausbauen.
- [x] CodeMirror Completions fuer JS/TS/Python/Rust/Go/CSS/JSON/Markdown language-aware ausbauen.
- [x] Completion-Overlays begrenzen, Low-Power respektieren und LSP/Snippet-Dedupe absichern.
- [x] Completion-Ranking mit LSP-Overscan, Snippet-Prioritaet und lokalen Current-Document-Boosts haerten.
- [x] Editor-Status fuer Sprache, Engine, LSP-Fallbacks, Diagnostics und Completion-Quellen verstaendlicher machen.
- [x] JS/TS/Python-LSP-Capabilities mit Serverlabel, Env-Override und Install-Hinweisen modellieren.
- [x] Definition, Rename, Formatting und Code Actions als stabile LSP-Feature-Contracts im IDE-Core-Smoke absichern.
- [x] Rust, Go und C/C++ Language-Server-Registry fuer rust-analyzer, gopls und clangd mit Env-Overrides und Install-Hints ergaenzen.
- [x] LSP Runtime-Capabilities aus `initialize` normalisieren und Feature-Contracts capability-bewusst machen.
- [x] F12 Definition, F2 Rename, Shift+Alt+F Formatting und Mod+. Code Actions risikoarm an die Runtime anbinden.
- [x] Diagnostics-Pull und Document-Close-Sync im LSP-Service absichern.
- [x] Palette und Spotlight mit Fuzzy-/Initialen-Ranking, Datei-Dedupe und saubererem Focus/ARIA-Verhalten verbessern.
- [x] Editor-Symbol-Extraktion und aktive Scope-Anzeige fuer CodeMirror integrieren.
- [x] Spotlight-Symboltreffer aus Datei-Content, Match-Reasons und lokale Current-Document-Completions integrieren.
- [ ] Open-State, Refresh, Loading, Empty und Error States manuell pruefen.
- [ ] Editor, Tabs, Search, Problems und Terminal duerfen die Codeflaeche nicht verdraengen.
- [x] CodeMirror 6 bleibt Engine; breite Syntax plus LSP/Completion-Smoke pruefen.

## Account, API und GitHub

- [x] Ohne gueltige Nexus Session kein Workbench-Start.
- [x] API-/Bootstrap-Fehler werden als degraded Status im Account-Gate gezeigt, ohne den Editor-Renderer schwarz werden zu lassen.
- [x] Account-Panel auf Nexus/Signed-out Session-Modell zurueckschneiden; Local API bleibt nur Endpoint-Preset.
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
- [x] IDE-Core-Smoke: 51 Szenarien inklusive Filetree, Docking, Fokus-Helfer, Extensions, Strict Login, LSP-Status, LSP-Capabilities, Edits, Diagnostics-Sync, Palette, Spotlight, Symbols, Scope und Completion Helpers
- [x] IDE-Core-Smoke: Login-Payload-Vertrag gegen unbekannte Auth-Felder absichern.
- [x] Electron Dev Probe: isolierter Renderer-Start prueft Route-Import und beendet sauber; Strict-Login-Vertrag ist im IDE-Core-Smoke abgedeckt
- [ ] `npm --prefix "./Nexus Code" run smoke:visual` ohne Electron/GPU-Sandbox-Blocker
- [x] Visual-Smoke-Harness-Matrix: 1440x900, 1024x768, 900x512, 390x900
- [x] Visual-Smoke-Harness-Matrix: Workbench, Launchpad, Account, Settings, PanelChrome, GitHub Issues/Projects und breite CodeMirror-Sprachsurfaces
