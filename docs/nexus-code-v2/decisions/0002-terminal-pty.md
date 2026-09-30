# ADR 0002 — Real runner first; PTY is a separate platform contract

Status: Accepted staging decision; PTY implementation choice pending platform feasibility. Date: 2026-09-30.

## Context

Current native commands use child_process stdio and real output/input/exit. They are one-shot runners with ANSI stripping; no PTY, interactive shell persistence or resize exists. Browser responses are canned. Windows quoted absolute paths fail the new characterization. Native dependencies are currently not rebuilt by packaging.

## Decision

Preserve the real runner and its manual command/cwd/environment protections. Remove production canned success during Wave 8. Call the surface Runner until it satisfies terminal semantics. Define a distinct PTY session port with start/write/resize/exit/terminate/events; evaluate node-pty plus a terminal renderer against ConPTY/macOS/Linux and Electron ABI/installer requirements before selecting dependencies.

## Consequences and verification

Do not insert node-pty into Wave 1 or weaken manual command restrictions. Agent-generated commands receive a separate future policy. Wave 8 must fix real quoting behavior, validate output flood/cancel/process trees/cwd, and either accept the PTY platform matrix or document the limited Runner. PTY support requires shell continuity, resize/control sequences and packaged launch; none is claimed now.
