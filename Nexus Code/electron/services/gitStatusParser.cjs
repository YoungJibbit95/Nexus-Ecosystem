"use strict";

const parseAheadBehind = (value) => {
  const result = { ahead: 0, behind: 0 };
  const aheadMatch = /\bahead\s+(\d+)/i.exec(value);
  const behindMatch = /\bbehind\s+(\d+)/i.exec(value);
  if (aheadMatch) result.ahead = Number(aheadMatch[1]);
  if (behindMatch) result.behind = Number(behindMatch[1]);
  return result;
};

const parseBranchLine = (line) => {
  const text = String(line || "").replace(/^##\s*/, "");
  const branch = {
    current: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    detached: false,
    initial: false,
  };

  if (/^No commits yet on\s+/i.test(text)) {
    branch.initial = true;
    branch.current = text.replace(/^No commits yet on\s+/i, "").trim() || null;
    return branch;
  }

  if (/^HEAD\s+\(no branch\)/i.test(text) || /^\(no branch\)/i.test(text)) {
    branch.detached = true;
    branch.current = "HEAD";
    return branch;
  }

  const statusMatch = /\[(.+)]$/.exec(text);
  const statusText = statusMatch ? statusMatch[1] : "";
  const mainText = statusMatch ? text.slice(0, statusMatch.index).trim() : text.trim();
  const [current, upstream] = mainText.split("...");
  branch.current = current || null;
  branch.upstream = upstream || null;
  Object.assign(branch, parseAheadBehind(statusText));
  return branch;
};

const isRenameOrCopy = (status) => status.includes("R") || status.includes("C");

const parseStatusEntry = (token, nextToken) => {
  const status = token.slice(0, 2);
  const filePath = token.length > 3 ? token.slice(3) : "";
  const index = status[0] || " ";
  const workingTree = status[1] || " ";
  const entry = {
    path: filePath,
    status,
    index,
    workingTree,
    staged: index !== " " && index !== "?",
    unstaged: workingTree !== " ",
    untracked: status === "??",
    ignored: status === "!!",
  };

  if (isRenameOrCopy(status)) {
    entry.originalPath = nextToken || null;
  }

  return entry;
};

const parseGitStatus = (rawStatus) => {
  const tokens = String(rawStatus || "").split("\0").filter((token) => token.length > 0);
  const files = [];
  let branch = null;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.startsWith("## ")) {
      branch = parseBranchLine(token);
      continue;
    }

    if (token.length < 3) continue;
    const statusCode = token.slice(0, 2);
    const nextToken = isRenameOrCopy(statusCode) ? tokens[index + 1] : undefined;
    files.push(parseStatusEntry(token, nextToken));
    if (nextToken !== undefined) index += 1;
  }

  return {
    branch,
    files,
    isClean: files.length === 0,
  };
};

module.exports = {
  parseBranchLine,
  parseGitStatus,
};
