# Nexus Code Mobile

Nexus Code Mobile ist die mobile IDE-App im Nexus Ecosystem (React + Vite + Capacitor).
Sie bringt den Editor-/Run-Flow auf Android/iOS mit mobilen Shell- und Panel-Anpassungen.

## Kernfunktionen

- Monaco-basierter Editor (`src/components/editor/CodeEditor.jsx`)
- Dateibaum, Tabs, Search/Spotlight, Run-Flow
- Panels fuer Search, Git, Debug, Problems und Terminal
- Native Filesystem-Bridge (`src/lib/nativeFS.js`)

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
npm run cap:sync
npm run cap:copy
```

## Relevante Scripts

- `npm run dev`
- `npm run dev:web`
- `npm run dev:android`
- `npm run dev:ios`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run cap:add:android`
- `npm run cap:add:ios`
- `npm run cap:sync`
- `npm run cap:android`
- `npm run cap:ios`
- `npm run cap:copy`

## Struktur

- `src/pages/Editor.jsx`
- `src/components/editor/*`
- `src/lib/nativeFS.js`
- `src/api/*`
- `android/`
- `ios/`

## Environment

- `VITE_NEXUS_CONTROL_URL=https://nexus-api.cloud`
- `VITE_NEXUS_CONTROL_INGEST_KEY` (App-Key fuer `code-mobile`)
- `VITE_NEXUS_USER_ID`
- `VITE_NEXUS_USERNAME`
- `VITE_NEXUS_USER_TIER`

## Hinweise

- `npm run dev` startet den Android-Flow (nicht nur Web).
- Fuer Browser-Debugging `npm run dev:web` nutzen.
- Mobile und Desktop sollen funktional moeglichst paritaetisch bleiben.
