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
- `Nexus API Layer` (`API/nexus-api`)
- `Schemas Layer` (`API/schemas`)
- `Control Plane Layer` (`API/nexus-control-plane`)
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
