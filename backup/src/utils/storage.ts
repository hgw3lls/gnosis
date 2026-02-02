import type { AppState } from '../types/library';

export const STORAGE_KEY = 'gnosis-library-state';
export const VERSION = 1;

type StoredState = {
  version: number;
  state: AppState;
};

export const migrateState = (payload: unknown): AppState | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const { version, state } = payload as StoredState;
  if (version !== VERSION) {
    return null;
  }
  return state ?? null;
};

export const loadState = (): AppState | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredState;
    return migrateState(parsed);
  } catch {
    return null;
  }
};

export const saveState = (state: AppState) => {
  const payload: StoredState = { version: VERSION, state };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const clearState = () => {
  localStorage.removeItem(STORAGE_KEY);
};
