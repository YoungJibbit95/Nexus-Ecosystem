# Main / Mobile Parity Matrix

## Shared Contracts

### Navigation

- `bottom-nav`: standard on phones.
- `tabs`: dedicated mobile rendering.
- `sidebar`: tablet and large-screen layouts.

### Quick Capture

Shared capture intents from `@nexus/core`:

- `note`
- `task`
- `reminder`
- `code`
- `canvas`

These intents are used across dashboard, toolbar and command flows where appropriate.

### Workspace Handoff

Workspace handoff is intentionally manual in the public clients. Local export/import keeps users in control and avoids hidden sync loops.

## View Parity

| View | Nexus Main | Nexus Mobile | Parity Status |
| --- | --- | --- | --- |
| Dashboard | Widgets, today layer and quick capture | Mobile dashboard and quick capture | Equivalent, adapted UI |
| Notes | Editor, preview and templates | Touch-friendly notes workflow | Equivalent |
| Tasks | Kanban/list flow | Kanban/list flow | Equivalent |
| Reminders | Due states and snooze/complete | Due states plus native scheduling where available | Mobile extended |
| Canvas | Full board primitives and inspector | Mobile board interactions and sheets | Near parity |
| Files | Workspace import/export | Mobile import/export/share | Platform-specific |
| Code | Desktop code flow | Mobile code flow | Near parity |
| Settings | Desktop settings stack | Mobile settings stack | Functional parity |
| Info | User docs | User docs | Near parity |
| Flux | Workflow surface | Workflow surface | Equivalent |

## Release Checks

1. Run `npm run release:main-mobile`.
2. Test quick capture in Main and Mobile.
3. Test manual workspace export/import.
4. Test phone and tablet navigation.
5. Smoke-test Canvas on desktop and small mobile viewports.
6. Smoke-test Settings export/import and section reset.

For full client releases, run `npm run release:gate` as well.
