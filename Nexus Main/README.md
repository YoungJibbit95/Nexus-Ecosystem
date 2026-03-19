# Nexus v5.0

Nexus is a desktop productivity workspace built with Electron, React, and Zustand.  
It combines Notes, Code, Tasks, Reminders, Canvas planning, Files, DevTools, and a command-driven terminal/spotlight flow in one local-first app.

## v5.0 Highlights

- Full glass/glow UI refresh with cleaner macOS-style shell behavior
- Canvas Magic Builder extended with `AI Project Generator` (prompt + depth)
- Dashboard Layout Editor improved with drag/drop snap logic and manual grid controls
- Terminal moved to centered bottom dock and stabilized
- Performance pass across heavy UI layers (toolbar, glass hover, terminal render window)
- Electron main process split into modular files

## Core Features

- `Dashboard`: customizable widget grid with drag/drop + snap layout editor
- `Notes`: markdown editor, split/preview modes, magic widgets
- `Code`: Monaco editor, JS/TS run, HTML/CSS preview, JSON validation
- `Tasks`: kanban workflow with subtasks, notes, priorities, deadlines
- `Reminders`: timeline/reminder workflow, snooze, soon/overdue filters
- `Canvas`: mindmap + project management board with auto-layout modes
- `Files`: unified item browser with workspace assignment
- `DevTools`: UI builder + utility calculators
- `Settings`: deep visual and UX configuration
- `Terminal + Spotlight`: command palette, macros, quick actions, app navigation

## Getting Started

### Requirements

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run (Web)

```bash
npm run dev
```

### Run (Electron + Vite)

```bash
npm run electron:dev
```

### Production Build

```bash
npm run build
```

### Package

```bash
npm run dist
```

## Scripts

- `npm run dev` - Vite dev server
- `npm run build` - TypeScript build + Vite production build
- `npm run electron:dev` - Electron with live Vite server
- `npm run electron:build` - Build + Windows package
- `npm run electron:build:mac` - Build + macOS package
- `npm run dist` - Electron Builder package

## Project Structure

- `src/` - renderer app (React)
- `src/views/` - app views (Dashboard, Notes, Canvas, etc.)
- `src/components/` - shared UI components
- `src/store/` - Zustand stores
- `electron-main.cjs` - Electron boot entry
- `electron/` - modular Electron runtime (`main-window`, `ipc-handlers`, `security`)

## Documentation

- [View Guides](./docs/GUIDES.md)
- [Architecture Notes](./docs/ARCHITECTURE.md)
- [Changelog](./CHANGELOG.md)

## Notes

- Mobile-port preparation is intentionally excluded in this repository (handled in a separate project).
- All state is local-first via browser/Electron storage.
