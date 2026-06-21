# GitHub Project Integration

Repository: `YoungJibbit95/Nexus-Ecosystem`
Projektboard: `https://github.com/users/YoungJibbit95/projects/2`

## Vorgehen fuer dieses Ecosystem

1. Jedes Architektur-Feature bekommt eine Project-Card.
2. Branch/Commit/PR referenziert die jeweilige Card.
3. Nach Merge wird die Card in den naechsten Status verschoben.

## Aktuelle Architekturpakete

- `Global Assets Layer` (`assets/global`)
- `Nexus Core Layer` (`packages/nexus-core`)
- `Nexus API Client Layer` (`packages/nexus-core`)
- `Hosted Control Plane Layer` (`NEXUS_CONTROL_URL`, private backend)
- `Control UI Layer` (`Nexus Control`)
- `App Integrations` (Main, Mobile, Code, Code Mobile)

## Empfohlene Card-Aufteilung

- Card 1: Runtime Plane Hardening (`@nexus/api`)
- Card 2: Control Plane Auth + RBAC
- Card 3: Config + Policy APIs
- Card 4: Command API + Idempotency
- Card 5: Event Ingest + Metrics Summary
- Card 6: Nexus Control UI Dashboard
- Card 7: Nexus Control UI Settings + Guides
- Card 8: Verify/Build Pipeline Erweiterung
- Card 9: Security Review + Passwortrotation
- Card 10: GitHub Security Governance (Branch Protection, CODEOWNERS, Required Checks)
- Card 11: Control UI Server Deployment + Hosted API Handshake
- Card 12: API v2 Contract Layer (Catalog/Layout/Release/Capabilities)
- Card 13: Shared Core Live-Sync Orchestrator (Main/Mobile + Code/Code-Mobile)
- Card 14: Control UI Live-Sync Builder + Promotion Flow
- Card 15: Contract-Parity-E2E Workflow + Smoke Tests

## Stand 2026-06-21 - Security Canvas Release Batch

Abgearbeitet fuer Main/Mobile:

- Dependency-Security: `npm audit --json` meldet fuer `Nexus Main` und `Nexus Mobile` jeweils `0` Vulnerabilities.
- Build-Gate: `npm --prefix "Nexus Main" run build` und `npm --prefix "Nexus Mobile" run build` laufen erfolgreich vom Repo-Root.
- Canvas UX: UI-Prefs fuer Grid, Minimap, Snap, Layout, Sidebar und Project Panel werden geteilt validiert und sicher persistiert.
- Canvas Responsiveness: Minimap rendert adaptiv nicht mehr auf zu engen Viewports und bleibt auf Mobile aus kleinen Layouts raus.
- Build-Stabilitaet: Vite-Configs nutzen explizit `root: __dirname`, damit Prefix-Builds nicht vom aktuellen Shell-CWD abhaengen.

Naechste Project-Cards:

- Canvas Inspector/Selection v2: Multi-Select, Inspector-Bearbeitung und reduzierte Node-Chrome-Dichte.
- Notes Stabilitaet: Store/Persistence-Splitting, Import-Validation und Editor-Sidebar-Entlastung.
- Bundle Performance: Monaco/Three weiter lazy-loaden und grosse Main-Chunks aufteilen.
