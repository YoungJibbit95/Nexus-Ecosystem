import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchFiles } from '../../../Nexus Code/src/pages/editor/searchPanelModel.js';
import { createFileTreeModel, createFileTreeItems, getFileTreeVirtualWindow } from '../../../Nexus Code/src/pages/editor/fileTreeModel.js';
import { createEditorLargeFilePolicy } from '../../../Nexus Code/src/pages/editor/featureModel/editorStatus.js';
const evidence = path.dirname(fileURLToPath(import.meta.url));
const measures = [];
async function measure(id, operation) {
  const samples = [];
  let result;
  for (let iteration = 0; iteration < 8; iteration++) {
    const started = performance.now();
    result = await operation();
    samples.push(+(performance.now() - started).toFixed(3));
  }
  const sorted = [...samples].sort((a,b) => a-b);
  measures.push({ id, samplesMs: samples, medianMs: sorted[4], maxMs: sorted.at(-1), result });
}
const files = Array.from({length: 10_000}, (_, index) => ({id: `file_${index}`, name: `source_${index}.ts`,
  type: 'file', content: `export const value${index} = ${index};\n`, parentId: null}));
await measure('file-tree-10000-model-and-virtual-window', () => {
  const model = createFileTreeModel(files);
  const items = createFileTreeItems(model.rows);
  const window = getFileTreeVirtualWindow(items, {height: 600, scrollTop: 6000});
  return {inputFiles: files.length, visibleModelRows: model.rows.length, renderedRows: window.renderedRows, stats: model.stats};
});
await measure('search-10000-candidates-default-cap-no-match', async () => {
  const result = await searchFiles({files, options: {query: 'unmatched_unique_query'}});
  return {scannedFiles: result.scannedFiles, candidateFiles: result.candidateFiles, fileLimitReached: result.fileLimitReached};
});
await measure('search-large-content-default-truncation', async () => {
  const result = await searchFiles({files: [{id:'large', name:'large.ts', type:'file', content: 'x'.repeat(1_100_000) + 'needle'}], options:{query:'needle'}});
  return {matches: result.totalMatches, truncatedFileCount: result.truncatedFileCount, warnings: result.warnings};
});
await measure('large-file-policy-1mb-20000-lines', () => {
  const result = createEditorLargeFilePolicy({charCount: 1_000_000, lineCount: 20_000});
  return {mode: result.mode, lspEnabled: result.lspEnabled, syntaxHighlightingEnabled: result.syntaxHighlightingEnabled};
});
const report = {runtime: process.version, scope: 'Node in-memory model timings; no renderer, disk IO, authenticated startup, LSP or performance SLA proof', measures};
fs.writeFileSync(path.join(evidence, 'model-performance.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
