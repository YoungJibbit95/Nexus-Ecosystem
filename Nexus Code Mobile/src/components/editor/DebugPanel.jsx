import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Play,
  Square,
  StepForward,
  SkipForward,
  RotateCcw,
  Plus,
  Bug,
  ChevronDown,
  Circle,
  AlertTriangle,
  Info,
  X,
  Terminal,
  Layers,
  Eye,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Mock data ──────────────────────────────────────────────────────────── */

const INITIAL_VARIABLES = [
  { id: 1, name: "result", value: "42", type: "number", mutable: true },
  {
    id: 2,
    name: "message",
    value: '"Hello, World!"',
    type: "string",
    mutable: true,
  },
  { id: 3, name: "isReady", value: "true", type: "boolean", mutable: false },
  {
    id: 4,
    name: "items",
    value: "[1, 2, 3, 4, 5]",
    type: "array",
    mutable: true,
  },
  {
    id: 5,
    name: "config",
    value: "{ debug: false }",
    type: "object",
    mutable: true,
  },
];

const MAX_STACK_FRAMES = 4;

const INITIAL_CONSOLE = [
  {
    id: 1,
    type: "system",
    text: "✦ Nexus Debug Session gestartet",
    time: "10:00:00",
  },
  {
    id: 2,
    type: "info",
    text: "Bereit. Setze Breakpoints und starte.",
    time: "10:00:00",
  },
];

const TYPE_COLORS = {
  number: "#f97316",
  string: "#fbbf24",
  boolean: "#a855f7",
  array: "#22d3ee",
  object: "#3b82f6",
  null: "#6b7280",
  unknown: "#9ca3af",
};

const CONSOLE_STYLES = {
  system: { color: "#6b7280", icon: null },
  info: { color: "#3b82f6", icon: <Info size={9} /> },
  warn: { color: "#fbbf24", icon: <AlertTriangle size={9} /> },
  error: { color: "#ef4444", icon: <AlertTriangle size={9} /> },
  output: { color: "#22c55e", icon: null },
  input: { color: "#a855f7", icon: null },
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SectionHeader({
  icon: Icon,
  title,
  count = null,
  expanded,
  onToggle,
  children,
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 group hover:bg-white/[0.03] transition-colors"
      >
        <motion.div
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.18 }}
        >
          <ChevronDown size={11} className="text-gray-600 shrink-0" />
        </motion.div>
        {Icon && <Icon size={12} className="text-purple-400/70 shrink-0" />}
        <span className="text-[10px] font-semibold text-gray-500 tracking-widest uppercase flex-1 text-left">
          {title}
        </span>
        {count != null && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: "rgba(128,0,255,0.15)", color: "#a855f7" }}
          >
            {count}
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] || TYPE_COLORS.unknown;
  return (
    <span
      className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0"
      style={{ background: color + "20", color }}
    >
      {type}
    </span>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function DebugPanel({ activeFile, _code, problems = [] }) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [variables, setVariables] = useState(INITIAL_VARIABLES);
  const [breakpoints, setBreakpoints] = useState([]);
  const [pausedLine, setPausedLine] = useState(null);
  const [consoleLog, setConsoleLog] = useState(INITIAL_CONSOLE);
  const [consoleInput, setConsoleInput] = useState("");
  const [watchInput, setWatchInput] = useState("");
  const [addingWatch, setAddingWatch] = useState(false);
  const [newBpLine, setNewBpLine] = useState("");
  const [addingBp, setAddingBp] = useState(false);
  const [sections, setSections] = useState({
    controls: true,
    variables: true,
    callstack: false,
    breakpoints: true,
    console: true,
  });

  const consoleEndRef = useRef(null);
  const consoleInputRef = useRef(null);
  let _logId = useRef(consoleLog.length + 1);
  const syntaxErrors = useMemo(
    () => problems.filter((item) => Number(item?.severity) === 8),
    [problems],
  );
  const firstSyntaxError = syntaxErrors[0] || null;
  const callstack = useMemo(() => {
    if (!isRunning && !isPaused) return [];
    const activeLine = Number(pausedLine || breakpoints[0] || 1);
    const fileName = activeFile?.name || "untitled";
    const frames = [
      {
        id: 1,
        fn: activeFile ? `run(${fileName})` : "run()",
        file: fileName,
        line: activeLine,
        active: true,
      },
      {
        id: 2,
        fn: "dispatch()",
        file: "runtime/debug-adapter",
        line: 44,
        active: false,
      },
      {
        id: 3,
        fn: "eventLoop()",
        file: "runtime/scheduler",
        line: 18,
        active: false,
      },
      {
        id: 4,
        fn: "<entry>",
        file: fileName,
        line: 1,
        active: false,
      },
    ];
    return frames.slice(0, MAX_STACK_FRAMES);
  }, [activeFile, breakpoints, isPaused, isRunning, pausedLine]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLog]);

  const addLog = (text, type = "output") => {
    const now = new Date().toLocaleTimeString("de-DE", { hour12: false });
    setConsoleLog((prev) => [
      ...prev,
      { id: ++_logId.current, type, text, time: now },
    ]);
  };

  /* ── Debug controls ──────────────────────────────────────────────────── */

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    setPausedLine(null);
    addLog(
      "▶ Debug-Session gestartet" + (activeFile ? ` — ${activeFile.name}` : ""),
      "info",
    );
    setTimeout(() => {
      addLog("Ausführung läuft…", "system");
      const sortedBreakpoints = [...breakpoints].sort((a, b) => a - b);
      const firstBreakpointLine = sortedBreakpoints[0] || null;
      const pauseLine = firstBreakpointLine || firstSyntaxError?.startLineNumber || null;
      if (pauseLine) {
        setTimeout(() => {
          setIsPaused(true);
          setPausedLine(pauseLine);
          if (firstBreakpointLine) {
            addLog(`⏸ Breakpoint bei Zeile ${pauseLine} getroffen`, "warn");
          } else {
            addLog(`⏸ Syntax-Fehler bei Zeile ${pauseLine}: ${firstSyntaxError?.message || "Unbekannter Fehler"}`, "error");
          }
          addLog("Variablen wurden aktualisiert.", "system");
          setVariables((prev) =>
            prev.map((v) =>
              v.name === "result"
                ? { ...v, value: String(Math.floor(Math.random() * 100)) }
                : v,
            ),
          );
        }, 1200);
      } else {
        setTimeout(() => {
          addLog("Ausführung abgeschlossen ✓", "output");
          setIsRunning(false);
          setPausedLine(null);
        }, 1800);
      }
    }, 400);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setPausedLine(null);
    addLog("■ Debug-Session beendet", "system");
  };

  const handleContinue = () => {
    setIsPaused(false);
    addLog("▶ Fortfahren…", "info");
    setTimeout(() => {
      addLog("Ausführung abgeschlossen ✓", "output");
      setIsRunning(false);
      setPausedLine(null);
    }, 900);
  };

  const handleStepOver = () => {
    addLog("→ Schritt übersprungen", "info");
    setPausedLine((prev) => (Number.isFinite(prev) ? prev + 1 : prev));
    setVariables((prev) =>
      prev.map((v) => (v.name === "isReady" ? { ...v, value: "true" } : v)),
    );
  };

  const handleRestart = () => {
    handleStop();
    setTimeout(() => handleStart(), 200);
  };

  /* ── Console input ────────────────────────────────────────────────────── */

  const handleConsoleSubmit = () => {
    const cmd = consoleInput.trim();
    if (!cmd) return;
    addLog(`> ${cmd}`, "input");
    setConsoleInput("");

    // Simple eval simulation
    setTimeout(() => {
      if (cmd === "clear") {
        setConsoleLog([
          {
            id: ++_logId.current,
            type: "system",
            text: "Konsole geleert.",
            time: new Date().toLocaleTimeString(),
          },
        ]);
      } else if (cmd.startsWith("print ") || cmd.startsWith("console.log(")) {
        addLog(
          cmd.replace(/^(print |console\.log\()/, "").replace(/\)$/, ""),
          "output",
        );
      } else if (variables.find((v) => v.name === cmd)) {
        const v = variables.find((v) => v.name === cmd);
        addLog(`${cmd} = ${v.value} (${v.type})`, "output");
      } else {
        addLog(`[Eval] "${cmd}" → undefined`, "output");
      }
    }, 100);
  };

  /* ── Watch expressions ───────────────────────────────────────────────── */

  const handleAddWatch = () => {
    const name = watchInput.trim();
    if (!name) return;
    const existing = variables.find((v) => v.name === name);
    if (!existing) {
      setVariables((prev) => [
        ...prev,
        {
          id: Date.now(),
          name,
          value: "<not in scope>",
          type: "unknown",
          mutable: false,
          watch: true,
        },
      ]);
    }
    setWatchInput("");
    setAddingWatch(false);
    addLog(`Beobachte: ${name}`, "info");
  };

  const handleRemoveVariable = (id) => {
    setVariables((prev) => prev.filter((v) => v.id !== id));
  };

  /* ── Breakpoints ─────────────────────────────────────────────────────── */

  const handleAddBreakpoint = () => {
    const line = parseInt(newBpLine, 10);
    if (!isNaN(line) && line > 0 && !breakpoints.includes(line)) {
      setBreakpoints((prev) => [...prev, line].sort((a, b) => a - b));
      addLog(`Breakpoint gesetzt bei Zeile ${line}`, "info");
    }
    setNewBpLine("");
    setAddingBp(false);
  };

  const handleRemoveBreakpoint = (line) => {
    setBreakpoints((prev) => prev.filter((l) => l !== line));
    addLog(`Breakpoint entfernt (Zeile ${line})`, "system");
  };

  const toggleSection = (key) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <motion.div
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="w-64 flex flex-col shrink-0 overflow-hidden"
      style={{
        background: "#0c0c1d",
        borderRight: "1px solid rgba(128,0,255,0.1)",
      }}
    >
      {/* ── Panel header ─────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Bug size={13} className="text-purple-400" />
          <span className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase">
            Debug
          </span>
        </div>

        {/* Status pill */}
        <AnimatePresence mode="wait">
          {isRunning && (
            <motion.div
              key={isPaused ? "paused" : "running"}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                background: isPaused
                  ? "rgba(251,191,36,0.12)"
                  : "rgba(34,197,94,0.12)",
                border: isPaused
                  ? "1px solid rgba(251,191,36,0.25)"
                  : "1px solid rgba(34,197,94,0.25)",
                color: isPaused ? "#fbbf24" : "#22c55e",
              }}
            >
              <motion.div
                animate={!isPaused ? { opacity: [1, 0.3, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isPaused ? "#fbbf24" : "#22c55e" }}
              />
              {isPaused ? "Pausiert" : "Läuft"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div
        className="mx-3 mb-1 shrink-0"
        style={{ height: "1px", background: "rgba(128,0,255,0.08)" }}
      />

      {/* ── Scrollable body ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Controls */}
        <SectionHeader
          icon={Zap}
          title="Steuerung"
          expanded={sections.controls}
          onToggle={() => toggleSection("controls")}
        >
          <div className="px-3 pb-3 flex items-center gap-1.5 flex-wrap">
            {/* Start / Stop */}
            {!isRunning ? (
              <motion.button
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #8000ff, #0033ff)",
                  boxShadow: "0 0 12px rgba(128,0,255,0.3)",
                }}
              >
                <Play size={11} /> Starten
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#f87171",
                }}
              >
                <Square size={11} /> Stop
              </motion.button>
            )}

            {/* Continue (only when paused) */}
            {isPaused && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleContinue}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  color: "#4ade80",
                }}
                title="Fortfahren"
              >
                <SkipForward size={11} />
              </motion.button>
            )}

            {/* Step Over */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStepOver}
              disabled={!isRunning && !isPaused}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: isRunning ? "#9ca3af" : "#374151",
                cursor: isRunning ? "pointer" : "not-allowed",
              }}
              title="Schritt überspringen"
            >
              <StepForward size={11} />
            </motion.button>

            {/* Restart */}
            <motion.button
              whileHover={{ scale: 1.05, rotate: -180 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={handleRestart}
              disabled={!isRunning}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: isRunning ? "#9ca3af" : "#374151",
                cursor: isRunning ? "pointer" : "not-allowed",
              }}
              title="Neustart"
            >
              <RotateCcw size={11} />
            </motion.button>
          </div>

          {/* Active file indicator */}
          {activeFile && (
            <div
              className="mx-3 mb-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
              style={{
                background: "rgba(128,0,255,0.06)",
                border: "1px solid rgba(128,0,255,0.12)",
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: isRunning ? "#22c55e" : "#374151",
                  boxShadow: isRunning ? "0 0 6px #22c55e" : "none",
                }}
              />
              <span className="text-[11px] text-gray-400 font-mono truncate">
                {activeFile.name}
              </span>
            </div>
          )}
          {firstSyntaxError && (
            <div
              className="mx-3 mb-3 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <AlertTriangle size={11} className="text-red-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-red-300 font-semibold">
                  Syntax-Fehler bei Zeile {firstSyntaxError.startLineNumber}
                </p>
                <p className="text-[10px] text-red-200/80 truncate">
                  {firstSyntaxError.message}
                </p>
              </div>
            </div>
          )}
        </SectionHeader>

        {/* ── Variables / Watch ───────────────────────────────────────── */}
        <SectionHeader
          icon={Eye}
          title="Variablen"
          count={variables.length}
          expanded={sections.variables}
          onToggle={() => toggleSection("variables")}
        >
          <div className="pb-1">
            <AnimatePresence mode="popLayout">
              {variables.map((v) => (
                <motion.div
                  key={v.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2 px-3 py-1 group hover:bg-white/[0.03] transition-colors"
                >
                  <TypeBadge type={v.type} />
                  <span className="text-xs text-gray-300 font-mono shrink-0">
                    {v.name}
                  </span>
                  <span className="text-xs text-gray-500 truncate font-mono flex-1 text-right">
                    {v.value}
                  </span>
                  {v.watch && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1, scale: 1.15 }}
                      onClick={() => handleRemoveVariable(v.id)}
                      className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-red-500/10 transition-opacity"
                    >
                      <X size={9} className="text-red-400" />
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add watch expression */}
            <AnimatePresence>
              {addingWatch ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 py-1.5 flex items-center gap-1.5"
                >
                  <input
                    autoFocus
                    value={watchInput}
                    onChange={(e) => setWatchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddWatch();
                      if (e.key === "Escape") {
                        setAddingWatch(false);
                        setWatchInput("");
                      }
                    }}
                    placeholder="variablenname…"
                    className="flex-1 bg-transparent text-xs font-mono text-gray-300 outline-none placeholder:text-gray-700 min-w-0"
                    style={{
                      borderBottom: "1px solid rgba(128,0,255,0.3)",
                      paddingBottom: "1px",
                    }}
                  />
                  <button
                    onClick={() => {
                      setAddingWatch(false);
                      setWatchInput("");
                    }}
                  >
                    <X
                      size={10}
                      className="text-gray-600 hover:text-gray-400"
                    />
                  </button>
                </motion.div>
              ) : (
                <button
                  onClick={() => setAddingWatch(true)}
                  className="flex items-center gap-1 px-3 py-1 text-[10px] text-gray-600 hover:text-purple-400 transition-colors"
                >
                  <Plus size={10} /> Ausdruck beobachten
                </button>
              )}
            </AnimatePresence>
          </div>
        </SectionHeader>

        {/* ── Call Stack ──────────────────────────────────────────────── */}
        <SectionHeader
          icon={Layers}
          title="Call Stack"
          count={callstack.length}
          expanded={sections.callstack}
          onToggle={() => toggleSection("callstack")}
        >
          <div className="pb-1">
            {callstack.map((frame, i) => (
              <motion.div
                key={frame.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-2 px-3 py-1.5 group cursor-pointer hover:bg-white/[0.03] transition-colors"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: frame.active ? "#a855f7" : "#374151",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-mono truncate"
                    style={{ color: frame.active ? "#c084fc" : "#9ca3af" }}
                  >
                    {frame.fn}
                  </p>
                  <p className="text-[10px] text-gray-600 truncate">
                    {frame.file}:{frame.line}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </SectionHeader>

        {/* ── Breakpoints ─────────────────────────────────────────────── */}
        <SectionHeader
          icon={Circle}
          title="Breakpoints"
          count={breakpoints.length}
          expanded={sections.breakpoints}
          onToggle={() => toggleSection("breakpoints")}
        >
          <div className="pb-1">
            <AnimatePresence mode="popLayout">
              {breakpoints.map((line) => (
                <motion.div
                  key={line}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2 px-3 py-1 group hover:bg-white/[0.03] transition-colors"
                >
                  <motion.div
                    animate={{
                      scale: isRunning && !isPaused ? [1, 1.16, 1] : 1,
                      opacity: isRunning && !isPaused ? [0.78, 1, 0.78] : 1,
                    }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-red-500 shrink-0"
                    style={{ willChange: "transform, opacity" }}
                  />
                  <span className="text-xs text-gray-400 font-mono flex-1">
                    Zeile <span className="text-gray-200">{line}</span>
                  </span>
                  {activeFile && (
                    <span className="text-[10px] text-gray-600 truncate max-w-20">
                      {activeFile.name}
                    </span>
                  )}
                  <motion.button
                    initial={{ opacity: 0 }}
                    whileHover={{ scale: 1.15 }}
                    onClick={() => handleRemoveBreakpoint(line)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/10 transition-opacity"
                  >
                    <X size={10} className="text-red-400" />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add breakpoint */}
            <AnimatePresence>
              {addingBp ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Circle size={10} className="text-red-400 shrink-0" />
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    value={newBpLine}
                    onChange={(e) => setNewBpLine(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddBreakpoint();
                      if (e.key === "Escape") {
                        setAddingBp(false);
                        setNewBpLine("");
                      }
                    }}
                    placeholder="Zeilennummer…"
                    className="flex-1 bg-transparent text-xs font-mono text-gray-300 outline-none placeholder:text-gray-700 min-w-0"
                    style={{
                      borderBottom: "1px solid rgba(239,68,68,0.3)",
                      paddingBottom: "1px",
                    }}
                  />
                  <button
                    onClick={() => {
                      setAddingBp(false);
                      setNewBpLine("");
                    }}
                  >
                    <X
                      size={10}
                      className="text-gray-600 hover:text-gray-400"
                    />
                  </button>
                </motion.div>
              ) : (
                <button
                  onClick={() => setAddingBp(true)}
                  className="flex items-center gap-1 px-3 py-1 text-[10px] text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Plus size={10} /> Breakpoint hinzufügen
                </button>
              )}
            </AnimatePresence>
          </div>
        </SectionHeader>

        {/* ── Debug Console ───────────────────────────────────────────── */}
        <SectionHeader
          icon={Terminal}
          title="Konsole"
          expanded={sections.console}
          onToggle={() => toggleSection("console")}
        >
          {/* Log output */}
          <div
            className="mx-3 mb-2 rounded-lg overflow-hidden"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.05)",
              maxHeight: "140px",
            }}
          >
            <div className="overflow-y-auto max-h-36 p-2 space-y-0.5 font-mono">
              <AnimatePresence>
                {consoleLog.map((entry) => {
                  const style =
                    CONSOLE_STYLES[entry.type] || CONSOLE_STYLES.output;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-start gap-1.5 leading-relaxed"
                    >
                      {style.icon && (
                        <span
                          className="shrink-0 mt-0.5"
                          style={{ color: style.color }}
                        >
                          {style.icon}
                        </span>
                      )}
                      <span
                        className="text-[10px] break-all flex-1"
                        style={{ color: style.color }}
                      >
                        {entry.text}
                      </span>
                      <span className="text-[9px] text-gray-700 shrink-0 mt-0.5 ml-1">
                        {entry.time}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={consoleEndRef} />
            </div>
          </div>

          {/* Console input */}
          <div
            className="mx-3 mb-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-purple-400 text-xs font-mono shrink-0"
            >
              {">"}
            </motion.span>
            <input
              ref={consoleInputRef}
              value={consoleInput}
              onChange={(e) => setConsoleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConsoleSubmit();
              }}
              placeholder="Ausdruck eingeben…"
              className="flex-1 bg-transparent text-[11px] font-mono text-gray-300 outline-none placeholder:text-gray-700 min-w-0"
            />
            {consoleInput && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setConsoleInput("")}
              >
                <X size={9} className="text-gray-600" />
              </motion.button>
            )}
          </div>
        </SectionHeader>
      </div>

      {/* ── Footer status ─────────────────────────────────────────────── */}
      <div
        className="px-3 py-2 shrink-0 flex items-center gap-2"
        style={{ borderTop: "1px solid rgba(128,0,255,0.08)" }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: isRunning
              ? isPaused
                ? "#fbbf24"
                : "#22c55e"
              : "#374151",
            boxShadow: isRunning
              ? isPaused
                ? "0 0 5px #fbbf24"
                : "0 0 5px #22c55e"
              : "none",
          }}
        />
        <span className="text-[10px] text-gray-600">
          {!isRunning
            ? "Bereit"
            : isPaused
              ? `Pausiert — Zeile ${pausedLine ?? breakpoints[0] ?? "?"}`
              : "Läuft…"}
        </span>
        {breakpoints.length > 0 && (
          <>
            <span className="text-[10px] text-gray-700 mx-0.5">·</span>
            <span className="text-[10px] text-red-400/60">
              {breakpoints.length} BP
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
}
