# Nexus Main

[![Platform](https://img.shields.io/badge/platform-desktop-2563eb)](./README.md)
[![Framework](https://img.shields.io/badge/stack-electron%20%2B%20react-111827)](./README.md)
[![Runtime](https://img.shields.io/badge/runtime-@nexus%2Fcore-14b8a6)](../packages/nexus-core/README.md)

Nexus Main ist die Desktop-Workspace-App im Nexus Ecosystem.
Sie kombiniert produktive Kern-Views mit der zentralen Render-/Motion-Laufzeit aus `@nexus/core`.

## View Overview

| View | Purpose | Highlights |
| --- | --- | --- |
| `dashboard` | start and control center | Today layer, resume lane, quick capture, workspace status |
| `notes` | markdown knowledge workflow | edit/preview/split, templates, linking/context helpers |
| `tasks` | execution planning | kanban flow, priorities, due states, focus actions |
| `reminders` | time-based workflow | grouped due states, snooze/complete, health controls |
| `canvas` | visual board workflow | node graph, templates, quick add, inspector, keyboard actions |
| `files` | workspace + handoff | workspace folder control, handoff import/export, history |
| `code` | embedded code work | integrated code execution and file workflows in Main shell |
| `devtools` | diagnostics/tools | render/motion debugging and utility surfaces |
| `settings` | system controls | appearance, typography, motion/render controls, presets |
| `info` | product and architecture docs | in-app source of truth for usage and internals |

## UI Engine

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

- `VITE_NEXUS_CONTROL_URL=https://nexus-api.cloud`
- `VITE_NEXUS_CONTROL_INGEST_KEY` (key for `main`)
- `VITE_NEXUS_USER_ID`
- `VITE_NEXUS_USERNAME`
- `VITE_NEXUS_USER_TIER`

## Notes

- This repo does not contain the private backend implementation.
- Runtime/API policies are cloud-first on `nexus-api.cloud`.
- Render Diagnostics is a dev surface and not part of normal production navigation.
