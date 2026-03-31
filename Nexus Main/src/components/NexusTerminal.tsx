import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTerminal } from "../store/terminalStore";
import { useTheme } from "../store/themeStore";
import { useApp } from "../store/appStore";
import { shallow } from "zustand/shallow";
import {
  X,
  ChevronRight,
  Terminal as TerminalIcon,
  Maximize2,
  Minimize2,
  Command,
  Sparkles,
} from "lucide-react";

interface NexusTerminalProps {
  setView: (v: any) => void;
}

const COMMAND_CATALOG = [
  "help",
  "views",
  "goto dashboard",
  "goto notes",
  "goto code",
  "goto tasks",
  "goto reminders",
  "goto canvas",
  "canvas list",
  "canvas new project-map",
  "canvas template roadmap Product Launch",
  "canvas focus",
  "spotlight",
  "search ",
  "new note",
  "new task",
  "new reminder",
  "theme list",
  "theme macOS Dark",
  "profile focus",
  "profile cinematic",
  "stats",
  "today",
  "calc ",
  "macro list",
  "macro start daily-flow",
  "macro stop",
  "macro run daily-flow",
  "undo",
  "redo",
  "history",
  "clear",
];

const QUICK_COMMANDS = [
  "help",
  "search focus",
  "today",
  "theme list",
  "macro list",
  "undo",
  "redo",
  "spotlight note: ",
  "calc 12*7",
  "clear",
];

export function NexusTerminal({ setView }: NexusTerminalProps) {
  const {
    isOpen,
    history,
    executeCommand,
    setOpen,
    clearHistory,
    macros,
    recordingMacro,
    undoStack,
    redoStack,
  } = useTerminal(
    (s) => ({
      isOpen: s.isOpen,
      history: s.history,
      executeCommand: s.executeCommand,
      setOpen: s.setOpen,
      clearHistory: s.clearHistory,
      macros: s.macros,
      recordingMacro: s.recordingMacro,
      undoStack: s.undoStack,
      redoStack: s.redoStack,
    }),
    shallow,
  );
  const t = useTheme();
  const [input, setInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = t.mode === "dark";

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, isMinimized]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;
      setInputHistory((prev) => [trimmed, ...prev].slice(0, 60));
      setHistoryIdx(-1);
      executeCommand(trimmed, { setView, t, app: useApp.getState() });
      setInput("");
    },
    [input, executeCommand, setView, t],
  );

  const runCommand = useCallback(
    (cmd: string) => {
      executeCommand(cmd, { setView, t, app: useApp.getState() });
    },
    [executeCommand, setView, t],
  );

  const suggestedCommands = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return [];
    return COMMAND_CATALOG.filter((cmd) =>
      cmd.toLowerCase().startsWith(q),
    ).slice(0, 4);
  }, [input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const nextIdx = Math.min(historyIdx + 1, inputHistory.length - 1);
        setHistoryIdx(nextIdx);
        setInput(inputHistory[nextIdx] ?? "");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIdx = Math.max(historyIdx - 1, -1);
        setHistoryIdx(nextIdx);
        setInput(nextIdx === -1 ? "" : (inputHistory[nextIdx] ?? ""));
      } else if (e.key === "Tab") {
        const first = suggestedCommands[0];
        if (first) {
          e.preventDefault();
          setInput(first);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      } else if (
        (e.key.toLowerCase() === "l" || e.key.toLowerCase() === "k") &&
        e.ctrlKey
      ) {
        e.preventDefault();
        clearHistory();
      }
    },
    [historyIdx, inputHistory, setOpen, clearHistory, suggestedCommands],
  );

  if (!isOpen) return null;

  const getLineColor = (type: string) => {
    if (!isDark) {
      switch (type) {
        case "error":
          return "#c22f1b";
        case "success":
          return "#0f7f3b";
        case "warn":
          return "#9a5d00";
        case "input":
          return "#15161b";
        default:
          return "rgba(28,30,42,0.75)";
      }
    }

    switch (type) {
      case "error":
        return "#FF453A";
      case "success":
        return t.accent;
      case "warn":
        return "#FF9F0A";
      case "input":
        return "#ffffff";
      default:
        return "rgba(255,255,255,0.78)";
    }
  };

  const getLinePrefix = (type: string) => {
    if (type === "input")
      return <span style={{ color: t.accent, opacity: 0.9 }}>❯</span>;
    if (type === "error")
      return <span style={{ color: "#FF453A", opacity: 0.85 }}>✗</span>;
    if (type === "success")
      return <span style={{ color: "#30D158", opacity: 0.85 }}>✓</span>;
    if (type === "warn")
      return <span style={{ color: "#FF9F0A", opacity: 0.85 }}>⚠</span>;
    return <span style={{ opacity: isDark ? 0.2 : 0.3 }}>•</span>;
  };

  const terminalHeight = isMinimized ? 46 : 360;

  const commandCount = useMemo(
    () =>
      history.reduce(
        (count, line) => (line.type === "input" ? count + 1 : count),
        0,
      ),
    [history],
  );
  const macroNames = useMemo(() => Object.keys(macros), [macros]);
  const visibleHistory = useMemo(
    () =>
      history.slice(-120).map((line) => ({
        ...line,
        timeLabel: new Date(line.timestamp).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      })),
    [history],
  );

  return (
    <AnimatePresence>
      <motion.div
        key="nexus-terminal"
        initial={{ opacity: 0, y: 20, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.985 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        style={{
          position: "fixed",
          bottom: 22,
          left: "30%",
          transform: "translateX(-50%)",
          width: "min(calc(100vw - 40px), 920px)",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            height: terminalHeight,
            transition: "height 220ms cubic-bezier(0.2,0.8,0.2,1)",
            display: "flex",
            flexDirection: "column",
            borderRadius: 18,
            overflow: "hidden",
            background: isDark
              ? "rgba(10,12,20,0.92)"
              : "rgba(248,250,255,0.92)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            border: isDark
              ? "1px solid rgba(255,255,255,0.12)"
              : "1px solid rgba(19,20,28,0.12)",
            boxShadow: isDark
              ? `0 36px 90px rgba(0,0,0,0.62), 0 0 0 1px rgba(255,255,255,0.05), 0 0 26px ${t.accent}22`
              : `0 26px 70px rgba(24,28,42,0.2), 0 0 0 1px rgba(255,255,255,0.7), 0 0 20px ${t.accent}18`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 14px",
              flexShrink: 0,
              borderBottom: isMinimized
                ? "none"
                : isDark
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid rgba(0,0,0,0.08)",
              background: isDark
                ? "rgba(0,0,0,0.32)"
                : "rgba(255,255,255,0.55)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
                  <div
                    key={i}
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: c,
                    }}
                  />
                ))}
              </div>

              <div
                style={{
                  padding: "3px 8px",
                  borderRadius: 7,
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(0,0,0,0.08)",
                  background: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <TerminalIcon size={11} style={{ color: t.accent }} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    opacity: 0.65,
                  }}
                >
                  Nexus Terminal
                </span>
              </div>

              {!isMinimized && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 10,
                    opacity: 0.52,
                  }}
                >
                  <Command size={10} /> Ctrl+L clear
                  <span style={{ opacity: 0.36 }}>·</span>
                  <span>{commandCount} cmds</span>
                  <span style={{ opacity: 0.36 }}>·</span>
                  <span>{undoStack.length} undo</span>
                  <span style={{ opacity: 0.36 }}>·</span>
                  <span>{redoStack.length} redo</span>
                  {recordingMacro && (
                    <>
                      <span style={{ opacity: 0.36 }}>·</span>
                      <span style={{ color: "#FF9F0A" }}>
                        REC {recordingMacro}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={clearHistory}
                title="Clear (Ctrl+L)"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  opacity: 0.5,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                CLEAR
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  opacity: 0.6,
                  padding: "4px 6px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {isMinimized ? (
                  <Maximize2 size={13} />
                ) : (
                  <Minimize2 size={13} />
                )}
              </button>
              <button
                onClick={() => setOpen(false)}
                title="Close (Esc)"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)",
                  padding: "4px 6px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div
                ref={scrollRef}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
                  padding: "14px 16px 8px",
                  fontFamily:
                    "'Fira Code', 'JetBrains Mono', 'SFMono-Regular', monospace",
                  fontSize: 12,
                  lineHeight: 1.64,
                  background: isDark
                    ? "rgba(0,0,0,0.28)"
                    : "rgba(255,255,255,0.56)",
                  minHeight: 0,
                  maxHeight: "100%",
                }}
              >
                {visibleHistory.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      opacity: isDark ? 0.14 : 0.24,
                    }}
                  >
                    <TerminalIcon size={34} />
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                      }}
                    >
                      Ready
                    </div>
                  </div>
                ) : (
                  visibleHistory.map((line, i) => (
                    <div
                      key={`${line.timestamp}-${i}`}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          width: 14,
                          display: "flex",
                          alignItems: "center",
                          paddingTop: 1,
                        }}
                      >
                        {getLinePrefix(line.type)}
                      </span>
                      <span
                        style={{
                          color: getLineColor(line.type),
                          textShadow:
                            line.type === "success"
                              ? `0 0 8px ${t.accent}55`
                              : "none",
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {line.text}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          opacity: 0.28,
                          flexShrink: 0,
                          paddingTop: 2,
                        }}
                      >
                        {line.timeLabel}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div
                style={{
                  borderTop: isDark
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(0,0,0,0.08)",
                  background: isDark
                    ? "rgba(0,0,0,0.44)"
                    : "rgba(255,255,255,0.65)",
                  padding: "8px 14px 10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginBottom: 8,
                    overflowX: "auto",
                  }}
                >
                  {QUICK_COMMANDS.map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => {
                        runCommand(cmd);
                        setInputHistory((prev) => [cmd, ...prev].slice(0, 60));
                      }}
                      style={{
                        border: isDark
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid rgba(0,0,0,0.08)",
                        background: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.04)",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        color: "inherit",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        padding: "4px 9px",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        opacity: 0.74,
                      }}
                    >
                      <Sparkles size={10} /> {cmd}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginBottom: 8,
                    overflowX: "auto",
                  }}
                >
                  <button
                    onClick={() =>
                      runCommand(
                        recordingMacro
                          ? "macro stop"
                          : "macro start quick-flow",
                      )
                    }
                    style={{
                      border: recordingMacro
                        ? "1px solid rgba(255,159,10,0.45)"
                        : isDark
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid rgba(0,0,0,0.08)",
                      background: recordingMacro
                        ? "rgba(255,159,10,0.14)"
                        : isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.04)",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      color: recordingMacro ? "#FF9F0A" : "inherit",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      padding: "4px 9px",
                    }}
                  >
                    {recordingMacro ? `Stop ${recordingMacro}` : "Start macro"}
                  </button>
                  <button
                    onClick={() => runCommand("macro list")}
                    style={{
                      border: isDark
                        ? "1px solid rgba(255,255,255,0.1)"
                        : "1px solid rgba(0,0,0,0.08)",
                      background: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "inherit",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      padding: "4px 9px",
                    }}
                  >
                    Macros ({macroNames.length})
                  </button>
                  {macroNames.slice(0, 4).map((name) => (
                    <button
                      key={`macro-${name}`}
                      onClick={() => runCommand(`macro run ${name}`)}
                      style={{
                        border: isDark
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid rgba(0,0,0,0.08)",
                        background: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.04)",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        color: "inherit",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        padding: "4px 9px",
                      }}
                    >
                      ▶ {name}
                    </button>
                  ))}
                </div>

                {suggestedCommands.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginBottom: 8,
                      overflowX: "auto",
                    }}
                  >
                    {suggestedCommands.map((cmd) => (
                      <button
                        key={cmd}
                        onClick={() => setInput(cmd)}
                        style={{
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.12)"
                            : "1px solid rgba(0,0,0,0.1)",
                          background: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.04)",
                          borderRadius: 8,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "inherit",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          padding: "3px 7px",
                          opacity: 0.72,
                        }}
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <ChevronRight
                    size={14}
                    style={{ color: t.accent, flexShrink: 0 }}
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type command... (help)"
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: isDark ? "#f5f7ff" : "#1a1c26",
                      minWidth: 0,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {["TAB", "↑↓", "ENTER"].map((k) => (
                      <kbd
                        key={k}
                        style={{
                          padding: "2px 6px",
                          borderRadius: 5,
                          fontSize: 9,
                          fontWeight: 800,
                          background: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.06)",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.12)"
                            : "1px solid rgba(0,0,0,0.1)",
                          color: isDark
                            ? "rgba(255,255,255,0.4)"
                            : "rgba(0,0,0,0.5)",
                        }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
