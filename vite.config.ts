import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const syncLibraryPlugin = () => ({
  name: "sync-library-api",
  configureServer(server: { middlewares: { use: (handler: (req: any, res: any, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      if (req.method !== "PUT" || req.url !== "/api/library") {
        next();
        return;
      }

      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const csvText = Buffer.concat(chunks).toString("utf8");
          if (!csvText.trim()) {
            res.statusCode = 400;
            res.end("Sync payload was empty.");
            return;
          }

          const rootCsvPath = resolve(process.cwd(), "library.csv");
          const publicCsvPath = resolve(process.cwd(), "public", "library.csv");
          const backupPath = resolve(process.cwd(), "library.csv.backup.csv");

          if (existsSync(rootCsvPath)) {
            writeFileSync(backupPath, readFileSync(rootCsvPath, "utf8"), "utf8");
          }

          writeFileSync(rootCsvPath, csvText, "utf8");
          writeFileSync(publicCsvPath, csvText, "utf8");

          res.statusCode = 200;
          res.end("Library sync complete.");
        } catch (error) {
          res.statusCode = 500;
          res.end(error instanceof Error ? error.message : "Sync failed.");
        }
      });
      req.on("error", () => {
        res.statusCode = 500;
        res.end("Failed to read sync payload.");
      });
    });
  },
});

export default defineConfig({
  base: process.env.BASE_PATH ?? "/gnosis/",
  plugins: [react(), syncLibraryPlugin()],
});
