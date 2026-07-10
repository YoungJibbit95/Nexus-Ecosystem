# Nexus Code

[![Platform](https://img.shields.io/badge/platform-desktop-2563eb)](./README.md)
[![Framework](https://img.shields.io/badge/stack-electron%20%2B%20react-111827)](./README.md)
[![Core%20Parity](https://img.shields.io/badge/render%2Fmotion-core%20aligned-14b8a6)](../packages/nexus-core/README.md)

Nexus Code ist die Desktop-IDE-App im Nexus Ecosystem.
Sie fokussiert den Editor-/Run-Workflow, mit Workspace-, Terminal-, Search- und Debug-Surfaces.

## Main Surfaces

| Surface | Purpose | Highlights |
| --- | --- | --- |
| `Editor` | code writing | CodeMirror 6 editor, tabs, language services, diagnostics |
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
- shared contracts/utilities: `@nexus/core`

Core alignment goals:

- capability-aware interaction motion
- centralized render/runtime constraints
- reduced local raw animation drift
- stable packaged-runtime behavior

## Security Boundaries

Nexus Code treats the opened project folder as the local trust boundary.

- Electron runs with `contextIsolation`, `sandbox`, `nodeIntegration: false`, `webSecurity` and blocked WebViews.
- The renderer can only use the preload bridge; raw Node APIs are not exposed.
- `openFolder` registers an allowed workspace root, and all file IPC (`read`, `write`, `mkdir`, `delete`, `rename`) is resolved through that root.
- File reads/writes have bridge-size limits and cannot modify workspace metadata folders like `.git`.
- The integrated terminal starts only inside a selected workspace root, has a small session cap, validates channel IDs, and blocks network/system configuration plus obvious destructive system commands.
- Popups, external links and permission prompts are denied by default; production only opens `https:` links externally.

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

Client-side environment values are public configuration, not secrets.

Most Nexus Code development should work without production cloud credentials. Use local `.env.local` values only for non-secret public development hints; keep Nexus Cloud credentials, backend routes, signing material and deployment details outside this repository.

See `../docs/ENVIRONMENT.md`.

## Notes

- The private Nexus Cloud backend is not included in this repository.
- Packaged runtime performance should always be validated, not only dev-server behavior.
