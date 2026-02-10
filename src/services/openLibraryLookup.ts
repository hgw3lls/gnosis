import { parseIsbn } from "../utils/isbn";

export type IsbnLookupMapped = {
  title: string;
  authors: string;
  publisher: string;
  publish_year: string;
  cover_image: string;
  isbn13: string;
};

type OpenLibraryBook = {
  title?: string;
  publish_date?: string;
  authors?: Array<{ name?: string }>;
  publishers?: Array<{ name?: string }>;
  cover?: { large?: string; medium?: string; small?: string };
  identifiers?: { isbn_13?: string[] };
};

type OpenLibraryApiBooksResponse = Record<string, OpenLibraryBook | undefined>;

const pickYear = (value?: string) => {
  if (!value) {
    return "";
  }
  const match = value.match(/(\d{4})/);
  return match ? match[1] : "";
};

export const mapOpenLibraryBook = (
  entry: OpenLibraryBook | null,
  fallbackIsbn13: string
): IsbnLookupMapped | null => {
  if (!entry) {
    return null;
  }

  const mapped: IsbnLookupMapped = {
    title: entry.title ?? "",
    authors: Array.isArray(entry.authors)
      ? entry.authors.map((author) => author?.name).filter(Boolean).join(", ")
      : "",
    publisher: Array.isArray(entry.publishers)
      ? entry.publishers.map((publisher) => publisher?.name).filter(Boolean).join(", ")
      : "",
    publish_year: pickYear(entry.publish_date),
    cover_image:
      entry.cover?.large ||
      entry.cover?.medium ||
      entry.cover?.small ||
      `https://covers.openlibrary.org/b/isbn/${fallbackIsbn13}-L.jpg`,
    isbn13: entry.identifiers?.isbn_13?.[0] ?? fallbackIsbn13,
  };

  return mapped;
};

const fetchJson = async <T>(url: string): Promise<T | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export const lookupBookByIsbn = async (rawIsbn: string): Promise<IsbnLookupMapped | null> => {
  const parsed = parseIsbn(rawIsbn);
  if (!parsed.isbn13 && !parsed.isbn10) {
    return null;
  }

  const key = parsed.isbn13 ?? parsed.isbn10;
  if (!key) {
    return null;
  }

  const apiBooks = await fetchJson<OpenLibraryApiBooksResponse>(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${key}&format=json&jscmd=data`
  );
  const firstHit = apiBooks?.[`ISBN:${key}`];
  if (firstHit) {
    return mapOpenLibraryBook(firstHit, parsed.isbn13 ?? "");
  }

  const search = await fetchJson<{ docs?: Array<{ key?: string }> }>(
    `https://openlibrary.org/search.json?q=isbn:${encodeURIComponent(key)}&limit=1`
  );
  const workKey = search?.docs?.[0]?.key;
  if (!workKey) {
    return null;
  }

  const detail = await fetchJson<OpenLibraryBook>(`https://openlibrary.org${workKey}.json`);
  return mapOpenLibraryBook(detail ?? null, parsed.isbn13 ?? "");
};
