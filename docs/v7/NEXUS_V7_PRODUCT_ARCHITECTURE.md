# Nexus V7 product architecture

2026-10-07. Continuation of the current Runtime V2, acknowledged planning, reminder lifecycle, workspace handoff and Main View Registry. Bounded reconciliation against qualified main `5532beb` (#440/#441), reusing the previously qualified local orchestration work; final PR base updated to qualified `bcb7f52` (#444, Code-only changes). The product map is the before-change audit; the boundaries here describe the delivered orchestration model.

## Product loop and ownership

| Surface | User question | Authority | Intended boundary |
| --- | --- | --- | --- |
| Tasks | What needs doing? | Canonical app task records | Work, status, dependencies and context; deadline is not scheduled time |
| Flux | What deserves attention? | Derived task/reminder/planning facts | Explain attention and hand off; never own a second task queue |
| Cerebri | When could this piece of work fit? | Advisory preview only | No direct store writes, no claim of whole-day optimization |
| Calendar | When will it happen? | Planning events/blocks; source deadlines/reminders | Temporal navigation; distinguish commitment, deadline and notification |
| Agenda | What does this selected day look like? | Shared day projection | Chronological composition; open planning deliberately |
| Dashboard | What should I do now? | Derived product projection | Current work, next commitments, attention and capture |
| Reminders | What must not be forgotten? | Reminder sources and occurrence owner | Explicit completion/snooze/stop and delivery state |
| Notes / Canvas | What context do I need? | Note and Canvas stores/drafts | Durable context and typed links; explicit promotion to a Task |
| Files | Where is my material? | Existing library/membership/snapshot owners | Current library and disk exchange; external-material ownership remains a future gap |
| Settings | How should Nexus work for me? | Theme/preferences and backup owners | Product configuration; maintenance and advanced controls remain secondary |
| Main shell | Where am I and where can I go? | Registry, manifests, guarded App navigation | Availability, lazy loading, cached input ownership; no parallel routing/auth system |

The complete current-state map and debt evidence belong in `NEXUS_V7_PRODUCT_MAP.md`. Source wins over historical plans. Code V2, Launcher, production API/security and Cerebri runtime activation are separate work.

## Read models

Dashboard and Flux share a pure Main projection over canonical Tasks, Reminders and PlanningDocument. It receives an explicit instant and IANA zone and returns IDs, labels, reasons and schedule facts; it never creates records, persists scores or updates sources.

- Dashboard Now shows current planned commitments. With no current commitment, it may offer an explicitly labelled local next step. Blocked or unresolved work is not presented as immediately actionable. Concurrent commitments remain visible for review.
- Next is chronological existing planning, with no invented claim that unrecorded time is free.
- Attention includes overdue/due work, explicit high priority, blockers/dependencies, unresolved records and work without an active future block. A `todo` status alone does not determine planning backlog.
- Completed Tasks, done reminders and inactive work blocks are excluded from active work. Historic blocks remain persisted history.
- Civil deadlines use existing planning temporal primitives, including known-zone day boundaries. Unknown zone/invalid values remain uncertainty. A date-only deadline must never become midnight UTC.
- Reminder display uses the effective instant `snoozeUntil || datetime`; recurrence and occurrence transitions remain with the reminder owner.
- One Task appears once in an attention collection even when both due and scheduled. Multiple reasons may explain that same record. Ordering is deterministic; no AI/health percentage is inferred from generic scoring.

Task/reminder array and planning-document subscriptions are selective. Projection work is memoized on those references and the clock. Only an active view owns refresh timers; activation/focus/visibility refresh time-sensitive facts. Relevant source changes still update cached views, preserving existing caching. Notes/Canvas data is read only for context that is actually needed. Loading and source/storage errors cannot masquerade as an empty workload.

## Commands and persistence

Navigation and capture opening do not imply a successful save. New Task/Event capture and schedule changes use existing PlanningCommands with generation/revision/task-content preconditions. Note/Reminder capture uses the existing application command owner. Completion/snooze/stop belong to the existing reminder occurrence owner. A view must show the acknowledged result or failure; it must not optimistically claim success.

Task records remain in appStore; PlanningDocument owns blocks/events/durations; reminder sources and lifecycle remain separate; Note/Canvas sources retain their registered draft/save queues. Workspace before/after journals, startup recovery, exact acknowledgements, compatible unknown metadata, loss-aware export and Main/Mobile handoff are unchanged. Dashboard widget layout and Flux filters are presentation preferences, not new domains.

Legacy Task/Reminder editors still contain direct store edits. That is recorded debt, not an acknowledgement guarantee introduced by this wave. Wave A removes bypasses from its orchestration entrypoints and delegates editing to existing owners; it does not rewrite every editor or persistence adapter.

## Navigation and composition

Cross-view navigation carries explicit intent: Task ID, Reminder ID, or Agenda civil day. Main targets consume only while active and outside workspace replacement. They validate current membership and workspace generation, consume once and show a missing/stale-target message rather than opening another record. Ordinary string view changes continue through the guarded App callback.

Scheduling uses the existing planning navigation contract with the selected Task. Read-only Agenda handoff selects the requested day without replaying an old editor request. Note/Canvas context uses the existing typed entity reference contract, retaining ambiguity/missing-link repair. No DOM selectors or browser events encode new routing.

Dashboard prioritizes orientation above retained user widgets. Flux prioritizes explained attention above optional history. Agenda retains its existing day workspace and deliberate editor. UI hierarchy, states and responsive rules are specified in `NEXUS_V7_EXPERIENCE_MODEL.md`.

## Main, Mobile and boundaries

This is a Main composition wave. No shared public schema or persisted record format changed; Mobile keeps the same underlying task/deadline/block/reminder semantics. Desktop layout is not copied to touch screens. Mobile orientation parity is a later bounded wave.

Cerebri remains advisory: preview freshness, explicit acceptance and the no-direct-store-write rule remain authoritative. Any accepted suggestion still enters an explicit Nexus command. No new production runtime or fake intelligence is introduced.

Current and incoming Security architecture wins. Product work must not add credentials/env secrets, modify auth/session/account/Device/grant/signing contracts, expand IPC/execution authority, loosen CSP/origins/HTML handling or weaken public/secret gates. Unexpected security work is stopped and handed to the Security task; safe product work may continue.

## Ordered waves

H/M/L are relative judgments based on the source audit, not numerical measurements. Each wave has a separate implementation and qualification boundary.

| Order | Scope | Product impact | Architecture / UX / visual debt | Data / performance risk | Implementation risk |
| --- | --- | --- | --- | --- | --- |
| A | Dashboard + Flux + exact Task/Reminder/Today handoff | H | H / H / H | M / M | M |
| B | Notes/Canvas context and Files/material workflows | H | H / H / M | H / H | H |
| C | Honest planning advice and Mobile orientation parity | H | M / M / M | M / M | H |
| D | Settings and shell interaction consolidation | M | M / M / M | M / M | M |

Wave A landed in #445. The 2026-10-08 B1 packet continues from qualified main `55b2883` and authorizes only Context & Material Handoff, one PR and its qualification. Do not merge, enable auto-merge, deploy, release or start another wave.

## B1: context and material handoff

Tasks alone own `entityLinks` and compatible `linkedNoteId` / `linkedCanvasNodeId`. The pure shared `contextRelations` projection indexes Note IDs and `(canvasId, nodeId)` pairs, preserves missing/ambiguous references, deduplicates usage and derives backlinks without persistence. Bare legacy node IDs resolve only when unique; duplicate source identities cannot manufacture usable targets. Completed Tasks retain links but are excluded from the explicitly labelled open-task usage count. Read failure is unavailable context, never zero usage.

Main shares one memoized index for canonical Task/Note/Canvas array references. Local Note draft keystrokes, selection and unrelated store changes reuse it; content summaries are read once per referenced identity. Notes keep their draft/save owner, Canvas keeps its content/camera/selection owners, and the existing `TaskContextLinks` PlanningCommand surface remains the link mutation owner. The new summary/backlink UI performs navigation only.

Existing entity navigation now stamps the draft registry workspace generation, waits for active command scope, pauses during replacement, rejects stale intent and consumes once. Targets revalidate exact membership and focus the destination or a visible failure. Whole-Canvas library navigation is a transient destination, not a new persisted EntityRef kind. Files reuses existing exact Task/Reminder navigation; Code retains its owner after membership validation. Library selection includes both type and ID.

Files remains the existing Note/Code/Task/Reminder/Canvas library with Nexus folder/workspace membership and disk exchange. Selected details expose derived usage and an explicit destination. No external attachment, binary/cloud store, graph persistence or new relationship schema is introduced. Main/Mobile shared navigation compatibility is qualified; Mobile only gains stale/failure feedback, not desktop context layout. Wave A attention/ranking/Now/Next/capture architecture remains unchanged.

## Bounded reconciliation and acceptance

Current main independently ranks Dashboard resume/urgency and Flux severity/backlog, with Planning Today repeated in both. The target shares attention decisions while retaining genuinely view-specific presentation: widget counters/recent lists stay with Dashboard; detailed filtering/history stay with Flux. Inert legacy top-section components are outside the active orchestration path.

Projection failure is distinct from an empty day: the orchestration region shows an error, preserves source records and recovers when inputs become readable again. Dashboard widgets and layout controls remain usable. Planning-unavailable state disables orchestration commands rather than implying a writable schedule. This selector is Main-specific composition; temporal and command contracts remain shared core.

Acceptance covers the pure reasons, exact and stale-target navigation, acknowledged capture/failure/reload, preserved widget customization and themes, hidden-view ownership, actual rendered Dashboard/Flux/Agenda at desktop/1280/1024/narrow/200%, reduced motion and production render retention. Attention initially mounts 50 rows with explicit expansion; recent history displays the latest 50 matches without deleting persisted history. Detailed run evidence belongs in workspace maintenance and the PR, not this product contract.
