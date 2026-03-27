# Nexus Code

Desktop-Dev-Workspace im Nexus Ecosystem. Die App kombiniert Editor, Dateiexplorer, Terminal, Suche, Git-Panel und API-gestuetzte View-/Release-Pruefung in einer Electron-Shell.

## Kernfunktionen

- Electron + React Desktop-App mit Vite-Renderer
- Editor-Workspace unter `src/pages/Editor.jsx`
- Panels fuer `FileExplorer`, `Search`, `Git`, `Terminal`, `Debug` und `Problems`
- Runtime-Anbindung ueber `@nexus/api` mit Capability-Report, View-Validation und Release-Updates
- Packaging fuer macOS, Windows und Linux ueber `electron-builder`

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

## Build

Im Teilprojekt:

```bash
npm run build
npm run electron:build
```

Weitere verifizierte Build-Scripts:

- `npm run electron:build:mac`
- `npm run electron:build:win`
- `npm run electron:build:host`
- `npm run electron:build:installers`

Vom Ecosystem-Root:

```bash
npm run build:code
npm run build:code:installers
```

## Relevante Pfade

- `src/App.jsx`: Runtime-Bridge, Release-Kompatibilitaet und View-Gating
- `src/pages/Editor.jsx`: Hauptseite des Editors
- `src/components/editor/`: Editor- und Workspace-Panels
- `electron/main.cjs`: Electron-Main-Process
- `electron/preload.cjs`: Preload-/Bridge-Layer

## Environment

- `VITE_NEXUS_CONTROL_URL` (`https://nexus-api.cloud`)
- `VITE_NEXUS_CONTROL_INGEST_KEY` (pro App der passende VPS-Ingest-Key)
- `VITE_NEXUS_USER_ID`
- `VITE_NEXUS_USERNAME`
- `VITE_NEXUS_USER_TIER`
