# Nexus API Contract (Client View)

Dieses Dokument beschreibt den API-Rahmen aus Sicht der Nexus-Clients im Ecosystem-Repo.
Es ersetzt keine serverseitige API-Spezifikation, sondern dokumentiert verbindliches Client-Verhalten.

## Produktiver Host

- Primärziel: `https://nexus-api.cloud`
- Hosts muessen durch Allowlist-/Policy-Regeln abgesichert sein.
- Keine stillen lokalen API-Fallbacks fuer produktive Flows.

## Client-Grundregeln

- Timeout pro Request ist verpflichtend.
- Retry nur fuer sichere Requests (`GET`, `HEAD`) mit Backoff/Jitter.
- Kein Retry fuer normale `4xx`-Antworten.
- Response-Validation fuer kritische Payloads ist verpflichtend.
- Typed Errors statt stummer Fehlerpfade.

## Sicht auf `liveSync` / View-Model

- Core-Views (`dashboard`, `notes`, `tasks`, `reminders`, `code`, etc.) sind fail-open zu behandeln,
  solange sie nicht explizit serverseitig deaktiviert sind oder clientseitig nicht unterstuetzt werden.
- Leere/inkonsistente API-Modelle duerfen keine Kern-Views verschwinden lassen.
- Fallback-Viewlisten muessen nur als Guardrail dienen, nicht als alternativer API-Datenpfad.

## Offline-/Netzfehler-Verhalten

- Kein lokales Shadow-API-System im Ecosystem-Client.
- Fehler muessen klar im UI angezeigt werden.
- Falls ein eingeschraenkter Offline-Modus aktiv ist, muss dieser explizit als solcher gekennzeichnet sein.

## Telemetrie / Diagnostics

- Keine `LOCAL_FALLBACK-*` Codes in normalen Runtime-Logs bei produktiver API-Konfiguration.
- Render-/Motion-Diagnostics getrennt von API-Diagnostics behandeln.
- API-Diagnostics muessen klar zwischen Netzwerk, Auth, Validation und Contract unterscheiden.

## Verifikation (Client-seitig)

```bash
npm run verify:ecosystem
npm run measure:startup-sync
npm --prefix "./Nexus Main" run build
npm --prefix "./Nexus Mobile" run build
npm --prefix "./Nexus Code" run build
npm --prefix "./Nexus Code Mobile" run build
```

## Verantwortungsgrenzen

- Dieses Repo: Client-Verhalten, Contracts, Runtime-Guardrails, Dokumentation.
- Externe API-Repos: serverseitige Endpunkte, Security-Policies, Datenpersistenz.
