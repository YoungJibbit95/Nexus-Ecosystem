import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const corePackageJsonPath = path.join(root, "packages/nexus-core/package.json");

const appConfigs = [
  { name: "Nexus Main", file: "Nexus Main/vite.config.ts" },
  { name: "Nexus Mobile", file: "Nexus Mobile/vite.config.ts" },
  { name: "Nexus Code", file: "Nexus Code/vite.config.js" },
  { name: "Nexus Code Mobile", file: "Nexus Code Mobile/vite.config.js" },
];

const failures = [];

const corePackage = JSON.parse(fs.readFileSync(corePackageJsonPath, "utf8"));
const corePeers = corePackage.peerDependencies || {};
if (!("react" in corePeers) || !("react-dom" in corePeers)) {
  failures.push(
    "@nexus/core muss react/react-dom als peerDependencies deklarieren.",
  );
}

for (const app of appConfigs) {
  const abs = path.join(root, app.file);
  const source = fs.readFileSync(abs, "utf8");
  const hasDedupe =
    source.includes("dedupe: [\"react\", \"react-dom\"]") ||
    source.includes("dedupe: ['react', 'react-dom']");
  const hasReactAlias = source.includes("react: path.resolve");
  const hasReactDomAlias =
    source.includes("\"react-dom\": path.resolve") ||
    source.includes("'react-dom': path.resolve");

  if (!hasDedupe) {
    failures.push(`${app.name}: resolve.dedupe für react/react-dom fehlt.`);
  }
  if (!hasReactAlias || !hasReactDomAlias) {
    failures.push(`${app.name}: React/ReactDOM Alias-Fix fehlt.`);
  }
}

if (failures.length > 0) {
  console.error("verify-single-react: FAILED");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("verify-single-react: OK");
