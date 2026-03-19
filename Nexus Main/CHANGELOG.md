# Changelog

## v5.0.0 - 2026-03-19

### Added

- Canvas `AI Project Generator` template (prompt + depth levels)
- Expanded canvas template command support in toolbar and terminal (`canvas template ai`)
- Reminders `soon` filter and overdue quick actions
- New GitHub docs set (`README`, `docs/GUIDES.md`, `docs/ARCHITECTURE.md`)

### Changed

- UI recode toward stronger glass/glow visual style
- Toolbar island/full-width cleanup with reduced badge clutter
- Terminal repositioned to centered bottom
- Dashboard layout editor improved (drag/drop + snap + manual controls)
- Electron main process split into modular files

### Fixed

- Canvas layout mode switching now applies immediately (`mindmap/timeline/board`)
- Canvas TypeScript build blocker caused by `Map` symbol collision
- Spotlight popover horizontal position corrected (centered)
- Terminal render and glass hover behavior optimized for smoother performance

### Performance

- Throttled hover light updates with `requestAnimationFrame`
- Reduced terminal history retention and visible render window
- Reduced toolbar timer frequency to avoid unnecessary rerenders
