type LookupRequest = {
  title: string;
  author: string;
  googleApiKey?: string;
};

export type IsbnCandidate = {
  isbn13: string;
  title?: string;
  authors?: string;
  publisher?: string;
  publish_year?: string;
  language?: string;
  format?: string;
  cover_image?: string;
  source: "openlibrary" | "google";
  confidence: number;
  workKey?: string;
};

export type IsbnLookupResult = {
  isbn13: string | null;
  confidence: number;
  candidate: IsbnCandidate | null;
  alternatives: IsbnCandidate[];
};

type CacheEntry = {
  response: IsbnLookupResult;
  updatedAt: number;
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const CACHE_KEY_PREFIX = "gnosis.isbnLookup.";
const memoryCache = new Map<string, CacheEntry>();

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokenize = (value: string) =>
  normalizeText(value)
    .split(" ")
    .filter(Boolean);

const jaccardSimilarity = (left: string, right: string) => {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }
  let intersection = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  });
  const union = leftTokens.size + rightTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

const scoreCandidate = (
  candidate: Omit<IsbnCandidate, "confidence">,
  title: string,
  author: string
) => {
  const titleScore = candidate.title ? jaccardSimilarity(candidate.title, title) : 0;
  const authorScore = candidate.authors ? jaccardSimilarity(candidate.authors, author) : 0;
  let score = titleScore * 0.65 + authorScore * 0.35;
  if (candidate.isbn13) {
    score += 0.1;
  }
  const format = candidate.format?.toLowerCase() ?? "";
  if (format.includes("ebook") || format.includes("digital")) {
    score -= 0.15;
  }
  if (format.includes("print") || format.includes("hardcover") || format.includes("paperback")) {
    score += 0.05;
  }
  return Math.max(0, Math.min(1, score));
};

const fetchJson = async <T>(url: string, timeoutMs: number): Promise<T | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const mapOpenLibraryCandidates = (data: OpenLibrarySearch, title: string, author: string) =>
  (data.docs || [])
    .flatMap((doc) => {
      const isbn13 = (doc.isbn || []).find((isbn) => isbn.length === 13);
      if (!isbn13) {
        return [];
      }
      const candidate: Omit<IsbnCandidate, "confidence"> = {
        isbn13,
        title: doc.title ?? doc.title_suggest ?? "",
        authors: (doc.author_name || []).join(", "),
        publisher: (doc.publisher || [])[0],
        publish_year: doc.first_publish_year ? String(doc.first_publish_year) : "",
        language: (doc.language || [])[0],
        format: doc.physical_format ?? "",
        cover_image: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
          : "",
        source: "openlibrary",
        workKey: doc.key,
      };
      return [
        {
          ...candidate,
          confidence: scoreCandidate(candidate, title, author),
        },
      ];
    })
    .filter((candidate) => candidate.isbn13);

const mapGoogleCandidates = (data: GoogleBooksResponse, title: string, author: string) =>
  (data.items || [])
    .flatMap((item) => {
      const identifiers = item.volumeInfo?.industryIdentifiers || [];
      const isbn13 = identifiers.find((entry) => entry.type === "ISBN_13")?.identifier;
      if (!isbn13) {
        return [];
      }
      const format = item.saleInfo?.isEbook ? "ebook" : "print";
      const candidate: Omit<IsbnCandidate, "confidence"> = {
        isbn13,
        title: item.volumeInfo?.title ?? "",
        authors: (item.volumeInfo?.authors || []).join(", "),
        publisher: item.volumeInfo?.publisher ?? "",
        publish_year: item.volumeInfo?.publishedDate
          ? item.volumeInfo.publishedDate.slice(0, 4)
          : "",
        language: item.volumeInfo?.language ?? "",
        format,
        cover_image: item.volumeInfo?.imageLinks?.thumbnail ?? "",
        source: "google",
      };
      return [
        {
          ...candidate,
          confidence: scoreCandidate(candidate, title, author),
        },
      ];
    })
    .filter((candidate) => candidate.isbn13);

const shouldVerifyAmbiguous = (candidates: IsbnCandidate[]) => {
  if (candidates.length < 2) {
    return false;
  }
  const [first, second] = candidates;
  return Math.abs(first.confidence - second.confidence) < 0.05;
};

const verifyOpenLibraryEditions = async (workKey: string, isbn13: string) => {
  const editions = await fetchJson<OpenLibraryEditions>(
    `https://openlibrary.org${workKey}/editions.json?limit=40`,
    4000
  );
  if (!editions) {
    return false;
  }
  return (editions.entries || []).some((entry) =>
    (entry.isbn_13 || []).some((value) => value === isbn13)
  );
};

const getCache = (key: string): CacheEntry | null => {
  const memory = memoryCache.get(key);
  if (memory) {
    return memory;
  }
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CacheEntry;
    return parsed;
  } catch (error) {
    return null;
  }
};

const saveCache = (key: string, entry: CacheEntry) => {
  memoryCache.set(key, entry);
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(entry));
};

const isFresh = (entry: CacheEntry) => Date.now() - entry.updatedAt < CACHE_TTL_MS;

export const findIsbn13ByTitleAuthor = async ({
  title,
  author,
  googleApiKey,
}: LookupRequest): Promise<IsbnLookupResult> => {
  const normalizedTitle = title.trim();
  const normalizedAuthor = author.trim();
  const cacheKey = `${normalizeText(normalizedTitle)}::${normalizeText(normalizedAuthor)}`;

  const cached = getCache(cacheKey);
  if (cached) {
    if (!isFresh(cached)) {
      void (async () => {
        const refreshed = await findIsbn13ByTitleAuthor({
          title: normalizedTitle,
          author: normalizedAuthor,
          googleApiKey,
        });
        saveCache(cacheKey, { response: refreshed, updatedAt: Date.now() });
      })();
    }
    return cached.response;
  }

  const openLibraryUrl = new URL("https://openlibrary.org/search.json");
  openLibraryUrl.searchParams.set("title", normalizedTitle);
  openLibraryUrl.searchParams.set("author", normalizedAuthor);
  openLibraryUrl.searchParams.set("limit", "10");

  const googleUrl = new URL("https://www.googleapis.com/books/v1/volumes");
  googleUrl.searchParams.set(
    "q",
    `intitle:${normalizedTitle} inauthor:${normalizedAuthor}`
  );
  googleUrl.searchParams.set("maxResults", "10");
  googleUrl.searchParams.set("printType", "books");
  if (googleApiKey) {
    googleUrl.searchParams.set("key", googleApiKey);
  }

  const [openLibraryData, googleData] = await Promise.all([
    fetchJson<OpenLibrarySearch>(openLibraryUrl.toString(), 4500),
    fetchJson<GoogleBooksResponse>(googleUrl.toString(), 4500),
  ]);

  let candidates = [
    ...(openLibraryData ? mapOpenLibraryCandidates(openLibraryData, title, author) : []),
    ...(googleData ? mapGoogleCandidates(googleData, title, author) : []),
  ].sort((a, b) => b.confidence - a.confidence);

  if (!candidates.length) {
    const emptyResult: IsbnLookupResult = {
      isbn13: null,
      confidence: 0,
      candidate: null,
      alternatives: [],
    };
    saveCache(cacheKey, { response: emptyResult, updatedAt: Date.now() });
    return emptyResult;
  }

  if (shouldVerifyAmbiguous(candidates)) {
    const best = candidates.find((candidate) => candidate.workKey);
    if (best?.workKey) {
      const verified = await verifyOpenLibraryEditions(best.workKey, best.isbn13);
      if (verified) {
        candidates = candidates.map((candidate) =>
          candidate.isbn13 === best.isbn13
            ? { ...candidate, confidence: Math.min(1, candidate.confidence + 0.05) }
            : candidate
        );
      }
    }
  }

  const [best, ...alternatives] = candidates;
  const result: IsbnLookupResult = {
    isbn13: best?.isbn13 ?? null,
    confidence: best?.confidence ?? 0,
    candidate: best ?? null,
    alternatives,
  };
  saveCache(cacheKey, { response: result, updatedAt: Date.now() });
  return result;
};

type OpenLibrarySearch = {
  docs?: Array<{
    key?: string;
    title?: string;
    title_suggest?: string;
    author_name?: string[];
    publisher?: string[];
    first_publish_year?: number;
    language?: string[];
    isbn?: string[];
    cover_i?: number;
    physical_format?: string;
  }>;
};

type OpenLibraryEditions = {
  entries?: Array<{
    isbn_13?: string[];
  }>;
};

type GoogleBooksResponse = {
  items?: Array<{
    volumeInfo?: {
      title?: string;
      authors?: string[];
      publisher?: string;
      publishedDate?: string;
      language?: string;
      industryIdentifiers?: Array<{ type: string; identifier: string }>;
      imageLinks?: { thumbnail?: string };
    };
    saleInfo?: {
      isEbook?: boolean;
    };
  }>;
};
