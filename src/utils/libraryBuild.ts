import type {
  AppState,
  Book,
  Bookcase,
  BookcaseSettings,
  CategorizeField,
  LibraryDefinition,
  LibraryLayout,
  MultiCategoryMode,
  Shelf,
} from '../types/library';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
};

const getBookFieldValue = (book: Book, field: CategorizeField): string => {
  switch (field) {
    case 'Primary_Shelf':
      return book.primaryShelf ?? '';
    case 'Format':
      return book.format ?? '';
    case 'Language':
      return book.language ?? '';
    case 'Source':
      return book.source ?? '';
    case 'Use_Status':
      return book.useStatus ?? '';
    case 'Tags':
      return (book.tags ?? []).join(', ');
    default:
      return '';
  }
};

const splitMultiValues = (value: string): string[] =>
  value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const getCategoriesForBook = (
  book: Book,
  field: CategorizeField,
  mode: MultiCategoryMode | undefined,
): string[] => {
  const value = getBookFieldValue(book, field);
  if (field !== 'Tags') {
    return [value];
  }
  const tags = splitMultiValues(value);
  if (tags.length === 0) {
    return [''];
  }
  if (mode === 'first') {
    return [tags[0]];
  }
  if (mode === 'split') {
    return [tags.join(' + ')];
  }
  return tags;
};

const normalizeCategoryName = (value: string) => (value.trim() === '' ? '(Uncategorized)' : value.trim());

const sortBooks = (books: Book[]) =>
  [...books].sort((a, b) => {
    const authorA = (a.author ?? '').toLowerCase();
    const authorB = (b.author ?? '').toLowerCase();
    if (authorA && authorB && authorA !== authorB) {
      return authorA.localeCompare(authorB);
    }
    const titleA = a.title.toLowerCase();
    const titleB = b.title.toLowerCase();
    if (titleA !== titleB) {
      return titleA.localeCompare(titleB);
    }
    return a.rowOrder - b.rowOrder;
  });

const getDefaultShelfCount = (count: number) => {
  const base = Math.ceil(count / 18);
  const adjusted = count >= 18 ? Math.max(2, base) : base;
  return clamp(adjusted, 1, 12);
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

export const buildLayoutForLibrary = (
  booksById: Record<string, Book>,
  library: LibraryDefinition,
): LibraryLayout => {
  const books = sortBooks(Object.values(booksById));
  const categoryMap = new Map<string, string[]>();

  books.forEach((book) => {
    const categories = getCategoriesForBook(book, library.categorize, library.multiCategoryMode);
    categories.forEach((category) => {
      const normalized = normalizeCategoryName(category);
      const placementId =
        library.categorize === 'Tags' && category.trim()
          ? `${book.id}::tag:${category.trim()}`
          : book.id;
      const list = categoryMap.get(normalized) ?? [];
      list.push(placementId);
      categoryMap.set(normalized, list);
    });
  });

  const bookcases: Bookcase[] = [];
  const shelvesById: Record<string, Shelf> = {};

  Array.from(categoryMap.entries()).forEach(([category, bookIds]) => {
    const shelfCount = getDefaultShelfCount(bookIds.length);
    const shelfIds = Array.from({ length: shelfCount }, () => createId('shelf'));
    const settings: BookcaseSettings = { shelfCount };
    const caseShelves = distributeItems(bookIds, shelfIds);
    Object.assign(shelvesById, caseShelves);
    bookcases.push({
      id: createId('bookcase'),
      name: category,
      shelfIds,
      settings,
    });
  });

  return { libraryId: library.id, bookcases, shelvesById };
};

export const buildLayouts = (
  booksById: Record<string, Book>,
  libraries: LibraryDefinition[],
): Record<string, LibraryLayout> => {
  return Object.fromEntries(
    libraries.map((library) => [library.id, buildLayoutForLibrary(booksById, library)]),
  );
};

export const rebuildStateFromCsv = (
  booksById: Record<string, Book>,
  columns: string[],
): AppState => {
  const libraries = createDefaultLibraries();
  const layoutsByLibraryId = buildLayouts(booksById, libraries);
  return {
    booksById,
    libraries,
    layoutsByLibraryId,
    activeLibraryId: libraries[0]?.id ?? '',
    csvColumns: columns,
  };
};

export const createDefaultLibraries = (): LibraryDefinition[] => [
  { id: 'library-primary', name: 'By Primary Shelf', categorize: 'Primary_Shelf' },
  { id: 'library-format', name: 'By Format', categorize: 'Format' },
  { id: 'library-language', name: 'By Language', categorize: 'Language' },
  { id: 'library-source', name: 'By Source', categorize: 'Source' },
  { id: 'library-status', name: 'By Status', categorize: 'Use_Status' },
  {
    id: 'library-tags',
    name: 'By Tags',
    categorize: 'Tags',
    multiCategoryMode: 'duplicate',
  },
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
    const newIds = Array.from({ length: shelfCount - nextShelfIds.length }, () => createId('shelf'));
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
