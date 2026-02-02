import { useState, type ChangeEvent } from "react";
import Papa from "papaparse";
import { db } from "../db/db";
import { CSV_SCHEMA, normalizeBook } from "../db/schema";
import { exportCsvText } from "../utils/csv";

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

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      setError("");
      const text = await file.text();
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      if (result.errors.length) {
        throw new Error(result.errors[0].message);
      }
      const fields = result.meta.fields ?? [];
      if (fields.join(",") !== CSV_SCHEMA.join(",")) {
        throw new Error("CSV schema mismatch.");
      }
      const books = (result.data || []).map((row) => {
        const entry: Record<string, string> = {};
        CSV_SCHEMA.forEach((key) => {
          entry[key] = row[key] ?? "";
        });
        return normalizeBook({ ...entry, id: Number.parseInt(entry.id ?? "0", 10) });
      });
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
    </section>
  );
};
