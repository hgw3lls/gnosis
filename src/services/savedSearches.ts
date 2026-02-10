import { LibraryFacets, emptyFacets } from "./libraryQueryEngine";
import { LibrarySort } from "./libraryQueryEngine";

export type SavedSearch = {
  id: string;
  name: string;
  query: string;
  facets: LibraryFacets;
  sort: LibrarySort;
  createdAt: string;
};

const STORAGE_KEY = "gnosis.savedSearches.v2";
const LEGACY_STORAGE_KEY = "gnosis.savedSearches";

const defaultShelves = (): SavedSearch[] => [
  createSavedSearch("Unread", "", { ...emptyFacets(), status: ["to_read"] }, "updated"),
  createSavedSearch("Reading", "", { ...emptyFacets(), status: ["reading"] }, "updated"),
  createSavedSearch("Owned – Theory Tag", "", { ...emptyFacets(), tags: ["theory"] }, "updated"),
  createSavedSearch("Project: Dissertation", "", {
    ...emptyFacets(),
    projects: ["dissertation"],
  }, "updated"),
];

const normalizeLegacy = (raw: unknown): SavedSearch[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const item = entry as {
        id?: string;
        name?: string;
        query?: string;
        createdAt?: string;
        sort?: LibrarySort;
      };
      return createSavedSearch(
        item.name || "Saved search",
        item.query || "",
        emptyFacets(),
        item.sort || "updated",
        item.id,
        item.createdAt
      );
    })
    .filter((entry): entry is SavedSearch => Boolean(entry));
};

export const loadSavedSearches = (): SavedSearch[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedSearch[];
      if (Array.isArray(parsed) && parsed.length) {
        return parsed;
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = normalizeLegacy(JSON.parse(legacyRaw));
      if (legacy.length) {
        return legacy;
      }
    }

    return defaultShelves();
  } catch {
    return defaultShelves();
  }
};

export const persistSavedSearches = (searches: SavedSearch[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
};

export const createSavedSearch = (
  name: string,
  query: string,
  facets: LibraryFacets,
  sort: LibrarySort,
  id?: string,
  createdAt?: string
): SavedSearch => ({
  id: id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: name.trim() || "Saved search",
  query: query.trim(),
  facets: { ...facets },
  sort,
  createdAt: createdAt ?? new Date().toISOString(),
});
