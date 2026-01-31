import type { DragEvent } from 'react';
import type { Book, Bookcase, Shelf } from '../types/bookcase';
import ShelfRow from './ShelfRow';

type DropIndicator = { shelfId: string; index: number } | null;

type BookcaseViewProps = {
  bookcase: Bookcase;
  shelvesById: Record<string, Shelf>;
  booksById: Record<string, Book>;
  activeBookId?: string | null;
  draggingBookId?: string | null;
  dropIndicator: DropIndicator;
  isSelected: boolean;
  onSelectBookcase: (bookcaseId: string) => void;
  onSelectBook: (bookId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, shelfId: string) => void;
  onDragOverShelf: (event: DragEvent<HTMLDivElement>, shelfId: string) => void;
  onDragOverSpine: (
    event: DragEvent<HTMLDivElement>,
    shelfId: string,
    index: number,
  ) => void;
  onDragLeaveShelf: (event: DragEvent<HTMLDivElement>, shelfId: string) => void;
  onDragStart: (bookId: string, shelfId: string, index: number) => void;
  onDragEnd: () => void;
};

const BookcaseView = ({
  bookcase,
  shelvesById,
  booksById,
  activeBookId,
  draggingBookId,
  dropIndicator,
  isSelected,
  onSelectBookcase,
  onSelectBook,
  onDrop,
  onDragOverShelf,
  onDragOverSpine,
  onDragLeaveShelf,
  onDragStart,
  onDragEnd,
}: BookcaseViewProps) => {
  return (
    <section className="border-2 border-black bg-white p-6 text-black">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onSelectBookcase(bookcase.id)}
          className={`border-2 border-black px-3 py-1 text-left text-xl font-semibold uppercase tracking-[0.3em] ${
            isSelected ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          {bookcase.name}
        </button>
        <span className="text-xs uppercase tracking-[0.2em]">
          Shelves: {bookcase.shelfIds.length}
        </span>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {bookcase.shelfIds.map((shelfId) => {
          const shelf = shelvesById[shelfId];
          if (!shelf) {
            return null;
          }
          return (
            <ShelfRow
              key={shelfId}
              shelf={shelf}
              booksById={booksById}
              activeBookId={activeBookId}
              draggingBookId={draggingBookId}
              dropIndicator={dropIndicator}
              onDrop={onDrop}
              onDragOverShelf={onDragOverShelf}
              onDragOverSpine={onDragOverSpine}
              onDragLeaveShelf={onDragLeaveShelf}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onSelectBook={onSelectBook}
            />
          );
        })}
      </div>
    </section>
  );
};

export default BookcaseView;
