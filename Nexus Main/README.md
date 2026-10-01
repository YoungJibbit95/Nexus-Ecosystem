# Nexus Main

[![Platform](https://img.shields.io/badge/platform-desktop-2563eb)](./README.md)
[![Framework](https://img.shields.io/badge/stack-electron%20%2B%20react-111827)](./README.md)
[![Runtime](https://img.shields.io/badge/runtime-@nexus%2Fcore-14b8a6)](../packages/nexus-core/README.md)

Nexus Main ist die Desktop-Workspace-App im Nexus Ecosystem.
Sie kombiniert produktive Kern-Views mit der zentralen Render-/Motion-Laufzeit aus `@nexus/core`.

## Nutzung

Öffne Dashboard zum Fortsetzen deiner Arbeit, Notes zum Schreiben, Tasks/Reminders zum Planen und Files für den lokalen Datenbestand. Der [User Guide](../docs/USER_GUIDE.md) beschreibt die Bedienung; die Build-Kommandos weiter unten richten sich an Entwickler.

**Code ist ein Archiv:** Vorhandene Code-Dateien lassen sich nach Namen suchen, lesen und als einzelne Datei oder mit Ordnerdaten als JSON exportieren. Die Daten bleiben in der lokalen Speicherung und in unterstützten Workspace-Snapshots/Backups erhalten. Im Archiv gibt es kein Bearbeiten oder Ausführen. Exportierte Einzeldateien kannst du in einem selbst gewählten Ordner in der separaten App Nexus Code öffnen; Archiv-JSON ist kein automatischer Projektimport.

Nexus Code uses CodeMirror and a simple stdio command runner. The quoted absolute Windows-path regression is corrected and covered by actual IPC probes; this does not establish every command or installed-platform behavior. Language servers and GitHub need external prerequisites. PTY, connected debugging and executable marketplace support are not qualified. The separate app requires a validated compatible account.

## View Overview

### Manual agenda and workspace transfer

Open **Calendar → Agenda** to capture a task, a fixed event or an explicit work block. A task deadline and a work block are separate: planning Wednesday does not move a Friday deadline. Enter the duration yourself when it is unknown. Missing calendar coverage is shown as unknown; overlaps and uncertainty require an explicit decision before saving. Dashboard and Flux use the same distinct task, commitment and reminder counts.

Shell, Dashboard and command-palette capture open the same unsaved forms. Opening or cancelling a form does not save an entity; confirmation returns its canonical identity only after storage acknowledgement. Note and Canvas context links focus existing entities and offer explicit repair when a source is missing.

ICS import previews fixed intervals and keeps the original file and warnings. Recurrence, exceptions, alarms and embedded timezone rules are retained as raw provenance rather than executed. A recurring base interval requires a separate explicit choice. Complete workspace exports/backups use Runtime V2 for planning and portable reminder occurrence state. A separate legacy V1 downgrade reports the omitted planning/history before use; loose-file import is not a complete snapshot.

Cerebri production assistance remains disabled. The local preview qualification does not activate a production collector or automatic scheduling. See the [User Guide](../docs/USER_GUIDE.md#manual-agenda-and-capture), [Developer Guide](../docs/DEVELOPER_GUIDE.md#planning-and-workspace-contracts) and [shared planning contract](../packages/nexus-core/src/planning/README.md).

| View | Purpose | Highlights |
| --- | --- | --- |
| `dashboard` | start and control center | Today layer, resume lane, quick capture, workspace status |
| `calendar` | manual planning and temporal context | separate deadlines, fixed events, work blocks, explicit availability and loss-aware ICS preview |
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
