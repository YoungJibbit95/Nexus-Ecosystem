const RAW_TEXT_TAGS = new Set(["script", "style"]);

function findTagEnd(markup, startIndex) {
  let quote = "";
  for (let index = startIndex; index < markup.length; index += 1) {
    const character = markup[index];
    if (quote) {
      if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") return index;
  }
  return -1;
}

function readTag(markup, startIndex) {
  if (markup.startsWith("<!--", startIndex)) {
    const commentEnd = markup.indexOf("-->", startIndex + 4);
    return { end: commentEnd < 0 ? markup.length - 1 : commentEnd + 2, name: "", closing: false };
  }

  const end = findTagEnd(markup, startIndex + 1);
  if (end < 0) return null;
  let cursor = startIndex + 1;
  while (cursor < end && /\s/u.test(markup[cursor])) cursor += 1;
  const closing = markup[cursor] === "/";
  if (closing) cursor += 1;
  const nameStart = cursor;
  while (cursor < end) {
    const character = markup[cursor].toLowerCase();
    if ((character < "a" || character > "z") && (character < "0" || character > "9") && character !== "-") break;
    cursor += 1;
  }
  return {
    end,
    name: markup.slice(nameStart, cursor).toLowerCase(),
    closing,
  };
}

export function stripMarkupForAccessibleText(value) {
  const markup = String(value || "");
  const text = [];
  let suppressedTag = "";

  for (let index = 0; index < markup.length; index += 1) {
    if (markup[index] !== "<") {
      if (!suppressedTag) text.push(markup[index]);
      continue;
    }

    const tag = readTag(markup, index);
    if (!tag) {
      if (!suppressedTag) text.push(markup[index]);
      continue;
    }
    index = tag.end;
    if (suppressedTag) {
      if (tag.closing && tag.name === suppressedTag) suppressedTag = "";
      continue;
    }
    if (!tag.closing && RAW_TEXT_TAGS.has(tag.name)) {
      suppressedTag = tag.name;
      continue;
    }
    text.push(" ");
  }

  return text.join("").replace(/\s+/gu, " ").trim();
}
