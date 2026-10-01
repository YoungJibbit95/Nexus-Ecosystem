import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
const categories = ['REAL CONTRACT VIOLATION', 'MISSING JS/TS ANNOTATION', 'LEGACY UNTYPED BOUNDARY', 'TEST/HARNESS TYPE NOISE', 'THIRD-PARTY/CONFIGURATION ISSUE'];
function subsystem(file) {
  if (file.startsWith('../packages/nexus-core/src/')) return 'shared/core';
  if (!file.startsWith('src/')) return 'shared/vendor/configuration';
  if (file.includes('/testing/')) return 'testing';
  if (file.startsWith('src/platform/')) return 'platform';
  if (file.startsWith('src/workbench/')) return 'workbench foundation';
  if (file.startsWith('src/settings/')) return 'settings foundation';
  if (/Settings|settings/.test(file)) return 'settings';
  if (/Git|github/.test(file)) return 'SCM';
  if (/extension|Extension/.test(file)) return 'extensions';
  if (/Terminal/.test(file)) return 'terminal';
  if (/CodeEditor|\/ide\//.test(file)) return 'editor/language';
  if (/Editor\.jsx|\/pages\/editor\//.test(file)) return 'workbench/workspace';
  return 'UI/application';
}
function read(name) {
  const source = fs.readFileSync(path.join(directory, name), 'utf8');
  return [...source.matchAll(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm)].map(match => {
    // Windows junction resolution can spell the same dependency through different worktrees.
    const file = match[1].replaceAll('\\', '/').replace(/^.*\/node_modules\//, 'node_modules/');
    const code = match[4];
    const message = match[5].trim();
    const domain = subsystem(file);
    const category = domain === 'shared/vendor/configuration' || ['TS7026','TS2305','TS2591'].includes(code) ? categories[4]
      : domain === 'testing' ? categories[3]
      : /electronAPI|CustomEvent|\.detail|Property 'detail'|Property 'data'/.test(message) ? categories[2]
      : ['TS7006','TS7031','TS7005','TS7034','TS7015','TS7019','TS7022','TS7023','TS7024'].includes(code) ? categories[1]
      : categories[0];
    // Ignore line shifts and worktree-prefix variation when comparing identities.
    const normalized = message.replace(/F:[^'"\r\n]*?\/node_modules\//gi, '<dependencies>/node_modules/');
    return {file, line:+match[2], column:+match[3], code, message:normalized, subsystem:domain, category, triage:'candidate; review source before assigning a fix'};
  });
}
function count(entries, key) {
  const seed = key === 'category' ? Object.fromEntries(categories.map(name => [name,0])) : {};
  return entries.reduce((totals, entry) => { const name = entry[key]; totals[name] = (totals[name] || 0) + 1; return totals; }, seed);
}
const before = read('typecheck-before.log');
const hasAfter = fs.existsSync(path.join(directory, 'typecheck-after.log'));
const after = hasAfter ? read('typecheck-after.log') : null;
const key = item => `${item.file}|${item.code}|${item.message}`;
function difference(left, right) {
  const remaining = new Map();
  for (const item of right) remaining.set(key(item), (remaining.get(key(item)) || 0) + 1);
  return left.filter(item => {
    const id = key(item); const available = remaining.get(id) || 0;
    if (!available) return true;
    remaining.set(id, available - 1); return false;
  });
}
const report = { method:'Diagnostic identity multiset ignoring line shifts and dependency junction path spelling; categories are triage heuristics, not automatic proof of contract defects. Raw logs retain original file paths. Review representative source before fixing.',
  integrationBase:'0cb408b02f4ba54f0626b4031d73541b8cb94287', historicalCount:4353,
  before:{count:before.length, byFile:count(before,'file'), byCode:count(before,'code'), bySubsystem:count(before,'subsystem'), byCategory:count(before,'category'), diagnostics:before},
  after:after ? {count:after.length, byFile:count(after,'file'), byCode:count(after,'code'), bySubsystem:count(after,'subsystem'), byCategory:count(after,'category'), diagnostics:after} : null,
  introduced:after ? difference(after,before) : [], removed:after ? difference(before,after) : []};
fs.writeFileSync(path.join(directory, 'diagnostic-baseline.json'), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({before:before.length, after:after?.length, introduced:report.introduced.length, removed:report.removed.length, categories:report.before.byCategory, subsystems:report.before.bySubsystem}));
