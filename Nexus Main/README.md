# Nexus Main

[![Platform](https://img.shields.io/badge/platform-desktop-2563eb)](./README.md)
[![Framework](https://img.shields.io/badge/stack-electron%20%2B%20react-111827)](./README.md)
[![Runtime](https://img.shields.io/badge/runtime-@nexus%2Fcore-14b8a6)](../packages/nexus-core/README.md)

Nexus Main ist die Desktop-Workspace-App im Nexus Ecosystem.
Sie kombiniert produktive Kern-Views mit der zentralen Render-/Motion-Laufzeit aus `@nexus/core`.

## Nutzung

Öffne Dashboard zum Fortsetzen deiner Arbeit, Notes zum Schreiben, Tasks/Reminders zum Planen und Files für den lokalen Datenbestand. Der [User Guide](../docs/USER_GUIDE.md) beschreibt die Bedienung; die Build-Kommandos weiter unten richten sich an Entwickler.

**Code ist ein Archiv:** Vorhandene Code-Dateien lassen sich nach Namen suchen, lesen und als einzelne Datei oder mit Ordnerdaten als JSON exportieren. Die Daten bleiben in der lokalen Speicherung und in unterstützten Workspace-Snapshots/Backups erhalten. Im Archiv gibt es kein Bearbeiten oder Ausführen. Exportierte Einzeldateien kannst du in einem selbst gewählten Ordner in der separaten App Nexus Code öffnen; Archiv-JSON ist kein automatischer Projektimport.

Nexus Code verwendet CodeMirror und einen einfachen Befehlsrunner mit stdio, keine interaktive PTY-Shell. Sprachserver und GitHub benötigen externe Voraussetzungen. Debugging und Marketplace sind Vorschauen; ein Fehler bei zitierten absoluten Windows-Befehlspfaden mit Leerzeichen ist weiterhin offen. Die separate App benötigt einen validierten kompatiblen Account.

## View Overview

| View | Purpose | Highlights |
| --- | --- | --- |
| `dashboard` | start and control center | Today layer, resume lane, quick capture, workspace status |
| `calendar` | shared planning layer (partial) | task/reminder-backed day, week, month, agenda and ICS flows |
| `notes` | markdown knowledge workflow (partial) | edit/preview/split, templates, linking/context helpers |
| `tasks` | execution planning | kanban flow, priorities, due states, focus actions |
| `reminders` | time-based workflow | grouped due states, snooze/complete, health controls |
| `canvas` | visual board workflow (development) | node graph, templates, quick add, inspector, keyboard actions |
| `files` | workspace + handoff (partial) | explicit library/workspace assignment, root selection, import/export and preview |
| `flux` | local operations view (partial) | queue, bottleneck and activity signals derived from local workspace data |
| `code` | compatibility archive | read/search/export existing code files; no embedded editing or execution |
| `devtools` | internal diagnostics (development) | development-only, Pro plus Admin/Developer-gated utilities |
| `settings` | system controls (partial) | appearance, typography, motion/render controls, presets |
| `info` | product and architecture docs | in-app source of truth for usage and internals |

## Developer reference: UI Engine

Nexus Main uses shared runtime modules from:

- `../packages/nexus-core/src/render/*`
- `../packages/nexus-core/src/motion/motionEngine.ts`

Pipeline phases:

- `Measure`
- `Resolve`
- `Allocate`
- `Commit`
- `Cleanup`

Core goals:

- deterministic surface capability resolution
- controlled degradation under low-power/lag/reduced-motion
- ownership guardrails for `transform`, `filter`, `opacity`
- event-driven diagnostics for render/motion health

## Development

```bash
npm install
npm run dev
npm run electron:dev
```

## Build / Packaging

```bash
npm run build
npm run electron:build
npm run electron:build:mac
npm run electron:build:win
npm run electron:build:installers
```

## Script Reference

- `npm run start`
- `npm run dev`
- `npm run build`
- `npm run electron:dev`
- `npm run electron:build`
- `npm run electron:build:mac`
- `npm run electron:build:win`
- `npm run electron:build:host`
- `npm run electron:build:installers`

## Important Paths

- `src/App.tsx`
- `src/render/renderRuntime.ts`
- `src/render/useRenderSurfaceBudget.ts`
- `src/render/useSurfaceMotionRuntime.ts`
- `src/views/DashboardView.tsx`
- `src/views/CanvasView.tsx`
- `src/views/InfoView.tsx`
- `src/views/RenderDiagnosticsView.tsx` (dev only)
- `src/store/*`
- `electron-main.cjs`

## Environment

Client-side environment values are public configuration, not secrets.

Most Nexus Main development should work without production cloud credentials. Use local `.env.local` values only for non-secret public development hints; keep Nexus Cloud credentials, backend routes, signing material and deployment details outside this repository.

See `../docs/ENVIRONMENT.md`.

## Notes

- This repo does not contain the private Nexus Cloud backend implementation.
- Protected API access is server-side; planned Cloud/Pro product availability is not implied by client UI gates.
- Render Diagnostics is a dev surface and not part of normal production navigation.
