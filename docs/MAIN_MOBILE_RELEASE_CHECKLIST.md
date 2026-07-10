# Nexus Main / Mobile Release Checklist

Scope: `Nexus Main`, `Nexus Mobile`, `packages/nexus-core`

## Release Gate

Run before every Main/Mobile release:

```bash
npm run release:main-mobile
```

The gate covers:

- Single React instance
- Encoding checks
- Ecosystem contracts
- Optional signing configuration
- `@nexus/core` build
- Nexus Main production build
- Nexus Mobile production build
- Main/Mobile dependency audit

## Current Focus

| Area | Status | Next Step |
| --- | --- | --- |
| Main Build | Gate-ready | Re-run after every Main UI batch |
| Mobile Build | Gate-ready | Re-run after shared runtime or Mobile UI changes |
| Canvas Main | In progress | Finish multi-select, history and snap polish |
| Canvas Mobile | In progress | Align mobile gestures and inspector sheets |
| Settings | In progress | Keep shared schema and public-safe wording aligned |
| Notes | In progress | Keep toolbar responsive and split editor state from persistence |
| Files | In progress | Test manual workspace handoff roundtrip |
| Website | In progress | Refresh public screenshots and product copy |

## Canvas

- [x] Validate persisted canvas UI preferences
- [x] Adaptive minimap for small viewports
- [x] Desktop node inspector
- [x] Reduced node chrome
- [ ] Multi-select: shift-click, selection rectangle and group move
- [ ] Undo/redo for create, delete, move, resize, edit and connect
- [ ] Snap-to-grid options
- [ ] Mobile pinch zoom and touch gestures
- [ ] Mobile inspector as compact sheet

## Settings

- [x] Shared settings schema base
- [x] Versioned defaults, validation and persistence
- [x] Theme import validation through shared parser
- [x] Visible panel backgrounds
- [x] App background options wired through shell/window tokens
- [ ] Further reduce duplicated Main/Mobile settings panels
- [ ] Make reset/import/export flows clearer
- [ ] Keep developer-only controls visibly development-only

## Notes

- [x] UI-state import protected against broken local values
- [x] Emoji and block menus do not expand the toolbar layout
- [x] Magic button closes competing popovers
- [x] Tags are not mixed into the primary format row
- [x] Editor/preview space is prioritized over toolbar chrome
- [ ] Split editor draft state from store persistence
- [ ] Move large markdown/emoji/magic data to smaller modules
- [ ] Add import validation for Markdown/JSON notes
- [ ] Add performance gate for very large notes

## Manual Smoke

- Main: start, dashboard, notes, canvas, files and settings
- Main Notes: emoji, blocks, magic, split/edit in narrow windows
- Main Canvas: create, select, edit, duplicate and delete a node
- Main Files: search, filter and workspace handoff
- Mobile: start, dashboard, notes, canvas, files and settings
- Mobile Files: import/export/share a manual workspace snapshot
- Mobile Canvas: pan, zoom, node edit and small viewports

## Release Blockers

- Repo-wide dependency alerts outside the Main/Mobile gate must be triaged separately.
- Full runtime smoke may require a valid Nexus Cloud account session.
- Code and Code Mobile use a separate release window.
