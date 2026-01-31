import { useEffect, useMemo, useState } from 'react';
import SpineShelf, { Book as SpineBook } from './components/SpineShelf';
import { parseLibraryCsv } from './utils/csv';

const FALLBACK_BOOKS: SpineBook[] = [
  { id: 'fallback-1', title: 'Atlas of Concrete', author: 'R. Kline', spine: 'thin', height: 'short', offset: true },
  { id: 'fallback-2', title: 'Raw Typography', author: 'L. Serra', spine: 'med', height: 'tall' },
  { id: 'fallback-3', title: 'Steel & Paper', author: 'M. Osei', spine: 'thick', height: 'med', offset: true },
  { id: 'fallback-4', title: 'Brutal Forms', author: 'A. Patel', spine: 'thin', height: 'med' },
  { id: 'fallback-5', title: 'Monolith', author: 'J. Cho', spine: 'thick', height: 'tall' },
  { id: 'fallback-6', title: 'Index of Space', author: 'K. Watanabe', spine: 'med', height: 'short', offset: true },
  { id: 'fallback-7', title: 'Hard Lines', author: 'E. Novak', spine: 'thin', height: 'tall' },
  { id: 'fallback-8', title: 'Found Objects', author: 'S. Adeyemi', spine: 'med', height: 'med', offset: true },
  { id: 'fallback-9', title: 'Public Matter', author: 'D. Nguyen', spine: 'thick', height: 'short' },
  { id: 'fallback-10', title: 'Black Baseline', author: 'T. Ruiz', spine: 'med', height: 'tall' },
  { id: 'fallback-11', title: 'Static Noise', author: 'C. Long', spine: 'thin', height: 'short', offset: true },
  { id: 'fallback-12', title: 'Edge Study', author: 'P. Ibrahim', spine: 'thick', height: 'med' },
];

const App = () => {
  const [spineBooks, setSpineBooks] = useState<SpineBook[]>(FALLBACK_BOOKS);
  const [selectedSpineBook, setSelectedSpineBook] = useState<SpineBook | null>(null);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const response = await fetch('/library.csv');
        if (!response.ok) {
          throw new Error('Missing CSV');
        }
        const text = await response.text();
        const parsed = parseLibraryCsv(text);
        const libraryBooks = Object.values(parsed.books);
        if (libraryBooks.length >= 8) {
          const spines: SpineBook[] = libraryBooks.map((book, index) => ({
            id: book.id,
            title: book.title || 'Untitled',
            author: book.author || undefined,
            spine: (['thin', 'med', 'thick'] as const)[index % 3],
            height: (['short', 'med', 'tall'] as const)[(index + 1) % 3],
            offset: index % 4 === 0,
          }));
          setSpineBooks(spines);
          return;
        }
      } catch {
        // fallback handled below
      }
      setSpineBooks(FALLBACK_BOOKS);
    };

    loadBooks();
  }, []);

  const itemCount = spineBooks.length;
  const detailBody = useMemo(() => {
    if (!selectedSpineBook) {
      return '';
    }
    return `Record retained in the GNOSIS archive. This spine references catalog data captured for “${selectedSpineBook.title}”.`;
  }, [selectedSpineBook]);

  return (
    <main className="min-h-screen bg-white px-6 pb-16 pt-12 text-black">
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-2">
        <h1 className="text-4xl font-semibold uppercase tracking-[0.25em]">Gnosis</h1>
        <p className="text-sm uppercase tracking-[0.3em]">Archive / Catalog</p>
      </header>

      <section className="mx-auto mt-10 w-full max-w-5xl">
        <div className="flex w-full items-center justify-between gap-4 border-2 border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
          <span>Catalog</span>
          <span className="text-center">Gnosis / Archive</span>
          <span>{itemCount} Items</span>
        </div>

        <div className="mt-10">
          <SpineShelf
            books={spineBooks}
            onSelect={setSelectedSpineBook}
            activeId={selectedSpineBook?.id}
          />
        </div>

        {selectedSpineBook ? (
          <div className="mt-8 border-2 border-black bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em]">Selected Entry</p>
                <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.2em]">
                  {selectedSpineBook.title}
                </h2>
                <p className="mt-1 text-xs uppercase tracking-[0.2em]">
                  {selectedSpineBook.author ? `Author: ${selectedSpineBook.author}` : 'Author: Unknown'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSpineBook(null)}
                className="border-2 border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-black hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="mt-6 space-y-2 text-sm">
              <p className="font-mono uppercase tracking-[0.2em]">Metadata</p>
              <p>
                Spine: {selectedSpineBook.spine ?? 'med'} / Height: {selectedSpineBook.height ?? 'med'}
              </p>
              <p>{detailBody}</p>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default App;
