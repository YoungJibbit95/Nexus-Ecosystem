import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const appRoot = path.join(root, 'Nexus Code');
const evidence = path.dirname(fileURLToPath(import.meta.url));
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules','dist','release','.git'].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : /\.(?:[cm]?js|jsx|ts|tsx|css)$/.test(entry.name) ? [full] : [];
  });
}
const files = walk(appRoot);
const text = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const rel = file => path.relative(appRoot, file).replaceAll('\\', '/');
const specs = source => [...source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]([^'"]+)['"]/g)].map(match => match[1]);
function resolveLocal(file, spec) {
  const base = spec.startsWith('@/') ? path.join(appRoot, 'src', spec.slice(2))
    : spec.startsWith('.') ? path.resolve(path.dirname(file), spec) : null;
  if (!base) return null;
  return [base, ...['.js','.jsx','.ts','.tsx','.cjs','.mjs','.css'].map(ext => base + ext), ...['index.js','index.jsx','index.ts','index.tsx'].map(name => path.join(base, name))].find(candidate => text.has(candidate));
}
const reachable = new Set();
function visit(file) {
  if (!file || reachable.has(file)) return;
  reachable.add(file);
  for (const spec of specs(text.get(file))) visit(resolveLocal(file, spec));
}
visit(path.join(appRoot, 'src/main.jsx'));
visit(path.join(appRoot, 'electron/main.cjs'));
visit(path.join(appRoot, 'electron/preload.cjs'));
const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
const dependencies = Object.entries(packageJson.dependencies).map(([name, range]) => {
  const consumers = files.filter(file => specs(text.get(file)).some(spec => spec === name || spec.startsWith(name + '/')));
  const active = consumers.filter(file => reachable.has(file));
  const scriptUse = Object.values(packageJson.scripts).some(script => script.includes(name));
  return { name, range, classification: active.length ? name === 'framer-motion' ? 'USED BUT REPLACEABLE' : 'REQUIRED' : consumers.length ? 'LEGACY' : scriptUse ? 'REQUIRED' : 'UNUSED',
    evidence: active.length ? 'Production import graph' : consumers.length ? 'Scaffold/test imports only' : scriptUse ? 'Package script' : 'No literal import found; removal requires dynamic/config review',
    activeConsumers: active.map(rel), allConsumers: consumers.map(rel) };
});
const inventory = files.map(file => ({ path: rel(file), bytes: fs.statSync(file).size, lines: text.get(file).split('\n').length,
  productionReachable: reachable.has(file), stateHooks: (text.get(file).match(/\buseState\(/g) || []).length,
  effectHooks: (text.get(file).match(/\buseEffect\(/g) || []).length,
  bridgeReferences: (text.get(file).match(/electronAPI/g) || []).length })).sort((a,b) => b.bytes - a.bytes);
const css = text.get(path.join(appRoot, 'src/globals.css'));
const selectors = new Map();
for (const match of css.matchAll(/(?:^|\})\s*([^{}]+)\{/g)) {
  const selector = match[1].trim().replace(/\s+/g, ' ');
  if (selector.startsWith('@') || /^(?:from|to|\d+%)$/.test(selector)) continue;
  selectors.set(selector, (selectors.get(selector) || 0) + 1);
}
const diagnostics = fs.readFileSync(path.join(evidence, 'typecheck.log'), 'utf8');
const errorsByFile = {};
const errorsByCode = {};
for (const match of diagnostics.matchAll(/^(.+?)\(\d+,\d+\): error (TS\d+):/gm)) {
  errorsByFile[match[1]] = (errorsByFile[match[1]] || 0) + 1;
  errorsByCode[match[2]] = (errorsByCode[match[2]] || 0) + 1;
}
const installed = {};
for (const name of ['react','electron','vite','typescript','@uiw/react-codemirror']) {
  installed[name] = JSON.parse(fs.readFileSync(path.join(appRoot, 'node_modules', name, 'package.json'), 'utf8')).version;
}
const report = { method: 'Literal import reachability, not a deletion authorization; JSX library reachability is static, not execution.',
  inventory, dependencies, installed,
  css: { bytes: Buffer.byteLength(css), rgbaOccurrences: (css.match(/rgba\(/g) || []).length,
    importantOccurrences: (css.match(/!important/g) || []).length,
    repeatedSelectorCandidates: [...selectors].filter(([,count]) => count > 1).sort((a,b) => b[1]-a[1]) },
  typecheck: { count: Object.values(errorsByFile).reduce((a,b) => a+b,0), files: errorsByFile, codes: errorsByCode } };
fs.writeFileSync(path.join(evidence, 'source-inventory.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(evidence, 'dependency-audit.md'), '# Direct runtime dependencies\n\nGenerated from the production import graph, with an explicit audit refinement for framer-motion (small interactions can move to CSS; retain justified shared transitions). REQUIRED means currently used, not a permanent design decision. LEGACY and UNUSED are removal candidates only. No dependency was removed in Wave 0. Toolchain dependencies are classified separately in 01-problem-inventory.md.\n\n| Dependency | Class | Evidence |\n| --- | --- | --- |\n' + dependencies.map(dep => `| ${dep.name} | ${dep.classification} | ${dep.activeConsumers.length ? dep.activeConsumers.join(', ') : dep.evidence} |`).join('\n') + '\n');
console.log(JSON.stringify({ fileCount: files.length, topFiles: inventory.slice(0,16), installed,
  typecheck: { count: report.typecheck.count, topFiles: Object.entries(errorsByFile).sort((a,b) => b[1]-a[1]).slice(0,10) },
  css: { ...report.css, repeatedSelectorCandidates: report.css.repeatedSelectorCandidates.slice(0,8) },
  dependencyClasses: dependencies.reduce((counts, dep) => {counts[dep.classification] = (counts[dep.classification] || 0)+1; return counts;}, {}) }, null, 2));
