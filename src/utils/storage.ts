import type { LibraryState } from '../types/library';

const STORAGE_KEY = 'visual-bookshelf-state';

export const loadState = (): LibraryState | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as LibraryState;
  } catch {
    return null;
  }
};

export const saveState = (state: LibraryState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearState = () => {
  localStorage.removeItem(STORAGE_KEY);
};
