# UI system and visual audit

The existing IDE has useful density and panel chrome, but surfaces compete through glow, gradients, blur, rounded cards and repeated status/command controls. Inspect [fixture baseline](evidence/visual-baseline.md) and the production gate screenshots before editing. These are observed baseline constraints, not an approved V2 design.

## Proposed tokens (design contract, not implemented CSS)

| Surface | Role | Initial dark reference |
| --- | --- | --- |
| 0 | Window background | `#0e1014` |
| 1 | Title/activity/status chrome | `#14171d` |
| 2 | Side/bottom panels | `#191d24` |
| 3 | Editor | `#111419` |
| 4 | Menus/popovers/dialogs | `#222730`, bounded shadow |
| 5 | Critical blocking overlay | Opaque readable panel + restrained backdrop |

Semantic variables: background/window/chrome/panel/editor/overlay; text/secondary/muted; border/subtle; accent/hover/selection; warning/error/success/info; focus ring; shadow; blur; radius; spacing; motion. Proposed primary accent is restrained blue; final shades require measured contrast. Keep syntax colors distinct from workbench semantic colors and user effect preferences.

Spacing scale: 2/4/6/8/12/16/24px. Small controls 26–30px; primary controls 32–36px; title 32–38px; activity rail 44–48px; status 22–26px. These are initial design ranges, not hard-coded acceptance without layout measurement. Chrome text 12–13px, panel headings 11–12px, editor 14px default with scaling. Radius 3–6px for controls; 6–8px for overlays. Remove pill/card treatment from normal work surfaces. Blur is optional on overlays only; never on the editor. Visible 2px focus outline, high-contrast selection, persistent active indicators and no hover layout movement.

Motion: 80–140ms opacity/color for interaction; meaningful overlay transitions only. Reduced motion disables movement/glow/typing animation without disabling functionality. No forced font/zoom cap that prevents readable accessibility scaling. Tokens must preserve safe theme fallbacks and not alter document/layout state.

## Shell and interaction contract

Titlebar: window controls, project identity, compact menu, command center, few global actions; preserve macOS control placement and drag/no-drag zones. Activity rail: Explorer/Search/SCM/Run-Debug/Extensions plus Account and bottom Settings; accessible labels/tooltips/focus/active state. Side panels use existing PanelChrome as the starting seam, with consistent header/toolbar/filter/body/loading/empty/error patterns.

Editor: tab strip, optional breadcrumbs, dominant CodeMirror surface; unrelated commands leave the tab strip. Tabs need real keyboard tab semantics, visible dirty state, accessible close control, middle-click, close others/right and later reopen. Current close is a `span role=button tabIndex=-1` nested in a tab button; source proves an accessibility gap even where visual screenshots pass.

One bottom panel host for Terminal/Problems/Output/Debug Console when available; no invented tabs. Smooth resize/collapse/restore, persisted validated size and focus. Status displays branch, Problems, provider readiness, language, cursor and save state concisely. Encoding/EOL controls must await actual support.

One overlay search UI eventually provides commands `>`, files, workspace symbols `@`, line `:`, document symbols `#`; capability-dependent modes only. Existing CommandPalette/Spotlight share ranking models but remain separate components and event paths. Preserve useful search/ranking while replacing duplicate dispatch.

## CSS audit and retirement

`globals.css`: 65,919 bytes/2,192 lines; 331 `rgba(...)` occurrences and 182 `!important` occurrences. Literal-selector analysis finds repeated tree/tabbar/explorer selectors; it is a candidate list, not proof of redundant cascade rules. Media and state overrides may be legitimate. See [inventory](evidence/source-inventory.json).

Current late tree/tabbar/panel overrides, small-window patches, effect selectors and many inline sizes/colors spread responsibility. Migrate semantic tokens first, then a primitive/panel/shell at a time with computed-style/screenshot comparisons. Use scoped subsystem styles or CSS modules. Delete CSS only when all corresponding consumers and responsiveness/state rules have moved; do not deduplicate by selector string alone.

## Acceptance

Actual Electron UI at 1920x1080, 1440x900, 1280x720, 1024x768, 900x600; small-window minimum is currently 900x600. The legacy fixture suite additionally tests 900x512 and 390x900; phone fixture success does not establish a desktop product requirement. Check spacing, alignment, clipping/overflow, contrast, focus/hover/active state, menus/popovers, resize, zoom, keyboard-only traversal and reduced motion. Fixture rendering cannot approve authenticated workbench interaction. Record screenshot paths and verified limitations on every UI packet.
