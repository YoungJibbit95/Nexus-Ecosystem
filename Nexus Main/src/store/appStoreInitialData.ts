import type { CodeFile, Note, Reminder, Task } from './appStore'

type TimestampFactory = () => string

const WELCOME_NOTE_CONTENT = `# 👋 Willkommen bei Nexus
___

> Warum fünf verschiedene Apps jonglieren, wenn eine alles kann?

Nexus wurde entwickelt, um deinen gesamten Workflow in einer einzigen, klaren Umgebung zu bündeln – ohne Chaos, ohne Kontextwechsel, ohne unnötige Reibung.

---

## ❓ Was ist Nexus?

Nexus ist eine modulare Productivity-Suite, die Struktur, Kreativität und Technik in einem System vereint.

### 🎯 Die Idee dahinter

Produktivität bedeutet nicht „mehr machen“.
Produktivität bedeutet **klar denken, schnell handeln, organisiert bleiben**.

Nexus gibt dir dafür die Werkzeuge.

---

## 🚀 Wofür kannst du Nexus nutzen?

Egal ob du …

- 📂 Projekte planst
- 📝 strukturierte Notizen schreibst
- 💡 brainstormst oder Ideen sammelst
- 💻 Code entwickelst und testest
- ⏰ Erinnerungen verwaltest
- 🧠 komplexe Zusammenhänge visualisierst

**Nexus passt sich deinem Workflow an – nicht andersherum.**

---

# ⚙️ Features? Mehr als genug.
___

## 🔷 Canvas View
Infinite Canvas mit Pan & Zoom.
Erstelle visuelle Strukturen mit Widgets, verbinde Elemente und denke frei – ohne Grenzen.

## 📝 Notes View
Markdown-Editor mit Toolbar, Split-View, Pinning, Volltextsuche und Tag-System.
Schnell schreiben. Klar strukturieren. Sofort wiederfinden.

## 💻 Code Editor
Monaco-basiert mit Projekt-Sidebar und integrierter REPL für JS/TS sowie Python (Pyodide).
Schreiben. Testen. Iterieren – direkt in Nexus.

## 🔔 Reminders
Intelligente Erinnerungen mit Toasts, Audio, Snooze-Funktion, Wiederholungen und Überfällig-Markierung.

## ⚙️ Settings & Visual Engine
Theme-Presets, Typografie, Glow-System, Glassmorphism, Blur-Optionen und individuelle Farbgestaltung.

---

## 🔥 Weitere Highlights

- 💾 **Autosave** – Deine Arbeit wird automatisch gespeichert
- 📑 **Tab Management** – Schnelle Navigation zwischen Modulen
- 🔗 **Backlinks & Connections** – Verknüpfe Notizen, Canvas-Elemente und Tasks intelligent
- 🎨 **Custom Gradients & Glow Control** – Visuelle Anpassung bis ins Detail

---

## 💡 Warum Nexus?

Weil Produktivität nicht fragmentiert sein sollte.
Weil dein Workflow fließen sollte.
Weil Fokus wichtiger ist als Feature-Overload.

---

## Willkommen in deinem neuen Arbeitsraum.

**Genieße dein produktiveres Setup mit Nexus.** 🚀
`

const NOTES_GUIDE_CONTENT = `# Notes Guide

Diese Notiz zeigt alle wichtigen Notes-Funktionen in Nexus.

## Essentials
- Split / Preview Mode
- Autosave + Manual Save
- Tags, Pinning, Search, Sort
- Markdown Import/Export (.md)

## Keybinds
- \`Cmd/Ctrl + S\` speichern
- \`Cmd/Ctrl + B\` fett
- \`Cmd/Ctrl + I\` kursiv
- \`Cmd/Ctrl + K\` link
- \`Cmd/Ctrl + Z / Y\` undo/redo
- \`Tab\` einrücken

## Magic Blocks
\`\`\`nexus-list
Editor | Markdown + Magic + Split View
Import | .md Datei direkt in Notes laden
Export | .md Datei aus Notes speichern
\`\`\`

\`\`\`nexus-checklist
Notiz erstellen | done
Tag hinzufügen | done
Magic Block einsetzen | todo
\`\`\`

\`\`\`nexus-progress
Produktivität | 72
Dokumentation | 88
Projekt-Status | 54
\`\`\`
`

const CANVAS_GUIDE_CONTENT = `# Canvas Guide

Diese Notiz erklärt die Canvas-Features und den empfohlenen Workflow.

## Canvas Controls
- Drag auf Hintergrund: Pan
- Trackpad/Scroll: Pan
- Pinch oder \`Ctrl/Cmd + Scroll\`: Zoom
- \`F\`: Fit/Focus
- \`G\`: Grid wechseln
- \`P\`: Project Panel
- \`Cmd/Ctrl + M\`: Magic Builder

## Node Typen
- Project / Goal / Milestone
- Decision / Risk / Task / Checklist
- Markdown / Code / Text / Reminder

## Magic in Canvas Markdown
\`\`\`nexus-timeline
Discovery | Ziele definieren
Build | Umsetzung + Review
Launch | Übergabe + Monitoring
\`\`\`

\`\`\`nexus-kanban
Backlog | Ideen sammeln
Doing | Umsetzung
Done | Abgeschlossen
\`\`\`

\`\`\`nexus-alert
info
Tipp: Für große Projekte zuerst ein Magic Template nutzen, dann feinjustieren.
\`\`\`
`

const PYTHON_EXAMPLE_CONTENT = `# Nexus Python Sandbox 🚀

print("Nexus Python Environment Ready")

# -----------------------------
# Data Model
# -----------------------------
class Project:
    def __init__(self, name: str, priority: int):
        self.name = name
        self.priority = priority
        self.completed = False

    def complete(self):
        self.completed = True

    def __repr__(self):
        status = "✔" if self.completed else "✘"
        return f"{self.name} (Priority: {self.priority}) [{status}]"

# -----------------------------
# State
# -----------------------------
projects = []

def add_project(name: str, priority: int):
    p = Project(name, priority)
    projects.append(p)
    return p

def list_projects():
    print("\\nCurrent Projects:")
    for p in sorted(projects, key=lambda x: x.priority):
        print(p)

# -----------------------------
# Functional Example
# -----------------------------
def priority_summary():
    return {p.name: p.priority for p in projects}

# -----------------------------
# Async Example (Pyodide Safe)
# -----------------------------
import asyncio

async def simulate_deploy():
    print("\\nDeploying...")
    await asyncio.sleep(0.5)
    print("Deployment finished.")

# -----------------------------
# Demo Execution
# -----------------------------
p1 = add_project("Build Nexus", 1)
p2 = add_project("Write Docs", 3)
p3 = add_project("Optimize UI", 2)

p1.complete()

list_projects()

print("\\nPriority Map:", priority_summary())

await simulate_deploy()
`

export type InitialAppData = {
  notes: Note[]
  openNoteIds: string[]
  activeNoteId: string | null
  codes: CodeFile[]
  openCodeIds: string[]
  activeCodeId: string | null
  tasks: Task[]
  reminders: Reminder[]
}

export const createInitialAppData = (now: TimestampFactory): InitialAppData => {
  const stamp = now()
  const notes: Note[] = [
    {
      id: 'w',
      title: '👋 Willkommen bei Nexus',
      content: WELCOME_NOTE_CONTENT,
      tags: ['welcome'],
      created: stamp,
      updated: stamp,
      dirty: false,
    },
    {
      id: 'notes-guide',
      title: '📝 Notes Feature Guide',
      content: NOTES_GUIDE_CONTENT,
      tags: ['guide', 'notes', 'magic'],
      created: stamp,
      updated: stamp,
      dirty: false,
    },
    {
      id: 'canvas-guide',
      title: '🧠 Canvas Feature Guide',
      content: CANVAS_GUIDE_CONTENT,
      tags: ['guide', 'canvas', 'workflow'],
      created: stamp,
      updated: stamp,
      dirty: false,
    },
  ]

  const codes: CodeFile[] = [
    {
      id: 'e',
      name: 'example.py',
      lang: 'python',
      content: PYTHON_EXAMPLE_CONTENT,
      dirty: false,
      created: stamp,
      updated: stamp,
      lastSaved: stamp,
    },
  ]

  const tasks: Task[] = [
    {
      id: 'task-welcome-1',
      title: 'Workspace-Ordner in FilesView auswählen',
      desc: 'Damit Export/Import im selben Projektordner funktioniert.',
      status: 'todo',
      priority: 'high',
      tags: ['workspace', 'setup'],
      subtasks: [
        { id: 'task-welcome-1-sub-1', title: 'Ordner wählen', done: false },
        { id: 'task-welcome-1-sub-2', title: 'Workspace laden', done: false },
      ],
      created: stamp,
      updated: stamp,
    },
    {
      id: 'task-welcome-2',
      title: 'Canvas Magic Template testen',
      desc: 'Meeting Hub oder Delivery Map erzeugen und anpassen.',
      status: 'doing',
      priority: 'mid',
      tags: ['canvas', 'magic'],
      subtasks: [],
      created: stamp,
      updated: stamp,
    },
  ]

  const reminders: Reminder[] = [
    {
      id: 'rem-welcome-1',
      title: 'Nexus Setup Review',
      msg: 'Prüfe Dashboard, Notes, Canvas und Files nach dem ersten Setup.',
      datetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      repeat: 'none',
      done: false,
    },
  ]

  return {
    notes,
    openNoteIds: ['w', 'notes-guide', 'canvas-guide'],
    activeNoteId: 'w',
    codes,
    openCodeIds: [],
    activeCodeId: null,
    tasks,
    reminders,
  }
}
