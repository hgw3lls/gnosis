import { useState, type ChangeEvent } from "react";
import { db } from "../db/db";
import { exportCsvText, parseCsvText } from "../utils/csv";

export const ImportPage = () => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleExport = async () => {
    const books = await db.books.toArray();
    const text = exportCsvText(books);
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "library.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSync = async () => {
    try {
      setError("");
      const books = await db.books.toArray();
      const text = exportCsvText(books);
      const picker = (
        window as Window & {
          showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
        }
      ).showDirectoryPicker;

      if (!picker) {
        setError("Sync is not supported in this browser. Use export instead.");
        return;
      }

      const directoryHandle = await picker();
      const writeCsv = async (filename: string, payload: string) => {
        const handle = await directoryHandle.getFileHandle(filename, {
          create: true,
        });
        const writable = await handle.createWritable();
        await writable.write(payload);
        await writable.close();
      };

      let backupMessage = "";
      try {
        const existingHandle = await directoryHandle.getFileHandle("library.csv");
        const existingFile = await existingHandle.getFile();
        const existingText = await existingFile.text();
        await writeCsv("library.csv.backup.csv", existingText);
        backupMessage = "Previous library.csv moved to library.csv.backup.csv.";
      } catch (error) {
        backupMessage = "No existing library.csv to back up.";
      }

      await writeCsv("library.csv", text);
      setMessage(`Library synced to library.csv. ${backupMessage}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sync failed.");
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      setError("");
      const text = await file.text();
      const books = parseCsvText(text);
      await db.books.bulkPut(books);
      setMessage("Library updated from CSV.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Import failed.");
    } finally {
      event.target.value = "";
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Reset local database? This will remove all locally stored books."
    );
    if (!confirmed) {
      return;
    }
    await db.books.clear();
    setMessage("Local database cleared.");
  };

  return (
    <section className="import-layout">
      <div className="panel">
        <h2>Import</h2>
        <p>
          Import a CSV file that matches the canonical schema. The header must match the exact
          order of columns in <code>library.csv</code>.
        </p>
        <div className="actions">
          <label className="button ghost">
            Import CSV
            <input type="file" accept=".csv" onChange={handleImport} hidden />
          </label>
        </div>
        {error ? <p className="summary error-text">{error}</p> : null}
        {message ? <p className="summary">{message}</p> : null}
      </div>
      <div className="panel">
        <h2>Export</h2>
        <p>Export the current IndexedDB library using the canonical CSV header order.</p>
        <div className="actions">
          <button className="button" type="button" onClick={handleExport}>
            Export library.csv
          </button>
          <button className="button danger" type="button" onClick={handleReset}>
            Reset local database
          </button>
        </div>
      </div>
      <div className="panel">
        <h2>Sync Library</h2>
        <p>
          Sync replaces <code>library.csv</code> with your current session library and
          moves the previous <code>library.csv</code> to{" "}
          <code>library.csv.backup.csv</code> first.
        </p>
        <div className="actions">
          <button className="button" type="button" onClick={handleSync}>
            Sync library.csv
          </button>
        </div>
      </div>
    </section>
  );
};
