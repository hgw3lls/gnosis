import type { ShelfCode } from '../types/library';
import { SHELVES } from '../types/library';

const shelfAliases: Record<string, ShelfCode> = {
  'i': 'I',
  'ii': 'II',
  'iii': 'III',
  'iv': 'IV',
  'v': 'V',
  'vi': 'VI',
};

export const shelfNameByCode = (code: ShelfCode) =>
  SHELVES.find((shelf) => shelf.code === code)?.name ?? 'Unknown Shelf';

export const normalizeShelfCode = (value: string | undefined): ShelfCode => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) {
    return 'I';
  }
  if (shelfAliases[normalized]) {
    return shelfAliases[normalized];
  }
  const romanMatch = normalized.match(/^(i|ii|iii|iv|v|vi)/i);
  if (romanMatch && shelfAliases[romanMatch[1].toLowerCase()]) {
    return shelfAliases[romanMatch[1].toLowerCase()];
  }
  const shelf = SHELVES.find((entry) =>
    entry.name.toLowerCase().includes(normalized),
  );
  return shelf?.code ?? 'I';
};

export const inferShelfFromPrimary = (primaryShelf: string): ShelfCode => {
  const cleaned = primaryShelf.trim().toLowerCase();
  const shelf = SHELVES.find((entry) =>
    entry.name.toLowerCase().includes(cleaned),
  );
  return shelf?.code ?? normalizeShelfCode(primaryShelf);
};

export const shelfOptions = SHELVES.map((shelf) => ({
  value: shelf.code,
  label: `${shelf.code}. ${shelf.name}`,
}));
