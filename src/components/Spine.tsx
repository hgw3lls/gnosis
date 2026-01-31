import type { DragEvent } from 'react';
import type { Book } from '../types/bookcase';

type SpineProps = {
  book: Book;
  isActive?: boolean;
  isDragging?: boolean;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onSelect: () => void;
};

const Spine = ({ book, isActive, isDragging, onDragStart, onDragEnd, onSelect }: SpineProps) => {
  const charCount = Math.min(book.title.length, 40);

  return (
    <button
      type="button"
      draggable
      aria-pressed={isActive}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      style={
        {
          '--chars': charCount,
          width: 'clamp(28px, calc(18px + var(--chars) * 1.2px), 90px)',
        } as React.CSSProperties
      }
      className={`relative flex h-40 flex-none items-center justify-center border-2 border-black bg-white px-1 text-black transition-colors hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
        isDragging ? 'opacity-60' : ''
      } ${isActive ? 'bg-black text-white' : ''}`}
    >
      <span
        className="text-center font-mono font-semibold uppercase tracking-[0.2em]"
        style={
          {
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: 'clamp(10px, calc(14px - (var(--chars) * 0.08px)), 14px)',
            whiteSpace: 'normal',
            maxHeight: '100%',
          } as React.CSSProperties
        }
      >
        {book.title}
      </span>
    </button>
  );
};

export default Spine;
