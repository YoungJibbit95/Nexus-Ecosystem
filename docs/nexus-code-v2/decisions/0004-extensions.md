# ADR 0004 — Declarative extensions with honest provenance

Status: Accepted for core V2 scope, 2026-09-30.

## Context

The current catalog's install/update actions mutate local records. It does not download packages or start a VS Code-compatible host. Restricted manifest/contribution validation, themes/snippets/keybindings/allowed command routes already provide value; unknown records are safely retained disabled.

## Decision

Core V2 supports built-in and validated declarative contributions. Expose provenance, actual supported contribution types and disabled/unknown reasons. Preserve stored records/validation while redesigning the marketplace-like UI in Wave 12. Do not promise VS Code compatibility, Prettier/ESLint execution or network package updates without those implementations.

## Consequences and verification

No eval or third-party renderer execution host. An executable extension system requires a separate trust/isolation/update design and product decision. Protect manifest validation, unknown IDs, contribution conflict precedence, commands, settings and legacy records. Remove misleading catalog/install claims, not useful contributions or recovery data.
