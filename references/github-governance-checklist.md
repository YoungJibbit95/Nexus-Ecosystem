# GitHub Governance Checklist

## Public Repo Exposure

- Keine Secrets, Tokens, Keys oder produktiven Zugangsdaten committed
- Keine internen Admin-Notfallpfade oder privaten Betriebs-Runbooks im Public Repo
- Keine versehentlich eingecheckten `.nexus-private/` Inhalte oder private Overlay-Referenzen

## Repo Hygiene

- `.github/CODEOWNERS` deckt Security-, Workflow-, Tooling- und Runtime-Pfade ab
- `.github/SECURITY.md` verweist auf GitHub Security Advisories statt oeffentliche Issues
- `.github/pull_request_template.md` fordert Security-Selbstcheck und lokale Verifikation
- `.github/dependabot.yml` bleibt aktiv fuer Actions und relevante npm-Projekte

## CI / Workflow Safety

- Keine Abschwaechung von Required Checks oder Security-Workflows im Diff
- Keine erweiterten `permissions` ohne begruendeten Bedarf
- Keine neuen Secrets in Workflow-YAML, Shell-Skripten oder Action-Inputs
- Build-/Deploy-Jobs verwenden nur die minimal benoetigten Schreibrechte

## External GitHub Checks

Manuell in GitHub Settings pruefen:

- Branch Protection / Ruleset fuer `main`
- Required Checks fuer Security Verify, Contract Parity E2E und CodeQL
- Require Pull Request Reviews und Schutz vor Direkt-Pushes
- CODEOWNERS-Review-Erzwingung fuer sensible Pfade
