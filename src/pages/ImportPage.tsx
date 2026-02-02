import { useState, type ChangeEvent } from "react";
import { useLibraryStore } from "../app/store";

export const ImportPage = () => {
  const importCsv = useLibraryStore((state) => state.importCsv);
  const exportCsv = useLibraryStore((state) => state.exportCsv);
  const [message, setMessage] = useState("");

  const handleExport = () => {
    const text = exportCsv();
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
      const text = await file.text();
      await importCsv(text);
      setMessage("Library updated from CSV.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <section className="panel">
      <h2>Import / Export</h2>
      <p>
        Import a CSV file that matches the canonical schema. Export will always preserve column
        order and formatting.
      </p>
      <div className="actions">
        <label className="button ghost">
          Import CSV
          <input type="file" accept=".csv" onChange={handleImport} hidden />
        </label>
        <button className="button" type="button" onClick={handleExport}>
          Export CSV
        </button>
      </div>
      {message ? <p className="summary">{message}</p> : null}
    </section>
  );
};
