# Nexus Main View Registry v2

Stand: 2026-05-06

Die Main View Registry v2 reduziert die alte Doppelpflege zwischen Sidebar, Preload, Boot-Konfiguration und Core-Manifests. Nexus Main liest View-Labels, Farben, Gruppen und Preload-Signale jetzt aus einer zentralen Registry, die auf `packages/nexus-core` aufsetzt.

## Zentrale Datei

```text
Nexus Main/src/app/mainViewRegistry.ts
```

## Verantwortungen

- `View` Typ fuer Core-Views plus lokalen `diagnostics` Dev-View.
- Icon-, Label-, Farbe-, Kategorie- und Navigationsgruppen pro View.
- Main/Footer/Developer-Gruppierung fuer Sidebar und Shell.
- Preload-Prioritaet und Heavy-View-Markierung fuer Boot/Warmup.
- Kritische, Boot-Priority- und persistente View-Listen fuer Main.
- Normalisierung von API-/Runtime-View-Listen auf lokal bekannte Views.

## Angebundene Stellen

- `Sidebar.tsx` nutzt `MAIN_PRIMARY_VIEW_ITEMS` und `MAIN_FOOTER_VIEW_ITEMS`.
- `viewPreload.tsx` nutzt `MAIN_VIEW_IDS`, `MAIN_PRELOAD_PRIORITY` und `MAIN_HEAVY_PRELOAD_VIEW_SET`.
- `mainAppConfig.ts` nutzt Registry-Listen fuer Fallback, Boot, Critical Preload und persistenten Cache.
- `NexusV6ViewShell` nutzt Core Commands und gibt reale Main-Kommandos an `MainViewHost` weiter.

## Command Bridge

`NexusV6ViewShell` kann Commands aus der resolved Core Registry ausfuehren. `MainViewHost` behandelt aktuell die ersten echten Main-Kommandos:

- `dashboard.quick-capture` erstellt eine Note und wechselt zu Notes.
- `notes.new-note` erstellt eine Note und wechselt zu Notes.
- `tasks.new-task` erstellt einen Task und wechselt zu Tasks.
- `reminders.new-reminder` erstellt einen Reminder und wechselt zu Reminders.

Nicht behandelte Commands werden als `nexus:view-command` Browser-Event mit `commandId`, `actionId`, `viewId`, `intent` und `placement` weitergereicht. Dadurch koennen Views schrittweise eigene Handler anbinden, ohne die Shell wieder zu verzweigen.

## Naechste Schritte

- Command Palette und Toolbar voll auf `MAIN_VIEW_REGISTRY` und `resolveNexusViewCommandRegistry()` umstellen.
- Notes/Tasks/Canvas spezifische Events direkt in den Views konsumieren.
- Panel-State pro View persistieren.
- Mobile Registry-Verbrauch angleichen, damit Mobile dieselben Gruppen/Prioritaeten nutzt.
