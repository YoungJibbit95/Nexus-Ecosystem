# ADR 0003 — Replace synthetic debug state with DAP sessions

Status: Accepted target decision; runtime not implemented. Date: 2026-09-30.

## Context

DebugPanel generates values/stacks and timer-driven pauses/steps. There is no adapter process or Debug Adapter Protocol transport. Line-only breakpoints lack URI identity. The current runtime has no operational behavior to preserve.

## Decision

Use a main-owned adapter transport and bounded DebugSession domain. Start with one real Node launch workflow, project launch configuration, URI/position breakpoints and adapter-derived stack/scopes/variables. Keep run launch separate from debug launch. Production UI must say unavailable/experimental until this path passes acceptance; fabricated values stay out of production.

## Consequences and verification

Wave 11 is a full internal runtime rewrite, not another UI timer layer. Resolve adapter provenance/licensing/distribution and launch environment before packaging. Tests must hit a real breakpoint, inspect adapter data, step, resume, stop and clean process trees, including failures. Python/other adapters and attach are later scope; no general debugger claim from the first Node path.
