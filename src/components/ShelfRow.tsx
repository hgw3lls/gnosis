import { useRef } from 'react';
import type { DragEvent } from 'react';
import type { Book, DragPayload, Shelf } from '../types/library';
import Spine from './Spine';

type DropIndicator = { shelfId: string; index: number } | null;

type ShelfRowProps = {
  shelf: Shelf;
  booksById: Record<string, Book>;
  draggingPlacementId?: string | null;
  dropIndicator: DropIndicator;
  onSelectBook: (bookId: string) => void;
  onDragStart: (payload: DragPayload) => void;
  onDragEnd: () => void;
  onDragOverShelf: (shelfId: string, index: number) => void;
  onDragLeaveShelf: (event: DragEvent<HTMLDivElement>, shelfId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, shelfId: string) => void;
};

const getBookId = (placementId: string) => placementId.split('::')[0];

const ShelfRow = ({
  shelf,
  booksById,
  draggingPlacementId,
  dropIndicator,
  onSelectBook,
  onDragStart,
  onDragEnd,
  onDragOverShelf,
  onDragLeaveShelf,
  onDrop,
}: ShelfRowProps) => {
  const indicatorIndex = dropIndicator?.shelfId === shelf.id ? dropIndicator.index : null;
  const showIndicator = indicatorIndex !== null && indicatorIndex !== undefined;
  const list = shelf.bookIds;
  const shelfRef = useRef<HTMLDivElement | null>(null);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = shelfRef.current;
    if (!container) {
      onDragOverShelf(shelf.id, list.length);
      return;
    }
    const spines = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-spine-index]'),
    );
    if (spines.length === 0) {
      onDragOverShelf(shelf.id, 0);
      return;
    }
    const clientX = event.clientX;
    const nextIndex = spines.findIndex((spine) => {
      const rect = spine.getBoundingClientRect();
      return clientX < rect.left + rect.width / 2;
    });
    onDragOverShelf(shelf.id, nextIndex === -1 ? spines.length : nextIndex);
  };

  return (
    <div
      className={`relative flex w-full flex-col gap-2 border-b-2 border-black pb-4 ${
        showIndicator ? 'outline outline-2 outline-dashed outline-black' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={(event) => onDragLeaveShelf(event, shelf.id)}
      onDrop={(event) => onDrop(event, shelf.id)}
    >
      <div ref={shelfRef} className="flex min-h-[190px] items-end gap-4 overflow-x-auto pb-2">
        {list.map((placementId, index) => {
          const book = booksById[getBookId(placementId)];
          if (!book) {
            return null;
          }
          const spine = (
            <Spine
              key={placementId}
              book={book}
              placementId={placementId}
              shelfId={shelf.id}
              index={index}
              isDragging={draggingPlacementId === placementId}
              onSelect={() => onSelectBook(book.id)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          );
          if (!showIndicator || indicatorIndex !== index) {
            return spine;
          }
          return (
            <div key={`${placementId}-indicator`} className="flex items-end gap-4">
              <div className="h-40 w-[2px] bg-black" aria-hidden="true" />
              {spine}
            </div>
          );
        })}
        {showIndicator && indicatorIndex === list.length ? (
          <div className="h-40 w-[2px] bg-black" aria-hidden="true" />
        ) : null}
      </div>
    </div>
  );
};

export default ShelfRow;
