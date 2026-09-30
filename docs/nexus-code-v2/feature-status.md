# Feature status — implementation truth at Wave 0

Date: 2026-09-30. Base: `10f8684`. REAL = actual implementation; PARTIAL = limited/incomplete; SIMULATED = generated behavior without claimed runtime; BROKEN = reproduced failure; NOT PRESENT = no path found. A REAL row still needs platform/live acceptance where stated. The V2 product labels are supported, limited, experimental or unavailable; source status must never be inferred from a visible panel.

| Feature | Status | Evidence / current limit | Allowed product description |
| --- | --- | --- | --- |
| App boot/routing | REAL | App/boot hook; production signed-out launch captured | Account-gated desktop app |
| Nexus authentication/release/tier policy | REAL | Shared session/API/access contracts; no live login during audit | Requires validated compatible account; no offline bypass |
| Remember-device / local login restore | PARTIAL, copy ambiguous | Flag forwarded to backend; local session/token stored in sessionStorage, legacy localStorage cleared; native restart restore unverified | Explain backend/session lifetime; no durable local-login guarantee |
| Open workspace / file tree | REAL, PARTIAL scale | Production root registration + lazy/virtual models; per-folder caps | Selected workspace; show listing limits |
| Native read/write/rename/delete | REAL | Native test real bytes/empty/Unicode/EOL and boundary rejection | UTF-8 file operations; no atomic/crash durability promise yet |
| Draft/save revision protection | REAL | 52 IDE cases + real-browser persistence cases | Revision-bound saves and guarded mutations |
| Legacy/corrupt restore handling | REAL | Retained validated v3/v2/legacy readers, blocked-corrupt paths | Recovery compatible with existing formats |
| Native installed upgrade/force-kill durability | NOT VERIFIED | No installed-client/restart/crash acceptance | No expanded durability claim |
| Multi-window file coordination | NOT PRESENT/NOT VERIFIED | No accepted coordination protocol | Single-workbench acceptance only |
| External filesystem watcher/conflicts | NOT PRESENT | No watcher found | Manual refresh; conflicts need redesign |
| CodeMirror editing/find/undo/syntax | REAL | Models, smoke fixtures, language visuals | CodeMirror editing; syntax scope differs from intelligence |
| Tab dirty/selection/keyboard switch | REAL, PARTIAL | Existing handlers/shared draft identity | Basic tabs |
| Middle-close/close others/right/reopen | NOT PRESENT | No active handlers found | Do not advertise |
| Large-file mode | REAL | 220k/7.5k guarded; 650k/18k plain policy | Reduced assistance with explicit reason |
| LSP subprocess/protocol | REAL, conditional | Native service + seven language-ID presets | External installed servers; readiness required |
| Completion/hover/definition/format/actions/rename | PARTIAL, conditional | Real protocol requests + local fallbacks; no actual server acceptance here | Method/language-specific support |
| Workspace LSP diagnostics | PARTIAL | URI service map exists; parent Problems receives active array | Current-file diagnostics; workspace authority pending |
| References/signatures/semantic/inlay/highlights | NOT PRESENT | No active provider path | Unavailable |
| Local document/workspace symbol extraction | REAL, LIMITED | Regex/local models and capped Spotlight scan | Local symbol search |
| Workspace text search | REAL, LIMITED | Loaded-node SearchPanel caps 1,400 files/500 matches/32 per-file/1m chars | Search loaded scope; visible cap needed |
| Recursive quick open/Spotlight search | REAL, LIMITED | Separate ignored/capped recursive scan | Bounded quick open; scope differs from Search |
| Replace across workspace | NOT PRESENT | SearchPanel has no real replacement pipeline | Unavailable |
| Real command execution | REAL, BROKEN quoted Windows path | Native stdio test passes relative command; quoted absolute path fails | Runner; spaces bug tracked |
| Browser terminal responses | SIMULATED | Explicit SIMULATED_RESPONSES | Demo/test only, never production terminal success |
| PTY/persistent interactive shell/resize | NOT PRESENT | child_process stdio, no xterm/node-pty | No interactive terminal promise |
| Task templates | REAL, LIMITED | Fixed command definitions, not package-script discovery | Preset tasks |
| Local Git status/diff/stage/unstage/commit/branches/log/remotes | REAL | Service argv contracts; native status/stage/commit passed | Local Git workflow |
| Structured fetch/pull/push/clone/discard/hunk stage | NOT PRESENT | No dedicated accepted IPC workflow | Unavailable until implemented/accepted |
| GitHub repos/issues/PR/reviews/projects | REAL, live unverified | Native REST/GraphQL/auth service; fixture errors/UI only | Desktop + connected GitHub required |
| GitHub token encryption | REAL, graded limitation | safeStorage with machine-local fallback | Encryption backend grade must be visible/explicit |
| Debug process/breakpoints/stack/variables/step | SIMULATED | Static values/generated stack/timers; no DAP | Experimental preview or unavailable |
| Extension manifest validation/contributions | REAL, LIMITED | Restricted local themes/snippets/keybindings/action routes | Built-in/declarative extensions |
| Marketplace download/update/execution host | SIMULATED/NOT PRESENT | Install updates records only; no actual package runtime | No marketplace or VS Code compatibility claim |
| Command palette / Spotlight | REAL, duplicated ownership | Shared ranking but separate overlays/catalogs/Editor switch | Existing quick actions; consolidate |
| Settings/theme/keybindings | REAL, PARTIAL reliability | Existing defaults/catalog/UI; writes can swallow errors | Existing preferences, schema/error migration pending |
| Docking/PanelChrome/focus models | REAL | Pure normalized models/SSR/visual fixtures | Current docking, further interaction checks needed |
| Packaged Windows/macOS/Linux app | IMPLEMENTED, NOT VERIFIED HERE | NSIS/DMG/AppImage/deb config; no installer execution in audit | Platform claims need release acceptance |

Every wave updates this ledger with implementation, real verification and remaining limits. Fixtures may show unavailable states intentionally; they never upgrade a feature to REAL. See [capability contracts](06-ide-capabilities.md), [subsystem classification](01-problem-inventory.md) and [tests](09-test-strategy.md).
