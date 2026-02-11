import MiniSearch from "minisearch";
import { Book } from "../db/schema";
import { normalizeMultiValue } from "../utils/libraryFilters";
import { parseSearchQuery, SearchFilter } from "../utils/searchQuery";
import { SEARCH_INDEX_OPTIONS } from "./searchIndexConfig";

const INDEX_STORAGE_KEY = "gnosis.searchIndex.v1";
const INDEX_META_KEY = "gnosis.searchIndex.meta.v1";

type SearchIndexMeta = {
  signature: string;
  updatedAt: string;
};

type SearchDocument = {
  id: number;
  title: string;
  authors: string;
  publisher: string;
  tags: string;
  collections: string;
  projects: string;
  location: string;
  status: string;
  format: string;
  language: string;
  publish_year: string;
  notes: string;
  isbn13: string;
};

const createDocument = (book: Book): SearchDocument => ({
  id: book.id,
  title: book.title ?? "",
  authors: book.authors ?? "",
  publisher: book.publisher ?? "",
  tags: book.tags ?? "",
  collections: book.collections ?? "",
  projects: book.projects ?? "",
  location: book.location ?? "",
  status: book.status ?? "",
  format: book.format ?? "",
  language: book.language ?? "",
  publish_year: book.publish_year ?? "",
  notes: book.notes ?? "",
  isbn13: book.isbn13 ?? "",
});

const djb2Hash = (value: string) => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
};

export const getSearchIndexSignature = (books: Array<Pick<Book, "id" | "updated_at">>) => {
  const snapshot = books
    .map((book) => `${book.id}:${book.updated_at || ""}`)
    .sort()
    .join("|");
  return `${books.length}:${djb2Hash(snapshot)}`;
};

const buildIndex = (documents: SearchDocument[]) => {
  const miniSearch = new MiniSearch(SEARCH_INDEX_OPTIONS);
  miniSearch.addAll(documents);
  return miniSearch;
};

const buildIndexInWorker = async (documents: SearchDocument[]) => {
  if (typeof Worker === "undefined") {
    return buildIndex(documents);
  }

  return new Promise<MiniSearch>((resolve) => {
    try {
      const worker = new Worker(new URL("../workers/searchIndexWorker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event) => {
        const { indexJson } = event.data as { indexJson: string };
        const miniSearch = MiniSearch.loadJSON(indexJson, SEARCH_INDEX_OPTIONS);
        worker.terminate();
        resolve(miniSearch);
      };
      worker.onerror = () => {
        worker.terminate();
        resolve(buildIndex(documents));
      };
      worker.postMessage({ documents });
    } catch {
      resolve(buildIndex(documents));
    }
  });
};

const saveIndexCache = (signature: string, index: MiniSearch) => {
  const meta: SearchIndexMeta = {
    signature,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(index.toJSON()));
  localStorage.setItem(INDEX_META_KEY, JSON.stringify(meta));
};

const loadIndexCache = (signature: string): MiniSearch | null => {
  try {
    const metaRaw = localStorage.getItem(INDEX_META_KEY);
    const indexRaw = localStorage.getItem(INDEX_STORAGE_KEY);
    if (!metaRaw || !indexRaw) {
      return null;
    }
    const meta = JSON.parse(metaRaw) as SearchIndexMeta;
    if (meta.signature !== signature) {
      return null;
    }
    const indexJson = JSON.parse(indexRaw);
    return MiniSearch.loadJSON(indexJson, SEARCH_INDEX_OPTIONS);
  } catch (error) {
    return null;
  }
};

export type SearchIndexState = {
  index: MiniSearch | null;
  status: "idle" | "building" | "ready";
};

export const buildSearchIndexState = async (
  books: Book[],
  onStatus: (status: SearchIndexState["status"]) => void
): Promise<MiniSearch> => {
  const signature = getSearchIndexSignature(books);
  const cached = loadIndexCache(signature);
  if (cached) {
    return cached;
  }
  onStatus("building");
  const documents = books.map(createDocument);
  const index = await buildIndexInWorker(documents);
  saveIndexCache(signature, index);
  onStatus("ready");
  return index;
};

const applyFilters = (book: Book, filters: SearchFilter[]) =>
  filters.every((filter) => {
    switch (filter.type) {
      case "tag":
        return normalizeMultiValue(book.tags).includes(filter.value);
      case "status":
        return book.status === filter.value;
      case "location":
        return (book.location || "").toLowerCase().includes(filter.value.toLowerCase());
      case "author":
        return (book.authors || "").toLowerCase().includes(filter.value.toLowerCase());
      case "year": {
        const year = Number.parseInt(book.publish_year || "", 10);
        if (!Number.isFinite(year)) {
          return false;
        }
        switch (filter.op) {
          case ">":
            return year > filter.value;
          case "<":
            return year < filter.value;
          case ">=":
            return year >= filter.value;
          case "<=":
            return year <= filter.value;
          case "=":
          default:
            return year === filter.value;
        }
      }
      default:
        return true;
    }
  });

export const runSearch = (books: Book[], index: MiniSearch | null, query: string) => {
  const { text, filters } = parseSearchQuery(query);
  let results: Book[] = books;
  if (text) {
    if (index) {
      const ids = new Set(
        index.search(text, { prefix: true, fuzzy: 0.2 }).map((result) => result.id as number)
      );
      results = books.filter((book) => ids.has(book.id));
    } else {
      const lowered = text.toLowerCase();
      results = books.filter((book) =>
        [
          book.title,
          book.authors,
          book.publisher,
          book.tags,
          book.collections,
          book.projects,
          book.location,
          book.status,
          book.notes,
          book.isbn13,
        ]
          .join(" ")
          .toLowerCase()
          .includes(lowered)
      );
    }
  }
  if (filters.length) {
    results = results.filter((book) => applyFilters(book, filters));
  }
  return results;
};
