# Nexus Website

Separate React/Vite Website fuer das Nexus Ecosystem.

## Features

- Interaktive Tabs fuer `Preview Universe`, `Nexus Main`, `Nexus Code`, `Ecosystem`, `Website Access`, `Control API`
- Neuer `Preview Universe` Tab mit Orbit-Navigation und browserbasierten App-Previews (Main, Mobile, Code, Code Mobile, Control)
- Website Access Flow: Signup/Login + API-validierte Entitlement-Pruefung fuer Paywall-Gates
- Paid-Flow Guard: Website blockiert Paid-Intent ohne Login und verlangt danach API Validation
- Checkout Bridge: optionaler API-Call fuer Paid Checkout, danach erneuter Entitlement-Check
- Erweiterte Surface-Sektion mit Main/Mobile-Views, Code-Panel-Stack und Runtime-/Performance-Guardrails
- Control API Integration (Handshake, Auth, Session, Policy/Paywall, View Validation)
- Signierte Mutationen fuer Owner-/Admin-gesicherte Policy Updates
- Space-first Redesign mit Sternenlayern, Nebula, Meteors und interaktiven Orbit-Objekten
- Performance-schonend: Preview Universe ist lazy-loaded, Motion laeuft primar ueber CSS
- Adaptiver FX-Modus: automatische Lite-Konfiguration auf schwacher Hardware + manueller Toggle (Cinematic/Performance Mode)
- Offscreen-Rendering optimiert ueber `content-visibility` und `contain` fuer grosse Panel-Sektionen

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

`VITE_NEXUS_AUTH_REGISTER_PATH` setzt den Register-Endpunkt (Default: `/auth/register`).

`VITE_NEXUS_BILLING_CHECKOUT_PATH` setzt den Checkout-Endpunkt (Default: `/api/v1/billing/checkout`).
