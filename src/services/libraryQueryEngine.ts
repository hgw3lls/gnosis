import MiniSearch from "minisearch";
import { Book } from "../db/schema";
import { normalizeMultiValue } from "../utils/libraryFilters";

export type LibraryFacets = {
  status: string[];
  format: string[];
  language: string[];
  location: string[];
  tags: string[];
  collections: string[];
  projects: string[];
  publishYearMin: string;
  publishYearMax: string;
};

export type LibrarySort = "updated" | "added" | "author" | "year";

export const emptyFacets = (): LibraryFacets => ({
  status: [],
  format: [],
  language: [],
  location: [],
  tags: [],
  collections: [],
  projects: [],
  publishYearMin: "",
  publishYearMax: "",
});

const bySort = (left: Book, right: Book, sort: LibrarySort) => {
  switch (sort) {
    case "added":
      return right.added_at.localeCompare(left.added_at);
    case "author":
      return (left.authors || "").localeCompare(right.authors || "");
    case "year": {
      const yearA = Number.parseInt(left.publish_year || "0", 10);
      const yearB = Number.parseInt(right.publish_year || "0", 10);
      return yearB - yearA;
    }
    case "updated":
    default:
      return right.updated_at.localeCompare(left.updated_at);
  }
};

const intersects = (bookValues: string[], selected: string[]) => {
  if (!selected.length) {
    return true;
  }
  return selected.some((value) => bookValues.includes(value));
};

const matchesFacets = (book: Book, facets: LibraryFacets) => {
  if (facets.status.length && !facets.status.includes(book.status)) {
    return false;
  }
  if (facets.format.length && !facets.format.includes(book.format)) {
    return false;
  }
  if (facets.language.length && !facets.language.includes(book.language)) {
    return false;
  }
  if (facets.location.length && !facets.location.includes(book.location)) {
    return false;
  }
  if (!intersects(normalizeMultiValue(book.tags), facets.tags)) {
    return false;
  }
  if (!intersects(normalizeMultiValue(book.collections), facets.collections)) {
    return false;
  }
  if (!intersects(normalizeMultiValue(book.projects), facets.projects)) {
    return false;
  }

  const year = Number.parseInt(book.publish_year || "", 10);
  const minYear = Number.parseInt(facets.publishYearMin || "", 10);
  const maxYear = Number.parseInt(facets.publishYearMax || "", 10);
  if (Number.isFinite(minYear) || Number.isFinite(maxYear)) {
    if (!Number.isFinite(year)) {
      return false;
    }
    if (Number.isFinite(minYear) && year < minYear) {
      return false;
    }
    if (Number.isFinite(maxYear) && year > maxYear) {
      return false;
    }
  }

  return true;
};

export const queryLibraryBookIds = ({
  books,
  index,
  query,
  facets,
  sort,
}: {
  books: Book[];
  index: MiniSearch | null;
  query: string;
  facets: LibraryFacets;
  sort: LibrarySort;
}) => {
  const idToBook = new Map(books.map((book) => [book.id, book]));
  const hasQuery = query.trim().length > 0;

  if (hasQuery && index) {
    const hits = index.search(query, {
      prefix: true,
      fuzzy: 0.2,
      boost: {
        title: 7,
        authors: 6,
        tags: 4,
        collections: 4,
        projects: 4,
        publisher: 2,
        location: 2,
        notes: 1,
      },
    });

    const filtered = hits
      .map((hit) => ({ id: hit.id as number, score: hit.score }))
      .filter((hit) => {
        const book = idToBook.get(hit.id);
        return book ? matchesFacets(book, facets) : false;
      });

    filtered.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const left = idToBook.get(a.id);
      const right = idToBook.get(b.id);
      if (!left || !right) {
        return 0;
      }
      return bySort(left, right, sort);
    });

    return filtered.map((entry) => entry.id);
  }

  const filteredBooks = books.filter((book) => matchesFacets(book, facets));
  filteredBooks.sort((a, b) => bySort(a, b, sort));
  return filteredBooks.map((book) => book.id);
};
