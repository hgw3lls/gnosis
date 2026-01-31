import BookDetailPanel from '../../components/BookDetailPanel';
import type { Book } from '../../types/library';
import { useLibrary } from '../../state/libraryStore';
import GridView from './GridView';

type GridModeProps = {
  selectedBookId: string | null;
  onSelectBook: (bookId: string) => void;
  onCloseDetail: () => void;
  onUpdateBook: (bookId: string, updates: Partial<Book>) => void;
};

const GridMode = ({ selectedBookId, onSelectBook, onCloseDetail, onUpdateBook }: GridModeProps) => {
  const { appState } = useLibrary();
  const selectedBook = selectedBookId ? appState?.booksById[selectedBookId] : null;

  return (
    <section className="space-y-6" id="mode-panel-grid">
      <GridView onSelectBook={onSelectBook} />
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

export default GridMode;
