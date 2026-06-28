# Nexus Release Evidence

Release-Evidence liegt pro Version oder RC in einem eigenen Unterordner.

Erzeugen:

```bash
npm run release:evidence -- rc-2026-06-27
```

Der Generator legt an:

- `rc-log.md` fuer Befehle, Ergebnisse, Scope und Entscheidungen
- `smoke-notes.md` fuer manuelle App-/Website-/Control-Smokes
- `screenshots/` als Zielordner fuer UI-Evidence

Keine Secrets, Tokens, privaten Device-IDs, privaten Pfade, Accountdaten oder
personenbezogenen Kontaktdaten in Evidence-Dateien schreiben.
