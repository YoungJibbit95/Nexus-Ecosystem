# ADR 0005 — Bounded state owners over shared persistence

Status: Accepted target architecture, 2026-09-30.

## Context

Editor holds UI/domain/platform concerns; CodeEditor owns provider lifecycles; diagnostics/settings/tabs have overlapping state. Shared revision-bound persistence has recent data-protection repairs. A giant global store or new queue would merely relocate coupling.

## Decision

Use workspace, document, workbench, runner, local SCM, remote GitHub, debug, language/diagnostics and settings owners. The document facade wraps the existing shared repository/save queue/mutation guard. Tabs reference documents; CM sessions own selection/undo; domain revisions/generations govern async results. Account/release policy stays in app boot. Start with focused hooks/controllers, adopting subscription stores only for justified independent lifecycles.

## Consequences and verification

No second file writer or mirror store. Extract one command controller in Wave 1, then documents/workspace/providers in later waves. Protect rapid tab switching, late save/diagnostic/request events, root replacement and failure recovery. Keep IDs/persisted readers through adapters until all consumers migrate. Canonical owner table: [architecture](../03-target-architecture.md).
