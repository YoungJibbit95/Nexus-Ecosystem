import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Play,
  Copy,
  Plus,
  Trash2,
  Save,
  X,
  FileCode,
  ChevronDown,
  ChevronRight,
  Terminal,
  Download,
  Search,
  RotateCcw,
  Columns,
  Eye,
  Edit3,
  Loader,
  Clock,
} from "lucide-react";
import { Glass } from "../components/Glass";
import { NexusMarkdown } from "../components/NexusMarkdown";
import { useApp, CodeFile } from "../store/appStore";
import { useTheme } from "../store/themeStore";
import { hexToRgb } from "../lib/utils";
import { ensureMonacoWorkers } from "../lib/monacoWorkers";
import { motion, AnimatePresence } from "framer-motion";
import { shallow } from "zustand/shallow";

// ─────────────────────────────────────────────
// Language registry
// ─────────────────────────────────────────────
const LANGS = [
  {
    id: "javascript",
    label: "JavaScript",
    ext: "js",
    color: "#F7DF1E",
    hello: `// JavaScript\nconsole.log("Hello, World!")\nconsole.log("2 + 2 =", 2 + 2)\n\nconst nums = [1,2,3,4,5]\nconsole.log("squares:", nums.map(x => x * x))\nconsole.log("sum:", nums.reduce((a,b) => a+b, 0))\n\nconst greet = name => \`Hello, \${name}!\`\nconsole.log(greet("Nexus"))`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    ext: "ts",
    color: "#3178C6",
    hello: `// TypeScript\ninterface Person { name: string; age: number }\n\nconst greet = (p: Person): string => \`Hi \${p.name}, age \${p.age}!\`\n\nconst people: Person[] = [\n  { name: "Alice", age: 30 },\n  { name: "Bob",   age: 25 },\n]\n\npeople.forEach(p => console.log(greet(p)))\nconsole.log("Total:", people.length)`,
  },
  {
    id: "python",
    label: "Python",
    ext: "py",
    color: "#3572A5",
    hello: `# Python\nprint("Hello, World!")\nprint(f"2 + 2 = {2 + 2}")\n\nnums = [1, 2, 3, 4, 5]\nprint("squares:", [x**2 for x in nums])\nprint("sum:", sum(nums))\n\nfor i in range(3):\n    print(f"  loop {i}")`,
  },
  {
    id: "html",
    label: "HTML",
    ext: "html",
    color: "#E34C26",
    hello: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Hello</title>\n  <style>\n    body { font-family: system-ui; background: #0a0a14; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }\n    h1 { background: linear-gradient(135deg, #007AFF, #5E5CE6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }\n  </style>\n</head>\n<body>\n  <div>\n    <h1>Hello, World!</h1>\n    <p>Edit this HTML preview →</p>\n  </div>\n</body>\n</html>`,
  },
  {
    id: "css",
    label: "CSS",
    ext: "css",
    color: "#563d7c",
    hello: `/* CSS Preview */\nbody {\n  background: linear-gradient(135deg, #0a0a14 0%, #1a1a2e 100%);\n  min-height: 100vh;\n  margin: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-family: system-ui, sans-serif;\n  color: white;\n}\n\n.card {\n  padding: 2rem;\n  border-radius: 16px;\n  background: rgba(255,255,255,0.08);\n  backdrop-filter: blur(20px);\n  border: 1px solid rgba(255,255,255,0.12);\n  text-align: center;\n}`,
  },
  {
    id: "json",
    label: "JSON",
    ext: "json",
    color: "#8bc34a",
    hello: `{\n  "name": "Nexus v5.0",\n  "version": "5.0.0",\n  "features": [\n    "Code Editor",\n    "Canvas",\n    "Tasks",\n    "Reminders"\n  ],\n  "settings": {\n    "theme": "Deep Space",\n    "glow": true,\n    "blur": 20\n  }\n}`,
  },
  {
    id: "markdown",
    label: "Markdown",
    ext: "md",
    color: "#083fa1",
    hello: `# Hello World\n\nThis is a **Markdown** preview with *live rendering*.\n\n## Features\n\n- ✅ Live preview\n- ✅ Syntax highlighting\n- ✅ GFM tables\n\n## Code\n\n\`\`\`js\nconsole.log("Hello!")\n\`\`\`\n\n## Table\n\n| Name | Value |\n|------|-------|\n| Alpha | 1 |\n| Beta | 2 |`,
  },
  {
    id: "java",
    label: "Java",
    ext: "java",
    color: "#b07219",
    hello: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n        \n        int sum = 0;\n        for (int i = 1; i <= 10; i++) {\n            sum += i;\n        }\n        System.out.println("Sum 1-10: " + sum);\n        \n        String[] fruits = {"Apple", "Banana", "Cherry"};\n        for (String f : fruits) {\n            System.out.println("  - " + f);\n        }\n    }\n}`,
  },
  {
    id: "cpp",
    label: "C++",
    ext: "cpp",
    color: "#f34b7d",
    hello: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    \n    vector<int> nums = {1, 2, 3, 4, 5};\n    int sum = 0;\n    for (int n : nums) {\n        sum += n;\n        cout << n * n << " ";\n    }\n    cout << endl;\n    cout << "Sum: " << sum << endl;\n    return 0;\n}`,
  },
  {
    id: "rust",
    label: "Rust",
    ext: "rs",
    color: "#dea584",
    hello: `fn main() {\n    println!("Hello, World!");\n    \n    let nums: Vec<i32> = (1..=5).collect();\n    let squares: Vec<i32> = nums.iter().map(|x| x * x).collect();\n    \n    println!("squares: {:?}", squares);\n    println!("sum: {}", nums.iter().sum::<i32>());\n}`,
  },
  {
    id: "go",
    label: "Go",
    ext: "go",
    color: "#00ADD8",
    hello: `package main\n\nimport (\n    "fmt"\n    "math"\n)\n\nfunc main() {\n    fmt.Println("Hello, World!")\n    \n    nums := []int{1, 2, 3, 4, 5}\n    sum := 0\n    for _, n := range nums {\n        sum += n\n        fmt.Printf("sqrt(%d) = %.2f\\n", n, math.Sqrt(float64(n)))\n    }\n    fmt.Printf("Sum: %d\\n", sum)\n}`,
  },
  {
    id: "bash",
    label: "Bash",
    ext: "sh",
    color: "#89e051",
    hello: `#!/bin/bash\necho "Hello, World!"\n\nfor i in {1..5}; do\n    echo "  Item $i"\ndone\n\necho "Done!"`,
  },
  {
    id: "sql",
    label: "SQL",
    ext: "sql",
    color: "#e38c00",
    hello: `-- Create table\nCREATE TABLE users (\n    id INTEGER PRIMARY KEY,\n    name TEXT NOT NULL,\n    email TEXT UNIQUE,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Insert data\nINSERT INTO users (name, email) VALUES\n    ('Alice', 'alice@example.com'),\n    ('Bob',   'bob@example.com');\n\n-- Query\nSELECT id, name, email\nFROM users\nORDER BY name ASC;`,
  },
  {
    id: "plaintext",
    label: "Text",
    ext: "txt",
    color: "#888888",
    hello: `Plain text file.\nWrite anything here.`,
  },
];

const getLang = (id: string) => LANGS.find((l) => l.id === id) ?? LANGS[0];

// ─────────────────────────────────────────────
// Execution engine
// ─────────────────────────────────────────────

function prettyVal(val: any, depth = 0): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "string") return val;
  if (typeof val === "function") return `[Function: ${val.name || "fn"}]`;
  if (val instanceof Error) return `${val.name}: ${val.message}`;
  if (depth > 3) return String(val);
  try {
    return JSON.stringify(val, null, depth < 2 ? 2 : undefined);
  } catch {
    return String(val);
  }
}

function runJS(code: string): string {
  const lines: string[] = [];
  const mock = {
    log: (...a: any[]) => lines.push(a.map((v) => prettyVal(v)).join(" ")),
    warn: (...a: any[]) =>
      lines.push("⚠️  " + a.map((v) => prettyVal(v)).join(" ")),
    error: (...a: any[]) =>
      lines.push("❌  " + a.map((v) => prettyVal(v)).join(" ")),
    info: (...a: any[]) =>
      lines.push("ℹ️  " + a.map((v) => prettyVal(v)).join(" ")),
    table: (data: any) => {
      try {
        lines.push(JSON.stringify(data, null, 2));
      } catch {
        lines.push(String(data));
      }
    },
    dir: (data: any) => {
      try {
        lines.push(JSON.stringify(data, null, 2));
      } catch {
        lines.push(String(data));
      }
    },
    assert: (cond: boolean, ...msg: any[]) => {
      if (!cond) lines.push("❌  Assertion failed: " + msg.join(" "));
    },
    group: (l = "") => lines.push(`▸ ${l}`),
    groupEnd: () => {},
    time: (l = "") => lines.push(`⏱  Timer "${l}" started`),
    timeEnd: (l = "") => lines.push(`⏱  Timer "${l}" ended`),
    count: (l = "default") => lines.push(`#  ${l}: 1`),
    clear: () => {
      lines.length = 0;
    },
  };
  try {
    const fn = new Function(
      "console",
      "Math",
      "JSON",
      "Array",
      "Object",
      "String",
      "Number",
      "Boolean",
      "Date",
      "RegExp",
      "Map",
      "Set",
      "WeakMap",
      "WeakSet",
      "Promise",
      "Symbol",
      "parseInt",
      "parseFloat",
      "isNaN",
      "isFinite",
      "encodeURIComponent",
      "decodeURIComponent",
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      `"use strict";\n${code}`,
    );
    const result = fn(
      mock,
      Math,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Date,
      RegExp,
      Map,
      Set,
      WeakMap,
      WeakSet,
      Promise,
      Symbol,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      (fn: Function, ms: number) => {
        lines.push(`⏳  setTimeout(${ms}ms) — async not available in sandbox`);
      },
      () => {},
      (fn: Function, ms: number) => {
        lines.push(`⏳  setInterval(${ms}ms) — async not available in sandbox`);
      },
      () => {},
    );
    if (result !== undefined && lines.length === 0)
      lines.push(prettyVal(result));
  } catch (e: any) {
    lines.push(`❌  ${e.name}: ${e.message}`);
    const stack = (e.stack || "")
      .split("\n")
      .find((l: string) => l.includes("<anonymous>") || l.includes("Function"));
    if (stack) lines.push("   " + stack.trim());
  }
  return lines.length ? lines.join("\n") : "✓  (no output)";
}

function runJSON(code: string): string {
  try {
    const parsed = JSON.parse(code);
    const lines = [
      `✓  Valid JSON`,
      `📊  ${Array.isArray(parsed) ? `Array[${parsed.length}]` : typeof parsed === "object" && parsed ? `Object{${Object.keys(parsed).length} keys}` : typeof parsed}`,
      "",
      JSON.stringify(parsed, null, 2),
    ];
    return lines.join("\n");
  } catch (e: any) {
    const match = e.message.match(/position (\d+)/);
    const pos = match ? parseInt(match[1]) : -1;
    const lines = [`❌  Invalid JSON: ${e.message}`];
    if (pos >= 0) {
      const before = code.slice(Math.max(0, pos - 20), pos);
      const after = code.slice(pos, pos + 20);
      lines.push(`   ...${before}▶${after}...`);
    }
    return lines.join("\n");
  }
}

function simulateLang(lang: string, code: string): string {
  const runtimes: Record<string, string> = {
    python: "Python interpreter",
    java: "JDK",
    cpp: "g++",
    c: "gcc",
    rust: "rustc",
    go: "Go compiler",
    bash: "bash",
  };
  const header = `ℹ️  ${lang} requires ${runtimes[lang] || "a runtime"} — showing best-effort simulation.\n\n`;

  switch (lang) {
    case "python": {
      const out: string[] = [];
      for (const line of code.split("\n")) {
        const m = line.match(/^(\s*)print\s*\((.+)\)\s*$/);
        if (m) {
          const inner = m[2].trim();
          try {
            out.push(String(new Function(`return ${inner}`)()));
            continue;
          } catch {}
          // f-string: rough eval
          const fstr = inner.match(/^f["'](.*?)["']$/);
          if (fstr) {
            out.push(
              fstr[1].replace(/\{([^}]+)\}/g, (_, e) => {
                try {
                  return String(new Function(`return ${e}`)());
                } catch {
                  return `{${e}}`;
                }
              }),
            );
            continue;
          }
          out.push(inner.replace(/^["']|["']$/g, ""));
        }
      }
      return (
        header + (out.length ? out.join("\n") : "(no print() calls found)")
      );
    }
    case "java": {
      const out = [
        ...code.matchAll(/System\.out\.print(?:ln)?\s*\(\s*(.*?)\s*\)\s*;/g),
      ].map((m) => {
        try {
          return String(new Function(`return ${m[1]}`)());
        } catch {
          return m[1].replace(/['"]/g, "");
        }
      });
      return (
        header +
        (out.length ? out.join("\n") : "(no System.out.println() calls found)")
      );
    }
    case "cpp":
    case "c": {
      const couts = [
        ...code.matchAll(/cout\s*<<\s*(.*?)\s*(?:<<\s*(?:endl|"\\n")|\s*;)/g),
      ]
        .map((m) => m[1].replace(/"/g, "").replace(/\\n/g, "").trim())
        .filter((s) => s && s !== "endl" && s !== "\\n");
      const printfs = [...code.matchAll(/printf\s*\(\s*"(.*?)"/g)].map((m) =>
        m[1].replace(/\\n/g, "").replace(/%[sdif]/g, "?"),
      );
      return (
        header + ([...couts, ...printfs].join("\n") || "(no cout/printf found)")
      );
    }
    case "rust": {
      const out = [
        ...code.matchAll(/println!\s*\(\s*"(.*?)"(?:,\s*(.*?))?\s*\)/g),
      ].map((m) => {
        let s = m[1];
        if (m[2]) s = s.replace("{}", m[2]).replace("{:?}", m[2]);
        return s;
      });
      return (
        header + (out.length ? out.join("\n") : "(no println!() calls found)")
      );
    }
    case "go": {
      const out = [
        ...code.matchAll(/fmt\.Print(?:ln|f)?\s*\(\s*(.*?)\s*\)/g),
      ].map((m) => m[1].replace(/"/g, "").split(",")[0].trim());
      return (
        header + (out.length ? out.join("\n") : "(no fmt.Print calls found)")
      );
    }
    case "bash": {
      const out = [...code.matchAll(/^echo\s+["']?([^"'\n]+)["']?/gm)].map(
        (m) => m[1],
      );
      return header + (out.length ? out.join("\n") : "(no echo calls found)");
    }
    case "sql":
      return (
        `ℹ️  SQL requires a database connection.\n\n📋  Statements detected:\n` +
        code
          .replace(/--[^\n]*/g, "")
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => `  ●  ${s.slice(0, 60)}${s.length > 60 ? "..." : ""}`)
          .join("\n")
      );
    default:
      return `ℹ️  No runtime available for "${lang}" in this sandbox.\n\nCode length: ${code.length} chars`;
  }
}

async function executeCode(file: CodeFile): Promise<string> {
  switch (file.lang) {
    case "javascript":
    case "typescript":
      return runJS(file.content);
    case "json":
      return runJSON(file.content);
    case "html":
      return `🌐  HTML preview available in the Preview tab.\n\n✓  Parsed: ${(file.content.match(/<[a-z][^>]*>/gi) || []).length} HTML tags`;
    case "css":
      return `🎨  CSS preview available in the Preview tab.\n\n✓  Rules: ${(file.content.match(/\{[^}]*\}/g) || []).length}`;
    case "markdown":
      return `📝  Markdown preview available in the Preview tab.\n\n✓  Headings: ${(file.content.match(/^#{1,6}\s/gm) || []).length}`;
    default:
      return simulateLang(file.lang, file.content);
  }
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function ToolBtn({
  onClick,
  title,
  icon,
  active,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  const t = useTheme();
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? `rgba(${hexToRgb(t.accent)},0.15)` : "none",
        border: "none",
        cursor: "pointer",
        color: active ? t.accent : "inherit",
        opacity: active ? 1 : 0.5,
        padding: "5px 7px",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = active ? "1" : "0.5";
        e.currentTarget.style.background = active
          ? `rgba(${hexToRgb(t.accent)},0.15)`
          : "none";
      }}
    >
      {icon}
    </button>
  );
}

function RunBtn({
  running,
  onClick,
  accent,
}: {
  running: boolean;
  onClick: () => void;
  accent: string;
}) {
  const rgb = hexToRgb(accent);
  return (
    <button
      onClick={onClick}
      disabled={running}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 14px",
        borderRadius: 8,
        background: running ? `rgba(${rgb},0.18)` : accent,
        border: "none",
        cursor: running ? "not-allowed" : "pointer",
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
        boxShadow: running ? "none" : `0 2px 12px rgba(${rgb},0.4)`,
        transition: "all 0.15s",
        opacity: running ? 0.7 : 1,
      }}
    >
      {running ? (
        <Loader size={13} className="nx-spin" />
      ) : (
        <Play size={13} fill="currentColor" />
      )}
      {running ? "Running…" : "Run"}
    </button>
  );
}

function FileTab({
  file,
  active,
  onSelect,
  onClose,
}: {
  file: CodeFile;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const lang = getLang(file.lang);
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 10px 0 12px",
        cursor: "pointer",
        flexShrink: 0,
        maxWidth: 180,
        minHeight: 38,
        borderRight: "1px solid rgba(255,255,255,0.06)",
        borderBottom: active
          ? `2px solid ${t.accent}`
          : "2px solid transparent",
        background: active ? "rgba(255,255,255,0.07)" : "transparent",
        transition: "all 0.12s",
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          color: lang.color,
          letterSpacing: 0.3,
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {lang.ext}
      </span>
      <span
        style={{
          fontSize: 12,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          opacity: active ? 1 : 0.6,
        }}
      >
        {file.dirty && (
          <span style={{ color: t.accent, marginRight: 3 }}>●</span>
        )}
        {file.name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          opacity: 0.3,
          padding: "2px 1px",
          display: "flex",
          borderRadius: 3,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.3")}
      >
        <X size={12} />
      </button>
    </div>
  );
}

function OutLine({ text }: { text: string }) {
  const color = text.startsWith("❌")
    ? "#ff453a"
    : text.startsWith("⚠️")
      ? "#ffd60a"
      : text.startsWith("ℹ️")
        ? "#64d2ff"
        : text.startsWith("✓")
          ? "#30d158"
          : undefined;
  return (
    <div
      style={{
        fontFamily: "'Fira Code',monospace",
        fontSize: 12.5,
        lineHeight: 1.65,
        color,
        opacity: color ? 1 : 0.85,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        padding: "0.5px 0",
      }}
    >
      {text}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export function CodeView() {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const {
    codes,
    activeCodeId,
    openCodeIds,
    addCode,
    updateCode,
    delCode,
    setCode,
    openCode,
    closeCode,
    saveCode,
  } = useApp(
    (s) => ({
      codes: s.codes,
      activeCodeId: s.activeCodeId,
      openCodeIds: s.openCodeIds,
      addCode: s.addCode,
      updateCode: s.updateCode,
      delCode: s.delCode,
      setCode: s.setCode,
      openCode: s.openCode,
      closeCode: s.closeCode,
      saveCode: s.saveCode,
    }),
    shallow,
  );

  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [outOpen, setOutOpen] = useState(true);
  const [outH, setOutH] = useState(220);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState("javascript");
  const [preview, setPreview] = useState<"editor" | "split" | "preview">(
    "editor",
  );
  const [copiedOut, setCopiedOut] = useState(false);
  const [editorFailed, setEditorFailed] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [MonacoEditorComponent, setMonacoEditorComponent] = useState<any>(null);
  const [monacoLoading, setMonacoLoading] = useState(false);
  const [previewDocFrame, setPreviewDocFrame] = useState("");
  const monacoLoadTokenRef = useRef(0);
  const outRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ y: number; h: number } | null>(null);

  const openFiles = openCodeIds
    .map((id) => codes.find((c) => c.id === id))
    .filter(Boolean) as CodeFile[];
  const active = codes.find((c) => c.id === activeCodeId);
  const activeCodeKey = active?.id ?? null;
  const lang = active ? getLang(active.lang) : null;
  const hasPreview =
    active && ["html", "css", "markdown"].includes(active.lang);
  const previewDoc = useMemo(() => {
    if (!active) return "";
    if (active.lang === "css") {
      return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#0b1020;color:#e5e7eb;font-family:system-ui,sans-serif}body{padding:20px}${active.content}</style></head><body><div class="card"><h1>CSS Preview</h1><p>Your styles are applied to this sandbox.</p></div></body></html>`;
    }
    if (active.lang === "html") {
      const hasHtmlTag = /<html[\s>]/i.test(active.content);
      if (hasHtmlTag) return active.content;
      return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#0b1020;color:#e5e7eb;font-family:system-ui,sans-serif}</style></head><body>${active.content}</body></html>`;
    }
    return "";
  }, [active]);

  useEffect(() => {
    if (preview !== "split" && preview !== "preview") {
      setPreviewDocFrame(previewDoc);
      return;
    }
    const timer = window.setTimeout(() => {
      setPreviewDocFrame(previewDoc);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [preview, previewDoc]);

  useEffect(() => {
    if (!hasPreview && preview !== "editor") {
      setPreview("editor");
    }
  }, [hasPreview, preview]);

  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
  }, [output]);

  useEffect(() => {
    if (editorFailed || !active) return;
    if (preview === "preview") return;
    if (MonacoEditorComponent || monacoLoading) return;

    let cancelled = false;
    const loadToken = ++monacoLoadTokenRef.current;
    setMonacoLoading(true);
    const timeout = window.setTimeout(() => {
      if (cancelled || monacoLoadTokenRef.current !== loadToken) return;
      setEditorFailed(true);
      setEditorError("Monaco load timed out");
      setMonacoLoading(false);
    }, 10_000);
    void (async () => {
      try {
        ensureMonacoWorkers();
        const [editorModule, monacoModule] = await Promise.all([
          import("@monaco-editor/react"),
          import("monaco-editor"),
        ]);
        const monacoNs = (monacoModule as any).default ?? monacoModule;
        editorModule.loader.config({ monaco: monacoNs });
        if (!cancelled && monacoLoadTokenRef.current === loadToken) {
          setMonacoEditorComponent(() => editorModule.default);
          setEditorFailed(false);
          setEditorError(null);
        }
      } catch (error) {
        if (!cancelled && monacoLoadTokenRef.current === loadToken) {
          setEditorFailed(true);
          setEditorError(error instanceof Error ? error.message : "Monaco import failed");
        }
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled && monacoLoadTokenRef.current === loadToken) {
          setMonacoLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [MonacoEditorComponent, activeCodeKey, editorFailed, preview]);

  const run = useCallback(async () => {
    if (!active) return;
    setRunning(true);
    setOutOpen(true);
    setOutput(["▶  Executing…", ""]);
    setElapsed(null);
    await new Promise((r) => setTimeout(r, 40));
    const t0 = performance.now();
    const result = await executeCode(active);
    setElapsed(performance.now() - t0);
    setOutput(result.split("\n"));
    setRunning(false);
  }, [active]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && active) {
        e.preventDefault();
        saveCode(active.id);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [run, saveCode, active]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { y: e.clientY, h: outH };
    const mv = (e: MouseEvent) => {
      if (dragRef.current)
        setOutH(
          Math.max(
            60,
            Math.min(600, dragRef.current.h + dragRef.current.y - e.clientY),
          ),
        );
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  };

  const createFile = () => {
    if (!newName.trim()) return;
    const l = getLang(newLang);
    const fname = newName.includes(".") ? newName : newName + "." + l.ext;
    const f = addCode(fname, newLang);
    updateCode(f.id, { content: l.hello });
    setNewOpen(false);
    setNewName("");
  };

  const sideFiles = codes.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCopyOut = () => {
    navigator.clipboard.writeText(output.join("\n"));
    setCopiedOut(true);
    setTimeout(() => setCopiedOut(false), 1500);
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ── Sidebar ─────────────────────────────────────── */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(0,0,0,0.14)",
        }}
      >
        <div
          style={{
            padding: "12px 10px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              opacity: 0.4,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Explorer
          </span>
          <div style={{ display: "flex", gap: 2 }}>
            <ToolBtn
              onClick={() => setSearchOpen((s) => !s)}
              title="Search files"
              icon={<Search size={13} />}
              active={searchOpen}
            />
            <ToolBtn
              onClick={() => setNewOpen(true)}
              title="New file"
              icon={<Plus size={13} />}
            />
          </div>
        </div>
        {searchOpen && (
          <div style={{ padding: "0 8px 8px" }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter…"
              style={{
                width: "100%",
                padding: "5px 8px",
                borderRadius: 7,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                outline: "none",
                fontSize: 12,
                color: "inherit",
              }}
            />
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 6px" }}>
          {sideFiles.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 24,
                fontSize: 12,
                opacity: 0.3,
              }}
            >
              No files
            </div>
          )}
          {sideFiles.map((f) => {
            const l = getLang(f.lang);
            const isA = f.id === activeCodeId;
            return (
              <div
                key={f.id}
                onClick={() => {
                  openCode(f.id);
                  setCode(f.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 8px",
                  borderRadius: 8,
                  cursor: "pointer",
                  marginBottom: 2,
                  background: isA ? `rgba(${rgb},0.12)` : "transparent",
                  border: isA
                    ? `1px solid rgba(${rgb},0.22)`
                    : "1px solid transparent",
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isA)
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!isA) e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: l.color,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                    width: 26,
                    flexShrink: 0,
                  }}
                >
                  {l.ext}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    opacity: isA ? 1 : 0.65,
                  }}
                >
                  {f.dirty && <span style={{ color: t.accent }}>● </span>}
                  {f.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${f.name}"?`)) delCode(f.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#ff453a",
                    opacity: 0,
                    padding: "2px 3px",
                    borderRadius: 4,
                    transition: "opacity 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
        <div
          style={{
            padding: "8px 12px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: 11,
            opacity: 0.3,
          }}
        >
          {codes.length} file{codes.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Editor area ─────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Tab strip */}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.12)",
            overflowX: "auto",
            flexShrink: 0,
            minHeight: 38,
          }}
        >
          {openFiles.length === 0 ? (
            <div
              style={{
                padding: "0 14px",
                display: "flex",
                alignItems: "center",
                fontSize: 12,
                opacity: 0.3,
              }}
            >
              Open a file →
            </div>
          ) : (
            openFiles.map((f) => (
              <FileTab
                key={f.id}
                file={f}
                active={f.id === activeCodeId}
                onSelect={() => setCode(f.id)}
                onClose={() => closeCode(f.id)}
              />
            ))
          )}
          <div style={{ flex: 1 }} />
          {active && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                padding: "0 8px",
                flexShrink: 0,
              }}
            >
              {hasPreview && (
                <div
                  style={{
                    display: "flex",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 7,
                    overflow: "hidden",
                    marginRight: 6,
                  }}
                >
                  {(["editor", "split", "preview"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPreview(m)}
                      style={{
                        padding: "5px 8px",
                        background: preview === m ? t.accent : "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: preview === m ? "#fff" : "inherit",
                        opacity: preview === m ? 1 : 0.5,
                        transition: "all 0.12s",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {m === "editor" ? (
                        <Edit3 size={11} />
                      ) : m === "split" ? (
                        <Columns size={11} />
                      ) : (
                        <Eye size={11} />
                      )}
                    </button>
                  ))}
                </div>
              )}
              <ToolBtn
                onClick={() => navigator.clipboard.writeText(active.content)}
                title="Copy code"
                icon={<Copy size={13} />}
              />
              <ToolBtn
                onClick={() => {
                  const b = new Blob([active.content], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(b);
                  a.download = active.name;
                  a.click();
                }}
                title="Download"
                icon={<Download size={13} />}
              />
              <ToolBtn
                onClick={() => saveCode(active.id)}
                title="Save (Ctrl+S)"
                icon={<Save size={13} />}
                active={active.dirty}
              />
              <RunBtn running={running} onClick={run} accent={t.accent} />
            </div>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {!active ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                opacity: 0.55,
              }}
            >
              <FileCode
                size={52}
                strokeWidth={1}
                style={{ color: t.accent, opacity: 0.4 }}
              />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
                  No file open
                </div>
                <div style={{ fontSize: 13, opacity: 0.6 }}>
                  Select from sidebar or create a new file
                </div>
              </div>
              <button
                onClick={() => setNewOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "9px 20px",
                  borderRadius: 10,
                  background: t.accent,
                  border: "none",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  boxShadow: `0 4px 18px rgba(${rgb},0.4)`,
                }}
              >
                <Plus size={14} /> New File
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  overflow: "hidden",
                  minHeight: 0,
                }}
              >
                {/* Editor */}
                {(preview === "editor" || preview === "split") && (
                  <div
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      minWidth: 0,
                      position: "relative",
                    }}
                  >
                    {editorFailed ? (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          minHeight: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "8px 12px",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,69,58,0.08)",
                          }}
                        >
                          <span style={{ fontSize: 11, opacity: 0.82 }}>
                            Monaco konnte nicht geladen werden. Fallback-Editor aktiv.
                            {editorError ? ` (${editorError})` : ""}
                          </span>
                          <button
                            onClick={() => {
                              setEditorFailed(false);
                              setEditorError(null);
                              setMonacoEditorComponent(null);
                            }}
                            style={{
                              border: "none",
                              borderRadius: 8,
                              padding: "6px 10px",
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#fff",
                              background: t.accent,
                            }}
                          >
                            Monaco neu laden
                          </button>
                        </div>
                        <textarea
                          value={active.content}
                          onChange={(e) =>
                            updateCode(active.id, {
                              content: e.target.value,
                              dirty: true,
                            })
                          }
                          style={{
                            width: "100%",
                            flex: 1,
                            minHeight: 0,
                            padding: "14px 16px",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            resize: "none",
                            fontSize: t.editor.fontSize || 13,
                            lineHeight: 1.65,
                            fontFamily: "'Fira Code','JetBrains Mono',monospace",
                            color: "inherit",
                            tabSize: t.editor.tabSize || 2,
                          }}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                              e.preventDefault();
                              run();
                            }
                            if (e.key === "Tab") {
                              e.preventDefault();
                              const s = e.currentTarget;
                              const i = s.selectionStart;
                              const spaces = "  ";
                              s.value =
                                s.value.slice(0, i) +
                                spaces +
                                s.value.slice(s.selectionEnd);
                              s.selectionStart = s.selectionEnd =
                                i + spaces.length;
                              updateCode(active.id, {
                                content: s.value,
                                dirty: true,
                              });
                            }
                          }}
                          spellCheck={false}
                        />
                      </div>
                    ) : MonacoEditorComponent ? (
                      <MonacoEditorComponent
                        height="100%"
                        language={active.lang}
                        value={active.content}
                        onChange={(v: string | undefined) =>
                          updateCode(active.id, {
                            content: v ?? "",
                            dirty: true,
                          })
                        }
                        theme={t.mode === "light" ? "vs" : "vs-dark"}
                        loading={
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              height: "100%",
                              flexDirection: "column",
                              gap: 12,
                              opacity: 0.5,
                            }}
                          >
                            <Loader
                              size={20}
                              className="nx-spin"
                              style={{ color: t.accent }}
                            />
                            <span style={{ fontSize: 12 }}>
                              Editor wird geladen…
                            </span>
                          </div>
                        }
                        options={{
                          fontSize: t.editor.fontSize || 13,
                          fontFamily:
                            t.editor.fontFamily ||
                            "'Fira Code','JetBrains Mono',monospace",
                          fontLigatures: true,
                          minimap: { enabled: t.editor.minimap },
                          lineNumbers: t.editor.lineNumbers ? "on" : "off",
                          wordWrap: t.editor.wordWrap ? "on" : "off",
                          scrollBeyondLastLine: false,
                          renderLineHighlight: "gutter",
                          padding: { top: 14, bottom: 14 },
                          smoothScrolling: true,
                          cursorBlinking: t.editor.cursorAnimation
                            ? "smooth"
                            : "blink",
                          cursorSmoothCaretAnimation: "on" as any,
                          bracketPairColorization: { enabled: true },
                          guides: { bracketPairs: "active" as any },
                          quickSuggestions: true,
                          formatOnPaste: true,
                          tabSize: t.editor.tabSize || 2,
                          scrollbar: {
                            verticalScrollbarSize: 6,
                            horizontalScrollbarSize: 6,
                          },
                          overviewRulerLanes: 0,
                          hideCursorInOverviewRuler: true,
                          renderFinalNewline: "on" as any,
                        }}
                        onMount={(editor: any, monacoInstance: any) => {
                          editor.addCommand(
                            monacoInstance.KeyMod.CtrlCmd |
                              monacoInstance.KeyCode.Enter,
                            () => run(),
                          );
                          editor.addCommand(
                            monacoInstance.KeyMod.CtrlCmd |
                              monacoInstance.KeyCode.KeyS,
                            () => active && saveCode(active.id),
                          );
                          setTimeout(() => editor.focus(), 50);
                        }}
                        onValidate={() => {}}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          flexDirection: "column",
                          gap: 12,
                          opacity: 0.5,
                        }}
                      >
                        <Loader
                          size={20}
                          className="nx-spin"
                          style={{ color: t.accent }}
                        />
                        <span style={{ fontSize: 12 }}>
                          {monacoLoading
                            ? "Editor wird geladen…"
                            : "Editor wird vorbereitet…"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {/* Preview */}
                {(preview === "split" || preview === "preview") && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      borderLeft: "1px solid rgba(255,255,255,0.07)",
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        padding: "6px 14px",
                        background: "rgba(0,0,0,0.14)",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        fontSize: 10,
                        fontWeight: 700,
                        opacity: 0.4,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                        flexShrink: 0,
                      }}
                    >
                      Preview — {lang?.label}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
                      {active.lang === "markdown" ? (
                        <div
                          style={{
                            height: "100%",
                            overflowY: "auto",
                            padding: "20px 24px",
                            color: "inherit",
                          }}
                        >
                          <NexusMarkdown content={active.content} />
                        </div>
                      ) : (
                        <iframe
                          srcDoc={previewDocFrame}
                          style={{
                            width: "100%",
                            height: "100%",
                            border: "none",
                            background: t.mode === "dark" ? "#0b1020" : "#ffffff",
                            display: "block",
                          }}
                          sandbox="allow-scripts"
                          title="Preview"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Output panel */}
              <div style={{ flexShrink: 0 }}>
                <div
                  onMouseDown={startDrag}
                  style={{
                    height: 5,
                    cursor: "ns-resize",
                    background: "rgba(255,255,255,0.04)",
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = `rgba(${rgb},0.25)`)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.04)")
                  }
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 14px",
                    height: 36,
                    background: "rgba(0,0,0,0.2)",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <button
                    onClick={() => setOutOpen((s) => !s)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "inherit",
                      opacity: 0.55,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    <Terminal size={12} />
                    Terminal
                    {outOpen ? (
                      <ChevronDown size={11} />
                    ) : (
                      <ChevronRight size={11} />
                    )}
                  </button>
                  {elapsed !== null && (
                    <span
                      style={{
                        fontSize: 10,
                        opacity: 0.35,
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <Clock size={9} />
                      {elapsed.toFixed(1)}ms
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={handleCopyOut}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      opacity: 0.4,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 10,
                      color: copiedOut ? t.accent : "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.opacity = "0.4")
                    }
                  >
                    {copiedOut ? (
                      <>
                        <span>✓</span> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={9} /> Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setOutput([])}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      opacity: 0.4,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 10,
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.opacity = "0.4")
                    }
                  >
                    <RotateCcw size={9} /> Clear
                  </button>
                  <RunBtn running={running} onClick={run} accent={t.accent} />
                </div>

                {outOpen && (
                  <div
                    ref={outRef}
                    style={{
                      height: outH,
                      overflowY: "auto",
                      padding: "10px 16px 12px",
                      background: "rgba(0,0,0,0.28)",
                    }}
                  >
                    {output.length === 0 ? (
                      <div
                        style={{
                          opacity: 0.25,
                          fontSize: 12,
                          fontFamily: "monospace",
                        }}
                      >
                        Ctrl+Enter to run…
                      </div>
                    ) : (
                      output.map((line, i) => <OutLine key={i} text={line} />)
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── New file modal ──────────────────────────────── */}
      <AnimatePresence>
        {newOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
              backdropFilter: "blur(6px)",
            }}
            onClick={() => setNewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Glass style={{ width: 420, padding: 24 }} glow>
                <div
                  style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}
                >
                  New File
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.5,
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    File name
                  </div>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createFile()}
                    placeholder="main.js"
                    style={{
                      width: "100%",
                      padding: "8px 11px",
                      borderRadius: 9,
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      outline: "none",
                      fontSize: 13,
                      color: "inherit",
                    }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.5,
                      marginBottom: 8,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Language
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4,1fr)",
                      gap: 6,
                    }}
                  >
                    {LANGS.filter((l) => l.id !== "plaintext").map((l) => (
                      <button
                        key={l.id}
                        onClick={() => {
                          setNewLang(l.id);
                          const base = newName.split(".")[0] || "main";
                          setNewName(base + "." + l.ext);
                        }}
                        style={{
                          padding: "7px 4px",
                          borderRadius: 8,
                          border: `1px solid ${newLang === l.id ? l.color : "rgba(255,255,255,0.08)"}`,
                          background:
                            newLang === l.id ? `${l.color}22` : "transparent",
                          cursor: "pointer",
                          fontSize: 10,
                          fontWeight: 700,
                          color: newLang === l.id ? l.color : "inherit",
                          transition: "all 0.12s",
                        }}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setNewOpen(false)}
                    style={{
                      flex: 1,
                      padding: "9px",
                      borderRadius: 9,
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "inherit",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createFile}
                    style={{
                      flex: 1,
                      padding: "9px",
                      borderRadius: 9,
                      background: t.accent,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Create
                  </button>
                </div>
              </Glass>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
