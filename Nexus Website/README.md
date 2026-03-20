# Nexus Website

Separate React/Vite Website fuer das Nexus Ecosystem.

## Features

- Interaktive Tabs fuer `Nexus Main`, `Nexus Code`, `Ecosystem`
- Control API Integration
  - Handshake (`/api/v1/public/bootstrap`)
  - Login/Logout + Session (`/auth/login`, `/auth/logout`, `/api/v1/session`)
  - Workspace Data (`/api/v1/apps`, `/api/v1/metrics/summary`, `/api/v1/policies`)
  - Paywall + User Access Management via Policies (`PUT /api/v1/policies`)
  - View Validation (`/api/v1/views/validate`)
- Signierte Mutationen (HMAC) fuer Owner-/Admin-gesicherte Policy Updates

## Setup

```bash
npm install
npm run dev
```

Default URL: `http://localhost:4277`

## Build

```bash
npm run build
npm run preview
```

## Optional ENV

`VITE_NEXUS_CONTROL_URL` kann gesetzt werden, um die API-URL zu ueberschreiben.
Ohne Env wird `https://nexus-api.dev` als Default genutzt.
