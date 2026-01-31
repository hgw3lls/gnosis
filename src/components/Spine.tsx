import type { DragEvent } from 'react';
import type { Book, DragPayload } from '../types/library';
import { cn } from '../utils/cn';
import { focusRing, printInteractive } from '../styles/ui';
import { getBookPlateColor, getPlateTextColor } from '../styles/palette';

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
  const plate = getBookPlateColor(book, book.primaryShelf || title);
  const textColor = getPlateTextColor(plate);

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
      className={cn(
        'relative flex h-40 items-center justify-center border-rule2 border-ink px-2 text-center text-[10px] uppercase tracking-[0.2em] text-ink',
        'whitespace-normal break-words shadow-print-md',
        focusRing,
        printInteractive,
        isDragging && 'opacity-60',
        isDimmed && 'opacity-40',
      )}
      style={{
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        transform: 'rotate(180deg)',
        width: `clamp(28px, calc(18px + ${charCount} * 1.1px), 110px)`,
        fontSize: `clamp(10px, calc(14px - ${charCount} * 0.06px), 14px)`,
        backgroundColor: plate,
        color: textColor,
      }}
    >
      <span
        className="absolute left-1 top-2 h-[85%] w-[2px]"
        style={{ backgroundColor: textColor }}
        aria-hidden="true"
      />
      <span className="leading-tight">{title}</span>
    </button>
  );
};

export default Spine;
