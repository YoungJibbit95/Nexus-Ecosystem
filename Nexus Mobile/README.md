# Nexus Mobile

[![Platform](https://img.shields.io/badge/platform-android%20%2F%20ios-16a34a)](./README.md)
[![Framework](https://img.shields.io/badge/stack-capacitor%20%2B%20react-111827)](./README.md)
[![Runtime](https://img.shields.io/badge/runtime-@nexus%2Fcore-14b8a6)](../packages/nexus-core/README.md)

Nexus Mobile ist die mobile Workspace-App im Nexus Ecosystem.
Sie bildet die Main-Workflows mobil ab, mit eigener Navigation und mobile-spezifischer Runtime-Steuerung.

## Nutzung

Nutze die für dein Gerät sichtbare Navigation für Dashboard, Notes, Tasks/Reminders, Canvas und Files. Native Funktionen und Navigation unterscheiden sich von Desktop; vollständige Parität ist nicht zugesagt. Der [User Guide](../docs/USER_GUIDE.md) beschreibt die Bedienung, der [Developer Guide](../docs/DEVELOPER_GUIDE.md) die Entwicklung.

**Code ist ein Archiv:** Suche vorhandene Code-Dateien nach Namen, lies den Quelltext und lade einzelne Dateien oder Code- und Ordnerdaten als JSON herunter. Der Export löscht die bestehenden Daten nicht; Code-Daten bleiben auch in unterstützten Workspace-Snapshots erhalten. Das Archiv bearbeitet oder startet keine Programme. Archiv-JSON ist kein automatischer Projektimport in Nexus Code.

Zum Bearbeiten gehört die separate Desktop-App Nexus Code: CodeMirror, Dateiarbeit und ein einfacher Befehlsrunner mit stdio. Eine PTY-Shell, echtes Debugging oder ein ausführbarer Marketplace sind nicht zugesagt. Sprachserver und GitHub benötigen externe Voraussetzungen; der bekannte Windows-Pfadfehler mit Leerzeichen bleibt offen. Die Desktop-App benötigt einen validierten kompatiblen Account.

## View Overview

| View | Purpose | Highlights |
| --- | --- | --- |
| `dashboard` | mobile workspace center | Today context, quick capture, workspace confidence |
| `notes` | markdown workflow | editor/preview, templates, linking helpers |
| `tasks` | planning execution | kanban + focus workflows on touch surfaces |
| `reminders` | schedule control | native reminder service integration + fallback states |
| `canvas` | visual planning | mobile board interactions, templates, inspector flows |
| `files` | workspace handoff | runtime snapshot import/export + workspace controls |
| `code` | compatibility archive | read/search/export existing code files; no embedded editing or execution |
| `devtools` | local diagnostics | performance and development helpers |
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

## Developer reference: Render + Motion

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

Client-side environment values are public configuration, not secrets.

Most Nexus Mobile development should work without production cloud credentials. Use local `.env.local` values only for non-secret public development hints; keep Nexus Cloud credentials, backend routes, signing material and deployment details outside this repository.

See `../docs/ENVIRONMENT.md`.

## Notes

- `npm run dev` defaults to Android Capacitor flow.
- Use `npm run dev:web` for browser-only iteration.
- Native reminder scheduling is preferred; fallback remains available.
- Without Nexus Cloud configuration, local-first workflows stay available and cloud-backed account features may be unavailable.
