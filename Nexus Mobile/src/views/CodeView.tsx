import React, { useMemo, useState } from "react";
import { Archive, Download, Search } from "lucide-react";
import { useApp } from "../store/appStore";
import { useTheme } from "../store/themeStore";
import { buildCodeArchive, codeDownloadName, downloadCodeArchiveFile } from "./codeArchive";
import "./CodeArchive.css";

/** Compatibility route for files saved before code editing moved to Nexus Code. */
export function CodeView() {
  const codes = useApp((state) => state.codes);
  const folders = useApp((state) => state.folders);
  const activeCodeId = useApp((state) => state.activeCodeId);
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const files = useMemo(() => Array.isArray(codes) ? codes : [], [codes]);
  const visibleFiles = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return files.filter((file) => String(file.name || "").toLocaleLowerCase().includes(search));
  }, [files, query]);
  const download = (name: string, content: string, type = "application/octet-stream") => {
    try {
      downloadCodeArchiveFile(name, content, type);
      setStatus("Download angefordert: " + name);
    } catch {
      setStatus("Download nicht möglich. Bitte erneut versuchen oder das Daten-Backup in Settings verwenden.");
    }
  };

  return (
    <section className="nx-code-archive custom-scrollbar" data-theme={theme.mode} aria-labelledby="code-archive-title">
      <div className="nx-code-archive-content">
        <header className="nx-code-archive-header">
          <Archive size={24} aria-hidden="true" />
          <div>
            <h1 id="code-archive-title">Code-Archiv</h1>
            <p>Code bearbeiten und ausführen kannst du in Nexus Code. Deine bisherigen Dateien bleiben hier erhalten.</p>
          </div>
        </header>
        <div className="nx-code-archive-toolbar">
          <label className="nx-code-archive-search">
            <Search size={16} aria-hidden="true" />
            <input aria-label="Archivdateien durchsuchen" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dateien durchsuchen" />
          </label>
          <button type="button" disabled={files.length === 0} onClick={() => download("nexus-code-archive.json", buildCodeArchive(files, folders), "application/json")}>
            <Download size={16} aria-hidden="true" /> Gesamtes Archiv (.json)
          </button>
        </div>
        <p className="nx-code-archive-count">{files.length} {files.length === 1 ? "Datei" : "Dateien"} · Nur lesen und exportieren</p>
        {files.length === 0 ? (
          <div className="nx-code-archive-empty">Keine alten Code-Dateien vorhanden. Neue Projekte startest du in Nexus Code.</div>
        ) : visibleFiles.length === 0 ? (
          <div className="nx-code-archive-empty">Keine Datei entspricht deiner Suche.</div>
        ) : (
          <ul className="nx-code-archive-list">
            {visibleFiles.map((file) => (
              <li key={file.id}>
                <div className="nx-code-archive-file-heading">
                  <div><strong>{file.name || "Unbenannte Datei"}</strong><span>{file.lang || "Text"}</span></div>
                  <button type="button" aria-label={(file.name || "Datei") + " herunterladen"} onClick={() => download(codeDownloadName(file.name), String(file.content ?? ""))}>
                    <Download size={16} aria-hidden="true" /> Datei
                  </button>
                </div>
                <details open={file.id === activeCodeId || undefined}>
                  <summary>Quelltext ansehen</summary>
                  <pre tabIndex={0} aria-label={(file.name || "Datei") + " Quelltext"}>{file.content || "(Leere Datei)"}</pre>
                </details>
              </li>
            ))}
          </ul>
        )}
        <p role="status" className="nx-code-archive-status">{status}</p>
      </div>
    </section>
  );
}
