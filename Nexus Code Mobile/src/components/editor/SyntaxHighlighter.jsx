import React from "react";

const tokenRules = {
  keyword: {
    pattern:
      /\b(abstract|arguments|await|async|boolean|break|byte|case|catch|char|class|const|continue|debugger|default|delete|do|double|else|enum|eval|export|extends|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|let|long|native|new|null|of|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|try|typeof|var|void|volatile|while|with|yield|def|self|elif|except|from|global|lambda|nonlocal|pass|raise|print|True|False|None|struct|fn|mut|pub|use|mod|crate|impl|trait|where|match|loop|unsafe|extern|ref|String|System|println|printf|scanf|include|define|pragma|ifdef|endif|typedef|sizeof|namespace|using|template|virtual|override|final)\b/g,
    color: "#c084fc",
  },
  type: {
    pattern:
      /\b(int|float|double|char|boolean|string|bool|void|long|short|byte|unsigned|signed|auto|size_t|uint|i32|i64|u32|u64|f32|f64|str|Vec|Option|Result|HashMap|HashSet|ArrayList|Map|List|Set)\b/g,
    color: "#22d3ee",
  },
  string: {
    pattern: /(["'`])(?:(?!\1|\\).|\\.)*?\1/g,
    color: "#fbbf24",
  },
  number: {
    pattern: /\b\d+\.?\d*([eE][+-]?\d+)?[fFdDlL]?\b/g,
    color: "#f97316",
  },
  comment: {
    pattern:
      /\/\/.*$|\/\*[\s\S]*?\*\/|#(?!include|define|pragma|ifdef|endif).*$/gm,
    color: "#4b5563",
  },
  function: {
    pattern: /\b([a-zA-Z_]\w*)\s*(?=\()/g,
    color: "#60a5fa",
  },
  decorator: {
    pattern: /@\w+/g,
    color: "#f472b6",
  },
  operator: {
    pattern: /[+\-*/%=!<>&|^~?:]+/g,
    color: "#9ca3af",
  },
  bracket: {
    pattern: /[{}[\]()]/g,
    color: "#fbbf24",
  },
};

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function tokenizeLine(line) {
  const tokens = [];
  let remaining = line;
  let offset = 0;

  // Find all matches with positions
  const allMatches = [];
  for (const [type, rule] of Object.entries(tokenRules)) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;
    while ((match = regex.exec(line)) !== null) {
      allMatches.push({
        type,
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        color: rule.color,
      });
    }
  }

  // Sort by position, prioritize comments and strings
  const priority = {
    comment: 0,
    string: 1,
    decorator: 2,
    keyword: 3,
    type: 4,
    function: 5,
    number: 6,
    operator: 7,
    bracket: 8,
  };
  allMatches.sort(
    (a, b) =>
      a.start - b.start || (priority[a.type] || 99) - (priority[b.type] || 99),
  );

  // Remove overlapping matches
  const filtered = [];
  let lastEnd = 0;
  for (const m of allMatches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  // Build html
  let html = "";
  let pos = 0;
  for (const m of filtered) {
    if (m.start > pos) {
      html += `<span class="text-gray-300">${escapeHtml(line.slice(pos, m.start))}</span>`;
    }
    html += `<span style="color:${m.color}">${escapeHtml(m.text)}</span>`;
    pos = m.end;
  }
  if (pos < line.length) {
    html += `<span class="text-gray-300">${escapeHtml(line.slice(pos))}</span>`;
  }

  return html;
}

export default function SyntaxHighlighter({
  code,
  fontSize = 14,
  showLineNumbers = true,
}) {
  const lines = code.split("\n");

  return (
    <div className="font-mono leading-relaxed" style={{ fontSize }}>
      {lines.map((line, i) => (
        <div key={i} className="flex hover:bg-white/[0.02] transition-colors">
          {showLineNumbers && (
            <span
              className="select-none text-right pr-4 shrink-0 w-12"
              style={{ color: "#4b5563", fontSize: fontSize - 1 }}
            >
              {i + 1}
            </span>
          )}
          <span
            className="flex-1 whitespace-pre"
            dangerouslySetInnerHTML={{ __html: tokenizeLine(line) || "&nbsp;" }}
          />
        </div>
      ))}
    </div>
  );
}
