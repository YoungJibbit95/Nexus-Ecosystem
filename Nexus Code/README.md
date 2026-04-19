# Nexus Code

[![Platform](https://img.shields.io/badge/platform-desktop-2563eb)](./README.md)
[![Framework](https://img.shields.io/badge/stack-electron%20%2B%20react-111827)](./README.md)
[![Core%20Parity](https://img.shields.io/badge/render%2Fmotion-core%20aligned-14b8a6)](../packages/nexus-core/README.md)

Nexus Code ist die Desktop-IDE-App im Nexus Ecosystem.
Sie fokussiert den Editor-/Run-Workflow, mit Workspace-, Terminal-, Search- und Debug-Surfaces.

## Main Surfaces

| Surface | Purpose | Highlights |
| --- | --- | --- |
| `Editor` | code writing | Monaco editor, tabs, language services, diagnostics |
| `Explorer` | file workflow | tree navigation, project context, quick open |
| `Search` | project discovery | scoped search and jump actions |
| `Terminal` | execution | command runtime with integrated output flow |
| `Debug` | runtime inspection | debug events and feedback panels |
| `Problems` | quality surface | errors/warnings tracking and jump-to-location |
| `Command` | fast actions | command palette and quick execution |
| `Settings` | behavior tuning | editor and runtime preferences |

## Runtime and Architecture

- renderer entry: `src/App.jsx`, `src/pages/Editor.jsx`
- editor/panel components: `src/components/editor/*`
- electron main: `electron/main.cjs`
- preload bridge: `electron/preload.cjs`
- shared contracts/utilities: `@nexus/api`, `@nexus/core`

Core alignment goals:

- capability-aware interaction motion
- centralized render/runtime constraints
- reduced local raw animation drift
- stable packaged-runtime behavior

## Development

Inside app folder:

```bash
npm install
npm run dev
npm run electron:dev
```

From ecosystem root:

```bash
npm run dev:code
```

## Build / Packaging

Inside app folder:

```bash
npm run build
npm run electron:build
npm run electron:build:mac
npm run electron:build:win
npm run electron:build:installers
```

From ecosystem root:

```bash
npm run build:code
npm run build:code:installers
```

## Script Reference

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
- `VITE_NEXUS_CONTROL_INGEST_KEY` (key for `code`)
- `VITE_NEXUS_USER_ID`
- `VITE_NEXUS_USERNAME`
- `VITE_NEXUS_USER_TIER`

## Notes

- The private backend is not included in this repository.
- Packaged runtime performance should always be validated, not only dev-server behavior.
