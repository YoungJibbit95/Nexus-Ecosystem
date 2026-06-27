# Nexus Code IDE Recode Plan

Stand: 2026-06-27

## Ziel

Nexus Code wird eine vollstaendige IDE im bestehenden Nexus-Code-Produkt. Die App bleibt mit Nexus Main und dem restlichen Ecosystem verbunden und bekommt eine proprietaer-sichere Architektur. Zed bleibt Inspiration fuer Ruhe, Geschwindigkeit und Arbeitsgefuehl, aber es wird kein Zed-GPL-Code und kein Zed-Asset uebernommen.

## Produktentscheidung

- Nexus Code bleibt der Produktort fuer den Recode.
- Kein separater `Nexus Code Native` Produktordner.
- Native Arbeit laeuft spaeter als austauschbare Engine oder Sidecar innerhalb der Nexus-Code-Architektur.
- Phase 1 liefert nicht nur eine Beta, sondern die produktive IDE-Basis.

## Phase 1: IDE Foundation

- `EditorEngine` Contract fuer Monaco heute und native Engine spaeter.
- Zentrale Language Registry fuer TypeScript, JavaScript, Python, Rust, Go und C/C++.
- Workspace-Dokumente mit stabilen URIs statt nur Dateinamen.
- Theme-System mit semantischen Tokens fuer Editor, Panels, Git, Terminal und Status.
- Ecosystem Capability Manifest in `@nexus/core`, damit Nexus Main/Website/Launcher dieselben IDE-Faehigkeiten anzeigen koennen.

## Phase 2: LSP & Completion

- Electron-Main verwaltet Language-Server-Prozesse.
- Tier 1:
  - TypeScript/JavaScript via `typescript-language-server`
  - Python via `pyright-langserver`
  - Rust via `rust-analyzer`
  - Go via `gopls`
  - C/C++ via `clangd`
- Features:
  - Completion
  - Hover
  - Diagnostics
  - Go to Definition
  - Rename
  - Formatting
  - Code Actions

## Phase 3: Terminal & Tasks

- Multi-Terminal mit Workspace-CWD.
- Task Runner fuer build/test/dev-Kommandos.
- Output-Panels mit Problem Matchern.
- Bestehender Command Runner bleibt als sichere Non-PTY-Task-Schicht erhalten.

## Phase 4: Git & GitHub

- Lokale Git-CLI ist Source of Truth.
- GitHub ist Remote-Service fuer Login, Issues, PRs, Checks und Reviews.
- Tokens liegen im Electron-Main/OS-Speicher, nicht im Renderer und nicht in `localStorage`.
- GitHub OAuth Device Flow plus PAT-Fallback.

## Phase 5: Nexus Visuell x Zed

- Ruhige IDE-Dichte statt Neon-Ueberladung.
- Nexus-Glow nur als Akzent, nicht als Standardflaeche.
- Klare Splitter, Docking, Command Palette, kompakte Statusleisten.
- Resizable Side Panels und Bottom Dock.

## Phase 6: Native Engine Path

- Kein GPL-Code.
- Clean-Room Sidecar/Engine ueber eigenes Protokoll.
- Entscheidung erst nach Messwerten:
  - Startup
  - Text-Rendering
  - Memory
  - LSP-Latenz
  - Packaging
  - License/SBOM

## Erste Arbeitspakete

- EditorEngine/LSP-Contract und Language Registry.
- Electron Git/GitHub Backend.
- Renderer-GitPanel und Terminal-Modelle.
- Nexus-x-Zed Theme-Resolver.
- Core Capability Manifest fuer Ecosystem-Integration.

## Definition of Done Fuer Den Ersten IDE-Block

- `Nexus Code` baut.
- `@nexus/core` baut/typecheckt.
- Single-React-Check bleibt gruen.
- GitHub-Token verlaesst den Main-Prozess nicht.
- TypeScript/JavaScript hat mindestens stabile Monaco-Completion.
- LSP-Server-Erkennung zeigt installierte und fehlende Tools klar an.
- Nexus Main kann das IDE-Capability-Manifest aus `@nexus/core` lesen.
