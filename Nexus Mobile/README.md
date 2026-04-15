# Nexus Mobile

Nexus Mobile ist die mobile Workspace-App im Nexus Ecosystem (React + Vite + Capacitor).
Sie spiegelt die zentralen Main-Workflows mobil wider, mit eigener Navigation und mobilen Runtime-Details.

## Kern-Views

- `dashboard`: Today- und Workspace-Kontext mit Quick-Actions
- `notes`: Markdown-Flow inkl. Magic-Elemente
- `tasks`: Kanban- und Fokus-Workflows
- `reminders`: Reminder-Ansicht mit nativer Service-Anbindung
- `canvas`: mobile Canvas-Interaktion mit Templates/Magic
- `files`: Workspace- und Handoff-Flows
- `code`: mobiler Code-Flow
- `devtools`: mobile Utility-Ansicht
- `settings`: Presets + Material/Motion/Theme
- `info`: mobile In-App-Dokumentation und Runtime-Erklaerung

## Navigation und Shell

- `bottom-nav` ist Standard fuer Phones
- `tabs` hat eigene mobile Renderlogik
- `sidebar` ist fuer groessere Layouts (Tablet/Large Screen)

Shell-Module:

- `src/app/MobileShellLayout.tsx`
- `src/app/mobileViewHost.tsx`
- `src/app/mobileAppConfig.ts`

## Render + Motion

Wie Main nutzt Mobile die zentrale Engine aus `@nexus/core`:

- Render-Pipeline mit Measure/Resolve/Allocate/Commit/Cleanup
- Surface-/Effect-Capabilities pro sichtbarer Flaeche
- kontrollierte Degradation fuer Low-Power/Reduced-Motion
- gemeinsame Diagnostics-Basis fuer Main und Mobile

## Entwicklung

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

## Relevante Scripts

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

## Wichtige Pfade

- `src/App.tsx`
- `src/render/renderRuntime.ts`
- `src/render/useRenderSurfaceBudget.ts`
- `src/render/useSurfaceMotionRuntime.ts`
- `src/lib/mobileReminderService.ts`
- `src/views/InfoView.tsx`
- `src/views/RenderDiagnosticsView.tsx` (nur Dev)
- `android/`
- `ios/`

## Environment

- `VITE_NEXUS_CONTROL_URL=https://nexus-api.cloud`
- `VITE_NEXUS_CONTROL_INGEST_KEY` (App-Key fuer `mobile`)
- `VITE_NEXUS_USER_ID`
- `VITE_NEXUS_USERNAME`
- `VITE_NEXUS_USER_TIER`

## Hinweise

- `npm run dev` startet den Android-Capacitor-Flow.
- Fuer reinen Browser-Loop `npm run dev:web` verwenden.
- Reminder-Services haben native + Fallback-Pfade, der bevorzugte Pfad ist nativer Scheduler.
