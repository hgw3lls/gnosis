import Papa from "papaparse";
import { Book, CSV_SCHEMA, STATUS_OPTIONS } from "./schema";

const emptyBook: Book = {
  id: 0,
  title: "",
  authors: "",
  publisher: "",
  publish_year: "",
  language: "",
  format: "",
  isbn13: "",
  tags: "",
  collections: "",
  projects: "",
  location: "",
  status: "to_read",
  notes: "",
  cover_image: "",
  added_at: "",
  updated_at: "",
};

export const normalizeBook = (data: Partial<Book>): Book => {
  const draft = { ...emptyBook, ...data };
  const id = Number.parseInt(String(draft.id), 10);
  const status = STATUS_OPTIONS.includes(draft.status)
    ? draft.status
    : "to_read";
  return {
    ...draft,
    id: Number.isFinite(id) ? id : 0,
    status,
    isbn13: draft.isbn13 ?? "",
    language: draft.language?.trim() || "en",
    publish_year: draft.publish_year ? String(draft.publish_year) : "",
  };
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
