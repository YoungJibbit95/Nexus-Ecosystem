# Security Policy

## Supported Branches

| Branch | Status |
|---|---|
| `main` | Supported |
| Feature branches | Best effort (no guarantee) |

## Report A Vulnerability

Bitte melde Sicherheitsluecken **nicht** in einem oeffentlichen Issue.

Empfohlener Weg:

1. Im Repository auf `Security` gehen.
2. `Report a vulnerability` nutzen (GitHub Security Advisory).
3. Reproduktion, Impact und betroffene Pfade angeben.

Alternativ kannst du den Maintainer direkt kontaktieren:

- GitHub: [@YoungJibbit95](https://github.com/YoungJibbit95)

## Response Policy

- Erste Rueckmeldung: in der Regel innerhalb von 72 Stunden.
- Kritische Luecken werden priorisiert und schnell gepatcht.
- Nach Fix wird ein Advisory/Changelog-Eintrag nachgezogen.

## Governance

- Security-kritische Pfade sind per `CODEOWNERS` auf `@YoungJibbit95` gelegt.
- Branch Protection auf `main` muss aktiv bleiben (PR + Required Checks + Reviews).
- Security-/Server-seitige Aenderungen duerfen nur ueber Review und Merge durch den Owner passieren.
