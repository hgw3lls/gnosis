import { useMemo, useState } from 'react';
import { useLibrary } from '../../state/libraryStore';
import BookTile from './BookTile';
import { FiltersBar, applyGridFilters, useFiltersBarState } from '../../components/FiltersBar';

const DENSITY_KEY = 'gnosis-grid-density';

const GridView = ({ onSelectBook }: { onSelectBook: (bookId: string) => void }) => {
  const { appState } = useLibrary();
  const [density, setDensity] = useState<'s' | 'm' | 'l'>(() => {
    const stored = localStorage.getItem(DENSITY_KEY);
    return stored === 's' || stored === 'l' ? stored : 'm';
  });
  const filters = useFiltersBarState();

  const books = useMemo(() => Object.values(appState?.booksById ?? {}), [appState]);
  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    books.forEach((book) => {
      if (book.primaryShelf) {
        tags.add(book.primaryShelf);
      }
      (book.tags ?? []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [books]);

  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    books.forEach((book) => {
      if (book.useStatus) {
        statuses.add(book.useStatus);
      }
    });
    return Array.from(statuses).sort((a, b) => a.localeCompare(b));
  }, [books]);

  const filteredBooks = useMemo(() => applyGridFilters(books, filters), [books, filters]);

  const gridClasses =
    density === 's'
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'
      : density === 'l'
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  return (
    <section className="mt-8" id="mode-panel-grid">
      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-black px-4 py-3 text-xs uppercase tracking-[0.3em]">
        <div className="flex items-center gap-3">
          <span>Tile size</span>
          {(['s', 'm', 'l'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setDensity(value);
                localStorage.setItem(DENSITY_KEY, value);
              }}
              className={`border-2 border-black px-3 py-2 text-xs uppercase tracking-[0.3em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black ${
                density === value ? 'bg-black text-white' : 'hover:bg-black hover:text-white'
              }`}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em]">
          {filteredBooks.length} titles
        </div>
      </div>

      <div className="mt-4">
        <FiltersBar tagOptions={tagOptions} statusOptions={statusOptions} />
      </div>

      <div className={`mt-6 grid gap-4 ${gridClasses}`}>
        {filteredBooks.map((book) => (
          <BookTile key={book.id} book={book} size={density} onSelect={() => onSelectBook(book.id)} />
        ))}
      </div>
    </section>
  );
};

export default GridView;
