import { Book } from "../db/schema";
import { normalizeMultiValue } from "./libraryFilters";

const uniqueSorted = (values: string[]) =>
  [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

export const buildQuickAddSuggestions = (books: Book[]) => {
  const tags = uniqueSorted(books.flatMap((book) => normalizeMultiValue(book.tags)));
  const collections = uniqueSorted(
    books.flatMap((book) => normalizeMultiValue(book.collections))
  );
  const projects = uniqueSorted(books.flatMap((book) => normalizeMultiValue(book.projects)));
  const locations = uniqueSorted(books.map((book) => book.location || ""));

  return { tags, collections, projects, locations };
};
