import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const distAssetsDir = path.resolve(process.cwd(), 'dist/assets');

const readBudget = (key, fallback) => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const budgets = {
  maxInitialJsKb: readBudget('BUNDLE_BUDGET_INITIAL_JS_KB', readBudget('BUNDLE_BUDGET_TOTAL_JS_KB', 900)),
  maxLargestInitialJsKb: readBudget('BUNDLE_BUDGET_LARGEST_INITIAL_JS_KB', readBudget('BUNDLE_BUDGET_LARGEST_JS_KB', 330)),
  maxLargestLazyJsKb: readBudget('BUNDLE_BUDGET_LARGEST_LAZY_JS_KB', 520),
  maxTotalCssKb: readBudget('BUNDLE_BUDGET_TOTAL_CSS_KB', 180),
  maxTotalGzipKb: readBudget('BUNDLE_BUDGET_TOTAL_GZIP_KB', 360),
};

const toKb = (bytes) => Number((bytes / 1024).toFixed(2));

const formatAsset = (asset) => `${asset.file} (raw ${asset.rawKb}kb / gzip ${asset.gzipKb}kb)`;

const listAssets = (ext) => {
  const files = readdirSync(distAssetsDir).filter((file) => file.endsWith(ext));
  return files.map((file) => {
    const absolute = path.join(distAssetsDir, file);
    const rawBytes = statSync(absolute).size;
    const gzipBytes = gzipSync(readFileSync(absolute)).length;
    return {
      file,
      rawBytes,
      gzipBytes,
      rawKb: toKb(rawBytes),
      gzipKb: toKb(gzipBytes),
    };
  });
};

const readInitialJsFiles = () => {
  const html = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const matches = Array.from(html.matchAll(/(?:src|href)="\.\/assets\/([^"]+\.js)"/g));
  return new Set(matches.map((match) => match[1]));
};

const fail = (message) => {
  console.error(`[bundle-budget] FAIL: ${message}`);
  process.exitCode = 1;
};

try {
  const jsAssets = listAssets('.js');
  const cssAssets = listAssets('.css');
  const initialJsFiles = readInitialJsFiles();
  const initialJsAssets = jsAssets.filter((asset) => initialJsFiles.has(asset.file));
  const lazyJsAssets = jsAssets.filter((asset) => !initialJsFiles.has(asset.file));

  const totalJsRaw = toKb(jsAssets.reduce((sum, asset) => sum + asset.rawBytes, 0));
  const totalJsGzip = toKb(jsAssets.reduce((sum, asset) => sum + asset.gzipBytes, 0));
  const initialJsRaw = toKb(initialJsAssets.reduce((sum, asset) => sum + asset.rawBytes, 0));
  const initialJsGzip = toKb(initialJsAssets.reduce((sum, asset) => sum + asset.gzipBytes, 0));
  const totalCssRaw = toKb(cssAssets.reduce((sum, asset) => sum + asset.rawBytes, 0));
  const totalCssGzip = toKb(cssAssets.reduce((sum, asset) => sum + asset.gzipBytes, 0));
  const largestInitialJsRaw = initialJsAssets.length
    ? toKb(Math.max(...initialJsAssets.map((asset) => asset.rawBytes)))
    : 0;
  const largestLazyJsRaw = lazyJsAssets.length
    ? toKb(Math.max(...lazyJsAssets.map((asset) => asset.rawBytes)))
    : 0;

  console.log('[bundle-budget] Initial JS assets:');
  initialJsAssets.forEach((asset) => console.log(`  - ${formatAsset(asset)}`));
  console.log('[bundle-budget] Lazy JS assets:');
  lazyJsAssets.forEach((asset) => console.log(`  - ${formatAsset(asset)}`));
  console.log('[bundle-budget] CSS assets:');
  cssAssets.forEach((asset) => console.log(`  - ${formatAsset(asset)}`));

  console.log(
    `[bundle-budget] totals => initialJs(raw=${initialJsRaw}kb,gzip=${initialJsGzip}kb) allJs(raw=${totalJsRaw}kb,gzip=${totalJsGzip}kb) css(raw=${totalCssRaw}kb,gzip=${totalCssGzip}kb)`,
  );

  if (initialJsRaw > budgets.maxInitialJsKb) {
    fail(`initial JS raw size ${initialJsRaw}kb exceeds ${budgets.maxInitialJsKb}kb`);
  }
  if (largestInitialJsRaw > budgets.maxLargestInitialJsKb) {
    fail(`largest initial JS chunk ${largestInitialJsRaw}kb exceeds ${budgets.maxLargestInitialJsKb}kb`);
  }
  if (largestLazyJsRaw > budgets.maxLargestLazyJsKb) {
    fail(`largest lazy JS chunk ${largestLazyJsRaw}kb exceeds ${budgets.maxLargestLazyJsKb}kb`);
  }
  if (totalCssRaw > budgets.maxTotalCssKb) {
    fail(`total CSS raw size ${totalCssRaw}kb exceeds ${budgets.maxTotalCssKb}kb`);
  }
  if (totalJsGzip + totalCssGzip > budgets.maxTotalGzipKb) {
    fail(
      `combined gzip size ${toKb((totalJsGzip + totalCssGzip) * 1024)}kb exceeds ${budgets.maxTotalGzipKb}kb`,
    );
  }

  if (!process.exitCode) {
    console.log('[bundle-budget] PASS');
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`unable to read build assets (${message})`);
}
