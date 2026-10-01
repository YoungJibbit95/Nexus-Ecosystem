# ADR 0002 — Real runner first; PTY is a separate platform contract

Status: Accepted staging decision; PTY implementation choice pending platform feasibility. Date: 2026-09-30.

## Context

Current native commands use child_process stdio and real output/input/exit. They are one-shot runners with ANSI stripping; no PTY, interactive shell persistence or resize exists. Browser responses are canned. The historical Windows quoted absolute-path failure was subsequently fixed in main `0cb408b`, verified 10/10 with the original harness. Native dependencies are currently not rebuilt by packaging.

## Decision

Preserve the real runner and its manual command/cwd/environment protections. Remove production canned success during Wave 8. Call the surface Runner until it satisfies terminal semantics. Define a distinct PTY session port with start/write/resize/exit/terminate/events; evaluate node-pty plus a terminal renderer against ConPTY/macOS/Linux and Electron ABI/installer requirements before selecting dependencies.

## Consequences and verification

Do not insert node-pty into Wave 1 or weaken manual command restrictions. Agent-generated commands receive a separate future policy. Wave 8 retains the already fixed quoting regression, validates output flood/cancel/process trees/cwd, and either accepts the PTY platform matrix or documents the limited Runner. PTY support requires shell continuity, resize/control sequences and packaged launch; none is claimed now.
