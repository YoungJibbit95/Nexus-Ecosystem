# Nexus Main

Nexus Main ist die Desktop-Workspace-App im Nexus Ecosystem (Electron + React + Vite).
Die App kombiniert produktive Kern-Views mit einer zentralen Render-/Motion-Laufzeit aus `@nexus/core`.

## Kern-Views

- `dashboard`: Today-Layer, Resume/Continue, Workspace-Kontext
- `notes`: Markdown-Editor, Preview/Reading-Flows, Magic-Elemente
- `tasks`: Kanban, Prioritaet/Deadline, Fokus-Flow
- `reminders`: Reminder-Management, Control-Center, Re-Schedule-Flow
- `canvas`: visuelle Planung, Templates/Magic, Inspector-Flow
- `files`: Workspace-Ordner, Runtime-Handoff, Sync-Status
- `code`: eingebetteter Code-Flow innerhalb Main
- `devtools`: Builder-/Utility-Tools
- `settings`: Presets + Material/Motion/Theme
- `info`: In-App-Dokumentation mit Architektur- und Diagnostics-Abschnitten

## UI Engine (Render + Motion)

Nexus Main nutzt die zentrale Runtime aus `packages/nexus-core/src/render` und `packages/nexus-core/src/motion`.

Render-Pipeline:

- `Measure`
- `Resolve`
- `Allocate`
- `Commit`
- `Cleanup`

Wichtige Ziele:

- deterministische Surface-Capabilities statt lokaler Zufalls-Entscheidungen
- kontrollierte Degradation unter Last (`full` bis `static-safe`)
- Ownership-Guardrails fuer `transform`, `filter`, `opacity`
- event-basierte Diagnostics statt unkontrolliertem Polling

## Entwicklung

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

## Relevante Scripts

- `npm run start`
- `npm run dev`
- `npm run build`
- `npm run electron:dev`
- `npm run electron:build`
- `npm run electron:build:mac`
- `npm run electron:build:win`
- `npm run electron:build:host`
- `npm run electron:build:installers`

## Wichtige Pfade

- `src/App.tsx`
- `src/render/renderRuntime.ts`
- `src/render/useRenderSurfaceBudget.ts`
- `src/render/useSurfaceMotionRuntime.ts`
- `src/components/Glass.tsx`
- `src/views/InfoView.tsx`
- `src/views/RenderDiagnosticsView.tsx` (nur Dev)
- `src/store/*`
- `electron-main.cjs`

## Environment

- `VITE_NEXUS_CONTROL_URL=https://nexus-api.cloud`
- `VITE_NEXUS_CONTROL_INGEST_KEY` (App-Key fuer `main`)
- `VITE_NEXUS_USER_ID`
- `VITE_NEXUS_USERNAME`
- `VITE_NEXUS_USER_TIER`

## Hinweise

- Keine lokale private API-Implementierung im Client.
- Runtime- und API-Policies sind cloud-first auf `nexus-api.cloud` ausgerichtet.
- Render Diagnostics sind fuer Entwicklung gedacht und im Produktionsbetrieb nicht Teil des regulären Flows.
