# Nexus View Smoke Matrix

Stand: 2026-05-06

Diese Matrix ist das manuelle Release-Protokoll fuer alle Hauptviews. Sie ersetzt keine Unit-, Contract- oder Build-Tests, sondern beweist kurz vor einem RC, dass die UI wirklich bedienbar ist.

## Regeln

- Jeder Smoke wird auf Desktop Main und Mobile Web/Native ausgefuehrt, wenn die View auf beiden Surfaces vorhanden ist.
- Ein Smoke gilt nur als bestanden, wenn Open, Hauptaktion, Persistenz, leerer Zustand und Fehlerzustand sichtbar korrekt funktionieren.
- Bewegte UI darf Klickziele nicht verschieben. Buttons, Tabs, Cards, Toolbars und Floating Actions muessen waehrend Hover/Press stabil bleiben.
- Jede Abweichung bekommt ein Issue mit View, Surface, Build-Version, Screenshot/Video und Repro-Schritten.
- DevTools und Render Diagnostics bleiben in Release nur sichtbar, wenn Developer Mode oder Admin/Debug-Kontext aktiv ist.

## Schnelle Gates

```powershell
npm run release:gate -- --fast
npm run release:gate
npm run release:gate -- --with-api-contract
```

## Matrix

| View | Desktop Main | Mobile | Open | Create/Edit | Persist/Reload | Offline/API Fallback | Touch/Keyboard | Release-Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Pflicht | Pflicht | Dashboard startet ohne Boot-Loop. | Quick Capture fuer Note/Task/Reminder. | Widget/Layout-State bleibt nach Reload. | API-Ausfall zeigt lesbaren Fallback. | Keyboard-Fokus und mobile Cards bleiben stabil. | Screenshot Dashboard + Sync/Offline-Zustand. |
| Notes | Pflicht | Pflicht | Library und aktive Note laden. | Note erstellen, bearbeiten, taggen, speichern. | Autosave/Manual Save bleibt nach Reload erhalten. | Lokale Notes bleiben ohne API nutzbar. | Editor, Toolbar und Magic Menu verschieben Klickziele nicht. | Screenshot Editor + Preview/Split. |
| Tasks | Pflicht | Pflicht | Board/List View oeffnet mit Empty State. | Task erstellen, Status/Priority aendern. | Filter, Sortierung und Taskdaten bleiben erhalten. | Offline wird klar angezeigt, keine Daten gehen verloren. | Drag/drop plus Touch-Alternative testen. | Screenshot Board + Detail/Filter. |
| Reminders | Pflicht | Pflicht | Reminder-Liste und Today-Kontext laden. | Reminder erstellen, snoozen, abschliessen. | Faelligkeit und Snooze bleiben nach Reload. | Notification/API-Fehler werden ruhig angezeigt. | Mobile Time Picker und Desktop Keyboard-Flow testen. | Screenshot Reminder Detail. |
| Canvas | Pflicht | Pflicht | Canvas startet mit Grid/Empty State. | Objekt erstellen, bewegen, verbinden, loeschen. | Undo/Redo und Canvas-State bleiben erhalten. | Offline-Fallback verhindert Datenverlust. | Touch-Gesten, Zoom und Button-Klicks kollidieren nicht. | Kurzes Video fuer Move/Zoom/Undo. |
| Files | Pflicht | Pflicht | Files View zeigt Workspace/Empty State. | Datei/Ordner importieren oder simuliert anlegen. | Auswahl, Recent und Snapshot bleiben erhalten. | Rechte-/API-Fehler zeigen klare Recovery. | Drag/drop plus mobile Picker testen. | Screenshot Files + Error State. |
| Code | Pflicht | Pflicht | Code Surface und Beispielprojekt laden. | Datei/Snippet bearbeiten und Fehler anzeigen. | Editorinhalt bleibt nach Reload. | Sandbox/API-Fehler blockieren sicher. | Keyboard Shortcuts und mobile Editor Controls testen. | Screenshot Editor + Fehlerausgabe. |
| Flux | Pflicht | Pflicht | Flow/Ideas Surface oeffnet. | Node/Idea anlegen und Status wechseln. | Flow-Zustand bleibt erhalten. | Offline-Fallback zeigt lokalen Modus. | Buttons duerfen durch Animation nicht wegwandern. | Screenshot Flow + Detail Panel. |
| Settings | Pflicht | Pflicht | Settings laden ohne harte API-Abhaengigkeit. | Glow, Panel Background und App Background aendern. | Optionen bleiben nach Reload. | Fehlerhafte API zeigt kontrollierten Status. | Alle Toggles haben sichtbare Wirkung oder disabled Reason. | Screenshot Appearance + Account/API. |
| Info | Pflicht | Pflicht | Release-, API- und Buildinfos laden. | Links und Diagnoseaktionen pruefen. | N/A | API-Ausfall wird lesbar gemeldet. | Links sind gross genug und stabil. | Screenshot Version/API-Status. |
| DevTools | Gated | Gated | Nur mit Developer/Admin-Kontext sichtbar. | Diagnose starten, Log kopieren. | Diagnostics bleiben nachvollziehbar. | Keine Secrets in UI/Logs ausgeben. | Fokusfang, Copy Buttons und Panels testen. | Screenshot ohne Secrets. |

## RC-Kriterien

- Alle Pflichtviews sind auf Desktop Main und Mobile gruen.
- Keine animierte View verschiebt aktive Klickziele waehrend Pointer/Hover/Press.
- Kein Premium-Feature wird ohne gueltiges Entitlement freigeschaltet.
- Kein Admin-/Control-Feature ist fuer normale Accounts sichtbar.
- Login, Remember-Me, Logout und Account-Status sind auf Website und App konsistent.
- `npm run release:gate` ist lokal gruen; API Contract/Attack Tests laufen fuer finale RCs mit `--with-api-contract`.

## Evidence-Ablage

- Screenshots/Videos gehoeren pro RC in `docs/release-evidence/<version>/`.
- Dateinamen folgen `surface-view-state.ext`, zum Beispiel `main-notes-editor.png` oder `mobile-canvas-zoom.mp4`.
- Jedes bekannte Risiko wird im RC-Log verlinkt, nicht nur in Chatverlauf oder lokalen Notizen beschrieben.
