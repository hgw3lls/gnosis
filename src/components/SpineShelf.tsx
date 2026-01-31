import type { FC } from 'react';

export type Book = {
  id: string;
  title: string;
  author?: string;
  spine?: 'thin' | 'med' | 'thick';
  height?: 'short' | 'med' | 'tall';
  spineWidth?: number;
  offset?: boolean;
};

type SpineShelfProps = {
  books: Book[];
  onSelect: (book: Book) => void;
  activeId?: string | null;
};

const spineWidthClasses: Record<NonNullable<Book['spine']>, string> = {
  thin: 'w-8',
  med: 'w-10',
  thick: 'w-12',
};

const spineHeightClasses: Record<NonNullable<Book['height']>, string> = {
  short: 'h-24',
  med: 'h-32',
  tall: 'h-40',
};

const SpineShelf: FC<SpineShelfProps> = ({ books, onSelect, activeId }) => {
  return (
    <div
      className="overflow-x-auto border-t-2 border-black pt-4"
      tabIndex={0}
      onKeyDown={(event) => {
        const target = event.currentTarget;
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          target.scrollBy({ left: 80, behavior: 'auto' });
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          target.scrollBy({ left: -80, behavior: 'auto' });
        }
      }}
      aria-label="Book spine shelf"
    >
      <div className="flex items-end gap-3 pb-2">
        {books.map((book) => {
          const widthClass = book.spine ? spineWidthClasses[book.spine] : 'w-10';
          const heightClass = book.height ? spineHeightClasses[book.height] : 'h-32';
          const inlineWidth = book.spineWidth ? { width: `${book.spineWidth}px` } : undefined;
          const showGutterLine = true;
          const offsetClass = book.offset
            ? "after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:border-2 after:border-black after:translate-x-1 after:-translate-y-1"
            : '';
          const isActive = activeId === book.id;

          return (
            <button
              key={book.id}
              type="button"
              onClick={() => onSelect(book)}
              style={inlineWidth}
              aria-label={`${book.title}${book.author ? ` by ${book.author}` : ''}`}
              aria-pressed={isActive}
              className={`group relative flex ${heightClass} ${widthClass} flex-none items-center justify-center border-2 border-black bg-white text-black shadow-none outline-none hover:bg-black hover:text-white focus-visible:ring-2 focus-visible:ring-black ${offsetClass}`}
            >
              {showGutterLine ? (
                <span
                  className="pointer-events-none absolute bottom-1 left-1 top-1 w-px bg-black/70 group-hover:bg-white"
                  aria-hidden="true"
                />
              ) : null}
              <span
                className="text-center font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                {book.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SpineShelf;
