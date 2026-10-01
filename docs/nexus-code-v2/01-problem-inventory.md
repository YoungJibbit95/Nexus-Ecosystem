# Problem and dependency inventory

Evidence base: `10f8684`; source observations are not reproduced vulnerabilities. Priorities express migration risk/value, not CVSS. No production fix or dependency removal belongs to Wave 0.

Historical inventory. P04 is subsequently fixed in current main `0cb408b`, verified using the unchanged native harness (10/10). See [reconciliation](11-main-reconciliation.md) for current versus historical status and refreshed diagnostics; do not replay the old runner fix.

## Ranked problems

| ID | Priority | Evidence and consequence | Resolution packet |
| --- | --- | --- | --- |
| P01 | Highest | Full JS typecheck exits 2 with 4,353 diagnostics, reproduced in the primary checkout. Build uses a different, permissive configuration. Architectural contracts cannot currently rely on a green type gate. | Wave 1 strict new boundaries; retain full failing gate and tracked inventory |
| P02 | Highest | Editor owns files, tabs, layout, settings, commands and platform access; CodeEditor also owns provider/process lifecycles. Multiple owners make extraction and async identity mistakes likely. | Waves 1/4/5/6, compatible seams and revision tests |
| P03 | Highest | DebugPanel fabricates variables, stacks and timer-driven pauses without DAP or a real target process. Extension installation is a local record update, not a package/host operation. | Capability labels at foundation; debugger/extension reconception in 11/12 |
| P04 | Subsequently fixed | Historical Windows IPC failed `node "<absolute path with spaces>"`; merged main `0cb408b` passes the unchanged harness 10/10. | Retain original evidence and passing regression; do not fix again |
| P05 | High | Native file writes use direct UTF-8 `fs.writeFile`, not atomic replacement/fsync. Installed upgrade, full-process restart, force-kill and multi-window durability are unverified. Current revision-bound save/restore repairs are valuable and must remain. | Separate hardening in 4/14; preserve shared owners/readers |
| P06 | High | Main IPC handlers generally ignore sender events; central senderFrame validation is absent. Canonical path/protected metadata guards are present and passed native characterization. | Wave 1 typed adapter; bounded main validation/hardening with attack regressions |
| P07 | High | GitHub encrypted fallback derives a machine/user/path key with stored salt. This is not equivalent to OS-protected secret storage; safeStorage backend grade also matters. | Wave 10 graded capability/memory fallback; retain compatible readers |
| P08 | High | Workspace has no watcher or explicit dirty external-change resolution. SearchPanel scans loaded nodes, caps scope; Spotlight uses a separate recursive bounded scope. | Waves 4/7 conflict owner, consistent scope, visible limits |
| P09 | High | CodeEditor owns LSP lifecycle; appearance dependencies can recreate it. Workspace-wide versioned diagnostics and provider readiness are not canonical. Several advertised IDE protocol methods are absent. | Wave 6 workspace/language sessions and truthful per-method capabilities |
| P10 | High | Terminal includes canned responses and real stdio processes. It has no PTY, persistent interactive shell or terminal resize. Tasks are static templates. | Wave 8 real Runner first, PTY only with platform evidence |
| P11 | High value UX | Large decorative settings cards, duplicated chrome, crowded status, glow/glass terminology and mixed-language/internal error copy. Remember-device copy is ambiguous: flag goes to backend, local token uses sessionStorage and removes old localStorage records; durable client restore is unverified. | Waves 1 truth metadata, 2/3 hierarchy, 13 settings |
| P12 | High value UX | Tab close is a nested span with tabIndex -1; close-others/right/reopen/middle-close are missing. Keyboard/focus/menus and small-window coverage need interaction assertions. | Waves 3/4/14 |
| P13 | Medium | 182 `!important` and 331 literal rgba occurrences in 65,919-byte global CSS; repeated selectors/late responsive overrides. | Wave 2 scoped tokens; Wave 15 remove only migrated rules |
| P14 | Medium | Full visual run fails editor-scroll@desktop during language loading (119/120). Focused recheck passes; fixture shell screenshot reveals unused width that generic pass metrics miss. | Wave 0 retain evidence; improve fixtures and acceptance in each UI wave |
| P15 | Medium | Process cancellation/tree teardown and canonical-path check/IO race require targeted evidence. Unpackaged production capture logs missing CSP. | Security/runner packets; packaged validation before broad claims |
| P16 | Medium | Git/GitHub UI combines local/remote/auth/projects workflows in large stateful panels; command handlers, IDs, menus and shortcuts have parallel catalogs. | Waves 1/9/10 explicit owners/dispatch and request generations |
| P17 | Medium | Large language chunks and broad dependencies; only Settings is lazy among several heavy panels. Startup/heap claims lack authenticated production measurements. | Wave 14 measured budget; selective imports after ownership migration |
| P18 | Integration | Primary checkout has a user-owned pending merge including tooling fixes. Audit base has no remote check-runs result; #396 failures differ from #418 successes. | Resolve implementation base explicitly at continuation; never rewrite primary state |

## Exact subsystem classes

Use only the requested migration classes. “Preserve + harden” maps to **PRESERVE + CLEANUP**, with hardening tests before each behavior change. The detailed per-subsystem evidence and all twelve audit fields are in [subsystem-audit.md](subsystem-audit.md).

| Subsystem | Class | Reason |
| --- | --- | --- |
| Boot/router; account; release/tier gates | PRESERVE + CLEANUP | Useful shared policy; fail-closed behavior retained |
| Electron navigation/permission/workspace security guards | PRESERVE | Existing protective contracts and tests |
| Shared file repository/save queue/mutation guard | PRESERVE + CLEANUP | Recent repairs protect revision/data identity; add native durability evidence |
| CodeMirror engine | PRESERVE | Real tested editor foundation |
| Editor orchestration and workbench shell | PARTIAL REWRITE | Retain models/adapters; replace combined controllers/composition |
| Title/activity/sidebar/status/bottom UI | PARTIAL REWRITE | Shared shell hierarchy and keyboard/focus framework |
| Docking/focus models and PanelChrome | PRESERVE + CLEANUP | Normalized working model; extend assertions |
| Tab/document facade and workspace/tree controller | REFACTOR | Keep persistence/stable identity, add explicit owners and conflicts |
| Native filesystem service | PRESERVE + CLEANUP | Real path-gated operations; strengthen atomicity/contracts |
| CodeEditor integration | REFACTOR | Separate host/session/providers without replacing CM |
| LSP process/protocol foundation | PRESERVE + CLEANUP | Real transport; harden ownership/capabilities/cancellation |
| Language support, completion/format/actions/navigation | REFACTOR | Distinguish grammar/local/server tiers and share commands |
| Diagnostics/Problems | REFACTOR | Canonical per-URI version/source collection |
| Search/quick open/palette/Spotlight | PARTIAL REWRITE | Keep ranking/models, merge UI and consistent workspace search |
| Terminal UI/session model and tasks | PARTIAL REWRITE | Preserve real runner bridge; replace simulated/general terminal claims |
| Terminal canned-response implementation | REMOVE | No production simulated output; test fixtures only if isolated |
| Local Git service | PRESERVE + CLEANUP | Validated argv and real repository operations |
| Git UI/state | PARTIAL REWRITE | Split local state from remote domains |
| GitHub service/auth/token storage | REFACTOR | Preserve behavior/compatible tokens, split large service and grade storage |
| Debug runtime and current synthetic DebugPanel | FULL INTERNAL REWRITE | No operational runtime to preserve; real DAP reconception |
| Validated declarative extension contributions | PRESERVE + CLEANUP | Existing manifest/action/theme/snippet functionality |
| Extension UI/registry model | PARTIAL REWRITE | Honest built-in/declarative model; no fake marketplace |
| Settings schema/persistence/UI | PARTIAL REWRITE | Keep keys/defaults, replace intertwined UI/state |
| Theme resolution | REFACTOR | Semantic/workbench/syntax/effects ownership |
| Global CSS | PARTIAL REWRITE | Gradual scoped retirement with screenshots |
| Keyboard command routing | REFACTOR | One registry, aliases preserve IDs/shortcuts |
| IPC registration/preload contracts | REFACTOR | Domain registration and strict adapters over security guards |
| Performance instrumentation | PRESERVE + CLEANUP | Existing metrics + reproducible real-world measures |
| Installer/platform tooling | PRESERVE + CLEANUP | Existing packaging, no untested native dependency switch |
| Test harnesses/accessibility coverage | PRESERVE + CLEANUP | Keep useful models/fixtures; add actual interaction/runtime paths |
| Documentation | PARTIAL REWRITE | Replace overstated product claims and stale ledgers |
| Proven unreachable auth/template/UI scaffolds | REMOVE | Candidates only; dynamic/config/consumer proof required in Wave 15 |

## Every direct dependency

All 86 direct runtime dependencies are individually listed with consumer evidence in [dependency-audit.md](evidence/dependency-audit.md); ranges/installed runtime versions and the complete file graph are in [source-inventory.json](evidence/source-inventory.json). Final runtime classes: 29 REQUIRED, one USED BUT REPLACEABLE, 37 LEGACY and 19 UNUSED. These are conservative graph classes plus the explicit motion refinement, not permission to delete. Literal parsing cannot establish dynamic/config use or cross-client packaging requirements.

The decision refinement to the graph's REQUIRED class is `framer-motion`: **USED BUT REPLACEABLE** for small hover/press effects while retaining it for justified shared transitions. `react-hot-toast` and `@hello-pangea/dnd` have no literal consumer and remain UNUSED candidates, rather than assumed replacements. Do not install replacements in Wave 0. Broad Radix template widgets, payments, maps, charts, 3D, forms, download/capture helpers must be traced before Wave 15 removal; package size alone is insufficient.

Every direct development dependency (24):

| Dependency | Class | Evidence / action |
| --- | --- | --- |
| @eslint/js | REQUIRED | ESLint base config |
| @tailwindcss/postcss | REQUIRED | Tailwind 4 PostCSS plugin |
| @types/node | REQUIRED | TS/tooling types; version alignment to actual supported Node is future review |
| @types/react | REQUIRED | React boundary types |
| @types/react-dom | REQUIRED | DOM React boundary types |
| @vitejs/plugin-react | REQUIRED | Vite React build plugin |
| autoprefixer | USED BUT REPLACEABLE | Explicit PostCSS plugin; assess redundancy only with Tailwind/build/platform parity |
| baseline-browser-mapping | TRANSITIVE WORKAROUND | Toolchain browser-data pin/direct cache freshness support, not app capability |
| 7zip-bin | REQUIRED | ensure-electron extraction fallback and Windows packaging tools |
| concurrently | UNUSED | No current app script/literal tool consumer found; root/shared review before deletion |
| cross-env | UNUSED | No current app script/literal tool consumer found; root/shared review before deletion |
| electron | REQUIRED | Native app/runtime and visual/native harness |
| electron-builder | REQUIRED | Installers/packaging |
| eslint | REQUIRED | Lint gate |
| eslint-plugin-react | REQUIRED | React lint config |
| eslint-plugin-react-hooks | REQUIRED | Hook correctness lint |
| eslint-plugin-react-refresh | UNUSED | Not imported/enabled in current ESLint config; verify tooling before removal |
| eslint-plugin-unused-imports | REQUIRED | Import lint rules |
| globals | REQUIRED | Environment globals for lint |
| postcss | REQUIRED | CSS processing |
| tailwindcss | REQUIRED | Current utility/style build |
| typescript | REQUIRED | Build/full JS check/new strict boundary gate |
| vite | REQUIRED | Dev/build/fixture rendering |
| wait-on | UNUSED | Current electron-dev script implements its own readiness loop; verify shared tooling |

All twelve package overrides (`axios`, `picomatch`, `minimatch`, `brace-expansion`, `dompurify`, `got`, `ip-address`, `tar`, `fast-uri`, `js-yaml`, `undici`, `nanoid`) are **TRANSITIVE WORKAROUND** pins. They are not direct IDE features and were not removed. A clean supported-Node lockfile install, dependency tree, advisories and installer verification must precede changes; the present junction environment cannot certify that tree.

## Deletion contract

For each candidate: inspect production and test imports, dynamic imports, Vite aliases, shared-core consumers, package scripts, generated assets and all platforms; remove in a bounded commit; perform clean installation, build, relevant tests and packaged launch. Keep legacy file-format readers and unknown persisted values until an explicit compatibility decision. Do not delete current guard/recovery code because an older plan calls it redundant.
