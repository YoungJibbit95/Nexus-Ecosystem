import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const evidence = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidence, '../../..');
const visual = path.join(root, '.test-artifacts/nexus-code/visual-smoke');
const native = path.join(root, '.test-artifacts/nexus-code/native-baseline');
const destination = path.join(evidence, 'visual');
fs.mkdirSync(destination, { recursive: true });
const selected = [
  ['fixture', visual, 'workbench-shell-desktop.png'],
  ['fixture', visual, 'workbench-shell-short-wide.png'],
  ['fixture', visual, 'settings-panel-desktop.png'],
  ['fixture', visual, 'editor-javascript-desktop.png'],
  ['fixture', visual, 'github-workbench-desktop.png'],
  ['focused-recheck', visual, 'editor-scroll-desktop.png'],
  ['production-signed-out', native, 'production-account-gate-1440x900.png'],
  ['production-signed-out', native, 'production-account-gate-900x600.png'],
];
const retained = selected.map(([kind, directory, name]) => {
  const source = path.join(directory, name);
  fs.copyFileSync(source, path.join(destination, name));
  const bytes = fs.readFileSync(source);
  return { kind, path: `visual/${name}`, bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
});
const log = fs.readFileSync(path.join(evidence, 'visual.log'), 'utf8');
const passed = [...log.matchAll(/\[electron-visual-smoke\] ok ([^\s]+) (\d+x\d+)/g)]
  .map(match => ({ scenario: match[1], size: match[2] }));
const failed = [...log.matchAll(/\[electron-visual-smoke\] failed ([^\s]+) (\d+x\d+)/g)]
  .map(match => ({ scenario: match[1], size: match[2] }));
const manifest = {
  method: 'Full-run outcomes reconstructed from retained raw visual.log; not the original metrics summary.',
  fullRun: { passed: passed.length, failed: failed.length, failures: failed, scenarios: passed },
  limitation: 'Focused recheck reused the output directory and replaced summary.json/md and editor-scroll-desktop.png. Original failed image/full metrics summary are unavailable. Other full-run screenshots remain local. Future runs must use distinct output directories.',
  retained,
  localArtifactPngs: fs.readdirSync(visual).filter(name => name.endsWith('.png')).map(name => {
    const bytes = fs.readFileSync(path.join(visual, name));
    return { name, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  }),
};
fs.writeFileSync(path.join(evidence, 'visual-baseline-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ fullRun: { passed: passed.length, failed: failed.length, failures: failed }, retained: retained.length }));
