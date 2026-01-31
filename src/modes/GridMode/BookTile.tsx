import type { Book } from '../../types/library';
import { getLocationLabel } from '../../components/FiltersBar';

const cn = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' ');

type BookTileProps = {
  book: Book;
  size: 's' | 'm' | 'l';
  onSelect: () => void;
};

const BookTile = ({ book, size, onSelect }: BookTileProps) => {
  const locationLabel = getLocationLabel(book);
  const category = book.primaryShelf || book.tags?.[0] || 'Uncategorized';
  const year = book.publishYear || '—';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex h-full flex-col justify-between gap-3 border-2 border-black p-4 text-left text-black',
        'transition hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-black',
        size === 's' && 'min-h-[160px]',
        size === 'm' && 'min-h-[200px]',
        size === 'l' && 'min-h-[240px]',
      )}
    >
      <div className="space-y-2">
        <p className={cn('uppercase tracking-[0.2em]', size === 'l' ? 'text-lg' : 'text-sm')}>
          {book.title}
        </p>
        <p className="text-[10px] uppercase tracking-[0.3em]">
          {book.author || 'Unknown author'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em]">
        <span className="border-2 border-black px-2 py-1">{year}</span>
        <span className="border-2 border-black px-2 py-1">{category}</span>
        {locationLabel ? (
          <span className="border-2 border-black px-2 py-1">{locationLabel}</span>
        ) : null}
      </div>
    </button>
  );
};

export default BookTile;
