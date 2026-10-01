# Manuelle Planung und Kontext

`TaskRecord` bleibt die kanonische Aufgabe. Eine Frist ist kein Arbeitsblock. Präzise Zeitpunkte bleiben in ihrem ursprünglichen Textformat erhalten; neue reine Datumsfristen deklarieren die gewählte IANA-Zeitzone. `PlanningEvent` ist eine feste Verpflichtung mit exklusivem Ende. `PlanningBlock` reserviert ausdrücklich eingegebene Arbeit für eine vorhandene Aufgabe. Erinnerungen bleiben getrennte Zeitpunkt-/Vorkommensobjekte. Ohne vollständige, ausdrücklich bestätigte Abdeckung wird Zeit nicht als frei bezeichnet.

Main und Mobile verwenden denselben Command-Owner, dieselbe Agenda und denselben Today-Selector. Erfassen, Planen, Verschieben, Abschließen, ICS-Import, Promotion und Kontextreparatur journalen Aufgaben und Planung zusammen. Erfolg erscheint erst nach Storage-Quittung. Ein Fehler versucht den vollständigen vorherigen Zustand zurückzuschreiben; ein unbestätigter Rollback hält das Journal und die Workspace-Sperre zur Wiederherstellung fest. Ein Journal, dessen Quellen zwischenzeitlich divergiert sind, wird zur ausdrücklichen Reparatur erhalten.

Eine Receipt bindet den gesamten Command an seine ID. Ein identischer Retry liefert dieselben IDs; geänderte Inhalte mit derselben ID werden abgelehnt. Generation, Planrevision und bei vorhandenen Aufgaben deren vollständige kanonische Inhaltsrevision schützen vor veralteten Änderungen. Workspace-Import erneuert die Generation. Eine wiederhergestellte genaue Recovery-Generation übernimmt ihre ursprünglichen Receipts. Ein neuer erfolgreicher Import erhält vorhandene Receipts als Geschichte, erlaubt aber keinen Replay aus der alten Generation.

Beim Abschluss einer Aufgabe bleiben vergangene Blöcke und zukünftige inaktive Blöcke erhalten. Verbundene Erinnerungen werden nur durch ausdrückliche Auswahl zusätzlich gestoppt. Der Stopp geht nach bestätigtem Aufgabenabschluss an den App-Reminder-Owner. Seine Quittung bleibt getrennt: nicht verfügbarer Owner oder unbestätigte OS-Zustellung machen den Aufgabenabschluss nicht rückgängig. Ohne Auswahl bleiben auch verbundene Erinnerungen bestehen. Der Folge-Retry benutzt die identische Completion-Receipt; er prüft die aktuelle Generation, den abgeschlossenen Task und die weiterhin bestehende Verbindung erneut.

## Speicher- und Austauschformate

`nexus-planning` Schema 1 hält Events, Blöcke, Dauern, Verfügbarkeit und Receipts. Optionale deklarierte Metadaten enthalten ICS-Roharchive. Main/Mobile halten ihre eigenen Planning-DBs und Command-Journale. Die vollständigen Workspace-Exporte verwenden Runtime-Version 2 mit dieser Planung; Runtime-Version 1 erhält ihren bisherigen strikten Vertrag. Ein bewusster V1-Export verliert Events, Arbeitsblöcke, Dauern, Verfügbarkeit, Receipts und ICS-Archive; die Verlustanzeige nennt dies vor Verwendung. Unbekannte zukünftige Formate werden zur Reparatur erhalten und nicht durch leere Daten ersetzt.

## ICS

Die Agenda zeigt vor dem Speichern das feste Intervall und semantische Grenzen. UTC, auflösbare IANA-TZIDs sowie ausdrücklich gewählte Zeitzonen für schwebende/ganztägige Werte werden unterstützt. Ganztägige Enden sind exklusiv; 23-/25-Stunden-Tage bleiben tatsächliche Zeittage. Lücken, mehrdeutige Uhrzeiten, unbekannte TZIDs, DURATION und RECURRENCE-ID werden ausschließlich im Roharchiv erhalten. RRULE, INTERVAL, COUNT, RDATE und EXDATE erzeugen keine ausführbare Serie. Basistermine solcher Serien benötigen eine zusätzliche ausdrückliche Auswahl. Der vollständige Originaltext und sichtbare Warnungen werden in `nexus-ics-archive` Version 1 gespeichert, auch wenn kein Termin ausgeführt wird. Import verändert keine Aufgabenfrist, keinen Reminder und keine bestätigte Abdeckung.

Textimporte sind auf 262144 Zeichen und 200 direkte VEVENTs begrenzt; Dateiauswahl zusätzlich auf 256 KiB. Nur direkte VEVENT-Kinder von VCALENDAR werden ausgeführt. VEVENTs innerhalb fremder Komponenten bleiben mit Warnung im vollständigen Roharchiv; falsch geschlossene oder verschachtelte Event-Bäume erzeugen keinen bestätigten Teilimport. Die älteren Task-/Reminder-Projektionshelper bleiben für Characterization erhalten; der produktive Main-Importknopf öffnet die gemeinsame Agenda-ICS-Vorschau.

Eingebettete VTIMEZONE-Regeln werden nicht interpretiert. Ein Termin, der eine solche Definition referenziert, bleibt ausschließlich im Roharchiv; selbst ein gleichnamiger IANA-TZID ersetzt diese Regeln nicht still durch die Host-Datenbank. HTML-Textareas normalisieren Zeilenenden. Der Dateipfad speichert den vom Datei-Reader gelieferten Originaltext, einschließlich CRLF; der vollständige Dateitext ist deshalb die maßgebliche Provenienz.

DTSTART und DTEND können verschiedene unterstützte IANA-TZIDs verwenden. Beide werden unabhängig zum tatsächlichen Zeitpunkt aufgelöst; die Event-Anzeige verwendet die Startzeitzone. Die ursprünglichen beiden Eigenschaften bleiben in der Event-Provenienz und im vollständigen Originalarchiv erhalten.

## Typisierte Beziehungen und Promotion

Kontextreferenzen sind `{ kind: 'note', id }` oder `{ kind: 'canvas-node', canvasId, id }`. Canvas-Ziele werden im genannten Projekt erneut auf tatsächliche Mitgliedschaft geprüft. Vorhandene alte IDs bleiben erhalten: fehlende Ziele werden sichtbar, mehrdeutige alte Canvas-Knoten-IDs verlangen ausdrückliche Projektauswahl. Die Agenda und der Main-Task-Dialog bieten einen Picker mit Notiz- und Projekt-/Knotennamen sowie bestätigte Reparatur/Entfernung.

Notiz- und Canvas-Promotion speichert eine kanonische Aufgabe mit `promotionSource` und `entityLinks`. Editor-Drafts werden vorher geleert und quittiert. Wiederholung verwendet den bestehenden Task; mehrere vorhandene Zuordnungen verlangen Reparatur und erzeugen keinen weiteren Task. Quellen bleiben erhalten, und es werden keine neuen Canvas-Backlinks geschrieben. Ein späterer Quellenwechsel ersetzt die Taskbeschreibung nicht automatisch. Fokus-Intents erzeugen keine Entität und werden in zwischengespeicherten Views erst beim Aktivieren verbraucht. Fehlt das Ziel dann, bleibt die Referenz zur Reparatur erhalten.

Die bisherigen Notiz-Magic-Fences und explizite manuelle neue Aufgaben bleiben eigene Benutzeraktionen. Diese Erweiterung ändert deren Identität oder historische Canvas-Backlinks nicht automatisch.

## Grenzen

Die lokalen Core-/Browserprüfungen verwenden synthetische Datensätze und echte Browser-Stores/React-Views. Sie qualifizieren keine installierten Android-/iOS-Geräte, OS-Zustellung, Screenreader, Linux/macOS-Installation oder mehrere gleichzeitige Planning-Writer. Native Reminder-Zustellung wird separat abgenommen. Manuelle Planung ruft keinen Cerebri-Solver auf; Cerebri-Vorschauen verwenden einen getrennten Opt-in-Vertrag und den bestehenden Command-Owner erst nach ausdrücklicher Bestätigung.
