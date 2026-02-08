import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const destination = resolve("public", "library.csv");
const sources = [resolve("library.csv"), resolve("library.csv.backup.csv")];
const source = sources.find((path) => existsSync(path));

if (!source) {
  if (existsSync(destination)) {
    console.log(
      "No library.csv found; using existing public/library.csv for build."
    );
    process.exit(0);
  }

  throw new Error(
    `Missing ${sources.join(" or ")} and no ${destination} present.`
  );
}

const destinationDir = dirname(destination);
if (!existsSync(destinationDir)) {
  mkdirSync(destinationDir, { recursive: true });
}

copyFileSync(source, destination);
console.log(`Synced ${source} -> ${destination}`);
