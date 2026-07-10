# Nexus Main View Registry

The Nexus Main view registry reduces duplicate view metadata across sidebar, preload, boot configuration and shared manifests.

## Primary File

```text
Nexus Main/src/app/mainViewRegistry.ts
```

## Responsibilities

- View type metadata for product views and development-only diagnostics.
- Icon, label, color, category and navigation groups per view.
- Sidebar and shell grouping.
- Preload priority and heavy-view markers.
- Critical, boot-priority and persisted view lists.
- Normalization of cloud-managed view availability to locally known views.

## Connected Areas

- `Sidebar.tsx` uses primary and footer view items.
- `viewPreload.tsx` uses view IDs, preload priority and heavy preload sets.
- `mainAppConfig.ts` uses registry lists for fallback, boot, critical preload and local cache.
- `NexusV6ViewShell` uses shared commands and delegates real app commands to `MainViewHost`.

## Command Bridge

`NexusV6ViewShell` can execute commands from the resolved shared registry. `MainViewHost` handles core user actions such as creating notes, tasks and reminders.

Unhandled commands are forwarded as browser events so views can adopt handlers incrementally without duplicating shell logic.

## Next Steps

- Align command palette and toolbar behavior with the registry.
- Let Notes, Tasks and Canvas consume their own view events.
- Persist panel state per view.
- Keep Mobile registry consumption aligned with Main.
