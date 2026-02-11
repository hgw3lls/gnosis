import { Book } from "../db/schema";
import { normalizeIsbnInput, parseIsbn } from "../utils/isbn";
import { normalizeMultiValue } from "../utils/libraryFilters";

export type DuplicateGroup = {
  key: string;
  reason: "isbn" | "title_author";
  books: Book[];
};

const normText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const titleAuthorKey = (book: Book) => `${normText(book.title)}::${normText(book.authors)}`;

const normalizedIsbnKey = (book: Book) => {
  const parsed = parseIsbn(book.isbn13 || "");
  if (parsed.isbn13) {
    return parsed.isbn13;
  }
  const normalized = normalizeIsbnInput(book.isbn13 || "");
  return normalized.length >= 10 ? normalized : "";
};

export const detectDuplicateGroups = (books: Book[]): DuplicateGroup[] => {
  const isbnMap = new Map<string, Book[]>();
  const titleAuthorMap = new Map<string, Book[]>();

  books.forEach((book) => {
    const isbn = normalizedIsbnKey(book);
    if (isbn) {
      isbnMap.set(isbn, [...(isbnMap.get(isbn) ?? []), book]);
    }

    const key = titleAuthorKey(book);
    if (key !== "::") {
      titleAuthorMap.set(key, [...(titleAuthorMap.get(key) ?? []), book]);
    }
  });

  const groups: DuplicateGroup[] = [];

  isbnMap.forEach((items, key) => {
    if (items.length > 1) {
      groups.push({ key, reason: "isbn", books: items });
    }
  });

  titleAuthorMap.forEach((items, key) => {
    if (items.length > 1) {
      const ids = new Set(items.map((book) => book.id));
      const isAlreadyCovered = groups.some((group) => group.books.every((book) => ids.has(book.id)));
      if (!isAlreadyCovered) {
        groups.push({ key, reason: "title_author", books: items });
      }
    }
  });

  return groups;
};

const choose = (primary: string, secondary: string) => (primary.trim() ? primary : secondary.trim());

const mergePipeValues = (left: string, right: string) => {
  const merged = [...normalizeMultiValue(left), ...normalizeMultiValue(right)];
  return [...new Set(merged)].join(" | ");
};

export const mergeBookRecords = (primary: Book, duplicate: Book): Book => {
  const notes = [primary.notes.trim(), duplicate.notes.trim()].filter(Boolean);
  const mergedNotes = notes.length <= 1 ? notes[0] ?? "" : `${notes[0]}\n\n--- merged ---\n\n${notes[1]}`;

  return {
    ...primary,
    title: choose(primary.title, duplicate.title),
    authors: choose(primary.authors, duplicate.authors),
    publisher: choose(primary.publisher, duplicate.publisher),
    publish_year: choose(primary.publish_year, duplicate.publish_year),
    language: choose(primary.language, duplicate.language),
    format: choose(primary.format, duplicate.format),
    isbn13: choose(primary.isbn13, duplicate.isbn13),
    tags: mergePipeValues(primary.tags, duplicate.tags),
    collections: mergePipeValues(primary.collections, duplicate.collections),
    projects: mergePipeValues(primary.projects, duplicate.projects),
    cover_image: choose(primary.cover_image, duplicate.cover_image),
    notes: mergedNotes,
    updated_at: new Date().toISOString(),
  };
};
