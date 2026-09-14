import React from "react";
import { FileCode2, Plus, Settings, FolderOpen } from "lucide-react";

const shortcuts = [
  ["Ctrl + S", "Speichern"],
  ["Ctrl + B", "Seitenleiste"],
  ["Ctrl + `", "Terminal"],
  ["Ctrl + W", "Tab schließen"],
  ["F2", "Umbenennen"],
  ["Tab", "Einrücken"],
];

export default function WelcomeScreen({ onNewFile, onOpenFolder, onOpenSettings }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-transparent">
      <div className="min-h-full flex flex-col justify-center max-w-md mx-auto px-6 py-8">
        <FileCode2 size={32} aria-hidden="true" className="mb-5" style={{ color: "var(--primary)" }} />
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--nexus-text)" }}>
          Nexus Code
        </h1>
        <p className="text-sm mt-2 mb-6" style={{ color: "var(--nexus-muted)" }}>
          Öffne ein Projekt oder starte mit einer neuen Datei.
        </p>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={onNewFile}
            className="min-h-12 flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--primary)", color: "hsl(var(--primary-foreground, 0 0% 100%))" }}
          >
            <Plus size={18} aria-hidden="true" /> Neue Datei
          </button>
          <button
            type="button"
            onClick={onOpenFolder}
            className="min-h-12 flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ border: "1px solid var(--nexus-border)", color: "var(--nexus-text)", background: "var(--nexus-surface)" }}
          >
            <FolderOpen size={18} aria-hidden="true" /> Ordner öffnen
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="min-h-11 flex items-center justify-center gap-2 self-center mt-3 px-3 text-sm rounded-lg focus-visible:outline focus-visible:outline-2"
          style={{ color: "var(--nexus-muted)" }}
        >
          <Settings size={15} aria-hidden="true" /> Einstellungen
        </button>

        <details className="mt-5 border-t text-sm" style={{ borderColor: "var(--nexus-border)", color: "var(--nexus-muted)" }}>
          <summary className="min-h-11 py-3 cursor-pointer rounded focus-visible:outline focus-visible:outline-2">
            Tastenkürzel
          </summary>
          <dl className="grid gap-3 pt-1 pb-3">
            {shortcuts.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <dt>{label}</dt>
                <dd><kbd className="text-xs font-mono" style={{ color: "var(--nexus-text)" }}>{key}</kbd></dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </div>
  );
}
