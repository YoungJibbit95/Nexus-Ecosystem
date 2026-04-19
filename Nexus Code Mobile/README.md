# Nexus Code Mobile

[![Platform](https://img.shields.io/badge/platform-android%20%2F%20ios-16a34a)](./README.md)
[![Framework](https://img.shields.io/badge/stack-capacitor%20%2B%20react-111827)](./README.md)
[![Core%20Parity](https://img.shields.io/badge/render%2Fmotion-core%20aligned-14b8a6)](../packages/nexus-core/README.md)

Nexus Code Mobile ist die mobile IDE-App im Nexus Ecosystem.
Sie bringt den Editor-/Run-Flow auf Android/iOS mit mobile-angepassten Panels und Touch-Interaktionen.

## Main Surfaces

| Surface | Purpose | Highlights |
| --- | --- | --- |
| `Editor` | code writing | Monaco-based editing with mobile interaction tuning |
| `Explorer` | files and project context | project tree and quick file switching |
| `Search` | find/jump | project search and action routing |
| `Terminal` | command runtime | integrated terminal and output views |
| `Debug` | diagnostics | runtime debugging surface |
| `Problems` | quality surface | errors/warnings and jump actions |
| `Command` | quick actions | command palette and shortcuts |
| `Settings` | mobile editor behavior | runtime/editor controls |

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
npm run cap:sync
npm run cap:copy
```

## Script Reference

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

## Structure

- `src/pages/Editor.jsx`
- `src/components/editor/*`
- `src/lib/nativeFS.js`
- `src/api/*`
- `android/`
- `ios/`

## Environment

- `VITE_NEXUS_CONTROL_URL=https://nexus-api.cloud`
- `VITE_NEXUS_CONTROL_INGEST_KEY` (key for `code-mobile`)
- `VITE_NEXUS_USER_ID`
- `VITE_NEXUS_USERNAME`
- `VITE_NEXUS_USER_TIER`

## Notes

- `npm run dev` starts Android flow by default.
- Use `npm run dev:web` for web-only debugging.
- Mobile/desktop feature parity is targeted where practical.
