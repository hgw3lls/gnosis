import type { DragEvent } from 'react';
import type { Book, DragPayload } from '../../types/library';
import { cn } from '../../utils/cn';
import { focusRing, printInteractive } from '../../styles/ui';
import { getBookPlateColor, getPlateTextColor } from '../../styles/palette';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const buildSlug = (book: Book) => {
  return (
    book.primaryShelf ||
    book.raw?.Call_Number ||
    book.raw?.CallNumber ||
    book.raw?.Category ||
    ''
  );
};

type SpineProps = {
  book: Book;
  shelfName: string;
  placementId: string;
  shelfId: string;
  index: number;
  isDragging: boolean;
  isDimmed?: boolean;
  density: 'compact' | 'comfy';
  onSelect: () => void;
  onDragStart: (payload: DragPayload) => void;
  onDragEnd: () => void;
};

const Spine = ({
  book,
  shelfName,
  placementId,
  shelfId,
  index,
  isDragging,
  isDimmed = false,
  density,
  onSelect,
  onDragStart,
  onDragEnd,
}: SpineProps) => {
  const title = book.title || 'Untitled';
  const author = book.author;
  const slug = buildSlug(book);
  const background = getBookPlateColor(book, shelfName || book.title);
  const textColor = getPlateTextColor(background);
  const baseWidth = density === 'compact' ? 34 : 48;
  const textSize = density === 'compact' ? 'text-[9px]' : 'text-[11px]';

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
      aria-label={`${title}${author ? ` by ${author}` : ''}`}
      data-spine-index={index}
      className={cn(
        'relative flex h-44 items-center justify-center border-rule2 border-ink text-ink shadow-print-md',
        focusRing,
        printInteractive,
        isDragging && 'opacity-60',
        isDimmed && 'opacity-35',
      )}
      style={{
        width: baseWidth,
        backgroundColor: background,
        color: textColor,
      }}
    >
      <span
        className={cn(
          'pointer-events-none flex h-full w-full flex-col items-center justify-between px-1 py-2',
          textSize,
          'uppercase tracking-[0.12em]',
        )}
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
        }}
      >
        <span
          className={cn('max-h-[120px] overflow-hidden break-words text-center', textSize)}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: density === 'compact' ? 6 : 8,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </span>
        {author ? (
          <span className="mt-2 text-[8px] uppercase tracking-[0.2em]">{author}</span>
        ) : null}
        {slug ? (
          <span className="mt-2 text-[8px] uppercase tracking-[0.2em]">{slug}</span>
        ) : null}
      </span>
    </button>
  );
};

export default Spine;
export const spineWidthForDensity = (density: 'compact' | 'comfy') =>
  density === 'compact' ? 34 : 48;
export const spineGapForDensity = (density: 'compact' | 'comfy') =>
  density === 'compact' ? 8 : 12;
export const clampSpineIndex = (index: number, total: number) =>
  clamp(index, 0, Math.max(total - 1, 0));
