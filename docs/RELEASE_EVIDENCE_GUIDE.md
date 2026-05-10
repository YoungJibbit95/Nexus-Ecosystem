# Nexus v6 Release Evidence Guide

Stand: 2026-05-10

Dieses Dokument beschreibt, wie Screenshots, kurze Videos und visuelle Checks fuer einen Nexus RC gesammelt werden. Ziel ist nicht Deko, sondern beweisbare Bedienbarkeit.

## Ablage

```text
docs/release-evidence/<version>/
  main/
  mobile/
  code/
  code-mobile/
  control/
  website/
  wiki/
  rc-log.md
```

Dateinamen folgen:

```text
<surface>-<view>-<state>.<png|jpg|webp|mp4>
```

Beispiele:

- `main-dashboard-ready.png`
- `main-notes-split-preview.png`
- `mobile-canvas-zoom.mp4`
- `code-editor-problems.png`
- `control-live-sync-production.png`
- `website-downloads-section.png`
- `wiki-release-checklist.png`

## Pflichtbelege pro Surface

| Surface | Pflichtbilder | Optionales Kurzvideo |
| --- | --- | --- |
| Nexus Main | Dashboard, Notes, Tasks, Reminders, Canvas, Flux, Settings, Info | Canvas move/zoom/undo oder Notes Magic Insert |
| Nexus Mobile | Home/Dashboard, Notes, Tasks, Canvas, Account/Login, Settings | Bottom Nav plus create/edit flow |
| Nexus Code | Editor, Explorer, Problems/Terminal, Settings | Run/terminal loop |
| Nexus Code Mobile | Editor, Files/Native bridge, Settings | Mobile edit/save path |
| Nexus Control | Live Sync, Paywalls, Policies, Devices/Audit, Guides | Promote staging to production in Staging/Test |
| Website | Hero, screenshots, downloads, account/pricing, docs/login | Download CTA flow |
| Wiki | Search, language switch, release entries, view matrix | Mobile browser search/filter |

## Visuelle Quality Bar

- Hauptinhalt bekommt den meisten Platz; Toolbars duerfen nicht die Arbeitsflaeche fressen.
- Bewegte UI darf aktive Klickziele waehrend Hover/Press/Drag nicht verschieben.
- Empty States, Fehlerzustaende und Offline/API-Fallbacks muessen ruhig und verstaendlich aussehen.
- Light Themes muessen dunkle Schrift, helle Surfaces und passende Taskbar/Chrome-Kontraste zeigen.
- DevTools, Diagnostics, Control und Admin-Optionen muessen fuer normale Nutzer gegated sein.
- Screenshots duerfen keine Secrets, Tokens, Passwoerter, privaten Kundendaten oder internen Host-Werte zeigen.

## RC-Log Vorlage

```markdown
# Nexus v6 RC Evidence Log

Version:
Build:
Datum:
Operator:

## Gates

- [ ] npm run release:gate -- --fast
- [ ] npm run release:gate
- [ ] npm run release:gate -- --with-api-contract
- [ ] npm --prefix "Nexus Wiki" run build:ci
- [ ] Website build:ci

## Surfaces

- [ ] Nexus Main
- [ ] Nexus Mobile
- [ ] Nexus Code
- [ ] Nexus Code Mobile
- [ ] Nexus Control
- [ ] Website
- [ ] Wiki

## Known Issues

| Issue | Link | Accepted? | Owner |
| --- | --- | --- | --- |
```

## Verweise

- `docs/VIEW_SMOKE_MATRIX.md`
- `docs/KNOWN_ISSUES.md`
- `docs/RELEASE_READY_CHECKLIST.md`
- `docs/NEXUS_COMPLETION_PLAN.md`
