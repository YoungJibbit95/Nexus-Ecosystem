import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bug,
  Circle,
  Eye,
  Info,
  Layers,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SkipForward,
  Square,
  StepForward,
  Terminal,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  PANEL_INPUT_CLASS,
  PANEL_SELECT_CLASS,
  PanelBadge,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelNotice,
  PanelSection,
  PanelShell,
  PanelState,
} from "./panels/PanelChrome.jsx";

const DEBUG_CONFIGS = [
  { id: "web", label: "Web App", adapter: "Chrome", args: "--open-devtools" },
  { id: "node", label: "Node Runtime", adapter: "Node", args: "--inspect" },
  { id: "tests", label: "Vitest", adapter: "Test Runner", args: "--runInBand" },
];

const INITIAL_VARIABLES = [
  { id: 1, name: "result", value: "42", type: "number", mutable: true },
  { id: 2, name: "message", value: '"Hello, World!"', type: "string", mutable: true },
  { id: 3, name: "isReady", value: "true", type: "boolean", mutable: false },
  { id: 4, name: "items", value: "[1, 2, 3, 4, 5]", type: "array", mutable: true },
  { id: 5, name: "config", value: "{ debug: false }", type: "object", mutable: true },
];

const INITIAL_CONSOLE = [
  { id: 1, type: "system", text: "Nexus Debug Session bereit", time: "10:00:00" },
  { id: 2, type: "info", text: "Setze Breakpoints und starte die Session.", time: "10:00:00" },
];

const MAX_STACK_FRAMES = 4;

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
  system: { color: "#7b8496", icon: null },
  info: { color: "#60a5fa", icon: Info },
  warn: { color: "#fbbf24", icon: AlertTriangle },
  error: { color: "#f87171", icon: AlertTriangle },
  output: { color: "#67e8f9", icon: null },
  input: { color: "#c084fc", icon: null },
};

function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] || TYPE_COLORS.unknown;
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
      style={{ background: `${color}20`, color }}
    >
      {type}
    </span>
  );
}

function DebugButton({ children, onClick, disabled, tone = "muted", title }) {
  const styles =
    tone === "run"
      ? {
          color: "#ffffff",
          background: "linear-gradient(135deg, var(--nexus-primary, #7c8cff), #38bdf8)",
          border: "rgba(125,140,255,0.34)",
          shadow: "0 0 14px rgba(56,189,248,0.18)",
        }
      : tone === "stop"
        ? {
            color: "#fca5a5",
            background: "rgba(239,68,68,0.12)",
            border: "rgba(239,68,68,0.24)",
            shadow: "none",
          }
        : tone === "continue"
          ? {
              color: "#67e8f9",
              background: "rgba(34,211,238,0.09)",
              border: "rgba(34,211,238,0.2)",
              shadow: "none",
            }
          : {
              color: disabled ? "#4b5563" : "#cbd5e1",
              background: "rgba(255,255,255,0.045)",
              border: "rgba(255,255,255,0.08)",
              shadow: "none",
            };

  return (
    <motion.button
      type="button"
      whileHover={!disabled ? { y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-8 min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border px-2 py-1 text-[11px] font-semibold leading-none transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
      style={{
        color: styles.color,
        background: styles.background,
        borderColor: styles.border,
        boxShadow: styles.shadow,
      }}
    >
      {children}
    </motion.button>
  );
}

function ConsoleEntry({ entry }) {
  const style = CONSOLE_STYLES[entry.type] || CONSOLE_STYLES.output;
  const Icon = style.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.14 }}
      className="flex min-w-0 items-start gap-1.5 leading-relaxed"
    >
      {Icon ? <Icon size={10} className="mt-0.5 shrink-0" style={{ color: style.color }} /> : null}
      <span className="min-w-0 flex-1 break-words text-[10px]" style={{ color: style.color }}>
        {entry.text}
      </span>
      <span className="ml-1 mt-0.5 shrink-0 text-[9px] text-gray-700">{entry.time}</span>
    </motion.div>
  );
}

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
  const [launchConfig, setLaunchConfig] = useState("web");
  const [runtimeArgs, setRuntimeArgs] = useState(DEBUG_CONFIGS[0].args);
  const [breakOnErrors, setBreakOnErrors] = useState(true);
  const [sections, setSections] = useState({
    configuration: true,
    controls: true,
    variables: true,
    callstack: false,
    breakpoints: true,
    console: true,
  });

  const consoleEndRef = useRef(null);
  const logIdRef = useRef(INITIAL_CONSOLE.length);

  const syntaxErrors = useMemo(
    () => (Array.isArray(problems) ? problems : []).filter((item) => Number(item?.severity) === 8),
    [problems],
  );
  const firstSyntaxError = syntaxErrors[0] || null;
  const activeFileName = activeFile?.name || "No active file";
  const watches = variables.filter((item) => item.watch);
  const selectedConfig = DEBUG_CONFIGS.find((item) => item.id === launchConfig) || DEBUG_CONFIGS[0];
  const sessionHeading = !activeFile
    ? "Waiting for a file"
    : isPaused
      ? `Paused at line ${pausedLine ?? "?"}`
      : isRunning
        ? "Debug session running"
        : firstSyntaxError
          ? "Diagnostics need attention"
          : "Ready to launch";
  const sessionDetail = !activeFile
    ? "Open a file to enable the debug adapter."
    : isPaused
      ? "Inspect variables, step over, or continue the current frame."
      : isRunning
        ? "Runtime output is streaming to the debug console."
        : firstSyntaxError
          ? `${firstSyntaxError.message}`
          : `${selectedConfig.label} will start against ${activeFileName}.`;

  const callstack = useMemo(() => {
    if (!isRunning && !isPaused) return [];
    const activeLine = Number(pausedLine || breakpoints[0] || 1);
    const fileName = activeFile?.name || "untitled";
    return [
      { id: 1, fn: activeFile ? `run(${fileName})` : "run()", file: fileName, line: activeLine, active: true },
      { id: 2, fn: "dispatch()", file: "runtime/debug-adapter", line: 44, active: false },
      { id: 3, fn: "eventLoop()", file: "runtime/scheduler", line: 18, active: false },
      { id: 4, fn: "<entry>", file: fileName, line: 1, active: false },
    ].slice(0, MAX_STACK_FRAMES);
  }, [activeFile, breakpoints, isPaused, isRunning, pausedLine]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [consoleLog]);

  const addLog = useCallback((text, type = "output") => {
    const now = new Date().toLocaleTimeString("de-DE", { hour12: false });
    logIdRef.current += 1;
    setConsoleLog((prev) => [
      ...prev,
      { id: logIdRef.current, type, text, time: now },
    ].slice(-80));
  }, []);

  const handleStart = () => {
    if (!activeFile) {
      addLog("Keine aktive Datei fuer die Debug-Session.", "warn");
      return;
    }
    setIsRunning(true);
    setIsPaused(false);
    setPausedLine(null);
    addLog(
      `${selectedConfig.label} gestartet: ${activeFile.name}${runtimeArgs ? ` ${runtimeArgs}` : ""}`,
      "info",
    );
    window.setTimeout(() => {
      addLog("Ausfuehrung laeuft", "system");
      const sortedBreakpoints = [...breakpoints].sort((a, b) => a - b);
      const firstBreakpointLine = sortedBreakpoints[0] || null;
      const pauseLine =
        firstBreakpointLine || (breakOnErrors ? firstSyntaxError?.startLineNumber : null) || null;
      if (pauseLine) {
        window.setTimeout(() => {
          setIsPaused(true);
          setPausedLine(pauseLine);
          if (firstBreakpointLine) {
            addLog(`Breakpoint bei Zeile ${pauseLine} getroffen`, "warn");
          } else {
            addLog(
              `Fehler bei Zeile ${pauseLine}: ${firstSyntaxError?.message || "Unbekannter Fehler"}`,
              "error",
            );
          }
          setVariables((prev) =>
            prev.map((item) =>
              item.name === "result"
                ? { ...item, value: String(Math.floor(Math.random() * 100)) }
                : item,
            ),
          );
        }, 900);
      } else {
        window.setTimeout(() => {
          addLog("Ausfuehrung abgeschlossen", "output");
          setIsRunning(false);
          setPausedLine(null);
        }, 1200);
      }
    }, 300);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setPausedLine(null);
    addLog("Debug-Session beendet", "system");
  };

  const handlePause = () => {
    if (!isRunning || isPaused) return;
    const nextLine = pausedLine || breakpoints[0] || firstSyntaxError?.startLineNumber || 1;
    setIsPaused(true);
    setPausedLine(nextLine);
    addLog(`Angehalten bei Zeile ${nextLine}`, "warn");
  };

  const handleContinue = () => {
    setIsPaused(false);
    addLog("Fortfahren", "info");
    window.setTimeout(() => {
      addLog("Ausfuehrung abgeschlossen", "output");
      setIsRunning(false);
      setPausedLine(null);
    }, 700);
  };

  const handleStepOver = () => {
    if (!isPaused) return;
    addLog("Step over", "info");
    setPausedLine((prev) => (Number.isFinite(prev) ? prev + 1 : prev));
    setVariables((prev) =>
      prev.map((item) =>
        item.name === "isReady" ? { ...item, value: item.value === "true" ? "false" : "true" } : item,
      ),
    );
  };

  const handleRestart = () => {
    handleStop();
    window.setTimeout(() => handleStart(), 180);
  };

  const handleConsoleSubmit = () => {
    const command = consoleInput.trim();
    if (!command) return;
    addLog(`> ${command}`, "input");
    setConsoleInput("");

    window.setTimeout(() => {
      if (command === "clear") {
        logIdRef.current += 1;
        setConsoleLog([
          {
            id: logIdRef.current,
            type: "system",
            text: "Konsole geleert.",
            time: new Date().toLocaleTimeString("de-DE", { hour12: false }),
          },
        ]);
        return;
      }

      const variable = variables.find((item) => item.name === command);
      if (variable) {
        addLog(`${command} = ${variable.value} (${variable.type})`, "output");
        return;
      }

      if (command === "help") {
        addLog("Commands: clear, vars, help, <variable>, print <value>", "system");
        return;
      }

      if (command === "vars") {
        addLog(variables.map((item) => `${item.name}=${item.value}`).join(", "), "output");
        return;
      }

      if (command.startsWith("print ") || command.startsWith("console.log(")) {
        addLog(command.replace(/^(print |console\.log\()/, "").replace(/\)$/, ""), "output");
        return;
      }

      addLog(`[Eval] "${command}" -> undefined`, "output");
    }, 100);
  };

  const handleAddWatch = () => {
    const name = watchInput.trim();
    if (!name) return;
    const existing = variables.find((item) => item.name === name);
    if (existing) {
      setVariables((prev) =>
        prev.map((item) => (item.id === existing.id ? { ...item, watch: true } : item)),
      );
    } else {
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
    addLog(`Watch: ${name}`, "info");
  };

  const clearConsole = () => {
    logIdRef.current += 1;
    setConsoleLog([
      {
        id: logIdRef.current,
        type: "system",
        text: "Konsole geleert.",
        time: new Date().toLocaleTimeString("de-DE", { hour12: false }),
      },
    ]);
  };

  const handleRemoveVariable = (id) => {
    setVariables((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddBreakpoint = () => {
    const line = parseInt(newBpLine, 10);
    if (!Number.isNaN(line) && line > 0 && !breakpoints.includes(line)) {
      setBreakpoints((prev) => [...prev, line].sort((a, b) => a - b));
      addLog(`Breakpoint gesetzt: Zeile ${line}`, "info");
    }
    setNewBpLine("");
    setAddingBp(false);
  };

  const handleRemoveBreakpoint = (line) => {
    setBreakpoints((prev) => prev.filter((item) => item !== line));
    addLog(`Breakpoint entfernt: Zeile ${line}`, "system");
  };

  const toggleSection = (key) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfigChange = (value) => {
    const nextConfig = DEBUG_CONFIGS.find((item) => item.id === value) || DEBUG_CONFIGS[0];
    setLaunchConfig(nextConfig.id);
    setRuntimeArgs(nextConfig.args);
  };

  const statusLabel = !activeFile
    ? "No File"
    : isPaused
      ? "Paused"
      : isRunning
        ? "Running"
        : firstSyntaxError
          ? "Issues"
          : "Ready";
  const statusTone = !activeFile
    ? "muted"
    : isPaused
      ? "warning"
      : isRunning
        ? "accent"
        : firstSyntaxError
          ? "danger"
          : "muted";

  return (
    <PanelShell ariaLabel="Debug">
      <PanelHeader
        icon={Bug}
        title="Debug"
        subtitle={`${selectedConfig.label} - ${activeFileName}`}
        status={<PanelBadge tone={statusTone}>{statusLabel}</PanelBadge>}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1 rounded-lg border border-white/[0.055] bg-black/15 p-1 text-[10px] text-gray-500">
          <span className="rounded bg-white/[0.035] px-1.5 py-0.5" title="Breakpoints">
            {breakpoints.length} BP
          </span>
          <span className="rounded bg-white/[0.035] px-1.5 py-0.5" title="Watches">
            {watches.length} watch
          </span>
          <span
            className={`rounded px-1.5 py-0.5 ${
              syntaxErrors.length ? "bg-red-400/10 text-red-300/85" : "bg-sky-400/10 text-sky-300/80"
            }`}
            title="Diagnostics"
          >
            {syntaxErrors.length} err
          </span>
        </div>
      </PanelHeader>

      <PanelBody className="px-0 py-1">
        <PanelSection
          icon={Settings2}
          title="Launch Configuration"
          expanded={sections.configuration}
          onToggle={() => toggleSection("configuration")}
        >
          <div className="grid gap-2 px-3 pb-3">
            {!activeFile ? (
              <PanelNotice
                icon={Bug}
                tone="warning"
                title="Keine aktive Datei"
                detail="Waehle eine Datei im Editor, bevor du eine Debug-Session startest."
              />
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="min-w-0">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Adapter
                </span>
                <select
                  className={PANEL_SELECT_CLASS}
                  value={launchConfig}
                  onChange={(event) => handleConfigChange(event.target.value)}
                  disabled={isRunning}
                  style={{ colorScheme: "dark" }}
                >
                  {DEBUG_CONFIGS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Runtime
                </span>
                <div className="flex h-8 min-w-0 items-center rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[12px] text-gray-300">
                  <span className="truncate">
                  {selectedConfig.adapter}
                  </span>
                </div>
              </label>
            </div>
            <label className="min-w-0">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Args
              </span>
              <input
                className={PANEL_INPUT_CLASS}
                value={runtimeArgs}
                onChange={(event) => setRuntimeArgs(event.target.value)}
                placeholder="Runtime arguments"
                disabled={isRunning}
              />
            </label>
            <button
              type="button"
              onClick={() => setBreakOnErrors((value) => !value)}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-white/[0.07] bg-white/[0.035] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.055]"
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-gray-300">
                  Break on diagnostics
                </span>
                <span className="block text-[10px] text-gray-600">
                  {breakOnErrors ? "Pause bei erstem Error" : "Errors nur loggen"}
                </span>
              </span>
              <span
                className="h-4 w-8 rounded-full border p-0.5"
                style={{
                  background: breakOnErrors ? "rgba(168,85,247,0.22)" : "rgba(255,255,255,0.05)",
                  borderColor: breakOnErrors ? "rgba(168,85,247,0.35)" : "rgba(255,255,255,0.1)",
                }}
              >
                <span
                  className="block h-3 w-3 rounded-full transition-transform"
                  style={{
                    background: breakOnErrors ? "#c084fc" : "#6b7280",
                    transform: breakOnErrors ? "translateX(14px)" : "translateX(0)",
                  }}
                />
              </span>
            </button>
          </div>
        </PanelSection>

        <PanelSection
          icon={Zap}
          title="Controls"
          expanded={sections.controls}
          onToggle={() => toggleSection("controls")}
        >
          <div className="grid gap-2 px-3 pb-3">
            <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2">
              <div className="flex min-w-0 items-start gap-2">
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background: isRunning ? (isPaused ? "#fbbf24" : "#38bdf8") : firstSyntaxError ? "#f87171" : "#4b5563",
                    boxShadow: isRunning
                      ? `0 0 8px ${isPaused ? "rgba(251,191,36,0.4)" : "rgba(56,189,248,0.34)"}`
                      : "none",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-gray-200">
                    {sessionHeading}
                  </p>
                  <p className="mt-0.5 break-words text-[10px] leading-snug text-gray-600" style={{ overflowWrap: "anywhere" }}>
                    {sessionDetail}
                  </p>
                </div>
                <span className="shrink-0 rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-gray-500">
                  {selectedConfig.adapter}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {!isRunning ? (
                <DebugButton
                  onClick={handleStart}
                  disabled={!activeFile}
                  tone="run"
                  title="Start debug session"
                >
                  <Play size={13} />
                  <span className="hidden sm:inline">Start</span>
                </DebugButton>
              ) : (
                <DebugButton onClick={handleStop} tone="stop" title="Stop debug session">
                  <Square size={13} />
                  <span className="hidden sm:inline">Stop</span>
                </DebugButton>
              )}
              <DebugButton
                onClick={isPaused ? handleContinue : handlePause}
                disabled={!isRunning}
                tone={isPaused ? "continue" : "muted"}
                title={isPaused ? "Continue" : "Pause"}
              >
                {isPaused ? <SkipForward size={13} /> : <Pause size={13} />}
                <span className="hidden sm:inline">{isPaused ? "Continue" : "Pause"}</span>
              </DebugButton>
              <DebugButton onClick={handleStepOver} disabled={!isPaused} title="Step over">
                <StepForward size={13} />
                <span className="hidden sm:inline">Step</span>
              </DebugButton>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <DebugButton onClick={handleRestart} disabled={!isRunning} title="Restart">
                <RotateCcw size={13} />
                <span className="hidden sm:inline">Restart</span>
              </DebugButton>
              <DebugButton onClick={clearConsole} title="Clear debug console">
                <Trash2 size={13} />
                <span className="hidden sm:inline">Console</span>
              </DebugButton>
            </div>

            {firstSyntaxError ? (
              <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-red-300" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-red-100">
                      Fehler bei Zeile {firstSyntaxError.startLineNumber}
                    </p>
                    <p className="mt-0.5 break-words text-[10px] text-red-200/80" style={{ overflowWrap: "anywhere" }}>
                      {firstSyntaxError.message}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </PanelSection>

        <PanelSection
          icon={Eye}
          title="Variables"
          count={variables.length}
          expanded={sections.variables}
          onToggle={() => toggleSection("variables")}
        >
          <div className="pb-2">
            {variables.length === 0 ? (
              <PanelState compact title="No variables" detail="Start debugging to populate scope values." />
            ) : (
              <AnimatePresence mode="popLayout">
                {variables.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8, height: 0 }}
                    transition={{ duration: 0.16 }}
                    className="group flex min-w-0 items-center gap-2 px-3 py-1.5 transition-colors hover:bg-white/[0.035]"
                  >
                    <TypeBadge type={item.type} />
                    <span className="min-w-0 max-w-[45%] break-words font-mono text-xs text-gray-300" style={{ overflowWrap: "anywhere" }}>
                      {item.name}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-right font-mono text-xs text-gray-500" style={{ overflowWrap: "anywhere" }}>
                      {item.value}
                    </span>
                    {item.watch ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariable(item.id)}
                        className="shrink-0 rounded p-0.5 text-gray-600 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                        title={`Remove ${item.name}`}
                      >
                        <X size={11} />
                      </button>
                    ) : null}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            <AnimatePresence initial={false}>
              {addingWatch ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-[1fr_auto] gap-1.5 px-3 py-1.5"
                >
                  <input
                    autoFocus
                    value={watchInput}
                    onChange={(event) => setWatchInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleAddWatch();
                      if (event.key === "Escape") {
                        setAddingWatch(false);
                        setWatchInput("");
                      }
                    }}
                    placeholder="expression or variable"
                    className={PANEL_INPUT_CLASS}
                  />
                  <DebugButton onClick={handleAddWatch} disabled={!watchInput.trim()} title="Add watch">
                    <Plus size={13} />
                  </DebugButton>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingWatch(true)}
                  className="mx-3 mt-1 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-gray-500 transition-colors hover:bg-white/[0.04] hover:text-purple-300"
                >
                  <Plus size={11} />
                  Add watch
                </button>
              )}
            </AnimatePresence>
          </div>
        </PanelSection>

        <PanelSection
          icon={Layers}
          title="Call Stack"
          count={callstack.length}
          expanded={sections.callstack}
          onToggle={() => toggleSection("callstack")}
        >
          <div className="pb-2">
            {callstack.length === 0 ? (
              <PanelState compact title="No stack frames" detail="Run or pause a session to inspect frames." />
            ) : (
              callstack.map((frame, index) => (
                <motion.div
                  key={frame.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.035 }}
                  className="flex min-w-0 items-center gap-2 px-3 py-1.5 transition-colors hover:bg-white/[0.035]"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: frame.active ? "#a855f7" : "#4b5563" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-mono text-xs" style={{ color: frame.active ? "#d8b4fe" : "#9ca3af", overflowWrap: "anywhere" }}>
                      {frame.fn}
                    </p>
                    <p className="break-words text-[10px] text-gray-600" style={{ overflowWrap: "anywhere" }}>
                      {frame.file}:{frame.line}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </PanelSection>

        <PanelSection
          icon={Circle}
          title="Breakpoints"
          count={breakpoints.length}
          expanded={sections.breakpoints}
          onToggle={() => toggleSection("breakpoints")}
        >
          <div className="pb-2">
            {breakpoints.length === 0 ? (
              <PanelState compact title="No breakpoints" detail="Add a line breakpoint before starting." />
            ) : (
              <AnimatePresence mode="popLayout">
                {breakpoints.map((line) => (
                  <motion.div
                    key={line}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8, height: 0 }}
                    className="group flex min-w-0 items-center gap-2 px-3 py-1.5 transition-colors hover:bg-white/[0.035]"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.35)]" />
                    <span className="min-w-0 flex-1 break-words font-mono text-xs text-gray-300" style={{ overflowWrap: "anywhere" }}>
                      {activeFile?.name || "current file"}:{line}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBreakpoint(line)}
                      className="shrink-0 rounded p-0.5 text-gray-600 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                      title={`Remove breakpoint ${line}`}
                    >
                      <X size={11} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            <AnimatePresence initial={false}>
              {addingBp ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-[1fr_auto] gap-1.5 px-3 py-1.5"
                >
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    value={newBpLine}
                    onChange={(event) => setNewBpLine(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleAddBreakpoint();
                      if (event.key === "Escape") {
                        setAddingBp(false);
                        setNewBpLine("");
                      }
                    }}
                    placeholder="line"
                    className={PANEL_INPUT_CLASS}
                  />
                  <DebugButton onClick={handleAddBreakpoint} disabled={!newBpLine} title="Add breakpoint">
                    <Plus size={13} />
                  </DebugButton>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingBp(true)}
                  className="mx-3 mt-1 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-gray-500 transition-colors hover:bg-white/[0.04] hover:text-red-300"
                >
                  <Plus size={11} />
                  Add breakpoint
                </button>
              )}
            </AnimatePresence>
          </div>
        </PanelSection>

        <PanelSection
          icon={Terminal}
          title="Debug Console"
          count={consoleLog.length}
          expanded={sections.console}
          onToggle={() => toggleSection("console")}
          action={clearConsole}
          actionLabel="Clear"
        >
          <div className="grid gap-2 px-3 pb-3">
            <div className="max-h-40 overflow-y-auto rounded-lg border border-white/[0.06] bg-black/30 p-2 font-mono">
              <AnimatePresence initial={false}>
                {consoleLog.map((entry) => (
                  <ConsoleEntry key={entry.id} entry={entry} />
                ))}
              </AnimatePresence>
              <div ref={consoleEndRef} />
            </div>

            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-1.5">
              <span className="font-mono text-xs text-purple-300">{">"}</span>
              <input
                value={consoleInput}
                onChange={(event) => setConsoleInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleConsoleSubmit();
                }}
                placeholder="Evaluate expression"
                className="min-w-0 bg-transparent font-mono text-[11px] text-gray-300 outline-none placeholder:text-gray-700"
              />
              {consoleInput ? (
                <button
                  type="button"
                  onClick={() => setConsoleInput("")}
                  className="rounded p-0.5 text-gray-600 hover:bg-white/10 hover:text-gray-300"
                  title="Clear console input"
                >
                  <X size={11} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={clearConsole}
                  className="rounded p-0.5 text-gray-600 hover:bg-white/10 hover:text-gray-300"
                  title="Clear console"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </div>
        </PanelSection>
      </PanelBody>

      <PanelFooter>
        <div className="flex min-w-0 items-center gap-2 text-[10px] text-gray-500">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: isRunning ? (isPaused ? "#fbbf24" : "#38bdf8") : "#4b5563" }}
          />
          <span className="min-w-0 flex-1 break-words" style={{ overflowWrap: "anywhere" }}>
            {!isRunning ? "Debugger ready" : isPaused ? `Paused at line ${pausedLine ?? "?"}` : "Running"}
          </span>
          {breakpoints.length > 0 ? (
            <span className="shrink-0 text-red-300/70">{breakpoints.length} BP</span>
          ) : null}
        </div>
      </PanelFooter>
    </PanelShell>
  );
}
