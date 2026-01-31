import { useRef } from 'react';
import type { DragEvent } from 'react';
import type { Book, DragPayload, Shelf } from '../types/library';
import { cn } from '../utils/cn';
import Spine from './Spine';
import InkChip from './ui/InkChip';

type DropIndicator = { shelfId: string; index: number } | null;

type ShelfRowProps = {
  shelf: Shelf;
  shelfNumber: number;
  booksById: Record<string, Book>;
  draggingPlacementId?: string | null;
  highlightedBookIds?: Set<string> | null;
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
  shelfNumber,
  booksById,
  draggingPlacementId,
  highlightedBookIds,
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
  const listIndexMap = new Map(list.map((placementId, index) => [placementId, index]));
  const orderedList = [...list].sort((first, second) => {
    const bookA = booksById[getBookId(first)];
    const bookB = booksById[getBookId(second)];
    const matchesA = bookA?.locationShelf === shelfNumber;
    const matchesB = bookB?.locationShelf === shelfNumber;
    if (matchesA && matchesB) {
      const positionA = bookA?.locationPosition ?? Number.MAX_SAFE_INTEGER;
      const positionB = bookB?.locationPosition ?? Number.MAX_SAFE_INTEGER;
      if (positionA !== positionB) {
        return positionA - positionB;
      }
    } else if (matchesA !== matchesB) {
      return matchesA ? -1 : 1;
    }
    return (listIndexMap.get(first) ?? 0) - (listIndexMap.get(second) ?? 0);
  });
  const orderedLength = orderedList.length;

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = shelfRef.current;
    if (!container) {
      onDragOverShelf(shelf.id, orderedLength);
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
      className={cn(
        'relative flex w-full flex-col gap-2 border-b-rule border-ink pb-4',
        showIndicator && 'outline outline-2 outline-dashed outline-ink',
      )}
      onDragOver={handleDragOver}
      onDragLeave={(event) => onDragLeaveShelf(event, shelf.id)}
      onDrop={(event) => onDrop(event, shelf.id)}
    >
      <div className="flex items-center gap-3">
        <InkChip>{`Shelf ${shelfNumber}`}</InkChip>
        <span className="text-[10px] uppercase tracking-[0.3em] text-ink/60">
          {orderedLength} books
        </span>
      </div>
      <div ref={shelfRef} className="flex min-h-[190px] items-end gap-4 overflow-x-auto pb-2">
        {orderedList.map((placementId, index) => {
          const book = booksById[getBookId(placementId)];
          if (!book) {
            return null;
          }
          const isDimmed = highlightedBookIds ? !highlightedBookIds.has(book.id) : false;
          const spine = (
            <Spine
              key={placementId}
              book={book}
              placementId={placementId}
              shelfId={shelf.id}
              index={index}
              isDragging={draggingPlacementId === placementId}
              isDimmed={isDimmed}
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
              <div className="h-40 w-[2px] bg-ink" aria-hidden="true" />
              {spine}
            </div>
          );
        })}
        {showIndicator && indicatorIndex === orderedLength ? (
          <div className="h-40 w-[2px] bg-ink" aria-hidden="true" />
        ) : null}
      </div>
    </div>
  );
};

export default ShelfRow;
