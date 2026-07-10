# Core View Runtime

The Core View Runtime keeps Nexus clients predictable across desktop and mobile. Views share metadata, actions, panels and layout hints so the clients can present a consistent local-first workspace.

## Goals

- One client-side source for view metadata, actions, panels, shortcuts and status signals.
- Stable desktop, tablet and mobile layout behavior.
- Panel handling for inspector rails, inline panels, sheets and focus mode.
- Command registry with enabled/disabled state and safe execution hooks.
- Stable UI controls that do not move click targets on hover or press.

## Main Exports

```ts
NEXUS_VIEW_MANIFESTS
buildNexusViewCommandRegistry()
resolveNexusViewCommandRegistry()
resolveDefaultNexusViewCommand()
executeNexusViewCommand()
resolveNexusViewPanels()
resolveNexusViewLayout()
buildNexusPanelEngine()
```

## Layout Model

`resolveNexusViewLayout()` returns a client layout model:

- `surface`: desktop, tablet or mobile.
- `surfaceMode`: dashboard, editor, board, canvas, browser, flow, settings, status, diagnostics or stack.
- `density`: compact, comfortable or spacious.
- `chrome`: full, focused or immersive.
- `contentPriority`: balanced, content-first, creation-first or diagnostic.
- `columns`: calculated shell columns.
- `minContentWidth`: minimum width for stable work surfaces.
- `panels`: resolved panel list.
- `commandPlacements`: command IDs grouped by primary, toolbar, command and context.

## Panel Engine

`buildNexusPanelEngine()` builds the active client panel state:

- desktop rails
- mobile or inspector sheets
- inline panels
- inspector-ready panels
- active panel
- visible inspector state

Focus mode hides non-essential rails while keeping work-critical inline status available.

## Command Registry

`resolveNexusViewCommandRegistry()` expands actions into commands with stable state:

- `commandId`
- `enabled`
- `disabledReason`
- `scope`
- `priority`

`executeNexusViewCommand()` stays UI-agnostic: it finds a command, respects disabled state and calls the app-provided handler.

## Next Steps

- Connect more view-specific command handlers.
- Keep Mobile and Main on shared panel/runtime contracts.
- Persist panel state per view.
- Improve global command palette integration.
