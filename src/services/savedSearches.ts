export type SavedSearch = {
  id: string;
  name: string;
  query: string;
  createdAt: string;
};

const STORAGE_KEY = "gnosis.savedSearches";

export const loadSavedSearches = (): SavedSearch[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as SavedSearch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export const persistSavedSearches = (searches: SavedSearch[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
};

export const createSavedSearch = (name: string, query: string): SavedSearch => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: name.trim() || "Saved search",
  query: query.trim(),
  createdAt: new Date().toISOString(),
});
