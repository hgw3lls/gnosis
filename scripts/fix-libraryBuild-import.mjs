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

// Detect what libraryBuild.ts exports (simple heuristics)
const hasBuildLayoutForLibrary =
  /\bexport\s+(?:function|const|let|var)\s+buildLayoutForLibrary\b/.test(lib);

const hasBuildLibraryLayout =
  /\bexport\s+(?:function|const|let|var)\s+buildLibraryLayout\b/.test(lib);

const hasDefaultBuildLayoutForLibrary =
  /\bexport\s+default\s+function\s+buildLayoutForLibrary\b/.test(lib) ||
  /\bexport\s+default\s+buildLayoutForLibrary\b/.test(lib);

if (hasBuildLayoutForLibrary) {
  console.log("✅ libraryBuild.ts already exports buildLayoutForLibrary. No import fix needed.");
  process.exit(0);
}

// If it default-exports buildLayoutForLibrary, convert named import -> default import
let newApp = app;

if (hasDefaultBuildLayoutForLibrary) {
  // Replace: import { buildLayoutForLibrary } from "./utils/libraryBuild"
  // With:    import buildLayoutForLibrary from "./utils/libraryBuild"
  newApp = newApp.replace(
    /import\s*\{\s*buildLayoutForLibrary\s*\}\s*from\s*["'](.+libraryBuild(?:\.ts)?)["'];?/,
    'import buildLayoutForLibrary from "$1";'
  );
  if (newApp !== app) {
    fs.writeFileSync(appPath, newApp, "utf8");
    console.log("✅ Rewrote App.tsx to use default import for buildLayoutForLibrary.");
    process.exit(0);
  }
}

// If it exports buildLibraryLayout, rewrite the import to use that name instead
if (hasBuildLibraryLayout) {
  newApp = newApp.replace(
    /import\s*\{\s*buildLayoutForLibrary\s*\}\s*from\s*["'](.+libraryBuild(?:\.ts)?)["'];?/,
    'import { buildLibraryLayout } from "$1";'
  );

  // Also update call sites (basic replace)
  newApp = newApp.replace(/\bbuildLayoutForLibrary\b/g, "buildLibraryLayout");

  if (newApp !== app) {
    fs.writeFileSync(appPath, newApp, "utf8");
    console.log("✅ Rewrote App.tsx to import/use buildLibraryLayout instead of buildLayoutForLibrary.");
    process.exit(0);
  }

  console.error(
    "⚠️ Detected buildLibraryLayout export, but couldn't find the expected import line in App.tsx. Update manually."
  );
  process.exit(2);
}

console.error(
  "❌ Could not find buildLayoutForLibrary OR buildLibraryLayout exports in src/utils/libraryBuild.ts.\n" +
    "Open that file and check the exported function name, then update App.tsx import accordingly."
);
process.exit(3);

