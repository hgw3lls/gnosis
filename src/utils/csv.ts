import Papa from "papaparse";
import { Book, CSV_SCHEMA, normalizeBook } from "../db/schema";

export const parseCsvText = (text: string): Book[] => {
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

  return (result.data || []).map((row) => {
    const entry: Partial<Book> = {};
    CSV_SCHEMA.forEach((key) => {
      entry[key] = row[key] ?? "";
    });
    return normalizeBook(entry);
  });
};

export const exportCsvText = (books: Book[]): string => {
  const rows = books.map((book) => {
    const row: Record<string, string> = {};
    CSV_SCHEMA.forEach((key) => {
      row[key] = String(book[key] ?? "");
    });
    return row;
  });

  return Papa.unparse(rows, {
    columns: [...CSV_SCHEMA],
  });
};
