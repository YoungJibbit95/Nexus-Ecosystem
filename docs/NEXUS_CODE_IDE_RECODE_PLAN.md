# Nexus Code IDE Recode Plan

Stand: 2026-07-01

## Ziel

```nexus-list
- Nexus Code wird eine stabile, moderne und vollstaendige IDE im Nexus-Ecosystem.
- Der naechste grosse Block fokussiert zuerst den Editor-Core.
- Die App nutzt einen strikten Nexus-Login vor der Workbench.
- Das UI wird als eigenstaendiges Glassy-Nexus-Design neu geschaerft.
- CodeMirror bleibt vorerst die Editor-Engine.
- Kein Zed-Code, keine Zed-Assets, kein Lizenzrisiko.
```

## Naechster Meilenstein

```nexus-checklist
Editor-Core-first als Hauptfokus setzen | true
Strict Nexus Login ohne lokalen Workbench-Bypass umsetzen | true
Schwarzbild durch robusten Account-/Fehler-Screen verhindern | true
Glassy-Nexus-Designsystem global weiterziehen | true
Snap-stabiles Docking produktionsreifer machen | true
Nach gruenen Gates direkt auf main committen und pushen | true
```

## Editor-Core

```nexus-checklist
TypeScript/JavaScript Completion produktionsreif machen | true
TypeScript/JavaScript Hover stabilisieren | false
TypeScript/JavaScript Diagnostics sauber mit Problems synchronisieren | true
TypeScript/JavaScript Go to Definition anbinden | true
TypeScript/JavaScript Rename vorbereiten oder umsetzen | true
TypeScript/JavaScript Formatting anbinden | true
TypeScript/JavaScript Code Actions anbinden | true
Python mit Pyright-Erkennung und gefuehrtem Setup stabilisieren | false
Python Completion, Hover und Diagnostics verbessern | false
Rust, Go und C/C++ Server-Erkennung ausbauen | true
Rust, Go und C/C++ klare Fallbacks bei fehlenden Servern zeigen | true
Completion-Dedupe und Ranking verbessern | true
Editor-Status fuer LSP, Sprache, Datei und Fehler verstaendlicher machen | true
```

## LSP Setup

```nexus-list
- Keine heimliche Auto-Installation.
- Fehlende Language Server werden erkannt.
- Nexus Code zeigt klare Install-Hinweise.
- PATH und Env-Overrides werden geprueft.
- Retry und Statusdiagnose laufen direkt aus Settings und Editor-Status.
```

```nexus-checklist
LSP-Statusmodell pro Sprache erweitern | true
PATH-Erkennung sichtbar machen | false
Env-Override-Hinweise sichtbar machen | true
Fehlende Server verstaendlich anzeigen | true
Defekte Serverstarts sauber abfangen | true
Setup-Hinweise in Settings integrieren | true
```

## Strict Login

```nexus-list
- Ohne gueltige Nexus-Session wird keine Workbench gerendert.
- Auch Dev-Starts bleiben strict.
- Tests duerfen Sessions mocken, aber die echte App nicht.
- Fehler landen auf Login, Account Recovery oder API/Auth-Statusscreen.
- Kein Schwarzbild.
```

```nexus-checklist
Startpfad fail-closed pruefen | true
Login-/Recovery-Screen stabilisieren | true
API-Fehler verstaendlich rendern | true
Renderer Error Boundary auf Auth-Startpfad absichern | true
Ungueltige Session ohne Workbench-Flash behandeln | true
```

## Glassy Nexus UI

```nexus-list
- Eigenstaendiges neues Nexus-Code-Design.
- Dunkel, ruhig, weniger cluttered.
- Glow und Blur als Fokus- und Tiefenmittel.
- Weniger harte Borders.
- Mehr Roundness.
- Keine abgeschnittenen Primaertexte.
- Beide Spotlights nutzen die glasige Variante.
```

```nexus-checklist
UI-Primitives fuer Buttons, Inputs, Cards, Badges und Toolbars vereinheitlichen | true
Settings technisch und visuell weiter ausbauen | true
Command Palette und Spotlight zusammenfuehren | true
Sidebar-Panels visuell entcluttern | true
Problems, Search, Terminal und Git-Panels weiter recoden | true
Titlebar und Statusbar ruhiger machen | true
Text-Fit-Regeln global haerten | true
Glow/Blur mit Performance-Fallback absichern | true
```

## Docking und Layout

```nexus-list
- Snap-Zones bleiben der Fokus.
- Kein freies verschachteltes Docking in diesem Block.
- Panels koennen links, rechts, unten oder hidden liegen.
- Layout muss bei kleinen Fenstern stabil bleiben.
```

```nexus-checklist
Snap-Zones weiter stabilisieren | true
Resize-Verhalten verbessern | true
Layout Reset sauberer machen | true
Persistenz gegen kaputte Daten absichern | true
Bottom Dock kompakter und besser nutzbar machen | true
Sidebar-Breite und Compact-Modus verbessern | true
Keyboard-Kommandos fuer Panel-Fokus ergaenzen | true
```

## Subagent-Aufteilung

```nexus-list
- Editor/LSP Agent: Editor-Core, LSP, Completion, Diagnostics, Code Actions.
- UI/Design Agent: Glassy-Nexus-System, Settings, Spotlight, Panels, Text-Fit.
- Docking/Layout Agent: Workbench-Layout, Snap-Zones, Bottom Dock, Compact-Modus.
- QA/Release Agent: Checklist, Smokes, Visual QA, Doku.
- Main Agent: Integration, Konfliktloesung, finale Gates, Commit und Push.
```

## Pflichtchecks

```nexus-checklist
npm --prefix "./Nexus Code" run lint | true
npm --prefix "./Nexus Code" run smoke:ide-core | true
npm --prefix "./Nexus Code" run smoke:ui | true
npm --prefix "./Nexus Code" run build | true
npm run verify:single-react | true
npm --prefix "./Nexus Code" run electron:ensure | true
Electron Dev Probe mit Strict-Login-Vertrag pruefen | true
Visual Smoke bei 1440x900 pruefen | false
Visual Smoke bei 1024x768 pruefen | false
Visual Smoke bei 900x512 pruefen | false
Visual Smoke bei 390x900 pruefen | false
```

## Annahmen

```nexus-list
- Fokus bleibt auf Nexus Code.
- Andere Ecosystem-Teile werden nur bei echten API/Auth-Vertragsaenderungen beruehrt.
- Strikter Login ist wichtiger als Offline-IDE-Nutzung.
- Language Server werden gefuehrt eingerichtet, aber nicht ungefragt installiert.
- Nach erfolgreichen Gates wird direkt auf main gepusht.
```
