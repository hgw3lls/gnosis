import type {
  AppState,
  Book,
  Bookcase,
  BookcaseSettings,
  LibraryDefinition,
  LibraryLayout,
  Shelf,
} from '../types/library';
import { defaultLibraries } from './libraryDefs';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const createStableId = (prefix: string, seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return `${prefix}-${Math.abs(hash).toString(36)}`;
};

const getOrderedBookIds = (booksById: Record<string, Book>, rowOrder: string[]) => {
  const ordered = rowOrder.filter((id) => id in booksById);
  const missing = Object.keys(booksById).filter((id) => !rowOrder.includes(id));
  return [...ordered, ...missing];
};

const getDefaultShelfCount = (count: number) => {
  const base = Math.ceil(count / 18);
  return clamp(base, 1, 12);
};

const distributeItems = (items: string[], shelfIds: string[]): Record<string, Shelf> => {
  const shelves: Record<string, Shelf> = {};
  shelfIds.forEach((id) => {
    shelves[id] = { id, bookIds: [] };
  });
  items.forEach((item, index) => {
    const shelfId = shelfIds[index % shelfIds.length];
    shelves[shelfId].bookIds.push(item);
  });
  return shelves;
};

type BuildLibraryLayoutArgs = {
  libraryId: string;
  booksById: Record<string, Book>;
  rowOrder: string[];
  libDef: LibraryDefinition;
  previousLayout?: LibraryLayout;
};

const getPlacementId = (book: Book, category: string, libDef: LibraryDefinition) => {
  if (libDef.categorize === 'Tags' && category.trim()) {
    return `${book.id}::tag:${category.trim()}`;
  }
  return book.id;
};

const normalizeOverrides = (
  overrides: Record<string, string> | undefined,
  booksById: Record<string, Book>,
  rowOrder: string[],
  library: LibraryDefinition,
): LibraryLayout => {
  const orderedBookIds = getOrderedBookIds(booksById, rowOrder);
  const shelfCount = getDefaultShelfCount(orderedBookIds.length);
  const shelfIds = Array.from({ length: shelfCount }, () => createId('shelf'));
  const settings: BookcaseSettings = { shelfCount };
  const shelvesById = distributeItems(orderedBookIds, shelfIds);
  const bookcase: Bookcase = {
    id: createId('bookcase'),
    name: library.name,
    shelfIds,
    settings,
  };

  return { libraryId: library.id, bookcases: [bookcase], shelvesById };
};

export const buildLayouts = (
  booksById: Record<string, Book>,
  rowOrder: string[],
  libraries: LibraryDefinition[],
): Record<string, LibraryLayout> => {
  return Object.fromEntries(
    libraries.map((library) => [library.id, buildLayoutForLibrary(booksById, rowOrder, library)]),
  );
};

export const rebuildStateFromCsv = (
  booksById: Record<string, Book>,
  rowOrder: string[],
  columns: string[],
): AppState => {
  const libraries = createDefaultLibraries();
  const layoutsByLibraryId = buildLayouts(booksById, rowOrder, libraries);
  return {
    booksById,
    rowOrder,
    libraries,
    layoutsByLibraryId,
    activeLibraryId,
    csvColumns: columns,
  };
};

export const createDefaultLibraries = (): LibraryDefinition[] => [
  { id: 'library-primary', name: 'Primary', categorize: 'Primary_Shelf' },
];

export const reflowBookcaseShelves = (
  bookcase: Bookcase,
  shelvesById: Record<string, Shelf>,
  nextShelfCount: number,
): { bookcase: Bookcase; shelvesById: Record<string, Shelf> } => {
  const existingItems = bookcase.shelfIds.flatMap((id) => shelvesById[id]?.bookIds ?? []);
  const shelfCount = clamp(nextShelfCount, 1, 12);
  let nextShelfIds = [...bookcase.shelfIds];
  const nextShelvesById = { ...shelvesById };

  if (shelfCount > nextShelfIds.length) {
    const newIds = Array.from(
      { length: shelfCount - nextShelfIds.length },
      (_value, index) => createShelfId(bookcase.id, nextShelfIds.length + index),
    );
    nextShelfIds = [...nextShelfIds, ...newIds];
  } else if (shelfCount < nextShelfIds.length) {
    const removedIds = nextShelfIds.slice(shelfCount);
    removedIds.forEach((id) => {
      delete nextShelvesById[id];
    });
    nextShelfIds = nextShelfIds.slice(0, shelfCount);
  }

  const rebuiltShelves = distributeItems(existingItems, nextShelfIds);
  Object.assign(nextShelvesById, rebuiltShelves);

  return {
    bookcase: {
      ...bookcase,
      shelfIds: nextShelfIds,
      settings: { shelfCount },
    },
    shelvesById: nextShelvesById,
  };
};
