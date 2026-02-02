import Papa from "papaparse";
import { Book, getSchemaColumns, normalizeBook } from "../db/schema";

const assertSchemaColumns = (fields: string[]) => {
  const columns = getSchemaColumns();
  if (fields.length !== columns.length || fields.join(",") !== columns.join(",")) {
    throw new Error("CSV schema mismatch.");
  }
};

export const parseCsvText = (text: string): Book[] => {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length) {
    throw new Error(result.errors[0].message);
  }

  const fields = result.meta.fields ?? [];
  assertSchemaColumns(fields);

  return (result.data || []).map((row) => {
    const entry: Partial<Book> = {};
    getSchemaColumns().forEach((key) => {
      entry[key] = row[key] ?? "";
    });
    return normalizeBook(entry);
  });
};

export const exportCsvText = (books: Book[]): string => {
  const columns = getSchemaColumns();
  const rows = books.map((book) => {
    const row: Record<string, string> = {};
    columns.forEach((key) => {
      row[key] = String(book[key] ?? "");
    });
    return row;
  });

  return Papa.unparse(rows, {
    columns,
  });
};
