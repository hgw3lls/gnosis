import { useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import BookcaseView from './components/BookcaseView';
import type { Book, Bookcase, LibraryState, Shelf } from './types/bookcase';
import { parseLibraryCsv } from './utils/csv';

const FALLBACK_BOOKS: Book[] = [
  { id: 'fallback-1', title: 'Atlas of Concrete', author: 'R. Kline' },
  { id: 'fallback-2', title: 'Raw Typography', author: 'L. Serra' },
  { id: 'fallback-3', title: 'Steel & Paper', author: 'M. Osei' },
  { id: 'fallback-4', title: 'Brutal Forms', author: 'A. Patel' },
  { id: 'fallback-5', title: 'Monolith', author: 'J. Cho' },
  { id: 'fallback-6', title: 'Index of Space', author: 'K. Watanabe' },
  { id: 'fallback-7', title: 'Hard Lines', author: 'E. Novak' },
  { id: 'fallback-8', title: 'Found Objects', author: 'S. Adeyemi' },
  { id: 'fallback-9', title: 'Public Matter', author: 'D. Nguyen' },
  { id: 'fallback-10', title: 'Black Baseline', author: 'T. Ruiz' },
  { id: 'fallback-11', title: 'Static Noise', author: 'C. Long' },
  { id: 'fallback-12', title: 'Edge Study', author: 'P. Ibrahim' },
];

const DEFAULT_SHELF_COUNT = 4;
const MIN_SHELVES = 1;
const MAX_SHELVES = 12;
const STORAGE_KEY = 'gnosis-library-state';

type DragPayload = {
  bookId: string;
  fromShelfId: string;
  fromIndex: number;
};

type DropIndicator = { shelfId: string; index: number } | null;

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
};

const createShelves = (count: number): { shelfIds: string[]; shelvesById: Record<string, Shelf> } => {
  const shelfIds = Array.from({ length: count }, () => createId('shelf'));
  const shelvesById: Record<string, Shelf> = {};
  shelfIds.forEach((id) => {
    shelvesById[id] = { id, bookIds: [] };
  });
  return { shelfIds, shelvesById };
};

const buildSeedState = (books: Book[], shelfCount = DEFAULT_SHELF_COUNT): LibraryState => {
  const { shelfIds, shelvesById } = createShelves(shelfCount);
  const booksById = Object.fromEntries(books.map((book) => [book.id, book]));
  books.forEach((book, index) => {
    const shelfId = shelfIds[index % shelfIds.length];
    shelvesById[shelfId].bookIds.push(book.id);
  });

  const bookcase: Bookcase = {
    id: createId('bookcase'),
    name: 'MAIN',
    shelfIds,
  };

  return { booksById, shelvesById, bookcases: [bookcase] };
};

const fallbackState = buildSeedState(FALLBACK_BOOKS);

const App = () => {
  const [libraryState, setLibraryState] = useState<LibraryState>(fallbackState);
  const [seedBooks, setSeedBooks] = useState<Book[]>(FALLBACK_BOOKS);
  const [selectedBookcaseId, setSelectedBookcaseId] = useState<string | null>(
    fallbackState.bookcases[0]?.id ?? null,
  );
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let usedStored = false;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LibraryState;
        if (parsed.bookcases?.length) {
          setLibraryState(parsed);
          setSelectedBookcaseId(parsed.bookcases[0]?.id ?? null);
          usedStored = true;
        }
      } catch {
        // ignore
      }
    }

    const loadBooks = async () => {
      try {
        const response = await fetch('/library.csv');
        if (!response.ok) {
          throw new Error('Missing CSV');
        }
        const text = await response.text();
        const parsed = parseLibraryCsv(text);
        const libraryBooks = Object.values(parsed.books).map((book) => ({
          id: book.id,
          title: book.title || 'Untitled',
          author: book.author || undefined,
        }));
        if (libraryBooks.length) {
          setSeedBooks(libraryBooks);
          if (!usedStored) {
            const seeded = buildSeedState(libraryBooks);
            setLibraryState(seeded);
            setSelectedBookcaseId(seeded.bookcases[0]?.id ?? null);
          }
          return;
        }
      } catch {
        // fallback handled below
      }
      if (!usedStored) {
        setLibraryState(fallbackState);
      }
    };

    loadBooks();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(libraryState));
  }, [libraryState]);

  const selectedBookcase = useMemo(
    () => libraryState.bookcases.find((bookcase) => bookcase.id === selectedBookcaseId) ?? null,
    [libraryState.bookcases, selectedBookcaseId],
  );

  const selectedBook = selectedBookId ? libraryState.booksById[selectedBookId] : null;

  const detailBody = useMemo(() => {
    if (!selectedBook) {
      return '';
    }
    return `Record retained in the GNOSIS archive. This spine references catalog data captured for “${selectedBook.title}”.`;
  }, [selectedBook]);

  const handleAddBookcase = () => {
    const newBookcaseId = createId('bookcase');
    setLibraryState((prev) => {
      const nextIndex = prev.bookcases.length + 1;
      const { shelfIds, shelvesById } = createShelves(DEFAULT_SHELF_COUNT);
      const newBookcase: Bookcase = {
        id: newBookcaseId,
        name: `BOOKCASE ${nextIndex}`,
        shelfIds,
      };
      return {
        ...prev,
        shelvesById: { ...prev.shelvesById, ...shelvesById },
        bookcases: [...prev.bookcases, newBookcase],
      };
    });
    setSelectedBookcaseId(newBookcaseId);
  };

  const handleShelfCountChange = (value: number) => {
    if (!selectedBookcaseId) {
      return;
    }
    const nextCount = Math.max(MIN_SHELVES, Math.min(MAX_SHELVES, value || DEFAULT_SHELF_COUNT));

    setLibraryState((prev) => {
      const bookcase = prev.bookcases.find((item) => item.id === selectedBookcaseId);
      if (!bookcase) {
        return prev;
      }
      const currentCount = bookcase.shelfIds.length;
      if (currentCount === nextCount) {
        return prev;
      }

      const shelvesById = { ...prev.shelvesById };
      let nextShelfIds = [...bookcase.shelfIds];

      if (nextCount > currentCount) {
        const { shelfIds, shelvesById: newShelves } = createShelves(nextCount - currentCount);
        nextShelfIds = [...nextShelfIds, ...shelfIds];
        Object.assign(shelvesById, newShelves);
      } else {
        const keptShelfIds = nextShelfIds.slice(0, nextCount);
        const removedShelfIds = nextShelfIds.slice(nextCount);
        const mergedBookIds = removedShelfIds.flatMap((id) => shelvesById[id]?.bookIds ?? []);
        const lastShelfId = keptShelfIds[keptShelfIds.length - 1];
        const lastShelf = shelvesById[lastShelfId];
        shelvesById[lastShelfId] = {
          ...lastShelf,
          bookIds: [...lastShelf.bookIds, ...mergedBookIds],
        };
        removedShelfIds.forEach((id) => {
          delete shelvesById[id];
        });
        nextShelfIds = keptShelfIds;
      }

      const bookcases = prev.bookcases.map((item) =>
        item.id === bookcase.id ? { ...item, shelfIds: nextShelfIds } : item,
      );

      return { ...prev, shelvesById, bookcases };
    });
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    const seeded = buildSeedState(seedBooks);
    setLibraryState(seeded);
    setSelectedBookcaseId(seeded.bookcases[0]?.id ?? null);
    setSelectedBookId(null);
  };

  const handleDragStart = (bookId: string, fromShelfId: string, fromIndex: number) => {
    setDragging({ bookId, fromShelfId, fromIndex });
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDropIndicator(null);
  };

  const handleDragOverShelf = (event: DragEvent<HTMLDivElement>, shelfId: string) => {
    event.preventDefault();
    const shelf = libraryState.shelvesById[shelfId];
    if (!shelf) {
      return;
    }
    setDropIndicator({ shelfId, index: shelf.bookIds.length });
  };

  const handleDragLeaveShelf = (_event: DragEvent<HTMLDivElement>, shelfId: string) => {
    if (dropIndicator?.shelfId === shelfId) {
      setDropIndicator(null);
    }
  };

  const handleDragOverSpine = (
    event: DragEvent<HTMLDivElement>,
    shelfId: string,
    index: number,
  ) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const midPoint = rect.left + rect.width / 2;
    const nextIndex = event.clientX < midPoint ? index : index + 1;
    setDropIndicator({ shelfId, index: nextIndex });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetShelfId: string) => {
    event.preventDefault();
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

    setLibraryState((prev) => {
      const sourceShelf = prev.shelvesById[payload.fromShelfId];
      const targetShelf = prev.shelvesById[targetShelfId];
      if (!sourceShelf || !targetShelf) {
        return prev;
      }

      const nextShelves = { ...prev.shelvesById };
      const filteredSource = sourceShelf.bookIds.filter((id) => id !== payload.bookId);
      const targetIds = payload.fromShelfId === targetShelfId
        ? [...filteredSource]
        : [...targetShelf.bookIds.filter((id) => id !== payload.bookId)];
      let insertIndex = Math.max(
        0,
        Math.min(
          dropIndicator && dropIndicator.shelfId === targetShelfId
            ? dropIndicator.index
            : targetIds.length,
          targetIds.length,
        ),
      );

      if (payload.fromShelfId === targetShelfId && insertIndex > payload.fromIndex) {
        insertIndex -= 1;
      }

      targetIds.splice(insertIndex, 0, payload.bookId);

      nextShelves[payload.fromShelfId] = {
        ...sourceShelf,
        bookIds: payload.fromShelfId === targetShelfId ? targetIds : filteredSource,
      };
      if (payload.fromShelfId !== targetShelfId) {
        nextShelves[targetShelfId] = { ...targetShelf, bookIds: targetIds };
      }

      return { ...prev, shelvesById: nextShelves };
    });

    setDropIndicator(null);
    setDragging(null);
  };

  const itemCount = Object.keys(libraryState.booksById).length;

  return (
    <main className="min-h-screen bg-white px-6 pb-16 pt-12 text-black">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-2">
        <h1 className="text-4xl font-semibold uppercase tracking-[0.25em]">Gnosis</h1>
        <p className="text-sm uppercase tracking-[0.3em]">Archive / Bookcases</p>
      </header>

      <section className="mx-auto mt-8 w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em]">
          <span>Library</span>
          <span className="text-center">{itemCount} Items</span>
          <span>Drag & Drop</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-2 border-black px-4 py-3">
          <button
            type="button"
            onClick={() => {
              handleAddBookcase();
            }}
            className="border-2 border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-black hover:text-white"
          >
            Add Bookcase
          </button>
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em]">
            <label htmlFor="shelf-count">Shelves</label>
            <input
              id="shelf-count"
              type="number"
              min={MIN_SHELVES}
              max={MAX_SHELVES}
              value={selectedBookcase?.shelfIds.length ?? DEFAULT_SHELF_COUNT}
              onChange={(event) => handleShelfCountChange(Number(event.target.value))}
              className="w-20 border-2 border-black px-2 py-1"
            />
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="border-2 border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-black hover:text-white"
          >
            Reset Library
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-10">
          {libraryState.bookcases.map((bookcase) => (
            <BookcaseView
              key={bookcase.id}
              bookcase={bookcase}
              shelvesById={libraryState.shelvesById}
              booksById={libraryState.booksById}
              activeBookId={selectedBookId}
              draggingBookId={dragging?.bookId}
              dropIndicator={dropIndicator}
              isSelected={bookcase.id === selectedBookcaseId}
              onSelectBookcase={setSelectedBookcaseId}
              onSelectBook={(bookId) => setSelectedBookId(bookId)}
              onDrop={handleDrop}
              onDragOverShelf={handleDragOverShelf}
              onDragOverSpine={handleDragOverSpine}
              onDragLeaveShelf={handleDragLeaveShelf}
              onDragStart={(bookId, shelfId, index) => {
                handleDragStart(bookId, shelfId, index);
              }}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>

        {selectedBook ? (
          <div className="mt-10 border-2 border-black bg-white p-6 text-black">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em]">Selected Entry</p>
                <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.2em]">
                  {selectedBook.title}
                </h2>
                <p className="mt-1 text-xs uppercase tracking-[0.2em]">
                  {selectedBook.author ? `Author: ${selectedBook.author}` : 'Author: Unknown'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookId(null)}
                className="border-2 border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-black hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="mt-6 space-y-2 text-sm">
              <p className="font-mono uppercase tracking-[0.2em]">Metadata</p>
              <p>{detailBody}</p>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default App;
