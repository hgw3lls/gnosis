import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import Bookcase from './components/Bookcase';
import LibrarySwitcher from './components/LibrarySwitcher';
import type {
  AppState,
  Book,
  DragPayload,
  LibraryDefinition,
  MultiCategoryMode,
} from './types/library';
import { parseCsvText, exportBooksToCsv } from './utils/csv';
import { downloadBlob } from './utils/download';
import { buildLayouts, rebuildStateFromCsv } from './utils/libraryBuild';
import { moveBook } from './utils/dnd';
import { setBookcaseShelfCount } from './utils/layoutSettings';
import { clearState, loadState, saveState } from './utils/storage';

type DropIndicator = { shelfId: string; index: number } | null;

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
    const locationBookcase =
      book.locationBookcase || book.raw?.Location_Bookcase || 'Primary';
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
  const layoutsByLibraryId = Object.fromEntries(
    Object.entries(state.layoutsByLibraryId ?? {}).map(([libraryId, layout]) => [
      libraryId,
      {
        ...layout,
        placementOverrides: layout.placementOverrides ?? {},
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

const App = () => {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null);
  const [draggingPlacementId, setDraggingPlacementId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedBookcaseId, setSelectedBookcaseId] = useState<string | null>(null);
  const [showCreateLibrary, setShowCreateLibrary] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState('');
  const [newLibraryField, setNewLibraryField] = useState<LibraryDefinition['categorize']>('Primary_Shelf');
  const [newLibraryMode, setNewLibraryMode] = useState<MultiCategoryMode>('duplicate');
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleShelfCountChange = (bookcaseId: string, nextCount: number) => {
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
  };

  const handleDragStart = (payload: DragPayload) => {
    setDraggingPlacementId(payload.bookId);
  };

  const handleDragEnd = () => {
    setDraggingPlacementId(null);
    setDropIndicator(null);
  };

  const handleDragOverShelf = (shelfId: string, index: number) => {
    setDropIndicator({ shelfId, index });
  };

  const handleDragLeaveShelf = (_event: DragEvent<HTMLDivElement>, shelfId: string) => {
    if (dropIndicator?.shelfId === shelfId) {
      setDropIndicator(null);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetShelfId: string) => {
    event.preventDefault();
    if (!appState || !activeLayout) {
      return;
    }
    const payloadRaw = event.dataTransfer.getData('application/json');
    if (!payloadRaw) {
      return;
    }
    let payload: DragPayload;
    try {
      payload = JSON.parse(payloadRaw) as DragPayload;
    } catch {
      return;
    }
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
      const targetIndex =
        dropIndicator && dropIndicator.shelfId === targetShelfId
          ? dropIndicator.index
          : targetShelf.bookIds.length;
      const nextLayout = moveBook(layout, {
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

    setDropIndicator(null);
    setDraggingPlacementId(null);
  };

  const handleBookUpdate = (bookId: string, updates: Partial<Book>) => {
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
  };

  const handleReset = async () => {
    clearState();
    const response = await fetch('/library.csv');
    const text = await response.text();
    const { booksById, columns, rowOrder } = buildBooksFromCsv(text);
    const nextState = rebuildStateFromCsv({ booksById, rowOrder, columns, previousState: appState });
    setAppState(nextState);
    setSelectedBookId(null);
    setSelectedBookcaseId(null);
  };

  const handleExportJson = () => {
    if (!appState) {
      return;
    }
    downloadBlob('gnosis-library.json', JSON.stringify(appState, null, 2), 'application/json');
  };

  const handleImportJson = (file: File) => {
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
  };

  const handleExportCsv = () => {
    if (!appState) {
      return;
    }
    const books = appState.rowOrder
      .map((id) => appState.booksById[id])
      .filter((book): book is Book => Boolean(book));
    const csv = exportBooksToCsv(books, appState.csvColumns);
    downloadBlob('gnosis-library.csv', csv, 'text/csv');
  };

  const handleImportCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const { booksById, columns, rowOrder } = buildBooksFromCsv(text);
      const nextState = rebuildStateFromCsv({ booksById, rowOrder, columns, previousState: appState });
      setAppState(nextState);
    };
    reader.readAsText(file);
  };

  const handleCreateLibrary = () => {
    if (!appState || newLibraryName.trim() === '') {
      return;
    }
    const id = `library-${Date.now()}`;
    const newLibrary: LibraryDefinition = {
      id,
      name: newLibraryName.trim(),
      categorize: newLibraryField,
      ...(newLibraryField === 'Tags' ? { multiCategoryMode: newLibraryMode } : {}),
    };
    const nextLibraries = [...appState.libraries, newLibrary];
    const nextLayouts = buildLayouts({
      booksById: appState.booksById,
      rowOrder: appState.rowOrder,
      libraries: [...appState.libraries, newLibrary],
      previousLayouts: appState.layoutsByLibraryId,
    });
    setAppState({
      ...appState,
      libraries: nextLibraries,
      layoutsByLibraryId: nextLayouts,
      activeLibraryId: newLibrary.id,
    });
    setNewLibraryName('');
    setNewLibraryField('Primary_Shelf');
    setNewLibraryMode('duplicate');
    setShowCreateLibrary(false);
  };

  if (!appState || !activeLayout) {
    return (
      <main className="min-h-screen bg-white px-6 py-12 text-black">
        <p className="text-xs uppercase tracking-[0.3em]">Loading library...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 pb-16 pt-12 text-black">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-2">
        <h1 className="text-5xl uppercase tracking-[0.4em]">GNOSIS</h1>
        <p className="text-xs uppercase tracking-[0.4em]">Library</p>
      </header>

      <section className="mx-auto mt-10 w-full max-w-6xl">
        <div className="flex flex-col gap-4 border-2 border-black px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <LibrarySwitcher
              libraries={appState.libraries}
              activeLibraryId={appState.activeLibraryId}
              onChange={(libraryId) => {
                setAppState((prev) => (prev ? { ...prev, activeLibraryId: libraryId } : prev));
                setSelectedBookId(null);
                setSelectedBookcaseId(null);
              }}
            />
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em]">
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Import CSV
              </button>
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Import JSON
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Reset to CSV
              </button>
              <button
                type="button"
                onClick={() => setShowCreateLibrary((prev) => !prev)}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Create Library
              </button>
            </div>
          </div>

          {showCreateLibrary ? (
            <div className="flex flex-wrap items-end gap-4 border-t-2 border-black pt-4 text-xs uppercase tracking-[0.3em]">
              <div className="flex flex-col gap-2">
                <label htmlFor="new-library-name">Name</label>
                <input
                  id="new-library-name"
                  value={newLibraryName}
                  onChange={(event) => setNewLibraryName(event.target.value)}
                  className="min-w-[220px] border-2 border-black px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="new-library-field">Categorize</label>
                <select
                  id="new-library-field"
                  value={newLibraryField}
                  onChange={(event) =>
                    setNewLibraryField(event.target.value as LibraryDefinition['categorize'])
                  }
                  className="min-w-[200px] border-2 border-black bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                >
                  <option value="Primary_Shelf">Primary Shelf</option>
                  <option value="Format">Format</option>
                  <option value="Language">Language</option>
                  <option value="Source">Source</option>
                  <option value="Use_Status">Status</option>
                  <option value="Tags">Tags</option>
                </select>
              </div>
              {newLibraryField === 'Tags' ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor="new-library-mode">Tag Mode</label>
                  <select
                    id="new-library-mode"
                    value={newLibraryMode}
                    onChange={(event) =>
                      setNewLibraryMode(event.target.value as MultiCategoryMode)
                    }
                    className="min-w-[160px] border-2 border-black bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                  >
                    <option value="duplicate">Duplicate</option>
                    <option value="first">First</option>
                    <option value="split">Split</option>
                  </select>
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleCreateLibrary}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Add Library
              </button>
            </div>
          ) : null}
        </div>

        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              handleImportCsv(file);
            }
            event.target.value = '';
          }}
        />
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              handleImportJson(file);
            }
            event.target.value = '';
          }}
        />

        <div className="mt-8 flex flex-col gap-10">
          {activeLayout.bookcases.map((bookcase) => (
            <Bookcase
              key={bookcase.id}
              bookcase={bookcase}
              shelvesById={activeLayout.shelvesById}
              booksById={appState.booksById}
              draggingPlacementId={draggingPlacementId}
              dropIndicator={dropIndicator}
              selectedBookId={selectedBookcaseId === bookcase.id ? selectedBookId : null}
              onSelectBook={(bookId, bookcaseId) => {
                setSelectedBookId(bookId);
                setSelectedBookcaseId(bookcaseId);
              }}
              onCloseDetail={() => {
                setSelectedBookId(null);
                setSelectedBookcaseId(null);
              }}
              onUpdateBook={handleBookUpdate}
              onShelfCountChange={handleShelfCountChange}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverShelf={handleDragOverShelf}
              onDragLeaveShelf={handleDragLeaveShelf}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </section>
    </main>
  );
};

export default App;
