# Architecture (v5.0)

## Stack

- Electron (desktop shell)
- React 18 + Vite 5 (renderer)
- Zustand (state management + persist)
- Monaco Editor (code editing)
- Framer Motion (motion system)

## Runtime Split

Main process entry is intentionally small and delegates to modular files:

- `electron-main.cjs`
  - app lifecycle bootstrap
  - window bootstrap orchestration
- `electron/main-window.cjs`
  - BrowserWindow creation and load strategy
- `electron/ipc-handlers.cjs`
  - window IPC
  - file read/write IPC
  - notification IPC
- `electron/security.cjs`
  - CSP/header handling

## Renderer Composition

- `src/App.tsx`
  - shell window + title bar + sidebar + current view + terminal + toolbar
- `src/views/*`
  - feature views (dashboard, notes, code, tasks, reminders, canvas, files, devtools, settings, info)
- `src/components/*`
  - reusable shell, glass, toolbar, sidebar, terminal components

## State Model

- `src/store/themeStore.ts`
  - visual config, toolbar options, animation controls
- `src/store/appStore.ts`
  - notes, code files, tasks, reminders, activities
- `src/store/canvasStore.ts`
  - canvases, nodes, edges, viewport controls
- `src/store/terminalStore.ts`
  - command engine, macros, history, undo/redo

## Performance Notes

- Glass hover lighting is rAF-throttled to avoid per-event render spikes.
- Terminal renders a bounded visible history window.
- Toolbar status refresh uses minute-level updates.
- Canvas node and edge rendering uses memoized components with rAF drag/resize loops.
