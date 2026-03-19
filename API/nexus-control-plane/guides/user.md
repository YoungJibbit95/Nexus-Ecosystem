# Nexus Control Plane User Guide

## Was kann ich damit machen?

- Status aller Nexus-Apps sehen
- API- und Runtime-Einstellungen zentral anpassen
- Commands an einzelne Apps schicken
- Performance- und Health-Daten sehen
- Audit-Verlauf fuer Nachvollziehbarkeit einsehen
- Device-Status und Freigaben (Admin-Bereich) verwalten

## Typischer Ablauf

1. Im Nexus Control UI einloggen
2. Auf dem Dashboard den Status der Apps pruefen
3. In "Settings" globale oder app-spezifische Einstellungen anpassen
4. In "Commands" gezielte Aktionen ausfuehren
5. In "Audit" den Verlauf kontrollieren

## Wichtig

Wenn eine App als `stale` markiert ist, sendet sie aktuell keine frischen Heartbeats an den Control Plane Service.

Admin- und Developer-Aktionen sind von der normalen Nutzer-Ebene getrennt und erfordern ein verifiziertes Geraet.
