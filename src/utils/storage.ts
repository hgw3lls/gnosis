import type { AppState } from '../types/library';

const STORAGE_KEY = 'gnosis-library-state';

export const loadState = (): AppState | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearState = () => {
  localStorage.removeItem(STORAGE_KEY);
};
