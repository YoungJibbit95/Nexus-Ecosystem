import type { CodeFile } from "../../store/appStore";

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
      (_fn: Function, ms: number) => {
        lines.push(`⏳  setTimeout(${ms}ms) — async not available in sandbox`);
      },
      () => {},
      (_fn: Function, ms: number) => {
        lines.push(`⏳  setInterval(${ms}ms) — async not available in sandbox`);
      },
      () => {},
    );
    if (result !== undefined && lines.length === 0) {
      lines.push(prettyVal(result));
    }
  } catch (e: any) {
    lines.push(`❌  ${e.name}: ${e.message}`);
    const stack = (e.stack || "")
      .split("\n")
      .find((line: string) => line.includes("<anonymous>") || line.includes("Function"));
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
          const fstr = inner.match(/^f["'](.*?)["']$/);
          if (fstr) {
            out.push(
              fstr[1].replace(/\{([^}]+)\}/g, (_, expr) => {
                try {
                  return String(new Function(`return ${expr}`)());
                } catch {
                  return `{${expr}}`;
                }
              }),
            );
            continue;
          }
          out.push(inner.replace(/^["']|["']$/g, ""));
        }
      }
      return header + (out.length ? out.join("\n") : "(no print() calls found)");
    }
    case "java": {
      const out = [...code.matchAll(/System\.out\.print(?:ln)?\s*\(\s*(.*?)\s*\)\s*;/g)].map((m) => {
        try {
          return String(new Function(`return ${m[1]}`)());
        } catch {
          return m[1].replace(/['"]/g, "");
        }
      });
      return header + (out.length ? out.join("\n") : "(no System.out.println() calls found)");
    }
    case "cpp":
    case "c": {
      const couts = [...code.matchAll(/cout\s*<<\s*(.*?)\s*(?:<<\s*(?:endl|"\\n")|\s*;)/g)]
        .map((m) => m[1].replace(/"/g, "").replace(/\\n/g, "").trim())
        .filter((s) => s && s !== "endl" && s !== "\\n");
      const printfs = [...code.matchAll(/printf\s*\(\s*"(.*?)"/g)].map((m) =>
        m[1].replace(/\\n/g, "").replace(/%[sdif]/g, "?"),
      );
      return header + ([...couts, ...printfs].join("\n") || "(no cout/printf found)");
    }
    case "rust": {
      const out = [...code.matchAll(/println!\s*\(\s*"(.*?)"(?:,\s*(.*?))?\s*\)/g)].map((m) => {
        let s = m[1];
        if (m[2]) s = s.replace("{}", m[2]).replace("{:?}", m[2]);
        return s;
      });
      return header + (out.length ? out.join("\n") : "(no println!() calls found)");
    }
    case "go": {
      const out = [...code.matchAll(/fmt\.Print(?:ln|f)?\s*\(\s*(.*?)\s*\)/g)].map((m) =>
        m[1].replace(/"/g, "").split(",")[0].trim(),
      );
      return header + (out.length ? out.join("\n") : "(no fmt.Print calls found)");
    }
    case "bash": {
      const out = [...code.matchAll(/^echo\s+["']?([^"'\n]+)["']?/gm)].map((m) => m[1]);
      return header + (out.length ? out.join("\n") : "(no echo calls found)");
    }
    case "sql":
      return (
        `ℹ️  SQL requires a database connection.\n\n📋  Statements detected:\n` +
        code
          .replace(/--[^\n]*/g, "")
          .split(";")
          .map((statement) => statement.trim())
          .filter(Boolean)
          .map((statement) => `  ●  ${statement.slice(0, 60)}${statement.length > 60 ? "..." : ""}`)
          .join("\n")
      );
    default:
      return `ℹ️  No runtime available for "${lang}" in this sandbox.\n\nCode length: ${code.length} chars`;
  }
}

export async function executeCode(file: CodeFile): Promise<string> {
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
