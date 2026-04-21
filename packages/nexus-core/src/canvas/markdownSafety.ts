type MarkdownOffsetNode = {
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

type ReplaceMarkdownCodeBlockInput = {
  markdown: string;
  mdNode?: MarkdownOffsetNode | null;
  className?: string;
  rawChildren?: unknown;
  nextBlockContent: string;
};

type ReplaceMarkdownCodeBlockResult = {
  nextMarkdown: string;
  replaced: boolean;
  strategy: "ast-offset" | "exact-fence" | "language-fence" | "first-fence" | "none";
};

const toText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((entry) => toText(entry)).join("");
  if (typeof value === "object") {
    const objectValue = value as { props?: { children?: unknown } };
    if (objectValue.props && "children" in objectValue.props) {
      return toText(objectValue.props.children);
    }
  }
  return String(value);
};

const normalizeFenceBody = (value: string) =>
  String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n+$/, "");

const normalizeLanguage = (className?: string) =>
  String(className || "")
    .replace(/^language-/, "")
    .trim();

const buildFence = (language: string, body: string) => {
  const header = language ? `\`\`\`${language}` : "```";
  return `${header}\n${normalizeFenceBody(body)}\n\`\`\``;
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const replaceMarkdownCodeBlockSafely = (
  input: ReplaceMarkdownCodeBlockInput,
): ReplaceMarkdownCodeBlockResult => {
  const markdown = String(input.markdown || "");
  if (!markdown) {
    return {
      nextMarkdown: markdown,
      replaced: false,
      strategy: "none",
    };
  }

  const language = normalizeLanguage(input.className);
  const currentBody = normalizeFenceBody(toText(input.rawChildren).replace(/\n$/, ""));
  const nextBody = normalizeFenceBody(input.nextBlockContent);
  const nextFence = buildFence(language, nextBody);

  const start = Number(input.mdNode?.position?.start?.offset);
  const end = Number(input.mdNode?.position?.end?.offset);
  if (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start >= 0 &&
    end > start &&
    end <= markdown.length
  ) {
    const nextMarkdown = `${markdown.slice(0, start)}${nextFence}${markdown.slice(end)}`;
    return {
      nextMarkdown,
      replaced: nextMarkdown !== markdown,
      strategy: "ast-offset",
    };
  }

  const currentFence = buildFence(language, currentBody);
  const exactIndex = markdown.indexOf(currentFence);
  if (exactIndex >= 0) {
    const nextMarkdown = `${markdown.slice(0, exactIndex)}${nextFence}${markdown.slice(exactIndex + currentFence.length)}`;
    return {
      nextMarkdown,
      replaced: true,
      strategy: "exact-fence",
    };
  }

  const languageFenceRegex = language
    ? new RegExp("(^|\\n)```" + escapeRegex(language) + "[^\\n]*\\n([\\s\\S]*?)\\n```")
    : /(^|\n)```[^\n]*\n([\s\S]*?)\n```/;
  const languageMatch = languageFenceRegex.exec(markdown);
  if (languageMatch) {
    const fullMatch = languageMatch[0];
    const normalizedMatchedBody = normalizeFenceBody(languageMatch[2] || "");
    if (!currentBody || normalizedMatchedBody === currentBody) {
      const nextMarkdown = markdown.replace(fullMatch, `${languageMatch[1] || ""}${nextFence}`);
      return {
        nextMarkdown,
        replaced: nextMarkdown !== markdown,
        strategy: "language-fence",
      };
    }
  }

  const firstFenceRegex = /(^|\n)```[^\n]*\n([\s\S]*?)\n```/;
  const firstFenceMatch = firstFenceRegex.exec(markdown);
  if (firstFenceMatch) {
    const fullMatch = firstFenceMatch[0];
    const nextMarkdown = markdown.replace(fullMatch, `${firstFenceMatch[1] || ""}${nextFence}`);
    return {
      nextMarkdown,
      replaced: nextMarkdown !== markdown,
      strategy: "first-fence",
    };
  }

  return {
    nextMarkdown: markdown,
    replaced: false,
    strategy: "none",
  };
};

export const writeClipboardTextSafely = async (value: unknown): Promise<boolean> => {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.writeText !== "function"
  ) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(String(value ?? ""));
    return true;
  } catch {
    return false;
  }
};
