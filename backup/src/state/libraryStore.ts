import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  AppState,
  Book,
  DragPayload,
  LibraryDefinition,
  LibraryLayout,
  MultiCategoryMode,
} from '../types/library';
import { exportBooksToCsv, parseCsvText } from '../utils/csv';
import { downloadBlob } from '../utils/download';
import { buildLayouts, rebuildStateFromCsv } from '../utils/libraryBuild';
import { moveBook as moveBookPlacement } from '../utils/dnd';
import { setBookcaseShelfCount } from '../utils/layoutSettings';
import { clearState, loadState, saveState } from '../utils/storage';

const locationColumns = [
  'Location_Bookcase',
  'Location_Shelf',
  'Location_Position',
  'Location_Note',
];

const buildBooksFromCsv = (
  csvText: string,
): { booksById: Record<string, Book>; columns: string[]; rowOrder: string[] } => {
  const { rows, columns } = parseCsvText(csvText);
  const booksById: Record<string, Book> = {};
  const seenIds = new Set<string>();
  const rowOrder: string[] = [];
  const parsedColumns = [...columns];

  locationColumns.forEach((column) => {
    if (!parsedColumns.includes(column)) {
      parsedColumns.push(column);
    }
  });

  rows.forEach((row, index) => {
    const getValue = (key: string) => row[key] ?? '';
    const parseNumber = (value: string) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const idCandidate = getValue('HoldingID') || getValue('OriginalID');
    let id = idCandidate || `${getValue('Title')}-${getValue('Author')}-${index}`;
    if (id === '') {
      id = `book-${index}`;
    }
    let suffix = 1;
    while (seenIds.has(id)) {
      id = `${id}-${suffix}`;
      suffix += 1;
    }
    seenIds.add(id);
    rowOrder.push(id);

    const tagsRaw = getValue('Tags');
    const subjectsRaw = getValue('Subjects');
    const tags = tagsRaw
      .split(/[;,]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
    const subjects = subjectsRaw
      .split(/[;,]/)
      .map((subject) => subject.trim())
      .filter(Boolean);
    const locationBookcase = getValue('Location_Bookcase') || 'Primary';
    const locationShelfRaw = parseNumber(getValue('Location_Shelf'));
    const locationShelf =
      locationShelfRaw && locationShelfRaw >= 1 && locationShelfRaw <= 12
        ? locationShelfRaw
        : 1;
    const locationPositionRaw = parseNumber(getValue('Location_Position'));
    const locationPosition =
      locationPositionRaw && locationPositionRaw >= 1 ? locationPositionRaw : index + 1;
    const locationNote = getValue('Location_Note') || '';
    const raw = {
      ...row,
      Location_Bookcase: locationBookcase,
      Location_Shelf: String(locationShelf),
      Location_Position: String(locationPosition),
      Location_Note: locationNote,
    };

    const book: Book = {
      id,
      title: getValue('Title') || 'Untitled',
      author: getValue('Author') || undefined,
      publisher: getValue('Publisher') || undefined,
      language: getValue('Language') || undefined,
      format: getValue('Format') || undefined,
      confidence: getValue('Confidence') || undefined,
      notes: getValue('Notes') || undefined,
      publishYear: getValue('Publish_Year') || undefined,
      pageCount: getValue('Page_Count') || undefined,
      subjects,
      tags,
      useStatus: getValue('Use_Status') || undefined,
      source: getValue('Source') || undefined,
      isbn13: getValue('ISBN_13') || undefined,
      olid: getValue('OpenLibrary_OLID') || undefined,
      coverS: getValue('Cover_S') || undefined,
      coverM: getValue('Cover_M') || undefined,
      coverL: getValue('Cover_L') || undefined,
      primaryShelf: getValue('Primary_Shelf') || undefined,
      locationBookcase,
      locationShelf,
      locationPosition,
      locationNote,
      raw,
    };
    booksById[id] = book;
  });

  return { booksById, columns: parsedColumns, rowOrder };
};

const validateAppState = (state: AppState | null): state is AppState => {
  if (!state) {
    return false;
  }
  return Boolean(
    state.activeLibraryId &&
      state.booksById &&
      state.rowOrder &&
      state.libraries &&
      state.layoutsByLibraryId &&
      state.csvColumns,
  );
};

const deriveRowOrder = (booksById: Record<string, Book>, fallbackOrder?: string[]) => {
  const allIds = Object.keys(booksById);
  if (fallbackOrder && fallbackOrder.length > 0) {
    const filtered = fallbackOrder.filter((id) => booksById[id]);
    const remaining = allIds.filter((id) => !filtered.includes(id));
    return [...filtered, ...remaining];
  }
  return allIds;
};

const getBookIdFromPlacement = (placementId: string) => placementId.split('::')[0];

const normalizeStoredState = (state: AppState | null): AppState | null => {
  if (!state) {
    return null;
  }
  const rowOrder = deriveRowOrder(state.booksById, state.rowOrder);
  const nextBooksById: Record<string, Book> = { ...state.booksById };
  rowOrder.forEach((id, index) => {
    const book = nextBooksById[id];
    if (!book) {
      return;
    }
    const fallbackPosition = index + 1;
    const locationBookcase = book.locationBookcase || book.raw?.Location_Bookcase || 'Primary';
    const locationShelfRaw = Number.parseInt(book.raw?.Location_Shelf ?? '', 10);
    const locationShelf =
      Number.isFinite(locationShelfRaw) && locationShelfRaw >= 1 && locationShelfRaw <= 12
        ? locationShelfRaw
        : book.locationShelf || 1;
    const locationPositionRaw = Number.parseInt(book.raw?.Location_Position ?? '', 10);
    const locationPosition =
      Number.isFinite(locationPositionRaw) && locationPositionRaw >= 1
        ? locationPositionRaw
        : book.locationPosition || fallbackPosition;
    const locationNote = book.locationNote ?? book.raw?.Location_Note ?? '';
    nextBooksById[id] = {
      ...book,
      locationBookcase,
      locationShelf,
      locationPosition,
      locationNote,
      raw: {
        ...book.raw,
        Location_Bookcase: locationBookcase,
        Location_Shelf: String(locationShelf),
        Location_Position: String(locationPosition),
        Location_Note: locationNote,
      },
    };
  });
  const csvColumns = [...(state.csvColumns ?? [])];
  locationColumns.forEach((column) => {
    if (!csvColumns.includes(column)) {
      csvColumns.push(column);
    }
  });
  const normalizeShelfLabels = (labels: string[] | undefined, shelfCount: number) => {
    const next = labels ? [...labels] : [];
    if (next.length < shelfCount) {
      for (let i = next.length; i < shelfCount; i += 1) {
        next.push(`Shelf ${i + 1}`);
      }
    }
    return next.slice(0, shelfCount);
  };

  const layoutsByLibraryId = Object.fromEntries(
    Object.entries(state.layoutsByLibraryId ?? {}).map(([libraryId, layout]) => [
      libraryId,
      {
        ...layout,
        placementOverrides: layout.placementOverrides ?? {},
        bookcases: layout.bookcases.map((bookcase) => ({
          ...bookcase,
          settings: {
            ...bookcase.settings,
            shelfLabels: normalizeShelfLabels(
              bookcase.settings.shelfLabels,
              bookcase.settings.shelfCount,
            ),
          },
        })),
      },
    ]),
  );
  return {
    ...state,
    booksById: nextBooksById,
    rowOrder,
    layoutsByLibraryId,
    csvColumns,
  };
};

export type FilterState = {
  search: string;
  status: string;
  format: string;
};

export type CreateLibraryInput = {
  name: string;
  categorize: LibraryDefinition['categorize'];
  mode?: MultiCategoryMode;
};

type LibraryContextValue = {
  appState: AppState | null;
  activeLayout: LibraryLayout | null;
  filters: FilterState;
  isFilterActive: boolean;
  filteredBooks: Book[];
  filteredBookIds: Set<string>;
  availableFormats: string[];
  availableStatuses: string[];
  groupedByShelf: Record<string, string[]>;
  setFilters: (updates: Partial<FilterState>) => void;
  setActiveLibraryId: (libraryId: string) => void;
  setBookcaseShelfCount: (bookcaseId: string, nextCount: number) => void;
  moveBook: (payload: DragPayload, targetShelfId: string, targetIndex: number) => void;
  updateBook: (bookId: string, updates: Partial<Book>) => void;
  updateBookcaseName: (bookcaseId: string, nextName: string) => void;
  updateShelfLabel: (bookcaseId: string, shelfIndex: number, label: string) => void;
  resetFromCsv: () => void;
  exportCsv: () => void;
  exportJson: () => void;
  importCsv: (file: File) => void;
  importJson: (file: File) => void;
  createLibrary: (input: CreateLibraryInput) => boolean;
};

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export const LibraryProvider = ({ children }: { children: React.ReactNode }) => {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [filters, setFiltersState] = useState<FilterState>({
    search: '',
    status: 'all',
    format: 'all',
  });

  useEffect(() => {
    const loadCsv = async () => {
      const response = await fetch('/library.csv');
      const text = await response.text();
      const { booksById, columns, rowOrder } = buildBooksFromCsv(text);
      const nextState = rebuildStateFromCsv({ booksById, rowOrder, columns });
      setAppState(nextState);
    };

    const stored = loadState();
    if (validateAppState(stored)) {
      setAppState(stored);
      return;
    }
    loadCsv();
  }, []);

  useEffect(() => {
    if (appState) {
      saveState(appState);
    }
  }, [appState]);

  const activeLayout = useMemo(() => {
    if (!appState) {
      return null;
    }
    return appState.layoutsByLibraryId[appState.activeLibraryId] ?? null;
  }, [appState]);

  const availableFormats = useMemo(() => {
    if (!appState) {
      return [];
    }
    const formats = new Set<string>();
    Object.values(appState.booksById).forEach((book) => {
      if (book.format) {
        formats.add(book.format);
      }
    });
    return Array.from(formats).sort((a, b) => a.localeCompare(b));
  }, [appState]);

  const availableStatuses = useMemo(() => {
    if (!appState) {
      return [];
    }
    const statuses = new Set<string>();
    Object.values(appState.booksById).forEach((book) => {
      if (book.useStatus) {
        statuses.add(book.useStatus);
      }
    });
    return Array.from(statuses).sort((a, b) => a.localeCompare(b));
  }, [appState]);

  const filteredBooks = useMemo(() => {
    if (!appState) {
      return [];
    }
    const search = filters.search.trim().toLowerCase();
    return appState.rowOrder
      .map((id) => appState.booksById[id])
      .filter((book): book is Book => Boolean(book))
      .filter((book) => {
        if (filters.status !== 'all' && book.useStatus !== filters.status) {
          return false;
        }
        if (filters.format !== 'all' && book.format !== filters.format) {
          return false;
        }
        if (!search) {
          return true;
        }
        const haystack = [
          book.title,
          book.author,
          book.publisher,
          book.publishYear,
          book.primaryShelf,
          ...(book.tags ?? []),
          ...(book.subjects ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      });
  }, [appState, filters]);

  const filteredBookIds = useMemo(
    () => new Set(filteredBooks.map((book) => book.id)),
    [filteredBooks],
  );

  const isFilterActive =
    filters.search.trim() !== '' || filters.status !== 'all' || filters.format !== 'all';

  const groupedByShelf = useMemo(() => {
    if (!activeLayout) {
      return {};
    }
    const shelfMap: Record<string, string[]> = {};
    Object.entries(activeLayout.shelvesById).forEach(([shelfId, shelf]) => {
      shelfMap[shelfId] = shelf.bookIds.filter((placementId) =>
        filteredBookIds.has(getBookIdFromPlacement(placementId)),
      );
    });
    return shelfMap;
  }, [activeLayout, filteredBookIds]);

  const setFilters = useCallback((updates: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setActiveLibraryId = useCallback((libraryId: string) => {
    setAppState((prev) => (prev ? { ...prev, activeLibraryId: libraryId } : prev));
  }, []);

  const handleSetBookcaseShelfCount = useCallback((bookcaseId: string, nextCount: number) => {
    setAppState((prev) => {
      if (!prev) {
        return prev;
      }
      const layout = prev.layoutsByLibraryId[prev.activeLibraryId];
      if (!layout) {
        return prev;
      }
      const nextLayout = setBookcaseShelfCount(layout, bookcaseId, nextCount);
      if (nextLayout === layout) {
        return prev;
      }
      return {
        ...prev,
        layoutsByLibraryId: { ...prev.layoutsByLibraryId, [layout.libraryId]: nextLayout },
      };
    });
  }, []);

  const moveBook = useCallback(
    (payload: DragPayload, targetShelfId: string, targetIndex: number) => {
      setAppState((prev) => {
        if (!prev) {
          return prev;
        }
        const layout = prev.layoutsByLibraryId[prev.activeLibraryId];
        if (!layout) {
          return prev;
        }
        const targetShelf = layout.shelvesById[targetShelfId];
        if (!targetShelf) {
          return prev;
        }
        const nextLayout = moveBookPlacement(layout, {
          bookId: payload.bookId,
          fromShelfId: payload.fromShelfId,
          toShelfId: targetShelfId,
          toIndex: targetIndex,
        });
        if (nextLayout === layout) {
          return prev;
        }
        const nextBooksById = { ...prev.booksById };
        const bookcaseForShelf = nextLayout.bookcases.find((caseItem) =>
          caseItem.shelfIds.includes(targetShelfId),
        );
        const shelfIndex =
          bookcaseForShelf?.shelfIds.findIndex((id) => id === targetShelfId) ?? -1;
        const shelfNumber = shelfIndex >= 0 ? shelfIndex + 1 : 1;
        const updatedShelf = nextLayout.shelvesById[targetShelfId];
        updatedShelf?.bookIds.forEach((placementId, index) => {
          const bookId = getBookIdFromPlacement(placementId);
          const book = nextBooksById[bookId];
          if (!book) {
            return;
          }
          nextBooksById[bookId] = {
            ...book,
            locationShelf: shelfNumber,
            locationPosition: index + 1,
            raw: {
              ...book.raw,
              Location_Shelf: String(shelfNumber),
              Location_Position: String(index + 1),
            },
          };
        });
        return {
          ...prev,
          booksById: nextBooksById,
          layoutsByLibraryId: {
            ...prev.layoutsByLibraryId,
            [layout.libraryId]: nextLayout,
          },
        };
      });
    },
    [],
  );

  const updateBook = useCallback((bookId: string, updates: Partial<Book>) => {
    setAppState((prev) => {
      if (!prev) {
        return prev;
      }
      const book = prev.booksById[bookId];
      if (!book) {
        return prev;
      }
      const nextBook = { ...book, ...updates, raw: { ...book.raw } };
      if (updates.locationBookcase !== undefined) {
        nextBook.locationBookcase = updates.locationBookcase || 'Primary';
        nextBook.raw.Location_Bookcase = nextBook.locationBookcase;
      }
      if (updates.locationShelf !== undefined) {
        const normalizedShelf = Math.min(12, Math.max(1, updates.locationShelf));
        nextBook.locationShelf = normalizedShelf;
        nextBook.raw.Location_Shelf = String(normalizedShelf);
      }
      if (updates.locationPosition !== undefined) {
        const normalizedPosition = Math.max(1, updates.locationPosition);
        nextBook.locationPosition = normalizedPosition;
        nextBook.raw.Location_Position = String(normalizedPosition);
      }
      if (updates.locationNote !== undefined) {
        nextBook.locationNote = updates.locationNote;
        nextBook.raw.Location_Note = updates.locationNote ?? '';
      }
      return {
        ...prev,
        booksById: { ...prev.booksById, [bookId]: nextBook },
      };
    });
  }, []);

  const updateBookcaseName = useCallback((bookcaseId: string, nextName: string) => {
    setAppState((prev) => {
      if (!prev) {
        return prev;
      }
      const layout = prev.layoutsByLibraryId[prev.activeLibraryId];
      if (!layout) {
        return prev;
      }
      const target = layout.bookcases.find((caseItem) => caseItem.id === bookcaseId);
      if (!target) {
        return prev;
      }
      const trimmed = nextName.trim() || target.name;
      if (trimmed === target.name) {
        return prev;
      }
      const nextLayout = {
        ...layout,
        bookcases: layout.bookcases.map((caseItem) =>
          caseItem.id === bookcaseId ? { ...caseItem, name: trimmed } : caseItem,
        ),
      };
      const nextBooksById = { ...prev.booksById };
      Object.values(nextBooksById).forEach((book) => {
        if (book.locationBookcase === target.name) {
          nextBooksById[book.id] = {
            ...book,
            locationBookcase: trimmed,
            raw: {
              ...book.raw,
              Location_Bookcase: trimmed,
            },
          };
        }
      });
      return {
        ...prev,
        booksById: nextBooksById,
        layoutsByLibraryId: {
          ...prev.layoutsByLibraryId,
          [layout.libraryId]: nextLayout,
        },
      };
    });
  }, []);

  const updateShelfLabel = useCallback((bookcaseId: string, shelfIndex: number, label: string) => {
    setAppState((prev) => {
      if (!prev) {
        return prev;
      }
      const layout = prev.layoutsByLibraryId[prev.activeLibraryId];
      if (!layout) {
        return prev;
      }
      const nextLayout = {
        ...layout,
        bookcases: layout.bookcases.map((caseItem) => {
          if (caseItem.id !== bookcaseId) {
            return caseItem;
          }
          const shelfLabels = [...(caseItem.settings.shelfLabels ?? [])];
          shelfLabels[shelfIndex] = label;
          return {
            ...caseItem,
            settings: {
              ...caseItem.settings,
              shelfLabels,
            },
          };
        }),
      };
      return {
        ...prev,
        layoutsByLibraryId: {
          ...prev.layoutsByLibraryId,
          [layout.libraryId]: nextLayout,
        },
      };
    });
  }, []);

  const resetFromCsv = useCallback(async () => {
    clearState();
    const response = await fetch('/library.csv');
    const text = await response.text();
    const { booksById, columns, rowOrder } = buildBooksFromCsv(text);
    const nextState = rebuildStateFromCsv({ booksById, rowOrder, columns, previousState: appState });
    setAppState(nextState);
  }, [appState]);

  const exportJson = useCallback(() => {
    if (!appState) {
      return;
    }
    downloadBlob('gnosis-library.json', JSON.stringify(appState, null, 2), 'application/json');
  }, [appState]);

  const exportCsv = useCallback(() => {
    if (!appState) {
      return;
    }
    const books = appState.rowOrder
      .map((id) => appState.booksById[id])
      .filter((book): book is Book => Boolean(book));
    const csv = exportBooksToCsv(books, appState.csvColumns);
    downloadBlob('gnosis-library.csv', csv, 'text/csv');
  }, [appState]);

  const importJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        const normalized = normalizeStoredState(parsed);
        if (!normalized || !validateAppState(normalized)) {
          throw new Error('Invalid file');
        }
        setAppState(normalized);
      } catch {
        window.alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }, []);

  const importCsv = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result);
        const { booksById, columns, rowOrder } = buildBooksFromCsv(text);
        const nextState = rebuildStateFromCsv({
          booksById,
          rowOrder,
          columns,
          previousState: appState,
        });
        setAppState(nextState);
      };
      reader.readAsText(file);
    },
    [appState],
  );

  const createLibrary = useCallback(
    (input: CreateLibraryInput) => {
      if (!appState || input.name.trim() === '') {
        return false;
      }
      const id = `library-${Date.now()}`;
      const newLibrary: LibraryDefinition = {
        id,
        name: input.name.trim(),
        categorize: input.categorize,
        ...(input.categorize === 'Tags' ? { multiCategoryMode: input.mode ?? 'duplicate' } : {}),
      };
      const nextLibraries = [...appState.libraries, newLibrary];
      const nextLayouts = buildLayouts({
        booksById: appState.booksById,
        rowOrder: appState.rowOrder,
        libraries: nextLibraries,
        previousLayouts: appState.layoutsByLibraryId,
      });
      setAppState({
        ...appState,
        libraries: nextLibraries,
        layoutsByLibraryId: nextLayouts,
        activeLibraryId: newLibrary.id,
      });
      return true;
    },
    [appState],
  );

  const value: LibraryContextValue = {
    appState,
    activeLayout,
    filters,
    isFilterActive,
    filteredBooks,
    filteredBookIds,
    availableFormats,
    availableStatuses,
    groupedByShelf,
    setFilters,
    setActiveLibraryId,
    setBookcaseShelfCount: handleSetBookcaseShelfCount,
    moveBook,
    updateBook,
    updateBookcaseName,
    updateShelfLabel,
    resetFromCsv,
    exportCsv,
    exportJson,
    importCsv,
    importJson,
    createLibrary,
  };

  return createElement(LibraryContext.Provider, { value }, children);
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within LibraryProvider');
  }
  return context;
};
