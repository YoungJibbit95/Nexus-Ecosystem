export function cmPosToLspPosition(doc, pos) {
  const line = doc.lineAt(pos);
  return {
    lineNumber: line.number,
    column: pos - line.from + 1,
  };
}

export function lspRangeToCodeMirrorRange(doc, range) {
  if (!doc || !range?.start) return null;
  const resolvePos = (position) => {
    const rawLineNumber =
      position?.lineNumber === undefined
        ? Number(position?.line ?? 0) + 1
        : Number(position.lineNumber);
    const lineNumber = Math.max(
      1,
      Math.min(
        doc.lines,
        Number.isFinite(rawLineNumber) ? Math.round(rawLineNumber) : 1,
      ),
    );
    const line = doc.line(lineNumber);
    const rawCharacter =
      position?.column === undefined
        ? Number(position?.character ?? 0)
        : Number(position.column) - 1;
    const character = Math.max(
      0,
      Number.isFinite(rawCharacter) ? Math.round(rawCharacter) : 0,
    );
    return Math.max(line.from, Math.min(line.to, line.from + character));
  };
  const from = resolvePos(range.start);
  const to = range.end ? resolvePos(range.end) : from;
  return {
    from: Math.min(from, to),
    to: Math.max(from, to),
  };
}

export function lspTextEditsToCodeMirrorChanges(doc, edits) {
  if (!doc || !Array.isArray(edits)) return [];
  const changes = edits
    .map((edit) => {
      const range = lspRangeToCodeMirrorRange(doc, edit?.range);
      if (!range) return null;
      return {
        from: Math.max(0, Math.min(doc.length, range.from)),
        to: Math.max(0, Math.min(doc.length, range.to)),
        insert: String(edit?.newText ?? ""),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.from - right.from || left.to - right.to);

  for (let index = 1; index < changes.length; index += 1) {
    if (changes[index].from < changes[index - 1].to) return [];
  }

  return changes;
}

function getWorkspaceEditUri(entry) {
  return entry?.textDocument?.uri || entry?.uri || "";
}

export function lspWorkspaceEditToCodeMirrorChanges(doc, workspaceEdit, documentUri) {
  const batches = [];
  let externalChangeCount = 0;

  if (workspaceEdit?.changes && typeof workspaceEdit.changes === "object") {
    for (const [uri, edits] of Object.entries(workspaceEdit.changes)) {
      if (!Array.isArray(edits)) continue;
      if (uri === documentUri) {
        batches.push(edits);
      } else {
        externalChangeCount += edits.length;
      }
    }
  }

  if (Array.isArray(workspaceEdit?.documentChanges)) {
    for (const entry of workspaceEdit.documentChanges) {
      const edits = Array.isArray(entry?.edits) ? entry.edits : [];
      if (!edits.length) {
        externalChangeCount += 1;
        continue;
      }
      if (getWorkspaceEditUri(entry) === documentUri) {
        batches.push(edits);
      } else {
        externalChangeCount += edits.length;
      }
    }
  }

  const changes = lspTextEditsToCodeMirrorChanges(doc, batches.flat());
  return {
    changes,
    appliedChangeCount: changes.length,
    externalChangeCount,
    hasExternalChanges: externalChangeCount > 0,
    hasChanges: changes.length > 0 || externalChangeCount > 0,
  };
}

export function getPrimaryLspLocation(locations, documentUri = "") {
  const items = (Array.isArray(locations) ? locations : [locations]).filter(Boolean);
  if (!items.length) return null;
  const selected =
    items.find((location) => (location.targetUri || location.uri || "") === documentUri) ||
    items[0];
  const uri = selected.targetUri || selected.uri || documentUri;
  const range = selected.targetSelectionRange || selected.targetRange || selected.range || null;
  return {
    uri,
    range,
    external: Boolean(documentUri && uri && uri !== documentUri),
    raw: selected,
  };
}
