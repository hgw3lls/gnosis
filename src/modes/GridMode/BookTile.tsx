import type { Book } from '../../types/library';
import { cn } from '../../utils/cn';
import { focusRing, printInteractive } from '../../styles/ui';
import InkChip from '../../components/ui/InkChip';
import { getBookPlateColor } from '../../styles/palette';

type BookTileProps = {
  book: Book;
  size: 's' | 'm' | 'l';
  onSelect: () => void;
};

const getLocationLabel = (book: Book) => {
  if (!book.locationBookcase && !book.locationShelf) {
    return '';
  }
  const shelf = book.locationShelf ? `S${book.locationShelf}` : '';
  const position = book.locationPosition ? `P${book.locationPosition}` : '';
  return [book.locationBookcase, shelf, position].filter(Boolean).join(' · ');
};

const BookTile = ({ book, size, onSelect }: BookTileProps) => {
  const locationLabel = getLocationLabel(book);
  const category = book.primaryShelf || book.tags?.[0] || 'Uncategorized';
  const year = book.publishYear || '—';
  const plate = getBookPlateColor(book, category);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex h-full flex-col justify-between gap-3 border-rule2 border-ink bg-paper p-4 text-left text-ink shadow-print-md',
        focusRing,
        printInteractive,
        size === 's' && 'min-h-[160px]',
        size === 'm' && 'min-h-[200px]',
        size === 'l' && 'min-h-[240px]',
      )}
    >
      <span
        className="absolute left-0 top-0 h-full w-[6px]"
        style={{ backgroundColor: plate }}
        aria-hidden="true"
      />
      <div className="space-y-2">
        <p className={cn('uppercase tracking-[0.2em]', size === 'l' ? 'text-lg' : 'text-sm')}>
          {book.title}
        </p>
        <p className="text-[10px] uppercase tracking-[0.3em]">
          {book.author || 'Unknown author'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em]">
        <InkChip>{year}</InkChip>
        <InkChip plate={getBookPlateColor(book, category)}>{category}</InkChip>
        {locationLabel ? <InkChip>{locationLabel}</InkChip> : null}
      </div>
    </button>
  );
};

export default BookTile;
