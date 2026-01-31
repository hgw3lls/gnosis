import BookDetailPanel from '../../components/BookDetailPanel';
import InkButton from '../../components/ui/InkButton';
import InkChip from '../../components/ui/InkChip';
import InkPanel from '../../components/ui/InkPanel';
import Type from '../../components/ui/Type';
import { useLibrary } from '../../state/libraryStore';
import type { Book } from '../../types/library';
import { focusRing, inputBase } from '../../styles/ui';
import { cn } from '../../utils/cn';

const SHELVES = Array.from({ length: 12 }, (_, index) => index + 1);

type MapModeProps = {
  selectedBookId: string | null;
  onSelectBook: (bookId: string) => void;
  onCloseDetail: () => void;
  onUpdateBook: (bookId: string, updates: Partial<Book>) => void;
};

const buildShelfMap = (books: Book[]) => {
  const byCase = new Map<string, Map<number, Book[]>>();
  const unmapped: Book[] = [];

  books.forEach((book) => {
    const bookcase = book.locationBookcase?.trim() ?? '';
    if (!bookcase) {
      unmapped.push(book);
      return;
    }
    const shelves = byCase.get(bookcase) ?? new Map<number, Book[]>();
    const shelfList = shelves.get(book.locationShelf) ?? [];
    shelfList.push(book);
    shelves.set(book.locationShelf, shelfList);
    byCase.set(bookcase, shelves);
  });

  byCase.forEach((shelves) => {
    shelves.forEach((list, shelfNumber) => {
      const sorted = [...list].sort((a, b) => (a.locationPosition ?? 0) - (b.locationPosition ?? 0));
      shelves.set(shelfNumber, sorted);
    });
  });

  const unmappedSorted = [...unmapped].sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  return { byCase, unmapped: unmappedSorted };
};

const MapMode = ({ selectedBookId, onSelectBook, onCloseDetail, onUpdateBook }: MapModeProps) => {
  const {
    appState,
    activeLayout,
    filteredBooks,
    exportCsv,
    setBookcaseShelfCount,
    updateBookcaseName,
    updateShelfLabel,
  } = useLibrary();
  const selectedBook = selectedBookId ? appState?.booksById[selectedBookId] : null;
  const { byCase, unmapped } = buildShelfMap(filteredBooks);
  const bookcases = activeLayout?.bookcases ?? [];

  return (
    <section className="space-y-6" id="mode-panel-map">
      <InkPanel padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-rule border-ink pb-4">
          <div>
            <Type as="p" variant="label">
              Library map
            </Type>
            <Type as="h2" variant="h2" className="mt-2">
              Bookcases · Shelves 1–12
            </Type>
          </div>
          <InkButton onClick={exportCsv}>Export updated CSV</InkButton>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {bookcases.map((bookcase) => {
            const shelves = byCase.get(bookcase.name);
            const shelfCount = bookcase.settings.shelfCount;
            const labels = bookcase.settings.shelfLabels ?? [];
            return (
              <InkPanel key={bookcase.id} padding="md" className="space-y-4">
                <div className="space-y-2">
                  <Type as="p" variant="label">
                    Bookcase
                  </Type>
                  <input
                    value={bookcase.name}
                    onChange={(event) => updateBookcaseName(bookcase.id, event.target.value)}
                    className={cn(inputBase, focusRing, 'w-full text-sm')}
                  />
                  <label className="flex items-center gap-2">
                    <Type as="span" variant="meta">
                      Shelves
                    </Type>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={shelfCount}
                      onChange={(event) =>
                        setBookcaseShelfCount(bookcase.id, Number(event.target.value))
                      }
                      className={cn(inputBase, focusRing, 'w-20 px-2 py-1 text-[11px]')}
                    />
                  </label>
                </div>
                <div className="space-y-3">
                  {SHELVES.slice(0, shelfCount).map((shelfNumber, shelfIndex) => {
                    const shelfBooks = shelves?.get(shelfNumber) ?? [];
                    const shelfLabel = labels[shelfIndex] ?? `Shelf ${shelfNumber}`;
                    return (
                      <div key={`${bookcase.id}-${shelfNumber}`} className="space-y-2">
                        <input
                          value={shelfLabel}
                          onChange={(event) =>
                            updateShelfLabel(bookcase.id, shelfIndex, event.target.value)
                          }
                          className={cn(inputBase, focusRing, 'w-full text-[10px]')}
                        />
                        {shelfBooks.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {shelfBooks.map((book) => (
                              <button
                                key={book.id}
                                type="button"
                                onClick={() => onSelectBook(book.id)}
                                className={cn(
                                  'flex flex-wrap items-center gap-2 text-left',
                                  'border-rule border-ink bg-paper px-2 py-2 text-xs uppercase tracking-[0.2em]',
                                  'hover:shadow-print-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink',
                                )}
                              >
                                <InkChip>{`P${book.locationPosition}`}</InkChip>
                                <span>{book.title}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="border-rule border-ink bg-paper px-2 py-2 text-[10px] uppercase tracking-[0.3em] text-ink/50">
                            Empty
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </InkPanel>
            );
          })}
        </div>
      </InkPanel>

      {unmapped.length > 0 ? (
        <InkPanel padding="lg">
          <div className="border-b-rule border-ink pb-4">
            <Type as="p" variant="label">
              Unmapped
            </Type>
            <Type as="h3" variant="h3" className="mt-2">
              Needs A–F assignment
            </Type>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {unmapped.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => onSelectBook(book.id)}
                className={cn(
                  'border-rule border-ink bg-paper px-3 py-2 text-[10px] uppercase tracking-[0.3em]',
                  'hover:shadow-print-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink',
                )}
              >
                {book.title}
              </button>
            ))}
          </div>
        </InkPanel>
      ) : null}

      {selectedBook ? (
        <BookDetailPanel
          book={selectedBook}
          onClose={onCloseDetail}
          onUpdate={(updates) => onUpdateBook(selectedBook.id, updates)}
        />
      ) : null}
    </section>
  );
};

export default MapMode;
