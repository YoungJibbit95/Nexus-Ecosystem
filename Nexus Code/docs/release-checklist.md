# Nexus Code Release Checklist

Stand: 2026-06-28

## Renderer und UI-System

- [x] Strikten Account-Gate als eigene Startflaeche vor der Workbench einziehen.
- [x] Lokale Bootstrap-Fallbacks aus dem Workbench-Pass entfernen.
- [x] Gemeinsame Nexus-Code-Primitives fuer Buttons, Inputs, Cards, Badges und Panel-Header fertig integrieren.
- [x] Primaertexte duerfen in Launchpad-Actions und neuen Panel-Primitives nicht hart abgeschnitten werden.
- [ ] Glow, Blur, Roundness und Motion mit Low-Power-Fallback visuell pruefen.

## Workbench und Docking

- [x] Layout-Persistenz auf `nexus-code.workbench-layout.v2` migrieren.
- [x] Snap-Zones links, rechts, unten und hidden im Modell validieren.
- [x] Explorer, Search, Git, Issues, PRs, Projects, Extensions, Account, Debug, Problems und Terminal als Dock-Ziele modellieren.
- [ ] Reset-Layout, Drag-Drop und defekte Persistenzdaten visuell testen.
- [ ] Launchpad ohne Scrollzwang bei 900x512 pruefen.

## IDE-Core und File System

- [x] File Tree folder-first und danach Dateien nach Extension/Name sortieren.
- [x] Grosse Trees mit flacher/virtueller Renderliste stabil halten.
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

## Pflichtchecks

- [x] `npm --prefix "./Nexus Code" run lint`
- [x] `npm --prefix "./Nexus Code" run build`
- [x] `npm run verify:single-react`
- [x] `npm --prefix "./Nexus Code" run electron:ensure`
- [ ] Visual Smoke: 1440x900
- [ ] Visual Smoke: 1024x768
- [ ] Visual Smoke: 900x512
- [ ] Visual Smoke: 390x900
