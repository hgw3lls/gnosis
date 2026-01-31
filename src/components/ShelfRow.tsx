import { useState } from 'react';
import type { DragEvent } from 'react';
import type { Book, Shelf } from '../types/bookcase';
import Spine from './Spine';

type DropIndicator = { shelfId: string; index: number } | null;

type ShelfRowProps = {
  shelf: Shelf;
  booksById: Record<string, Book>;
  activeBookId?: string | null;
  draggingBookId?: string | null;
  dropIndicator: DropIndicator;
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
  onSelectBook: (bookId: string) => void;
};

const ShelfRow = ({
  shelf,
  booksById,
  activeBookId,
  draggingBookId,
  dropIndicator,
  onDrop,
  onDragOverShelf,
  onDragOverSpine,
  onDragLeaveShelf,
  onDragStart,
  onDragEnd,
  onSelectBook,
}: ShelfRowProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const indicatorIndex =
    dropIndicator && dropIndicator.shelfId === shelf.id
      ? dropIndicator.index
      : null;

  return (
    <div
      className={`border-2 border-black p-3 ${
        isDragOver ? 'outline outline-2 outline-dashed outline-black' : ''
      }`}
      onDragEnter={() => setIsDragOver(true)}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) {
          return;
        }
        setIsDragOver(false);
        onDragLeaveShelf(event, shelf.id);
      }}
      onDragOver={(event) => {
        setIsDragOver(true);
        onDragOverShelf(event, shelf.id);
      }}
      onDrop={(event) => {
        setIsDragOver(false);
        onDrop(event, shelf.id);
      }}
      aria-label="Shelf"
    >
      <div className="flex items-end gap-3 overflow-x-auto border-b-2 border-black pb-3">
        {shelf.bookIds.map((bookId, index) => {
          const book = booksById[bookId];
          if (!book) {
            return null;
          }

          const showIndicator = indicatorIndex === index;
          return (
            <div
              key={bookId}
              className="flex items-end gap-3"
              data-index={index}
              onDragOver={(event) => onDragOverSpine(event, shelf.id, index)}
            >
              {showIndicator ? (
                <span
                  className="h-40 w-[2px] bg-black"
                  aria-hidden="true"
                />
              ) : null}
              <Spine
                book={book}
                isActive={activeBookId === bookId}
                isDragging={draggingBookId === bookId}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({
                      bookId,
                      fromShelfId: shelf.id,
                      fromIndex: index,
                    }),
                  );
                  onDragStart(bookId, shelf.id, index);
                }}
                onDragEnd={onDragEnd}
                onSelect={() => onSelectBook(bookId)}
              />
            </div>
          );
        })}
        {indicatorIndex === shelf.bookIds.length ? (
          <span className="h-40 w-[2px] bg-black" aria-hidden="true" />
        ) : null}
      </div>
    </div>
  );
};

export default ShelfRow;
