import { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Book } from '../types/library';
import { getContrastingText, getShelfColor } from '../utils/colors';

interface BookSpineProps {
  book: Book;
  selected: boolean;
  showAuthor: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDoubleClick: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

const BookSpine = ({
  book,
  selected,
  showAuthor,
  onClick,
  onDoubleClick,
  onKeyDown,
}: BookSpineProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id });

  const color = useMemo(() => getShelfColor(book.shelfCode, book.id), [book]);
  const textColor = useMemo(() => getContrastingText(color), [color]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: color,
    color: textColor,
    opacity: isDragging ? 0.6 : 1,
    boxShadow: selected
      ? `0 0 0 3px ${textColor === '#0f172a' ? '#0f172a' : '#f8fafc'}`
      : 'none',
  } as React.CSSProperties;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className="group relative h-32 w-10 min-w-[2.5rem] rounded-md border border-slate-950/30 px-1 py-2 text-[0.65rem] font-semibold leading-tight shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <span className="absolute inset-0 flex items-center justify-center" style={{ writingMode: 'vertical-rl' }}>
        {book.title}
        {showAuthor && book.author ? ` · ${book.author}` : ''}
      </span>
      <span className="pointer-events-none absolute -top-24 left-1/2 hidden w-64 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 p-3 text-left text-xs text-slate-100 shadow-xl group-hover:block">
        <strong className="block text-sm">{book.title}</strong>
        <span className="block text-slate-300">{book.author || 'Unknown author'}</span>
        <span className="mt-1 block text-slate-400">Shelf: {book.primaryShelf}</span>
        <span className="mt-1 block text-slate-400">Tags: {book.tags.join(', ') || 'None'}</span>
        <span className="mt-1 block text-slate-400">Status: {book.useStatus || '—'}</span>
      </span>
    </button>
  );
};

export default BookSpine;
