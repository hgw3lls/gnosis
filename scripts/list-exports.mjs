#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const target = path.join(repoRoot, "src", "utils", "libraryBuild.ts");

if (!fs.existsSync(target)) {
  console.error(`❌ Not found: ${target}`);
  process.exit(1);
}

const code = fs.readFileSync(target, "utf8");

// Very lightweight export discovery (regex-based)
const exports = new Set();

// export function foo
for (const m of code.matchAll(/\bexport\s+function\s+([A-Za-z0-9_$]+)\b/g)) {
  exports.add(m[1]);
}
// export const/let/var foo
for (const m of code.matchAll(/\bexport\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)\b/g)) {
  exports.add(m[1]);
}
// export class foo
for (const m of code.matchAll(/\bexport\s+class\s+([A-Za-z0-9_$]+)\b/g)) {
  exports.add(m[1]);
}
// export type foo / export interface foo (useful to know)
for (const m of code.matchAll(/\bexport\s+(?:type|interface)\s+([A-Za-z0-9_$]+)\b/g)) {
  exports.add(`${m[1]} (type)`);
}
// export { a, b as c }
for (const m of code.matchAll(/\bexport\s*\{([^}]+)\}/g)) {
  const chunk = m[1]
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  for (const entry of chunk) exports.add(entry.replace(/\s+/g, " "));
}

const hasDefault = /\bexport\s+default\b/.test(code);

console.log(`\n📄 ${path.relative(repoRoot, target)}`);
console.log(`Default export: ${hasDefault ? "YES" : "NO"}`);
console.log("Named exports found:");
if (exports.size === 0) {
  console.log("  (none detected by regex — check for re-exports or unusual syntax)");
} else {
  for (const e of [...exports].sort()) console.log(`  - ${e}`);
}
console.log("");

