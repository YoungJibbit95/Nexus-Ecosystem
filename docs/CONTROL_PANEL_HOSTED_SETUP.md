# Control Panel Hosted Setup (GitHub Pages)

Dieses Setup loest den Fehler:

`Loopback-API URL ist auf gehosteter UI nicht erreichbar`

## Zielbild

- Control UI laeuft auf GitHub Pages (`https://youngjibbit95.github.io/...`)
- Control Plane bleibt intern auf `127.0.0.1:4399`
- Oeffentlicher HTTPS Endpoint (Reverse Proxy) leitet auf `127.0.0.1:4399`

## 1) Oeffentlichen HTTPS Endpoint fuer die API bereitstellen

Die API selbst bleibt loopback-bound. Externer Zugriff erfolgt nur ueber Reverse Proxy.

Beispiel (Nginx):

```nginx
server {
  listen 443 ssl;
  server_name control-api.example.com;

  location / {
    proxy_pass http://127.0.0.1:4399;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## 2) CORS/Origin erlauben

Setze auf dem API-Host:

```bash
export NEXUS_EXTRA_TRUSTED_ORIGINS="https://youngjibbit95.github.io"
```

Optional (wenn du eine eigene Pages-Domain nutzt): diese Domain ebenfalls eintragen.

## 3) GitHub Pages Build auf richtige API URL setzen

In `Nexus-Ecosystem` Repository Variables:

- `NEXUS_CONTROL_PUBLIC_API_URL=https://control-api.example.com`

Dann Workflow `Deploy Nexus Control (GitHub Pages)` neu ausfuehren.

## 4) Verifikation

Von lokal/CI pruefen:

```bash
curl -fsS https://control-api.example.com/health
curl -fsS https://control-api.example.com/api/v1/public/bootstrap
```

Wenn beide Requests funktionieren, sollte Login in der gehosteten Control UI moeglich sein.

## 5) Typische Fehler

- `localhost/127.0.0.1` in der Website: nicht erreichbar von GitHub Pages.
- HTTP-API bei HTTPS-UI: Browser blockiert Mixed Content.
- Origin nicht trusted: API antwortet mit CORS/Handshake-Fehler.
