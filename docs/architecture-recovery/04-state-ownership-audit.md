# State ownership audit

Baseline: `d39cfa2`. Evidence index: [02](02-current-architecture.md#evidence-index). Canonical means the source the active implementation actually reads/writes, not the owner a future architecture should have. Persistence is a representation of state, not automatically a second legitimate domain authority.

## Canonical-state map

| Concept | Domain/canonical owner now | UI / draft / derived state | Durable representation and remote owner | Ownership concern |
| --- | --- | --- | --- | --- |
| Notes | Main/Mobile `useApp.notes` | NotesView selection/popovers; Main draft hook content/ref/dirty/undo/preview; analysis worker results | App IDB segments; Files/backup snapshots; no public remote Notes replication found | Draft can diverge from same-ID store replacement; saved label is not durable acknowledgement [E05,E12] |
| Tasks | `useApp.tasks` per client | Composer fields, drag/focus/filter state; Calendar/Flux/Today projections | App IDB; workspace snapshot; weak link IDs | Dependencies, subtasks and workspace membership span different mutation paths [E05,E15,E16] |
| Reminders | `useApp.reminders` | Per-view fired IDs/toasts/quiet hours; native-service cache; derived overdue groups | IDB; quiet-hour localStorage; OS scheduler is a separate delivery projection | Source schedule and native registration need reconciliation; view lifecycle currently starts that work [E13] |
| Calendar | Main Tasks and Reminders, not a Calendar store | Local selected day, display mode, composer and ICS preview; derived date buckets | Underlying task/reminder storage; no separate calendar event persistence | Preserve this projection; do not add an event store silently [E15] |
| Canvas | Separate client `useCanvas.canvases` | Active board, viewport, selection, node drafts/transforms; Main session history | IDB boards/active ID; snapshots; viewport reset during store merge | Core CanvasModel is not authoritative; Mobile `pm` metadata differs from Main fields [E14] |
| Files in Main/Mobile | Underlying notes/codes/tasks/reminders/canvases | Files item projections, query, selected item, type/scope filters | Original stores + exported files/runtime snapshot | Files is a library/handoff view, not a new canonical file database [E09,E11] |
| Workspace | `useWorkspaces.workspaces` membership arrays and active ID | Scope filters and assignment UI | `nx-workspaces-v1`; Main root/autoSync metadata; Mobile checkpoint | Domain deletion does not centrally reconcile membership; physical root and logical workspace are different concepts [E05,E09] |
| Theme | Client `useTheme`; Code Editor settings/theme resolver | Derived CSS variables, surfaces and shared-settings snapshots | `nx-theme-v5` or Code settings key | `nx-settings-v1` singleton is not the active Main/Mobile owner [E18,E19] |
| Layout | Main/Mobile theme fields plus shell/view-local state; Code workbench layout | Sidebar expansion, view panel state, viewport mode, dock drag | Dashboard local keys; theme preferences; Code dock v3 | No single generic Layout store; preserve platform-specific layouts [E04,E18,E21] |
| Auth | Main App session; Code account session/boot; Code-Mobile App session | Login form/pending/errors; derived effective tier/readiness | sessionStorage sessions, localStorage device/remember hints; server remains identity/access authority | `AuthContext.jsx` in Code clients is unused scaffolding; Mobile Main companion uses context/runtime hints without the same account flow [E02,E03] |
| View availability/access | Core metadata + control result; shell `availableViews` and guard state | Mounted/preloaded IDs, validation cache, current view; last-known Mobile startup views | Some startup preferences; remote catalog/layout/access replies | Availability, code availability and authorization are distinct; cached mounting is not authorization [E03,E04] |
| Terminal | Main/Mobile command stores; desktop Code process sessions in main process | Input/history/output UI; Code-Mobile terminal simulation state | Main macros/history; OS processes are transient; mobile simulation is not a shell | Do not collapse three unrelated concepts into one terminal model [E22,E23] |
| Code/editor | Main/Mobile archive uses `useApp.codes`; standalone Editors use React files and active buffer refs | CodeMirror/Monaco document state, tab dirty flags, LSP documents/diagnostics, open tabs | Code index/content localStorage for local files; native workspace files for filesystem mode | Several projections require explicit revision/save ordering; archive has intentionally different behavior [E08,E17,E21] |
| Cloud/runtime | Runtime instance's connection/performance/control managers | In-flight requests, event queues, release/access caches, shell boot status | Mostly transient client caches; private server owns remote state | `liveSync` is view configuration; no evidence that it owns local domain replication [E28] |

## Important synchronization chains

### Notes: editor draft → domain → storage

Main `useNotesDraftState.ts` queues a content commit for 4,200 ms; `flushPendingCommit` schedules `updateNote` via idle work. Preview has its own 220 ms delay. `saveActiveNow` calls `updateNote`/`saveNote`, clears draft dirty and sets a time label. `appStore.ts:604` then queues IDB persistence with a 3,600 ms debounce and 1,800 ms idle timeout. These are separate schedules, not a guaranteed maximum save time.

The draft-reset effect depends on `active?.id`, not `active.content`. This protects typing from ordinary store churn but makes a same-ID external restore a reconciliation question. Multi-store import/restore can therefore replace canonical text while an old draft remains mounted. Characterize restore while typing, Save followed by tab switch, idle flush after unmount, browser close and quota failure. Do not erase the useful draft separation to solve it. Mobile retains similar inline draft logic rather than using Main's extracted hook. [E12]

### Standalone editors: buffer → files → dirty flags → persistence

Desktop `Editor.jsx` owns `editorCodeRef`, `filesRef`, `activeTabIdRef`, React `files`, `openTabs`, `editorCode` and dirty flags. The editor engine/LSP maintains document versions as another projection. `flushEditorBuffer` commits into files; persistence skips local storage in workspace mode. The short buffer-commit timer captures an ID, and the tab-switch effect flushes the previous buffer. However, the separate workspace/local autosave callbacks at lines 1694 and 1708 resolve `activeTabIdRef.current` when they execute. `flushEditorBuffer` clears the buffer-commit timer, not `autoSaveRef`. A tab switch during the autosave delay can therefore change the autosave target; a write completion also clears dirty state without comparing the saved revision. These are static race risks, not mounted-UI reproductions of lost or misdirected text.

Required invariant: a save request must identify the document/revision whose bytes it intends to write; its completion may clear dirty state only for that revision. Existing editor engine contracts are suitable boundaries. Replacing CodeMirror/Monaco is unnecessary. [E21]

### Cross-domain links and membership

Tasks may reference notes/canvas nodes/dependent tasks; reminders may reference a task; canvas nodes reference several domain types; workspaces retain arrays of IDs. `appStore.delTask` removes only the task, while `workspaceStore` mutates membership separately. Notes planning discovers created IDs by comparing store snapshots and writes Canvas directly. No central referential-integrity transaction is visible. Decide explicitly whether dangling links are retained for recovery, removed, or shown as missing. A migration must not guess. [E05,E12,E14]

### Handoff and restore

Main disk import replaces app/canvas/workspace state; Mobile merge/replace uses its own snapshot normalizer and checkpoint; Main backup restore replaces app/canvas/workspace/workspaceFs/terminal state, then optionally theme. These are multiple **write paths to the same owners**, not necessarily multiple active domain stores. They bypass normal domain commands and can leave drafts/history/links out of sync. The target needs a prepare/validate/apply boundary and a defined reconciliation event. [E09–E11]

The unmounted Main autosync hook must remain described as dormant. No `.persist.hasHydrated`/`onFinishHydration` coordination was found in the client source scan. If autosync is reintroduced, asynchronous IDB hydration and disk snapshot loading need a deliberate precedence rule; the audit does not claim they currently race through an active autosync path.

### Reminder service lifetime

Main `useChecker` is called by RemindersView; Mobile's checker calls native permission/rescheduling services. View hosts can keep previously mounted views hidden. Thus a hidden mounted view can continue effects, while a view not mounted yet cannot start its checker. Reminder correctness should depend on the domain/session lifecycle, not navigation history. Native cached scheduled IDs are process-local, so restart and concurrent reschedule require device tests. Preserve current repeat, snooze, quiet-hour and notification contents until product requirements are agreed. [E13]

## Ownership decisions proposed for migration

1. Keep one canonical per-client domain state while extracting a typed command/query facade. Initially it can wrap the existing Zustand stores.
2. Give each editor document its own draft/revision/save state; separate “committed to domain,” “queued for storage” and “durable.”
3. Give snapshot/handoff one versioned parser and coordinator; preserve client-specific storage adapters and explicit merge policy.
4. Keep remote policy and local domain data separate. Core metadata should not become a second domain database.
5. Keep theme stores authoritative until a documented, tested migration deliberately changes them. The shared settings singleton should not be activated accidentally through a new import.

These are proposed boundaries, not code changes made by this audit.
