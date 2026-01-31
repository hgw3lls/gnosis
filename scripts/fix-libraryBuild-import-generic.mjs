#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const appPath = path.join(repoRoot, "src", "App.tsx");
const libPath = path.join(repoRoot, "src", "utils", "libraryBuild.ts");

if (!fs.existsSync(appPath)) {
  console.error(`❌ Cannot find ${appPath}`);
  process.exit(1);
}
if (!fs.existsSync(libPath)) {
  console.error(`❌ Cannot find ${libPath}`);
  process.exit(1);
}

const app = fs.readFileSync(appPath, "utf8");
const lib = fs.readFileSync(libPath, "utf8");

const named = [];
for (const m of lib.matchAll(/\bexport\s+function\s+([A-Za-z0-9_$]+)\b/g)) named.push(m[1]);
for (const m of lib.matchAll(/\bexport\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)\b/g)) named.push(m[1]);

const hasDefault = /\bexport\s+default\b/.test(lib);

if (named.length === 0 && !hasDefault) {
  console.error("❌ No named exports and no default export detected in libraryBuild.ts.");
  console.error("Run: node scripts/list-exports.mjs and inspect the file manually.");
  process.exit(2);
}

let newApp = app;

// If there's a default export, switch to default import
if (hasDefault) {
  newApp = newApp.replace(
    /import\s*\{\s*buildLayoutForLibrary\s*\}\s*from\s*["'](.+libraryBuild(?:\.ts)?)["'];?/,
    'import buildLayoutForLibrary from "$1";'
  );
  if (newApp !== app) {
    fs.writeFileSync(appPath, newApp, "utf8");
    console.log("✅ Updated App.tsx to default-import buildLayoutForLibrary from libraryBuild.");
    process.exit(0);
  }
}

// Otherwise use first named export we found
const replacement = named[0];
newApp = newApp.replace(
  /import\s*\{\s*buildLayoutForLibrary\s*\}\s*from\s*["'](.+libraryBuild(?:\.ts)?)["'];?/,
  `import { ${replacement} } from "$1";`
);

// Update call sites too
newApp = newApp.replace(/\bbuildLayoutForLibrary\b/g, replacement);

if (newApp !== app) {
  fs.writeFileSync(appPath, newApp, "utf8");
  console.log(`✅ Updated App.tsx to use named export "${replacement}" from libraryBuild.ts`);
  process.exit(0);
}

console.error("⚠️ Could not find the expected import line in App.tsx to replace.");
console.error("Search App.tsx for the import and adjust the regex or update manually.");
process.exit(3);

