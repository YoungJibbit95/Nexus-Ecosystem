# Nexus Release Index

Stand: 2026-06-27

Dieser Index ist die Einstiegsliste fuer Release-Arbeit. Er trennt lokale
Build-Gates, Public-RC-Gates, externe Secrets und sichtbare Evidence.

## Release-Spuren

| Spur | Scope | Primaerer Gate | Status |
| --- | --- | --- | --- |
| Main/Mobile Polish | `Nexus Main`, `Nexus Mobile`, `packages/nexus-core` | `npm run release:main-mobile` | aktiv |
| Full Ecosystem | Main, Mobile, Code, Code Mobile, Wiki, Core | `npm run release:gate` | aktiv, laengerer Lauf |
| Product Page | `nexusproject.dev` | `npm run build:ci` + API integration | aktiv |
| Control/API | `NexusAPI/API/nexus-control-plane`, `API/schemas`, `Nexus Control` | `Control Plane Release Gate` | aktiv |
| Hosted Deploy | VPS autoupdate, API, Control UI, Product Page | `Deploy VPS Autoupdate` | blockiert ohne Secrets |
| Launcher | eigener Installer-/Updater-Meilenstein | folgt nach Release-Polish | geplant |

## Pflichtchecks

- Ecosystem: `npm run verify:ecosystem`
- Main/Mobile: `npm run release:main-mobile`
- Website: `npm run lint`, `npm run build:ci`, `npm run test:api:integration`
- API Node: `npm --prefix "./API/nexus-control-plane" run build:node`
- API Contract: `npm --prefix "./API/nexus-control-plane" run test:contract`
- Release-Daten: `npm --prefix "./API/nexus-control-plane" run verify:release-data`

## Automationen

- Dependabot ist fuer GitHub Actions und Paketmanager in allen drei Repos aktiv.
- Dependency Review blockiert PRs mit neuen Abhaengigkeiten ab `moderate`.
- CODEOWNERS erzwingt Review fuer kritische Produkt-, API-, Workflow- und Security-Bereiche.
- API Deploy startet nach erfolgreichem Control Plane Release Gate und prueft API, Payment Catalog, Control UI und Product Page.

## Bekannte Blocker

- Voller Main/Mobile Runtime-Smoke kann am hosted Control/API Auth Gate mit `HTTP_401` enden, wenn keine gueltige Session vorhanden ist.
- Live-Deploy braucht GitHub Secrets `NEXUS_VPS_HOST`, `NEXUS_VPS_USER`, `NEXUS_VPS_SSH_KEY` und optional `NEXUS_VPS_PORT`.
- Website-Screenshots bleiben offen, bis Canvas/DevTools/Settings/Notes optisch stabil sind.
- Einige Wiki-Eintraege verweisen noch auf geplante Runbooks; diese muessen entweder angelegt oder auf existierende Docs gemappt werden.

## Evidence

Release-Evidence soll pro Version unter `docs/release-evidence/<version>/`
liegen:

- `rc-log.md`: Befehle, Datum, Ergebnis, bekannte Grenzen
- `screenshots/`: Main, Notes, Canvas, Settings, DevTools, Website
- `smoke-notes.md`: manuelle Smokes mit View, Ergebnis, Fehlerbild

Keine Secrets, Tokens, privaten Device-IDs, privaten Pfade oder privaten
Accountdaten in Evidence-Dateien schreiben.

