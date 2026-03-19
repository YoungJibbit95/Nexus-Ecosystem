import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, CaseSensitive, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getExtColor(name) {
  if (!name) return "#6b7280";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map = {
    js: "#facc15",
    jsx: "#61dafb",
    ts: "#3b82f6",
    tsx: "#3b82f6",
    py: "#22c55e",
    java: "#f97316",
    html: "#f97316",
    css: "#3b82f6",
    json: "#facc15",
    md: "#a855f7",
    cpp: "#3b82f6",
    rs: "#f97316",
    go: "#22d3ee",
    rb: "#ef4444",
    php: "#8b5cf6",
  };
  return map[ext] || "#6b7280";
}

function HighlightedLine({ line, query, caseSensitive }) {
  if (!query) return <span className="text-gray-400">{line}</span>;

  const flags = caseSensitive ? "g" : "gi";
  let regex;
  try {
    regex = new RegExp(`(${escapeRegex(query)})`, flags);
  } catch {
    return <span className="text-gray-400">{line}</span>;
  }

  const parts = line.split(regex);
  return (
    <span>
      {parts.map((part, i) => {
        const isMatch = regex.test(part);
        regex.lastIndex = 0;
        return isMatch ? (
          <mark
            key={i}
            style={{
              background: "rgba(168,85,247,0.35)",
              color: "#e9d5ff",
              borderRadius: "2px",
              padding: "0 1px",
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i} className="text-gray-400">
            {part}
          </span>
        );
      })}
    </span>
  );
}

export default function SearchPanel({ files, onFileSelect }) {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const matches = [];
    for (const file of files) {
      const content = file.content || "";
      const lines = content.split("\n");
      const fileMatches = [];

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const haystack = caseSensitive ? line : line.toLowerCase();
        const needle = caseSensitive ? trimmed : trimmed.toLowerCase();

        if (haystack.includes(needle)) {
          fileMatches.push({
            lineNum: lineIdx + 1,
            lineText: line,
            trimmed: line.trim(),
          });
        }
      }

      if (fileMatches.length > 0) {
        matches.push({ file, matches: fileMatches });
      }
    }
    return matches;
  }, [query, files, caseSensitive]);

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
  const totalFiles = results.length;

  const toggleCollapse = (id) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <motion.div
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="w-64 flex flex-col shrink-0 overflow-hidden"
      style={{
        background: "rgba(6, 6, 20, 0.4)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <span className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase">
          Suche
        </span>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-2 shrink-0">
        <div
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: query
              ? "1px solid rgba(128,0,255,0.35)"
              : "1px solid rgba(255,255,255,0.07)",
            transition: "border-color 0.2s ease",
          }}
        >
          <Search size={12} className="text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="In allen Dateien suchen…"
            className="flex-1 bg-transparent text-xs text-gray-200 placeholder:text-gray-600 outline-none min-w-0"
          />
          {query && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setQuery("")}
              className="shrink-0 p-0.5 rounded hover:bg-white/10"
            >
              <X size={10} className="text-gray-500" />
            </motion.button>
          )}
        </div>

        {/* Options row */}
        <div className="flex items-center justify-between mt-1.5">
          <button
            onClick={() => setCaseSensitive((p) => !p)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-all"
            style={{
              background: caseSensitive
                ? "rgba(128,0,255,0.15)"
                : "transparent",
              color: caseSensitive ? "#a855f7" : "#6b7280",
              border: caseSensitive
                ? "1px solid rgba(128,0,255,0.3)"
                : "1px solid transparent",
            }}
            title="Groß-/Kleinschreibung beachten"
          >
            <CaseSensitive size={11} />
            <span>Aa</span>
          </button>

          {query && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-gray-600"
            >
              {totalMatches} in {totalFiles}{" "}
              {totalFiles === 1 ? "Datei" : "Dateien"}
            </motion.span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        className="mx-3 mb-2 shrink-0"
        style={{ height: "1px", background: "rgba(128,0,255,0.08)" }}
      />

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {results.map((result, ri) => {
            const isCollapsed = collapsed[result.file.id];
            const color = getExtColor(result.file.name);
            const ext =
              result.file.name ? result.file.name.split(".").pop()?.toUpperCase() : "TXT";

            return (
              <motion.div
                key={result.file.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: ri * 0.04, duration: 0.2 }}
              >
                {/* File header */}
                <button
                  onClick={() => toggleCollapse(result.file.id)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 group hover:bg-white/[0.04] transition-colors"
                >
                  <motion.div
                    animate={{ rotate: isCollapsed ? -90 : 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ChevronDown size={11} className="text-gray-600 shrink-0" />
                  </motion.div>
                  <span
                    className="text-[10px] font-bold px-1 py-0.5 rounded shrink-0"
                    style={{ background: color + "20", color }}
                  >
                    {ext}
                  </span>
                  <span className="text-xs text-gray-300 truncate font-medium flex-1 text-left">
                    {result.file.name}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{
                      background: "rgba(128,0,255,0.15)",
                      color: "#a855f7",
                    }}
                  >
                    {result.matches.length}
                  </span>
                </button>

                {/* Match lines */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden" }}
                    >
                      {result.matches.slice(0, 8).map((match, mi) => (
                        <button
                          key={mi}
                          onClick={() => onFileSelect(result.file.id)}
                          className="w-full flex items-start gap-2 px-3 py-1 hover:bg-purple-500/[0.07] group transition-colors text-left"
                        >
                          <span
                            className="text-[10px] font-mono shrink-0 mt-0.5 w-7 text-right"
                            style={{ color: "#4b5563" }}
                          >
                            {match.lineNum}
                          </span>
                          <span className="text-[11px] font-mono truncate leading-relaxed group-hover:text-gray-300 transition-colors">
                            <HighlightedLine
                              line={match.trimmed || "(leer)"}
                              query={query}
                              caseSensitive={caseSensitive}
                            />
                          </span>
                        </button>
                      ))}

                      {result.matches.length > 8 && (
                        <button
                          onClick={() => onFileSelect(result.file.id)}
                          className="w-full px-9 py-1 text-left hover:bg-white/5 transition-colors"
                        >
                          <span className="text-[10px] text-purple-400/70">
                            + {result.matches.length - 8} weitere Treffer…
                          </span>
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty states */}
        {query && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-10 px-4 text-center"
          >
            <Search size={24} className="text-gray-700 mb-3" />
            <p className="text-xs text-gray-600">Keine Treffer für</p>
            <p className="text-xs text-gray-500 font-mono mt-0.5 truncate max-w-full">
              "{query}"
            </p>
          </motion.div>
        )}

        {!query && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-10 px-4 text-center"
          >
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Search size={28} className="text-gray-700 mb-3" />
            </motion.div>
            <p className="text-xs text-gray-600">Suchbegriff eingeben</p>
            <p className="text-[10px] text-gray-700 mt-1">
              Durchsucht alle {files.length} Dateien
            </p>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      {query && totalMatches > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-3 py-2 shrink-0"
          style={{ borderTop: "1px solid rgba(128,0,255,0.08)" }}
        >
          <span className="text-[10px] text-gray-600">
            {totalMatches} Treffer in {totalFiles}{" "}
            {totalFiles === 1 ? "Datei" : "Dateien"}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
