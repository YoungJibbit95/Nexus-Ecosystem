# Nexus Code Mobile

Nexus Code Mobile ist die mobile Code-App im Nexus Ecosystem. Das Projekt liefert einen React-/Vite-Editor mit nativen Capacitor-Targets fuer Android und iOS sowie Editor-Panels fuer Suche, Git, Debug, Problems und Terminal.

## Verifizierte Funktionen

- Monaco-basierter Code-Editor (`src/components/editor/CodeEditor.jsx`)
- Native Filesystem-Bridge ueber Capacitor (`src/lib/nativeFS.js`)
- Editor-Panels fuer Search, Git, Debug, Problems und Terminal
- Dateibaum, Tabs und Spotlight-Suche in `src/pages/Editor.jsx`
- Vorhandene Setup-Skripte `SETUP-ANDROID.bat` und `SETUP-ANDROID.sh`

## Voraussetzungen

- Node.js 20+
- npm 10+
- Android Studio fuer Android
- Xcode auf macOS fuer iOS

## Setup

### Schnellstart-Skripte

- Windows: `SETUP-ANDROID.bat`
- macOS/Linux: `./SETUP-ANDROID.sh`
- macOS/iOS: `./SETUP-ANDROID.sh ios`

### Manuell

```bash
npm install
```

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
- `npm run cap:sync` baut die Web-App und synchronisiert Capacitor.
- `npm run cap:copy` baut die Web-App und kopiert Assets in native Projekte.
- `npm run lint` prueft den Code mit ESLint.

## Struktur

- `src/components/editor/` Editor, Panels und Shell-Komponenten
- `src/lib/nativeFS.js` native Dateisystem-Bridge fuer iOS/Android
- `src/pages/Editor.jsx` Hauptseite mit File-Tree, Tabs und Panel-Steuerung
- `src/api/` API-Helfer
- `android/` natives Android-Projekt
- `ios/` natives iOS-Projekt

## Environment

- `VITE_NEXUS_CONTROL_URL=https://nexus-api.cloud`
- `VITE_NEXUS_CONTROL_INGEST_KEY` (VPS-Key fuer `appId=code-mobile`)
- `VITE_NEXUS_USER_ID`
- `VITE_NEXUS_USERNAME`
- `VITE_NEXUS_USER_TIER`

## Hinweise

- `npm run dev` startet nicht den Browser-Devserver, sondern den Android-Flow.
- Die README dokumentiert nur nachweisbare lokale Funktionen; Release- und Lizenzregeln muessen separat gepflegt werden.
