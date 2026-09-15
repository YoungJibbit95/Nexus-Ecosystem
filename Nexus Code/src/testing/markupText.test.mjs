import assert from "node:assert/strict";
import test from "node:test";

import { stripMarkupForAccessibleText } from "./markupText.js";

test("extracts accessible text from trusted smoke markup", () => {
  assert.equal(stripMarkupForAccessibleText('<span title="1 > 0">Open <strong>file</strong></span>'), "Open file");
})

test("ignores raw script and style contents including tolerant closing tags", () => {
  assert.equal(
    stripMarkupForAccessibleText('<script>alert(1)</script ><style>.hidden{}</style><span>Visible</span>'),
    "Visible",
  );
  assert.equal(stripMarkupForAccessibleText("<script>unterminated"), "");
})
