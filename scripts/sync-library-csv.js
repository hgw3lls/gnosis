import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve("library.csv");
const destination = resolve("public", "library.csv");

if (!existsSync(source)) {
  throw new Error(`Missing ${source}.`);
}

const destinationDir = dirname(destination);
if (!existsSync(destinationDir)) {
  mkdirSync(destinationDir, { recursive: true });
}

copyFileSync(source, destination);
console.log(`Synced ${source} -> ${destination}`);
