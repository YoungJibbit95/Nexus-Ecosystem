# @nexus/core

Shared Core-Library fuer Nexus Main, Nexus Mobile, Nexus Code und Nexus Code Mobile.

## Zweck

`@nexus/core` enthaelt gemeinsame Runtime- und Produktlogik, damit die Apps nicht auseinanderdriften.

## Hauptmodule

- `src/render/*`
  - zentrale Render-Pipeline
  - Surface-/Effect-Modelle
  - Budget-Allokation
  - Invariants/Guardrails
  - Runtime-Bridge + Hooks-Basis
- `src/motion/*`
  - Motion-Profile und Degradation
  - konsistente Bewegungsfamilien
- `src/liveSync.ts`
  - Feature/Layout/Release View-Model-Aufbereitung
- `src/api/*`
  - API-Client-Utilities und Laufzeit-Helfer
- `src/quickCapture.ts`
  - Shared Capture-Intent (`note|task|reminder|code|canvas`)
- `src/todayLayer.ts`
  - gemeinsame Today-Zusammenfassung fuer Tasks/Reminders
- `src/canvas/*`
  - Canvas-Magic-Renderer und Shared-Canvas-Helfer

## Render Pipeline

Phase-Reihenfolge:

1. `Measure`
2. `Resolve`
3. `Allocate`
4. `Commit`
5. `Cleanup`

Wichtige Konzepte:

- `surfaceClass`
- `effectClass`
- `budgetPriority`
- `visibilityState`
- `interactionState`
- `motionCapability`
- `degradationLevel`

## Guardrails

- Ein Surface hat genau eine Capability-Quelle.
- Ownership fuer `transform`, `filter`, `opacity` darf nicht kollidieren.
- Hidden/Occluded Surfaces sollen keine teuren dynamischen Effekte fahren.
- Degradation reduziert Komplexitaet kontrolliert statt abruptem UI-Bruch.

## Nutzung in Apps

Main/Mobile binden die Runtime ueber app-spezifische Adapter ein:

- `src/render/renderRuntime.ts`
- `src/render/useRenderSurfaceBudget.ts`
- `src/render/useSurfaceMotionRuntime.ts`

## API-Hoststrategie

Clients im Ecosystem sollen produktiv auf `https://nexus-api.cloud` laufen.
Lokale/private API-Server-Implementierungen gehoeren nicht in dieses Repository.
