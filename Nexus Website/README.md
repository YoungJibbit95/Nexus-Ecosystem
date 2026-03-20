# Nexus Website

Separate React/Vite Website fuer das Nexus Ecosystem.

## Features

- Interaktive Tabs fuer `Nexus Main`, `Nexus Code`, `Ecosystem`
- Control API Integration (Handshake, Auth, Session, Policy/Paywall, View Validation)
- Signierte Mutationen fuer Owner-/Admin-gesicherte Policy Updates

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
