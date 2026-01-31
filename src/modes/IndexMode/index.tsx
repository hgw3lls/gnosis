import BookDetailPanel from '../../components/BookDetailPanel';
import type { Book } from '../../types/library';
import { useLibrary } from '../../state/libraryStore';
import InkPanel from '../../components/ui/InkPanel';
import Type from '../../components/ui/Type';
import { cn } from '../../utils/cn';
import { focusRing, printInteractive } from '../../styles/ui';
import { getBookPlateColor } from '../../styles/palette';

type IndexModeProps = {
  selectedBookId: string | null;
  onSelectBook: (bookId: string) => void;
  onCloseDetail: () => void;
  onUpdateBook: (bookId: string, updates: Partial<Book>) => void;
};

const IndexMode = ({ selectedBookId, onSelectBook, onCloseDetail, onUpdateBook }: IndexModeProps) => {
  const { appState, filteredBooks } = useLibrary();
  const selectedBook = selectedBookId ? appState?.booksById[selectedBookId] : null;

  return (
    <section className="space-y-6" id="mode-panel-index">
      <InkPanel padding="lg">
        <div className="border-b-rule border-ink pb-4">
          <Type as="p" variant="label">
            Index
          </Type>
          <Type as="h2" variant="h2" className="mt-2">
            Case Studies
          </Type>
        </div>
        <ul className="divide-y divide-ink">
          {filteredBooks.map((book) => {
            const plate = getBookPlateColor(book, book.primaryShelf || book.title);
            return (
              <li key={book.id}>
                <button
                  type="button"
                  onClick={() => onSelectBook(book.id)}
                  className={cn(
                    'relative flex w-full flex-wrap items-center justify-between gap-4 py-4 pl-4 text-left',
                    'text-xs uppercase tracking-[0.25em] text-ink',
                    'bg-paper shadow-print-sm',
                    focusRing,
                    printInteractive,
                  )}
                  style={{ borderLeft: `6px solid ${plate}` }}
                >
                  <span className="min-w-[180px] text-sm uppercase tracking-[0.2em]">
                    {book.title}
                  </span>
                  <span>{book.author || 'Unknown author'}</span>
                  <span>{book.publishYear || book.format || '—'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </InkPanel>
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

export default IndexMode;
