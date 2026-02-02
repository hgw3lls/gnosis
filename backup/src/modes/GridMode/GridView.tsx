import { useMemo, useState } from 'react';
import { useLibrary } from '../../state/libraryStore';
import BookTile from './BookTile';
import {
  GridFiltersBar,
  applyGridFilters,
  useGridFiltersState,
} from '../../components/GridFiltersBar';
import InkButton from '../../components/ui/InkButton';
import InkPanel from '../../components/ui/InkPanel';
import Type from '../../components/ui/Type';

const DENSITY_KEY = 'gnosis-grid-density';

const GridView = ({ onSelectBook }: { onSelectBook: (bookId: string) => void }) => {
  const { appState } = useLibrary();
  const [density, setDensity] = useState<'s' | 'm' | 'l'>(() => {
    const stored = localStorage.getItem(DENSITY_KEY);
    return stored === 's' || stored === 'l' ? stored : 'm';
  });
  const filters = useGridFiltersState();

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
    <section className="space-y-6" id="mode-panel-grid">
      <InkPanel padding="md" className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Type as="span" variant="label">
            Tile size
          </Type>
          {(['s', 'm', 'l'] as const).map((value) => (
            <InkButton
              key={value}
              onClick={() => {
                setDensity(value);
                localStorage.setItem(DENSITY_KEY, value);
              }}
              variant={density === value ? 'primary' : 'ghost'}
            >
              {value.toUpperCase()}
            </InkButton>
          ))}
        </div>
        <Type as="span" variant="meta">
          {filteredBooks.length} titles
        </Type>
      </InkPanel>

      <GridFiltersBar tagOptions={tagOptions} statusOptions={statusOptions} />

      <div className={`grid gap-4 ${gridClasses}`}>
        {filteredBooks.map((book) => (
          <BookTile key={book.id} book={book} size={density} onSelect={() => onSelectBook(book.id)} />
        ))}
      </div>
    </section>
  );
};

export default GridView;
