import type { DragEvent } from 'react';
import type { Book, Bookcase as BookcaseType, DragPayload, Shelf } from '../types/library';
import ShelfRow from './ShelfRow';
import BookDetailPanel from './BookDetailPanel';

type DropIndicator = { shelfId: string; index: number } | null;

type BookcaseProps = {
  bookcase: BookcaseType;
  shelvesById: Record<string, Shelf>;
  booksById: Record<string, Book>;
  draggingPlacementId?: string | null;
  dropIndicator: DropIndicator;
  selectedBookId?: string | null;
  highlightedBookIds?: Set<string> | null;
  onSelectBook: (bookId: string, bookcaseId: string) => void;
  onCloseDetail: () => void;
  onUpdateBook: (bookId: string, updates: Partial<Book>) => void;
  onShelfCountChange: (bookcaseId: string, nextCount: number) => void;
  onDragStart: (payload: DragPayload) => void;
  onDragEnd: () => void;
  onDragOverShelf: (shelfId: string, index: number) => void;
  onDragLeaveShelf: (event: DragEvent<HTMLDivElement>, shelfId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, shelfId: string) => void;
};

const Bookcase = ({
  bookcase,
  shelvesById,
  booksById,
  draggingPlacementId,
  dropIndicator,
  selectedBookId,
  highlightedBookIds,
  onSelectBook,
  onCloseDetail,
  onUpdateBook,
  onShelfCountChange,
  onDragStart,
  onDragEnd,
  onDragOverShelf,
  onDragLeaveShelf,
  onDrop,
}: BookcaseProps) => {
  const shelfCount = bookcase.settings.shelfCount;
  const totalBooks = bookcase.shelfIds.reduce(
    (total, shelfId) => total + (shelvesById[shelfId]?.bookIds.length ?? 0),
    0,
  );
  const selectedBook = selectedBookId ? booksById[selectedBookId] : null;

  return (
    <section className="border-2 border-black p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em]">Bookcase</p>
          <h2 className="mt-2 text-2xl uppercase tracking-[0.2em]">{bookcase.name}</h2>
          <p className="mt-1 text-xs uppercase tracking-[0.2em]">{totalBooks} books</p>
        </div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em]">
          <label htmlFor={`shelf-count-${bookcase.id}`}>Shelves</label>
          <input
            id={`shelf-count-${bookcase.id}`}
            type="number"
            min={1}
            max={12}
            value={shelfCount}
            onChange={(event) => onShelfCountChange(bookcase.id, Number(event.target.value))}
            className="w-20 border-2 border-black px-2 py-1 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
          />
        </div>
      </div>
      <div className="mt-6 space-y-6">
        {bookcase.shelfIds.map((shelfId, shelfIndex) => {
          const shelf = shelvesById[shelfId];
          if (!shelf) {
            return null;
          }
          return (
            <ShelfRow
              key={shelfId}
              shelf={shelf}
              shelfNumber={shelfIndex + 1}
              booksById={booksById}
              draggingPlacementId={draggingPlacementId}
              highlightedBookIds={highlightedBookIds}
              dropIndicator={dropIndicator}
              onSelectBook={(bookId) => onSelectBook(bookId, bookcase.id)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOverShelf={onDragOverShelf}
              onDragLeaveShelf={onDragLeaveShelf}
              onDrop={onDrop}
            />
          );
        })}
      </div>
      {selectedBook ? (
        <BookDetailPanel
          book={selectedBook}
          onClose={onCloseDetail}
          onUpdate={(updates) => onUpdateBook(selectedBook.id, updates)}
        />
      ) : null}
    </section>
  );
};

export default Bookcase;
