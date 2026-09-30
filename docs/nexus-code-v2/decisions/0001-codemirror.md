# ADR 0001 — Retain CodeMirror 6

Status: Accepted for the V2 migration plan, 2026-09-30. Implementation change: none in Wave 0.

## Context

CodeMirror provides actual editing, language grammars, find/undo, decorations and large-file policies. CodeEditor is overburdened, but no concrete requirement was found that warrants replacing the engine. A switch would threaten document/undo/provider behavior without resolving state ownership.

## Decision

Keep CM6 and its current React adapter initially. Extract a CodeMirrorHost, per-document session and separate provider/diagnostic bridges. Existing document/save authority remains shared. Consider another engine only after a documented requirement, feasibility spike and measurable comparison prove CM cannot reasonably meet it.

## Consequences and verification

No mechanical engine rewrite or grammar deletion. Protect exact text, selection, undo, switching, late saves, large-file mode and language loading before extraction. Measure engine/view lifecycle separately from provider lifecycle. Waves 5/6 own integration changes; [architecture](../03-target-architecture.md) defines owners.
