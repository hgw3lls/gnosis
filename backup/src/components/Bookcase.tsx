import type { DragEvent } from 'react';
import type { Book, Bookcase as BookcaseType, DragPayload, Shelf } from '../types/library';
import { cn } from '../utils/cn';
import { focusRing, inputBase } from '../styles/ui';
import ShelfRow from './ShelfRow';
import BookDetailPanel from './BookDetailPanel';
import InkPanel from './ui/InkPanel';
import Type from './ui/Type';

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
    <InkPanel padding="lg" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-rule border-ink pb-4">
        <div className="space-y-2">
          <Type as="p" variant="label">
            Bookcase
          </Type>
          <Type as="h2" variant="h2">
            {bookcase.name}
          </Type>
          <Type as="p" variant="meta">
            {totalBooks} books
          </Type>
        </div>
        <div className="flex items-center gap-3">
          <Type as="label" htmlFor={`shelf-count-${bookcase.id}`} variant="label">
            Shelves
          </Type>
          <input
            id={`shelf-count-${bookcase.id}`}
            type="number"
            min={1}
            max={12}
            value={shelfCount}
            onChange={(event) => onShelfCountChange(bookcase.id, Number(event.target.value))}
            className={cn(inputBase, focusRing, 'w-20 px-2 py-1 text-[11px]')}
          />
        </div>
      </div>
      <div className="space-y-6">
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
    </InkPanel>
  );
};

export default Bookcase;
