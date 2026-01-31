import type { DragEvent } from 'react';
import type { Book, DragPayload, Shelf } from '../types/library';
import Spine from './Spine';

type DropIndicator = { shelfId: string; index: number } | null;

type ShelfRowProps = {
  shelf: Shelf;
  booksById: Record<string, Book>;
  libraryId: string;
  bookcaseId: string;
  draggingPlacementId?: string | null;
  dropIndicator: DropIndicator;
  onSelectBook: (bookId: string) => void;
  onDragStart: (payload: DragPayload) => void;
  onDragEnd: () => void;
  onDragOverShelf: (event: DragEvent<HTMLDivElement>, shelfId: string) => void;
  onDragLeaveShelf: (event: DragEvent<HTMLDivElement>, shelfId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, shelfId: string) => void;
  onDragOverSpine: (event: DragEvent<HTMLButtonElement>, shelfId: string, index: number) => void;
};

const getBookId = (placementId: string) => placementId.split('::')[0];

const ShelfRow = ({
  shelf,
  booksById,
  libraryId,
  bookcaseId,
  draggingPlacementId,
  dropIndicator,
  onSelectBook,
  onDragStart,
  onDragEnd,
  onDragOverShelf,
  onDragLeaveShelf,
  onDrop,
  onDragOverSpine,
}: ShelfRowProps) => {
  const indicatorIndex = dropIndicator?.shelfId === shelf.id ? dropIndicator.index : null;
  const showIndicator = indicatorIndex !== null && indicatorIndex !== undefined;
  const list = shelf.bookIds;

  return (
    <div
      className={`relative flex w-full flex-col gap-2 border-b-2 border-black pb-4 ${
        showIndicator ? 'outline outline-2 outline-dashed outline-black' : ''
      }`}
      onDragOver={(event) => onDragOverShelf(event, shelf.id)}
      onDragLeave={(event) => onDragLeaveShelf(event, shelf.id)}
      onDrop={(event) => onDrop(event, shelf.id)}
    >
      <div className="flex min-h-[190px] items-end gap-4 overflow-x-auto pb-2">
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
              bookcaseId={bookcaseId}
              libraryId={libraryId}
              index={index}
              isDragging={draggingPlacementId === placementId}
              onSelect={() => onSelectBook(book.id)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={(event, itemIndex) => onDragOverSpine(event, shelf.id, itemIndex)}
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
