import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import type { Book, ShelfCode } from '../types/library';
import BookSpine from './BookSpine';

interface ShelfRowProps {
  shelfCode: ShelfCode;
  shelfLabel: string;
  bookIds: string[];
  books: Record<string, Book>;
  selectedIds: Set<string>;
  showAuthor: boolean;
  onBookClick: (bookId: string, event: React.MouseEvent<HTMLButtonElement>) => void;
  onBookOpen: (bookId: string) => void;
  onBookKeyDown: (bookId: string, event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

const ShelfRow = ({
  shelfCode,
  shelfLabel,
  bookIds,
  books,
  selectedIds,
  showAuthor,
  onBookClick,
  onBookOpen,
  onBookKeyDown,
}: ShelfRowProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: shelfCode });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">
          {shelfCode}. {shelfLabel}
        </h2>
        <span className="text-xs text-slate-400">{bookIds.length} books</span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[140px] rounded-xl border border-dashed px-2 py-3 transition ${
          isOver ? 'border-emerald-400/70 bg-emerald-500/10' : 'border-slate-800'
        }`}
      >
        <SortableContext items={bookIds} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-2">
            {bookIds.map((bookId) => (
              <BookSpine
                key={bookId}
                book={books[bookId]}
                selected={selectedIds.has(bookId)}
                showAuthor={showAuthor}
                onClick={(event) => onBookClick(bookId, event)}
                onDoubleClick={() => onBookOpen(bookId)}
                onKeyDown={(event) => onBookKeyDown(bookId, event)}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

export default ShelfRow;
