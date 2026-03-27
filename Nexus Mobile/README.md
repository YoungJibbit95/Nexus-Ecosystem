# Nexus Mobile

Nexus Mobile ist die mobile Runtime-Plane-App im Nexus Ecosystem. Das Projekt kombiniert Dashboard, Notes, Tasks, Reminders, Canvas, Files, DevTools, Flux und Settings in einer React-/Vite-App mit nativen Capacitor-Zielen fuer Android und iOS.

## Verifizierte Funktionen

- Dashboard, Notes, Tasks, Reminders, Canvas, Files, DevTools, Flux und Settings sind als App-Bereiche vorhanden.
- Mobile Navigation und Command Palette sind im UI vorhanden.
- Native Builds laufen ueber Capacitor (`android/`, `ios/`, `capacitor.config.ts`).
- Lokaler App-State liegt in den Stores unter `src/store/`.

## Voraussetzungen

- Node.js 20+
- npm 10+
- Android Studio fuer Android-Entwicklung
- Xcode auf macOS fuer iOS-Entwicklung

## Setup

```bash
npm install
```

Die nativen Plattformordner (`android/`, `ios/`) sind bereits im Projekt vorhanden. Fuer einen sauberen Stand kannst du bei Bedarf `npm run cap:sync` ausfuehren.

## Entwicklung

### Web

```bash
npm run dev:web
```

### Android

```bash
npm run cap:android
```

### iOS

```bash
npm run cap:ios
```

## Build

```bash
npm run build
```

## Wichtige Scripts

- `npm run dev` startet den Android-Capacitor-Flow.
- `npm run dev:web` startet den Vite-Dev-Server.
- `npm run dev:android` startet denselben Android-Flow wie `dev`.
- `npm run dev:ios` baut, synchronisiert und oeffnet Xcode.
- `npm run cap:sync` synchronisiert native Projekte.
- `npm run cap:build:android` baut die Web-App und synchronisiert Android.
- `npm run cap:build:ios` baut die Web-App und synchronisiert iOS.

## Struktur

- `src/components/` UI-Bausteine wie Navigation und Command Palette
- `src/views/` App-Views inklusive Canvas
- `src/store/` lokaler App-, Theme-, Terminal- und Canvas-State
- `src/lib/` gemeinsame Utilities
- `android/` natives Android-Projekt
- `ios/` natives iOS-Projekt

## Environment

- `VITE_NEXUS_CONTROL_URL=https://nexus-api.cloud`
- `VITE_NEXUS_CONTROL_INGEST_KEY` (VPS-Key fuer `appId=mobile`)
- `VITE_NEXUS_USER_ID`
- `VITE_NEXUS_USERNAME`
- `VITE_NEXUS_USER_TIER`

## Hinweise

- `npm run dev` ist kein reiner Web-Devserver, sondern oeffnet Android Studio.
- Wenn du nur die Browser-Ansicht brauchst, nutze `npm run dev:web`.
