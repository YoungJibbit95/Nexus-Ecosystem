# User Guide / Nutzung

This guide is for using the apps. Repository setup and build commands belong in the [Developer Guide](DEVELOPER_GUIDE.md).

## Start with the right app

- **Nexus Main** is the desktop workspace for notes, tasks, reminders, canvas and local files.
- **Nexus Mobile** brings those workflows to touch screens. Device delivery, navigation and some features differ; desktop and mobile are not interchangeable in every workflow.
- **Nexus Code** is the separate desktop coding app. It requires a validated compatible account. Its editor uses CodeMirror; local command execution uses a simple process runner.
- **Code in Main/Mobile** is an archive for existing code files. It reads and exports them; it does not edit or execute code.

Use a published package for your platform when available. Package availability and installation support depend on the release; a repository build or screenshot does not establish native installer acceptance.

## Main / Mobile: everyday work

1. Open Dashboard to resume a note or find current work.
2. Write in Notes, organize Tasks, and schedule Reminders. Device notification permission and delivery status affect reminders.
3. Use Canvas for visual planning and Files for local library items and workspace handoff.
4. Use Settings to adjust appearance and manage supported data backups. Keep a backup before replacing a workspace.

Main and Mobile store workspace data locally. Optional cloud availability is separate from local storage; local-first does not promise automatic cloud backup or complete offline account access.

### Manual agenda and capture

In Main, open **Calendar → Agenda**; in Mobile, open **Agenda**. Choose the day and timezone. A **task deadline** says when work is due, a **fixed event** occupies a stated interval, and a **work block** schedules time for an existing task. Schedule work on Wednesday while keeping its Friday deadline; moving the block preserves that deadline. Enter an unknown duration yourself. A date-only deadline uses the explicitly selected timezone; an older date without a zone remains unresolved.

Time is not declared free when calendar coverage is unknown. Overlaps, blocked work and other unresolved constraints remain visible; keeping them requires an explicit choice. Dashboard and Flux show distinct task, commitment and reminder counts without counting the same due-and-scheduled task twice.

Shell, Dashboard and command-palette actions open shared **unsaved** capture forms. Opening a form or cancelling it creates nothing. Review the fields and confirm; the saved result appears only after storage acknowledgement. Note and Canvas promotion keeps the source and reuses its existing task on repetition. Context actions focus the exact existing note or canvas node; a missing target remains visible for repair.

Completing a task keeps its history and marks future work blocks inactive. Independent and linked reminders remain unless you explicitly select a linked reminder to stop. The reminder stop has its own acknowledgement; a saved task completion does not prove native cancellation or delivery.

**ICS:** preview the original file before importing. Fixed start/end intervals can become events. Unsupported recurrence, exceptions, alarms and embedded timezone rules remain raw with warnings and are not executed. A recurring base interval needs a separate explicit choice. Import does not change a task deadline or create a reminder series.

**Transfer and backup:** complete workspace snapshots use **Runtime V2**, including planning and portable reminder occurrence facts. Native notification IDs stay local. Keep a complete backup before replacement. A separately selected legacy V1 downgrade reports the omitted planning/history; loose-file import is not a complete snapshot. An imported unknown format is retained for recovery rather than silently reset.

Cerebri production assistance is disabled. The qualified local preview does not activate automatic scheduling, a production collector or native execution. Manual capture and scheduling remain available independently. Native touch, keyboard, screen-reader and notification acceptance depend on the tested release/platform. The [planning contract](../packages/nexus-core/src/planning/README.md) provides the technical details.

### Existing code files / Bisherige Code-Dateien

Open the Code archive, search by file name, expand a source preview and choose **File / Datei** to download one file. **Entire archive / Gesamtes Archiv (.json)** preserves code records and folder data. Existing code records also remain in supported workspace snapshots/backups. Exporting does not delete them.

To edit a downloaded file, put it in a folder you choose and open that folder in Nexus Code. The archive JSON is a preservation format; it is not an automatic project-import workflow in Nexus Code.

**Deutsch:** Im Code-Archiv kannst du alte Dateien suchen, den Quelltext lesen und einzelne Dateien oder das gesamte Archiv herunterladen. Bearbeiten und Befehle starten erfolgt in der separaten App Nexus Code. Ein Export löscht die bisherigen Daten nicht.

## Nexus Code: supported work and limits

Open a selected workspace, edit UTF-8 files with CodeMirror and save them. Basic tabs, syntax highlighting, find/undo and local Git operations are implemented. Search has a bounded scope; it is not an unlimited whole-workspace search/replace feature.

The desktop runner starts commands and shows their standard input/output and exit state. It is **not a PTY or persistent interactive shell**. The quoted absolute Windows-path regression is corrected; actual IPC probes cover script/executable paths, stdin/output and exit behavior. This bounded check does not establish every command, live language server or installed-platform behavior.

Language-server features require an installed external server and a ready desktop bridge. Completion, diagnostics and navigation vary by language and method; full language intelligence is not promised. GitHub workflows require the desktop integration and a connected account; live operations have not been accepted by the local audit.

Debugging uses simulated state, not a connected debug adapter. Marketplace-style install/update UI manages local records; it is not a verified extension package runtime or VS Code compatibility layer. Browser command responses can be demonstrations. These panels must not be used as proof of real execution or debugging.

**Deutsch:** Nexus Code bietet CodeMirror, Dateibearbeitung und einen einfachen Befehlsrunner. Eine interaktive Shell, echtes Debugging und ein ausführbarer Erweiterungs-Marketplace sind nicht zugesagt. Sprachserver und GitHub benötigen passende externe Voraussetzungen.

## Accounts and optional cloud features

Protected account, tier and cloud access is enforced by the server. A visible client option does not activate a paid feature. Cloud sync, backups, AI/Flux and team workflows remain planned or limited unless the app and release explicitly report availability.

When cloud features are unavailable, use the available local workspace workflows and follow the app's sign-in or compatibility message. Avoid sharing tokens or private account data in public issues.

## Troubleshooting

- Check whether you are in the Code archive or the separate Nexus Code app.
- If a download is unavailable, keep the existing local records and use the supported backup/export path.
- Check device permission and the displayed status when a reminder is not delivered.
- For a Code runner error, report the command shape and platform without secrets. Include the tested release; the quoted-Windows-path regression was corrected, while broader command/platform limits remain.
- Developers can use the [build and diagnostic instructions](DEVELOPER_GUIDE.md). Public issues should describe the visible failure without private infrastructure details.
