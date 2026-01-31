import type { DragEvent } from 'react';
import type { Book, DragPayload } from '../types/library';

type SpineProps = {
  book: Book;
  placementId: string;
  shelfId: string;
  index: number;
  isDragging: boolean;
  isDimmed?: boolean;
  onSelect: () => void;
  onDragStart: (payload: DragPayload) => void;
  onDragEnd: () => void;
};

const Spine = ({
  book,
  placementId,
  shelfId,
  index,
  isDragging,
  isDimmed = false,
  onSelect,
  onDragStart,
  onDragEnd,
}: SpineProps) => {
  const title = book.title || 'Untitled';
  const author = book.author ?? 'Unknown author';
  const charCount = Math.min(title.length, 60);

  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    const payload: DragPayload = {
      bookId: placementId,
      fromShelfId: shelfId,
      fromIndex: index,
    };
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
    onDragStart(payload);
  };

  return (
    <button
      type="button"
      draggable
      onClick={onSelect}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      data-spine-index={index}
      aria-label={`${title} by ${author}`}
      className={`relative flex h-40 items-center justify-center border-2 border-black bg-white px-2 text-center text-[10px] uppercase tracking-[0.1em] text-black hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black ${
        isDragging ? 'opacity-60' : ''
      } ${isDimmed ? 'opacity-40' : ''} whitespace-normal break-words`}
      style={{
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        transform: 'rotate(180deg)',
        width: `clamp(28px, calc(18px + ${charCount} * 1.1px), 110px)`,
        fontSize: `clamp(10px, calc(14px - ${charCount} * 0.06px), 14px)`,
      }}
    >
      <span className="absolute left-1 top-2 h-[85%] w-[2px] bg-black" aria-hidden="true" />
      <span className="leading-tight">{title}</span>
    </button>
  );
};

export default Spine;
