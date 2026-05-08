# Architecture (v6)

Nexus Main ist die Desktop-App im Ecosystem. Die App startet bewusst ueber den Hosted-API-Bootflow: ohne gueltige Session soll nicht heimlich ein Offline-Ersatzbildschirm geladen werden. Wenn API, Catalog, Layout oder Release-Check fehlschlagen, wird kontrolliert gestoppt und der Login-/Register-Flow bleibt sichtbar.

## Stack

- Electron als Desktop Shell.
- React 19 + Vite 8 als Renderer.
- Zustand 5 fuer lokale Stores und persistierte UI-Konfiguration.
- Monaco Editor fuer Code.
- Framer Motion 12 fuer kontrollierte Motion.
- Three fuer visuelle Module, wenn eine View echte 3D-/Renderarbeit braucht.

## Runtime Split

- `electron-main.cjs`: App-Lifecycle und Bootstrap.
- `electron/main-window.cjs`: BrowserWindow, Dev/Prod-Loadstrategie und Fensterverhalten.
- `electron/ipc-handlers.cjs`: Window-, File- und Notification-IPC.
- `electron/security.cjs`: CSP, Header und sichere Defaults.
- Hosted API Bootstrap: prueft Catalog, Layout und Release-Metadaten, bevor Main voll startet.
- `packages/nexus-core`: geteilte Runtime-Logik fuer Views, Render-Pipeline, Canvas Templates und Capture Intents.

## Renderer Composition

- `src/App.tsx`: Entry fuer Shell, Gate-States und globale Overlays.
- `src/app/MainShellLayout.tsx`: Sidebar, Toolbar, Content-Fluss und Shell-Spacing.
- `src/app/NexusV6ViewShell.tsx`: kompakter View-Rahmen ohne uebergrosse Top-Orbs.
- `src/views/*`: Dashboard, Notes, Tasks, Reminders, Files, Canvas, Flux, Code, DevTools, Settings, Info.
- `src/components/*`: wiederverwendbare Glass-, Toolbar-, Terminal-, Markdown- und Shell-Bausteine.

## State Model

- `src/store/themeStore.ts`: Theme Library, Backgrounds, Panel-Stile, Motion, Layout, Editor und QOL-Optionen.
- `src/views/settings/themeTransfer.ts`: sichere v6-Theme-Exports und rueckwaertskompatibler Import.
- `src/store/appStore.ts`: Notes, Code-Files, Tasks, Reminders und Arbeitsdaten.
- `src/store/canvasStore.ts`: Canvases, Nodes, Connections und Viewport.
- `src/store/terminalStore.ts`: Terminal Commands, Makros, History und Undo/Redo.
- `src/store/persistence/*`: Storage Manager mit debounced Persistenz und Migrationspfaden.

## UI Principles

- Main Content bekommt Vorrang; Navigation und Statusleisten bleiben kleiner.
- Panels sollen glowy, transparent und klar sein, aber nicht grainy oder laut.
- Motion darf Orientierung geben, darf aber keine Klickziele verschieben.
- Settings bieten Presets fuer schnelle Entscheidungen und Details fuer Feinschliff.
- InfoView und Wiki beschreiben Features so, wie Menschen sie wirklich benutzen.

## Verification

- `npm --prefix "Nexus Main" run build`
- `npm run verify:encoding`
- `npm run release:gate -- --fast`
- Optional fuer Installer: `npm run build:main:all-platforms`
