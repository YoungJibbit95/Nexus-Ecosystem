# Control Panel Server Setup (`nexus-api.cloud`)

Dieses Setup ersetzt GitHub Pages.  
Control UI wird direkt auf dem API-Server gehostet.

## Zielbild

- API bleibt intern loopback-bound: `127.0.0.1:4399`
- Reverse Proxy liefert API extern unter `https://nexus-api.cloud`
- Reverse Proxy liefert Control UI statisch unter `https://nexus-api.cloud/control`

## 1) Control UI bauen

```bash
npm --prefix "../Nexus Control" run build
```

Ergebnis: `../Nexus Control/dist/`

## 2) UI auf den Server deployen

Beispiel (Ubuntu):

- `dist/` nach `/var/www/nexus-control` kopieren
- Webserver-Route `/control` auf diesen Ordner zeigen lassen

## 3) Runtime-Config setzen

`runtime-config.json` in der ausgelieferten UI muss mindestens enthalten:

```json
{
  "controlApiUrl": "https://nexus-api.cloud",
  "bootstrapPath": "/api/v1/public/bootstrap",
  "forceApiUrl": true
}
```

## 4) Origins erlauben

Stelle sicher, dass die UI-Origin in der API-Allowlist enthalten ist:

- per Policy `trustedOrigins`
- oder per Env `NEXUS_EXTRA_TRUSTED_ORIGINS`

Beispiel:

```bash
export NEXUS_EXTRA_TRUSTED_ORIGINS="https://nexus-api.cloud"
```

## 5) Verifikation

```bash
curl -fsS https://nexus-api.cloud/health
curl -fsS https://nexus-api.cloud/api/v1/public/bootstrap
```

Dann im Browser:

- `https://nexus-api.cloud/control`
- Login ausfuehren
- Handshake im Header pruefen (`Backend Handshake: ok ...`)

## Typische Fehler

- `localhost/127.0.0.1` als API-URL in gehosteter UI
- UI auf HTTPS, API aber HTTP (Mixed Content)
- UI-Origin nicht in `trustedOrigins`
