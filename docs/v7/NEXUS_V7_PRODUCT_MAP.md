# Nexus V7 product map

Source audit: 2026-10-07. Product base: qualified Security commit 19daae5, following dd0dab0.

## Evidence inspected

`docs/CORE_VIEW_RUNTIME_V2.md`, `docs/MAIN_VIEW_REGISTRY_V2.md`, `docs/Nexus_UX_Completion_Plan.md`, `docs/SECURITY_MODEL.md`, every current `docs/v7/*.md`, and `docs/NEXUS_CODE_IDE_RECODE_PLAN.md`.

Actual source: Main App/shell/view host/registry/command scope; Dashboard and its top sections, derived data, layout and widgets; Flux; Tasks/modal/date helper; Calendar and MainAgendaWorkspace; Reminders/service; Notes/draft/editor; Canvas/store/entity navigation; Files/workspace sync; SettingsShell/modules/theme storage. Shared planning domain/today/commands/navigation, capture owner, durable persistence, workspace operation and recovery contracts. Mobile Dashboard/Flux/Agenda and shared client boundaries. Existing unit runner and task/planning/capture/persistence browser harnesses.

Historical Code plan's main/push advice is obsolete for this task. The current user contract excludes Code and remote publication. The short runtime/registry docs also describe adoption as future work although current source already has cached command scope and shared capture routing.

## Current product map

Each entry records purpose; authority/read model; commands/persistence; relationships/navigation; workflow/visual priority; Mobile parity; technical, UX and visual debt.

### Shell/navigation

- Purpose: where am I, where can I go, which view owns input?
- Authority: `mainViewRegistry`, shared manifests, guarded App navigation; local mounted-view cache and view-local UI state. Theme store controls appearance.
- Read model: available views, shell panels, command enabled state, loading/error boundaries. Commands: guarded view changes, shell capture, view-owned shortcuts. View cache survives switching; ordinary ephemeral shell state does not constitute exported user data.
- Relationships: all views; lazy loaders and command scope already protect expensive/hidden views. MainViewHost owns shared capture; App retains authorization decisions.
- UX/visual: navigation and active destination should orient before view tools. Mobile uses its own shell and touch navigation against shared manifests.
- Debt: two-level shell/view toolbars can repeat information; generic string navigation discards entity/day intent. App combines boot/theme/shell with sensitive account code; do not refactor it in this wave.

### Dashboard

- Purpose: what should I do now? Current UI mixes greeting, Today counts, quick capture, another planning card and custom widgets. A scored resume lane is still computed, but `DashboardContinueSection` currently returns null and displays none of it.
- Authority: app tasks/reminders/notes/activity, planning document, canvas, workspace, theme; layout preferences only are Dashboard-owned. Derived counts and local relevance scores are not domain data.
- Commands: shared acknowledged capture for Note/Task/Reminder; legacy Code/Canvas creation; direct bulk reminder snooze; layout editing. Existing stores/journals persist source records; `nx-dashboard-layout-v3` persists widget layout.
- Relationships/navigation: view-only links often lose the task/note/reminder identity. Planning card opens Calendar but does not force today's Agenda.
- UX/visual: current strongest hierarchy is greeting plus competing Today summaries. Preserve user layouts but prioritize one present commitment and a short next/attention list.
- Mobile: independently composed Dashboard over the same domain concepts; its widget preference format differs. No shared storage change needed.
- Debt: duplicated urgency logic treats civil dates as UTC instants; repeated planning subscriptions; stale memoized greeting/day; unused resume computation, dense metadata, duplicate Today content; bulk snooze bypasses occurrence owner.

### Tasks

- Purpose: what work exists, what is its status and context?
- Authority: `appStore.tasks`; planning owns blocks/durations, not a second task collection. Read model: board/list/work-mode filters, blocked dependencies, progress and links.
- Commands: legacy task/store editing, bulk actions, subtasks, context links; scheduling hands off to acknowledged PlanningCommands. Task date editing preserves original temporal kind/precision. Store save queues and complete runtime export persist records/metadata.
- Relationships: Agenda scheduling, linked Notes/Canvas, attached reminders. Modal and cached shortcut ownership are already tested.
- UX/visual: tasks and status lanes are primary; metadata/context belong in a selected task. Mobile has a separate touch task surface with shared records.
- Debt: large mixed view/modal; direct legacy edits coexist with acknowledged planning commands; no typed external task selection; contextual shortcuts/creation still have older behavior. Preserve these existing editors, add only navigation consumption.

### Flux

- Purpose: what deserves attention? Current implementation combines heuristic health score, bottlenecks, attention queue, capture and activity stream plus another Today card.
- Authority: app tasks/reminders/activity; UI filters in localStorage. Queue scores are derived and not Cerebri.
- Commands: immediate placeholder capture, direct Task start, Reminder done without awaiting/displaying its result; activity/context navigation. Source stores persist data, filters are preferences.
- Relationships: Tasks/Reminders should open exact entries; Planning should schedule the selected Task; context links should retain identity.
- UX/visual: current narrow queue competes with a wide history stream; percentage health is more visually prominent than reasons/actions. Mobile duplicates most of the algorithm independently.
- Debt: civil deadline bug, missing dependency handling in blocked count, no planning backlog truth, swallowed command outcome, unconditional hidden-view timer, tiny technical labels and hard-coded color layers. Filter/search functionality is useful and should remain.

### Calendar

- Purpose: when does something happen? Authority: Tasks/deadlines, Reminder instants, shared planning events/blocks. Read model: selected-day/week/month and filtered date items; no second event database.
- Commands: selection/view modes, acknowledged composer/scheduling, import and handoff to Agenda. Calendar selection/filter state is ephemeral; domain records persist through their owners.
- Relationships: Tasks/Reminders and Agenda share dates with different meaning. Current view-only Calendar links can preserve an unrelated selected date/mode.
- UX/visual: temporal position first; schedule editing intentional. Mobile uses Calendar plus a distinct Agenda view over the same planning contracts.
- Debt: broad app subscription and legacy task/reminder date projection alongside newer planning UI; captured initial today; large component and duplicate import/composer surfaces. Only day/Agenda intent handoff belongs to this wave.

### Agenda/Planning

- Purpose: what does the selected day look like; deliberately place/change work.
- Authority: shared PlanningDocument + canonical tasks/reminders; `selectPlanningToday` derives tasks, active/inactive blocks, events, reminder points, issues and coverage.
- Commands: capture/schedule/move/complete/import/link repair through PlanningCommand with generation/revision/task identity and exact persistence acknowledgements. Journal rollback/recovery preserves failed writes. View selection/editor draft are ephemeral.
- Relationships: Calendar day, Tasks, Notes/Canvas links, advisory Cerebri preview. Recent redesign already separates day overview from explicit planning editor and advanced settings.
- UX/visual: chronological schedule then task list; conflicts and unknown availability require deliberate confirmation. Mobile has its own planning surface.
- Debt: task-open callback currently loses the ID; cached planning request can reopen an old editor; no simple read-only today intent; some advanced labels still need later polish. Preserve the redesign and its command boundary.

### Reminders

- Purpose: what must not be forgotten? Authority: app reminder sources plus shared occurrence lifecycle/controller, not Dashboard/Flux state.
- Read model: upcoming/due/snoozed/done, repeat occurrences, delivery/permission health and quiet hours. Commands: reminder owner complete/snooze/stop; legacy form source edits; capture owner for global new reminder.
- Persistence: reminder sources, occurrence records and durable queues; Main/Mobile handoff retains lifecycle semantics. Native notification show acknowledgement is not proof of delivery.
- Relationships: attached Tasks/Notes, Calendar/Agenda instant points, Flux triage. Main form preserves exact instants and handles gaps/folds explicitly.
- UX/visual: title/delivery time and next explicit action; diagnostics progressively disclosed. Mobile has touch forms and native delivery differences.
- Debt: large view, browser preference writes can throw, broad subscription; no targeted incoming reminder selection; Dashboard bulk snooze bypass and Flux result loss are outside this owner and should be removed at the entrypoints.

### Notes

- Purpose: durable written context. Authority: app note records and registered draft/save queue; knowledge graph is derived.
- Commands: edit/save/import/export, formatting, links, acknowledged promotion through planning store. Note source and tabs survive restart/runtime transfer; UI state is separate. Workspace replacement flushes drafts and invalidates stale sessions.
- Relationships: typed note navigation, task entity links, reminder context, Files. Mobile uses the same conceptual source with separate editor composition.
- UX/visual: title/content/save state first; analysis and insert menus secondary.
- Debt: very large editor includes knowledge tools, legacy magic blocks and task/reminder integration; mixed labels/menus and some direct source mutations. No redesign this wave; use existing typed context navigation.

### Canvas

- Purpose: spatial context. Authority: canvasStore projects/nodes/connections; view camera/selection and history are distinct. Compatibility projection preserves unknown metadata.
- Commands: graph edits/layout/history/import/export, explicit task promotion and typed node navigation. Source persists and travels in runtime handoff; draft invalidation avoids stale writes.
- Relationships: task entity links, Notes/Files/project context. Mobile adapts gestures and sheets independently.
- UX/visual: canvas stage primary, selected node inspector secondary; viewport control must stay reachable.
- Debt: project/task-like node statuses can imply competing task authority; legacy bare node IDs can be ambiguous, already explicitly repairable. Node chrome and inspector density warrant a later bounded context wave.

### Files

- Purpose: currently a library/project-membership index plus disk snapshot interchange; it is not yet a general external-material repository.
- Authority: app/Canvas entities, workspace membership and workspaceFs folder/sync state. Derived combined file list; active workspace filter is explicitly separate from disk folder.
- Commands: workspace create/edit/assign, open sources, acknowledged import/export/recovery. Complete runtime snapshot preserves metadata; loose files are explicitly loss-aware.
- Relationships: every content owner; selected file leads back to source. Mobile emphasizes handoff/checkpoints rather than desktop filesystem access.
- UX/visual: scope and selected item before storage mechanics; drawers on narrow widths.
- Debt: generic open paths for Task/Reminder, broad subscriptions, mixed library/snapshot/external-file terminology. Clarify external material model in a later wave; never fake file ownership now.

### Settings

- Purpose: configure appearance, access/interaction, layout, editor and workspace data operations.
- Authority: persisted themeStore/saved themes, terminal preferences and existing workspace backup owners; export/import adapts known settings with protected fields.
- Commands: apply/save/import/export themes, scoped reset and explicit workspace backup/recovery. Saved custom themes and selected theme persist.
- Relationships: shell + all view tokens; workspace data operations remain journaled. Mobile composes its own settings UI.
- UX/visual: seven named modules; appearance/accessibility primary, advanced/experimental behind opt-in.
- Debt: long module panels, low-level render knobs and maintenance concepts remain mixed in secondary areas. Current saved-theme fixes must remain. No Settings redesign this wave.

## Prioritized waves

Ratings: H/M/L indicate relative impact/risk, not measurements. Risk is implementation difficulty; high debt does not authorize rewriting an unrelated subsystem.

| Wave | Product | Architecture debt | UX friction | Visual debt | Persistence risk | Performance risk | Implementation risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A: Dashboard/Flux/Agenda orientation + exact handoff | H | H | H | H | M | M | M |
| B: Context and material workflows (Notes/Canvas/Files) | H | H | H | M | H | H | H |
| C: Explicit planning advice + Mobile orientation parity | H | M | M | M | M | M | H |
| D: Settings and shell interaction consolidation | M | M | M | M | M | M | M |

Only A is authorized for implementation now. C does not authorize activating Cerebri production runtime. No broad design-system, dependency, auth or Code migration work.

## Wave A acceptance design

- Pure Main read model: canonical tasks/reminders/planning, existing temporal functions, explicit current instant/zone; no persisted Dashboard/Flux domain, AI label or invented free time.
- Now: current scheduled commitment(s); if none, a clearly labelled local suggestion from actionable work. Blocked work appears in attention, never as a confident next action. Unknown/missing source data remains visible.
- Next: chronological upcoming commitments; attention shows explanation and exact destination. Preserve task/deadline/work-block separation, snoozed reminder effective time and completed/inactive exclusions.
- Typed Main task/reminder/day intent with active-view consumption; generation check rejects intent after workspace replacement. Existing shared planning/entity navigation still owns scheduling/context. No DOM-selector routing or custom browser event bus.
- Dashboard: one orientation surface above existing user widgets; shared Note/Task/Reminder capture, no bulk direct snooze. Flux: reasons/filter/search/actions before optional history, no duplicate Today panel or percentage hero.
- Plain native controls with visible focus, wrapping titles, 44px touch targets, one scroll owner, no new decorative motion; custom theme accent/text/surface tokens.
- Loading, empty, unavailable/deleted target, read/storage failure, conflict, Escape and focus return are actual user-visible states.
- Tests: projection civil/timed deadlines, snoozes, dependency/orphan/history, deterministic ordering/immutability; actual cached view intent/capture interactions and persistence failure; desktop/1280/narrow/200%-zoom/custom-theme/reduced-motion screenshots.
- Final gates run only after Security handoff; no security/public gate weakening. Baseline failures stay separate.
