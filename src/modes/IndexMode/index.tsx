import BookDetailPanel from '../../components/BookDetailPanel';
import type { Book } from '../../types/library';
import { useLibrary } from '../../state/libraryStore';

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
    <section className="mt-8 border-2 border-black p-6" id="mode-panel-index">
      <div className="border-b-2 border-black pb-4">
        <p className="text-xs uppercase tracking-[0.3em]">Index</p>
        <h2 className="mt-2 text-2xl uppercase tracking-[0.2em]">Case Studies</h2>
      </div>
      <ul className="divide-y-2 divide-black">
        {filteredBooks.map((book) => (
          <li key={book.id}>
            <button
              type="button"
              onClick={() => onSelectBook(book.id)}
              className="flex w-full flex-wrap items-center justify-between gap-4 py-4 text-left text-xs uppercase tracking-[0.25em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
            >
              <span className="min-w-[180px] text-sm uppercase tracking-[0.2em]">
                {book.title}
              </span>
              <span>{book.author || 'Unknown author'}</span>
              <span>{book.publishYear || book.format || '—'}</span>
            </button>
          </li>
        ))}
      </ul>
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
