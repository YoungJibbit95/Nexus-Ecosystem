# Current Nexus Code user guide

This describes the audited implementation, not promised future V2 features. Check [feature status](feature-status.md) for limits. An authenticated compatible Nexus account is required to reach the workbench; the private backend is not in this repository. The local session/token uses sessionStorage and removes legacy localStorage credentials. Remember is sent to the backend; durable local-login restoration after a native restart was not accepted here.

## Open a project and edit

Use Open Folder (Ctrl/Command+O outside editable inputs) to choose a native workspace. Explorer loads folders as needed and supports refresh. The selected folder is the native file boundary; protected metadata such as `.git` cannot be edited through file IPC. Large listings are capped; there is no live filesystem watcher. Refresh after external changes and take care with unsaved external edits.

Open a file, edit in CodeMirror and use Save (Ctrl/Command+S), or Save All from available commands. Dirty indicators represent draft changes. Shared persistence tracks revisions and preserves drafts across tab switching; native installed crash/upgrade durability is not yet accepted. UTF-8 is the native IO format. Large files intentionally reduce language assistance or syntax. Keep recovery data when restore reports a problem.

## Language support and search

Syntax coloring covers more languages than semantic intelligence. JS/TS, Python, Rust, Go and C/C++ can use externally installed native language servers. A missing server/bridge means local assistance only; JSON/HTML/CSS have no native server preset today. Completion/hover/definition/format/actions/rename depend on actual provider readiness. References/signature help/semantic tokens/inlay hints are not implemented.

Workspace Search (Ctrl/Command+Shift+F outside inputs) scans loaded files with limits. Spotlight/quick-open uses a separate bounded recursive scope. Results are not guaranteed exhaustive; cross-workspace replace is unavailable. Problems filters and jumps to diagnostics, but the current parent list follows the active editor rather than an authoritative workspace collection.

## Run commands

The desktop runner executes real commands in the selected workspace with stdout/stderr/input/exit events and bounded output. It is not a persistent interactive PTY terminal. Task entries are templates, not automatic project discovery. Windows quoted absolute script paths containing spaces currently fail through this bridge; relative commands such as `node runner.cjs` passed characterization. Browser canned responses are demonstrations, not actual execution. Existing manual command restrictions remain enforced.

## Git and GitHub

Local Git supports repository status, stage/unstage, commit, branches, textual diff/history/remotes. Fetch/pull/push/clone/discard/hunk-stage do not have a dedicated accepted workflow. Git state is local; it is distinct from GitHub state.

GitHub requires the desktop bridge and a connected account. Real service code supports repositories, issues, PRs/reviews and Projects v2; live network/account workflows were not accepted in this audit. Handle unavailable/rate-limit/auth errors as actual failures. GitHub token encryption depends on the storage backend; machine-local fallback is weaker than OS-protected storage. Nexus login and GitHub login are separate.

## Debugging and extensions

The current Debug panel is a simulation: its variables/stacks/pauses do not inspect a real process. Treat it as an experimental preview until a real adapter is accepted. Extensions currently provide restricted local declarative contributions. Catalog Install/Update does not download or execute a marketplace package, and Nexus Code is not a VS Code-compatible extension host.

## Settings and shortcuts

Settings contains editor, files, workbench, appearance, language and shortcut controls. Existing values are retained during the planned schema migration. Some advanced effect controls expose internal terminology; settings write errors currently need stronger acknowledgment.

| Shortcut (Ctrl on Windows/Linux, Command where current handlers accept Meta) | Current action |
| --- | --- |
| S | Save active document, including in editor |
| N / O / W | New file / open folder / close active tab |
| B / backtick | Toggle side panel / runner panel |
| Shift+F | Open Search |
| comma | Open Settings |
| Shift+P or F1 | Command palette |
| P | Current command/quick-open entry (not yet unified Spotlight) |
| Alt+[ or Alt+] | Cycle dock focus |

Except Save, the global handlers avoid editable inputs, so these combinations can differ while typing in CodeMirror or a form. Keybinding overrides/menus still need dispatch parity. Use the visible menu/palette if a shortcut is unavailable.

## Troubleshooting

If the account/release gate blocks access, check the displayed account/API/compatibility state; there is no supported bypass. If native panels say bridge unavailable, use the actual desktop runtime. If language tools are unavailable, inspect server installation/configuration and use clearly labeled local assistance. Save failures require retry/recovery, not clearing dirty state. Preserve legacy/corrupt recovery snapshots and capture the exact error. [Test baseline](09-test-strategy.md) lists current known failures and verification gaps.
