import type { DragEvent } from 'react';
import type { Book, DragPayload } from '../../types/library';

const palette = ['#111111', '#f7f2e8', '#ff4d2e', '#2e5cff', '#f2c94c'];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getColorForBook = (book: Book, shelfName: string) => {
  const override =
    book.raw?.SpineColor || book.raw?.Spine_Color || book.raw?.Color || book.raw?.Colour || '';
  if (override) {
    return override;
  }
  const key = book.primaryShelf || book.tags?.[0] || shelfName || book.title;
  return palette[hashString(key) % palette.length];
};

const buildSlug = (book: Book) => {
  return (
    book.primaryShelf ||
    book.raw?.Call_Number ||
    book.raw?.CallNumber ||
    book.raw?.Category ||
    ''
  );
};

const cn = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' ');

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
  const background = getColorForBook(book, shelfName);
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
        'relative flex h-44 items-center justify-center border-2 border-black text-black transition',
        'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-black',
        'hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
        isDragging && 'opacity-60',
        isDimmed && 'opacity-35',
      )}
      style={{
        width: baseWidth,
        backgroundColor: background,
        boxShadow: `3px 3px 0 0 #000, 6px 6px 0 0 rgba(0,0,0,0.12), -1px -1px 0 0 rgba(255,0,0,0.2)`,
      }}
    >
      <span
        className={cn(
          'pointer-events-none flex h-full w-full flex-col items-center justify-between px-1 py-2',
          textSize,
          'uppercase tracking-[0.12em] text-black',
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
