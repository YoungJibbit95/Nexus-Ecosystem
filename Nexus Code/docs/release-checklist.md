# Nexus Code Release Checklist

Stand: 2026-06-29

## Renderer und UI-System

- [x] Strikten Account-Gate als eigene Startflaeche vor der Workbench einziehen.
- [x] Lokale Bootstrap-Fallbacks aus dem Workbench-Pass entfernen.
- [x] Gemeinsame Nexus-Code-Primitives fuer Buttons, Inputs, Cards, Badges und Panel-Header fertig integrieren.
- [x] Primaertexte duerfen in Launchpad-Actions und neuen Panel-Primitives nicht hart abgeschnitten werden.
- [x] Settings fuer Glow, Blur, Motion, Radius, Textgroessen und Low-Power-Fallback erweitern.
- [ ] Glow, Blur, Roundness und Motion in echten Electron-Viewports visuell pruefen.

## Workbench und Docking

- [x] Layout-Persistenz auf `nexus-code.workbench-layout.v2` migrieren.
- [x] Snap-Zones links, rechts, unten und hidden im Modell validieren.
- [x] Explorer, Search, Git, Issues, PRs, Projects, Extensions, Account, Debug, Problems und Terminal als Dock-Ziele modellieren.
- [x] Layout-Reset und aktive Dock-Zonen per Command Palette/Bottom-Dock bedienbar machen.
- [x] Layout-v2 gegen korrupte Storage-Daten, Duplikate und Bucket-Layouts modellseitig absichern.
- [x] Drop-Preview- und Panel-Move-Helper fuer Snap-Zone-Docking bereitstellen.
- [ ] Drag-Drop und defekte Persistenzdaten in echten Electron-Viewports visuell testen.
- [ ] Launchpad ohne Scrollzwang bei 900x512 pruefen.

## IDE-Core und File System

- [x] File Tree folder-first und danach Dateien nach Extension/Name sortieren.
- [x] Grosse Trees mit flacher/virtueller Renderliste stabil halten.
- [x] Open-State, Refresh, Loading, Empty und Error States modellseitig mit IDE-Core-Smoke abdecken.
- [ ] Open-State, Refresh, Loading, Empty und Error States manuell pruefen.
- [ ] Editor, Tabs, Search, Problems und Terminal duerfen die Codeflaeche nicht verdraengen.
- [ ] CodeMirror 6 bleibt Engine; breite Syntax plus LSP-Smoke pruefen.

## Account, API und GitHub

- [x] Ohne Token plus User ID oder Username kein Workbench-Render.
- [x] Bootstrap-Fehler bleiben fail-closed statt lokale Runtime-Daten zu rendern.
- [x] GitHub OAuth Scopes um `project` erweitern.
- [x] Issues: Listen, Erstellen, Bearbeiten, Schliessen, Labels, Assignees, Kommentare.
- [x] Pull Requests: Liste, Detail, Diff, Checks, Review-Kommentare, Review Submit, Merge mit Confirm.
- [x] Projects v2: User/Org Projects, Items, Felder, Issue/PR-Zuordnung.
- [x] Issues, PRs und Projects als eigene Workbench-Panels mit Loading, Empty, Error, Refresh und Basis-Actions integrieren.
- [x] Issues, PRs und Projects per Command Palette direkt oeffnen.
- [x] GitHub-Workbench mit Scope/Auth/Rate-Limit/Validation-Hinweisen und Confirm/Safety-Flows haerten.

## Pflichtchecks

- [x] `npm --prefix "./Nexus Code" run lint`
- [x] `npm --prefix "./Nexus Code" run build`
- [x] `npm run verify:single-react`
- [x] `npm --prefix "./Nexus Code" run electron:ensure`
- [x] `npm --prefix "./Nexus Code" run smoke:ui`
- [x] `npm --prefix "./Nexus Code" run smoke:ide-core`
- [x] SSR-Smoke-Struktur: 1440x900, 1024x768, 900x512, 390x900 fuer Workbench, Launchpad, Account und Settings
- [ ] Visual Smoke: 1440x900
- [ ] Visual Smoke: 1024x768
- [ ] Visual Smoke: 900x512
- [ ] Visual Smoke: 390x900
