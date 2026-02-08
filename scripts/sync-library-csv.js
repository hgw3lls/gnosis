import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const destination = resolve("public", "library.csv");
const source = resolve("library.csv");

if (!existsSync(source)) {
  if (existsSync(destination)) {
    console.log(
      "No library.csv found; using existing public/library.csv for build."
    );
    process.exit(0);
  }

  throw new Error(`Missing ${source} and no ${destination} present.`);
}

const destinationDir = dirname(destination);
if (!existsSync(destinationDir)) {
  mkdirSync(destinationDir, { recursive: true });
}

copyFileSync(source, destination);
console.log(`Synced ${source} -> ${destination}`);
