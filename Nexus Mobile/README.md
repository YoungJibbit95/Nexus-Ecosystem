# Nexus Mobile

[![Platform](https://img.shields.io/badge/platform-android%20%2F%20ios-16a34a)](./README.md)
[![Framework](https://img.shields.io/badge/stack-capacitor%20%2B%20react-111827)](./README.md)
[![Runtime](https://img.shields.io/badge/runtime-@nexus%2Fcore-14b8a6)](../packages/nexus-core/README.md)

Nexus Mobile ist die mobile Workspace-App im Nexus Ecosystem.
Sie bildet die Main-Workflows mobil ab, mit eigener Navigation und mobile-spezifischer Runtime-Steuerung.

## View Overview

| View | Purpose | Highlights |
| --- | --- | --- |
| `dashboard` | mobile control center | Today context, quick capture, workspace confidence |
| `notes` | markdown workflow | editor/preview, templates, linking helpers |
| `tasks` | planning execution | kanban + focus workflows on touch surfaces |
| `reminders` | schedule control | native reminder service integration + fallback states |
| `canvas` | visual planning | mobile board interactions, templates, inspector flows |
| `files` | workspace handoff | runtime snapshot import/export + workspace controls |
| `code` | mobile code workflow | integrated lightweight coding surface |
| `devtools` | internal tooling | diagnostics and development helpers |
| `settings` | personalization/system | appearance and runtime controls |
| `info` | in-app docs | architecture, diagnostics, guides |

## Navigation and Shell

- `bottom-nav` is standard on phones
- `tabs` has dedicated mobile rendering
- `sidebar` is used for larger layouts (tablet/large screen)

Main shell modules:

- `src/app/MobileShellLayout.tsx`
- `src/app/mobileViewHost.tsx`
- `src/app/mobileAppConfig.ts`

## Render + Motion

Nexus Mobile uses the same core runtime principles as Main:

- shared render pipeline and effect budget model
- shared motion capability/degradation contracts
- low-power, reduced-motion, lag-aware fallbacks
- shared diagnostics foundation for parity checks

## Development

```bash
npm install
npm run dev:web
npm run cap:android
npm run cap:ios
```

## Build

```bash
npm run build
npm run cap:build:android
npm run cap:build:ios
```

## Script Reference

- `npm run dev`
- `npm run dev:web`
- `npm run dev:android`
- `npm run dev:ios`
- `npm run build`
- `npm run preview`
- `npm run cap:sync`
- `npm run cap:android`
- `npm run cap:ios`
- `npm run cap:build:android`
- `npm run cap:build:ios`

## Important Paths

- `src/App.tsx`
- `src/render/renderRuntime.ts`
- `src/render/useRenderSurfaceBudget.ts`
- `src/render/useSurfaceMotionRuntime.ts`
- `src/lib/mobileReminderService.ts`
- `src/views/DashboardView.tsx`
- `src/views/CanvasView.tsx`
- `src/views/InfoView.tsx`
- `src/views/RenderDiagnosticsView.tsx` (dev only)
- `android/`
- `ios/`

## Environment

- `VITE_NEXUS_CONTROL_URL=https://nexus-api.cloud`
- `VITE_NEXUS_CONTROL_INGEST_KEY` (key for `mobile`)
- `VITE_NEXUS_USER_ID`
- `VITE_NEXUS_USERNAME`
- `VITE_NEXUS_USER_TIER`

## Notes

- `npm run dev` defaults to Android Capacitor flow.
- Use `npm run dev:web` for browser-only iteration.
- Native reminder scheduling is preferred; fallback remains available.
