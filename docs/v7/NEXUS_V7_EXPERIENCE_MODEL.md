# Nexus V7 experience model

2026-10-07. Rules for the bounded Dashboard/Flux/Agenda composition wave, using current Nexus typography, theme tokens, glass surfaces and command owners. This is not a separate design-system rewrite.

## Hierarchy and density

Dashboard answers the immediate question first: Now, then Next, then Needs attention. Now has the strongest type and one obvious action; actual commitments outrank a labelled local suggestion. Quick capture is visible without expanding a menu for common Task/Note/Reminder/Event actions. Recent context and existing custom widgets follow orientation; widget layout preferences remain intact.

Dashboard's compact attention list omits work whose only reason is lack of planned time; Flux keeps that backlog available. A suggestion already visible in Now is not repeated below. A current commitment never suppresses a separate urgent task.

Flux foregrounds reasons and useful destinations. An item's title, why it appears and what can be done come before historical activity. Filters/search are tools for finding work, not a row of competing dashboards. History is secondary. No generic percentage is presented as an authoritative health or intelligence judgment.

Agenda keeps its recent redesign: day navigation and chronology first, deliberate scheduling in its existing editor. Calendar mode, selected day and planning intent remain distinct. A simple Today link must not expose a low-level planning console or reopen an old editor.

Use spacing to separate major regions; use borders for selection, controls or a genuinely distinct surface. Do not wrap each sentence in a card. Dense rows are appropriate for scanning multiple items, but orientation needs breathing room. Titles may wrap; action labels must remain legible.

## Repeated interaction rules

- Use native buttons, inputs, selects and disclosures. Keep accessible names specific to actions and destinations. Use headings and ordered document flow rather than clickable noninteractive containers.
- Primary action opens actual work or its day; secondary action schedules or opens linked context. Capture opens an unsaved form; submit is the existing acknowledged command.
- Retain scoped keyboard behavior. Editable controls keep typing/search events; hidden cached views, composing/repeated/already-handled events and workspace replacement cannot fire view commands.
- Escape dismisses the active form/disclosure before resetting filters. Modal focus stays within the visible modal. Closing returns focus to the visible opener, or an explicit local fallback after cross-view navigation.
- Selection uses both semantic state (`aria-pressed`, current destination) and a visible treatment. Focus has a persistent visible outline, including custom themes; color alone cannot convey state.
- New orchestration controls have 44px target height, with wrapping groups and usable pointer/touch hit areas. No hover-only essential action.

## State language

| State | User sees | Action / data contract |
| --- | --- | --- |
| Loading | A labelled loading message | Do not claim an empty day before sources are ready |
| No work | Honest absence of captured work/commitments | Offer capture or Agenda; do not invent filler |
| No matches | Filters explain the empty result | Clear filters without changing records |
| Current / next | Real title and time, with source kind | Open exact record/day; no automatic reprioritization |
| Needs attention | Concrete reason such as deadline, dependency, missing task or no planned time | Open owning view or explicit planning action |
| Conflict / uncertain | Explain what needs review | Keep explicit confirmation, never silently resolve |
| Saving | Existing command pending state | No success before exact persistence acknowledgement |
| Save/read failure | Visible error and a retry/review path | Preserve source/draft/journal; no false saved or empty state |
| Projection failure | The summary is unavailable; source views and retained widgets remain | Preserve records/layout and recover on readable inputs |
| Missing/stale navigation target | Record/workspace changed | Consume obsolete intent and ask to open current work again |

Internal generation IDs, raw coverage/DST mechanics and storage jargon do not become normal Dashboard/Flux metadata. The owning advanced editor may expose details necessary for a user decision. A local ordering rule is labelled as local; Cerebri is never implied.

## Responsive layout and scroll

Use available content width, including the shell/sidebar footprint. Large desktop may show Now and Next alongside one another; 1280px must retain readable title/actions; narrow content and 200% browser zoom collapse to a single flow. Filter and action groups wrap. `min-width: 0` and wrapping text prevent child content from forcing horizontal scroll.

Dashboard and Flux each have one primary vertical scroll owner. Avoid a permanently tiny attention pane inside multiple nested scrollers. Disclosures and optional widgets remain reachable below the main work area. Existing Agenda editor scroll/focus behavior remains protected by its tests.

## Themes and motion

Reuse existing text, muted text, control, line and surface tokens. Use the actual selected/custom accent for focus/selection, rather than a new fixed semantic palette. Preserve custom panel backgrounds and saved theme persistence. Text contrast must be checked in dark and light/custom appearances.

New orchestration regions need no decorative animation. Existing shell transitions and widget motion retain their owners. Respect OS and product reduced-motion settings; no essential information depends on movement. Controls must not shift their hit targets on hover or press.

## Acceptance

Inspect actual rendered Main views in the existing isolated browser harness style, including normal desktop, 1280px, 1024px, narrow width, true 200% browser zoom, reduced motion and at least one custom/non-default theme. Review screenshots for hierarchy, clipping, scroll ownership, focus, long titles, empty/error/selected state, target density and contrast; source inspection alone is insufficient.

Exercise exact Task/Reminder/Agenda navigation, a repeated request, cached hidden views, deleted IDs, workspace generation replacement, Escape/focus return, capture without placeholder creation, acknowledged save and storage failure. Protect planning/reminder/persistence contracts with the existing smallest relevant suites and repository public gate. Record measured results separately; this document is the acceptance contract, not evidence that unrun checks passed.

## B1: context stays beside the work

Task details show type, title, short source snippet and an exact Open action; the existing link manager is a secondary disclosure. Missing and ambiguous targets stay visible with repair guidance. Notes remain writing-first: a compact collapsed “Verwendet von … offenen Aufgaben” disclosure precedes the editor toolbar. Canvas exposes the same usage in its existing selected-node inspector/project panel; the existing camera owner brings the exact node into view. Backlinks open the exact Task editor. Completed usage is labelled separately.

Files details explain the selected source, Nexus folder/workspace membership, last change (Reminder notification time is labelled as such), context usage and destination-specific Open. A same-ID Note and Code item remain distinct. Files search, scopes, list/grid, drawers and disk exchange keep their existing owners. Unsupported attachment types are not presented as supported material.

Native disclosure/actions wrap long names, use theme tokens and the saved accent, provide 44px targets and visible keyboard focus. Usage lists scroll within the optional context region; writing and the Canvas stage retain their primary space. Exact handoff focuses the Note title or selected Canvas context. Missing/stale intent focuses its visible explanation and does not guess a replacement. OS/product reduced motion applies to Canvas handoff.

B1 acceptance adds actual Tasks/Notes/Canvas/Files renders at desktop, 1280, 1024, narrow and true 200% zoom, saved custom theme, reduced motion, long/many/zero usage and missing/no-context states. Verify hidden/repeated intent, same-ID generation replacement, original-owner draft preservation, immutable backlinks, failed-read recovery and index reuse with hundreds of records. Detailed evidence and limitations belong in the PR and workspace maintenance.
