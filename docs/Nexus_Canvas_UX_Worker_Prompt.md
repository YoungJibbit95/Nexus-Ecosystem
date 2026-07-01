# Nexus Canvas UX Worker Prompt

Stand: 2026-06-30

## Rolle

Du arbeitest als begrenzter Nexus Canvas Worker im `Nexus-Ecosystem`. Du bist nicht allein im Codebase: mehrere UI- und Stabilitaetsarbeiten koennen parallel laufen. Revertiere keine fremden Aenderungen und halte deinen Write-Scope eng.

## Ziel

Verbessere die bestehende Canvas UX/UI strukturell, ohne eine neue Canvas-App zu bauen. Der Canvas soll sich ruhiger, klarer und produktiver anfuehlen: moderne Mindmap-/Workspace-Bedienung, scharfes Zoom-Verhalten, besser lesbare Nodes, weniger Toolbar-Reibung und stabilere Performance.

## Prioritaeten

1. Zoom-Schaerfe und Rendering-Stabilitaet
2. Lesbarkeit von Nodes bei 50%, 100% und 150%
3. Ruhigere Toolbar- und Node-Hierarchie
4. Dezentere Grid-/Edge-Darstellung
5. Performance ohne unnoetige React-Re-Renders beim Pan/Zoom

## Rendering und Zoom

- Pruefe `CanvasStage`, `useCanvasPanAndWheel`, `ConnectionLine` und Viewport-Controls.
- Runde und clamp Zoomwerte stabil, damit Transform-Subpixel und Wheel-Gesten nicht jittern.
- Zoom bleibt cursor-zentriert.
- Grid-Position und Grid-Size sollen auf stabile Pixelwerte gerundet werden.
- SVG-Edges sollen bei Zoom nicht matschig wirken. Reduziere Blur/Filter bei kleinen Zooms und halte Stroke-Werte lesbar.
- Keine gerasterten Node-Snapshots skalieren.
- DOM-Nodes duerfen weiter ueber die Stage transformiert werden, aber Node-Inhalte sollen visuell ruhig bleiben.

## Node UX

- Node Header klarer machen: Icon, Typ, Titel und More-Aktion sollen schnell erfassbar sein.
- Selected- und Hover-States deutlicher, aber nicht grell.
- Padding, Font-Size und Line-Height so setzen, dass Nodes nicht gequetscht wirken.
- Bei herausgezoomtem Canvas darf Content kompakter werden; Titel, Typ und Status muessen trotzdem erkennbar bleiben.
- Bestehende Node-Funktionen behalten: Drag, Resize, Scale, Connect, Duplicate, Delete, Magic-Hub.

## Toolbar UX

- Bestehende Gruppen beibehalten: Add, Work, Layout, View.
- Sekundaere Aktionen optisch zuruecknehmen, ohne Funktionen zu entfernen.
- Zoom-Control als zusammenhaengende Einheit fuehren: Minus, Prozent, Plus, Fit, Reset.
- Tooltips kurz, konkret und nutzerverstaendlich halten.
- Buttons sollen gleiche Hoehe, klare Active States und ruhige Disabled States haben.

## Minimap und Navigation

- Minimap soll klar bleiben: Viewport-Rahmen, Node-Typen/Farben und Zoomwert erkennbar.
- Keine grosse Minimap-Neuentwicklung in diesem Schritt, ausser kleine Klarheits- oder Schaerfekorrekturen im vorhandenen Scope.
- Pan per Space/Middle Mouse und Wheel-/Trackpad-Zoom muessen weiter funktionieren.

## Nicht in diesem Schritt

- Keine neue Persistenz.
- Keine neue Inspector-Architektur.
- Keine neue eigene Calendar-/Flux-/API-Verknuepfung.
- Keine komplette Canvas-Neuschreibung.
- Keine breiten Refactors ausserhalb der Canvas-Dateien.

## Akzeptanz

- Zoom bei 50%, 100% und 150% sieht sauberer aus.
- Nodes bleiben lesbar und wirken weniger matschig.
- Toolbar wirkt kompakter und besser gruppiert.
- Grid und Edges lenken weniger ab.
- `git diff --check` ist sauber.
- `npm --prefix ".\Nexus Main" run build` laeuft, sofern die Umgebung nicht durch bekannte lokale Grenzen blockiert.
