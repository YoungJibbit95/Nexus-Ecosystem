# Nexus Code

Nexus Code ist die Desktop-IDE-App im Nexus Ecosystem (Electron + React + Vite).
Sie fokussiert den Editor- und Run-Workflow und nutzt dieselben Core-Standards fuer Runtime/API/Render/Motion.

## Kernfunktionen

- Monaco-basierter Editor
- Dateiexplorer, Search, Git-, Terminal-, Debug- und Problems-Panels
- Run-/Preview-Flow inklusive Output-Historie
- Workspace-Kontext mit Filesystem-Integration
- Runtime-Anbindung auf `https://nexus-api.cloud`

## Architektur-Hinweise

- Renderer: `src/App.jsx`, `src/pages/Editor.jsx`
- Panels: `src/components/editor/*`
- Electron Main: `electron/main.cjs`
- Preload/Bridge: `electron/preload.cjs`
- Shared API/Core-Utilities: `@nexus/api`, `@nexus/core`

## Entwicklung

Im Teilprojekt:

```bash
npm install
npm run dev
npm run electron:dev
```

Vom Ecosystem-Root:

```bash
npm run dev:code
```

## Build / Packaging

Im Teilprojekt:

```bash
npm run build
npm run electron:build
npm run electron:build:mac
npm run electron:build:win
npm run electron:build:installers
```

Vom Ecosystem-Root:

```bash
npm run build:code
npm run build:code:installers
```

## Relevante Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run lint:fix`
- `npm run typecheck`
- `npm run preview`
- `npm run electron:dev`
- `npm run electron:build`
- `npm run electron:build:mac`
- `npm run electron:build:win`
- `npm run electron:build:host`
- `npm run electron:build:installers`

## Environment

- `VITE_NEXUS_CONTROL_URL=https://nexus-api.cloud`
- `VITE_NEXUS_CONTROL_INGEST_KEY` (App-Key fuer `code`)
- `VITE_NEXUS_USER_ID`
- `VITE_NEXUS_USERNAME`
- `VITE_NEXUS_USER_TIER`

## Hinweise

- Keine lokale private API in diesem Repo; API liegt ausserhalb.
- Production-Performance sollte gegen packaged Build validiert werden, nicht nur im Dev-Server.
